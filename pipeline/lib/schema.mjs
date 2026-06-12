// Savol sxemasi validatsiyasi.
// Loyihada 2 xil maydon nomi uchraydi (chqbt_yangi: soha/cognitive; namuna: topic/bloom_level).
// Shuning uchun ikkalasini ham qabul qilamiz, lekin MOHIYAT bir xil tekshiriladi.

import { hasCyrillic, cyrillicChars } from "./normalize.mjs";
import { cueLeakReasons } from "./quality.mjs";

const DIFFICULTIES = new Set(["Y1", "Y2", "Y3"]);
const QTYPES = new Set(["single", "matching", "sequence"]);
const LETTERS = ["A", "B", "C", "D"];

// Kiruvchi (xom) savolni kanonik ko'rinishga keltiradi — maydon nomlarini birlashtiradi.
export function canonical(q) {
  return {
    subject: q.subject ?? q.fan ?? "",
    topic: q.topic ?? q.soha ?? "",
    subtopic: q.subtopic ?? "",
    difficulty: q.difficulty ?? "",
    cognitive: q.cognitive ?? q.bloom_level ?? "",
    qtype: q.qtype ?? "single",
    requires_image: q.requires_image ?? false,
    question: (q.question ?? "").trim(),
    options: q.options ?? {},
    answer: q.answer ?? "",
    explanation: (q.explanation ?? "").trim(),
    mnemonic: q.mnemonic ?? "",
    source: (q.source ?? q.source_construct ?? "").trim(),
  };
}

// Bitta savolni tekshiradi -> xatolar ro'yxati (bo'sh bo'lsa = yaroqli).
export function validateQuestion(raw) {
  const q = canonical(raw);
  const errors = [];

  if (q.question.length < 10) errors.push("question juda qisqa yoki yo'q");

  // Variantlar
  const opts = q.options || {};
  for (const L of LETTERS) {
    if (!opts[L] || String(opts[L]).trim().length === 0) {
      errors.push(`option ${L} bo'sh yoki yo'q`);
    }
  }
  // 4 ta variant bir-biridan farqli bo'lsin
  const vals = LETTERS.map((L) => String(opts[L] ?? "").trim().toLowerCase());
  if (new Set(vals.filter(Boolean)).size < vals.filter(Boolean).length) {
    errors.push("variantlar orasida bir xil (takror) variant bor");
  }

  // To'g'ri javob
  if (!LETTERS.includes(q.answer)) {
    errors.push(`answer "${q.answer}" A/B/C/D dan biri emas`);
  } else if (!opts[q.answer]) {
    errors.push(`answer "${q.answer}" variant matni yo'q`);
  }

  if (!DIFFICULTIES.has(q.difficulty)) {
    errors.push(`difficulty "${q.difficulty}" Y1/Y2/Y3 dan biri emas`);
  }

  if (q.explanation.length < 10) errors.push("explanation juda qisqa yoki yo'q");
  if (!q.source) errors.push("source (manba: §/bet yoki konstrukt) yo'q");
  if (!q.topic && !q.subject) errors.push("topic/subject (mavzu) yo'q");

  // qtype (agar berilgan bo'lsa) to'g'ri bo'lsin
  if (q.qtype && !QTYPES.has(q.qtype)) {
    errors.push(`qtype "${q.qtype}" single/matching/sequence dan biri emas`);
  }

  // LOTIN-ONLY (9-qoida): qiymatlarda krill harf bo'lmasin
  const textFields = {
    question: q.question,
    "options.A": opts.A, "options.B": opts.B, "options.C": opts.C, "options.D": opts.D,
    explanation: q.explanation, mnemonic: q.mnemonic,
    topic: q.topic, subtopic: q.subtopic,
  };
  for (const [field, val] of Object.entries(textFields)) {
    if (hasCyrillic(val)) {
      errors.push(`${field} da krill harf bor (lotin bo'lishi kerak): "${cyrillicChars(val)}"`);
    }
  }

  // Javob-ishora (cue leakage): to'g'ri javobni o'qimasdan topib bo'lmasin
  errors.push(...cueLeakReasons(q));

  return errors;
}

export { LETTERS, DIFFICULTIES };
