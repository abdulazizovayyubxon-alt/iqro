import fs from "fs";
import { normalize, trigrams, jaccard } from "./lib/normalize.mjs";
const stemOf = (o) => String(o.q || "");
const ansOf = (o) => String((o.opts || [])[o.correct] || "").replace(/^\s*[A-D]\)\s*/, "");
const STEM_TH = 0.82, ANS_TH = 0.80;

for (const f of ["src/data/questions_tarix.json", "src/data/questions_ona_tili.json"]) {
  const arr = JSON.parse(fs.readFileSync(f, "utf8"));
  const stemG = arr.map((o) => trigrams(normalize(stemOf(o))));
  const ansG = arr.map((o) => trigrams(normalize(ansOf(o))));
  const ansNorm = arr.map((o) => normalize(ansOf(o)));
  const kept = [];
  const dups = [];
  for (let i = 0; i < arr.length; i++) {
    let hit = null;
    for (const k of kept) {
      const ss = jaccard(stemG[i], stemG[k]);
      if (ss < STEM_TH) continue;
      const as = ansNorm[i] && ansNorm[i] === ansNorm[k] ? 1 : jaccard(ansG[i], ansG[k]);
      if (as >= ANS_TH && (!hit || ss + as > hit.score)) hit = { j: k, ss, as, score: ss + as };
    }
    if (hit) dups.push({ i, j: hit.j, ss: hit.ss, as: hit.as });
    else kept.push(i);
  }
  console.log(`\n=== ${f.split("/").pop()} — QAT'IY dublikat (savol≥${STEM_TH} VA javob≥${ANS_TH}): ${dups.length} ta ===`);
  dups.slice(0, 10).forEach((p) => {
    console.log(`  #${p.i} ≈ #${p.j}  (savol ${p.ss.toFixed(2)}, javob ${p.as.toFixed(2)})`);
    console.log(`     Q[${p.i}]: ${stemOf(arr[p.i]).slice(0, 62)}`);
    console.log(`     Q[${p.j}]: ${stemOf(arr[p.j]).slice(0, 62)}`);
    console.log(`     ✓[${p.i}]: ${ansOf(arr[p.i]).slice(0, 62)}`);
    console.log(`     ✓[${p.j}]: ${ansOf(arr[p.j]).slice(0, 62)}`);
  });
  if (dups.length > 10) console.log(`  ... yana ${dups.length - 10} ta`);
}
