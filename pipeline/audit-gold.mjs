// Oltin bankni (gold_bank.json) to'liq auditdan o'tkazadi: cue-leak, krill aralashuvi, imlo, schema.
// node pipeline/audit-gold.mjs [--in fan/chqbt/gold_bank.json] [--show cue|krill|imlo|schema]
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
import { cueLeakReasons } from "./lib/quality.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in", "fan/chqbt/gold_bank.json");
const show = A("--show", "");

const bank = JSON.parse(fs.readFileSync(inPath, "utf8"));

const CYR = /[Ѐ-ӿ]/;
function cyrFields(q) {
  const out = [];
  const fields = { question: q.question, explanation: q.explanation, mnemonic: q.mnemonic, subtopic: q.subtopic };
  for (const k of ["A", "B", "C", "D"]) fields["opt." + k] = q.options?.[k];
  for (const [f, v] of Object.entries(fields)) if (CYR.test(v || "")) {
    const chars = [...new Set((String(v).match(/[Ѐ-ӿ]/g) || []))].join("");
    out.push(`${f}:[${chars}]`);
  }
  return out;
}

// Imlo evristikasi
function spellIssues(q) {
  const out = [];
  const text = [q.question, q.explanation, q.mnemonic, ...["A", "B", "C", "D"].map((k) => q.options?.[k])].filter(Boolean).join("  ");
  if (/[ʻʼ‘’`´]/.test(text)) out.push("egri-apostrof");
  if (/\s[,.;:!?]/.test(text)) out.push("boshliq-oldin-tinish");
  if (/([a-zA-Z])\1\1/.test(text)) out.push("3-takror-harf");
  if (/[�ÂÐ]|вЂ/.test(text)) out.push("mojibake-belgi");
  return out;
}

const cats = { cue: [], krill: [], imlo: [], schema: [] };
for (const q of bank) {
  const cl = cueLeakReasons(q);
  if (cl.length) cats.cue.push({ id: q.id, why: cl.join("; ") });
  const cy = cyrFields(q);
  if (cy.length) cats.krill.push({ id: q.id, why: cy.join(" ") });
  const sp = spellIssues(q);
  if (sp.length) cats.imlo.push({ id: q.id, why: sp.join(", ") });
  const v = validateQuestion(q);
  const other = v.filter((r) => !/javob-ishora|krill harf/.test(r));
  if (other.length) cats.schema.push({ id: q.id, why: other.join("; ") });
}

console.log(`\n=== OLTIN AUDIT: ${bank.length} ta savol ===`);
console.log(`  cue-leak (o'qimay topiladi): ${cats.cue.length}`);
console.log(`  krill aralashuvi:            ${cats.krill.length}`);
console.log(`  imlo (apostrof/bo'shliq):    ${cats.imlo.length}`);
console.log(`  schema (boshqa):             ${cats.schema.length}`);
const anyBad = new Set([...cats.cue, ...cats.krill, ...cats.imlo, ...cats.schema].map((x) => x.id));
console.log(`  JAMI muammoli savol:         ${anyBad.size} / ${bank.length}`);

if (show && cats[show]) {
  console.log(`\n--- ${show} tafsilot (${cats[show].length}) ---`);
  for (const it of cats[show].slice(0, 60)) console.log(`  id=${it.id}: ${it.why}`);
}
