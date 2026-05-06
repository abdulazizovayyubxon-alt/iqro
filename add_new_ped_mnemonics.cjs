const fs = require('fs');
const path = require('path');

const newMnemonics = [
  {
    q: "MOSLASHTIRING. Pedagogik takt va uning xususiyatlarini to'g'ri moslang.",
    mnemonic: "🤝 TAKT = T-A-K-T: Tushunish, Axloq, Kishilik, Toqat. (O'quvchi bilan to'g'ri muloqot formulasi)."
  },
  {
    q: "Inkluziv ta'limнинг asosiy maqsadi nima?",
    mnemonic: "🌍 INKLUZIV = IN (ichida) + KLUZIV (yopish/birlashtirish). Hammani bir xonada birlashtirish."
  },
  {
    q: "MOSLASHTIRING. Ta'lim tamoyillarini ularning mohiyati bilan moslang.",
    mnemonic: "📐 K-T-T: Ko'rgazmali, Tushunarli, Tizimli. (Darsning 3 ta oltin qoidasi)."
  },
  {
    q: "Pedagogik 'diagnostika' nima uchun o'tkaziladi?",
    mnemonic: "🩺 Diagnostika = Shifokor kabi. Avval muammoni aniqlaymiz (diagnoz), keyin ta'lim beramiz (davolaymiz)."
  },
  {
    q: "MOSLASHTIRING. Baholash turlarini moslang.",
    mnemonic: "📊 D-F-S zanjiri: Diagnostik (boshida), Formativ (jarayonda), Summativ (yakuniy)."
  },
  {
    q: "MOSLASHTIRING. Pedagogik texnologiyalar va ularning afzalliklarini mos holatda juftlang.",
    mnemonic: "💡 Muammoli = Mantiq (M-M), Interfaol = Faoliyat (I-F). Hammasi harfga bog'liq!"
  },
  {
    q: "O'quvchining 'perseptiv' qobiliyati deganda nima tushuniladi?",
    mnemonic: "👁️ Perseptiv = 'Perceive' (his qilish). O'quvchining ko'zidan holatini bilish san'ati."
  }
];

const filePath = './src/data/questions_6.js';
let content = fs.readFileSync(filePath, 'utf8');

newMnemonics.forEach(m => {
  // We need to match the question specifically. 
  // Since some questions use template literals `...` and others use quotes "...", we handle both.
  const escapedQ = m.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(q:\\s*[\`"]${escapedQ}[\`"][\\s\\S]*?explanation:\\s*[\`"][\\s\\S]*?[\`"])`, 'g');
  
  content = content.replace(regex, `$1,\n    mnemonic: "${m.mnemonic}"`);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Added mnemonics to new pedagogical questions.`);
