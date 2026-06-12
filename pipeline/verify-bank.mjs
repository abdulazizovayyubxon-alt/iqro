// LLM-HAKAM: tayyor savollarni bepul API bilan QAYTA TEKSHIRADI (javob to'g'rimi, savol sog'lommi).
// Natija: pipeline/verify_report.json — har savolga verdikt (OK / SHUBHALI + sabab).
// node pipeline/verify-bank.mjs [--in fan/chqbt/gen_api_progress.json] [--batch 5] [--limit 0]
import fs from "fs";

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
const inPath = A("--in", "fan/chqbt/gen_api_progress.json");
const BATCH = parseInt(A("--batch", "5"), 10);
const LIMIT = parseInt(A("--limit", "0"), 10); // 0 = hammasi
const reportPath = "pipeline/verify_report.json";

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
const items = LIMIT > 0 ? data.slice(0, LIMIT) : data;

// Davom ettirish: avvalgi hisobot bo'lsa, tekshirilganlarni o'tkazib yuboramiz
let report = {};
if (fs.existsSync(reportPath)) report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(batch) {
  const qs = batch.map((q, i) => {
    const opts = ["A", "B", "C", "D"].map((k) => `${k}) ${q.options[k]}`).join("\n");
    return `--- SAVOL ${i + 1} (id=${q.id}) ---\nTuri: ${q.qtype}\n${q.question}\n${opts}\nBelgilangan javob: ${q.answer}\nIzoh: ${q.explanation || ""}`;
  }).join("\n\n");
  return `Sen O'zbekiston CHQBT (Chaqiruvga qadar boshlang'ich tayyorgarlik) fani bo'yicha imtihon savollari sifat nazoratchisisan.
Har bir savolni tekshir va FAQAT JSON massiv qaytar (boshqa matn yozma):
[{"id":<id>,"verdict":"OK"|"SHUBHALI","sabab":"<agar SHUBHALI bo'lsa qisqa sabab, aks holda bo'sh>"}]

SHUBHALI deb belgila, agar:
1. Belgilangan javob NOTO'G'RI bo'lsa (boshqa variant to'g'riroq);
2. Bir nechta variant teng darajada to'g'ri bo'lsa;
3. Savolda faktik xato bo'lsa (yosh, sana, raqam, nom xato);
4. Savol mantiqsiz/tushunarsiz bo'lsa yoki javob savolga mos kelmasa;
5. Matching/sequence savolda juftlik/tartib chalkash bo'lsa.
Mayda uslubiy g'alizlik OK hisoblanadi — faqat JIDDIY xatoni belgila.

${qs}`;
}

async function callLLM(prompt, tries = 4) {
  for (let k = 0; k < tries; k++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 2000, ...(REASONING ? { reasoning_effort: REASONING } : {}) }),
      });
      if (res.status === 429 || res.status >= 500) { const ra = parseFloat(res.headers.get("retry-after")) || 3 * (k + 1); await sleep(Math.min(ra * 1000 + 300, 20000)); continue; }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const c = data.choices?.[0]?.message?.content;
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

const todo = items.filter((q) => !report[q.id]);
console.log(`▶ Hakam: jami ${items.length}, tekshirilgan ${items.length - todo.length}, navbatda ${todo.length} (model ${MODEL})`);

let checked = 0, flagged = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  process.stdout.write(`[${i + 1}-${Math.min(i + BATCH, todo.length)}/${todo.length}] ... `);
  try {
    const out = extract(await callLLM(buildPrompt(batch)));
    if (!out) { console.log("parse xato"); continue; }
    for (const v of out) {
      if (v && v.id != null) {
        report[v.id] = { verdict: v.verdict === "SHUBHALI" ? "SHUBHALI" : "OK", sabab: v.sabab || "" };
        checked++;
        if (v.verdict === "SHUBHALI") flagged++;
      }
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 1), "utf8");
    console.log(`ok (shubhali jami: ${Object.values(report).filter((r) => r.verdict === "SHUBHALI").length})`);
  } catch (e) { console.log("XATO:", String(e.message).slice(0, 60)); }
  await sleep(600);
}

const allFlagged = Object.entries(report).filter(([, r]) => r.verdict === "SHUBHALI");
console.log(`\n✓ Tekshirildi: ${Object.keys(report).length}/${items.length} | SHUBHALI: ${allFlagged.length}`);
console.log(`Hisobot: ${reportPath}`);
if (allFlagged.length) {
  console.log("\n--- SHUBHALILAR (birinchi 20) ---");
  for (const [id, r] of allFlagged.slice(0, 20)) {
    const q = data.find((x) => String(x.id) === String(id));
    console.log(`✗ id=${id}: ${r.sabab}\n   ${String(q?.question || "").slice(0, 80)}`);
  }
}
