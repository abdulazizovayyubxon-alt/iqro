// KALITSIZ GENERATSIYA: fan uchun tayyor promptlar paketini yasaydi.
// Manba: fan spec (mutaxassislik) + umumiy ped spec (pedagogika/kasb) + namuna langar + anti-dup.
// Har bo'lim uchun pipeline/prompts/<slug>/NNN_<blok>.txt yoziladi.
//
// Ishlatish:
//   node pipeline/make-prompts.mjs --subject biologiya
//   node pipeline/make-prompts.mjs --subject tarix --per 15 --limit 5
//   node pipeline/make-prompts.mjs --subject informatika --no-ped

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { resolveSubject, SHARED_PED } from "./lib/subjects.mjs";
import { chunkSpec, BLOCK_LABEL } from "./lib/chunk.mjs";
import { buildGenPrompt } from "./lib/prompt.mjs";
import { loadMany } from "./lib/corpus.mjs";

const args = process.argv.slice(2);
function arg(name, def) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; }
const slug = arg("--subject");
const per = parseInt(arg("--per", "15"), 10);
const limit = parseInt(arg("--limit", "0"), 10); // 0 = barchasi
const noPed = args.includes("--no-ped");

if (!slug) { console.error("Xato: --subject <fan> kerak"); process.exit(1); }

const sub = resolveSubject(slug);

// 1) Spec matnini tayyorlash (PDF bo'lsa — pdftotext bilan ajratish)
function ensureSpecText(s) {
  if (s.specExists) return s.spec;
  if (s.specPdf && fs.existsSync(s.specPdf)) {
    console.log(`PDF ajratilmoqda: ${s.specPdf} → ${s.spec}`);
    execFileSync("pdftotext", ["-enc", "UTF-8", s.specPdf, s.spec]);
    return s.spec;
  }
  return null;
}

const specPath = ensureSpecText(sub);
if (!specPath || !fs.existsSync(specPath)) {
  console.error(`Xato: spec matni topilmadi (${sub.spec}). PDF: ${sub.specPdf || "yo'q"}`);
  process.exit(1);
}

// 2) Bo'laklar: fan spec (mutaxassislik) + umumiy ped spec (pedagogika/kasb)
let chunks = chunkSpec(fs.readFileSync(specPath, "utf8"));
if (!noPed && fs.existsSync(SHARED_PED.spec)) {
  const pedChunks = chunkSpec(fs.readFileSync(SHARED_PED.spec, "utf8"))
    .filter((c) => c.block !== "mutaxassislik"); // umumiy manbadan faqat pedagogika/kasb
  chunks = chunks.concat(pedChunks);
}
if (limit > 0) chunks = chunks.slice(0, limit);

// 3) Namuna langarlar (agar JSONga o'tkazilgan bo'lsa) — fan bo'yicha
async function loadAnchors() {
  const candidates = [
    path.join("fan", slug, "_namuna.json"),
    ...sub.namuna.filter((p) => p.endsWith(".json")),
  ];
  const out = [];
  for (const p of candidates) if (fs.existsSync(p)) out.push(...(await loadMany([p])));
  return out;
}

// 4) Mavjud savollar (anti-dup uchun sarlavhalar)
function textOf(q) { return q.question ?? q.q ?? ""; }
const existing = (await loadMany(sub.corpus)).map(textOf).filter(Boolean);
function sampleExisting(n = 25) {
  if (existing.length <= n) return existing;
  const out = [];
  const step = Math.floor(existing.length / n);
  for (let i = 0; i < existing.length && out.length < n; i += step) out.push(existing[i]);
  return out;
}

const anchors = await loadAnchors();
const pedAnchors = anchors.filter((a) => /pedagog|metod|tarbiya|baholash/i.test((a.topic || "") + (a.subtopic || "")));

// 5) Promptlarni yozish
const outDir = path.join("pipeline", "prompts", slug);
const inboxDir = path.join("pipeline", "inbox", slug);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(inboxDir, { recursive: true });

const indexLines = [`# ${sub.name} — generatsiya promptlari`, "",
  `Manba: ${specPath}${noPed ? "" : " + " + SHARED_PED.spec}`,
  `Bo'limlar: ${chunks.length} | har biriga ${per} savol so'raladi`, "",
  "Har faylni bepul web LLM (gemini.google.com / chat.deepseek.com / chat.qwen.ai) ga",
  "joylashtiring, JSON javobni `pipeline/inbox/" + slug + "/NNN.json` ga saqlang.", "",
  "| № | Blok | Mavzu |", "|---|---|---|"];

chunks.forEach((c, i) => {
  const n = String(i + 1).padStart(3, "0");
  const useAnchors = c.block === "pedagogika" || c.block === "kasb" ? (pedAnchors.length ? pedAnchors : anchors) : anchors;
  const prompt = buildGenPrompt({
    subjectName: sub.name,
    topicTitle: c.title,
    specChunk: c.text.trim(),
    anchors: useAnchors,
    existingTitles: sampleExisting(),
    count: per,
    block: c.block,
  });
  const safeTitle = c.title.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40);
  fs.writeFileSync(path.join(outDir, `${n}_${c.block}_${safeTitle}.txt`), prompt, "utf8");
  indexLines.push(`| ${n} | ${BLOCK_LABEL[c.block]} | ${c.title.replace(/\|/g, " ").slice(0, 70)} |`);
});

fs.writeFileSync(path.join(outDir, "index.md"), indexLines.join("\n"), "utf8");

const byBlock = {};
for (const c of chunks) byBlock[c.block] = (byBlock[c.block] || 0) + 1;
console.log(`✓ ${sub.name}: ${chunks.length} prompt yozildi → ${outDir}`);
console.log(`  Bloklar: ${JSON.stringify(byBlock)} | namuna langar: ${anchors.length} ta | anti-dup: ${existing.length} mavjud savol`);
console.log(`  Keyingi: promptlarni web LLM'ga joylashtiring → javoblarni ${inboxDir}/ ga saqlang → node pipeline/ingest.mjs --subject ${slug}`);
