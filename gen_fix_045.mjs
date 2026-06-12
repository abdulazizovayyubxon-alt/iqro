import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/045_fv_ta'rif_vazifalari.json";
let data = JSON.parse(readFileSync(path, 'utf8'));

// Muammoli savollarni id bo'yicha tuzatish
const fixes = {
  2: {
    question: "FM qanday harakatlar vaqtida va qanday maqsadda amalga oshiriladi?",
    options: {
      "A": "Faqat tabiiy ofatlar vaqtida aholini qutqarish maqsadida",
      "B": "Harbiy harakatlar vaqtida yoki ularning oqibatida yuzaga keladigan xavflardan aholini, hududlarni, moddiy va madaniy boyliklarni muhofaza qilish maqsadida",
      "C": "Favqulodda holat e'lon qilingan paytda qurolli kuchlarni qo'llab-quvvatlash maqsadida",
      "D": "Tinchlik davrida ekologik xavflardan fuqarolarni himoya qilish maqsadida"
    },
    answer: "B"
  },
  4: {
    question: "Fuqaro muhofazasi tuzilmalari qanday asosda tashkil etiladi?",
    options: {
      "A": "Vazirlik va idoralar tomonidan doimiy shtatli harbiy bo'linmalar sifatida",
      "B": "Tashkilot o'z xodimlaridan shtatdan tashqari asosda, FM tadbirlarini bajarish uchun",
      "C": "Fuqaro muhofazasi bo'yicha maxsus o'quv kurslarini tugatgan ixtisoslashtirilgan xizmat sifatida",
      "D": "FVV boshqaruvidagi professional qidiruv-qutqaruv xizmatlari sifatida"
    },
    answer: "B"
  },
  6: {
    question: "Fuqaro muhofazasining aholini o'rgatishga doir vazifasi qanday ifodalangan?",
    options: {
      "A": "Aholini harbiy xizmatga jalb qilish va jangovar tayyorgarlikka o'rgatish",
      "B": "Aholini harbiy harakatlar vaqtida yuzaga keladigan xavflardan himoyalanish usullariga o'rgatish",
      "C": "Fuqarolarga mudofaa sanoati korxonalarida ishlash ko'nikmalarini berish",
      "D": "Mahalla va tashkilotlarda doimiy harbiy tayyor turish bo'yicha mashg'ulotlar o'tkazish"
    },
    answer: "B"
  },
  7: {
    question: "FM vazifalari orasida aholini va boyliklarni xavfsiz joyga olib chiqishga oid vazifa qanday?",
    options: {
      "A": "Zararlangan hududlarga tibbiy guruhlar va dori-darmon yuborish",
      "B": "Aholini, moddiy va madaniy boyliklarni xavfsiz joylarga evakuatsiya qilish",
      "C": "FV hududlarida jamoat tartibini saqlab turish va provokatsiyalarning oldini olish",
      "D": "Favqulodda vaziyat rayonlariga ixtisoslashtirilgan qutqaruv guruhlarini jo'natish"
    },
    answer: "B"
  },
  8: {
    question: "FM vazifalari ichida radiatsion, kimyoviy va biologik xavflarni kuzatishga oid vazifa qaysi?",
    options: {
      "A": "Harbiy texnika va qurollarning texnik holatini muntazam tekshirish va nazorat qilish",
      "B": "Radiatsion, kimyoviy va biologik vaziyat ustidan kuzatish va laboratoriya nazoratini olib borish",
      "C": "Chegara zonalari va harbiy ob'ektlar atrofida maxsus monitoring o'tkazish",
      "D": "Davlat chegaralari yaqinidagi aholini tartibli ravishda ro'yxatdan o'tkazish"
    },
    answer: "B"
  },
  9: {
    question: "FM vazifalari ichida aloqa va boshqaruvga oid vazifa qanday ifodalangan?",
    options: {
      "A": "Qurolli kuchlar shtabi bilan doimiy kriptografik aloqani ta'minlash",
      "B": "Boshqaruv, xabar berish va aloqa tizimlarini tashkil qilish, rivojlantirish va doimiy shay holatda saqlab turish",
      "C": "Fuqaro muhofazasi xodimlari uchun ish haqi va taqdirlash tizimini tartibga solish",
      "D": "Mahalliy hokimlik va vazirliklar o'rtasida hujjat almashinuv tartibini joriy etish"
    },
    answer: "B"
  },
  10: {
    question: "FM vazifalari orasida zararlangan hududlardagi ijtimoiy tartibga oid vazifa qaysi?",
    options: {
      "A": "Harbiy qo'shinlarni zarar ko'rgan hududlardan xavfsiz joyga uyushqoqlik bilan ko'chirish",
      "B": "Harbiy harakatlar oqibatida zarar ko'rgan hududlarda jamoat tartibini yo'lga qo'yish va saqlab turish",
      "C": "FV hududlarida kechki soat cheklovlarini belgilash va rioya etilishini nazorat qilish",
      "D": "Ozod qilingan hududlarda harbiy-fuqaro boshqaruvini tiklash va tashkil etish"
    },
    answer: "B"
  },
  12: {
    options: {
      "A": "Tabiiy xususiyatli",
      "B": "Ekologik xususiyatli",
      "C": "Texnogen xususiyatli",
      "D": "Biologik xususiyatli"
    },
    answer: "C"
  },
  13: {
    options: {
      "A": "Ekologik xususiyatli",
      "B": "Tabiiy xususiyatli",
      "C": "Texnogen xususiyatli",
      "D": "Biologik xususiyatli"
    },
    answer: "C"
  },
  14: {
    options: {
      "A": "Texnogen xususiyatli",
      "B": "Tabiiy xususiyatli",
      "C": "Ekologik xususiyatli",
      "D": "Biologik xususiyatli"
    },
    answer: "B"
  },
  15: {
    options: {
      "A": "Texnogen xususiyatli",
      "B": "Ekologik xususiyatli",
      "C": "Tabiiy xususiyatli",
      "D": "Biologik xususiyatli"
    },
    answer: "C"
  },
  18: {
    options: {
      "A": "Texnogen xususiyatli",
      "B": "Tabiiy xususiyatli",
      "C": "Ekologik xususiyatli",
      "D": "Biologik xususiyatli"
    },
    answer: "C"
  },
  19: {
    options: {
      "A": "Texnogen xususiyatli",
      "B": "Biologik xususiyatli",
      "C": "Tabiiy xususiyatli",
      "D": "Ekologik xususiyatli"
    },
    answer: "D"
  },
  24: {
    question: "Aholiga xabar berish deganda nimani tushunish kerak?",
    options: {
      "A": "Harbiy holat e'lon qilinishi munosabati bilan fuqarolarni yig'ilish joyiga chaqirish",
      "B": "Sodir bo'lishi mumkin bo'lgan FV yoki yuz bergan avariyalar to'g'risida ogohlantirish signali orqali xabar berish",
      "C": "Harbiy chaqiruv va safarbarlik tartib-qoidalari haqida fuqarolarni ma'muriy yo'l bilan xabardor qilish",
      "D": "Aholi markazlarida doimiy kuzatuv punktlarini tashkil etib, axborot to'plash"
    },
    answer: "B"
  },
  33: {
    question: "FM vazifalari ichida iqtisodiy barqarorlikka oid vazifa qanday ifodalangan?",
    options: {
      "A": "Harbiy sanoat korxonalari va mudofaa ob'ektlarining uzluksiz ishlab turishini ta'minlash",
      "B": "Xalq xo'jaligi obyektlarining barqaror ishlashini ta'minlash yuzasidan tadbirlar kompleksini o'tkazish",
      "C": "Favqulodda vaziyatlar davrida davlat byudjetini boshqarish va mablag' ajratish",
      "D": "Strategik tovar-moddiy zahiralar va oziq-ovqat bozorini doimiy nazorat qilish"
    },
    answer: "B"
  },
  34: {
    question: "FM ning shoshilinch amalga oshiriladigan asosiy faoliyati qanday nomlanadi?",
    options: {
      "A": "Aholini harbiy xizmatga tayyorlash va safarbarlik ishlarini olib borish",
      "B": "Qutqaruv va boshqa kechiktirib bo'lmaydigan ishlarni o'tkazish",
      "C": "FV paytida axborot yig'ish, tahlil qilish va prognoz tuzish",
      "D": "Himoya inshootlari va zahira texnikaning doimiy yaroqliligini ta'minlash"
    },
    answer: "B"
  }
};

data = data.map(q => {
  const fix = fixes[q.id];
  if (!fix) return q;
  return { ...q, ...fix };
});

writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
try {
  JSON.parse(readFileSync(path, 'utf8'));
  console.log('045: VALID, ' + data.length + ' savol');
} catch(e) {
  console.error('045 XATO:', e.message);
}
