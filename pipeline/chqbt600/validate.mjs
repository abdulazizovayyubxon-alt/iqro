// ════════════════════════════════════════════════════════════════════════
// validate.mjs — CHQBT-600 uchun YANGI yozilgan savollarni darvozalardan
// o'tkazadi. Bitta savol bitta darvozadan yiqilsa ham — RAD etiladi.
//
//   node pipeline/chqbt600/validate.mjs --topic 5
//   node pipeline/chqbt600/validate.mjs --topic 5 --json   (faqat xatolar)
// ════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import { cueLeakReasons } from "../lib/quality.mjs";
import { hasCyrillic } from "../lib/normalize.mjs";
import { buildIndex, findDuplicate, addToIndex } from "../lib/dedup.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const topic = Number(A("--topic", "5"));

const L = ["A", "B", "C", "D"];
// Katta bloklar bir necha faylga bo'linadi: topic0.json, topic0_b.json ...
export function loadNew(t) {
  const dir = "pipeline/chqbt600/new";
  const re = new RegExp(`^topic${t}(_[a-z0-9]+)?\\.json$`);
  return fs.readdirSync(dir).filter((f) => re.test(f)).sort()
    .flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")));
}
const NEW = loadNew(topic);
const LIVE = JSON.parse(fs.readFileSync("scratch/bundle_chqbt_after.json", "utf8"));

const ACTOR = /(o'qituvchi|o'quvchi|askar|harbiy xizmatchi|xizmatchi|navbatchi|qorovul|qo'mondon|komandir|serjant|kursant|shifokor|feldsher|instruktor|sanitar|ofitser|rahbar|boshli|mas'ul|guruh|bo'linma|rota|vzvod|jamoa|shaxsiy tarkib|qutqaruvchi|kuzatuvchi|jabrlanuvchi|yarador|bemor|sherigi|soqchi|patrul|komendant|dnevalniy|tarqatuvchi|haydovchi|fuqaro|yigit|talaba|vakil|ekspert|mutaxassis|ishtirokchi|komissiya|aholi|ota-ona|xodim|direktor|ovchi|tekshiruvchi|tahlilchi)/i;

// VAZIYAT: o'zak avval holatni TASVIRLAYDI, keyin savol beradi — ya'ni kamida
// ikkita mustaqil gap bo'lib, oxirgisi savol bo'lishi kerak. Bu "fe'l ro'yxati"
// bilan tekshirishdan ishonchliroq: ro'yxat har safar yangi so'z shakliga yiqiladi.
function sentenceCount(text) {
  return text.split(/[.!?;]+/).map((s) => s.trim()).filter((s) => s.length > 15).length;
}
const NUM_ONLY = /^[^A-Za-z]*(?:\d[^A-Za-z]*)+(?:yil|kun|soat|daqiqa|sekund|foiz|ta|m\/s|mm|sm|m|km|kg)?[^A-Za-z]*$/i;
const LETTER_REF = /\b[A-D]\s*[).,:-]?\s*(to'g'ri|javob|variant|noto'g'ri)|\b[A-D]\)|\b[A-D]\s*,\s*[A-D]\b/i;

const dupOpts = [];
// VARIANT TO'PLAMI TAKRORI: ikki savolda variantlar to'plami aynan bir xil
// bo'lsa, demak qo'lda tuzatishda variantlar noto'g'ri savolga tushib ketgan.
// Bu xato izoh va o'zakni jimgina buzadi, boshqa darvozalardan o'tib ketadi.
const optsKey = (q) => [...q.opts].map((o) => o.trim().toLowerCase()).sort().join("|");
const seenOpts = new Map();
NEW.forEach((q, i) => {
  const k = optsKey(q);
  if (seenOpts.has(k)) dupOpts.push([i, seenOpts.get(k)]);
  else seenOpts.set(k, i);
});
// Jonli bank + yangi savollarning o'zaro dublikat indeksi
const index = buildIndex(LIVE);

const report = [];
NEW.forEach((q, i) => {
  const bad = [];
  const text = String(q.q || "");
  const opts = (q.opts || []).map((s) => String(s).trim());
  const expl = String(q.explanation || "");

  const dupSet = dupOpts.find(([x]) => x === i);
  if (dupSet) bad.push(`variant to'plami #${dupSet[1] + 1} bilan aynan bir xil — tuzatish noto'g'ri savolga tushgan bo'lishi mumkin`);

  // 1. Tuzilma
  if (opts.length !== 4 || opts.some((o) => !o)) bad.push("variant soni 4 ta emas yoki bo'sh");
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) bad.push("correct 0-3 oralig'ida emas");
  if (new Set(opts.map((s) => s.toLowerCase())).size !== opts.length) bad.push("takroriy variant");
  if (opts.some((o) => /^[A-D]\)/.test(o))) bad.push("variantda 'A)' prefiksi bor — interfeys harfni o'zi qo'yadi");

  // 2. Majburiy metama'lumot
  if (!q.source_ref) bad.push("source_ref yo'q (e'tirozga javob shu maydondan yoziladi)");
  if (!["Y1", "Y2", "Y3"].includes(q.difficulty)) bad.push("difficulty Y1/Y2/Y3 emas");
  if (!Array.isArray(q.distractor_error) || q.distractor_error.length !== 4) bad.push("distractor_error 4 elementli massiv emas");
  else {
    if (q.distractor_error[q.correct] !== "") bad.push("distractor_error: to'g'ri javob o'rni bo'sh bo'lishi kerak");
    q.distractor_error.forEach((d, j) => { if (j !== q.correct && !d) bad.push(`distractor_error[${j}] bo'sh — chalg'ituvchi qaysi xatoga asoslangani ko'rsatilmagan`); });
  }

  // 3. Vaziyatlilik va murakkablik
  if (text.length < 120) bad.push(`o'zak qisqa: ${text.length} belgi`);
  if (!ACTOR.test(text)) bad.push("vaziyat: aktor yo'q (kim bilan sodir bo'lmoqda?)");
  if (sentenceCount(text) < 2) bad.push("vaziyat: holat tasvirlanmagan — o'zak bitta gapdan iborat");
  if (!text.trim().endsWith("?")) bad.push("o'zak savol bilan tugamaydi");
  if (opts.every((o) => NUM_ONLY.test(o))) bad.push("javob quruq son/sana");

  // 4. Psixometrika
  const o = {}; opts.forEach((v, j) => (o[L[j]] = v));
  cueLeakReasons({ options: o, answer: L[q.correct], qtype: "single", explanation: expl }).forEach((r) => bad.push(r));
  // UZUNLIK ISHORASI. Muhimi variantlar orasidagi umumiy tarqoqlik emas —
  // TO'G'RI javobning ajralib turishi. Nasriy variantlarda tabiiy farq bo'ladi;
  // xavf faqat to'g'ri javob eng uzun bo'lib, mediananing 1.35 barobaridan
  // oshganda paydo bo'ladi (cueLeak chegarasi 1.6 — bu undan qattiqroq).
  const lens = opts.map((s) => s.length);
  const dLens = lens.filter((_, j) => j !== q.correct).sort((a, b) => a - b);
  const med = dLens[Math.floor(dLens.length / 2)] || 1;
  // Mutlaq chegara ham kerak: «Ilmiylik tamoyili» va «Ko'rgazmalilik tamoyili»
  // orasidagi 6 belgilik farq nisbatan katta bo'lsa-da, o'quvchi uchun ishora emas.
  // Ishora faqat farq KO'ZGA TASHLANADIGAN bo'lganda (>=20 belgi) paydo bo'ladi.
  if (lens[q.correct] === Math.max(...lens) && lens[q.correct] > 1.35 * med && lens[q.correct] - med >= 20) {
    bad.push(`uzunlik ishorasi: to'g'ri javob eng uzun (${lens[q.correct]} belgi, distraktor mediana ${med})`);
  }
  if (Math.max(...lens) > 2.2 * Math.min(...lens)) {
    bad.push(`variantlar juda tarqoq: ${Math.min(...lens)}-${Math.max(...lens)} belgi`);
  }

  // 5. Izoh
  if (expl.length < 80) bad.push("izoh qisqa (<80)");
  if (LETTER_REF.test(expl)) bad.push("izohda variant HARFiga ishora bor");
  if (!q.mnemonic) bad.push("mnemonic yo'q");

  // 6. Imlo
  if (hasCyrillic(text) || opts.some(hasCyrillic) || hasCyrillic(expl)) bad.push("krill harf");

  // 7. Dublikat (jonli bank + oldingi yangi savollar)
  const dup = findDuplicate(index, q);
  if (dup) bad.push(`dublikat (${dup.score.toFixed(2)}): ${String(dup.item.q || "").slice(0, 60)}...`);
  addToIndex(index, q);

  report.push({ i, ok: bad.length === 0, bad, q: text.slice(0, 70) });
});

const ok = report.filter((r) => r.ok).length;
console.log(`\nCHQBT-600 · topic ${topic} · yangi savollar tekshiruvi`);
console.log(`O'tdi: ${ok}/${NEW.length}\n`);
report.filter((r) => !r.ok).forEach((r) => {
  console.log(`✗ #${r.i} ${r.q}...`);
  r.bad.forEach((b) => console.log(`    · ${b}`));
});

// Balans
const dist = {}; NEW.forEach((q) => (dist[L[q.correct]] = (dist[L[q.correct]] || 0) + 1));
const dif = {}; NEW.forEach((q) => (dif[q.difficulty] = (dif[q.difficulty] || 0) + 1));
console.log(`\nTo'g'ri javob taqsimoti: ${JSON.stringify(dist)}`);
console.log(`Kognitiv daraja: ${JSON.stringify(dif)}`);
console.log(`O'zak uzunligi: ${Math.min(...NEW.map((q) => q.q.length))}-${Math.max(...NEW.map((q) => q.q.length))} belgi`);
if (ok !== NEW.length) process.exitCode = 1;
