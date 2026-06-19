// 15 qiloqchi (fan/yo'nalish) reyestri — fabrikaning yagona "haqiqat manbai".
// Har fan uchun: korpus papka, namuna rasm papkalari, spec manba, app kategoriya, maqsad.
// Yo'llar loyiha ildiziga nisbatan. Mavjudligi ishlatishda tekshiriladi (resolveSubject).

import fs from "fs";

export const TARGET_DEFAULT = 2000;

// Pedagogik mahorat + kasb standartlari — HAMMA fanga UMUMIY manba (real o'tgan test to'plami).
// Har fan generatsiyasida mutaxassislik (fan spec) + shu umumiy manba ishlatiladi.
export const SHARED_PED = {
  spec: "scratch/ped_spec_text.txt",
  manbaDir: "fan/_ped_manba",        // darslik kutubxonasi (kasb standarti + 9 ped darslik) — --ped-extra bilan ishlatiladi
  namuna: "fan/_ped_namuna.json",    // umumiy pedagogika namuna langarlari (real tushgan savol uslubi)
  name: "Pedagogik mahorat va kasb standartlari",
};

export const SUBJECTS = {
  // ── A) App kategoriya + padded korpus (fan/<slug>) — TOZALASH kerak ──
  chqbt: {
    name: "Harbiy ta'lim (CHQBT)", category: "chqbt",
    corpus: ["fan/chqbt", "src/data/questions_0.js", "src/data/questions_1.js",
             "src/data/questions_2.js", "src/data/questions_3.js",
             "src/data/questions_4.js", "src/data/questions_5.js", "src/data/questions_6.js"],
    namuna: ["fan/CHQBT_savollar.json"],
    spec: "fan/spes/_txt/ЧҚБТ т.txt",
    book: "scratch/chqbt_book.txt",   // darslik (10+11 sinf, toza) — mutaxassislik mavzulariga per-mavzu fakt grounding
  },
  art: {
    name: "Tasviriy san'at", category: "art",
    corpus: ["fan/art", "src/data/questions_7.js"],
    namuna: ["fan/tasviriy_savollar.json", "fan/art_spec_images", "fan/rasm_namuna"],
    spec: "fan/spes/_txt/Тасвирий санъат ва чизмачилик т.txt",
    book: "scratch/art_book.txt",   // 5-sinf tasviriy + 9-sinf chizmachilik darsligi (matnli) — mutaxassislik grounding
  },
  tarix: {
    name: "Tarix", category: "tarix",
    corpus: ["fan/tarix", "src/data/questions_tarix.json"],
    namuna: ["fan/tarix_savollar.json"],
    spec: "scratch/Тарих т_text.txt",
  },
  boshlangich: {
    name: "Boshlang'ich ta'lim", category: "boshlangich",
    corpus: ["fan/boshlangich"],
    namuna: ["fan/boshlangich_savollar.json"],
    spec: "scratch/Бошланғич таълим ўзбек я_text.txt",
  },
  informatika: {
    name: "Informatika va AT", category: "info",
    corpus: ["fan/informatika"],
    namuna: ["fan/informatika_savollar.json", "scratch/extracted_info/word/media"],
    spec: "scratch/Информатика ва АТ т_text.txt",
  },
  jismoniy_tarbiya: {
    name: "Jismoniy tarbiya", category: "sport",
    corpus: ["fan/jismoniy_tarbiya"],
    namuna: ["fan/jismoniy_savollar.json", "scratch/extracted_docx/word/media"],
    spec: "scratch/Jismoniy tarbiya spets-yasi_text.txt",
  },
  mtt_tarbiyachi: {
    name: "MTT tarbiyachi", category: "mtt",
    corpus: ["fan/mtt_tarbiyachi"],
    namuna: ["fan/mtt_tarbiyachi_savollar.json", "scratch/extracted_mtt/word/media"],
    spec: "scratch/МТТ тарбиячи педагоглари я_text.txt",
  },
  mtt_rahbar: {
    name: "MTT rahbar (direktor o'rinbosari)", category: "mtt_rahbar",
    corpus: ["fan/mtt_rahbar"],
    namuna: ["fan/mtt_rahbar_savollar.json", "scratch/extracted_mtt_rahbar/word/media"],
    spec: "scratch/МТТ директор ўринбосари_text.txt",
  },

  // ── B) App kategoriya, allaqachon to'la (src/data) ──
  nemis: {
    name: "Nemis tili", category: "nemis",
    corpus: ["src/data/questions_nemis.json"],
    namuna: ["fan 2/nemis namuna"],
    spec: "scratch/german_spec.txt",
  },
  ona_tili: {
    name: "Ona tili va adabiyot", category: "til",
    corpus: ["src/data/questions_ona_tili.json"],
    namuna: ["fan/ona_tili_savollar.json"],
    spec: "scratch/Она тили ва адабиёт_text.txt",
  },

  // ── C) YANGI qiloqchi (fan 2) — korpus YO'Q, namuna + PDF spec ──
  biologiya: {
    name: "Biologiya", category: "biologiya", isNew: true,
    corpus: [],
    namuna: ["fan/biologiya_savollar.json", "fan 2/biologiya  namuna"],
    spec: "scratch/biologiya_spec.txt", specPdf: "fan 2/Биология т.pdf",
  },
  geografiya: {
    name: "Geografiya", category: "geografiya", isNew: true,
    corpus: [],
    namuna: ["fan/geografiya_savollar.json", "fan 2/geografiya namuna"],
    spec: "scratch/geografiya_spec.txt", specPdf: "fan 2/География  т.pdf",
  },
  ingliz: {
    name: "Ingliz tili", category: "ingliz", isNew: true,
    corpus: [],
    namuna: ["fan 2/Ingiliz tili namuna"],
    spec: "scratch/ingliz_spec.txt", specPdf: "fan 2/Инглиз тили я.pdf",
  },
  mtt_logoped: {
    name: "MTT logoped", category: "mtt_logoped", isNew: true,
    corpus: [],
    namuna: ["fan/mtt_logoped_savollar.json", "fan 2/MTT logoped"],
    spec: "scratch/mtt_logoped_spec.txt", specPdf: "fan 2/МТТ логопедия я.pdf",
  },
  mtt_psixolog: {
    name: "MTT psixolog", category: "mtt_psixolog", isNew: true,
    corpus: [],
    namuna: ["fan/mtt_psixolog_savollar.json", "fan 2/MTT psixolog"],
    spec: "scratch/mtt_psixolog_spec.txt", specPdf: "fan 2/МТТ психологлари я.pdf",
  },
};

export function getSubject(slug) {
  const s = SUBJECTS[slug];
  if (!s) {
    throw new Error(`Noma'lum fan: "${slug}". Mavjudlar: ${Object.keys(SUBJECTS).join(", ")}`);
  }
  return { slug, target: TARGET_DEFAULT, ...s };
}

// Faqat haqiqatda mavjud yo'llarni qaytaradi (yo'qlarini ogohlantiradi).
export function resolveSubject(slug) {
  const s = getSubject(slug);
  const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
  return {
    ...s,
    corpus: s.corpus.filter(exists),
    namuna: (s.namuna || []).filter(exists),
    specExists: exists(s.spec),
    specPdfExists: s.specPdf ? exists(s.specPdf) : false,
    missing: {
      corpus: s.corpus.filter((p) => !exists(p)),
      namuna: (s.namuna || []).filter((p) => !exists(p)),
      spec: !exists(s.spec),
    },
  };
}

export const ALL_SLUGS = Object.keys(SUBJECTS);
