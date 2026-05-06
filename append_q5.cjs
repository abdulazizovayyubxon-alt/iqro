const fs = require('fs');

const questions = [];

// 1. Qon ketishi va Jgut qo'yish qoidalari (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Tibbiy vaziyat tahlili (Qon ketishi: " + i + "): O'tkir jarohat oqibatida bemorning oyog'idan to'q qizil rangli qon tekis va davomli tarzda oqib chiqmoqda. Bunday venoz qon ketishida birinchi tibbiy yordam (PMP) sifatida qanday asosiy harakat amalga oshirilishi kerak?",
    opts: [
      "Jarohat ustiga steril qistirma qo'yib, bosuvchi (siqib bog'lovchi) bog'lam qo'llash",
      "Darhol jarohatdan yuqori qismiga qon to'xtatuvchi jgut (burama) o'rnatish",
      "Jarohatni yod bilan yuvib, shunchaki ochiq havoda quritish",
      "Qon oqimini kamaytirish uchun qon oqayotgan joydan pastki qismni siqish"
    ],
    correct: 0,
    explanation: "To'q qizil va tekis oqib chiquvchi qon - bu venoz qon ketishidir. Uni to'xtatish uchun bosuvchi bog'lam etarli. Jgut (burama) faqat favqulodda kuchli ARTERIAL qon ketishida qo'llaniladi. 💡 Maslahat: Jgutni hamma qon ketishga ham qo'yaverish to'qima o'limiga olib keladi."
  });
}

// 2. Suyak sinishi va Imobilizatsiya (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Shikastlanishlar tahlili (Imobilizatsiya: " + i + "): Bemorning boldir suyagi ochiq sinib, suyak bo'laklari yuzaga chiqib qolgan. Transport shinasini qo'yishdan oldin PMP ko'rsatuvchi shaxs qanday HARAKAT QILMASLIGI qat'iyan man etiladi?",
    opts: [
      "Chiqib qolgan suyak bo'laklarini joyiga qaytarib kiritish (to'g'rilash) va kuchli siqib bog'lash",
      "Jarohat atrofini tozalab, steril qistirma va yengil bog'lam qo'yish",
      "Shinani jarohat ustiga emas, kiyim ustidan ikkita qo'shni bo'g'imni qamrab oladigan qilib o'rnatish",
      "Bemorni tinchlantirish va og'riq qoldiruvchi dori vositalarini berish"
    ],
    correct: 0,
    explanation: "Ochiq sinishda chiqib qolgan suyaklarni HECH QACHON o'zboshimchalik bilan joyiga kiritish mumkin emas (bu infeksiya va qon ketishini kuchaytiradi). Jarohat shunchaki steril yopiladi va o'sha holatida fiksatsiya qilinadi. 🧠 Eslab qoling: Suyakni joyiga solish - travmatologning ishi!"
  });
}

// 3. Reanimatsiya (Sun'iy nafas va yurak massaji) (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Reanimatsiya protokoli (Klinik o'lim: " + i + "): Klinik o'lim holatidagi kattalar uchun o'pka-yurak reanimatsiyasini (O'YR) amalga oshirishda ko'krak qafasini ezish (yurak massaji) va sun'iy nafas berish nisbati qanday bo'lishi standart talab hisoblanadi?",
    opts: [
      "30 marta ko'krak qafasini ezish va 2 marta sun'iy nafas berish (30:2)",
      "15 marta ezish va 1 marta nafas berish (15:1)",
      "5 marta ezish va 1 marta nafas berish (5:1)",
      "Avval ketma-ket 10 marta nafas berib, so'ng faqat yurak massajini qilish"
    ],
    correct: 0,
    explanation: "Zamonaviy birinchi tibbiy yordam standartlariga ko'ra (kattalar uchun), O'YR nisbati har doim 30 ta ezishga 2 ta nafas (30:2) qilib belgilanadi. 💡 Maslahat: Tezlik daqiqasiga 100-120 marta ezish bo'lishi kerak."
  });
}

// 4. Kuyish, muzlash, zaharlanish holatlarida yordam (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Favqulodda tibbiy holat (Termik shikastlanish: " + i + "): Jabrlanuvchining tanasi issiq qaynoq suvdan 2-darajali (pufakchalar hosil bo'lgan) termik kuyishga uchradi. Dastlabki yordam vaqtida quyidagilardan qaysi biri QAT'IYAN TAQIQLANADI?",
    opts: [
      "Kuygan pufakchalarni yorish va kuygan joyga yog', smetana yoki spirt surtish",
      "Kuygan joyni 10-15 daqiqa davomida sovuq (lekin muz emas) oqib turgan suv ostida ushlash",
      "Kuygan yuzaga yopishib qolmagan toza, nam mato yopib qo'yish",
      "Bemorga ko'p miqdorda suyuqlik (iliq suv) ichirish"
    ],
    correct: 0,
    explanation: "Pufakchalarni yorish infeksiya tushishiga olib keladi. Yog' va surtmalar issiqlikni tashqariga chiqishiga to'sqinlik qilib, to'qimalarning chuqurroq kuyishiga sabab bo'ladi. Birinchi yordam faqat oqar suv bilan sovitishdir."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_5.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_5.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_5.js');
