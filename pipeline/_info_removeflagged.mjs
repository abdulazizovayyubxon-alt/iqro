// SHUBHALI belgilangan savollarni bankdan olib tashlaydi (zaxira + dropped saqlash bilan).
import fs from "fs";

const bankPath = "fan/informatika/gen_api_progress.json";
const reportPath = "pipeline/verify_report_informatika.json";

const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const isFlagged = (q) => report[q.id]?.verdict === "SHUBHALI";
const keep = bank.filter((q) => !isFlagged(q));
const dropped = bank.filter(isFlagged).map((q) => ({ ...q, _sabab: report[q.id]?.sabab || "" }));

// 1) Zaxira (asl 3012)
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const bakPath = `fan/informatika/gen_api_progress.bak-${ts}.json`;
fs.writeFileSync(bakPath, JSON.stringify(bank, null, 2), "utf8");

// 2) O'chirilganlarni alohida saqlash (keyin ko'rish/tuzatish uchun)
fs.writeFileSync("fan/informatika/_dropped_shubhali.json", JSON.stringify(dropped, null, 2), "utf8");

// 3) Qolganlarni qayta raqamlash (1..N) va yozish
keep.forEach((q, i) => { q.id = i + 1; });
fs.writeFileSync(bankPath, JSON.stringify(keep, null, 2), "utf8");

// Statistika
const fmt = keep.reduce((a, q) => { a[q.qtype] = (a[q.qtype] || 0) + 1; return a; }, {});
const ans = keep.reduce((a, q) => { a[q.answer] = (a[q.answer] || 0) + 1; return a; }, {});
console.log(`Asl: ${bank.length} | O'chirildi: ${dropped.length} | Qoldi: ${keep.length}`);
console.log(`Format: ${JSON.stringify(fmt)}`);
console.log(`Javob balansi: ${JSON.stringify(ans)}`);
console.log(`Zaxira: ${bakPath}`);
console.log(`O'chirilganlar: fan/informatika/_dropped_shubhali.json`);
