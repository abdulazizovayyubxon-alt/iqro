import fs from "fs";
const a = JSON.parse(fs.readFileSync("fan/informatika/gen_api_progress.json", "utf8"));
console.log("Obyekt kalitlari:", Object.keys(a[0]).join(", "));
let noSrc = 0, noCog = 0, noExpl = 0, noMnemo = 0;
for (const q of a) {
  if (!(q.source || q.source_construct)) noSrc++;
  if (!(q.cognitive || q.bloom_level)) noCog++;
  if (!q.explanation || q.explanation.length < 10) noExpl++;
  if (!q.mnemonic) noMnemo++;
}
console.log("source yoq:", noSrc, "/", a.length);
console.log("cognitive yoq:", noCog, "/", a.length);
console.log("explanation yoq/qisqa:", noExpl);
console.log("mnemonic yoq:", noMnemo);
console.log("namuna source:", JSON.stringify(a[0].source ?? a[0].source_construct));
console.log("namuna cognitive:", JSON.stringify(a[0].cognitive ?? a[0].bloom_level));
// difficulty taqsimoti
const diff = {};
for (const q of a) diff[q.difficulty] = (diff[q.difficulty] || 0) + 1;
console.log("difficulty:", JSON.stringify(diff));
