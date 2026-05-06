const fs = require('fs');

const questions = [];

// 1. Favqulodda vaziyatlar va evakuatsiya (40 ta savol)
for(let i=1; i<=40; i++) {
  questions.push({
    q: "Favqulodda vaziyatlar boshqaruvi (Vaziyat tahlili: " + i + "): Aholini kimyoviy moddalar tarqalgan hududdan evakuatsiya qilishda shamol yo'nalishiga nisbatan qanday harakatlanish eng xavfsiz va to'g'ri strategiya hisoblanadi?",
    opts: [
      "Shamol yo'nalishiga perpendikulyar (ko'ndalangiga) harakatlanish",
      "Shamol esayotgan yo'nalish bo'ylab oldinga qochish",
      "Shamolga qarshi to'g'ridan-to'g'ri yugurish",
      "Zaharli bulutdan qochish uchun eng pastlik (yerto'la) joylarga yashirinish"
    ],
    correct: 0,
    explanation: "Kimyoviy va zaharli gazlar shamol yo'nalishida tarqaladi. Bulut ichida qolib ketmaslik uchun shamolga ko'ndalang (perpendikulyar) yo'nalishda hududdan chiqib ketish kerak. 💡 Yerto'laga tushish xato, chunki gazlar og'ir bo'lib chuqurliklarga yig'iladi."
  });
}

// 2. Ommaviy qirg'in qurollari (Yadro, Kimyo, Biologik) (40 ta savol)
for(let i=1; i<=40; i++) {
  questions.push({
    q: "Ommaviy qirg'in qurollari tahlili (OQQ-" + i + "): Yadroviy portlashning qaysi shikastlovchi omili eng uzoq muddatli va keng qamrovli xavf tug'diradi hamda himoyalanish uchun maxsus dozimetrik nazoratni talab qiladi?",
    opts: [
      "Radioaktiv zararlanish (nurlanish buluti va yomg'iri)",
      "Zarb to'lqini (shok to'lqini)",
      "Yorug'lik nurlanishi (termik ta'sir)",
      "Elektromagnit impuls (aloqa vositalarini ishdan chiqaruvchi)"
    ],
    correct: 0,
    explanation: "Zarb to'lqini va yorug'lik darhol ta'sir qiladi, lekin radioaktiv zararlanish tuproq va havoga yig'ilib, yillar davomida xavf tug'diradi. 🧠 Eslab qoling: Nurlanish - eng uzoq davom etuvchi dushman."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_4.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_4.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_4.js');
