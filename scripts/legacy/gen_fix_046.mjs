import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/046_panohgoh_gazniqob.json";
let data = JSON.parse(readFileSync(path, 'utf8'));

const fixes = {
  1: {
    question: "Panohgoh qanday inshootlar turkumiga kiradi?",
    options: {
      "A": "Aholini harbiy xizmatga tayyorlash uchun mo'ljallangan o'quv inshootlari",
      "B": "Aholini portlash, yong'in, nurlanish, zaharli moddalar va qurilma qulashidan himoya qiluvchi himoya inshootlari",
      "C": "FV vaqtida oziq-ovqat va tibbiy yordam zahiralarini saqlaydigan maxsus omborlar",
      "D": "Evakuatsiya jarayonida aholi yig'iladigan va ro'yxatga olinadigan ochiq maydonlar"
    },
    answer: "B"
  },
  7: {
    question: "Panohgohga kirish paytida qaysi narsalar TAQIQLANADI?",
    options: {
      "A": "Telefon, radio va elektr jihozlar ishlatish",
      "B": "Chekish, sham yoqish, hidli buyumlar, hayvonlar va ortiqcha yuk kiritish",
      "C": "Derazalarni ochish, ovoz baland gapirish va yugurib yurish",
      "D": "Begona shaxslarni kiritish, suv ichish va ovqatlanish"
    },
    answer: "B"
  },
  9: {
    question: "600 kishilik panohgohga 750 kishi yashirinmoqchi. Bu holatda qanday qaror qabul qilish to'g'ri?",
    options: {
      "A": "Barcha 750 kishini bir vaqtda kiritish — sig'imni biroz oshirish mumkin",
      "B": "Qo'shimcha panohgoh yoki RYAJ topish kerak, chunki 600 kishilik panohgoh sig'imdan oshilishi xavflidir",
      "C": "600 kishini kiritib, qolgan 150 kishi panohgoh oldida navbat kutishi kerak",
      "D": "Avval bolalar va ayollar kiritiladi, erkaklar ko'chada qoladi"
    },
    answer: "B"
  },
  19: {
    question: "Respirator gazniqobdan qanday farq qiladi?",
    options: {
      "A": "Respirator ko'z va yuz terisini ham himoya qiladi, gazniqob esa faqat nafas yo'llarini",
      "B": "Respirator faqat nafas yo'llarini himoya qiladi, ko'z va yuzni himoya qilmaydi",
      "C": "Respirator barcha zaharli moddalar va portlash to'lqinidan himoya qiladi",
      "D": "Respirator va gazniqob himoya imkoniyati jihatidan bir-biridan farq qilmaydi"
    },
    answer: "B"
  },
  20: {
    question: "Respiratorlar ta'sir yo'nalishiga ko'ra qanday turlarga bo'linadi?",
    options: {
      "A": "Kichik, o'rta va katta",
      "B": "Aerozolga qarshi, gazga qarshi, gaz-aerozolga qarshi",
      "C": "Harbiy, tibbiy va sanoat",
      "D": "Bir martalik, qayta ishlatiladigan va doimiy"
    },
    answer: "B"
  },
  22: {
    question: "Radioaktiv chang tarqaldi. Qo'lda faqat R-2 respirator va doka-paxta niqob bor. Qaysi vositani tanlash maqsadga muvofiq?",
    options: {
      "A": "Doka-paxta niqob, chunki u qulay va tez kiyiladi",
      "B": "R-2 respirator, chunki u aerozolga qarshi bo'lib radioaktiv changni filtrlaydi",
      "C": "Ikkalasini birga kiyish — birinchi doka-paxta, ustidan respirator",
      "D": "Hech birini kiymaslik — ular radioaktiv changdan himoya qilmaydi"
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
  console.log('046: VALID, ' + data.length + ' savol');
} catch(e) {
  console.error('046 XATO:', e.message);
}
