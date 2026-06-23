// 50 ta YANGI tibbiy (topicId 5) vaziyatli savol generatsiyasi — faktlar MAVJUD tibbiy savollar +
// darslikdan grounding (o'ylab topilmaydi). Dedup: trigram-jaccard. App formatda chiqadi.
//   node pipeline/_chqbt_tibbiy_gen.mjs --smoke
//   node pipeline/_chqbt_tibbiy_gen.mjs --target 50
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";
import { hasCyrillic } from "./lib/normalize.mjs";
import { trigrams, jaccard, normalize } from "./lib/normalize.mjs";

if (fs.existsSync(".env")) for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let keyIdx = 0;
const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SMOKE = args.includes("--smoke");
const TARGET = parseInt(A("--target", "50"), 10);
const OUT = "chqbt_tibbiy_new.json";
const L = ["A", "B", "C", "D"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("t:" + l)), ms))]);
const stripL = s => String(s).replace(/^\s*[A-D]\)\s*/, "").trim();

async function callLLM(prompt) {
  for (let k = 0; k < 4; k++) {
    try {
      const key = keys[keyIdx++ % keys.length];
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: 8000 }), signal: AbortSignal.timeout(60000) }), 70000, "f");
      if (!res.ok) { await sleep(700); continue; }
      const d = await res.json();
      const c = d.choices?.[0]?.message?.content;
      if (c) return c;
    } catch { await sleep(900 * (k + 1)); }
  }
  return "";
}
function parseArr(text) {
  let t = String(text).replace(/```(?:json)?/gi, "").trim();
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  const body = a >= 0 && b > a ? t.slice(a, b + 1) : t;
  for (const cand of [body, body.replace(/,(\s*[\]}])/g, "$1")]) { try { const j = JSON.parse(cand); if (Array.isArray(j)) return j; } catch {} }
  // qutqarish: alohida obyektlar
  const objs = []; let depth = 0, start = -1;
  for (let i = 0; i < t.length; i++) { if (t[i] === "{") { if (depth === 0) start = i; depth++; } else if (t[i] === "}") { depth--; if (depth === 0 && start >= 0) { try { objs.push(JSON.parse(t.slice(start, i + 1))); } catch {} start = -1; } } }
  return objs.length ? objs : null;
}

const bank = JSON.parse(fs.readFileSync("chqbt_app_import.json", "utf8"));
const tibbiy = bank.filter(q => q.topicId === 5);
// dedup bazasi: barcha mavjud savol stemlari (tibbiy + butun bank) trigram
const existingTri = bank.map(q => trigrams(normalize(q.q)));

// darslik grounding (tibbiy oynalar)
const TKW = /birinchi yordam|jarohat|qon ket|kuyish|sinish|singan|immobil|bog['‘]?lam|jgut|zaharlan|shok|sun['‘]?iy nafas|reanimatsiya|sovuq ur|issiq ur|elektr|bint|steril|arteriya|vena|pulse|puls|nafas yo['‘]?l/i;
let bookWins = [];
if (fs.existsSync("scratch/chqbt_book.txt")) {
  const bt = fs.readFileSync("scratch/chqbt_book.txt", "utf8").replace(/[ \t]+/g, " ");
  for (let i = 0; i < bt.length; i += 1100) { const w = bt.slice(i, i + 1400); if (TKW.test(w)) bookWins.push(w.trim()); }
}

function pickFacts(n) { const out = []; const pool = tibbiy.slice(); let s = Date.now() & 0x7fffffff; const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; }

function buildPrompt() {
  const facts = pickFacts(8).map(q => `• ${q.q} → ${stripL(q.opts[q.correct])}. (${q.explanation})`).join("\n");
  const book = bookWins.length ? bookWins[Math.floor(Math.random() * bookWins.length)].slice(0, 1100) : "";
  return `Siz CHQBT (chaqiruvga qadar boshlang'ich tayyorgarlik) "Tibbiy bilim asoslari" (birinchi tibbiy yordam) bo'yicha professional test-maker'siz. RASMIY DEMOTEST darajasidagi 6 ta YANGI, vaziyatli (Y2 — qo'llash) test savoli tuz.

FAKT MANBAI (FAQAT shu faktlardan va quyidagi darslik matnidan foydalan — yangi tibbiy fakt O'YLAB TOPMA):
${facts}
${book ? "\n--- DARSLIKDAN ---\n" + book : ""}

QOIDALAR:
1) Har savol — real harbiy/mashg'ulot/hayotiy VAZIYAT (jangchi, mashg'ulot, jarohat holati), so'ng birinchi yordam faktini QO'LLASH/TANLASH/FARQLASHni so'ra. Quruq ta'rif YOZMA.
2) Fakt FAQAT yuqoridagi manbadan. Aniq emas — o'sha savolni yozma.
3) 4 variant (A-D), bittasi to'g'ri; chalg'ituvchilar ishonarli, TIPIK xatoga asoslangan. Variantlar yaqin uzunlikda.
4) explanation: 2-3 jumla, faktni mazmunan asosla. Variant HARFINI (A/B/C/D) YOZMA.
5) mnemonic: 1 qator o'zbekcha assotsiatsiya.
6) FAQAT lotin alifbosi (krill YO'Q), imlo to'g'ri (o', g', sh, ch; tutuq: ma'no, ta'lim).

CHIQISH — FAQAT JSON massiv (markdown yo'q):
[{"q":"...","opts":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"...","mnemonic":"..."}]`;
}

function cleanExpl(ex) {
  let s = String(ex || "").trim();
  s = s.replace(/^\s*(to['’`]?\s?g['’`]?ri\s+javob|javob|[A-D]\s+variant\w*)\b[^.,]*[,.]\s*/i, "");
  s = s.replace(/\b(to['’`]?\s?g['’`]?ri\s+javob|javob|variant)\s*[—:\-]?\s*[A-D]\b\.?/gi, "");
  s = s.replace(/\s*\(([A-D])\)\s*/g, " ").replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").replace(/^[\s.,;:—-]+/, "").trim();
  if (s) s = s[0].toUpperCase() + s.slice(1);
  return s;
}
function validate(q, accTri) {
  if (!q || typeof q.q !== "string" || q.q.length < 25) return null;
  if (!Array.isArray(q.opts) || q.opts.length !== 4) return null;
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) return null;
  const opts = q.opts.map(stripL);
  if (opts.some(o => o.length < 1) || new Set(opts.map(o => o.toLowerCase())).size < 4) return null;
  q.explanation = cleanExpl(q.explanation);
  if (!q.explanation || q.explanation.length < 15) return null;
  if (!q.mnemonic || !String(q.mnemonic).trim()) return null;
  for (const f of [q.q, ...q.opts, q.explanation, q.mnemonic]) if (hasCyrillic(f)) return null;
  if (/\b[A-D]\)/.test(q.explanation) || /(javob|variant)\s+[A-D]\b/i.test(q.explanation)) return null;
  const canon = { options: Object.fromEntries(L.map((x, i) => [x, opts[i]])), answer: L[q.correct], qtype: "single", explanation: q.explanation };
  if (cueLeakReasons(canon).length) return null;
  // dedup
  const tri = trigrams(normalize(q.q));
  for (const t of existingTri) if (jaccard(tri, t) > 0.5) return null;
  for (const t of accTri) if (jaccard(tri, t) > 0.5) return null;
  return { q: q.q.trim(), opts: q.opts.map(s => s.trim()), correct: q.correct, explanation: q.explanation.trim(), mnemonic: String(q.mnemonic).trim(), topicId: 5 };
}

async function main() {
  console.log(`Mavjud tibbiy: ${tibbiy.length} | darslik tibbiy oyna: ${bookWins.length} | maqsad: +${SMOKE ? 6 : TARGET}`);
  const accepted = []; const accTri = [];
  const want = SMOKE ? 6 : TARGET;
  let calls = 0;
  while (accepted.length < want && calls < (SMOKE ? 2 : 40)) {
    const batch = await Promise.all(Array.from({ length: SMOKE ? 1 : 4 }, () => callLLM(buildPrompt())));
    calls += batch.length;
    for (const raw of batch) {
      const arr = parseArr(raw) || [];
      for (const q0 of arr) {
        if (accepted.length >= want) break;
        const v = validate(q0, accTri);
        if (v) { accepted.push(v); accTri.push(trigrams(normalize(v.q))); }
      }
    }
    process.stdout.write(`\r  qabul ${accepted.length}/${want} (${calls} chaqiruv)   `);
    if (SMOKE) break;
  }
  console.log();
  if (SMOKE) {
    accepted.forEach((q, i) => { console.log(`\n[${i + 1}] ${q.q}`); q.opts.forEach((o, j) => console.log(`   ${j === q.correct ? "✔" : " "} ${o}`)); console.log(`   Izoh: ${q.explanation}`); console.log(`   Mnem: ${q.mnemonic}`); });
    console.log(`\nSmoke: ${accepted.length} ta valid tibbiy. (Fayl yozilmadi.)`);
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(accepted, null, 1));
  console.log(`✓ ${accepted.length} ta yangi tibbiy → ${OUT}`);
}
main();
