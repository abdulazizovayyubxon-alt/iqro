// Axlat-savollarni avtomat topib olib tashlaydi (muqova/mundarija/OCR xatolar).
// node pipeline/clean-junk.mjs [--in fan/chqbt/gen_api_progress.json] [--apply]
// --apply bo'lmasa faqat HISOBOT ko'rsatadi (hech narsa o'zgarmaydi).
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gen_api_progress.json");
const apply = args.includes("--apply");

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));

// Axlat belgilari: darslikning O'ZI haqidagi savollar (mazmun emas, metama'lumot)
const JUNK_PATTERNS = [
  [/ISBN/i, "ISBN (muqova ma'lumoti)"],
  [/necha\s+bet|betdan\s+iborat|sahifa(da|si|dan)?\s|qaysi\s+sahifa/i, "bet/sahifa raqami (mundarija)"],
  [/nashr\s+(qilingan|etilgan|yili)|nashriyot/i, "nashr yili/nashriyot (muqova)"],
  [/darslik\s+(muallif|kim|necha|qaysi\s+yil)|muallif(lar)?i?\s+(kim|emas|qaysi)/i, "darslik muallifi (muqova)"],
  [/mundarija/i, "mundarija"],
  [/taqrizchi|mas['’]?ul\s+muharrir/i, "taqrizchi/muharrir (muqova)"],
  [/UO['’]?K|KBK/i, "UO'K/KBK klassifikator (muqova)"],
  [/nechta\s+(asosiy\s+)?(band|bo['’]?lim|bob)\s+(tavsiflangan|bor|keltirilgan|mavjud)/i, "bob/band soni (mundarija)"],
  [/qaysi\s+bob(da)?\s+(joylashgan|keltirilgan|bayon)/i, "qaysi bobda (mundarija)"],
];

// OCR xato belgilari: shubhali raqamlar
const OCR_PATTERNS = [
  [/\b8\s*[-–—]\s*27\s*yosh/i, "OCR xato: '8-27 yosh' (aslida 18-27)"],
];

const junk = [], ocr = [], clean = [];
for (const q of data) {
  const text = [q.question, ...Object.values(q.options || {}), q.explanation].join(" ");
  const j = JUNK_PATTERNS.find(([re]) => re.test(text));
  if (j) { junk.push({ q, reason: j[1] }); continue; }
  const o = OCR_PATTERNS.find(([re]) => re.test(text));
  if (o) { ocr.push({ q, reason: o[1] }); continue; }
  clean.push(q);
}

console.log(`Jami: ${data.length}`);
console.log(`Axlat (muqova/mundarija): ${junk.length}`);
console.log(`OCR xato: ${ocr.length}`);
console.log(`Toza qoladi: ${clean.length}`);

console.log("\n--- O'CHIRILADIGANLAR (birinchi 30) ---");
for (const { q, reason } of [...junk, ...ocr].slice(0, 30)) {
  console.log(`✗ [${reason}] ${String(q.question).slice(0, 90)}`);
}

if (apply) {
  fs.writeFileSync(inPath + ".bak", JSON.stringify(data, null, 2), "utf8"); // zaxira
  clean.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(inPath, JSON.stringify(clean, null, 2), "utf8");
  const removed = [...junk, ...ocr].map(({ q, reason }) => ({ reason, question: q.question }));
  fs.writeFileSync("pipeline/removed_junk.json", JSON.stringify(removed, null, 2), "utf8");
  console.log(`\n✓ QO'LLANDI: ${clean.length} qoldi | zaxira: ${inPath}.bak | o'chirilganlar: pipeline/removed_junk.json`);
} else {
  console.log("\n(Hech narsa o'zgartirilmadi — qo'llash uchun --apply qo'shing)");
}
