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
    corpus: ["fan/tarix"],   // eski padded src/data bankni dedup bazasidan chiqardik — toza regeneratsiya (informatika/jismoniy patterni)
    namuna: ["fan/tarix_savollar.json"],
    spec: "scratch/tarix_spec_clean.txt",   // TOZA marker (1.1-2.3 mutaxassislik) — xom spec ped/kasb dumini (1.1 Kasbiy/2.1 Umumiy/2.2 o'qitish metodikasi) mutaxassislik deb chalkashtirardi
    book: "scratch/tarix_book.txt",   // jahon+o'zbekiston tarixi 6-11 sinf (11 PDF, ~2.9M, lotin) — sana/sulola/voqea/nom fakt grounding
  },
  boshlangich: {
    name: "Boshlang'ich ta'lim", category: "boshlangich",
    corpus: ["fan/boshlangich"],
    namuna: ["fan/boshlangich_savollar.json"],
    spec: "scratch/boshlangich_spec_clean.txt",   // TOZA marker (1.1-1.23 fan mazmuni: ona tili/o'qish/matematika/tabiiy/tarbiya) — xom spec bir-darajali marker bilan fan tushib qolardi
    book: "scratch/boshlangich_book.txt",   // 1-4 sinf 17 darslik (ona tili/o'qish/matematika/tabiiy/tarbiya, matnli ~95% lotin) — mutaxassislik mavzulariga fakt grounding
  },
  informatika: {
    name: "Informatika va AT", category: "info",
    corpus: ["fan/informatika"],
    namuna: ["fan/informatika_savollar.json", "scratch/extracted_info/word/media"],
    spec: "scratch/info_spec_clean.txt",   // rasmiy spec'dan toza markerli (1.1-1.12) ko'chirma — chunkSpec to'g'ri bo'laklashi uchun
    book: "scratch/info_book.txt",   // 5-9 + 10-sinf darsliklari (matnli) — mutaxassislik grounding
  },
  jismoniy_tarbiya: {
    name: "Jismoniy tarbiya", category: "sport",
    corpus: ["fan/jismoniy_tarbiya"],
    namuna: ["fan/jismoniy_savollar.json", "scratch/extracted_docx/word/media"],
    spec: "scratch/jismoniy_spec_clean.txt",   // rasmiy spec'dan toza markerli (1.1-1.12) ko'chirma — chunkSpec to'g'ri bo'laklashi uchun (xom: "Jismoniy tarbiya spets-yasi_text.txt")
    book: "scratch/jismoniy_book.txt",   // 2-8 sinf darsliklari (matnli, lotin dominant) — mutaxassislik mavzulariga fakt grounding (o'lcham/qoida/texnika)
  },
  mtt_tarbiyachi: {
    name: "MTT tarbiyachi", category: "mtt",
    corpus: ["fan/mtt_tarbiyachi"],
    namuna: ["fan/mtt_tarbiyachi_savollar.json", "scratch/extracted_mtt/word/media"],
    spec: "fan/spes/_txt/mtt_tarbiyachi_spec_clean.txt",   // TOZA mutaxassislik (1.1-1.3, ped/kasb dumi+adabiyot kesilgan). Ped+kasb=--blocks bilan SHARED_PED dan
    book: "scratch/mtt_tarbiyachi_book.txt",   // Babayeva nutq o'stirish metodikasi (lotin matn-qatlamli) — mutaxassislik fakt grounding. Qodirova/Yusupova/Shodmonova maktabgacha=skan (kam matn, tashlangan)
  },
  mtt_rahbar: {
    name: "MTT rahbar (direktor o'rinbosari)", category: "mtt_rahbar",
    corpus: ["fan/mtt_rahbar"],
    namuna: ["fan/mtt_rahbar_savollar.json", "scratch/extracted_mtt_rahbar/word/media"],
    spec: "fan/spes/_txt/mtt_rahbar_spec_clean.txt",   // TOZA mutaxassislik (1.1-1.2 boshqaruv, ped/kasb dumi+adabiyot kesilgan). Ped+kasb=--blocks bilan SHARED_PED dan
    book: "scratch/mtt_rahbar_book.txt",   // Sadikova Maktabgacha pedagogika 2013 (lotin) — boshqaruv/mutaxassislik grounding. Qodirova maktabgacha=skan (tashlangan)
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
    corpus: ["fan/ona_tili"],   // eski padded src/data bankni chiqardik; fan/ona_tili da _ped5 (ped+kasb) bor — dedup bazasi
    namuna: ["fan/ona_tili_savollar.json"],
    spec: "scratch/ona_tili_spec_clean.txt",   // TOZA marker (1.1-2.3 mutaxassislik) — xom spec ped/kasb dumini mutaxassislik deb chalkashtirardi
    book: "scratch/ona_tili_book.txt",   // ona tili+adabiyot 5-11 sinf (13 PDF, ~3.85M, lotin) — qoida/muallif/asar/sana fakt grounding. Ped/kasb=_ped5 da tayyor → faqat --blocks mutaxassislik gen
  },

  // ── C) YANGI qiloqchi (fan 2) — korpus YO'Q, namuna + PDF spec ──
  biologiya: {
    name: "Biologiya", category: "biologiya", isNew: true,
    corpus: [],
    namuna: ["fan/biologiya_savollar.json", "fan/Rasim/biologiya namuna"],
    spec: "scratch/biologiya_spec_clean.txt", specPdf: "fan/spes/Биология т.pdf",   // TOZA marker (1.1-1.23 fan mazmuni) — xom spec chunkSpec'ni buzardi (bir-darajali marker→fan tushib qolardi)
    book: "scratch/biologiya_book.txt",   // 5-11 sinf bio + botanika/zoologiya/odam darsliklari (matnli, ~97% lotin) — fakt grounding (botanika_6/odam_8 skan=kam matn)
  },
  geografiya: {
    name: "Geografiya", category: "geografiya", isNew: true,
    corpus: [],
    namuna: ["fan/geografiya_savollar.json", "fan/Rasim/geografiya namuna"],
    spec: "scratch/geografiya_spec_clean.txt", specPdf: "fan/spes/География  т.pdf",   // TOZA marker (1.1-1.23 fan mazmuni) — xom spec ped/kasb 1.1/2.2 markerlarini mutaxassislik deb chalkashtirardi
    book: "scratch/geografiya_book.txt",   // 5-10 sinf geografiya darsliklari (matnli, ~95% lotin) — fakt grounding (soat mintaqasi/iqlim/relief)
  },
  ingliz: {
    name: "Ingliz tili", category: "ingliz", isNew: true, lang: "en",  // mutaxassislik bloki INGLIZ tilida; ped/kasb o'zbekcha (SHARED_PED)
    corpus: [],
    namuna: ["pipeline/inbox/ingliz_namuna.json", "fan 2/Ingiliz tili namuna"],
    spec: "scratch/ingliz_spec_clean.txt", specPdf: "fan 2/Инглиз тили я.pdf",   // TOZA marker (1.1-2.3 mutaxassislik, inglizcha) — book grounding inglizcha darslik bilan mos
    book: "scratch/ingliz_book.txt",   // Prepare! 7-11 + Guess What 5-6 (Cambridge, matnli) — reading/grammar/vocab/pragmatics grounding
  },
  kimyo: {
    name: "Kimyo", category: "kimyo", isNew: true,   // o'zbek tilida (biologiya/geografiya patterni)
    corpus: [],
    namuna: ["pipeline/inbox/kimyo_namuna.json", "fan 2/Kimyo"],
    spec: "scratch/kimyo_spec_clean.txt", specPdf: "fan 2/Кимё т.pdf",   // TOZA marker (1.1-4.1 mutaxassislik: umumiy/anorganik/organik/laboratoriya)
    book: "scratch/kimyo_book.txt",   // 7-11 sinf kimyo darsliklari (matnli, lotin) — formula/xossa/reaksiya fakt grounding
  },
  rus_tili: {
    name: "Rus tili", category: "rus_tili", isNew: true, lang: "ru",  // BUTUN test RUS tilida (kirill) — RKI; ped/kasb ham ruscha
    corpus: [],
    namuna: ["pipeline/inbox/rus_tili_namuna.json", "fan 2/Rus tili"],
    spec: "scratch/rus_tili_spec_clean.txt", specPdf: "fan 2/Рус тили миллий я.pdf",   // TOZA marker (1.1-1.9 mutaxassislik, ruscha)
    book: "scratch/rus_tili_book.txt",   // RKI 2-11 sinf darsliklari (kirill) — grounding cheklangan (kirill), lekin manba sifatida
  },
  mtt_logoped: {
    name: "MTT logoped", category: "mtt_logoped", isNew: true,
    corpus: [],
    namuna: ["fan/mtt_logoped_savollar.json", "fan 2/MTT logoped"],
    spec: "fan/spes/_txt/mtt_logoped_spec_clean.txt",   // TOZA mutaxassislik (1.1-1.8, ped/kasb dumi+adabiyot kesilgan). Ped+kasb=o'rta ta'lim SHARED_PED dan (logoped maktabda ishlaydi)
    book: "scratch/mtt_logoped_book.txt",   // Ayupova Logopediya (lotin, o'zak) + Filicheva Osnovy — mutaxassislik fakt grounding. Arxipova/Volkova/ndpi=skan yoki rus-kirill (tashlangan)
  },
  mtt_psixolog: {
    name: "MTT psixolog", category: "mtt_psixolog", isNew: true,
    corpus: [],
    namuna: ["fan/mtt_psixolog_savollar.json", "fan 2/MTT psixolog"],
    spec: "fan/spes/_txt/mtt_psixolog_spec_clean.txt",   // TOZA mutaxassislik (1.1-1.5, ped/kasb dumi+adabiyot kesilgan). Ped+kasb=--blocks bilan SHARED_PED dan
    book: "scratch/mtt_psixolog_book.txt",   // Jalilova/Nishonova/Yosh davrlari/Abdullaeva/Hudoyqulov/Inklyuziv + G'oziev (qisman matn) — psixologiya fakt grounding
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
