// Yangi ped (per-fan): SHUBHALI olib tashlash + app formatiga (topicId/category bilan).
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
const LET = ["A", "B", "C", "D"];

const SUBJ = {
  chqbt: { src: "fan/chqbt/_ped_new.json", rep: "pipeline/verify_report_chqbt_pednew.json", topicId: 6, category: "chqbt" },
  informatika: { src: "fan/informatika/_ped_new.json", rep: "pipeline/verify_report_info_pednew.json", topicId: 46, category: "info" },
  art: { src: "fan/art/_ped_new.json", rep: "pipeline/verify_report_art_pednew.json", topicId: 14, category: "art" },
};

for (const [slug, c] of Object.entries(SUBJ)) {
  const all = JSON.parse(fs.readFileSync(c.src, "utf8"));
  const rep = JSON.parse(fs.readFileSync(c.rep, "utf8"));
  let flagged = 0, bad = 0;
  const out = [];
  for (const q of all) {
    if (rep[q.id]?.verdict === "SHUBHALI") { flagged++; continue; }
    if (validateQuestion(q).length) { bad++; continue; }
    const correct = LET.indexOf(q.answer); if (correct < 0) { bad++; continue; }
    out.push({ q: q.question, opts: LET.map((L) => `${L}) ${q.options[L]}`), correct, explanation: q.explanation || "", mnemonic: q.mnemonic || "", topicId: c.topicId, category: c.category });
  }
  fs.writeFileSync(`fan/${slug}/_ped_app.json`, JSON.stringify(out, null, 2), "utf8");
  console.log(`${slug}: ${out.length} app-ped (shubhali ${flagged}, yaroqsiz ${bad}) → topicId ${c.topicId}, ${c.category}`);
}
