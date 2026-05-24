import React from 'react';
import { BATCH_SIZE } from '../config';
import {
  Medal, ClipboardList, Target, Map, Shield, HeartPulse, GraduationCap, Palette, PaintBucket, LandPlot, Image as ImageIcon, Ruler, Settings, Home, BookOpen, Activity, Baby, Laptop, Smile, PenTool, Award,
  Compass, Scroll, Hourglass, Globe, Heart, Swords, Trophy, Flame, Calculator, Sun, Cpu, Code, Network, FileText, Binary, Monitor, Wifi, MessageSquare, Scale, Users, ClipboardList as ClipboardIcon
} from 'lucide-react';

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

const tarixBaseNames = [
  "Oʻzbekiston tarixi (XIII asrgacha)",
  "Oʻzbekiston tarixi (XIII–XV asrlar)",
  "Oʻzbekiston tarixi (XVI–XIX asrlar)",
  "Oʻzbekiston tarixi (XIX–XXI asrlar)",
  "Jahon tarixi (Qadimgi va Oʻrta asrlar)",
  "Jahon tarixi (Yangi davr)",
  "Jahon tarixi (Eng yangi davr)",
  "Pedagogik mahorat"
];

const tarixIcons = [
  React.createElement(Compass, { size: 20 }),
  React.createElement(Shield, { size: 20 }),
  React.createElement(Scroll, { size: 20 }),
  React.createElement(Map, { size: 20 }),
  React.createElement(Hourglass, { size: 20 }),
  React.createElement(Compass, { size: 20 }),
  React.createElement(Globe, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const tarixTopics = tarixBaseNames.map((name, i) => ({
  id: 15 + i,
  name,
  icon: tarixIcons[i] || React.createElement(BookOpen, { size: 20 }),
  day: 14 + Math.floor(i / 4),
  category: 'tarix'
}));

const sportBaseNames = [
  "Fiziologiya va Sog'lom turmush tarzi",
  "Gimnastika va uning qoidalari",
  "Harakatli o'yinlar metodikasi",
  "Yengil atletika va Suzish",
  "Kurash texnikasi va taktikasi",
  "Futbol va Voleybol qoidalari",
  "Basketbol, Gandbol, Shaxmat",
  "Pedagogik mahorat"
];

const sportIcons = [
  React.createElement(HeartPulse, { size: 20 }),
  React.createElement(Activity, { size: 20 }),
  React.createElement(Smile, { size: 20 }),
  React.createElement(Flame, { size: 20 }),
  React.createElement(Swords, { size: 20 }),
  React.createElement(Target, { size: 20 }),
  React.createElement(Trophy, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const sportTopics = sportBaseNames.map((name, i) => ({
  id: 23 + i,
  name,
  icon: sportIcons[i] || React.createElement(Activity, { size: 20 }),
  day: 18 + Math.floor(i / 4),
  category: 'sport'
}));

const boshlangichBaseNames = [
  "Ona tili (Imlo va Uslubiyat)",
  "Ona tili (Lingvistik tahlil)",
  "O'qish savodxonligi va Adabiyot",
  "Matematika (Sonlar va Algebra)",
  "Matematika (Geometriya va Mantiq)",
  "Tabiiy fanlar (Geografiya, Biologiya)",
  "Tabiiy fanlar (Fizika, Kimyo, Tarbiya)",
  "Pedagogik mahorat"
];

const boshlangichIcons = [
  React.createElement(PenTool, { size: 20 }),
  React.createElement(BookOpen, { size: 20 }),
  React.createElement(Heart, { size: 20 }),
  React.createElement(Calculator, { size: 20 }),
  React.createElement(Ruler, { size: 20 }),
  React.createElement(Sun, { size: 20 }),
  React.createElement(Globe, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const boshlangichTopics = boshlangichBaseNames.map((name, i) => ({
  id: 31 + i,
  name,
  icon: boshlangichIcons[i] || React.createElement(Baby, { size: 20 }),
  day: 22 + Math.floor(i / 4),
  category: 'boshlangich'
}));

const infoBaseNames = [
  "Kompyuter va Raqamli madaniyat",
  "Ofis dasturlari va VB",
  "Mantiq va Sanoq sistemalari",
  "Algoritmlash va Scratch",
  "Dasturlash tillari (Python, JS)",
  "Kompyuter grafikasi va Veb",
  "Tarmoqlar, IP va Xavfsizlik",
  "Pedagogik mahorat"
];

const infoIcons = [
  React.createElement(Laptop, { size: 20 }),
  React.createElement(FileText, { size: 20 }),
  React.createElement(Binary, { size: 20 }),
  React.createElement(Cpu, { size: 20 }),
  React.createElement(Code, { size: 20 }),
  React.createElement(Monitor, { size: 20 }),
  React.createElement(Wifi, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const infoTopics = infoBaseNames.map((name, i) => ({
  id: 39 + i,
  name,
  icon: infoIcons[i] || React.createElement(Laptop, { size: 20 }),
  day: 26 + Math.floor(i / 4),
  category: 'info'
}));

const mttBaseNames = [
  "Pedagogika va Bolaning rivojlanishi",
  "Bolalarni tarbiyalash turlari",
  "Nutq o'stirish va Sensor tarbiya",
  "Matematika va Tasviriy faoliyat",
  "O'yin va Rivojlantiruvchi muhit",
  "MTT Me'yoriy-huquqiy asoslari",
  "Bolalar rivojlanish xaritasi",
  "Pedagogik mahorat"
];

const mttIcons = [
  React.createElement(Baby, { size: 20 }),
  React.createElement(Heart, { size: 20 }),
  React.createElement(MessageSquare, { size: 20 }),
  React.createElement(Palette, { size: 20 }),
  React.createElement(Smile, { size: 20 }),
  React.createElement(FileText, { size: 20 }),
  React.createElement(Map, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const mttTopics = mttBaseNames.map((name, i) => ({
  id: 47 + i,
  name,
  icon: mttIcons[i] || React.createElement(Smile, { size: 20 }),
  day: 30 + Math.floor(i / 4),
  category: 'mtt'
}));

const tilBaseNames = [
  "Matn tahlili va O'qish savodxonligi",
  "Imlo, Talaffuz va Punktuatsiya",
  "Uslubiyat va Nutq namunalari",
  "Til nazariyasi va Lingvistik tahlil",
  "Badiiy matn va Adabiyot nazariyasi",
  "Milliy adabiyot tarixi",
  "Jahon adabiyoti tarixi",
  "Pedagogik mahorat"
];

const tilIcons = [
  React.createElement(BookOpen, { size: 20 }),
  React.createElement(PenTool, { size: 20 }),
  React.createElement(MessageSquare, { size: 20 }),
  React.createElement(Ruler, { size: 20 }),
  React.createElement(FileText, { size: 20 }),
  React.createElement(Scroll, { size: 20 }),
  React.createElement(Globe, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const tilTopics = tilBaseNames.map((name, i) => ({
  id: 55 + i,
  name,
  icon: tilIcons[i] || React.createElement(PenTool, { size: 20 }),
  day: 34 + Math.floor(i / 4),
  category: 'til'
}));

const mttRahbarBaseNames = [
  "Pedagogika va Rivojlanish bosqichlari",
  "Axloqiy, Estetik va Jismoniy tarbiya",
  "Rejalashtirish va Metodik rahbarlik",
  "Xodimlar boshqaruvi va Metodik yordam",
  "Me'yoriy-huquqiy asoslar",
  "Kuzatuv kengashi va Xavfsizlik",
  "Ish hujjatlari va Rivojlantiruvchi muhit",
  "Pedagogik mahorat"
];

const mttRahbarIcons = [
  React.createElement(Baby, { size: 20 }),
  React.createElement(Heart, { size: 20 }),
  React.createElement(ClipboardList, { size: 20 }),
  React.createElement(Users, { size: 20 }),
  React.createElement(Scale, { size: 20 }),
  React.createElement(Shield, { size: 20 }),
  React.createElement(Award, { size: 20 }),
  React.createElement(GraduationCap, { size: 20 })
];

const mttRahbarTopics = mttRahbarBaseNames.map((name, i) => ({
  id: 63 + i,
  name,
  icon: mttRahbarIcons[i] || React.createElement(Award, { size: 20 }),
  day: 38 + Math.floor(i / 4),
  category: 'mtt_rahbar'
}));

export const SUBJECTS = [
  { id: 'chqbt', name: "CHQBT", icon: Medal, desc: "Harbiy bilimlar, Konstitutsiya va birinchi yordam" },
  { id: 'art', name: "Tasviriy San'at", icon: Palette, desc: "Chizmachilik va san'at tarixi" },
  { id: 'tarix', name: "Tarix", icon: BookOpen, desc: "O'zbekiston va Jahon tarixi, pedagogik mahorat" },
  { id: 'sport', name: "Jismoniy Tarbiya", icon: Activity, desc: "Sport nazariyasi va metodikasi" },
  { id: 'boshlangich', name: "Boshlang'ich Ta'lim", icon: Baby, desc: "Ona tili, matematika, tabiiy fanlar, metodika" },
  { id: 'info', name: "Informatika va AT", icon: Laptop, desc: "Kompyuter tizimlari, algoritmlash va dasturlash" },
  { id: 'mtt', name: "MTT Tarbiyachilari", icon: Smile, desc: "Maktabgacha ta'lim pedagogikasi va metodikasi" },
  { id: 'mtt_rahbar', name: "MTT Dir. O'rinbosari", icon: Award, desc: "Metodik rahbarlik, me'yoriy hujjatlar va boshqaruv" },
  { id: 'til', name: "Ona Tili va Adabiyot", icon: PenTool, desc: "Til qoidalari, adabiyot tarixi va tahlili" }
];

export const TOPICS = [...chqbtTopics, ...artTopics, ...tarixTopics, ...sportTopics, ...boshlangichTopics, ...infoTopics, ...mttTopics, ...mttRahbarTopics, ...tilTopics];

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
