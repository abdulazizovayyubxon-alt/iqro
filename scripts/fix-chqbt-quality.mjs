import fs from 'node:fs';
import path from 'node:path';

const chqbtPath = 'src/data/questions_chqbt.json';
if (!fs.existsSync(chqbtPath)) {
  console.error('❌ Fayl topilmadi: ' + chqbtPath);
  process.exit(1);
}

const initialBak = 'src/data/questions_chqbt.bak-2026-09-14T03-55-27-811Z.json';
const list = JSON.parse(fs.readFileSync(fs.existsSync(initialBak) ? initialBak : chqbtPath, 'utf8'));
console.log(`📋 Jami ${list.length} ta savol yuklandi.`);

const stripLetter = (s) => String(s ?? '').replace(/^\s*[A-Da-d][).]\s*/, '').trim();

let strippedPrefixCount = 0;
let fixedTraps = 0;
let balancedLengthCount = 0;
let fixedAllAbove = 0;

const updatedList = list.map((q, idx) => {
  let opts = q.opts.map(o => {
    const s = stripLetter(o);
    if (s !== o) strippedPrefixCount++;
    return s;
  });

  let cIdx = q.correct;

  // Specific semantic fixes
  if (q.id === 'P8BPLUyrWvP4ukrSBgpq') {
    opts[cIdx] = "Harbiy xizmatchilar boshini to'g'riga qaratib, o'z oldiga tik qaraydilar.";
    fixedAllAbove++;
  }
  if (q.id === 'chqbt_oliy_052') {
    opts[cIdx] = "Soqchi qonun bilan qo'riqlanadigan daxlsiz shaxs bo'lib, barcha shaxslar unga so'zsiz bo'ysunadi hamda nizomda belgilangan hollarda qurol qo'llash huquqiga ega";
    fixedAllAbove++;
  }
  if (q.id === '2d62pvAy3jVN71EpZQ8b') {
    opts = [
      "Sport jamiyatlari va ixtiyoriy tashkilotlar",
      "Umumta'lim maktablari va ta'lim muassasalari",
      "Harbiy qismlar va maxsus o'quv markazlari",
      "Sog'liqni saqlash va tibbiy muassasalari"
    ];
  }
  if (q.id === 'McTmIOumzl4eDsZgoloU') {
    opts = [
      "Aynan 3.6 kg",
      "Aynan 3.3 kg",
      "Aynan 3.8 kg",
      "Aynan 4.1 kg"
    ];
  }

  // Clean traps in distractors
  opts = opts.map((opt, i) => {
    if (i === cIdx) return opt;
    if (/\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi)\b/i.test(opt)) {
      fixedTraps++;
      return opt
        .replace(/\bmutlaqo\b/gi, 'yetarlicha')
        .replace(/\bhech qachon\b/gi, 'kamdan-kam hollarda')
        .replace(/\bhech qanday\b/gi, 'yetarli')
        .replace(/\bfaqatgina\b/gi, "ko'proq")
        .replace(/\bhech qaysi\b/gi, 'muayyan')
        .trim();
    }
    return opt;
  });

  // Balance lengths
  let cLen = opts[cIdx].length;
  let distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
  let avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
  let maxDist = Math.max(...distLens);

  if (cLen / avgDist > 1.14 || cLen - maxDist > 10) {
    opts = opts.map((opt, i) => {
      if (i === cIdx) return opt;
      if (opt.length < cLen - 1) {
        let diff = cLen - opt.length;
        if (diff > 45) return opt + " bo'yicha belgilangan maxsus amaliy nizomiy talablar";
        if (diff > 30) return opt + " bo'yicha belgilangan amaliy nizomiy talablar";
        if (diff > 18) return opt + " bo'yicha belgilangan amaliy talab";
        if (diff > 10) return opt + " bo'yicha belgilangan tartib";
        if (diff > 5) return opt + " jarayoni";
        if (diff >= 2) return opt + " holati";
      }
      return opt;
    });
    balancedLengthCount++;
  }

  // Handle shortest
  distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
  let minDist = Math.min(...distLens);
  cLen = opts[cIdx].length;
  if (minDist - cLen > 20) {
    let diff = minDist - cLen;
    if (diff > 25) opts[cIdx] = opts[cIdx] + " bo'yicha belgilangan mezon";
    else opts[cIdx] = opts[cIdx] + " tartibida";
  }

  // Clean and balance keys exactly 25% A, B, C, D
  const targetKey = idx % 4;
  const newOpts = ['', '', '', ''];
  newOpts[targetKey] = opts[cIdx];
  let dIdx = 0;
  const otherOpts = opts.filter((_, i) => i !== cIdx);
  for (let i = 0; i < 4; i++) {
    if (i !== targetKey) {
      newOpts[i] = otherOpts[dIdx++];
    }
  }

  return {
    ...q,
    opts: newOpts,
    correct: targetKey
  };
});

fs.writeFileSync(chqbtPath, JSON.stringify(updatedList, null, 2) + '\n', 'utf8');

console.log(`\n✅ CHQBT fani to'liq muvaffaqiyatli yangilandi:`);
console.log(`   - Variantlardan olib tashlangan harf prefikslari (A/B/C/D): ${strippedPrefixCount} ta`);
console.log(`   - Uzunligi muvozanatlashtirilgan savollar: ${balancedLengthCount} ta`);
console.log(`   - Tozalangan sun'iy trap so'zlar: ${fixedTraps} ta`);
console.log(`   - 'Barchasi to'g'ri' kalitlari tuzatildi: ${fixedAllAbove} ta`);
console.log(`   - Kalitlar balansi: aynan 25% A, 25% B, 25% C, 25% D`);
