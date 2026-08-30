// ════════════════════════════════════════════════════════════════════════
// screen.mjs — CHQBT-600: jonli bankdan (2383) nomzodlarni MEXANIK saralash.
//
// NEGA: bankning sifat nuqsonlari o'lchandi (CHQBT600_REJA.md, 1-bo'lim).
// Bu skript hech narsani o'chirmaydi — faqat har savolga HUKM va SABAB yozadi,
// keyingi (Claude bahosi) bosqichiga faqat "pass" bo'lganlar chiqadi.
//
// FOYDALANISH:
//   node pipeline/chqbt600/screen.mjs
//   node pipeline/chqbt600/screen.mjs --src scratch/bundle_chqbt_after.json
// ════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { cueLeakReasons } from "../lib/quality.mjs";
import { hasCyrillic } from "../lib/normalize.mjs";
import { imloReasons } from "./imlo.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SRC = A("--src", "scratch/bundle_chqbt_after.json");
const OUT = "pipeline/chqbt600/out";

const L = ["A", "B", "C", "D"];
const strip = (s) => String(s).replace(/^[A-D]\)\s*/, "").trim();

// ── Darvozalar ──────────────────────────────────────────────────────────

// 1) Vaziyat belgisi: savol o'zagida real aktor + hodisa bo'lishi kerak.
const ACTOR = /(o'qituvchi|oʻqituvchi|o'quvchi|askar|harbiy xizmatchi|navbatchi|qorovul|qo'mondon|komandir|serjant|kursant|shifokor|guruh|bo'linma|rota|vzvod|jamoa|pedagog|sinf rahbari)/i;
const EVENT = /(aniqlandi|duch keldi|kuzatildi|qayd etildi|yetkazildi|topildi|bo'lib o'tdi|sodir bo'ldi|ma'lum bo'ldi|buyurdi|komanda ber|signal ber|murojaat qildi|shikoyat|holatda|vaziyatda|jarayonida|davomida|mashg'ulot|mashq)/i;

// 2) "Ta'rif niqobidagi" savol: vaziyat yozilgan-u, aslida atama so'ralmoqda.
const DEFINITION_ASK = /(qanday (jarayon|holat|hodisa)? ?sifatida (to'g'ri )?ta'riflanadi|qaysi ta'rif|nima deb ataladi|qanday ataladi|qaysi tushuncha|ta'rifi bilan beriladi|qaysi atama)/i;

// 3) Javob "quruq fakt" bo'lmasin: sana, son, o'lchov, yalang'och atama.
const NUM_ONLY = /^[^A-Za-z]*(?:\d[^A-Za-z]*)+(?:yil|yilda|kun|soat|daqiqa|sekund|soniya|foiz|ta|m\/s|mm|sm|m|km|kg|gradus|marta|nafar|kishi)?[^A-Za-z]*$/i;
const HAS_VERB = /\b(qil|bo'l|ber|ol|kel|ket|yoz|ko'r|tur|bor|yordam|tartib|usul|holat|harakat)/i;
function isBareFact(s) {
  const t = strip(s);
  if (NUM_ONLY.test(t)) return true;                       // "2 daqiqa 10 sekund", "1992-yil 3-iyul", "20-25 m/s"
  return t.split(/\s+/).length <= 2 && !HAS_VERB.test(t);  // "Zarin", "Adamsit"
}

// 4) BUZILGAN IZOH — ilgari izohdan A/B/C/D harflari skript bilan olib
//    tashlangan va gap chala qolgan ("B va harakatlar standart..."). Bu matn
//    o'quvchiga KO'RINADI, ya'ni to'g'ridan-to'g'ri e'tiroz manbai.
const BROKEN_EXPL = [
  /(?:^|\.\s+)\s*(va|ham|esa|chunki|bo'lib|hisoblanadi|taalluqli|javoblar|xato|noto'g'ri)\b/,
  /\b[A-D]\s+(?:va|,)\s+[A-D]?\s*(?:javob|variant)?/,
  /\s{2,}|\(\s*\)|,\s*\)|\bva\s*\)/,
  /[a-z'\u2019],\s*$/,
];

function screen(q) {
  const reasons = [];
  const text = String(q.q || "");
  const expl = String(q.explanation || "");
  const opts = (q.opts || []).slice(0, 4).map(strip);

  if (opts.length < 4 || opts.some((o) => !o)) reasons.push("variant to'liq emas");

  // cue-leak (mavjud psixometrik tekshiruv)
  const o = {}; opts.forEach((v, i) => (o[L[i]] = v));
  const cue = cueLeakReasons({ options: o, answer: L[q.correct], qtype: "single", explanation: expl });
  cue.forEach((r) => reasons.push(r));

  if (text.length < 120) reasons.push(`jo'n: o'zak ${text.length} belgi (<120)`);
  if (!ACTOR.test(text) || !EVENT.test(text)) reasons.push("vaziyat yo'q: aktor yoki hodisa tasviri topilmadi");
  if (DEFINITION_ASK.test(text)) reasons.push("ta'rif niqobida: vaziyat bor, lekin atama so'ralmoqda");
  if (opts.length === 4 && opts.every(isBareFact)) reasons.push("soxta vaziyat: javob quruq sana/son/atama");
  if (expl.length < 80) reasons.push("izoh juda qisqa (<80 belgi)");
  if (BROKEN_EXPL.some((re) => re.test(expl))) reasons.push("buzilgan izoh: harf olib tashlangan, gap chala");
  if (/\d\s*-?\s*(raqamli\s*)?(rasm|chizma|surat)|rasmda|chizmada|suratda/i.test(text) && !q.image) {
    reasons.push("matn rasmga ishora qiladi, lekin rasm yo'q");
  }
  if (hasCyrillic(text) || opts.some((s) => hasCyrillic(s))) reasons.push("krill harf aralashgan");
  imloReasons([text, ...opts, expl].join(" \n ")).forEach((r) => reasons.push(r));

  return reasons;
}

// ── Ish ─────────────────────────────────────────────────────────────────

const all = JSON.parse(fs.readFileSync(SRC, "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const scored = all.map((q) => {
  const reasons = screen(q);
  return { ...q, __verdict: reasons.length ? "fail" : "pass", __reasons: reasons };
});

const pass = scored.filter((x) => x.__verdict === "pass");
fs.writeFileSync(path.join(OUT, "screen_all.json"), JSON.stringify(scored));
fs.writeFileSync(path.join(OUT, "candidates.json"), JSON.stringify(pass, null, 1));

const TARGET = { 0: 96, 1: 96, 2: 84, 3: 48, 4: 48, 5: 48, 6: 180 };
const NAME = {
  0: "Harbiy xizmat asoslari", 1: "Umumharbiy nizomlar", 2: "Otish tayyorgarligi",
  3: "Taktik tayyorgarlik", 4: "Fuqaro muhofazasi", 5: "Tibbiy bilim asoslari",
  6: "Ped. mahorat + kasb standarti",
};
const rows = Object.keys(TARGET).map((k) => {
  const t = Number(k);
  const inTopic = scored.filter((x) => x.topicId === t);
  const ok = inTopic.filter((x) => x.__verdict === "pass").length;
  return { t, jami: inTopic.length, nomzod: ok, kerak: TARGET[t], yetishmaydi: Math.max(0, TARGET[t] - ok) };
});

const why = {};
scored.filter((x) => x.__verdict === "fail").forEach((x) =>
  x.__reasons.forEach((r) => { const k = r.split(/[:(]/)[0].trim(); why[k] = (why[k] || 0) + 1; }));

let md = `# CHQBT-600 · mexanik saralash hisoboti\n\nManba: \`${SRC}\` — ${all.length} ta savol\n`;
md += `Nomzod (barcha darvozadan o'tdi): **${pass.length}**\n\n`;
md += `| topicId | Bo'lim | Bazada | Nomzod | 600 da kerak | Yozish kerak |\n|---|---|---|---|---|---|\n`;
rows.forEach((r) => { md += `| ${r.t} | ${NAME[r.t]} | ${r.jami} | ${r.nomzod} | ${r.kerak} | ${r.yetishmaydi} |\n`; });
md += `\n## Rad sabablari (bitta savolda bir nechta bo'lishi mumkin)\n\n`;
Object.entries(why).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { md += `- **${v}** × ${k}\n`; });
fs.writeFileSync(path.join(OUT, "report.md"), md);

console.log(md);
console.log(`→ ${OUT}/candidates.json (${pass.length} ta)`);
