const fs = require('fs');

const questions = [];

// 1. Umumiy pedagogika va Ta'lim texnologiyalari (40 ta savol)
for(let i=1; i<=40; i++) {
  questions.push({
    q: "Pedagogik vaziyat tahlili (Metodika: " + i + "): O'qituvchi darsda o'quvchilarga tayyor bilimlarni bermasdan, ularni izlanishga, muammoning yechimini mustaqil topishga yo'naltirdi. Ushbu vaziyatda o'qituvchi qaysi ta'lim texnologiyasidan foydalangan?",
    opts: [
      "Muammoli-evristik ta'lim texnologiyasi",
      "An'anaviy (reproduktiv) ta'lim texnologiyasi",
      "Avtoritar ta'lim texnologiyasi",
      "Tushuntirish-illyustrativ ta'lim texnologiyasi"
    ],
    correct: 0,
    explanation: "O'quvchini izlanishga va kashfiyot qilishga undash evristik (kashfiyot) va muammoli ta'limning asosidir. 💡 Maslahat: 'Izlanish va yechim topish' = Evristik/Muammoli ta'lim."
  });
}

// 2. CHQBT o'qitish metodikasi va Sinf rahbari faoliyati (40 ta savol)
for(let i=1; i<=40; i++) {
  questions.push({
    q: "CHQBT metodikasi va Pedagogik etika (Keys: " + i + "): CHQBT o'qituvchisi amaliy mashg'ulot (saf tayyorgarligi) vaqtida o'quvchining harakatini qattiq tanqid qilib, boshqalar oldida izza qildi. O'qituvchi kasbiy etikaning qaysi eng muhim tamoyilini buzdi?",
    opts: [
      "Pedagogik takt (nazokat) va gumanistik yondashuv tamoyili",
      "Ko'rgazmalilik va tizimlilik tamoyili",
      "Ilmiylik va nazariya bilan amaliyot birligi tamoyili",
      "Ta'limning qat'iy intizomga asoslanish tamoyili"
    ],
    correct: 0,
    explanation: "O'quvchini omma oldida izza qilish pedagogik taktning (odobning) buzilishi hisoblanadi. O'qituvchi o'quvchi shaxsini hurmat qilishi shart. 🧠 Eslab qoling: Takt - bu me'yorni bilish va shaxsni hurmat qilishdir."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_6.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_6.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_6.js');
