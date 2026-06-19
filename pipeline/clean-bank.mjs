// Ilova-format savol bankini STANDART bo'yicha audit qiladi va xohlasa tozalaydi (dublikat + nuqsonli).
// App format: {q, opts:["A) ..."], correct, explanation, topicId, category, ...}. Asl obyektlar SAQLANADI,
// faqat butun nuqsonli/dublikat obyektlar olib tashlanadi (maydonlar buzilmaydi).
//
//   AUDIT (yozmaydi):  node pipeline/clean-bank.mjs --in src/data/questions_tarix.json
//   TOZALASH:          node pipeline/clean-bank.mjs --in <fayl> --apply [--drop-cue] [--drop-cyrillic] [--dup 0.82]
import fs from "fs";
import path from "path";
import { cueLeakReasons, comboReasons } from "./lib/quality.mjs";
import { hasCyrillic, cyrillicChars, normalize } from "./lib/normalize.mjs";
import { makeIndex, findDuplicate, addToIndex } from "./lib/dedup.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const has = (n) => args.includes(n);
const inPath = A("--in");
const outPath = A("--out", inPath);
const apply = has("--apply");
const dropCue = has("--drop-cue");
const dropCyr = has("--drop-cyrillic");
const dupTh = parseFloat(A("--dup", "0.82"));
if (!inPath || !fs.existsSync(inPath)) { console.error("--in <mavjud fayl> kerak"); process.exit(1); }

const LETTERS = ["A", "B", "C", "D"];
const comboRe = /^[a-z](\s*[,;]\s*[a-z])+$/i;
const seqRe = /^\s*\d+(\s*[,\-–]\s*\d+)+\s*$/;
const matchRe = /^\s*\d+\s*[-–]\s*[A-Za-z](\s*,\s*\d+\s*[-–]\s*[A-Za-z])*\s*$/;
function inferQtype(opts) {
  const v = LETTERS.map((L) => opts[L] || "");
  if (v.every((s) => matchRe.test(s))) return "matching";
  if (v.every((s) => seqRe.test(s))) return "sequence";
  if (v.every((s) => comboRe.test(s))) return "combo";
  return "single";
}
function toCanonical(o) {
  const opts = {};
  (o.opts || []).forEach((s, i) => { if (i < 4) opts[LETTERS[i]] = String(s).replace(/^\s*[A-DА-Д]\)\s*/, "").trim(); });
  return {
    question: String(o.q || "").trim(), options: opts, answer: LETTERS[o.correct] ?? "",
    explanation: String(o.explanation || "").trim(), mnemonic: String(o.mnemonic || "").trim(),
    qtype: inferQtype(opts), optCount: (o.opts || []).length,
  };
}
function structuralReasons(q, o) {
  const r = [];
  if (q.optCount !== 4) r.push(`variant soni ${q.optCount}`);
  if (q.question.length < 10) r.push("savol juda qisqa");
  for (const L of LETTERS) if (!q.options[L]) r.push(`variant ${L} bo'sh`);
  const vals = LETTERS.map((L) => (q.options[L] || "").toLowerCase()).filter(Boolean);
  if (new Set(vals).size < vals.length) r.push("takror variant");
  if (!LETTERS.includes(q.answer)) r.push(`javob indeksi yaroqsiz (correct=${o.correct})`);
  if (q.explanation.length < 10) r.push("izoh qisqa/yo'q");
  return r;
}

const rawTop = JSON.parse(fs.readFileSync(inPath, "utf8"));
const raw = Array.isArray(rawTop) ? rawTop : (rawTop.questions || rawTop.data || Object.values(rawTop).find(Array.isArray));
if (!Array.isArray(raw)) { console.error("massiv topilmadi"); process.exit(1); }

const idx = makeIndex(dupTh);
const exactSeen = new Map();
const kept = [];
const dropped = [];
const tally = { struktura: 0, latin: 0, cue: 0, combo: 0, aniq_dup: 0, yaqin_dup: 0 };
const sample = { struktura: [], latin: [], cue: [], combo: [], aniq_dup: [], yaqin_dup: [] };
const addSample = (k, i, sname, reason) => { if (sample[k].length < 4) sample[k].push(`  #${i} "${sname}" — ${reason}`); };

raw.forEach((o, i) => {
  const q = toCanonical(o);
  const sname = (q.question || "").slice(0, 55);
  const dropReasons = [];
  let primary = null;

  const sr = structuralReasons(q, o);
  if (sr.length) { dropReasons.push(...sr); primary = primary || "struktura"; tally.struktura++; addSample("struktura", i, sname, sr[0]); }

  const cyr = [q.question, q.options.A, q.options.B, q.options.C, q.options.D, q.explanation].filter((v) => hasCyrillic(v));
  if (cyr.length) { tally.latin++; addSample("latin", i, sname, `krill "${cyrillicChars(cyr.join(" "))}"`); if (dropCyr) { dropReasons.push("krill harf"); primary = primary || "latin"; } }

  const cue = cueLeakReasons(q);
  if (cue.length) { tally.cue++; addSample("cue", i, sname, cue[0].slice(0, 60)); if (dropCue) { dropReasons.push(cue[0]); primary = primary || "cue"; } }

  const cmb = comboReasons(q);
  if (cmb.length) { tally.combo++; addSample("combo", i, sname, cmb[0].slice(0, 60)); }

  // dublikat — faqat saqlanganlar bilan solishtiramiz (birinchisi qoladi)
  let isDup = false;
  const nk = normalize(q.question);
  if (nk && exactSeen.has(nk)) { tally.aniq_dup++; addSample("aniq_dup", i, sname, `#${exactSeen.get(nk)} bilan aynan`); dropReasons.push(`aniq dublikat (#${exactSeen.get(nk)})`); primary = primary || "aniq_dup"; isDup = true; }
  else if (q.question) {
    const hit = findDuplicate(idx, { question: q.question });
    if (hit) { tally.yaqin_dup++; addSample("yaqin_dup", i, sname, `${hit.score.toFixed(2)}: "${(hit.item.ref.question||"").slice(0,40)}"`); dropReasons.push(`yaqin dublikat ${hit.score.toFixed(2)}`); primary = primary || "yaqin_dup"; isDup = true; }
  }

  if (dropReasons.length) { dropped.push({ i, q: q.question, primary, reasons: dropReasons }); return; }
  // saqlanadi — indekslarga qo'shamiz
  if (nk) exactSeen.set(nk, i);
  if (q.question) addToIndex(idx, { question: q.question });
  kept.push(o);
});

const N = raw.length;
console.log(`\n=== ${path.basename(inPath)} — ${N} savol ===`);
console.log(`Nuqsonlar (standart bo'yicha):`);
console.log(`  Struktura buzuq        ${String(tally.struktura).padStart(4)}  ${dropCue||true ? "[o'chiriladi]" : ""}`);
console.log(`  Krill harf             ${String(tally.latin).padStart(4)}  ${dropCyr ? "[o'chiriladi]" : "[faqat belgilandi]"}`);
console.log(`  Javob-ishora (cue)     ${String(tally.cue).padStart(4)}  ${dropCue ? "[o'chiriladi]" : "[faqat belgilandi]"}`);
console.log(`  Combo buzuq            ${String(tally.combo).padStart(4)}  [faqat belgilandi]`);
console.log(`  Aniq dublikat          ${String(tally.aniq_dup).padStart(4)}  [o'chiriladi]`);
console.log(`  Yaqin dublikat ≥${dupTh}   ${String(tally.yaqin_dup).padStart(4)}  [o'chiriladi]`);
console.log(`\n  → O'chiriladi: ${dropped.length} | Qoladi: ${kept.length}`);

for (const k of ["struktura", "aniq_dup", "yaqin_dup", "cue", "latin"]) {
  if (sample[k].length) { console.log(`\n  [${k}] namuna:`); sample[k].forEach((s) => console.log(s)); }
}

if (apply) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const bak = inPath.replace(/\.json$/, `.bak-${stamp}.json`);
  fs.copyFileSync(inPath, bak);
  const dropFile = path.join("pipeline", `_dropped_${path.basename(inPath, ".json")}.json`);
  fs.writeFileSync(dropFile, JSON.stringify(dropped, null, 1), "utf8");
  fs.writeFileSync(outPath, JSON.stringify(kept, null, 2), "utf8");
  console.log(`\n✓ TOZALANDI: ${N} → ${kept.length} (${dropped.length} o'chirildi)`);
  console.log(`   backup:   ${bak}`);
  console.log(`   o'chirilganlar: ${dropFile}`);
  console.log(`   yozildi:  ${outPath}`);
} else {
  console.log(`\n(AUDIT rejimi — hech narsa yozilmadi. Tozalash uchun: --apply qo'shing)`);
}
