// gen_ped.json dan SHUBHALI ped savollarni olib tashlaydi (zaxira + dropped saqlash bilan).
import fs from "fs";
const pedPath = "fan/informatika/gen_ped.json";
const repPath = "pipeline/verify_report_informatika_ped.json";
const ped = JSON.parse(fs.readFileSync(pedPath, "utf8"));
const report = JSON.parse(fs.readFileSync(repPath, "utf8"));

const isFlagged = (q) => report[q.id]?.verdict === "SHUBHALI";
const keep = ped.filter((q) => !isFlagged(q));
const dropped = ped.filter(isFlagged).map((q) => ({ ...q, _sabab: report[q.id]?.sabab || "" }));

const ts = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(`fan/informatika/_backups/gen_ped.bak-${ts}.json`, JSON.stringify(ped, null, 2), "utf8");
fs.writeFileSync("fan/informatika/_dropped_ped_shubhali.json", JSON.stringify(dropped, null, 2), "utf8");
keep.forEach((q, i) => { q.id = i + 1; });
fs.writeFileSync(pedPath, JSON.stringify(keep, null, 2), "utf8");
console.log(`Asl: ${ped.length} | O'chirildi: ${dropped.length} | Qoldi: ${keep.length}`);
