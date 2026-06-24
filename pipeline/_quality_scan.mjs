// Jonli korpus sifat skaneri (API'siz, statik).
// Mahalliy app-format fayllarni (fan/*/_app.json ...) quality.mjs darvozasidan o'tkazadi.
// Natija: har fan + umumiy bo'yicha zaif savol foizi (cue-leak, combo buzuq, padding).
import fs from "fs";
import path from "path";
import { cueLeakReasons, comboReasons } from "./lib/quality.mjs";

const ROOT = path.resolve(".");
const LETTERS = ["A", "B", "C", "D"];

// Skanlanadigan fayllar
const files = [];
const fanDir = path.join(ROOT, "fan");
for (const sub of fs.readdirSync(fanDir, { withFileTypes: true })) {
  if (!sub.isDirectory()) continue;
  for (const name of ["_app.json", "_ped5_app.json", "_ped_app.json"]) {
    const p = path.join(fanDir, sub.name, name);
    if (fs.existsSync(p)) files.push(p);
  }
}
for (const f of ["art_app_import.json", "chqbt_app_import.json"]) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) files.push(p);
}

// App-format → quality.mjs format + savol TURINI to'g'ri aniqlash
const comboRe = /^[a-z0-9](\s*[,;]\s*[a-z0-9])+$/i;
const matchOptRe = /^\d+\s*[-–]\s*[A-Da-d]/;       // "1-B, 2-A" → matching
const seqOptRe = /^[\dIVX]+(\s*[,;>→-]\s*[\dIVX]+)+$/i; // "3, 1, 2, 4" → ketma-ketlik
function classify(stem, opts) {
  const vals = LETTERS.map((L) => opts[L] || "");
  const seqStem = /ketma-ket|tartibda joylashtir|tartibni (belgilang|aniqlang)|xronologik|joylashtiring/i.test(stem);
  const matchStem = /moslashtir|mos keladigan|juftla|bog['’`]?lang/i.test(stem);
  if (vals.every((v) => matchOptRe.test(v))) return "matching";
  if (vals.every((v) => seqOptRe.test(v))) return seqStem ? "sequence" : "combo";
  if (matchStem && vals.some((v) => matchOptRe.test(v))) return "matching";
  if (seqStem) return "sequence";
  if (vals.every((v) => comboRe.test(v))) return "combo";
  return "single";
}
function adapt(item) {
  const opts = {};
  (item.opts || []).forEach((s, i) => {
    if (i < 4) opts[LETTERS[i]] = String(s).replace(/^[A-D]\)\s*/, "").trim();
  });
  const kind = classify(item.q || "", opts);
  return {
    question: item.q || "",
    options: opts,
    answer: LETTERS[item.correct] ?? "A",
    qtype: kind === "combo" ? "combo" : "single",
    _kind: kind,
    explanation: item.explanation || "",
    _mnemonic: item.mnemonic || "",
  };
}

// Padding/junk naqshlar (questionFixer band-aid bilan ishlov beradigan — runtime'da yamaladi)
const JUNK_MNEMONIC = [
  /kalit so['’`]?\s?z(ga|ni)?\s+e['’`]?tibor/i,  // "Kalit so'zga e'tibor bering"
  /to['’`]?\s?g['’`]?ri javob:\s*[A-D]\b/i,       // "To'g'ri javob: C" (javob-leak)
  /#KS\d+/,                                          // padding teg
  /\[mavzu:/i,
];
function isJunkMnemonic(m) {
  const s = String(m).trim();
  if (!s) return false;
  if (/^[A-Da-d]$/.test(s)) return true;            // yolg'iz harf
  return JUNK_MNEMONIC.some((re) => re.test(s));
}

const perFile = [];
let TOT = 0, CUE = 0, COMBO = 0, PAD = 0, WEAK = 0;
const KIND = { single: 0, matching: 0, sequence: 0, combo: 0 };
const cueExamples = [];

for (const f of files) {
  let data;
  try { data = JSON.parse(fs.readFileSync(f, "utf8")); }
  catch { console.log("  (o'qib bo'lmadi:", f, ")"); continue; }
  const arr = Array.isArray(data) ? data : (data.questions || data.items || []);
  let n = 0, cue = 0, combo = 0, pad = 0, weak = 0;
  for (const item of arr) {
    if (!item || !item.opts) continue;
    n++;
    const q = adapt(item);
    KIND[q._kind] = (KIND[q._kind] || 0) + 1;
    // Faqat tegishli darvoza: single→cue-leak, combo→combo struktura.
    // matching/sequence — bu turlarga single/combo qoidalari QO'LLANMAYDI (soxta bayroq beradi).
    const cueR = q._kind === "single" ? cueLeakReasons(q) : [];
    const comboR = q._kind === "combo" ? comboReasons(q) : [];
    const padBad = isJunkMnemonic(q._mnemonic);
    if (cueR.length) { cue++; if (cueExamples.length < 14) cueExamples.push({ f: path.basename(path.dirname(f)) + "/" + path.basename(f), q: q.question.slice(0, 72), r: cueR[0] }); }
    if (comboR.length) combo++;
    if (padBad) pad++;
    if (cueR.length || comboR.length) weak++; // "zaif" = tegishli darvoza qulaydi
  }
  perFile.push({ f: path.relative(ROOT, f), n, cue, combo, pad, weak });
  TOT += n; CUE += cue; COMBO += combo; PAD += pad; WEAK += weak;
}

const pct = (x) => ((100 * x) / (TOT || 1)).toFixed(1) + "%";
console.log("\n================ FAN BO'YICHA (tur bo'yicha to'g'ri darvoza) ================");
console.log("fayl".padEnd(38), "jami".padStart(6), "cue".padStart(6), "combo".padStart(6), "zaif%".padStart(7));
for (const r of perFile.sort((a, b) => b.weak / (b.n || 1) - a.weak / (a.n || 1))) {
  const wp = ((100 * r.weak) / (r.n || 1)).toFixed(1) + "%";
  console.log(r.f.padEnd(38), String(r.n).padStart(6), String(r.cue).padStart(6), String(r.combo).padStart(6), wp.padStart(7));
}
console.log("\n================ SAVOL TURLARI ================");
for (const [k, v] of Object.entries(KIND)) console.log(`  ${k.padEnd(10)}: ${v.toLocaleString()} (${((100*v)/(TOT||1)).toFixed(1)}%)`);
console.log("\n================ UMUMIY ================");
console.log(`Jami skanlandi:          ${TOT.toLocaleString()} savol (${perFile.length} fayl)`);
console.log(`Cue-leak (faqat single): ${CUE.toLocaleString()}  (${pct(CUE)}) — runtime YAMAMAYDI, foydalanuvchi ko'radi`);
console.log(`Combo buzuq (faqat combo):${COMBO.toLocaleString()}  (${pct(COMBO)})`);
console.log(`Padding/junk mnemonic:   ${PAD.toLocaleString()}  (${pct(PAD)})`);
console.log(`\n>>> ZAIF (haqiqiy, tur-to'g'ri): ${WEAK.toLocaleString()}  (${pct(WEAK)})`);
console.log(`>>> Toza:                       ${(TOT - WEAK).toLocaleString()}  (${pct(TOT - WEAK)})`);

console.log("\n--- HAQIQIY CUE-LEAK NAMUNALARI (single savollarda) ---");
for (const e of cueExamples) console.log(`✗ [${e.f}] ${e.q}\n    → ${e.r}`);
