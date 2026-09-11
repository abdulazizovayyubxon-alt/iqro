// ════════════════════════════════════════════════════════════════════════
// registry.mjs — namuna savollar reyestri (yagona haqiqat manbai).
//
// Manba: demotest.uzedu.uz namuna (demo) testlari → `fan/namuna txt/*.txt`
// → parse.mjs → `pipeline/namuna/parsed/<cat>.json` (savol + 4 variant, javobSIZ).
//
// ⚠️ `fan/*_savollar.json` ISHLATILMAYDI — o'sha ekstraksiya buzuq (moslashtirish
// savollarining o'zak ro'yxati tushib qolgan). parse.mjs izohiga qarang.
//
// To'g'ri javob manbada YO'Q — u `keys/<cat>.json` da qo'lda aniqlanadi
// (build.mjs shu ikkisini birlashtiradi).
//
// topicId diapazonlari firestore.rules dagi ruxsat bloki bilan bir xil
// bo'lishi SHART, aks holda yozuv "permission-denied" bilan rad etiladi.
// ════════════════════════════════════════════════════════════════════════

export const REGISTRY = {
  chqbt:        { min: 0,   max: 6,   name: "Harbiy ta'lim (CHQBT)" },
  art:          { min: 7,   max: 14,  name: "Tasviriy san'at" },
  tarix:        { min: 15,  max: 22,  name: 'Tarix' },
  sport:        { min: 23,  max: 30,  name: 'Jismoniy tarbiya' },
  boshlangich:  { min: 31,  max: 38,  name: "Boshlang'ich ta'lim" },
  info:         { min: 39,  max: 46,  name: 'Informatika va AT' },
  mtt:          { min: 47,  max: 54,  name: 'MTT tarbiyachi' },
  til:          { min: 55,  max: 62,  name: 'Ona tili va adabiyot' },
  mtt_rahbar:   { min: 63,  max: 70,  name: 'MTT rahbar' },
  biologiya:    { min: 80,  max: 86,  name: 'Biologiya' },
  geografiya:   { min: 87,  max: 96,  name: 'Geografiya' },
  mtt_logoped:  { min: 97,  max: 106, name: 'MTT logoped' },
  mtt_psixolog: { min: 107, max: 113, name: 'MTT psixolog' },
};

// Ajratilgan savollar fayli (parse.mjs natijasi)
export const parsedPath = (cat) => `pipeline/namuna/parsed/${cat}.json`;

// Bo'lim nomlari — kalit yozayotganda to'g'ri topicId tanlash uchun ma'lumotnoma.
// src/data/mockData.js dagi TOPICS bilan bir xil.
export const TOPIC_NAMES = {
  0: 'Harbiy xizmat asoslari', 1: 'Umumharbiy nizomlar', 2: 'Otish tayyorgarligi',
  3: 'Taktik tayyorgarlik', 4: 'Fuqaro muhofazasi', 5: 'Tibbiy bilim asoslari',
  6: 'Pedagogik mahorat (chqbt)',
  7: "Tasviriy san'at asoslari", 8: "Amaliy bezak san'ati", 9: "Me'morlik va Miniatyura",
  10: "Dizayn va Zamonaviy san'at", 11: 'Grafik savodxonlik', 12: 'Mashinasozlik chizmalari',
  13: 'Qurilish chizmalari', 14: 'Pedagogik mahorat (art)',
  15: "O'zbekiston tarixi I", 16: "O'zbekiston tarixi II", 17: "O'zbekiston tarixi III",
  18: "O'zbekiston tarixi IV", 19: 'Jahon tarixi I', 20: 'Jahon tarixi II',
  21: 'Jahon tarixi III', 22: 'Pedagogik mahorat (tarix)',
  23: "Fiziologiya va Sog'lom hayot", 24: 'Gimnastika qoidalari', 25: "Harakatli o'yinlar",
  26: 'Yengil atletika va Suzish', 27: 'Kurash va Taktika', 28: 'Futbol va Voleybol',
  29: 'Basketbol, Gandbol, Shaxmat', 30: 'Pedagogik mahorat (sport)',
  31: 'Imlo va Uslubiyat', 32: 'Lingvistik tahlil', 33: "O'qish va Adabiyot",
  34: 'Sonlar va Algebra', 35: 'Geometriya va Mantiq', 36: 'Geografiya va Biologiya',
  37: 'Fizika, Kimyo va Tarbiya', 38: 'Pedagogik mahorat (boshlangich)',
  39: 'Raqamli madaniyat', 40: 'Ofis dasturlari va VB', 41: 'Mantiq va Sanoq tizimi',
  42: 'Algoritmlash va Scratch', 43: 'Python va JS dasturlash', 44: 'Grafika va Veb-dizayn',
  45: 'Tarmoqlar va Xavfsizlik', 46: 'Pedagogik mahorat (info)',
  47: 'Pedagogika va Rivojlanish', 48: 'Tarbiyalash turlari', 49: 'Nutq va Sensor tarbiya',
  50: 'Matematika va Tasviriy', 51: "O'yin va Rivojlanish muhiti", 52: "Me'yoriy-huquqiy asoslar",
  53: 'Bolalar xaritasi', 54: 'Pedagogik mahorat (mtt)',
  55: 'Matn tahlili va Savodxonlik', 56: 'Imlo va Punktuatsiya', 57: 'Uslubiyat va Nutq',
  58: 'Til nazariyasi', 59: 'Badiiy matn va Adabiyot', 60: 'Milliy adabiyot tarixi',
  61: 'Jahon adabiyoti tarixi', 62: 'Pedagogik mahorat (til)',
  63: 'Pedagogika va Rivojlanish', 64: "Tarbiyaviy yo'nalishlar", 65: 'Metodik rahbarlik',
  66: 'Xodimlar boshqaruvi', 67: "Me'yoriy-huquqiy asoslar", 68: 'Kuzatuv kengashi',
  69: 'Hujjatlar va Muhit', 70: 'Pedagogik mahorat (mtt_rahbar)',
  80: 'Biologiya asoslari va xilma-xillik', 81: 'Hujayra biologiyasi', 82: 'Organizmlar biologiyasi',
  83: 'Genetika va evolyutsiya', 84: 'Ekosistema va biosfera', 85: 'Kasb standarti (bio)',
  86: 'Pedagogik mahorat (bio)',
  87: "Geografiyaning boshlang'ich kursi", 88: 'Materiklar va okeanlar', 89: "O'rta Osiyo va O'zbekiston tabiiy",
  90: "O'zbekiston iqtisodiy-ijtimoiy", 91: 'Jahon iqtisodiy-ijtimoiy', 92: 'Amaliy geografiya',
  93: 'Geografik masala va topshiriqlar', 94: 'Geografik grafik materiallar',
  95: 'Kasb standarti (geo)', 96: 'Pedagogik mahorat (geo)',
  97: 'Tovush talaffuzi buzilishlari', 98: 'Markaziy (neyrogen) nutq buzilishlari',
  99: 'Motor nutq buzilishlari', 100: 'Ritm va ravonlik buzilishlari',
  101: 'Ovoz rezonansi buzilishlari', 102: 'Nutqning umumiy rivojlanmaganligi',
  103: 'Yozma nutq buzilishlari', 104: "O'qish va yozish buzilishlari",
  105: 'Kasb standarti (logoped)', 106: 'Pedagogik mahorat (logoped)',
  107: 'Psixologiya maqsadi va metodlari', 108: 'Oila psixologiyasi',
  109: 'Hayotiy davrlar va rivojlanish', 110: "Inklyuziv ta'lim", 111: 'Yosh psixologiyasi',
  112: 'Kasb standarti (psixolog)', 113: 'Pedagogik mahorat (psixolog)',
};

export const ALL = Object.keys(REGISTRY);
