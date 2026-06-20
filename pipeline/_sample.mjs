// gen_api_progress.json dan har formatdan namuna chiqaradi — qo'lda sifat ko'rik uchun.
import fs from "fs";
const all = JSON.parse(fs.readFileSync("fan/informatika/gen_api_progress.json", "utf8"));

const byType = { single: [], combo: [], matching: [], sequence: [] };
for (const q of all) (byType[q.qtype] || byType.single).push(q);

const pick = (arr, n) => { const out = []; const step = Math.max(1, Math.floor(arr.length / n)); for (let i = 0; i < arr.length && out.length < n; i += step) out.push(arr[i]); return out; };

function show(q) {
  console.log(`\n──────── [${q.qtype}] #${q.id} | ${q.difficulty}/${q.cognitive} | mavzu: ${q.topic || q.subject} ────────`);
  console.log(`S: ${q.question}`);
  for (const L of ["A", "B", "C", "D"]) console.log(`   ${L}) ${q.options[L]}${q.answer === L ? "   <== TO'G'RI" : ""}`);
  console.log(`Izoh: ${q.explanation}`);
  if (q.mnemonic) console.log(`Mnemo: ${q.mnemonic}`);
  console.log(`Manba: ${q.source}`);
}

console.log("======== SINGLE (3) ========");
pick(byType.single, 3).forEach(show);
console.log("\n======== COMBO (2) ========");
pick(byType.combo, 2).forEach(show);
console.log("\n======== MATCHING (2) ========");
pick(byType.matching, 2).forEach(show);
console.log("\n======== SEQUENCE (2) ========");
pick(byType.sequence, 2).forEach(show);
