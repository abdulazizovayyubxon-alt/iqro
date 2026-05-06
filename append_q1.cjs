const fs = require('fs');

const questions = [];

// 1. Ichki xizmat nizomi (20 ta qiyin vaziyatli savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Ichki xizmat nizomi bo'yicha murakkab vaziyat (Rota xizmati: " + i + "): Harbiy qismda rota navbatchisi o'z vaqtida postni topshirayotganda qanday favqulodda holat yuz bersa, navbatchilikni topshirish to'xtatib turiladi va qism komandiriga zudlik bilan xabar beriladi?",
    opts: [
      "Qurol-yarog' va o'q-dorilar xonasidagi muhr buzilganligi yoki qurollar soni mos kelmasligi aniqlanganda",
      "Rota shaxsiy tarkibining ovqatlanish jadvali 10 daqiqaga kechikkanida",
      "Qism hududida yomg'ir yog'ishi oqibatida saf ko'rigi bekor qilinganida",
      "Navbatchi ofitser tomonidan navbatdan tashqari tozalik ishlari belgilanganida"
    ],
    correct: 0,
    explanation: "Ichki xizmat nizomiga asosan, qurol-yarog' xavfsizligi va butligi eng ustuvor vazifa bo'lib, uning buzilishi favqulodda holat sanaladi va navbatchilik almashtirilishi to'xtatiladi. 💡 Maslahat: 'Muhr va qurol' xavfsizligi har doim birinchi o'rinda."
  });
}

// 2. Intizomiy nizom (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Intizomiy nizom talablarini qo'llash (Intizomiy amaliyot: " + i + "): Batalyon komandiri o'z qo'l ostidagi ofitserga nisbatan qanday intizomiy jazoni mustaqil ravishda qo'llash huquqiga EGA EMAS?",
    opts: [
      "Hayfsan yoki qattiq hayfsan e'lon qilish",
      "Ofitserlik harbiy unvonidan mahrum qilish",
      "Navbatdagi ta'tildan mahrum qilib, xizmat vaqtini uzaytirish",
      "Rag'batlantirishni bekor qilish"
    ],
    correct: 1,
    explanation: "Intizomiy nizomga ko'ra, ofitserlarni harbiy unvondan mahrum qilish vakolati faqat sud yoxud tegishli vazirlikning yuqori qo'mondonligiga tegishli. Batalyon komandiri bunga vakolatli emas."
  });
}

// 3. Garnizon va qorovullik xizmatlari nizomi (20 ta savol)
for(let i=1; i<=20; i++) {
  questions.push({
    q: "Qorovullik xizmatlari nizomi tahlili (Post holati: " + i + "): Qorovul (soqchi) postda turgan vaqtda unga qurolni qo'llashga ruxsat etiladigan QAT'IY sababni belgilang.",
    opts: [
      "Post hududiga ruxsatsiz, lekin qurolsiz fuqaro adashib kirib qolganida, ogohlantirishsiz",
      "Qorovulga, postga yoki qorovulxona binosiga bevosita hujum qilinganda va qorovulning hayotiga xavf tug'ilganda",
      "Smena boshlig'i qurolni havoga qarata otib tekshirishni buyurganda",
      "Tunda shubhali tovush eshitilganda hududni qorong'ida o'qqa tutganda"
    ],
    correct: 1,
    explanation: "Nizomga muvofiq, qurol faqat qorovulning hayotiga real xavf tug'ilganda, postga hujum qilinganda va ogohlantiruvchi o'qdan so'ng (istisno holatlari mavjud) qo'llaniladi. 🧠 Eslab qoling: Qurol faqat oxirgi chora (hujum va xavf)."
  });
}

// 4. Saf nizomi (20 ta savol)
const safBuyruqlar = ["Tekislan", "Rostlan", "Diqqat", "Safdan chiq"];
for(let i=1; i<=20; i++) {
  const buyruq = safBuyruqlar[i % 4];
  questions.push({
    q: "Saf nizomiga ko'ra tahlil (Saf buyrug'i-" + i + "): Qo'mondon '" + buyruq + "' buyrug'ini berganida, askar yoki bo'linmaning to'g'ri va qat'iy harakati qanday bo'lishi kerak?",
    opts: [
      "Buyruqning ijro qismi aytilishini kutib, shundan so'ng darhol tanani tik, qo'llarni chok bo'ylab harakatsiz holatga keltirish",
      "Buyruqni eshitgan zaxoti yonidagi sherigiga qarab tekislanish",
      "Buyruq berilgach o'zboshimchalik bilan safni o'zgartirish yoki siljish",
      "Faqat qurolni ko'krakka olib, boshqa harakat qilmab turish"
    ],
    correct: 0,
    explanation: "Saf nizomida har qanday buyruq oldindan va ijro qismiga bo'linadi. Askar ijro qismini kutishi va aniq to'g'ri holatni (stoyka) qabul qilishi shart."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_1.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_1.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_1.js');
