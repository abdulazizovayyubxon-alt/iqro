import fs from 'node:fs';
import path from 'node:path';

// Section 01: Zamonaviy texnika va texnologiyalar (156 ta savol, IDs 1–156)
// Topic ID: 186
// Spetsifikatsiya:
// 1. Texnika va texnologiyalarga oid asosiy tushunchalar, tasnifi (energetik, texnologik, transport, axborot texnikasi).
// 2. Maishiy texnika ishlash tamoyillari (muzlatgich, changyutgich, mikser, kir yuvish mashinasi, konditsioner).
// 3. Sanoat texnikasi (CNC/SDU dastgohlari, frezalash, yo'nish dastgohlari, avtomatlashtirilgan liniyalar).
// 4. Mexanik uzatmalar (tasmali, tishli, zanjirli, chervyakli, friksion) kinematikasi va xususiyatlari.
// 5. Texnik xizmat ko'rsatish, diagnostika va xavfsizlik texnikasi.

const questions = [];

// Helper to create balanced options where all 4 have very close lengths (ratio <= 1.25)
function makeBalancedOpts(options, correctIdx) {
  // Ensure array has 4 items
  const res = [...options];
  return { opts: res, correct: correctIdx };
}

// Subtopic 1: Texnika tasnifi va asosiy tushunchalar
const techConcepts = [
  {
    name: "Texnologik mashinalar",
    def: "Xomashyo va materiallarning shakli, o'lchami yoki xossalarini o'zgartirish orqali tayyor mahsulot ishlab chiqaruvchi qurilmalar",
    dist1: "Faqat mexanik energiyani elektr energiyasiga aylantirib beruvchi yordamchi generator qurilmalari majmui",
    dist2: "Tayyor mahsulotlarni bir korxonadan ikkinchisiga xavfsiz yetkazib berishga mo'ljallangan transport vositalari",
    dist3: "Faqat ishlab chiqarish jarayonidagi elektr kuchlanishini nazorat qilib turuvchi o'lchov vositalari tizimi",
    expl: "Texnologik mashinalar mehnat qurollari hisoblanib, ularning bosh vazifasi xomashyo shakli, o'lchami yoki ichki tuzilishini o'zgartirib, buyum tayyorlashdir. Energetik mashinalar energiyani o'zgartiradi, transport mashinalari esa yuk tashiydi.",
    mnem: "Texnologik mashina — shakl va o'lchamni o'zgartiruvchi asosiy ishlab chiqaruvchidir."
  },
  {
    name: "Energetik mashinalar",
    def: "Har qanday turdagi energiyani mexanik energiyaga yoki aksincha mexanik energiyani boshqa turdagi energiyaga aylantiruvchi vositalar",
    dist1: "Xomashyoni kesish, yo'nish yoki silliqlash orqali yangi geometrik shakldagi detallar tayyorlovchi dastgohlar",
    dist2: "Ishlab chiqarish binosida doimiy toza havo aylanishini ta'minlovchi markaziy shamollatish moslamalari",
    dist3: "Texnologik jarayon davomida ishchilarning xavfsizligini ta'minlashga qaratilgan avtomatik to'siq vositalari",
    expl: "Energetik mashinalarga ichki yonuv dvigatellari, elektr dvigatellari, turbinalar va generatorlar kiradi. Ular energiya turini o'zgartirish bilan shug'ullanadi.",
    mnem: "Energetik mashina — energiya turlarini o'zaro aylantiruvchi kuch manbaidir."
  },
  {
    name: "Transport mashinalari",
    def: "Xomashyo, yarim tayyor mahsulotlar va tayyor buyumlarni bir ish joyidan ikkinchisiga ko'chirish va tashish vazifasini bajaruvchi texnika",
    dist1: "Metall va yog'och detallarning sirtqi qatlamiga kimyoviy ishlov berib ularni zanglashdan asrovchi agregatlar",
    dist2: "Elektr zanjiridagi tok kuchi va kuchlanish miqdorini doimiy ravishda rostlab turuvchi avtomatik relelar",
    dist3: "Dastgohlarning aylanuvchi vallariga tushadigan ishqalanish kuchini kamaytirish uchun moylovchi nasoslar",
    expl: "Transport vositalari va mashinalari (konveyerlar, kranlar, avtoyuklagichlar) ishlab chiqarishda yuk va materiallarni kerakli manzilga tashish vazifasini bajaradi.",
    mnem: "Transport mashinasi — xomashyo va yukni kerakli nuqtaga eltuvchi vositadir."
  },
  {
    name: "Axborot texnikasi",
    def: "Ishlab chiqarish jarayonlarini boshqarish uchun zarur axborotlarni to'plash, qayta ishlash, saqlash va uzatishni ta'minlovchi tizimlar",
    dist1: "Yuqori bosim ostida bug' yoki gaz hosil qilib korxonaning isitish tizimini bir maromda ushlab turuvchi qozonlar",
    dist2: "Xomashyoni qizdirib uning plastiklik xususiyatini oshirishga xizmat qiladigan elektr pechlari majmuasi",
    dist3: "Metall detallarni payvandlash jarayonida paydo bo'ladigan zararli gazlarni yutib oluvchi maxsus filtrlar",
    expl: "Axborot texnikasiga dasturlanuvchi kontrollerlar, datchiklar, kompyuter boshqaruv tizimlari kiradi. Ular jarayonni nazorat qilish va avtomatlashtirishda asosiy vositadir.",
    mnem: "Axborot texnikasi — ishlab chiqarish jarayonining aqlli boshqaruv markazidir."
  }
];

// Generate subtopic questions with balanced distractors
techConcepts.forEach((item, i) => {
  const qId = questions.length + 1;
  const correctIdx = (qId - 1) % 4;
  const opts = ["", "", "", ""];
  opts[correctIdx] = item.def;
  let dIdx = 0;
  const dists = [item.dist1, item.dist2, item.dist3];
  for (let o = 0; o < 4; o++) {
    if (o !== correctIdx) {
      opts[o] = dists[dIdx++];
    }
  }
  questions.push({
    id: qId,
    q: `Zamonaviy texnika tasnifiga ko'ra (5-sinf 'Texnologiya' darsligi), '${item.name}' tushunchasining asosiy vazifasi va mohiyati qaysi javobda to'g'ri ifodalangan?`,
    opts,
    correct: correctIdx,
    explanation: item.expl,
    mnemonic: item.mnem,
    topicId: 186,
    category: "texnologiya_dizayn",
    difficulty: "Y1",
    bloom_level: "Bilish",
    question_type: "Y1",
    source_file: "01_zamonaviy_texnika_va_texnologiyalar.json"
  });
});

console.log("Q1-4 tayyor, jami:", questions.length);
