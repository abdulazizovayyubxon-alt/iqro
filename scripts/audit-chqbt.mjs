import fs from 'node:fs';
import path from 'node:path';

const chqbtPath = 'src/data/questions_chqbt.json';
if (!fs.existsSync(chqbtPath)) {
  console.error('❌ Fayl topilmadi: ' + chqbtPath);
  process.exit(1);
}

const list = JSON.parse(fs.readFileSync(chqbtPath, 'utf8'));

function normText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[`‘’ʻʼ']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\(#\d+\)/g, '')
    .trim();
}

console.log(`\n================================================================`);
console.log(`🔍 CHQBT FANI AUDITI (Jami: ${list.length} ta savol)`);
console.log(`================================================================\n`);

// 1. Dublikatlar
const stemsMap = new Map();
const internalDupOpts = [];
let validQuestions = 0;
let invalidSchema = 0;

// 2. Kalit va uzunlik
let keyDist = [0, 0, 0, 0];
let longestCount = 0;
let shortestCount = 0;
let ratio125Count = 0;
let ratio120Count = 0;
let ratio115Count = 0;
let diffAbove25Count = 0;
let diffBelowMinus20Count = 0;
let allAboveCount = 0;
let absoluteTrapDistractors = 0;

const flagSamples = [];

for (let i = 0; i < list.length; i++) {
  const q = list[i];
  const qId = q.id || q.docId || `idx_${i}`;

  if (!q.q || !Array.isArray(q.opts) || q.opts.length !== 4 || typeof q.correct !== 'number') {
    invalidSchema++;
    continue;
  }
  validQuestions++;

  // a) Stems
  const stem = normText(q.q);
  if (!stemsMap.has(stem)) stemsMap.set(stem, []);
  stemsMap.get(stem).push(qId);

  // b) Internal dups
  const optSet = new Set(q.opts.map(o => normText(o)));
  if (optSet.size < q.opts.length) {
    internalDupOpts.push({ id: qId, q: q.q, opts: q.opts });
  }

  // c) Key distribution
  if (q.correct >= 0 && q.correct <= 3) {
    keyDist[q.correct]++;
  }

  // d) Length giveaway
  const cIdx = q.correct;
  const cLen = (q.opts[cIdx] || '').length;
  const distLens = q.opts.filter((_, idx) => idx !== cIdx).map(o => (o || '').length);
  const avgDistLen = distLens.reduce((a, b) => a + b, 0) / (distLens.length || 1);
  const maxDistLen = Math.max(...distLens);
  const minDistLen = Math.min(...distLens);
  const allLens = q.opts.map(o => (o || '').length);
  const maxLen = Math.max(...allLens);
  const minLen = Math.min(...allLens);

  if (cLen === maxLen) longestCount++;
  if (cLen === minLen) shortestCount++;

  const ratio = cLen / (avgDistLen || 1);
  if (ratio > 1.25) ratio125Count++;
  if (ratio > 1.20) ratio120Count++;
  if (ratio > 1.15) ratio115Count++;
  if (cLen - maxDistLen > 25) diffAbove25Count++;
  if (minDistLen - cLen > 20) diffBelowMinus20Count++;

  // e) 'Barchasi to'g'ri' / 'Hamma javob to'g'ri'
  const cText = (q.opts[cIdx] || '').toLowerCase();
  if (/(barcha|hamma|yuqoridagi).*to'g'ri/i.test(cText) || /barchasi to'g'ri/i.test(cText)) {
    allAboveCount++;
  }

  // f) Traps
  const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi)\b/i;
  const distTrapCount = q.opts.filter((_, idx) => idx !== cIdx).filter(o => trapRegex.test(o)).length;
  if (distTrapCount >= 2 && !trapRegex.test(q.opts[cIdx])) {
    absoluteTrapDistractors++;
  }

  let reasons = [];
  if (ratio > 1.25) reasons.push(`uzunlik ratio ${ratio.toFixed(2)}x (>1.25x)`);
  if (cLen - maxDistLen > 30) reasons.push(`to'g'ri javob distraktordan +${cLen - maxDistLen} belgi uzun`);
  if (distTrapCount >= 2 && !trapRegex.test(q.opts[cIdx])) reasons.push(`chalg'ituvchilarda 2+ 'faqat/mutlaqo' traplari`);
  if (/(barcha|hamma|yuqoridagi).*to'g'ri/i.test(cText)) reasons.push(`'Barchasi to'g'ri' kaliti`);

  if (reasons.length > 0 && flagSamples.length < 5) {
    flagSamples.push({ id: qId, q: q.q, correct: q.opts[cIdx], reasons });
  }
}

const dupGroups = Array.from(stemsMap.entries()).filter(([_, ids]) => ids.length > 1);
const extraDups = dupGroups.reduce((s, [_, ids]) => s + ids.length - 1, 0);

console.log(`1. DUBLIKATLAR VA STRUKTURA:`);
console.log(`   - To'g'ri formatdagi savollar: ${validQuestions} ta`);
console.log(`   - Noto'g'ri formatdagi savollar: ${invalidSchema} ta`);
console.log(`   - Matni bir xil takror savollar guruhi: ${dupGroups.length} ta guruh (ortiqcha: ${extraDups} ta savol)`);
console.log(`   - Bitta savol ichida bir xil variantlar: ${internalDupOpts.length} ta`);

console.log(`\n2. TO'G'RI JAVOBNING AJRALIB QOLISHI (GIVEAWAY):`);
console.log(`   - To'g'ri javob eng uzun variant bo'lgan: ${longestCount} ta (${(longestCount / validQuestions * 100).toFixed(1)}%) [me'yor: ~25-35%]`);
console.log(`   - To'g'ri javob eng qisqa variant bo'lgan: ${shortestCount} ta (${(shortestCount / validQuestions * 100).toFixed(1)}%) [me'yor: ~25-35%]`);
console.log(`   - Ratio > 1.25x (chalg'ituvchilar o'rtachasidan 25%+ uzun): ${ratio125Count} ta (${(ratio125Count / validQuestions * 100).toFixed(1)}%)`);
console.log(`   - Ratio > 1.20x (20%+ uzun): ${ratio120Count} ta (${(ratio120Count / validQuestions * 100).toFixed(1)}%)`);
console.log(`   - Eng uzun chalg'ituvchidan 25+ belgi UZUN: ${diffAbove25Count} ta`);
console.log(`   - 'Barchasi to'g'ri' / 'Hamma javob to'g'ri' kalitlari: ${allAboveCount} ta`);
console.log(`   - Chalg'ituvchilarda sun'iy trap so'zlar: ${absoluteTrapDistractors} ta`);

console.log(`\n3. KALITLAR TAQSIMOTI (A/B/C/D):`);
console.log(`   - A: ${keyDist[0]} (${(keyDist[0]/validQuestions*100).toFixed(1)}%)`);
console.log(`   - B: ${keyDist[1]} (${(keyDist[1]/validQuestions*100).toFixed(1)}%)`);
console.log(`   - C: ${keyDist[2]} (${(keyDist[2]/validQuestions*100).toFixed(1)}%)`);
console.log(`   - D: ${keyDist[3]} (${(keyDist[3]/validQuestions*100).toFixed(1)}%)`);

if (flagSamples.length > 0) {
  console.log(`\n4. AJRALIB QOLGAN SAVOLLAR NAMUNALARI:`);
  flagSamples.forEach((f, idx) => {
    console.log(`   [${idx+1}] ID: ${f.id} — ${f.reasons.join(', ')}`);
    console.log(`       Savol: "${f.q.slice(0, 90)}..."`);
    console.log(`       To'g'ri javob: "${f.correct.slice(0, 90)}..."`);
  });
}
console.log(`\n================================================================\n`);
