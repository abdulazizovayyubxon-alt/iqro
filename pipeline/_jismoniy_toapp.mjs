// Jismoniy tarbiya MUTAXASSISLIK bankini ILOVA formatiga o'tkazadi + mavzuni app topicId (23-29) ga moslaydi.
// SHUBHALI (verify-bank natijasi) larni chiqaradi. Kasb bloki (topicId 30) alohida _ped5_app.json da.
// node pipeline/_jismoniy_toapp.mjs
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";

const IN = "fan/jismoniy_tarbiya/gen_api_progress.json";
const REPORT = "pipeline/verify_report_jismoniy_tarbiya.json";
const OUT = "fan/jismoniy_tarbiya/_app.json";
const LET = ["A", "B", "C", "D"];

// App topic nomlari (mockData sportTopics 23-30)
const TOPIC_NAMES = {
  23: "Fiziologiya va Sog'lom hayot", 24: "Gimnastika qoidalari", 25: "Harakatli o'yinlar",
  26: "Yengil atletika va Suzish", 27: "Kurash va Taktika", 28: "Futbol va Voleybol",
  29: "Basketbol, Gandbol, Shaxmat, Inshootlar", 30: "Pedagogik mahorat (kasb)",
};

// Mavzu matnini topicId ga moslash — TARTIB muhim (eng aniqdan umumiyga).
function mapTopic(t) {
  const s = String(t || "").toLowerCase().replace(/[`‘’]/g, "'");
  if (/inshoot|basketbol|gandbol|qo'l to'pi|handbol|shaxmat|shashka/.test(s)) return 29;
  if (/futbol|voleybol|valeybol/.test(s)) return 28;
  if (/kurash|dzyudo|judo|chalish/.test(s)) return 27;
  if (/yengil atletika|suzish|yugurish|sakrash|uloqtir|krol|brass|batterflyay|estafeta/.test(s)) return 26;
  if (/harakatli o'yin|milliy o'yin|podvijn/.test(s)) return 25;
  if (/gimnastika|akrobatika|snaryad/.test(s)) return 24;
  if (/fiziologiya|sog'lom|turmush|jismoniy sifat|mushak|nafas|yurak|chidamlilik|razminka|charchash/.test(s)) return 23;
  return 23; // zaxira (fiziologiya/asoslar)
}

const bank = JSON.parse(fs.readFileSync(IN, "utf8"));
const report = fs.existsSync(REPORT) ? JSON.parse(fs.readFileSync(REPORT, "utf8")) : {};
const hasReport = Object.keys(report).length > 0;

const out = [];
let flagged = 0, bad = 0;
const perTopic = {};
for (const q of bank) {
  if (report[q.id]?.verdict === "SHUBHALI") { flagged++; continue; }
  if (validateQuestion(q).length) { bad++; continue; }
  const correct = LET.indexOf(q.answer);
  if (correct < 0) { bad++; continue; }
  const topicId = mapTopic(q.topic || q.subtopic || q.subject);
  perTopic[topicId] = (perTopic[topicId] || 0) + 1;
  out.push({
    q: q.question,
    opts: LET.map((L) => `${L}) ${q.options[L]}`),
    correct,
    explanation: q.explanation || "",
    mnemonic: q.mnemonic || "",
    topicId,
    category: "sport",
  });
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
console.log(`✓ ${out.length} mutaxassislik savol ilova formatiga o'tkazildi → ${OUT}`);
console.log(`  SHUBHALI chiqarildi: ${flagged}${hasReport ? "" : " (DIQQAT: verify_report yo'q — audit ishlatilmagan)"}, yaroqsiz: ${bad}`);
console.log("\ntopicId bo'yicha taqsimot:");
for (const id of Object.keys(perTopic).sort((a, b) => a - b)) {
  console.log(`  ${id} ${TOPIC_NAMES[id].padEnd(40)} ${perTopic[id]} savol`);
}
