// 5 fan yangi ped (ped5): SHUBHALI olib tashlash + app formatiga (topicId/category bilan).
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
const LET = ["A", "B", "C", "D"];

const SUBJ = {
  jismoniy_tarbiya: { rep: "jismoniy_ped5", topicId: 30, category: "sport" },
  boshlangich: { rep: "boshlangich_ped5", topicId: 38, category: "boshlangich" },
  ona_tili: { rep: "ona_tili_ped5", topicId: 62, category: "til" },
  biologiya: { rep: "biologiya_ped5", topicId: 86, category: "biologiya" },
  geografiya: { rep: "geografiya_ped5", topicId: 96, category: "geografiya" },
};

for (const [slug, c] of Object.entries(SUBJ)) {
  const all = JSON.parse(fs.readFileSync(`fan/${slug}/_ped5_new.json`, "utf8"));
  const rep = JSON.parse(fs.readFileSync(`pipeline/verify_report_${c.rep}.json`, "utf8"));
  let flagged = 0, bad = 0;
  const out = [];
  for (const q of all) {
    if (rep[q.id]?.verdict === "SHUBHALI") { flagged++; continue; }
    if (validateQuestion(q).length) { bad++; continue; }
    const correct = LET.indexOf(q.answer); if (correct < 0) { bad++; continue; }
    out.push({ q: q.question, opts: LET.map((L) => `${L}) ${q.options[L]}`), correct, explanation: q.explanation || "", mnemonic: q.mnemonic || "", topicId: c.topicId, category: c.category });
  }
  fs.writeFileSync(`fan/${slug}/_ped5_app.json`, JSON.stringify(out, null, 2), "utf8");
  console.log(`${slug}: ${out.length} app-ped (shubhali ${flagged}, yaroqsiz ${bad}) → topicId ${c.topicId}, ${c.category}`);
}
