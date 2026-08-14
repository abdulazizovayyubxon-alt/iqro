// MTT jismoniy tarbiya — mutaxassislik blokidagi MAKTAB atamalarini MTT atamalariga o'giradi.
//
// NEGA: bu fan MAKTABGACHA ta'lim yo'riqchisi uchun. Generatsiyada ayrim savollarga maktab
// leksikasi ("o'quvchi", "sinf") sizib kirgan — savolning o'zi to'g'ri, faqat atama noto'g'ri.
// Ped/kasb bloklariga TEGILMAYDI: rasmiy namunaning kasb standarti bloki ham umumta'lim
// maktabi konteksida yozilgan (namuna 39-savol: "10-sinf o'quvchilari..."), ya'ni u yerda
// maktab leksikasi xato emas.
//
// Almashtirish o'zak bo'yicha, qo'shimchani saqlab: o'quvchilarni→bolalarni, sinfida→guruhida.
// QO'RIQLAGICH: almashtirishdan keyin ikki variant bir xil bo'lib qolsa — o'sha savol o'tkaziladi.
//
//   node pipeline/_mttjt_deschool.mjs            # quruq yurish
//   node pipeline/_mttjt_deschool.mjs --apply    # gen_mut_*.json fayllarini yangilaydi
import fs from "fs";

const apply = process.argv.includes("--apply");
// gen_top_kasb ham shu ro'yxatda: u MTT kasbiy standarti manbasidan (maktabgacha kontekst)
// tuzilgan, ya'ni u yerda ham "o'quvchi/sinf" xato. SHARED_PED dan kelgan gen_pedkasb esa
// ro'yxatda YO'Q — u umumta'lim maktabi manbasiga asoslangan (rasmiy namuna ham shunday).
const FILES = [
  "fan/mtt_jismoniy/gen_mut_a.json",
  "fan/mtt_jismoniy/gen_mut_b.json",
  "fan/mtt_jismoniy/gen_top_atl.json",
  "fan/mtt_jismoniy/gen_top_oyin.json",
  "fan/mtt_jismoniy/gen_top_kasb.json",
].filter((f) => fs.existsSync(f));
const LETTERS = ["A", "B", "C", "D"];

// [o'zak-regex, yangi o'zak] — apostrofning ikkala shakli (' va ‘) qamrab olinadi.
const RULES = [
  [/o['’‘`]quvchi/g, "bola"],
  [/O['’‘`]quvchi/g, "Bola"],
  [/\bsinf/g, "guruh"],
  [/\bSinf/g, "Guruh"],
];

const swap = (s) => (typeof s === "string" ? RULES.reduce((t, [re, to]) => t.replace(re, to), s) : s);

let touched = 0, skipped = 0, total = 0;
const samples = [];

for (const file of FILES) {
  if (!fs.existsSync(file)) { console.error("❌ Fayl yo'q:", file); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  total += rows.length;
  for (const q of rows) {
    const before = JSON.stringify([q.question, q.options, q.explanation]);
    const next = {
      question: swap(q.question),
      options: Object.fromEntries(LETTERS.map((L) => [L, swap(q.options[L])])),
      explanation: swap(q.explanation),
    };
    if (JSON.stringify([next.question, next.options, next.explanation]) === before) continue;

    // Qo'riqlagich: variantlar bir-birini yutmasin
    const vals = LETTERS.map((L) => String(next.options[L]).trim().toLowerCase());
    if (new Set(vals).size !== vals.length) {
      skipped++;
      console.log(`  ⏭  #${q.id} o'tkazildi (almashtirish variantlarni bir xil qilib qo'yardi)`);
      continue;
    }
    if (samples.length < 8) samples.push(`  #${q.id}: ${q.question.replace(/\n/g, " ").slice(0, 68)}\n      → ${next.question.replace(/\n/g, " ").slice(0, 68)}`);
    if (apply) { q.question = next.question; q.options = next.options; q.explanation = next.explanation; }
    touched++;
  }
  if (apply) fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf8");
}

console.log(samples.join("\n"));
console.log(`\nmutaxassislik ${total} savol | atama tuzatildi: ${touched} | qo'riqlagich o'tkazdi: ${skipped}`);
console.log(apply ? "✓ Fayllar yangilandi." : "(quruq yurish — yozish uchun --apply)");
