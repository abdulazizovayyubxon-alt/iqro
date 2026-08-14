import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/047_teri_himoya.json";
let data = JSON.parse(readFileSync(path, 'utf8'));

const fixes = {
  10: {
    question: "L-1 kostyumi qaysi material va maqsad uchun ishlatiladi?",
    options: {
      "A": "Paxta matosidan, yong'in va yuqori haroratga qarshi himoya uchun",
      "B": "Rezina matosidan, zaharli moddalar, radioaktiv va biologik zararlashdan tanani himoya qilish uchun",
      "C": "Naylon matosidan, sovuq ob-havo sharoitida isitish uchun",
      "D": "Metallik qatlami bor matosidan, portlash to'lqini va shikastalash elementlaridan himoya uchun"
    },
    answer: "B"
  },
  11: {
    question: "L-1 kostyumi qanday qismlardan iborat?",
    options: {
      "A": "Ko'ylak, shim, etik va gazniqob",
      "B": "Qalpoqli kamzul, paypoqli shim, shlemosti va ikki barmoqli qo'lqop",
      "C": "Kombinezon, qo'lqop va nafas niqobi",
      "D": "Plash, paypoq, qo'lqop va shlem"
    },
    answer: "B"
  },
  16: {
    question: "Kimyoviy razvedka o'tkazish uchun qaysi himoya kostyumi mos keladi?",
    options: {
      "A": "UHT plash, chunki u engil va harakatlanishga qulay",
      "B": "L-1 kostyumi, chunki u to'liq yopiq tizim bo'lib kimyoviy zararlashga maxsus mo'ljallangan",
      "C": "Faqat gazniqob va respirator kiysak kifoya qiladi",
      "D": "Oddiy harbiy forma, chunki u harakatlanishni cheklamaydi"
    },
    answer: "B"
  },
  17: {
    question: "Radioaktiv chang xavfida to'liq himoya uchun qanday vositalar birgalikda ishlatiladi?",
    options: {
      "A": "Faqat GP-5 gazniqob yetarli",
      "B": "GP-5 gazniqob va UHT to'plami birga ishlatiladi",
      "C": "Faqat L-1 kostyumi yetarli",
      "D": "Faqat R-2 respirator va oddiy ish kiyimi"
    },
    answer: "B"
  },
  20: {
    question: "Individual himoya vositalari qanday ikki asosiy guruhga bo'linadi?",
    options: {
      "A": "Harbiy va fuqarolik himoya vositalari",
      "B": "Nafas organlarini himoyalash vositalari va teri himoyasi vositalari",
      "C": "Kimyoviy va radiatsion xavflardan himoyalash vositalari",
      "D": "Individual va guruhiy foydalanish uchun mo'ljallangan vositalar"
    },
    answer: "B"
  },
  21: {
    question: "GP-7 gazniqobi GP-5 dan qanday afzalliklarga ega?",
    options: {
      "A": "GP-7 og'irroq va kattaroq bo'lib, kuchli kimyoviy moddalardan himoya qiladi",
      "B": "GP-7 yengilroq va o'ng-chap filtroboksli bo'lib, ko'rish maydonini yaxshilaydi",
      "C": "GP-7 faqat harbiy xizmatchilar uchun mo'ljallangan, GP-5 fuqarolar uchun",
      "D": "GP-5 va GP-7 o'rtasida amaliy farq yo'q, faqat tashqi ko'rinishi farq qiladi"
    },
    answer: "B"
  },
  22: {
    question: "Gazniqob qanday holatda saqlanishi kerak?",
    options: {
      "A": "Shkafdagi qutida, foydalanish uchun kerak bo'lganda chiqariladigan holatda",
      "B": "O'z sumkachasida, to'g'ri o'ralgan holda, doimo yonida",
      "C": "Sovuq va quruq joyda, har 6 oyda bir marta tekshirilib turiladi",
      "D": "Avariya kabineti shkafida, mas'ul shaxs kalitida"
    },
    answer: "B"
  },
  25: {
    question: "Kimyoviy avariya e'lon qilindi, havo zaharli modda bilan ifloslandi. O'quv muassasasidagi o'quvchilarga qanday ko'rsatma berish to'g'ri?",
    options: {
      "A": "Ko'chaga chiqib toza havoga nafas olish",
      "B": "Derazalarni yopib, gazniqob yoki doka-paxta niqob kiying va ko'rsatmani kuting",
      "C": "Darhol uyga qaytib, oila a'zolari bilan evakuatsiya qilish",
      "D": "Gazniqobsiz, faqat L-1 kostyumda ko'chaga chiqib evakuatsiya punktiga borish"
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
  console.log('047: VALID, ' + data.length + ' savol');
} catch(e) {
  console.error('047 XATO:', e.message);
}
