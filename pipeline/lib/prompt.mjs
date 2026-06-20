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

// Ped/kasb (UMUMIY) bloklar uchun kadrlash: pedStyle="framed" (fan-xos) yoki "neutral" (umumiy).
// CHQBT bo'lsa harbiy kontekst ruxsat; aks holda harbiy/CHQBT misol QAT'IY taqiqlanadi (anti-ifloslanish).
function blockGuidance(block, subjectName, isChqbt, pedStyle = "framed") {
  if (block !== "pedagogika" && block !== "kasb") return "";
  const label = BLOCK_NAME[block];
  if (pedStyle === "neutral") {
    return `\n═══ ${label} — UMUMIY (NEYTRAL) ═══\n` +
      `• UMUMIY pedagogika/kasb savoli: metod, didaktika, baholash, Blum taksonomiyasi, dars bosqichi, sinf rahbarligi, pedagogik etika, ta'lim texnologiyasi.\n` +
      `• Vaziyat misoli NEYTRAL umumta'lim maktabi kontekstida ("o'qituvchi darsda...", "o'quvchi...") — MUAYYAN FAN nomini (informatika/tarix/biologiya/tasviriy/harbiy) tilga OLMA.\n` +
      `• Savol HAR QANDAY fan o'qituvchisiga BIR XIL mos kelsin. Harbiy/CHQBT konteksti (askar, qurol, otish, jangovar, mudofaa) ham ISHLATILMAYDI.\n`;
  }
  if (isChqbt) {
    return `\n═══ ${label} — KADRLASH ═══\n` +
      `• Pedagogik/kasbiy tushuncha umumiy; vaziyat misollari CHQBT (harbiy/jangovar) ta'lim kontekstida bo'lishi mumkin.\n`;
  }
  return `\n═══ ${label} — FAN-XOS KADRLASH (MAJBURIY) ═══\n` +
    `• Pedagogik/kasbiy TUSHUNCHA umumiy (metod, baholash, Blum, dars bosqichi), AMMO har bir vaziyat misoli AYNAN "${subjectName}" darsi / "${subjectName}" o'qituvchisi kontekstida bo'lsin.\n` +
    `• BOSHQA FAN domeni misolini ISHLATMA. Ayniqsa HARBIY/CHQBT konteksti (askar, qurol, otish/otishma, jangovar, mudofaa, nizom, kursant, qo'mondon, snayper, safarbarlik) — bu fan harbiy EMAS — QAT'IY TAQIQLANADI.\n` +
    `• Aniq fan misoli (tarix/biologiya/geografiya va h.k.) ham aralashtirma. Mos misol bo'lmasa, neytral umumiy maktab konteksti ishlat.\n`;
}

// Generatsiya prompti
export function buildGenPrompt({ subjectName, subjectSlug = "", topicTitle, specChunk, anchors = [], existingTitles = [], count = 15, block = "mutaxassislik", pedStyle = "framed" }) {
  return fill(loadTpl("gen_prompt.txt"), {
    SUBJECT: subjectName,
    BLOCK: BLOCK_NAME[block] || BLOCK_NAME.mutaxassislik,
    BLOCK_GUIDANCE: blockGuidance(block, subjectName, subjectSlug === "chqbt", pedStyle),
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
