import React from 'react';
import { BATCH_SIZE } from '../config';
import { Medal, ClipboardList, Target, Map, Shield, HeartPulse, GraduationCap, Palette, PaintBucket, LandPlot, Image as ImageIcon, Ruler, Settings, Home, BookOpen } from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TOPICS — mavzular ro'yxati (statik, ~2KB)
// Savollar endi Firestore'dan yuklanadi, bu yerda faqat metadata
// ══════════════════════════════════════════════════════════════

const chqbtTopics = [
  { id: 0, name: "Harbiy xizmat asoslari", icon: React.createElement(Medal, { size: 20 }), day: 1, category: 'chqbt',
    theoryHint: "📌 Asosiy qonunlar: Konstitutsiya, Mudofaa doktrinasi, Harbiy majburiyat va xizmat to'g'risidagi qonun. Harbiy xizmat turlari: muddatli, shartnoma, zaxira." },

  { id: 1, name: "Umumharbiy nizomlar", icon: React.createElement(ClipboardList, { size: 20 }), day: 2, category: 'chqbt',
    theoryHint: "📌 4 ta nizom: Ichki xizmat, Intizomiy, Garnizon va qo'riqchilik, Saf nizomi. Navbatchi, posbon, soqchi vazifalari. Rag'batlantirish va jazo choralari." },
  { id: 2, name: "Otish tayyorgarligi", icon: React.createElement(Target, { size: 20 }), day: 4, category: 'chqbt',
    theoryHint: "📌 AK-74: kalibr 5.45mm, o'q tezligi 900m/s, samarali otish masofasi 500m. Qurol to'g'risidagi qonun, Ichki va tashqi ballistika, Moddiy qism, TTT va taktik asoslari, amaliy otish zonalari (Jami 508 ta savol)." },
  { id: 3, name: "Taktik tayyorgarlik", icon: React.createElement(Map, { size: 20 }), day: 5, category: 'chqbt',
    theoryHint: "📌 Topografik xarita: masshtab, shartli belgilar, azimut, kompas. Jangovar guruh tarkibi va joylanishi. Mudofaa va hujum taktikasi asoslari (Jami 134 ta savol)." },
  { id: 4, name: "Fuqaro muhofazasi", icon: React.createElement(Shield, { size: 20 }), day: 6, category: 'chqbt',
    theoryHint: "📌 OQQ turlari: yadro, kimyoviy, biologik. Himoya vositalari: gazniqob (GP-7), himoya kiyimi. Tabiiy va texnogen FVlar: zilzila, ko'chki, sel, dovul, yong'in, KTEZM halokatlari va terrorizm (Jami 158 ta savol)." },
  { id: 5, name: "Tibbiy bilim asoslari", icon: React.createElement(HeartPulse, { size: 20 }), day: 7, category: 'chqbt',
    theoryHint: "📌 Birinchi yordam: qon to'xtatish (jgut, bosim bog'lam), sun'iy nafas, yurak uqalash. Jarohat va sinish turlari, kuyish darajalari, is gazi va zaharli hasharotlar chaqishida yordam (Jami 181 ta savol)." },
  { id: 6, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 8, category: 'chqbt',
    theoryHint: "📌 Ta'lim paradigmalari: an'anaviy, rivojlantiruvchi, shaxsga yo'naltirilgan. Dars turlari: yangi bilim, mustahkamlash, nazorat. Sinf rahbari vazifalari va pedagogik etika." },
];

// Art bo'limlari — Firestore'dagi savollar soniga qarab 8 ta bo'lim
const artBaseNames = [
  "Tasviriy san'at asoslari",
  "Amaliy bezak san'ati",
  "Me'morlik va Miniatyura",
  "Dizayn va Zamonaviy san'at",
  "Grafik savodxonlik",
  "Mashinasozlik chizmalari",
  "Qurilish chizmalari",
  "Pedagogik mahorat"
];

const artIcons = [
  React.createElement(Palette, { size: 20 }), React.createElement(PaintBucket, { size: 20 }), React.createElement(LandPlot, { size: 20 }), React.createElement(ImageIcon, { size: 20 }),
  React.createElement(Ruler, { size: 20 }), React.createElement(Settings, { size: 20 }), React.createElement(Home, { size: 20 }), React.createElement(BookOpen, { size: 20 })
];

const artTopics = artBaseNames.map((name, i) => ({
  id: 7 + i,
  name,
  icon: artIcons[i] || React.createElement(Palette, { size: 20 }),
  day: 10 + Math.floor(i / 4),
  category: 'art'
}));

export const TOPICS = [...chqbtTopics, ...artTopics];

export const SCHEDULE = [
  { day: 1, date: "2 May", topic: "Harbiy xizmat asoslari", tests: 8, goal: "Konstitutsiya, Mudofaa doktrinasi", topicId: 0 },
  { day: 2, date: "3 May", topic: "Nizomlar: Ichki xizmat + Intizomiy", tests: 8, goal: "2 nizomni o'rganish va farqlash", topicId: 1 },
  { day: 3, date: "4 May", topic: "Nizomlar: Garnizon + Saf", tests: 8, goal: "Qolgan 2 nizom + takrorlash", topicId: 1 },
  { day: 4, date: "5 May", topic: "Otish tayyorgarligi", tests: 50, goal: "Kalashnikov, Qurol qonuni, Ballistika, Moddiy qism va TTT", topicId: 2 },
  { day: 5, date: "6 May", topic: "Taktik tayyorgarlik", tests: 13, goal: "Topografiya, azimut, jangovar guruh", topicId: 3 },
  { day: 6, date: "7 May", topic: "Fuqaro muhofazasi", tests: 15, goal: "FV turlari, OQQ, Zilzila, Ko'chki, KTEZM va yong'in xavfsizligi", topicId: 4 },
  { day: 7, date: "8 May", topic: "Tibbiy bilim asoslari", tests: 17, goal: "Birinchi yordam, jarohat va sinish turlari, kuyish darajalari, zaharli hasharotlar", topicId: 5 },
  { day: 8, date: "9 May", topic: "Pedagogik mahorat (1)", tests: 10, goal: "Paradigmalar, dars turlari", topicId: 6 },
  { day: 9, date: "10 May", topic: "Pedagogik mahorat (2)", tests: 10, goal: "Sinf rahbari, etika, metodika", topicId: 6 },
  { day: 10, date: "11 May", topic: "Tasviriy san'at va Chizmachilik", tests: 5, goal: "Ranglar, standartlar, perspektiva", topicId: 7 },
  { day: 11, date: "12 May", topic: "Umumiy takrorlash", tests: 50, goal: "Barcha bo'limlar — aralash test", topicId: -1 },
  { day: 12, date: "13 May", topic: "Imtihon kuni", tests: 0, goal: "Muvaffaqiyatlar!", topicId: -1 }
];
