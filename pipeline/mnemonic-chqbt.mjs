// Mnemonikasiz CHQBT savollariga 1 qatorli o'zbekcha mnemonika qo'shadi (ADDITIV — savol/javob TEGILMAYDI).
//   node pipeline/mnemonic-chqbt.mjs --file chqbt_app_import.enriched.json --smoke 6
//   node pipeline/mnemonic-chqbt.mjs --file chqbt_app_import.enriched.json --run
import fs from "fs";
import { hasCyrillic } from "./lib/normalize.mjs";

if (fs.existsSync(".env")) for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let keyIdx = 0;
const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FILE = A("--file", "chqbt_app_import.json");
const SMOKE = args.includes("--smoke") ? parseInt(A("--smoke", "6"), 10) : 0;
const RUN = args.includes("--run");
const TOPICS = ["Harbiy xizmat asoslari", "Umumharbiy nizomlar", "Otish tayyorgarligi", "Taktik tayyorgarlik", "Fuqaro muhofazasi", "Tibbiy bilim", "Pedagogik mahorat"];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout:" + l)), ms))]);
const stripL = s => String(s).replace(/^\s*[A-D]\)\s*/, "").trim();

async function callLLM(prompt, tries = 4) {
  for (let k = 0; k < tries; k++) {
    try {
      const key = keys[keyIdx % keys.length];
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4000 }),
        signal: AbortSignal.timeout(60000),
      }), 70000, "fetch");
      if (res.status === 429 || res.status >= 500 || !res.ok) { keyIdx++; await sleep(800); continue; }
      const data = await withTimeout(res.json(), 20000, "json");
      keyIdx++;
      const c = data.choices?.[0]?.message?.content;
      if (c) return c;
    } catch { keyIdx++; await sleep(1000 * (k + 1)); }
  }
  return "";
}

// Mnemonikani javobdan ajratib oladi (model ortiqcha matn qo'shsa ham)
function extractMnem(text) {
  let s = String(text).replace(/```[\s\S]*?```/g, "").trim();
  // JSON bo'lsa
  const jm = s.match(/"mnemonic"\s*:\s*"([^"]+)"/);
  if (jm) s = jm[1];
  // birinchi mazmunli qatorni olamiz
  s = s.split(/\r?\n/).map(x => x.trim()).filter(Boolean).filter(x => !/^(mnemonic|mnemonika|javob|izoh)[:\-]/i.test(x))[0] || s;
  s = s.replace(/^["'`]+|["'`.]+$/g, "").replace(/^mnemonika[:\-\s]*/i, "").trim();
  return s;
}
function validMnem(m, q) {
  if (!m || m.length < 6 || m.length > 140) return false;
  if (hasCyrillic(m)) return false;
  if (/\b[A-D]\)/.test(m) || /\b[A-D]\s+(variant|javob|to)/i.test(m)) return false; // harf-ishora
  return true;
}
function buildPrompt(q) {
  const correct = stripL(q.opts[q.correct]);
  return `CHQBT (harbiy ta'lim) test savoli uchun BITTA qator o'zbekcha mnemonika (yodlash uchun qisqa assotsiatsiya, qofiya yoki so'z o'yini) yoz. Quruq takror emas — esda qoladigan.

SAVOL: ${q.q}
TO'G'RI JAVOB: ${correct}

QOIDA: faqat lotin alifbosi (krill yo'q), 1 qator, variant harfini (A/B/C/D) yozma, qo'shtirnoqsiz.
CHIQISH: faqat mnemonika qatori, boshqa hech narsa.`;
}

async function main() {
  if (!fs.existsSync(FILE)) { console.error("Fayl yo'q:", FILE); process.exit(1); }
  const bank = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const need = bank.filter(q => !q.mnemonic || !String(q.mnemonic).trim());
  console.log(`Fayl: ${FILE} | jami ${bank.length} | mnemonikasiz: ${need.length}`);
  if (!need.length) { console.log("Hammasi mnemonikali — ish yo'q."); return; }

  if (SMOKE) {
    const step = Math.max(1, Math.floor(need.length / SMOKE));
    let ok = 0;
    for (let i = 0, c = 0; i < need.length && c < SMOKE; i += step, c++) {
      const q = need[i];
      const m = extractMnem(await callLLM(buildPrompt(q)));
      const good = validMnem(m, q);
      if (good) ok++;
      console.log(`\n[tid${q.topicId}] ${q.q.slice(0, 64)}`);
      console.log(`   ${good ? "✓" : "✗"} ${m}`);
      await sleep(300);
    }
    console.log(`\nSmoke: ${ok}/${SMOKE} valid. (Fayl o'zgarmadi.)`);
    return;
  }
  if (!RUN) { console.log("--smoke N yoki --run bering"); return; }

  let filled = 0, failed = 0, n = 0;
  for (const q of need) {
    const m = extractMnem(await callLLM(buildPrompt(q)));
    if (validMnem(m, q)) { q.mnemonic = m; filled++; } else failed++;
    if (++n % 15 === 0) { fs.writeFileSync(FILE, JSON.stringify(bank)); process.stdout.write(`\r  ${n}/${need.length} | to'ldirildi ${filled} | xato ${failed}   `); }
    await sleep(250);
  }
  fs.writeFileSync(FILE, JSON.stringify(bank));
  console.log(`\n✓ Mnemonika tugadi: ${filled} to'ldirildi, ${failed} xato (mnemonikasiz qoldi). → ${FILE}`);
}
main();
