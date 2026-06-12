// Izohlardagi "Manbada/Matnda/Darslikda..." kabi keraksiz boshlanishlarni olib tashlaydi.
// node pipeline/fix-explanations.mjs [--in fan/chqbt/gen_api_progress.json] [--apply]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gen_api_progress.json");
const apply = args.includes("--apply");

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));

// Boshlanish: "Manbada / Matnda / Darslikda / Manba matnida / Berilgan matnda / Manbaga ko'ra" (+ ixtiyoriy vergul)
const LEAD = /^\s*(Manba\s+matnida|Manbaga\s+ko['’`]?ra|Manbada|Matnda|Darslikda|Berilgan\s+matnda|Matnga\s+ko['’`]?ra)\s*,?\s+/i;
// Oxiridagi "deb aytilgan/ko'rsatilgan/ta'kidlangan" dumlari grammatikani buzmasin deb tegmaymiz —
// faqat bosh so'z olib tashlanadi va birinchi harf katta qilinadi.

let fixed = 0;
const samples = [];
for (const q of data) {
  const ex = String(q.explanation || "");
  if (LEAD.test(ex)) {
    let neu = ex.replace(LEAD, "");
    neu = neu.charAt(0).toUpperCase() + neu.slice(1);
    if (samples.length < 8) samples.push([ex.slice(0, 70), neu.slice(0, 70)]);
    if (apply) q.explanation = neu;
    fixed++;
  }
}

console.log(`Jami: ${data.length} | Tuzatiladi: ${fixed}`);
console.log("\n--- NAMUNALAR (oldin → keyin) ---");
for (const [a, b] of samples) console.log(`✗ ${a}\n✓ ${b}\n`);

if (apply) {
  fs.writeFileSync(inPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✓ QO'LLANDI: ${fixed} ta izoh tuzatildi.`);
} else {
  console.log("(Qo'llash uchun --apply)");
}
