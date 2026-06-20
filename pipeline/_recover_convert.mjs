// _recovered_from_art.json (app format + docId) -> gen format (id=docId) — hakam (verify-bank) uchun.
import fs from "fs";
const src = JSON.parse(fs.readFileSync("fan/chqbt/_recovered_from_art.json", "utf8"));
const LET = ["A", "B", "C", "D"];
const out = src.map((q) => {
  const opts = {};
  (q.opts || []).forEach((o, i) => { opts[LET[i]] = String(o).replace(/^[A-D]\)\s*/, ""); });
  // qtype taxmin: matching (1-A, 2-B...) yoki sequence (raqamlar tartibi) yoki single
  let qtype = "single";
  if (/\d\s*-\s*[A-D]/.test(q.opts?.[q.correct] || "")) qtype = "matching";
  else if (/^\s*\d(\s*,\s*\d){2,}/.test(q.opts?.[q.correct] || "")) qtype = "sequence";
  return {
    id: q.docId, subject: "CHQBT (Chaqiruvga qadar boshlang'ich tayyorgarlik)", topic: "Pedagogik mahorat",
    difficulty: "Y2", qtype, question: q.q, options: opts, answer: LET[q.correct] || "A",
    explanation: q.explanation || "", mnemonic: q.mnemonic || "",
  };
});
fs.writeFileSync("fan/chqbt/_recovered_gen.json", JSON.stringify(out, null, 2), "utf8");
console.log(`Gen formatga o'tkazildi: ${out.length} → fan/chqbt/_recovered_gen.json`);
