// Men (Claude) qo'lda yozgan savollarni (id oralig'i) bizning savol-tuzish REJIMI bo'yicha tekshiradi.
// Darvozalar: validateQuestion + cueLeakReasons + qo'shimcha rejim qoidalari (4,5,6,7-band).
// node pipeline/audit-mine.mjs [--from 1045] [--to 1200]
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
import { cueLeakReasons } from "./lib/quality.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const from = parseInt(A("--from", "1045"), 10);
const to = parseInt(A("--to", "1200"), 10);

const bank = JSON.parse(fs.readFileSync("fan/chqbt/gen_api_progress.json", "utf8"));
const mine = bank.filter((q) => q.id >= from && q.id <= to);

const BLOOM = { Y1: "Bilish", Y2: "Qo'llash", Y3: "Mulohaza" };
const CYR = /[Ѐ-ӿ]/;
const wordCount = (s) => String(s).trim().split(/\s+/).length;

let issues = [];
function flag(q, rule, msg) { issues.push({ id: q.id, qtype: q.qtype, rule, msg }); }

for (const q of mine) {
  // 1) Schema darvozasi (kanonik + minimal uzunlik + lotin + distinct + cue-leak ichida)
  const v = validateQuestion(q); // xatolar massivi
  if (v.length) flag(q, "schema", v.join("; "));

  // 2) cue-leak alohida
  const cl = cueLeakReasons(q);
  if (cl.length) flag(q, "cue-leak", cl.join("; "));

  // 3) difficulty <-> bloom_level mosligi (1-band)
  const bl = (q.bloom_level || "").replace(/ʻ/g, "'"); // egri apostrofni normalla
  if (BLOOM[q.difficulty] && bl !== BLOOM[q.difficulty]) flag(q, "bloom", `difficulty=${q.difficulty} lekin bloom=${q.bloom_level} (kutilgan: ${BLOOM[q.difficulty]})`);

  // 4) lotin-only (9-band)
  for (const f of ["question", "explanation", "mnemonic"]) if (CYR.test(q[f] || "")) flag(q, "krill", `${f} da krill harf`);
  for (const k of ["A", "B", "C", "D"]) if (CYR.test(q.options?.[k] || "")) flag(q, "krill", `option ${k} da krill harf`);

  // 5) explanation: "Manbada/Matnda" boshlama + variant harfi (6-band)
  const ex = q.explanation || "";
  if (/^\s*(Manbada|Matnda|Darslikda)\b/i.test(ex)) flag(q, "izoh-boshlama", "explanation 'Manbada/Matnda' bilan boshlanadi");
  if (/\b(variant|javob)\s*[ABCD]\b/.test(ex) || /\b[ABCD]\s*(to'g'ri|variant)/.test(ex)) flag(q, "izoh-harf", "explanation da variant harfi (A/B/C/D) bor");

  // 6) mnemonic bor va lotin (7-band)
  if (!q.mnemonic || !q.mnemonic.trim()) flag(q, "mnemonic", "mnemonic yo'q");

  // 7) variant uzunligi: eng uzun <= 1.6x eng qisqa; har biri <= 12 so'z (single uchun; 5-band)
  if (q.qtype === "single") {
    const lens = ["A", "B", "C", "D"].map((k) => (q.options[k] || "").length);
    const max = Math.max(...lens), min = Math.min(...lens);
    if (min > 0 && max / min > 1.6) flag(q, "uzunlik", `variant uzunligi nomutanosib (${min}→${max}, ${(max / min).toFixed(2)}x)`);
    for (const k of ["A", "B", "C", "D"]) if (wordCount(q.options[k]) > 12) flag(q, "so'z", `option ${k}: ${wordCount(q.options[k])} so'z (>12)`);
  }

  // 8) "barchasi/hech biri" (5-band)
  for (const k of ["A", "B", "C", "D"]) if (/barchasi|hech biri|yuqoridagi/i.test(q.options[k] || "")) flag(q, "barchasi", `option ${k}: taqiqlangan ibora`);

  // 9) matching/sequence struktura (1b-band)
  if (q.qtype === "matching" || q.qtype === "sequence") {
    if (!/\n\s*1[.)]/.test(q.question)) flag(q, "format", "savol matnida raqamli ro'yxat (1. 2. ...) yo'q");
    for (const k of ["A", "B", "C", "D"]) {
      const opt = q.options[k] || "";
      const okMap = q.qtype === "matching" ? /\d\s*-\s*[A-D]/.test(opt) : /^\s*\d+(\s*,\s*\d+)+/.test(opt);
      if (!okMap) flag(q, "format", `option ${k} mapping/tartib formatida emas: "${opt.slice(0, 20)}"`);
    }
  }
}

// Hisobot
const byRule = {};
for (const i of issues) byRule[i.rule] = (byRule[i.rule] || 0) + 1;
console.log(`\n=== AUDIT: id ${from}-${to} | ${mine.length} ta savol ===`);
console.log(`Format: single ${mine.filter((q) => q.qtype === "single").length} | matching ${mine.filter((q) => q.qtype === "matching").length} | sequence ${mine.filter((q) => q.qtype === "sequence").length}`);
const blooms = {}; for (const q of mine) blooms[q.difficulty] = (blooms[q.difficulty] || 0) + 1;
console.log(`Daraja: ${JSON.stringify(blooms)}`);
console.log(`\nJami buzilish: ${issues.length}`);
if (issues.length === 0) {
  console.log("✓ Barcha savol bizning rejim qoidalaridan TOZA o'tdi.");
} else {
  console.log("Qoida bo'yicha:"); for (const [r, c] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${r}: ${c}`);
  console.log("\nTafsilot:"); for (const i of issues) console.log(`  id=${i.id} [${i.qtype}] (${i.rule}) ${i.msg}`);
}
