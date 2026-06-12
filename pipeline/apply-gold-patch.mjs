// Oltin bankка qo'lда yozilgan variant-patchlarini qo'llaydi (cue-leak tuzatish).
// Patch: scratch/gold_patch_*.json — [{id, options:{A,B,C,D}, question?, explanation?}]
// node pipeline/apply-gold-patch.mjs --patch scratch/gold_patch_1.json [--apply]
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const patchPath = A("--patch", "");
const apply = args.includes("--apply");
const inPath = "fan/chqbt/gold_bank.json";

const bank = JSON.parse(fs.readFileSync(inPath, "utf8"));
const byId = new Map(bank.map((q) => [String(q.id), q]));
const patch = JSON.parse(fs.readFileSync(patchPath, "utf8"));

let ok = 0; const bad = []; const notFound = [];
for (const p of patch) {
  const q = byId.get(String(p.id));
  if (!q) { notFound.push(p.id); continue; }
  if (p.options) q.options = { ...q.options, ...p.options };
  if (p.question) q.question = p.question;
  if (p.explanation) q.explanation = p.explanation;
  if (p.mnemonic) q.mnemonic = p.mnemonic;
  if (p.difficulty) q.difficulty = p.difficulty;
  if (p.cognitive) q.cognitive = p.cognitive;
  if (p.subtopic) q.subtopic = p.subtopic;
  const cl = cueLeakReasons(q);
  if (cl.length) bad.push({ id: p.id, why: cl.join("; ") });
  else ok++;
}

console.log(`Patch: ${patch.length} ta | toza: ${ok} | hali cue-leak: ${bad.length} | topilmadi: ${notFound.length}`);
if (notFound.length) console.log("  topilmadi: " + notFound.join(", "));
if (bad.length) { console.log("  HALI MUAMMO:"); bad.forEach((b) => console.log(`    id=${b.id}: ${b.why}`)); }

if (apply && !bad.length && !notFound.length) {
  fs.writeFileSync(inPath, JSON.stringify(bank, null, 1), "utf8");
  console.log("✓ QO'LLANDI.");
} else if (apply) {
  console.log("✗ QO'LLANMADI — avval muammolarni tuzating (hammasi toza bo'lishi kerak).");
} else {
  console.log("(Ko'rish rejimi — --apply bilan yozing)");
}
