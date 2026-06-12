// INTEGRATSIYA: haqiqiy savollarni (gen_+_clean+_namuna) ilova formatiga o'tkazadi.
// Ilova formati (src/data): { q, opts:["A) ..."], correct:<index>, explanation, mnemonic, topicId, category }
//
//   node pipeline/to-app.mjs --subject biologiya [--topic-id 0]

import fs from "fs";
import path from "path";
import { getSubject } from "./lib/subjects.mjs";
import { loadMany } from "./lib/corpus.mjs";
import { validateQuestion } from "./lib/schema.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--subject") + 1];
const topicId = parseInt((args[args.indexOf("--topic-id") + 1]) || "0", 10);
if (!slug || slug.startsWith("--")) { console.error("Xato: --subject <fan> kerak"); process.exit(1); }

const sub = getSubject(slug);
const LETTERS = ["A", "B", "C", "D"];
const dir = path.join("fan", slug);
const paths = [];
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir).filter((x) => /^(gen_|_clean|_namuna)/.test(x) && x.endsWith(".json"))) {
    paths.push(path.join(dir, f));
  }
}
const qs = await loadMany(paths);
if (!qs.length) { console.error(`Haqiqiy savol topilmadi: ${dir} (avval ingest qiling)`); process.exit(1); }

const out = [];
let skipped = 0;
for (const q of qs) {
  if (validateQuestion(q).length) { skipped++; continue; }
  const opts = LETTERS.map((L) => `${L}) ${q.options[L]}`);
  const correct = LETTERS.indexOf(q.answer);
  if (correct < 0) { skipped++; continue; }
  out.push({
    q: q.question,
    opts,
    correct,
    explanation: q.explanation || "",
    mnemonic: q.mnemonic || "",
    topicId,
    category: sub.category,
  });
}

const outPath = path.join(dir, "_app.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`✓ ${sub.name}: ${out.length} savol ilova formatiga o'tkazildi → ${outPath}`);
if (skipped) console.log(`  (${skipped} yaroqsiz savol o'tkazib yuborildi)`);
console.log(`  category: "${sub.category}", topicId: ${topicId}`);
console.log(`  Eslatma: topicId mavzular bo'yicha taqsimlanishi kerak bo'lsa --topic-id bilan ajrating yoki`);
console.log(`  keyin mockData.js mavzu tuzilishiga moslab bo'lib chiqing.`);
