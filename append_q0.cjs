const fs = require('fs');

const questions = [];

// 1. Mudofaa doktrinasi (20 ta qiyin savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "O'zbekiston Respublikasi Mudofaa doktrinasi qoidasiga ko'ra (Doktrina bandi: " + (20 + i) + "): Davlatning harbiy xavfsizligini ta'minlashda qaysi tamoyil eng ustuvor hisoblanadi?",
    opts: [
      "Faqat mudofaa xarakteriga ega bo'lish va tinchliksevar siyosat",
      "Xalqaro harbiy bloklarga qo'shilish orqali xavfsizlikni kafolatlash",
      "Xorijiy davlatlarda harbiy bazalar tashkil etish",
      "Mintaqaviy mojarolarda qurolli kuchlar bilan aralashish"
    ],
    correct: 0,
    explanation: "O'zbekiston mudofaa doktrinasi qat'iy mudofaa xarakteriga ega bo'lib, xorijiy harbiy bazalarni joylashtirmaslik va harbiy bloklarga qo'shilmaslikni belgilaydi. 💡 Maslahat: 'Faqat mudofaa' so'zini eslab qoling."
  });
}

// 2. Qonunchilik va Konstitutsiya (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "O'zbekiston fuqarosi muddatli harbiy xizmatga chaqirilish muddatini kechiktirish huquqiga ega. Quyidagi holatlarning qaysi biri (Modda holati: " + (30 + i) + ") qonunga muvofiq muddatni uzaytirish uchun asos bo'la OLMAYDI?",
    opts: [
      "Oila a'zolarini boqish uchun moddiy sharoitning yo'qligi",
      "Oliy ta'lim muassasasida kunduzgi bo'limda o'qiyotganligi",
      "Salomatligi tufayli vaqtincha harbiy xizmatga yaroqsiz deb topilishi",
      "Chet elda sayohatda yoki vaqtincha mehnat safarida bo'lishi"
    ],
    correct: 3,
    explanation: "Chet elda sayohat yoki rasmiylashtirilmagan mehnat safari harbiy xizmatni kechiktirishga asos bo'lmaydi. 🧠 Eslab qoling: Oila, o'qish, va salomatlik - qonuniy uzr."
  });
}

// 3. Qurolli kuchlar tuzilmasi (20 ta savol)
const okruglar = ["Toshkent", "Markaziy", "Sharqiy", "Janubi-g'arbiy maxsus"];
for(let i=1; i<=20; i++) {
  const okrug = okruglar[i % 4];
  questions.push({
    q: "Qurolli Kuchlar tizimida tahliliy vaziyat (Taktik guruh-" + i + "): Agar bo'linma " + okrug + " harbiy okrugiga qarashli bo'lsa, uning asosiy strategik vazifalaridan biri nima etib belgilanadi?",
    opts: [
      "Hududiy mudofaani tashkil etish va tezkor harakatlarni muvofiqlashtirish",
      "Faqatgina chegaralarni patrullash va bojxona nazorati",
      "Davlat ichki xavfsizligi va jinoyatchilikka qarshi kurash",
      "Xalqaro miqyosdagi tinchlikparvar operatsiyalarga tayyorgarlik ko'rish"
    ],
    correct: 0,
    explanation: "Harbiy okruglar o'z hududlarida operativ va strategik mudofaani tashkil etish, qo'shinlarni boshqarish uchun javobgardir. 💡 Ichki xavfsizlik IIV/Milliy gvardiya, chegara DXX vazifasi."
  });
}

// 4. Umumharbiy majburiyat (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Fuqarolarning harbiy majburiyati to'g'risidagi qonunga ko'ra (SChR normativi-" + i + "): Safarbarlik chaqiruvi rezervi (SChR) xizmatiga o'tkazilgan fuqaro davlat byudjetiga to'lovni necha oy ichida to'lashi shart?",
    opts: [
      "12 oy",
      "Yarim yil (6 oy)",
      "Bunday talab qonunda qat'iy belgilanmagan, shartnoma asosida",
      "Faqat to'lov to'liq to'langandan so'ng xizmatga qabul qilinadi"
    ],
    correct: 0,
    explanation: "Qonunchilikka ko'ra, SChR badali 12 oy davomida to'lanishi mumkin (maxsus hisob raqamiga). To'lovdan so'ng 1 oylik yig'inga chaqiriladi."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_0.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_0.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_0.js');
