import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/048_taktik_tibbiy_asoslar.json";
let data = JSON.parse(readFileSync(path, 'utf8'));

const fixes = {
  1: {
    options: {
      "A": "Harbiy xizmatchilarni jangovar texnikani boshqarishga o'rgatish",
      "B": "Harbiy xizmatchilarni turli sharoitlarda birinchi tibbiy yordam ko'rsatish amallarini o'rgatish",
      "C": "Harbiy xizmatchilarni qo'mondonlik va boshqaruv tizimiga tayyorlash",
      "D": "Harbiy xizmatchilarni dushman razvedkasiga qarshi harakat qilishga o'rgatish"
    },
    answer: "B"
  },
  3: {
    options: {
      "A": "Nisbatan xavfsiz pana joy, shaxsiy tarkib jarohatlanish xavfi o'rtacha",
      "B": "Dushman bilan bevosita olovli to'qnashuvda bo'lgan, yaralanish ehtimoli yuqori hudud",
      "C": "Shartli xavfsiz, shaxsiy tarkib jarohatlanish xavfi nisbatan past hudud",
      "D": "Tibbiy yordam ko'rsatish va yaralanganlarni parvarish qilish uchun ajratilgan xavfsiz zona"
    },
    answer: "B"
  },
  4: {
    options: {
      "A": "Dushman bilan bevosita to'qnashuv joyi, yaralanish xavfi eng yuqori",
      "B": "Nisbatan xavfsiz, vaqtincha pana joy: okop, transheya yoki bino ortida",
      "C": "Shartli xavfsiz hudud, tibbiy yordam to'liq hajmda ko'rsatiladigan joy",
      "D": "Evakuatsiya va qayta tashkil etish uchun ajratilgan orqa zona"
    },
    answer: "B"
  },
  5: {
    options: {
      "A": "Dushman bilan bevosita olovli to'qnashuv joyi, xavf eng yuqori",
      "B": "Nisbatan xavfsiz, dushman o'ti ostida qoladigan pana joy",
      "C": "Shartli xavfsiz hudud, shaxsiy tarkib jarohatlanish xavfi nisbatan past",
      "D": "Harbiy sanitariya bo'limi joylashgan, to'liq xavfsiz tibbiy zona"
    },
    answer: "C"
  },
  9: {
    question: "ITJdagi Promedol nima maqsadda va qanday beriladi?",
    options: {
      "A": "Infeksiyani oldini olish uchun og'iz orqali ichiladi",
      "B": "Kuchli og'riq qoldirish uchun mushak to'qimalariga inyeksiya qilinadi",
      "C": "Qon ketishini to'xtatish uchun yarana bevosita suriladi",
      "D": "Nafas olishni tiklash uchun burun orqali beriladi"
    },
    answer: "B"
  },
  10: {
    options: {
      "A": "Turniket jgut",
      "B": "Tibbiy plastir",
      "C": "Nazofarengial havo nayi",
      "D": "Shaxsiy bog'lov paketi"
    },
    answer: "C"
  },
  11: {
    question: "ITJdagi tibbiy plastir qanday o'lchamda bo'ladi?",
    options: {
      "A": "2 sm x 2 m",
      "B": "5 sm x 5 m",
      "C": "10 sm x 10 m",
      "D": "1 sm x 1 m"
    },
    answer: "B"
  },
  24: {
    question: "Siqib turuvchi elastik bog'lovning (bandajning) asosiy afzalligi nima?",
    options: {
      "A": "Nafas yo'llarini tozalash va kislorod etkazishda ishlatiladi",
      "B": "Bir qo'l bilan qo'yish mumkin, qo'shimcha mahkamlash talab etmaydi",
      "C": "Og'riq qoldiruvchi xususiyatga ega, og'ir jarohatlarda ishlatiladi",
      "D": "Faqat kuyish maydonini yopish va sovuq qo'yish uchun mo'ljallangan"
    },
    answer: "B"
  },
  25: {
    question: "Nima uchun jang maydonida yarorlarga tibbiy yordam imkon qadar tez ko'rsatilishi shart?",
    options: {
      "A": "Harbiy nizom ko'rsatgan muddatlarda bajarilmagan harakat intizom jazosiga tortiladi",
      "B": "Tibbiy yordam tezligi yaralanganlar hayotini saqlab qolishda hal qiluvchi ahamiyatga ega",
      "C": "Tibbiy jihozlar va dorilar cheklangan miqdorda bo'lgani uchun ularni tejash kerak",
      "D": "Yaradorlar saralash (triaj) tizimida yuqori imtiyozga ega bo'lishi uchun"
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
  console.log('048: VALID, ' + data.length + ' savol');
} catch(e) {
  console.error('048 XATO:', e.message);
}
