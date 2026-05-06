/**
 * Barcha savol fayllarini skanerlaydi va buzilgan (corrupted) matnli
 * savollarni topadi. Buzilgan deb hisoblanadi:
 * 1. Savol matni 30+ belgidan iborat bo'sh joysiz so'z saqlasa
 * 2. Javob variantlarida 25+ belgidan iborat bo'sh joysiz so'z bo'lsa
 * 3. Matnda takrorlanuvchi harf ketma-ketliklari bo'lsa (masalan "yyyyy", "qqqqq")
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');
const FILES = [
  'questions_0.js',
  'questions_1.js',
  'questions_2.js',
  'questions_3.js',
  'questions_4.js',
  'questions_5.js',
  'questions_6.js',
];

function isCorrupted(text) {
  if (!text || typeof text !== 'string') return false;
  
  // 1. Juda uzun so'zlar (30+ belgi bo'sh joysiz) — odatda buzilgan
  const words = text.split(/\s+/);
  for (const w of words) {
    // URL va formulalarni hisobga olmaymiz
    if (w.startsWith('http') || w.startsWith('www')) continue;
    if (w.length > 40) return true;
  }
  
  // 2. Takrorlanuvchi harflar (4+ ketma-ket bir xil harf)
  if (/(.)\1{4,}/i.test(text)) return true;
  
  // 3. Juda ko'p ketma-ket undosh harflar (8+) — o'zbek tilida bo'lmaydi
  if (/[bcdfghjklmnpqrstvwxyz]{8,}/i.test(text)) return true;
  
  // 4. Juda ko'p ketma-ket unli harflar (6+) — o'zbek tilida bo'lmaydi
  if (/[aeiou]{6,}/i.test(text)) return true;
  
  // 5. Matnda harflar random aralashgan (entropy yuqori)
  // Har bir so'zda 3+ xil harf ketma-ketligini tekshiramiz
  for (const w of words) {
    if (w.length > 20) {
      // Har 3 belgidan birida takrorlanish bo'lsa
      let repeats = 0;
      for (let i = 0; i < w.length - 2; i++) {
        if (w[i] === w[i+1] && w[i+1] === w[i+2]) repeats++;
      }
      if (repeats > 3) return true;
    }
  }
  
  return false;
}

function findCorruptedInFile(filename) {
  const filepath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  
  const corrupted = [];
  
  // Har bir savolni topish uchun regex
  // Savol strukturasi: { q: "...", opts: [...], correct: N, ... }
  const qRegex = /q:\s*["`]([^"`]*)["`]/g;
  const optRegex = /opts:\s*\[([^\]]*)\]/g;
  
  let match;
  let lineNum = 0;
  
  // Oddiy usul — har bir qatorni ko'rib chiqish
  let currentQ = null;
  let currentQLine = 0;
  let currentOpts = [];
  let insideQ = false;
  let qText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    
    // Savol boshlanishi
    const qMatch = line.match(/q:\s*["'`](.*)$/);
    if (qMatch) {
      currentQLine = lineNo;
      qText = qMatch[1];
      // Agar bir qatorda tugasa
      if (qText.endsWith('"') || qText.endsWith("'") || qText.endsWith('`')) {
        qText = qText.slice(0, -1);
        // Savolni tekshirish
        if (isCorrupted(qText)) {
          corrupted.push({
            line: currentQLine,
            type: 'SAVOL',
            text: qText.substring(0, 100) + (qText.length > 100 ? '...' : ''),
            fullText: qText
          });
        }
      } else {
        // Ko'p qatorli savol — keyingi qatorlarda davom etadi
        insideQ = true;
      }
      continue;
    }
    
    if (insideQ) {
      if (line.includes('",') || line.includes("',") || line.includes('`,')) {
        qText += ' ' + line.replace(/["'`],?\s*$/, '').trim();
        insideQ = false;
        if (isCorrupted(qText)) {
          corrupted.push({
            line: currentQLine,
            type: 'SAVOL',
            text: qText.substring(0, 100) + (qText.length > 100 ? '...' : ''),
            fullText: qText
          });
        }
      } else {
        qText += ' ' + line.trim();
      }
      continue;
    }
    
    // Variantlarni tekshirish
    const optsMatch = line.match(/opts:\s*\[(.*)\]/);
    if (optsMatch) {
      const optsStr = optsMatch[1];
      const opts = optsStr.split(/",\s*"/).map(o => o.replace(/^["']|["']$/g, ''));
      for (const opt of opts) {
        if (isCorrupted(opt)) {
          corrupted.push({
            line: lineNo,
            type: 'VARIANT',
            text: opt.substring(0, 80) + (opt.length > 80 ? '...' : ''),
            fullText: opt
          });
        }
      }
    }
    
    // Explanation tekshirish
    const expMatch = line.match(/explanation:\s*["'`](.*)["'`]/);
    if (expMatch && isCorrupted(expMatch[1])) {
      corrupted.push({
        line: lineNo,
        type: 'TUSHUNTIRISH',
        text: expMatch[1].substring(0, 80) + '...',
        fullText: expMatch[1]
      });
    }
  }
  
  return corrupted;
}

// ===== ASOSIY ISHGA TUSHIRISH =====
console.log('=' .repeat(70));
console.log('CHQBT PLATFORMA — BUZILGAN SAVOLLARNI QIDIRISH');
console.log('=' .repeat(70));

let totalCorrupted = 0;

for (const file of FILES) {
  const filepath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filepath)) {
    console.log(`\n⚠️  ${file} — FAYL TOPILMADI`);
    continue;
  }
  
  const results = findCorruptedInFile(file);
  
  if (results.length === 0) {
    console.log(`\n✅ ${file} — buzilgan savol topilmadi`);
  } else {
    console.log(`\n🔴 ${file} — ${results.length} ta buzilgan element topildi:`);
    for (const r of results) {
      console.log(`   Qator ${r.line} [${r.type}]: ${r.text}`);
      totalCorrupted++;
    }
  }
}

console.log('\n' + '=' .repeat(70));
console.log(`JAMI: ${totalCorrupted} ta buzilgan element topildi`);
console.log('=' .repeat(70));
