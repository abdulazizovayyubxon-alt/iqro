// Belgilangan id ro'yxati bo'yicha savollarni bankdan o'chiradi (zaxira bilan).
// HTML ko'rikdan olingan id ro'yxatini beradi.
// node pipeline/remove-ids.mjs --ids 12,18,80 [--in fan/chqbt/gen_api_progress.json] [--apply]
import fs from "fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gen_api_progress.json");
const apply = args.includes("--apply");
const idsArg = A("--ids", "");

const ids = new Set(idsArg.split(",").map((s) => s.trim()).filter(Boolean));
if (ids.size === 0) { console.error("⚠ --ids bo'sh. Masalan: --ids 12,18,80"); process.exit(1); }

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
const removed = data.filter((q) => ids.has(String(q.id)));
const clean = data.filter((q) => !ids.has(String(q.id)));

console.log(`Bank: ${data.length} | O'chiriladi: ${removed.length} | Qoladi: ${clean.length}`);
const notFound = [...ids].filter((id) => !data.some((q) => String(q.id) === id));
if (notFound.length) console.log(`⚠ Topilmadi: ${notFound.join(", ")}`);

if (apply) {
  fs.writeFileSync(inPath + ".bak3", JSON.stringify(data, null, 1), "utf8");
  fs.writeFileSync("pipeline/removed_ids.json",
    JSON.stringify(removed.map((q) => ({ id: q.id, qtype: q.qtype, question: q.question, answer: q.answer })), null, 2), "utf8");
  clean.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(inPath, JSON.stringify(clean, null, 1), "utf8");
  console.log(`✓ QO'LLANDI. Zaxira: ${inPath}.bak3 | O'chirilganlar: pipeline/removed_ids.json | id'lar qayta raqamlandi (1..${clean.length}).`);
} else {
  console.log("(Hech narsa o'zgartirilmadi — qo'llash uchun --apply)");
  if (removed.length) { console.log("O'chiriladiganlar:"); removed.forEach((q) => console.log(`  id=${q.id} [${q.qtype}] ${q.question.slice(0, 70).replace(/\n/g, " ")}`)); }
}
