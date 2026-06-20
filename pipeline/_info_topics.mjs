import fs from "fs";
const bank = JSON.parse(fs.readFileSync("fan/informatika/gen_api_progress.json", "utf8"));
const c = {};
for (const q of bank) { const t = (q.topic || q.subject || "?").trim(); c[t] = (c[t] || 0) + 1; }
console.log("Bankdagi aniq mavzular:", Object.keys(c).length);
for (const [t, n] of Object.entries(c).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${t}`);
