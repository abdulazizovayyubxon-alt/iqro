// Claude qo'lda yozgan savollarni fabrika bankiga qabul qiladi (run-api darvozalari bilan):
// validateQuestion (schema+lotin+cue-leak) + dedup (oltin+fabrika, >=0.82) + shuffle.
// node pipeline/ingest-claude.mjs --in scratch/claude_batch.json
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
import { buildIndex, findDuplicate, addToIndex } from "./lib/dedup.mjs";
import { shuffleOptions } from "./lib/shuffle.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "");
if (!inPath || !fs.existsSync(inPath)) { console.error("Xato: --in <fayl> kerak"); process.exit(1); }

const bankPath = "fan/chqbt/gen_api_progress.json";
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const gold = JSON.parse(fs.readFileSync("fan/chqbt/gold_bank.json", "utf8"));
const incoming = JSON.parse(fs.readFileSync(inPath, "utf8"));

const index = buildIndex([...gold, ...bank]);
const accepted = [], rejected = [];
const dist = { A: 0, B: 0, C: 0, D: 0 };

for (const q0 of incoming) {
  const errors = validateQuestion(q0);
  if (errors.length) { rejected.push({ q: (q0.question || "").slice(0, 70), reasons: errors }); continue; }
  const dup = findDuplicate(index, q0);
  if (dup) { rejected.push({ q: (q0.question || "").slice(0, 70), reasons: [`takror (${dup.score.toFixed(2)}): ${(dup.item.ref.question || "").slice(0, 60)}`] }); continue; }
  const q = shuffleOptions(q0);
  dist[q.answer]++;
  accepted.push(q);
  addToIndex(index, q);
}

let nextId = bank.reduce((m, q) => Math.max(m, q.id || 0), 0);
for (const q of accepted) { q.id = ++nextId; bank.push(q); }
fs.writeFileSync(bankPath, JSON.stringify(bank, null, 1), "utf8");

const fmt = {};
for (const q of bank) fmt[q.qtype || "single"] = (fmt[q.qtype || "single"] || 0) + 1;
console.log(`✓ Qabul: ${accepted.length} | ✗ Rad: ${rejected.length} | bank: ${bank.length} | format: ${JSON.stringify(fmt)} | javoblar A:${dist.A} B:${dist.B} C:${dist.C} D:${dist.D}`);
for (const r of rejected) console.log(`  ✗ "${r.q}" — ${r.reasons.join("; ")}`);
