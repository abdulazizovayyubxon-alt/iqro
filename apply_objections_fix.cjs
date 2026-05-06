const fs = require('fs');
const path = require('path');

const filePath = './src/data/questions_2.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Terminoligik va imloviy tuzatishlar
const fixes = [
  { from: /tetik/gi, to: 'tepki' },
  { from: /pashka/gi, to: 'mushka' },
  { from: /vairant/gi, to: 'variant' },
  { from: /izhoda/gi, to: 'izohda' },
  { from: /nay\s+nay/gi, to: 'nay' },
  { from: /orin\s+o'lchami/gi, to: "o'qning o'lchami" },
  { from: /Shchyoloch/gi, to: 'Ishqor (Shchyoloch)' },
  { from: /AK\s+patronining/g, to: 'AK-74 patronining' },
  { from: /AKM\s+kalibri/g, to: 'AKM-7.62 kalibri' },
  { from: /AK\s+o'q\s+tezligi/g, to: "AK-74 o'qining boshlang'ich tezligi" }
];

fixes.forEach(f => {
  content = content.replace(f.from, f.to);
});

// 2. Dublikatlarni tozalash (Deep cleanup)
const arrayMatch = content.match(/\[([\s\S]*)\]\s*;/);
if (arrayMatch) {
  const arrayContent = arrayMatch[1];
  const questions = [];
  let depth = 0, start = -1;
  for (let i = 0; i < arrayContent.length; i++) {
    if (arrayContent[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (arrayContent[i] === '}') { depth--; if (depth === 0 && start !== -1) { questions.push(arrayContent.substring(start, i + 1)); start = -1; } }
  }

  const seen = new Set();
  const uniqueQs = [];
  questions.forEach(qStr => {
    const qMatch = qStr.match(/q:\s*[`"]([\s\S]*?)[`"]/);
    if (qMatch) {
      let qText = qMatch[1].trim().replace(/\s+/g, ' ');
      if (!seen.has(qText)) {
        seen.add(qText);
        uniqueQs.push(qStr);
      }
    }
  });

  // 3. Yangi 10 ta masofa formulasi savollarini qo'shish
  const results = [
    { n: "0.5", d: "3600" },
    { n: "0.6", d: "3000" },
    { n: "0.9", d: "2000" },
    { n: "1.0", d: "1800" },
    { n: "1.2", d: "1500" },
    { n: "1.5", d: "1200" },
    { n: "1.8", d: "1000" },
    { n: "2.0", d: "900" },
    { n: "3.0", d: "600" },
    { n: "4.5", d: "400" }
  ];

  results.forEach(res => {
    const newQ = `  {
    q: \`Askarning bo‘yi orqali masofani aniqlash (1.8 : 1000 formula bo‘yicha): Agar natija ${res.n} bo‘lsa, masofa qancha?\`,
    opts: ["${res.d} metr", "${parseInt(res.d)+200} metr", "${parseInt(res.d)-200} metr", "${parseInt(res.d)*2} metr"],
    correct: 0,
    explanation: "Formula: (1.8 * 1000) / ${res.n} = ${res.d} metr. Merganlik formulasining asosi hisoblanadi."
  }`;
    uniqueQs.push(newQ);
  });

  const exportName = content.match(/export const (\w+)\s*=/)[1];
  const newContent = `export const ${exportName} = [\n${uniqueQs.join(',\n')}\n];\n`;
  fs.writeFileSync(filePath, newContent, 'utf8');
}

// 4. Update mockData.js counts
const mockDataPath = './src/data/mockData.js';
let mockData = fs.readFileSync(mockDataPath, 'utf8');
const finalCount = content.match(/\{/g).length; // Rough count for update script to refine
console.log('Fixed objections and added 10 new formula questions.');
