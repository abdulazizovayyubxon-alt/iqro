// Xavfsiz tozalash: struktura-buzuq + QAT'IY dublikat (savol+javob mos) o'chiriladi; krill homoglif tuzatiladi.
// Asl obyektlar saqlanadi. Backup + dropped log yoziladi.  node pipeline/_applyclean.mjs --in <fayl>
import fs from "fs";
import path from "path";
import { normalize, trigrams, jaccard, hasCyrillic } from "./lib/normalize.mjs";

const args = process.argv.slice(2);
const inPath = args[args.indexOf("--in") + 1];
const arr = JSON.parse(fs.readFileSync(inPath, "utf8"));
const STEM_TH = 0.82, ANS_TH = 0.80;
const stemOf = (o) => String(o.q || "");
const ansOf = (o) => String((o.opts || [])[o.correct] || "").replace(/^\s*[A-D]\)\s*/, "");

// Krill→lotin (o'zbek) homoglif xaritasi
const CYR = { а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ж:"j", з:"z", и:"i", й:"y", к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u", ф:"f", х:"x", ц:"ts", ч:"ch", ш:"sh", щ:"sh", ъ:"'", ы:"i", ь:"", э:"e", қ:"q", ғ:"g'", ҳ:"h", ў:"o'", ё:"yo", ю:"yu", я:"ya", і:"i" };
function translit(s) {
  if (!s || !hasCyrillic(s)) return s;
  let out = "";
  for (const ch of String(s)) {
    const low = ch.toLowerCase();
    if (CYR[low] != null) { const r = CYR[low]; out += ch === low ? r : (r ? r[0].toUpperCase() + r.slice(1) : r); }
    else out += ch;
  }
  return out;
}

const broken = new Set();
arr.forEach((o, i) => {
  const opts = (o.opts || []).map((s) => String(s).replace(/^\s*[A-D]\)\s*/, "").trim().toLowerCase()).filter(Boolean);
  if ((o.opts || []).length !== 4 || new Set(opts).size < opts.length) broken.add(i);
});

const stemG = arr.map((o) => trigrams(normalize(stemOf(o))));
const ansG = arr.map((o) => trigrams(normalize(ansOf(o))));
const ansN = arr.map((o) => normalize(ansOf(o)));

const kept = [];          // saqlangan indekslar (dup-anchor)
const keptObjs = [];
const dropped = [];
let cyrFixed = 0;

for (let i = 0; i < arr.length; i++) {
  if (broken.has(i)) { dropped.push({ i, sabab: "struktura: takror variant / !=4", q: stemOf(arr[i]).slice(0, 80) }); continue; }
  let hit = null;
  for (const k of kept) {
    const ss = jaccard(stemG[i], stemG[k]);
    if (ss < STEM_TH) continue;
    const as = ansN[i] && ansN[i] === ansN[k] ? 1 : jaccard(ansG[i], ansG[k]);
    if (as >= ANS_TH && (!hit || ss + as > hit.s)) hit = { j: k, ss, as, s: ss + as };
  }
  if (hit) { dropped.push({ i, sabab: `qat'iy dublikat (#${hit.j}, savol ${hit.ss.toFixed(2)}/javob ${hit.as.toFixed(2)})`, q: stemOf(arr[i]).slice(0, 80) }); continue; }
  // saqlanadi — krill homoglifni tuzatamiz
  const o = arr[i];
  if (hasCyrillic(o.q) || (o.opts || []).some(hasCyrillic) || hasCyrillic(o.explanation)) {
    const before = JSON.stringify({ q: o.q, opts: o.opts, e: o.explanation });
    o.q = translit(o.q);
    if (Array.isArray(o.opts)) o.opts = o.opts.map(translit);
    if (o.explanation) o.explanation = translit(o.explanation);
    if (o.mnemonic) o.mnemonic = translit(o.mnemonic);
    if (JSON.stringify({ q: o.q, opts: o.opts, e: o.explanation }) !== before) cyrFixed++;
  }
  kept.push(i); keptObjs.push(o);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
fs.copyFileSync(inPath, inPath.replace(/\.json$/, `.bak-${stamp}.json`));
const dropFile = path.join("pipeline", `_dropped_${path.basename(inPath, ".json")}.json`);
fs.writeFileSync(dropFile, JSON.stringify(dropped, null, 1), "utf8");
fs.writeFileSync(inPath, JSON.stringify(keptObjs, null, 2), "utf8");

const nBroken = dropped.filter((d) => d.sabab.startsWith("struktura")).length;
const nDup = dropped.length - nBroken;
console.log(`${path.basename(inPath)}: ${arr.length} → ${keptObjs.length}  (struktura ${nBroken}, dublikat ${nDup} o'chirildi; krill ${cyrFixed} tuzatildi)`);
console.log(`   backup: ${path.basename(inPath.replace(/\.json$/, `.bak-${stamp}.json`))} | log: ${dropFile}`);
