// CHQBT ammaldagi to'plam (chqbt_app_import.json, 2191) ni STANDARTga qarshi to'liq audit qiladi.
// Standart: lib/schema.mjs + lib/quality.mjs. App format {q, opts:["A) ..."], correct, explanation, mnemonic, topicId, image?}
// kanonik {question, options{A-D}, answer, explanation, mnemonic, qtype} ga o'giriladi va tekshiriladi.
// node pipeline/audit-app-import.mjs
import fs from "fs";
import { cueLeakReasons, comboReasons } from "./lib/quality.mjs";
import { hasCyrillic, cyrillicChars, normalize } from "./lib/normalize.mjs";
import { makeIndex, findDuplicate, addToIndex } from "./lib/dedup.mjs";

const LETTERS = ["A", "B", "C", "D"];
const NAMES = ["0 Harbiy xizmat asoslari", "1 Umumharbiy nizomlar", "2 Otish tayyorgarligi", "3 Taktik tayyorgarlik", "4 Fuqaro muhofazasi", "5 Tibbiy bilim", "6 Pedagogik mahorat"];
const comboRe = /^[a-z](\s*[,;]\s*[a-z])+$/i;          // "b, e" — faqat harflar
const seqRe = /^\s*\d+(\s*[,\-–]\s*\d+)+\s*$/;          // "1, 3, 2, 4" — faqat raqam tartibi
const matchRe = /^\s*\d+\s*[-–]\s*[A-Za-z](\s*,\s*\d+\s*[-–]\s*[A-Za-z])*\s*$/; // "1-C, 2-A"

// Ilova formati qtype'ni yo'qotadi — variant ko'rinishidan tiklaymiz.
function inferQtype(opts) {
  const v = LETTERS.map((L) => opts[L] || "");
  if (v.every((s) => matchRe.test(s))) return "matching";
  if (v.every((s) => seqRe.test(s))) return "sequence";
  if (v.every((s) => comboRe.test(s))) return "combo";
  return "single";
}

const raw = JSON.parse(fs.readFileSync("chqbt_app_import.json", "utf8"));

function toCanonical(o) {
  const opts = {};
  (o.opts || []).forEach((s, i) => {
    if (i < 4) opts[LETTERS[i]] = String(s).replace(/^\s*[A-DА-Д]\)\s*/, "").trim();
  });
  return {
    question: String(o.q || "").trim(),
    options: opts,
    answer: LETTERS[o.correct] ?? "",
    explanation: String(o.explanation || "").trim(),
    mnemonic: String(o.mnemonic || "").trim(),
    qtype: inferQtype(opts),
    optCount: (o.opts || []).length,
    topicId: o.topicId,
    image: o.image || null,
  };
}

// Tekshiruvlar — har biri sabab(lar) ro'yxatini qaytaradi
function structuralReasons(q, orig) {
  const r = [];
  if (q.optCount !== 4) r.push(`variant soni ${q.optCount} (4 bo'lishi kerak)`);
  if (q.question.length < 10) r.push("savol matni juda qisqa");
  for (const L of LETTERS) if (!q.options[L]) r.push(`variant ${L} bo'sh`);
  const vals = LETTERS.map((L) => (q.options[L] || "").toLowerCase());
  if (new Set(vals.filter(Boolean)).size < vals.filter(Boolean).length) r.push("takror variant bor");
  if (!LETTERS.includes(q.answer)) r.push(`to'g'ri javob indeksi yaroqsiz (correct=${orig.correct})`);
  if (q.explanation.length < 10) r.push("izoh juda qisqa yoki yo'q");
  return r;
}
function latinReasons(q) {
  const r = [];
  const fields = { savol: q.question, A: q.options.A, B: q.options.B, C: q.options.C, D: q.options.D, izoh: q.explanation, mnemonic: q.mnemonic };
  for (const [f, v] of Object.entries(fields)) if (hasCyrillic(v)) r.push(`${f}: krill harf "${cyrillicChars(v)}"`);
  return r;
}

const buckets = {
  struktura: [], latin: [], cue: [], combo: [], aniq_dup: [], yaqin_dup: [], rasm_yoq: [], mnemonic_yoq: 0,
};
const ansDist = { A: 0, B: 0, C: 0, D: 0 };
const perTopicAns = {};
const qtypeCount = { single: 0, combo: 0, matching: 0, sequence: 0 };
const imgRefs = new Set();

const idx = makeIndex(0.82);
const exactSeen = new Map(); // normalized -> first index

raw.forEach((o, i) => {
  const q = toCanonical(o);
  qtypeCount[q.qtype]++;
  if (LETTERS.includes(q.answer)) ansDist[q.answer]++;
  const tid = q.topicId ?? "?";
  (perTopicAns[tid] ||= { A: 0, B: 0, C: 0, D: 0 })[q.answer] = (perTopicAns[tid][q.answer] || 0) + 1;
  if (!q.mnemonic) buckets.mnemonic_yoq++;

  const sName = (q.question || "").slice(0, 70);
  const push = (bucket, reasons) => { if (reasons.length) buckets[bucket].push({ i, q: sName, reasons }); };

  push("struktura", structuralReasons(q, o));
  push("latin", latinReasons(q));
  push("cue", cueLeakReasons(q));
  push("combo", comboReasons(q));

  // aniq dublikat (normalized)
  const nk = normalize(q.question);
  if (nk) {
    if (exactSeen.has(nk)) buckets.aniq_dup.push({ i, q: sName, reasons: [`#${exactSeen.get(nk)} bilan aynan bir xil`] });
    else exactSeen.set(nk, i);
  }
  // yaqin dublikat (trigram >=0.82) — aniq dup bo'lmaganlar bilan
  const hit = findDuplicate(idx, { question: q.question });
  if (hit) buckets.yaqin_dup.push({ i, q: sName, reasons: [`o'xshashlik ${hit.score.toFixed(2)}: "${(hit.item.ref.question || "").slice(0, 50)}"`] });
  else addToIndex(idx, { question: q.question });

  // rasm
  if (q.image) {
    imgRefs.add(q.image);
    const p = "public" + q.image;
    if (!fs.existsSync(p)) buckets.rasm_yoq.push({ i, q: sName, reasons: [`rasm yo'q: ${q.image}`] });
  }
});

// ── Hisobot ──
const N = raw.length;
console.log(`\n=== CHQBT ammaldagi audit — ${N} savol ===`);
console.log(`qtype:  single ${qtypeCount.single} | matching ${qtypeCount.matching} | sequence ${qtypeCount.sequence} | combo ${qtypeCount.combo}`);
console.log(`Javob balansi (A/B/C/D): ${ansDist.A}/${ansDist.B}/${ansDist.C}/${ansDist.D}  (ideal ~${Math.round(N/4)} har biri)`);
console.log(`Rasmli savollar: ${imgRefs.size} ta rasm`);
console.log(`Mnemonika yo'q: ${buckets.mnemonic_yoq} ta\n`);

console.log("--- KAMCHILIKLAR (standart bo'yicha) ---");
const order = [["struktura","Struktura (variant/izoh/javob)"],["latin","Krill harf (lotin bo'lishi shart)"],["cue","Javob-ishora (cue-leak)"],["combo","Combo tuzilma buzuq"],["aniq_dup","Aniq dublikat"],["yaqin_dup","Yaqin dublikat (≥0.82)"],["rasm_yoq","Rasm fayli yo'q"]];
for (const [k, label] of order) console.log(`  ${label.padEnd(38)} ${buckets[k].length}`);

console.log("\n--- topicId bo'yicha javob balansi ---");
for (let t = 0; t <= 6; t++) {
  const d = perTopicAns[t] || { A: 0, B: 0, C: 0, D: 0 };
  const tot = d.A + d.B + d.C + d.D;
  console.log(`  ${NAMES[t].padEnd(28)} jami ${String(tot).padStart(4)}  | A${d.A} B${d.B} C${d.C} D${d.D}`);
}

// flagga olingan hammasini faylga
const out = {};
for (const [k] of order) out[k] = buckets[k];
fs.writeFileSync("pipeline/_audit_flags.json", JSON.stringify(out, null, 1), "utf8");
console.log(`\nBatafsil ro'yxat → pipeline/_audit_flags.json`);
