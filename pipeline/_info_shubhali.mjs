// Shubhali belgilangan savollarni to'liq mazmuni + hakam sababi bilan chiqaradi.
import fs from "fs";
const data = JSON.parse(fs.readFileSync("fan/informatika/gen_api_progress.json", "utf8"));
const report = JSON.parse(fs.readFileSync("pipeline/verify_report_informatika.json", "utf8"));
const byId = new Map(data.map((q) => [String(q.id), q]));

const flagged = Object.entries(report).filter(([, v]) => v.verdict === "SHUBHALI");

// qtype bo'yicha taqsimot
const byType = {};
for (const [id] of flagged) { const q = byId.get(String(id)); if (q) byType[q.qtype] = (byType[q.qtype] || 0) + 1; }

let out = `SHUBHALI savollar: ${flagged.length}\nFormat bo'yicha: ${JSON.stringify(byType)}\n\n`;
for (const [id, v] of flagged) {
  const q = byId.get(String(id));
  if (!q) continue;
  out += `═══════ id=${id} [${q.qtype}] ${q.difficulty} | ${q.topic || q.subject} ═══════\n`;
  out += `S: ${q.question}\n`;
  for (const L of ["A", "B", "C", "D"]) out += `   ${L}) ${q.options[L]}${q.answer === L ? "  <== BELGILANGAN" : ""}\n`;
  out += `Izoh: ${q.explanation}\n`;
  out += `🔴 HAKAM: ${v.sabab}\n\n`;
}
fs.writeFileSync("pipeline/_info_shubhali.txt", out, "utf8");
console.log(`Yozildi: pipeline/_info_shubhali.txt (${flagged.length} ta)`);
console.log(`Format bo'yicha: ${JSON.stringify(byType)}`);
