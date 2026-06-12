// QABUL: inbox/<slug>/ dagi LLM javoblarini o'qiydi → validatsiya + dedup + aralashtirish →
// fan/<slug>/gen_<vaqt>.json ga qo'shadi. Yaroqsiz/takror savollar sababi bilan rejected/ ga.
//
// Ishlatish:
//   node pipeline/ingest.mjs --subject biologiya            # generatsiya javoblari
//   node pipeline/ingest.mjs --subject biologiya --as-namuna  # namuna langar javoblari

import fs from "fs";
import path from "path";
import { resolveSubject } from "./lib/subjects.mjs";
import { validateQuestion } from "./lib/schema.mjs";
import { buildIndex, findDuplicate, addToIndex } from "./lib/dedup.mjs";
import { shuffleOptions } from "./lib/shuffle.mjs";
import { loadMany } from "./lib/corpus.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--subject") + 1];
const asNamuna = args.includes("--as-namuna");
if (!slug || slug.startsWith("--")) { console.error("Xato: --subject <fan> kerak"); process.exit(1); }

const sub = resolveSubject(slug);
const inboxDir = path.join("pipeline", "inbox", slug);
if (!fs.existsSync(inboxDir)) { console.error(`Inbox yo'q: ${inboxDir}`); process.exit(1); }

// LLM javobidan JSON massivni qat'iy bo'lmagan usulda ajratib oladi
function extractQuestions(text) {
  let t = String(text).trim();
  t = t.replace(/```(?:json)?/gi, "").trim(); // markdown to'siqlarni olib tashlash
  // To'g'ridan-to'g'ri parse
  try { const j = JSON.parse(t); return Array.isArray(j) ? j : (j.questions || [j]); } catch {}
  // Birinchi [ dan oxirgi ] gacha
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch {}
    // oxirgi vergulni tuzatib qayta urinish
    try { return JSON.parse(t.slice(a, b + 1).replace(/,(\s*[\]}])/g, "$1")); } catch {}
  }
  return null;
}

// Inbox fayllarni o'qish (.json va .txt)
const files = fs.readdirSync(inboxDir).filter((f) => /\.(json|txt)$/i.test(f)).sort();
if (!files.length) { console.error(`Inbox bo'sh: ${inboxDir} (web LLM javoblarini shu yerga saqlang)`); process.exit(1); }

let raw = [];
const badFiles = [];
for (const f of files) {
  const qs = extractQuestions(fs.readFileSync(path.join(inboxDir, f), "utf8"));
  if (!qs) { badFiles.push(f); continue; }
  raw.push(...qs);
}

// Dedup indeksi: mavjud korpus + fan/<slug> dagi avvalgi gen/_clean/_namuna
const existingPaths = [...sub.corpus];
const subjDir = path.join("fan", slug);
if (fs.existsSync(subjDir)) {
  for (const f of fs.readdirSync(subjDir).filter((x) => /^(gen_|_clean|_namuna)/.test(x) && x.endsWith(".json"))) {
    existingPaths.push(path.join(subjDir, f));
  }
}
const existing = await loadMany(existingPaths);
const index = buildIndex(existing);

// Qayta ishlash
const accepted = [], rejected = [];
const dist = { A: 0, B: 0, C: 0, D: 0 };
for (const q0 of raw) {
  if (!q0 || typeof q0 !== "object") { rejected.push({ q: q0, reasons: ["obyekt emas"] }); continue; }
  q0.subject = q0.subject || sub.name;

  const errors = validateQuestion(q0);
  if (errors.length) { rejected.push({ q: q0.question || q0.q, reasons: errors }); continue; }

  const dup = findDuplicate(index, q0);
  if (dup) { rejected.push({ q: q0.question, reasons: [`takror (${dup.score.toFixed(2)}): ${dup.item.ref.question?.slice(0, 60) || ""}`] }); continue; }

  const q = asNamuna ? q0 : shuffleOptions(q0); // namuna langarni aralashtirmaymiz
  if (dist[q.answer] != null) dist[q.answer]++;
  accepted.push(q);
  addToIndex(index, q); // shu partiya ichida ham takror bo'lmasin
}

// Yozish
fs.mkdirSync(subjDir, { recursive: true });
fs.mkdirSync(path.join("pipeline", "rejected"), { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

let outPath;
if (asNamuna) {
  // _namuna.json ga birlashtirish
  outPath = path.join(subjDir, "_namuna.json");
  const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : [];
  const merged = [...prev, ...accepted];
  merged.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf8");
} else {
  outPath = path.join(subjDir, `gen_${ts}.json`);
  accepted.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(outPath, JSON.stringify(accepted, null, 2), "utf8");
}
if (rejected.length) {
  fs.writeFileSync(path.join("pipeline", "rejected", `${slug}_${ts}.json`), JSON.stringify(rejected, null, 2), "utf8");
}

// Hisobot
console.log(`\n=== INGEST: ${sub.name}${asNamuna ? " (namuna langar)" : ""} ===`);
console.log(`Fayllar: ${files.length}${badFiles.length ? ` (parse xato: ${badFiles.join(", ")})` : ""}`);
console.log(`Jami o'qildi: ${raw.length}`);
console.log(`✓ Qabul: ${accepted.length}  →  ${outPath}`);
console.log(`✗ Rad: ${rejected.length}` + (rejected.length ? `  →  pipeline/rejected/${slug}_${ts}.json` : ""));
if (!asNamuna) console.log(`Javob taqsimoti (aralashtirilgan): A:${dist.A} B:${dist.B} C:${dist.C} D:${dist.D}`);
// Rad sabablari xulosasi
if (rejected.length) {
  const why = {};
  for (const r of rejected) for (const reason of r.reasons) { const k = reason.split(":")[0].split("(")[0].trim(); why[k] = (why[k] || 0) + 1; }
  console.log("Rad sabablari:", JSON.stringify(why));
}
