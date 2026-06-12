// fan/chqbt_yangi/*.json (27 fayl) → fan/chqbt/gold_bank.json (yagona, noyob id, Y-belgi tuzatilgan).
// Asl fayllar O'ZGARMAYDI. node pipeline/build-gold-bank.mjs
import fs from "fs";
import path from "path";

const srcDir = "fan/chqbt_yangi";
const outPath = "fan/chqbt/gold_bank.json";

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".json")).sort();
let all = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(srcDir, f), "utf8"));
  const arr = Array.isArray(j) ? j : (j.questions || j.savollar || []);
  for (const q of arr) {
    q.source_file = f; // qaysi fayldan kelganini eslab qolamiz
    all.push(q);
  }
}

// Noyob id + Y-belgi: hammasi single → Y1 (spec bo'yicha Y = FORMAT)
all.forEach((q, i) => {
  q.id = i + 1;
  if ((q.qtype || "single") === "single") q.difficulty = "Y1";
});

fs.mkdirSync("fan/chqbt", { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(all, null, 1), "utf8");

const diff = {};
for (const q of all) diff[q.difficulty] = (diff[q.difficulty] || 0) + 1;
console.log(`✓ ${outPath}: ${all.length} savol (${files.length} fayldan) | difficulty: ${JSON.stringify(diff)}`);
