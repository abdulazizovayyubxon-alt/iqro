// Rasmli savollarni (fan/chqbt_yangi/rasmli_*.json) bizning rejim darvozalaridan o'tkazadi.
// Sxema: {section,topic,source,questions:[...]} ; har savolda image, cognitive, source.
// node pipeline/audit-rasmli.mjs
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
import { cueLeakReasons } from "./lib/quality.mjs";

const FILES = ["rasmli_fv", "rasmli_jismoniy", "rasmli_otish", "rasmli_saf", "rasmli_taktik", "rasmli_tibbiy"];
const DIR = "fan/chqbt_yangi/";
const BLOOM = { Y1: "Bilish", Y2: "Qo'llash", Y3: "Mulohaza" };
const CYR = /[Ѐ-ӿ]/;

let all = [];
for (const f of FILES) {
  const obj = JSON.parse(fs.readFileSync(DIR + f + ".json", "utf8"));
  for (const q of obj.questions) all.push({ ...q, _file: f });
}

let issues = [];
const flag = (q, rule, msg) => issues.push({ id: q.id, file: q._file, rule, msg });

for (const q of all) {
  // schema (cognitive/source canonical ichida) + cue-leak
  const v = validateQuestion(q);
  if (v.length) flag(q, "schema", v.join("; "));
  const cl = cueLeakReasons(q);
  if (cl.length) flag(q, "cue-leak", cl.join("; "));

  // difficulty <-> cognitive
  const cg = (q.cognitive || "").replace(/ʻ/g, "'");
  if (BLOOM[q.difficulty] && cg !== BLOOM[q.difficulty]) flag(q, "kognitiv", `difficulty=${q.difficulty} lekin cognitive=${q.cognitive}`);

  // krill
  for (const fld of ["question", "explanation", "mnemonic"]) if (CYR.test(q[fld] || "")) flag(q, "krill", `${fld}`);
  for (const k of ["A", "B", "C", "D"]) if (CYR.test(q.options?.[k] || "")) flag(q, "krill", `option ${k}`);

  // explanation "Manbada/Matnda" boshlama (Rasmda... ruxsat — rasmni tavsiflaydi)
  if (/^\s*(Manbada|Matnda|Darslikda)\b/i.test(q.explanation || "")) flag(q, "izoh-boshlama", "Manbada/Matnda boshlama");

  // rasm fayli mavjudligi
  const fn = (q.image || "").split("/").pop();
  if (!q.image) flag(q, "rasm", "image maydoni yo'q");
  else if (!fs.existsSync("public/images/" + fn)) flag(q, "rasm", `fayl yo'q: ${fn}`);

  // mnemonic
  if (!q.mnemonic || !q.mnemonic.trim()) flag(q, "mnemonic", "yo'q");

  // matching/sequence struktura
  if (q.qtype === "matching" || q.qtype === "sequence") {
    if (!/\n\s*1[.)]/.test(q.question)) flag(q, "format", "raqamli ro'yxat yo'q");
  }
}

const byRule = {};
for (const i of issues) byRule[i.rule] = (byRule[i.rule] || 0) + 1;
console.log(`\n=== RASMLI AUDIT: ${all.length} ta savol (${FILES.length} fayl) ===`);
const qt = {}; for (const q of all) qt[q.qtype] = (qt[q.qtype] || 0) + 1;
console.log(`Format: ${JSON.stringify(qt)} | Rasm: hammasi mavjud bo'lsa 0 xato`);
console.log(`Jami buzilish: ${issues.length}`);
if (!issues.length) console.log("✓ Barcha rasmli savol darvozalardan TOZA o'tdi.");
else {
  console.log("Qoida bo'yicha:"); for (const [r, c] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${r}: ${c}`);
  console.log("\nTafsilot (birinchi 40):"); issues.slice(0, 40).forEach((i) => console.log(`  ${i.file} id=${i.id} (${i.rule}) ${i.msg}`));
}
