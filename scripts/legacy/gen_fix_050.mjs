import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/050_tibbiy_11sinf.json";
let data = JSON.parse(readFileSync(path, 'utf8'));

const fixes = {
  1: {
    options: {
      "A": "Bosh miyaga qon quyilishi",
      "B": "Miya chayqalishi",
      "C": "Miya ezilishi",
      "D": "Bosh suyagi asosi sinishi"
    },
    answer: "B"
  },
  2: {
    options: {
      "A": "Yaradorni tez yurgizish va harakatga majburlash",
      "B": "Tinch joyga yotqizib, sovuq qo'yish va harakatni cheklash, 103 chaqirish",
      "C": "Darhol og'riq qoldiruvchi mushakka yuborish",
      "D": "Boshga issiq kompres qo'yish"
    },
    answer: "B"
  },
  5: {
    options: {
      "A": "Isitma, terlash va qaltirashuv",
      "B": "Og'riq, shish, deformatsiya, harakat buzilishi, g'ichirlagan tovush",
      "C": "Qon bosimining o'zgarishi va bosh og'rishi",
      "D": "Ko'ngil aynishi, qusish va holsizlik"
    },
    answer: "B"
  },
  8: {
    options: {
      "A": "Suyak sinishi",
      "B": "Suyaklarni birlashtiruvchi bo'g'imning joyidan siljishi",
      "C": "Pay yirtilishi",
      "D": "Mushak shikastlanishi"
    },
    answer: "B"
  },
  9: {
    options: {
      "A": "Suyak sinishi — g'ichirlash, deformatsiya va og'riq",
      "B": "Bo'g'im chiqishi — kuchli og'riq, bo'g'imda harakat kamayadi, a'zo odatdagidek turmaydi",
      "C": "Pay cho'zilishi — shish va harakatda noqulaylik",
      "D": "Miya chayqalishi — bosh aylanishi va ko'ngil aynishi"
    },
    answer: "B"
  },
  11: {
    options: {
      "A": "Bemorni tezda ko'tarib harakatga majburlash",
      "B": "Bemorni harakatlardan himoya qilish va harakatsizlantirish",
      "C": "Dori berib, shifokor kelguncha kutish",
      "D": "Bemorni yonbosh holatga o'tkazish"
    },
    answer: "B"
  },
  12: {
    options: {
      "A": "Bemorni o'tqazib, yostiq bilan qo'llab avtomobilga joylashtirish",
      "B": "Maxsus shinalar yoki taxta yordamida, qattiq tekis yuzaga yotqizib harakatsiz holda",
      "C": "Bemorni qo'lda ko'tarib, yonbosh holatda tashish",
      "D": "Bemorni tez yugurib, imkon qadar tez olib borish"
    },
    answer: "B"
  },
  15: {
    options: {
      "A": "Miya chayqalishi natijasida hushdan ketish",
      "B": "Qorin ichki a'zolari shikastlanishi va ichki qon ketishi",
      "C": "Ko'krak qafasi jarohati va pnevmotoraks",
      "D": "Pay cho'zilishi va bo'g'im chiqishi"
    },
    answer: "B"
  },
  16: {
    options: {
      "A": "Darhol jarohatlanganlarga tibbiy yordam ko'rsatish",
      "B": "Avvalo xavfsizlikni ta'minlash, avariya signalini yoqish va 103 chaqirish",
      "C": "Barcha atrofdagi avtomobillarni to'xtatib, yordam so'rash",
      "D": "Jarohatlanganni darhol mashinadan chiqarib, o'tga yotqizish"
    },
    answer: "B"
  },
  17: {
    options: {
      "A": "Spirt va antiseptik eritma",
      "B": "Turniket rezina jgut",
      "C": "Termometr",
      "D": "Bir martalik shpris"
    },
    answer: "B"
  },
  18: {
    options: {
      "A": "Jarohatlanganni tezda mashinadan chiqarish",
      "B": "Umurtqa pog'onasi shikastlanmasligi uchun bemorning bo'g'imlarini harakatlantirmaslik",
      "C": "Bemor bilan muloqot qilmaslik va faqat 103 chaqirish",
      "D": "Dori berish va tez tibbiy yordam kelguncha kutish"
    },
    answer: "B"
  },
  20: {
    options: {
      "A": "Qorin bo'shlig'iga qon yig'ilishi",
      "B": "Ko'krak bo'shlig'iga havo yig'ilishi",
      "C": "Ko'krak bo'shlig'iga qon yig'ilishi",
      "D": "Qovurg'alar sinishi"
    },
    answer: "B"
  },
  22: {
    options: {
      "A": "Miya chayqalishi",
      "B": "Miyaga qon quyilishi",
      "C": "Miya ezilishi",
      "D": "Bosh suyagi asosi sinishi"
    },
    answer: "C"
  },
  24: {
    options: {
      "A": "Yotgan holda, boshi pastga tushirilgan",
      "B": "Boshi biroz ko'tarilgan yoki yarim o'tirgan holat",
      "C": "Qorni bilan yotqizilgan holat",
      "D": "Yonboshlab yotqizilgan holat"
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
  console.log('050: VALID, ' + data.length + ' savol');
} catch(e) {
  console.error('050 XATO:', e.message);
}
