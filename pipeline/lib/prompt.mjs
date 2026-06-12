// Generatsiya va namuna-OCR promptlarini quradi.
// Tahrirlanadigan matn `pipeline/templates/*.txt` da — foydalanuvchi erkin o'zgartiradi.
// Kod faqat {{...}} o'rinbosarlarni to'ldiradi (manba, namuna, mavjud savollar).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TPL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates");

function loadTpl(name) {
  return fs.readFileSync(path.join(TPL_DIR, name), "utf8");
}

function fill(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : ""));
}

// Namuna savollarni few-shot blok qilib chiqaradi
function renderAnchors(anchors = [], limit = 5) {
  if (!anchors.length) return "";
  const items = anchors.slice(0, limit).map((a, i) => {
    const opts = a.options || {};
    const lines = ["A", "B", "C", "D"]
      .filter((L) => opts[L])
      .map((L) => `   ${L}) ${opts[L]}`)
      .join("\n");
    return `Namuna ${i + 1}: ${a.question}\n${lines}`;
  });
  return `\n\n=== RASMIY IMTIHON NAMUNA SAVOLLARI (shu USLUB va qiyinlikda yoz; nusxa ko'chirma) ===\n${items.join("\n\n")}`;
}

// Mavjud savollarni "takrorlama" ro'yxati qilib chiqaradi
function renderExisting(existingTitles = [], limit = 30) {
  if (!existingTitles.length) return "";
  const sample = existingTitles
    .slice(0, limit)
    .map((t, i) => `${i + 1}. ${String(t).replace(/\s+/g, " ").slice(0, 120)}`);
  return `\n\n=== MAVJUD SAVOLLAR (bularni TAKRORLAMA — yangi mavzu/rakurs top) ===\n${sample.join("\n")}`;
}

const BLOCK_NAME = {
  mutaxassislik: "Mutaxassislik fani",
  kasb: "Kasb standartlari",
  pedagogika: "Pedagogik mahorat",
};

// Generatsiya prompti
export function buildGenPrompt({ subjectName, topicTitle, specChunk, anchors = [], existingTitles = [], count = 15, block = "mutaxassislik" }) {
  return fill(loadTpl("gen_prompt.txt"), {
    SUBJECT: subjectName,
    BLOCK: BLOCK_NAME[block] || BLOCK_NAME.mutaxassislik,
    TOPIC: topicTitle,
    COUNT: String(count),
    SPEC: specChunk,
    ANCHORS: renderAnchors(anchors),
    EXISTING: renderExisting(existingTitles),
  });
}

// Namuna rasmlarini JSONga o'tkazish prompti (multimodal web LLM uchun)
export function buildNamunaPrompt({ subjectName, imageCount }) {
  return fill(loadTpl("namuna_prompt.txt"), {
    SUBJECT: subjectName,
    COUNT: String(imageCount),
  });
}

export { renderAnchors, renderExisting };
