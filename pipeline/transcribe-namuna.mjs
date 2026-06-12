// NAMUNA → MATN: fan namuna rasmlarini bizning JSON sxemaga o'tkazish promptini yasaydi.
// Foydalanuvchi rasmlarni + promptni bepul MULTIMODAL web LLM (Gemini/Qwen) ga tashlaydi,
// JSON javobni inbox/<slug>/ ga saqlaydi → ingest qabul qiladi → _namuna.json langar bo'ladi.
//
// Ishlatish: node pipeline/transcribe-namuna.mjs --subject biologiya [--batch 10]

import fs from "fs";
import path from "path";
import { resolveSubject } from "./lib/subjects.mjs";
import { buildNamunaPrompt } from "./lib/prompt.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--subject") + 1];
const batch = parseInt((args[args.indexOf("--batch") + 1]) || "10", 10);
if (!slug || slug.startsWith("--")) { console.error("Xato: --subject <fan> kerak"); process.exit(1); }

const sub = resolveSubject(slug);
if (!sub.namuna.length) {
  console.error(`Xato: ${slug} uchun namuna rasm papkasi topilmadi.`);
  process.exit(1);
}

// Rasmlarni sanaymiz
const images = [];
for (const dir of sub.namuna) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => /\.(jpe?g|png)$/i.test(x)).sort()) {
    images.push(path.join(dir, f));
  }
}
if (!images.length) { console.error("Rasm topilmadi."); process.exit(1); }

const outDir = path.join("pipeline", "prompts", slug);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join("pipeline", "inbox", slug), { recursive: true });

const prompt = buildNamunaPrompt({ subjectName: sub.name, imageCount: batch });
const promptPath = path.join(outDir, "_namuna_ocr.txt");
fs.writeFileSync(promptPath, prompt, "utf8");

// Rasmlarni partiyalarga bo'lib ko'rsatamiz (web LLM bir martada cheklangan rasm oladi)
const batches = [];
for (let i = 0; i < images.length; i += batch) batches.push(images.slice(i, i + batch));

const guide = [
  `# ${sub.name} — namuna rasmlarni JSONga o'tkazish`, "",
  `Jami ${images.length} ta namuna rasm, ${batches.length} ta partiya (har biri ~${batch} ta).`, "",
  `1. Multimodal web LLM oching (gemini.google.com yoki chat.qwen.ai — rasm qabul qiladi).`,
  `2. Quyidagi promptni joylashtiring: ${promptPath}`,
  `3. Har partiyadagi rasmlarni biriktiring (drag&drop), JSON javobni oling.`,
  `4. Javobni saqlang: pipeline/inbox/${slug}/namuna_<partiya>.json`,
  `5. Hammasi bo'lgach: node pipeline/ingest.mjs --subject ${slug} --as-namuna`, "",
  "## Partiyalar (rasm yo'llari):", "",
];
batches.forEach((b, i) => {
  guide.push(`### Partiya ${i + 1} (${b.length} rasm) → inbox/${slug}/namuna_${String(i + 1).padStart(2, "0")}.json`);
  b.forEach((p) => guide.push(`- ${p}`));
  guide.push("");
});

fs.writeFileSync(path.join(outDir, "_namuna_guide.md"), guide.join("\n"), "utf8");
console.log(`✓ ${sub.name}: ${images.length} namuna rasm, ${batches.length} partiya`);
console.log(`  Prompt: ${promptPath}`);
console.log(`  Qo'llanma: ${path.join(outDir, "_namuna_guide.md")}`);
