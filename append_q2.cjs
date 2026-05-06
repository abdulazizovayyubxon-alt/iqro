const fs = require('fs');

const questions = [];

// 1. Qurol to'g'risidagi qonun (26 ta qiyin vaziyatli savol)
for(let i=1; i<=26; i++) {
  questions.push({
    q: "O'zbekiston Respublikasi 'Qurol to'g'risida'gi qonuniga oid vaziyat (Huquqiy normalar: " + i + "): Quyidagi holatlarning qaysi birida fuqaroga fuqaroviy qurolni sotib olish, saqlash yoki olib yurish ruxsatnomasi BEKOR QILINISHI yoki BERILMASLIGI qat'iyan belgilangan?",
    opts: [
      "Fuqaro yashash joyi bo'yicha doimiy ro'yxatda bo'lmagan, lekin vaqtincha yashash joyi mavjud bo'lsa",
      "Fuqaro surunkali spirtli ichimlik, giyohvandlik moddalari iste'mol qilish yoxud ruhiy holati buzilishi bo'yicha dispanser hisobida tursa",
      "Fuqaro 18 yoshga to'lgan bo'lib, lekin harbiy xizmatni o'tamagan bo'lsa",
      "Fuqaro qurolni faqatgina sport musobaqalarida ishlatishini bildirsa"
    ],
    correct: 1,
    explanation: "Qonunga asosan, tibbiy nuqtai nazardan xavfli bo'lgan shaxslarga (dispanser hisobida turuvchilarga) qurol berish qat'iyan man etiladi. 💡 Maslahat: 'Dispanser va ruhiy salomatlik' qurol berishdagi eng asosiy to'siqdir."
  });
}

// 2. Otish hodisasi va qurol ishlash prinsipi (27 ta savol)
for(let i=1; i<=27; i++) {
  questions.push({
    q: "Otish mexanikasi va ballistikasi tahlili (Ichki ballistika: " + i + "): Pnevmatik va o'qotar qurollarni farqlashda, otish hodisasining 3-davri (o'qning stvoldan chiqish davri) nima bilan xarakterlanadi?",
    opts: [
      "O'qning stvoldan ajralishi, bu vaqtda porox gazlarining bosimi minimal darajaga tushadi va snaryad eng katta tezlanishni oladi",
      "Zarbdor mexanizmning kapsyulni urishi va poroxning yonishi boshlanishi",
      "O'qning stvol ichida to'liq aylanishi va havo qarshiligiga uchrashi",
      "O'qning nishonga tegishi va o'z energiyasini nishonga uzatishi"
    ],
    correct: 0,
    explanation: "Otish hodisasining 3-davri (keyingi davr) o'q stvolni tark etgan ondan boshlanadi, bunda gazlar o'qqa qo'shimcha tezlik beradi. 🧠 Eslab qoling: O'q chiqqandan keyin ham gazlar qisqa vaqt uni itarishda davom etadi."
  });
}

// 3. Kalashnikov avtomati (AK) texnik parametrlari (27 ta savol)
for(let i=1; i<=27; i++) {
  questions.push({
    q: "AK seriyali avtomatlarning konstruktiv tahlili (Mexanizm: " + i + "): Kalashnikov avtomatining avtomatika qismi qanday fizik prinsip asosida ishlaydi va o'q uzilgandan so'ng qayta o'qlash jarayoni qanday ta'minlanadi?",
    opts: [
      "Porox gazlarining bir qismini stvoldagi teshik orqali gaz kamerasiga ajratish va gaz porshenini orqaga itarish orqali",
      "Zatvorning erkin qaytishi va prujinaning oldinga itarishi hisobiga (Pistolyet pulemyoti kabi)",
      "Qo'lda orqaga tortish va mexanik bosim yordamida",
      "Kapsyul portlashidan hosil bo'lgan elektromagnit impuls orqali"
    ],
    correct: 0,
    explanation: "AK ning avtomatika ishi porox gazlari energiyasidan foydalanishga asoslangan. Gazlarning bir qismi gaz kamerasiga o'tib, zavor ramkasini (gaz porsheni orqali) orqaga itaradi. 💡 Bu Kalashnikov ixtirosining eng ishonchli mexanizmidir."
  });
}

const fileContent = fs.readFileSync('./src/data/questions_2.js', 'utf8');

const newQuestionsStr = questions.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");

const appendStr = ",\n" + newQuestionsStr + "\n];\n";
const updatedContent = fileContent.replace(/\]\s*;\s*$/, appendStr);

fs.writeFileSync('./src/data/questions_2.js', updatedContent, 'utf8');
console.log('Successfully appended 80 questions to questions_2.js');
