// ════════════════════════════════════════════════════════════════════════
// balance.mjs — yangi blokda to'g'ri javob HAR DOIM 0-indeksda yoziladi
// (yozish qulay bo'lsin uchun). Bu skript ularni A/B/C/D bo'yicha taqsimlaydi:
// opts va distractor_error birga suriladi, correct yangilanadi. Hech bir
// darvoza qoidasi variant indeksiga bog'liq emas — aylantirish xavfsiz.
//
// Ochko'z rejim: fan bo'yicha allaqachon yozilgan boshqa fayllardagi
// taqsimotni o'qib, har safar eng kam uchragan o'ringa qo'yadi.
//
//   node pipeline/chqbt600/balance.mjs topic3_b.json
// ════════════════════════════════════════════════════════════════════════
import fs from "node:fs";

const DIR = "pipeline/chqbt600/new";
const name = process.argv[2];
if (!name) { console.error("fayl nomi kerak (masalan topic3_b.json)"); process.exit(1); }
const topic = name.match(/^topic(\d+)/)?.[1];
if (!topic) { console.error("fayl nomidan topic aniqlanmadi"); process.exit(1); }

// Shu fandagi BOSHQA fayllarning mavjud taqsimoti — boshlang'ich hisob
const tally = [0, 0, 0, 0];
for (const f of fs.readdirSync(DIR)) {
  if (f === name || !new RegExp(`^topic${topic}(_[a-z0-9]+)?\.json$`).test(f)) continue;
  const qs = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"));
  if (qs.every((q) => q.correct === 0)) continue;   // hali aylantirilmagan blok — hisobga olinmaydi
  for (const q of qs) tally[q.correct]++;
}

const P = `${DIR}/${name}`;
const a = JSON.parse(fs.readFileSync(P, "utf8"));
let moved = 0;
for (const q of a) {
  if (q.correct !== 0) throw new Error("blok allaqachon aylantirilgan (javob 0-indeksda emas)");
  const k = tally.indexOf(Math.min(...tally));   // eng kam to'lgan o'rin
  tally[k]++;
  if (k === 0) continue;
  const o = [...q.opts], d = [...q.distractor_error];
  for (let j = 0; j < 4; j++) { q.opts[(j + k) % 4] = o[j]; q.distractor_error[(j + k) % 4] = d[j]; }
  q.correct = k;
  moved++;
}
fs.writeFileSync(P, JSON.stringify(a, null, 2) + "\n");
console.log(`${moved}/${a.length} aylantirildi · fan bo'yicha jami: ` +
  `A${tally[0]} B${tally[1]} C${tally[2]} D${tally[3]}`);
