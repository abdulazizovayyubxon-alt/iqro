import fs from 'node:fs';
import path from 'node:path';

const SUBJECTS = [
  'matematika',
  'tarbiya',
  'pedmahorat',
  'fizika',
  'texnologiya_dizayn',
  'texnologiya_servis'
];

function normText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[`‘’ʻʼ']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\(#\d+\)/g, '')
    .trim();
}

function getTokens(str) {
  return normText(str).split(/[^a-z0-9_']+/).filter(w => w.length > 2);
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

console.log('================================================================');
console.log('       FAN 4 — 6 TA FAN SIFAT VA DUBLIKATLAR AUDITI             ');
console.log('================================================================\n');

const summary = {};

for (const sub of SUBJECTS) {
  const filePath = path.join('fan 4/_app', `${sub}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fayl topilmadi: ${filePath}`);
    continue;
  }
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Dublikatlar
  const exactDupsMap = new Map();
  const internalDupOpts = [];
  const nearDups = [];

  // 2. Ajralib qolish (Giveaways)
  let longestCount = 0;
  let shortestCount = 0;
  let ratio125Count = 0;
  let ratio120Count = 0;
  let ratio115Count = 0;
  let diffAbove25Count = 0;
  let diffBelowMinus20Count = 0;
  let allAboveCount = 0;
  let punctuationMismatchCount = 0;
  let absoluteTrapDistractors = 0;

  const flagList = [];

  const tokenList = questions.map(q => getTokens(q.q));

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    const qId = q.docId || q.id;
    const cleanQ = normText(q.q);

    // a) Exact dup
    if (exactDupsMap.has(cleanQ)) {
      exactDupsMap.get(cleanQ).push(qId);
    } else {
      exactDupsMap.set(cleanQ, [qId]);
    }

    // b) Internal duplicate options
    const optNorms = q.opts.map(normText);
    if (new Set(optNorms).size !== 4) {
      internalDupOpts.push({ id: qId, opts: q.opts });
    }

    // c) Length analysis
    const cIdx = q.correct;
    const cLen = q.opts[cIdx].length;
    const distLens = q.opts.filter((_, i) => i !== cIdx).map(o => o.length);
    const avgDistLen = distLens.reduce((a, b) => a + b, 0) / 3;
    const maxDistLen = Math.max(...distLens);
    const minDistLen = Math.min(...distLens);
    const allLens = q.opts.map(o => o.length);
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

    // d) 'Barchasi to'g'ri' yoki 'Hamma javob to'g'ri'
    const cText = q.opts[cIdx].toLowerCase();
    if (/(barcha|hamma|yuqoridagi).*to'g'ri/i.test(cText) || /barchasi to'g'ri/i.test(cText)) {
      allAboveCount++;
    }

    // e) Punctuation mismatch
    const cDot = q.opts[cIdx].trim().endsWith('.');
    const dDots = q.opts.filter((_, i) => i !== cIdx).map(o => o.trim().endsWith('.'));
    if (cDot && dDots.every(d => !d)) punctuationMismatchCount++;
    if (!cDot && dDots.every(d => d)) punctuationMismatchCount++;

    // f) Absolute trap words in distractors only
    const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi|nolga teng)\b/i;
    const distTrapCount = q.opts.filter((_, i) => i !== cIdx).filter(o => trapRegex.test(o)).length;
    if (distTrapCount >= 2 && !trapRegex.test(q.opts[cIdx])) {
      absoluteTrapDistractors++;
    }

    // Flag for detailed inspection if it stands out severely
    let standOutReasons = [];
    if (ratio > 1.20) standOutReasons.push(`uzunlik ratio ${ratio.toFixed(2)}x`);
    if (cLen - maxDistLen > 30) standOutReasons.push(`distraktordan +${cLen - maxDistLen} belgi uzun`);
    if (minDistLen - cLen > 25) standOutReasons.push(`distraktordan -${minDistLen - cLen} belgi qisqa`);
    if (distTrapCount >= 3) standOutReasons.push(`3 ta chalg'ituvchida sun'iy 'mutlaqo/faqat' so'zlari`);

    if (standOutReasons.length > 0) {
      flagList.push({
        id: qId,
        q: q.q,
        correctText: q.opts[cIdx],
        reasons: standOutReasons
      });
    }
  }

  // Check near duplicates (samples of adjacent or random)
  const dupGroups = Array.from(exactDupsMap.entries()).filter(([_, ids]) => ids.length > 1);

  summary[sub] = {
    total: questions.length,
    exactDupGroups: dupGroups.length,
    extraDupCount: dupGroups.reduce((s, [_, ids]) => s + ids.length - 1, 0),
    internalDupOpts: internalDupOpts.length,
    longestPct: (longestCount / questions.length * 100).toFixed(1),
    shortestPct: (shortestCount / questions.length * 100).toFixed(1),
    ratio125Count,
    ratio120Count,
    ratio115Count,
    diffAbove25Count,
    diffBelowMinus20Count,
    allAboveCount,
    punctuationMismatchCount,
    absoluteTrapDistractors,
    severeStandOutCount: flagList.length
  };

  console.log(`📘 【${sub.toUpperCase()}】 — Jami ${questions.length} ta savol`);
  console.log(`   1. Dublikatlar tahlili:`);
  console.log(`      - Aniq matni bir xil dublikatlar: ${dupGroups.length} ta guruh (${summary[sub].extraDupCount} ta ortiqcha)`);
  console.log(`      - Bitta savol ichida bir xil variantlar: ${internalDupOpts.length} ta`);
  console.log(`   2. To'g'ri javobning ajralib qolishi (Stand-out / Giveaway):`);
  console.log(`      - To'g'ri javob ENG UZUN variant: ${longestCount} ta (${summary[sub].longestPct}%) [kutilgan me'yor: ~25-35%]`);
  console.log(`      - To'g'ri javob ENG QISQA variant: ${shortestCount} ta (${summary[sub].shortestPct}%) [kutilgan me'yor: ~25-35%]`);
  console.log(`      - Ratio > 1.25x (chalg'ituvchilar o'rtachasidan 25%+ uzun): ${ratio125Count} ta`);
  console.log(`      - Ratio > 1.20x (20%+ uzun): ${ratio120Count} ta`);
  console.log(`      - Ratio > 1.15x (15%+ uzun): ${ratio115Count} ta`);
  console.log(`      - Eng uzun chalg'ituvchidan 25+ belgi UZUN: ${diffAbove25Count} ta`);
  console.log(`      - Eng qisqa chalg'ituvchidan 20+ belgi QISQA: ${diffBelowMinus20Count} ta`);
  console.log(`      - 'Barchasi to'g'ri' / 'Hamma javob to'g'ri' kalitlari: ${allAboveCount} ta`);
  console.log(`      - Tinish belgisi mos kelmasligi: ${punctuationMismatchCount} ta`);
  console.log(`      - Chalg'ituvchilarda 2+ sun'iy qolip so'zlar (faqat/mutlaqo): ${absoluteTrapDistractors} ta`);
  console.log(`      - JAMI YAQIN/SEZILARLI AJRALIB TURUVCHILAR: ${flagList.length} ta (${(flagList.length / questions.length * 100).toFixed(1)}%)`);

  if (flagList.length > 0) {
    console.log(`   3. Namuna sifatida ajralib qolgan savollar (dastlabki 3 ta):`);
    flagList.slice(0, 3).forEach((item, i) => {
      console.log(`      [${i+1}] ID: ${item.id} — Sabab: ${item.reasons.join(', ')}`);
      console.log(`          Savol: "${item.q.slice(0, 90)}..."`);
      console.log(`          To'g'ri javob: "${item.correctText.slice(0, 90)}..."`);
    });
  }
  console.log('----------------------------------------------------------------\n');
}

// Xulosa jadvali
console.log('=== XULOSA JADVALI (6 TA FAN) ===');
console.table(summary);
