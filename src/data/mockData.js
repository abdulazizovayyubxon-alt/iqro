import React from 'react';
import { q0_harbiy_xizmat } from './questions_0';
import { q1_umumharbiy_nizomlar } from './questions_1';
import { q2_otish_tayyorgarligi } from './questions_2';
import { q3_taktik_tayyorgarlik } from './questions_3';
import { q4_fuqaro_muhofazasi } from './questions_4';
import { q5_tibbiy_bilim } from './questions_5';
import { q6_pedagogik_mahorat } from './questions_6';
import { q7_tasviriy_sanat } from './questions_7';
import { imageQuestions } from './imageQuestions';
import { BATCH_SIZE } from '../config';
import { Medal, ClipboardList, Target, Map, Shield, HeartPulse, GraduationCap, Palette, PaintBucket, LandPlot, Image as ImageIcon, Ruler, Settings, Home, BookOpen } from 'lucide-react';

const chqbtTopics = [
  { id: 0, name: "Harbiy xizmat asoslari", icon: React.createElement(Medal, { size: 20 }), day: 1, category: 'chqbt',
    theoryHint: "📌 Asosiy qonunlar: Konstitutsiya 52-modda, Mudofaa doktrinasi, Harbiy majburiyat va xizmat to'g'risidagi qonun. Harbiy xizmat turlari: muddatli, shartnoma, zaxira." },
  { id: 1, name: "Umumharbiy nizomlar", icon: React.createElement(ClipboardList, { size: 20 }), day: 2, category: 'chqbt',
    theoryHint: "📌 4 ta nizom: Ichki xizmat, Intizomiy, Garnizon va qo'riqchilik, Saf nizomi. Navbatchi, posbon, soqchi vazifalari. Rag'batlantirish va jazo choralari." },
  { id: 2, name: "Otish tayyorgarligi", icon: React.createElement(Target, { size: 20 }), day: 4, category: 'chqbt',
    theoryHint: "📌 AK-74: kalibr 5.45mm, o'q tezligi 900m/s, samarali otish masofasi 500m. 6 ta asosiy qism: stvol, qo'ndoq, magazin, nishongoh, gaza quvuri, o'q-dori." },
  { id: 3, name: "Taktik tayyorgarlik", icon: React.createElement(Map, { size: 20 }), day: 5, category: 'chqbt',
    theoryHint: "📌 Topografik xarita: masshtab, shartli belgilar, azimut, kompas. Jangovar guruh tarkibi va joylanishi. Mudofaa va hujum taktikasi asoslari." },
  { id: 4, name: "Fuqaro muhofazasi", icon: React.createElement(Shield, { size: 20 }), day: 6, category: 'chqbt',
    theoryHint: "📌 OQQ turlari: yadroviy, kimyoviy, biologik. Himoya vositalari: gas niqob (GP-7), himoya kiyimi. Signal turlari: \"Havo xavfi\", \"Kimyoviy xavf\". Yashirish joylari." },
  { id: 5, name: "Tibbiy bilim asoslari", icon: React.createElement(HeartPulse, { size: 20 }), day: 7, category: 'chqbt',
    theoryHint: "📌 Birinchi yordam: qon to'xtatish (jgut, bosim bog'lam), sun'iy nafas, yurak uqalash. Jarohat turlari: ochiq, yopiq. Suyak sinishi: shina qo'yish qoidalari." },
  { id: 6, name: "Pedagogik mahorat", icon: React.createElement(GraduationCap, { size: 20 }), day: 8, category: 'chqbt',
    theoryHint: "📌 Ta'lim paradigmalari: an'anaviy, rivojlantiruvchi, shaxsga yo'naltirilgan. Dars turlari: yangi bilim, mustahkamlash, nazorat. Sinf rahbari vazifalari va pedagogik etika." },
];

const artBaseNames = [
  "Tasviriy san'at asoslari",
  "Amaliy bezak san'ati",
  "Me'morlik va Miniatyura",
  "Dizayn va Zamonaviy san'at",
  "Grafik savodxonlik",
  "Mashinasozlik chizmalari",
  "Qurilish chizmalari",
  "O'qitish metodikasi"
];

const artTopics = [];
const artQuestionsLength = q7_tasviriy_sanat.length;
const artSubCount = Math.ceil(artQuestionsLength / BATCH_SIZE);

const artIcons = [
  React.createElement(Palette, { size: 20 }), React.createElement(PaintBucket, { size: 20 }), React.createElement(LandPlot, { size: 20 }), React.createElement(ImageIcon, { size: 20 }),
  React.createElement(Ruler, { size: 20 }), React.createElement(Settings, { size: 20 }), React.createElement(Home, { size: 20 }), React.createElement(BookOpen, { size: 20 })
];

for (let i = 0; i < artSubCount; i++) {
  artTopics.push({
    id: 7 + i,
    name: artBaseNames[i] || `Tasviriy san'at (davomi ${i-7})`,
    icon: artIcons[i] || React.createElement(Palette, { size: 20 }),
    day: 10 + Math.floor(i / 4),
    category: 'art'
  });
}

export const TOPICS = [...chqbtTopics, ...artTopics];


export const SCHEDULE = [
  { day: 1, date: "2 May", topic: "Harbiy xizmat asoslari", tests: 8, goal: "Konstitutsiya, Mudofaa doktrinasi", topicId: 0 },
  { day: 2, date: "3 May", topic: "Nizomlar: Ichki xizmat + Intizomiy", tests: 8, goal: "2 nizomni o'rganish va farqlash", topicId: 1 },
  { day: 3, date: "4 May", topic: "Nizomlar: Garnizon + Saf", tests: 8, goal: "Qolgan 2 nizom + takrorlash", topicId: 1 },
  { day: 4, date: "5 May", topic: "Otish tayyorgarligi", tests: 9, goal: "Kalashnikov, qurol qonuni, otish", topicId: 2 },
  { day: 5, date: "6 May", topic: "Taktik tayyorgarlik", tests: 5, goal: "Topografiya, azimut, jangovar guruh", topicId: 3 },
  { day: 6, date: "7 May", topic: "Fuqaro muhofazasi", tests: 5, goal: "FV, OQQ: yadro, kimyoviy, biologik", topicId: 4 },
  { day: 7, date: "8 May", topic: "Tibbiy bilim asoslari", tests: 5, goal: "Birinchi yordam, jarohat turlari", topicId: 5 },
  { day: 8, date: "9 May", topic: "Pedagogik mahorat (1)", tests: 10, goal: "Paradigmalar, dars turlari", topicId: 6 },
  { day: 9, date: "10 May", topic: "Pedagogik mahorat (2)", tests: 10, goal: "Sinf rahbari, etika, metodika", topicId: 6 },
  { day: 10, date: "11 May", topic: "Tasviriy san'at va Chizmachilik", tests: 5, goal: "Ranglar, standartlar, perspektiva", topicId: 7 },
  { day: 11, date: "12 May", topic: "Umumiy takrorlash", tests: 50, goal: "Barcha bo'limlar — aralash test", topicId: -1 },
  { day: 12, date: "13 May", topic: "Imtihon kuni", tests: 0, goal: "Muvaffaqiyatlar!", topicId: -1 }
];

// Dinamik Art bo'limlari (savollar soniga qarab)
const ART_BASE_ID = 7;
const artSubQuestions = [];
for (let i = 0; i < q7_tasviriy_sanat.length; i += 50) {
  artSubQuestions.push(q7_tasviriy_sanat.slice(i, i + 50));
}

export const questionDatabase = {
  0: [...q0_harbiy_xizmat, ...imageQuestions.filter(q => q.topicId === 'topic_1')],
  1: q1_umumharbiy_nizomlar,
  2: q2_otish_tayyorgarligi,
  3: q3_taktik_tayyorgarlik,
  4: q4_fuqaro_muhofazasi,
  5: q5_tibbiy_bilim,
  6: q6_pedagogik_mahorat,
  // Art bo'limlarini dinamik joylaymiz
  ...Object.fromEntries(artSubQuestions.map((qs, i) => [ART_BASE_ID + i, qs]))
};

// TOPICS ro'yxatini ham dinamik kengaytirish mumkin, lekin hozircha borlarini to'ldiramiz
// Agar savollar ko'payib ketsa, yangi ID'lar qo'shilishi kerak.
// Hozirgi TOPICS 14 gacha bor (jami 8 ta Art bo'limi). 
// Agar q7 da 400 tadan ko'p bo'lsa, TOPICS ni ham yangilash kerak.


// --- Fisher-Yates — tasodifiy aralashtirish uchun to'g'ri algoritm ---
function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Haqiqiy savollar sonini qaytaradi (kategoriya bo'yicha)
export const getTopicQuestionCount = (topicId, activeCategory = 'chqbt') => {
  if (topicId >= 0 && questionDatabase[topicId]) {
    return questionDatabase[topicId].length;
  }
  
  // Barcha bo'limlar jami (faqat aktiv kategoriya uchun)
  let sum = 0;
  for (let key in questionDatabase) {
    const topicIdNum = parseInt(key);
    const topic = TOPICS.find(t => t.id === topicIdNum);
    if (!topic) continue;
    const isShared = Array.isArray(topic.category) ? topic.category.includes(activeCategory) : topic.category === activeCategory;
    if (isShared) {
      sum += questionDatabase[topicIdNum].length;
    }
  }
  return sum;
};

// Bloklash uchun qancha blok borligini qaytaradi
export const getTopicBatchCount = (topicId, activeCategory = 'chqbt') => {
  return Math.ceil(getTopicQuestionCount(topicId, activeCategory) / BATCH_SIZE);
};

export const getFallbackQuestions = (topicId, activeCategory = 'chqbt') => {
  if (topicId >= 0 && questionDatabase[topicId]) {
    return fisherYatesShuffle(questionDatabase[topicId]);
  }

  // Barcha bo'limlar (Imtihon yoki Umumiy takrorlash rejimi)
  // Endi barcha savollarni qaytaramiz (navbatdagi 50 taliklar ko'rinishi uchun)
  let allQ = [];
  for (let key in questionDatabase) {
    const topicIdNum = parseInt(key);
    const topic = TOPICS.find(t => t.id === topicIdNum);
    if (!topic) continue;

    const isShared = Array.isArray(topic.category) ? topic.category.includes(activeCategory) : topic.category === activeCategory;
    
    if (isShared) {
      allQ = [...allQ, ...questionDatabase[topicIdNum]];
    }
  }
  
  // Imtihon rejimi uchun tasodifiy aralashtiramiz
  return fisherYatesShuffle(allQ);
};
