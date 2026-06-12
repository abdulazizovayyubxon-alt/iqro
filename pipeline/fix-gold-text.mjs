// Oltin bankда krill aralashuvi (lotin so'z ichidagi krill qo'shimchalar) va imlo (egri apostrof,
// mojibake, qo'sh bo'shliq) ni tuzatadi. Faqat MATN tozalanadi — fakt/javob o'zgarmaydi.
// node pipeline/fix-gold-text.mjs [--apply]
import fs from "fs";

const apply = process.argv.includes("--apply");
const inPath = "fan/chqbt/gold_bank.json";

// Krill -> lotin (faqat bankда uchragan harflar + to'liq xavfsizlik uchun kengaytirilgan)
const MAP = {
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ж": "j", "з": "z",
  "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p",
  "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x", "ц": "ts", "ч": "ch",
  "ш": "sh", "щ": "sh", "ъ": "'", "ь": "", "э": "e", "ю": "yu", "я": "ya",
  "ё": "yo", "ғ": "g'", "қ": "q", "ҳ": "h", "ў": "o'",
  // bosh harflar
  "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "И": "I", "К": "K",
  "Л": "L", "М": "M", "Н": "N", "О": "O", "П": "P", "Р": "R", "С": "S", "Т": "T",
  "У": "U", "Х": "X", "Ч": "Ch", "Ш": "Sh", "Қ": "Q", "Ғ": "G'", "Ҳ": "H", "Ў": "O'",
};

function translit(s) {
  let out = "";
  for (const ch of String(s)) out += (MAP[ch] !== undefined ? MAP[ch] : ch);
  return out;
}
function fixSpelling(s) {
  return String(s)
    .replace(/[ʻʼ‘’`´]/g, "'")        // egri apostroflar -> oddiy '
    .replace(/[ ]/g, " ")          // nbsp -> oddiy bo'shliq
    .replace(/ {2,}/g, " ")             // qo'sh bo'shliq
    .replace(/ ([,.;:!?])/g, "$1")     // tinish oldidagi bo'shliq
    .trim();
}
function clean(s) { return fixSpelling(translit(s)); }

const bank = JSON.parse(fs.readFileSync(inPath, "utf8"));
let nCyr = 0, nSpell = 0;
const CYR = /[Ѐ-ӿ]/;
for (const q of bank) {
  for (const f of ["question", "explanation", "mnemonic", "subtopic"]) {
    if (q[f] == null) continue;
    const had = CYR.test(q[f]); const before = q[f];
    const after = clean(q[f]);
    if (after !== before) { if (had) nCyr++; else nSpell++; q[f] = after; }
  }
  if (q.options) for (const k of ["A", "B", "C", "D"]) {
    if (q.options[k] == null) continue;
    const had = CYR.test(q.options[k]); const before = q.options[k];
    const after = clean(q.options[k]);
    if (after !== before) { if (had) nCyr++; else nSpell++; q.options[k] = after; }
  }
}

console.log(`Krill->lotin tuzatilган maydon: ${nCyr} | imlo (apostrof/bo'shliq) tuzatilган: ${nSpell}`);
if (apply) {
  fs.writeFileSync(inPath + ".bak_text", JSON.stringify(JSON.parse(fs.readFileSync(inPath, "utf8")), null, 1), "utf8");
  fs.writeFileSync(inPath, JSON.stringify(bank, null, 1), "utf8");
  console.log(`✓ QO'LLANDI. Zaxira: ${inPath}.bak_text`);
} else {
  console.log("(Ko'rish rejimi — --apply bilan yozing)");
}
