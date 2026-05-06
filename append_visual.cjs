const fs = require('fs');

// Fuqaro muhofazasi uchun (questions_4.js) - 30 ta savol
const q4 = [];

// Gaz niqobi (15 ta savol)
for(let i=1; i<=15; i++) {
  q4.push({
    q: "Vizual tuzilma tahlili (Gaz niqobi-" + i + "): Gaz niqobi chizmasida pastki qismda joylashgan, ifloslangan havoni tashqariga chiqarib yuboruvchi va shisha bug'lanishining oldini oluvchi muhim qism nima deb ataladi?",
    opts: [
      "Nafas chiqarish klapani uzeli",
      "So'zlashish moslamasi (Membrana)",
      "Filtr-yutuvchi quti",
      "Birlashtiruvchi gofra nayi"
    ],
    correct: 0,
    explanation: "Nafas chiqarish klapani (chizmada ko'pincha eng pastda 6-raqam bilan belgilanadi) ishlangan havoni tashqariga chiqarib yuboradi. 💡 Maslahat: U eng pastda bo'ladi, chunki ishlangan karbonat angidrid og'irroq."
  });
}

// Panagoh tuzilishi (15 ta savol)
const panagohQismlari = [
  { nom: "Shlyuz kamerasi (tambur)", vazifa: "zaharli havo ichkariga kirmasligi uchun asosiy va ichki germetik eshiklar o'rtasida bufer vazifasini o'taydi", raqam: "2" },
  { nom: "Filtr-ventilyatsiya kamerasi", vazifa: "tashqaridan olinayotgan havoni zaharli moddalardan tozalab, ichkariga toza havo yetkazib beradi", raqam: "6" },
  { nom: "Dizel elektrostansiyasi (DES)", vazifa: "markaziy elektr uzilganda panagohni avtonom elektr quvvati bilan ta'minlaydi", raqam: "9" },
  { nom: "Avariya chiqish yo'lagi", vazifa: "panagoh joylashgan bino qulab tushib, asosiy eshik to'silib qolganda xavfsiz chiqib ketishni ta'minlaydi", raqam: "5" }
];

for(let i=1; i<=15; i++) {
  const qism = panagohQismlari[i % 4];
  q4.push({
    q: "Mukammal panagoh (Bunker) sxemasi tahlili (Xona-" + qism.raqam + "): Chizmada odatda " + qism.raqam + "-raqam bilan ko'rsatiladigan qismning asosiy vazifasi — " + qism.vazifa + ". Bu qaysi bo'lim?",
    opts: [
      qism.nom,
      "Tibbiyot xonasi (izolyator)",
      "Oziq-ovqat saqlash ombori",
      "Odamlar joylashadigan asosiy xona"
    ],
    correct: 0,
    explanation: "Panagoh qat'iy muhandislik qoidalari asosida quriladi. " + qism.nom + " uning eng muhim hayotiy ta'minot qismlaridan biridir."
  });
}

const file4 = fs.readFileSync('./src/data/questions_4.js', 'utf8');
const q4Str = q4.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");
const updated4 = file4.replace(/\]\s*;\s*$/, ",\n" + q4Str + "\n];\n");
fs.writeFileSync('./src/data/questions_4.js', updated4, 'utf8');


// Harbiy xizmat asoslari uchun (questions_0.js) - 10 ta savol (Nishonlar)
const q0 = [];
const nishonlar = [
  { nom: "Artilleriya qo'shinlari", belgi: "ikkita kesishgan zambarak (to'p) tasviri" },
  { nom: "Havo-desant qo'shinlari", belgi: "ochilgan parashyut va uning ikki yonida qanotlar tasviri" },
  { nom: "Harbiy havo kuchlari", belgi: "parvona (propeller) va qanotlar tasviri" },
  { nom: "Umumqo'shin (Motoo'qchi)", belgi: "dafna yaproqlari bilan o'ralgan yulduz tasviri" }
];

for(let i=1; i<=10; i++) {
  const n = nishonlar[i % 4];
  q0.push({
    q: "Harbiy geraldika va nishonlar (Emblema-" + i + "): Qurolli Kuchlar harbiy xizmatchilarining kiyim-kechagida (yoqasida) " + n.belgi + " tushirilgan nishon (emblema) bo'lsa, bu harbiy xizmatchi qaysi qo'shin turiga mansubligini anglatadi?",
    opts: [
      n.nom,
      "Aloqa va radiotexnika qo'shinlari",
      "Muhandislik-sapyor qo'shinlari",
      "Kimyoviy himoya qo'shinlari"
    ],
    correct: 0,
    explanation: n.belgi + " aynan " + n.nom + " ramzi hisoblanadi. 💡 Buni vizual eslab qolish juda oson."
  });
}

const file0 = fs.readFileSync('./src/data/questions_0.js', 'utf8');
const q0Str = q0.map(q => {
  const optsStr = q.opts.map(o => '"' + o + '"').join(', ');
  return '  {\n    q: "' + q.q + '",\n    opts: [' + optsStr + '],\n    correct: ' + q.correct + ',\n    explanation: "' + q.explanation + '"\n  }';
}).join(",\n");
const updated0 = file0.replace(/\]\s*;\s*$/, ",\n" + q0Str + "\n];\n");
fs.writeFileSync('./src/data/questions_0.js', updated0, 'utf8');

console.log('Successfully appended visual questions.');
