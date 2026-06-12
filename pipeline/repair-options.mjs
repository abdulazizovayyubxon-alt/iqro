// TA'MIRLASH: cue-leak buzilgan savollarning variantlarini bepul LLM bilan muvozanatlaydi.
// To'g'ri javob FAKTI o'zgarmaydi — faqat ifoda qisqaradi/distraktorlar kuchayadi.
// Qabul sharti: cueLeakReasons(q).length === 0 (lokal darvoza).
// node pipeline/repair-options.mjs [--in fan/chqbt/gold_bank.json] [--batch 4] [--limit 0]
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";

// .env
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const BASE = process.env.PIPELINE_API_BASE, KEY = process.env.PIPELINE_API_KEY, MODEL = process.env.PIPELINE_API_MODEL;
const REASONING = process.env.PIPELINE_REASONING || "";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gold_bank.json");
const BATCH = parseInt(A("--batch", "4"), 10);
const LIMIT = parseInt(A("--limit", "0"), 10);
const statePath = "pipeline/repair_state.json";

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
if (!fs.existsSync(inPath + ".bak")) fs.writeFileSync(inPath + ".bak", JSON.stringify(data, null, 1), "utf8");

// state: { "<id>": "fixed" | "unrepaired" }
let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};

const broken = data.filter((q) => cueLeakReasons(q).length > 0 && !state[q.id]);
const todo = LIMIT > 0 ? broken.slice(0, LIMIT) : broken;
console.log(`▶ Ta'mirlash: buzuq ${broken.length} (holatda fixed ${Object.values(state).filter((v) => v === "fixed").length}, unrepaired ${Object.values(state).filter((v) => v === "unrepaired").length}) | navbatda ${todo.length} | model ${MODEL}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(batch) {
  const qs = batch.map((q) => {
    const reasons = cueLeakReasons(q).join("; ");
    const opts = ["A", "B", "C", "D"].map((k) => `${k}) ${q.options[k]}`).join("\n");
    const corrLen = String(q.options[q.answer] || "").length;
    const dLens = ["A", "B", "C", "D"].filter((k) => k !== q.answer).map((k) => String(q.options[k] || "").length).sort((a, b) => a - b);
    const med = dLens[1] || 20;
    const hint = corrLen > med * 1.3
      ? `To'g'ri javob ${corrLen} belgi, distraktorlar ~${med} belgi → to'g'ri javobni ~${med}-${Math.round(med * 1.2)} belgigacha QISQART (faktni saqlab).`
      : `Variantlarni bir xil uslub/uzunlikka keltir (~${Math.max(corrLen, med)} belgi atrofida).`;
    return `--- id=${q.id} ---\nMUAMMO: ${reasons}\nYO'RIQNOMA: ${hint}\nSavol: ${q.question}\n${opts}\nTo'g'ri javob: ${q.answer}`;
  }).join("\n\n");
  return `Sen test savollari muharririsan. Har savolda MUAMMO ko'rsatilgan: to'g'ri javob variantini o'qimasdan ham topish mumkin (u boshqalardan uzun/batafsil yoki faqat unda izoh bor).

VAZIFA — har savol uchun 4 variantni QAYTA YOZ:
1. To'g'ri javobning FAKTI/MAZMUNI MUTLAQO o'zgarmasin — faqat ortiqcha izoh/qavs/misolni olib tashlab QISQART.
2. Distraktorlar to'g'ri javob bilan BIR XIL uzunlik va uslubda bo'lsin (±20%).
3. Qavs, tire, "ya'ni" kabi izohlar: yo hamma variantda, yo hech birida.
4. Distraktorlar mavzuga oid, ishonarli, lekin ANIQ noto'g'ri bo'lsin.
5. Savol matni va to'g'ri javob HARFI o'zgarmasin.

FAQAT JSON massiv qaytar (boshqa matn YO'Q):
[{"id":<id>,"options":{"A":"...","B":"...","C":"...","D":"..."}}]

${qs}`;
}

async function callLLM(prompt, tries = 4) {
  for (let k = 0; k < tries; k++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 2500, ...(REASONING ? { reasoning_effort: REASONING } : {}) }),
      });
      if (res.status === 429 || res.status >= 500) { const ra = parseFloat(res.headers.get("retry-after")) || 3 * (k + 1); await sleep(Math.min(ra * 1000 + 300, 20000)); continue; }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const d = await res.json();
      const c = d.choices?.[0]?.message?.content;
      if (!c) { await sleep(2000 * (k + 1)); continue; }
      return c;
    } catch (e) { if (k === tries - 1) throw e; await sleep(2000 * (k + 1)); }
  }
  return "";
}

function extract(text) {
  let t = String(text).replace(/```(?:json)?/gi, "").trim();
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { const j = JSON.parse(t); return Array.isArray(j) ? j : null; } catch { return null; }
}

// Savolga necha marta urinilganini eslab boramiz (2 mazmunli urinishdan keyin unrepaired)
const attempts = {};
const parseFails = {};
let fixedNow = 0, failNow = 0;

const byId = new Map(data.map((q) => [String(q.id), q]));
let queue = [...todo];

while (queue.length) {
  const batch = queue.splice(0, BATCH);
  process.stdout.write(`[qoldi ${queue.length + batch.length}] id:${batch.map((q) => q.id).join(",")} ... `);
  try {
    const out = extract(await callLLM(buildPrompt(batch)));
    if (!out) {
      // parse xato = API band/qisqa javob — bu savolning aybi EMAS, urinish hisoblanmaydi
      parseFails[batch.map((q) => q.id).join(",")] = (parseFails[batch.map((q) => q.id).join(",")] || 0) + 1;
      const pf = parseFails[batch.map((q) => q.id).join(",")];
      console.log(`parse xato (${pf}-marta)`);
      if (pf < 4) queue.push(...batch); // 4 martagacha qayta
      else { for (const q of batch) { state[q.id] = "unrepaired"; failNow++; } }
      await sleep(3000);
      continue;
    }
    let okN = 0;
    for (const q of batch) {
      const fix = out.find((x) => String(x.id) === String(q.id));
      attempts[q.id] = (attempts[q.id] || 0) + 1;
      if (fix && fix.options && ["A", "B", "C", "D"].every((k) => typeof fix.options[k] === "string" && fix.options[k].trim())) {
        const cand = { ...q, options: fix.options };
        if (cueLeakReasons(cand).length === 0) {
          q.options = fix.options;
          state[q.id] = "fixed"; fixedNow++; okN++;
          continue;
        }
      }
      if (attempts[q.id] < 2) queue.push(q); // yana bir urinish
      else { state[q.id] = "unrepaired"; failNow++; }
    }
    fs.writeFileSync(inPath, JSON.stringify(data, null, 1), "utf8");
    fs.writeFileSync(statePath, JSON.stringify(state, null, 1), "utf8");
    console.log(`+${okN} tuzaldi (jami fixed: ${Object.values(state).filter((v) => v === "fixed").length})`);
  } catch (e) { console.log("XATO:", String(e.message).slice(0, 60)); for (const q of batch) queue.push(q); await sleep(5000); }
  await sleep(800);
}

fs.writeFileSync(inPath, JSON.stringify(data, null, 1), "utf8");
fs.writeFileSync(statePath, JSON.stringify(state, null, 1), "utf8");
const remaining = data.filter((q) => cueLeakReasons(q).length > 0).length;
console.log(`\n✓ Bu seans: tuzaldi ${fixedNow}, tuzalmadi ${failNow} | bankda hali buzuq: ${remaining}`);
