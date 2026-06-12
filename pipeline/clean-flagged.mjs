// Hakam SHUBHALI deb belgilagan savollarni bankdan olib tashlaydi (zaxira bilan).
// node pipeline/clean-flagged.mjs [--in fan/chqbt/gen_api_progress.json] [--apply]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gen_api_progress.json");
const reportPath = A("--report", "pipeline/verify_report.json");
const apply = args.includes("--apply");

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const flaggedIds = new Set(Object.entries(report).filter(([, v]) => v.verdict === "SHUBHALI").map(([id]) => String(id)));
const removed = data.filter((q) => flaggedIds.has(String(q.id)));
const clean = data.filter((q) => !flaggedIds.has(String(q.id)));
const unchecked = data.filter((q) => !report[q.id]);

console.log(`Bank: ${data.length} | SHUBHALI (o'chiriladi): ${removed.length} | Tekshirilmagan: ${unchecked.length} | Toza qoladi: ${clean.length}`);

if (apply) {
  fs.writeFileSync(inPath + ".bak2", JSON.stringify(data, null, 2), "utf8");
  fs.writeFileSync("pipeline/removed_flagged.json",
    JSON.stringify(removed.map((q) => ({ id: q.id, sabab: report[q.id]?.sabab, question: q.question, answer: q.answer })), null, 2), "utf8");
  clean.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(inPath, JSON.stringify(clean, null, 2), "utf8");
  console.log(`✓ QO'LLANDI. Zaxira: ${inPath}.bak2 | O'chirilganlar: pipeline/removed_flagged.json`);
  console.log(`⚠ Eslatma: id raqamlari qayta berildi — verify_report.json endi eski id'larga mos, uni ham arxivlaymiz.`);
  fs.renameSync(reportPath, reportPath.replace(/\.json$/, "_applied.json"));
} else {
  console.log("(Hech narsa o'zgartirilmadi — qo'llash uchun --apply)");
}
