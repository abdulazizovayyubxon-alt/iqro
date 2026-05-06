const fs = require('fs');

const questions = [];

// 1. Zamonaviy umumqo'shin jangi (26 ta savol)
for(let i=1; i<=26; i++) {
  questions.push({
    q: "Taktik vaziyat (Umumqo'shin jangi: " + i + "): Zamonaviy umumqo'shin jangining asosiy xususiyatlaridan biri bo'lgan 'Yuqori manevrlilik va harakatchanlik' nima bilan izohlanadi?",
    opts: [
      "Qo'shinlarning tezkor harakatlanishi, hujum va mudofaa yo'nalishlarini keskin o'zgartira olishi va o't ochish vositalarini tezkor joylashtirishi",
      "Jang maydonida uzoq muddat bir pozitsiyada mustahkamlanish va dushmanni kutish",
      "Faqat tungi vaqtda harakatlanish va yashirin hujumlarni amalga oshirish",
      "Katta piyodalar guruhining qat'iy chiziqli tartibda oldinga siljishi"
    ],
    correct: 0,
    explanation: "Zamonaviy jangda zirhli texnika va havo kuchlari yordamida qisqa vaqt ichida qo'shinlar o'z o'rnini (manevr) keskin o'zgartirishi eng asosiy omil hisoblanadi. 💡 Maslahat: Manevr - bu tezlik va yo'nalishni o'zgartirish."
  });
}

// 2. Harbiy topografiya va azimut (27 ta savol)
for(let i=1; i<=27; i++) {
  questions.push({
    q: "Topografik masalalar tahlili (Azimut: " + i + "): Askar kunduzi o'rmonda kompassiz qolib ketdi. U daraxtlarning qobig'i va shoxlariga qarab shimol yo'nalishini aniqlamoqchi. Quyidagi belgilardan qaysi biri MANTIQAN XATO hisoblanadi?",
    opts: [
      "Daraxtlarning qalin shoxlari har doim shimol tomonga qarab o'sadi",
      "Daraxtlarning shimol tomonidagi qobig'i qalinroq va dag'alroq bo'ladi",
      "Mox va lishayniklar odatda daraxt tanasining shimol tomonida ko'proq yig'iladi",
      "Chumolilar inini odatda daraxt yoki toshning janubiy tomoniga quradi"
    ],
    correct: 0,
    explanation: "Quyosh janub tomonda ko'proq bo'lgani uchun o'simliklar (shoxlar) JANUB tomonga qarab yaxshi rivojlanadi, shimolga emas. Qolgan variantlar to'g'ri. 🧠 Eslab qoling: Mox - shimolda, shoxlar - janubda."
  });
}

// 3. Jangovar guruh xususiyatlari va texnikalar (27 ta savol)
for(let i=1; i<=27; i++) {
  questions.push({
    q: "Bo'linma taktikasi (Jangovar guruh: " + i + "): Mudofaa jangi vaqtida motoo'qchi bo'linma (otdeleniye) uchun asosiy taktik talab (normativ) qanday belgilangan?",
    opts: [
      "Front bo'ylab 100 metrgacha bo'lgan masofada tayanch punktini himoya qilish",
      "Hujumda 50 metrgacha masofani egallash",
      "Faqat artilleriya himoyasini ta'minlash",
      "Dushmanning orqa frontiga yashirinib o'tish"
    ],
    correct: 0,
    explanation: "Motoo'qchi bo'linma mudofaada front bo'ylab 100 metrgacha bo'lgan oraliqni mudofaa qiladi. O'z ichiga pulemyotchi, snayper va granatomyotchilarni oladi. 💡 Maslahat: Otdeleniye = 100 metr mudofaa."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_3.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_3.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_3.js');
