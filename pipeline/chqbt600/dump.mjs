// dump.mjs — nomzodlarni Claude ko'rigi uchun ixcham matn ko'rinishida chiqaradi.
//   node pipeline/chqbt600/dump.mjs --topic 5
//   node pipeline/chqbt600/dump.mjs --topic 1 --from 0 --take 25 --compact
import fs from "node:fs";
const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const topic = Number(A("--topic", "5"));
const from = Number(A("--from", "0"));
const take = Number(A("--take", "999"));
const compact = args.includes("--compact");
const list = JSON.parse(fs.readFileSync("pipeline/chqbt600/out/candidates.json", "utf8"))
  .filter((q) => q.topicId === topic).slice(from, from + take);
const L = ["A", "B", "C", "D"];
const clean = (s) => String(s).replace(/^[A-D]\)\s*/, "");
list.forEach((q, i) => {
  console.log(`\n#${from + i} [${q.id}]${q.image ? " 🖼" : ""}`);
  console.log(compact ? String(q.q).replace(/\s+/g, " ") : q.q);
  (q.opts || []).forEach((o, j) => console.log(`  ${j === q.correct ? "✓" : " "} ${L[j]}) ${compact ? clean(o).slice(0, 110) : clean(o)}`));
  if (!compact) console.log(`  izoh: ${String(q.explanation || "").slice(0, 260)}`);
});
console.log(`\n--- jami ${list.length} ta (topic ${topic}) ---`);
