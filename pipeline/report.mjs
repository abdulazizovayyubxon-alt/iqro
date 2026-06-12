// HISOBOT: fan bo'yicha (yoki barcha) haqiqiy savollar sifati — son, noyob%, sxema, balans.
//   node pipeline/report.mjs --subject biologiya   # bitta fan (gen_+_clean+_namuna)
//   node pipeline/report.mjs --all                 # barcha fanlar qisqacha
//   node pipeline/report.mjs --subject tarix --raw # padded korpus (fan/<slug> hammasi)

import fs from "fs";
import path from "path";
import { ALL_SLUGS, getSubject } from "./lib/subjects.mjs";
import { validateQuestion } from "./lib/schema.mjs";
import { dedupeList } from "./lib/dedup.mjs";
import { hasCyrillic } from "./lib/normalize.mjs";
import { loadMany, loadPath } from "./lib/corpus.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--subject") + 1];
const raw = args.includes("--raw");
const all = args.includes("--all");

// Fan uchun "haqiqiy" savollar (gen_+_clean+_namuna) yoki --raw bo'lsa butun fan/<slug>
async function loadSubject(s) {
  const dir = path.join("fan", s);
  if (raw) return await loadPath(dir);
  const paths = [];
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => /^(gen_|_clean|_namuna)/.test(x) && x.endsWith(".json"))) {
      paths.push(path.join(dir, f));
    }
  }
  return await loadMany(paths);
}

function analyze(qs) {
  const r = { total: qs.length, invalid: 0, cyr: 0, qtype: {}, diff: {}, bloom: {}, ans: {} };
  for (const q of qs) {
    if (validateQuestion(q).length) r.invalid++;
    const t = (q.question || q.q || "");
    if (hasCyrillic(t)) r.cyr++;
    r.qtype[q.qtype || "single"] = (r.qtype[q.qtype || "single"] || 0) + 1;
    r.diff[q.difficulty || "?"] = (r.diff[q.difficulty || "?"] || 0) + 1;
    const bl = q.bloom_level || q.cognitive || "?";
    r.bloom[bl] = (r.bloom[bl] || 0) + 1;
    r.ans[q.answer || "?"] = (r.ans[q.answer || "?"] || 0) + 1;
  }
  r.unique = dedupeList(qs).kept.length;
  return r;
}

if (all) {
  const pad = (s, n) => String(s).padEnd(n);
  const padN = (s, n) => String(s).padStart(n);
  console.log(pad("FAN", 18), padN("JAMI", 6), padN("NOYOB", 7), padN("YAROQSIZ", 9), padN("KRILL", 6));
  console.log("-".repeat(50));
  for (const sg of ALL_SLUGS) {
    const qs = await loadSubject(sg);
    if (!qs.length) { console.log(pad(sg, 18), padN(0, 6)); continue; }
    const r = analyze(qs);
    console.log(pad(sg, 18), padN(r.total, 6), padN(r.unique, 7), padN(r.invalid, 9), padN(r.cyr, 6));
  }
  process.exit(0);
}

if (!slug) { console.error("Xato: --subject <fan> yoki --all"); process.exit(1); }
const sub = getSubject(slug);
const qs = await loadSubject(slug);
if (!qs.length) { console.log(`${sub.name}: ${raw ? "korpus" : "haqiqiy savollar"} topilmadi.`); process.exit(0); }
const r = analyze(qs);
const target = sub.target;
console.log(`\n=== HISOBOT: ${sub.name}${raw ? " (padded korpus)" : ""} ===`);
console.log(`Jami savol:      ${r.total}`);
console.log(`Haqiqiy noyob:   ${r.unique} (${Math.round(r.unique / r.total * 100)}%)`);
console.log(`Maqsad (2000):   ${r.unique}/${target}  → yana ~${Math.max(0, target - r.unique)} kerak`);
console.log(`Yaroqsiz sxema:  ${r.invalid}`);
console.log(`Krill aralash:   ${r.cyr}`);
console.log(`qtype:           ${JSON.stringify(r.qtype)}`);
console.log(`Qiyinlik:        ${JSON.stringify(r.diff)}`);
console.log(`Bloom:           ${JSON.stringify(r.bloom)}`);
console.log(`Javob taqsimoti: ${JSON.stringify(r.ans)}`);
