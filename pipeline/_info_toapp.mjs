// Informatika bankini ILOVA formatiga o'tkazadi + mavzuni app topicId (39-45) ga moslaydi.
// Faqat gen_api_progress.json (toza 2910) ni o'qiydi. Chiqish: fan/informatika/_app.json
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";

const bank = JSON.parse(fs.readFileSync("fan/informatika/gen_api_progress.json", "utf8"));
const LETTERS = ["A", "B", "C", "D"];

// App topicId nomlari (mockData infoTopics 39-46)
const TOPIC_NAMES = {
  39: "Raqamli madaniyat", 40: "Ofis dasturlari va VB", 41: "Mantiq va Sanoq tizimi",
  42: "Algoritmlash va Scratch", 43: "Python va JS dasturlash", 44: "Grafika va Veb-dizayn",
  45: "Tarmoqlar va Xavfsizlik", 46: "Pedagogik mahorat",
};

// Mavzu matnini topicId ga moslash — TARTIB muhim (eng aniqdan umumiyga).
function mapTopic(t) {
  const s = String(t || "").toLowerCase();
  if (/tarmoq|internet|xavfsizlik|raqamli xizmat/.test(s)) return 45;
  if (/python|javascript/.test(s)) return 43;
  if (/scratch|logo|algoritm|dasturlash asoslari/.test(s)) return 42;
  if (/grafika|veb-/.test(s)) return 44;
  if (/ofis|\bword\b|\bexcel\b|powerpoint|access|ma'lumotlar bazasi/.test(s)) return 40;
  if (/mantiq|sanoq|model/.test(s)) return 41;
  if (/raqamli savodxon|kompyuter tizim|dasturiy muhit|axborot va raqamli/.test(s)) return 39;
  return 39; // zaxira (asoslar)
}

const out = [];
let skipped = 0;
const perTopic = {};
for (const q of bank) {
  if (validateQuestion(q).length) { skipped++; continue; }
  const correct = LETTERS.indexOf(q.answer);
  if (correct < 0) { skipped++; continue; }
  const topicId = mapTopic(q.topic || q.subject);
  perTopic[topicId] = (perTopic[topicId] || 0) + 1;
  out.push({
    q: q.question,
    opts: LETTERS.map((L) => `${L}) ${q.options[L]}`),
    correct,
    explanation: q.explanation || "",
    mnemonic: q.mnemonic || "",
    topicId,
    category: "info",
  });
}

// Pedagogik mahorat (gen_ped.json) — DOIM topicId 46 (fan-xos ped pilot, ifloslanishsiz).
if (fs.existsSync("fan/informatika/gen_ped.json")) {
  const ped = JSON.parse(fs.readFileSync("fan/informatika/gen_ped.json", "utf8"));
  for (const q of ped) {
    if (validateQuestion(q).length) { skipped++; continue; }
    const correct = LETTERS.indexOf(q.answer);
    if (correct < 0) { skipped++; continue; }
    perTopic[46] = (perTopic[46] || 0) + 1;
    out.push({
      q: q.question,
      opts: LETTERS.map((L) => `${L}) ${q.options[L]}`),
      correct,
      explanation: q.explanation || "",
      mnemonic: q.mnemonic || "",
      topicId: 46,
      category: "info",
    });
  }
}

fs.writeFileSync("fan/informatika/_app.json", JSON.stringify(out, null, 2), "utf8");
console.log(`✓ ${out.length} savol ilova formatiga o'tkazildi → fan/informatika/_app.json`);
if (skipped) console.log(`  (${skipped} yaroqsiz o'tkazib yuborildi)`);
console.log("\ntopicId bo'yicha taqsimot:");
for (const id of Object.keys(perTopic).sort((a, b) => a - b)) {
  console.log(`  ${id} ${TOPIC_NAMES[id].padEnd(24)} ${perTopic[id]} savol`);
}
