import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/049_birinchi_yordam.json";
let data = JSON.parse(readFileSync(path, 'utf8'));

const fixes = {
  1: {
    options: {
      "A": "Tana ichki a'zolarida kasallik oqibatida yuzaga keladigan patologik jarayon",
      "B": "Organizm to'qimalarining tashqi omillar ta'sirida butunligini yo'qotishi bilan bog'liq patologik holat",
      "C": "Organizmning kimyoviy reaksiyalar natijasida ichki jihatdan o'zgarish holati",
      "D": "Suyaklar va bo'g'imlardagi yallig'lanish jarayoni"
    },
    answer: "B"
  },
  6: {
    options: {
      "A": "Mexanik shikastlanish",
      "B": "Biologik shikastlanish",
      "C": "Termik shikastlanish",
      "D": "Kimyoviy shikastlanish"
    },
    answer: "C"
  },
  9: {
    question: "Shok qanday holat va qanday omillar uni keltirib chiqaradi?",
    options: {
      "A": "Faqat qon ketish natijasida yuzaga keladigan o'tkinchi holat",
      "B": "Og'ir jarohatlar, qon yo'qotish, infeksiya yoki kuchli ruhiy zarbalar natijasida yuzaga keladigan jiddiy patologik holat",
      "C": "Suyak sinishi va bo'g'im chiqishlarida kuzatiladigan vaqtinchalik holat",
      "D": "Elektr toki yoki kimyoviy modda urishi natijasida yuzaga keladigan teri zararlanishi"
    },
    answer: "B"
  },
  13: {
    options: {
      "A": "Qon tomirlari devorining kuchsizlanishi oqibatida arterial bosimning pasayishi",
      "B": "Jarohatlangan tomirlardan qon oqib chiqishi bilan kechadigan patologik holat",
      "C": "Organizmga donor qoni yuborilishi bilan bog'liq tibbiy amaliyot",
      "D": "Qon plazmasining to'qimalarga o'tib, shish hosil qilishi holati"
    },
    answer: "B"
  },
  20: {
    options: {
      "A": "Suyak yuzasida paydo bo'ladigan tashqi yara",
      "B": "Suyaklar butunligining qisman yoki to'liq buzilishi bilan yuzaga keladigan shikastlanish",
      "C": "Suyaklar orasidagi bo'g'imning noto'g'ri holatga kelishi",
      "D": "Suyak atrofidagi mushaklarning yallig'lanishi bilan kechadigan kasallik"
    },
    answer: "B"
  },
  21: {
    options: {
      "A": "Shikastlangan joyda harorat ko'tarilishi, qizarish va suyuqlik to'planishi",
      "B": "Og'riq, deformatsiya, suyak g'ichirlashi va funksiya buzilishi",
      "C": "Teri yuzasida ko'karish, shish va bo'g'imda harakat cheklanishi",
      "D": "Bo'g'imda kuchli og'riq, harakat qiyinlashuvi va suyak qisqarishi belgilari"
    },
    answer: "B"
  },
  22: {
    options: {
      "A": "Jarohatlangan joyga antiseptik surtib, infeksiyaning oldini olish",
      "B": "Zararlangan bo'g'imni o'z vaqtida va to'g'ri immobilizatsiya qilish",
      "C": "Singan suyakni ehtiyotkorlik bilan asl holatiga qaytarish",
      "D": "Og'riq qoldiruvchi berish va sovuq kompres qo'yish"
    },
    answer: "B"
  },
  27: {
    options: {
      "A": "Yaradorga issiq choy ichirish va issiq o'rash",
      "B": "Yaradorni salqin joyga olib chiqib, kiyimlarini bo'shaytirish va sovitish choralarini ko'rish",
      "C": "Yarorlarga yotgan joyida qolishi uchun harakatlantirsiz saqlab turish",
      "D": "Nafas yo'lini tozalab, yurak-o'pka reanimatsiyasini boshlash"
    },
    answer: "B"
  },
  30: {
    question: "Sovuq urganda yaradorga qaysi ichimlikni BERISH TAQIQLANADI?",
    options: {
      "A": "Iliq choy",
      "B": "Mineral suv",
      "C": "Spirtli ichimliklar va kofein",
      "D": "Iliq shorva"
    },
    answer: "C",
    explanation: "Sovuq urganda: iliq suyuqlik (choy, suv, shorva) berish kerak. Lekin har qanday spirtli va kofeinli ichimliklardan qochish shart.",
    mnemonic: "Sovuq urish: SPIRT va KOFEIN BERMA; iliq choy/suv BER"
  },
  31: {
    options: {
      "A": "Muzlagan a'zoni qattiq ishqalab qizdirish",
      "B": "37-40°C suvda asta-sekin isitish",
      "C": "Muzlagan joyga issiq suv (60-70°C)da isitish",
      "D": "Qizdirilgan tosh yoki issiq buyum bilan isitish"
    },
    answer: "B"
  },
  32: {
    options: {
      "A": "Suvda uzoq vaqt turib qolishdan kelib chiqadigan charchoq holati",
      "B": "Nafas yo'llariga suv kirishi natijasida kislorod yetishmovchiligi yuzaga keladigan xavfli holat",
      "C": "Sovuq suvda muzlash va gipotermiya holati",
      "D": "Suvga tushib qo'rqish natijasida yuzaga keladigan psixologik holat"
    },
    answer: "B"
  },
  36: {
    options: {
      "A": "Faqat og'riqni kamaytirish va yaradorni tinch saqlash",
      "B": "Suyak parchalari qimirlashining, shok va infeksiyaning oldini olish, shifoxonaga yetkazishni osonlashtirish",
      "C": "Faqat tashish qulay bo'lishi va yaradorni yo'lda silkitmaslik",
      "D": "Faqat qon ketishini to'xtatish va tomir zararlanishining oldini olish"
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
  console.log('049: VALID, ' + data.length + ' savol');
} catch(e) {
  console.error('049 XATO:', e.message);
}
