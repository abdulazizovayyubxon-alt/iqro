import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('fan 4/_app/pedmahorat.json', 'utf8'));
const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi|nolga teng)\b/i;

const allAbove = [];
const highRatio = [];
const trapQuestions = [];

questions.forEach(q => {
  const cIdx = q.correct;
  const cLen = q.opts[cIdx].length;
  const distLens = q.opts.filter((_, i) => i !== cIdx).map(o => o.length);
  const avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
  const maxDist = Math.max(...distLens);
  const minDist = Math.min(...distLens);
  const ratio = cLen / avgDist;

  // 1. All above
  if (/(barcha|hamma|yuqoridagi).*to'g'ri/i.test(q.opts[cIdx])) {
    allAbove.push({ id: q.docId, q: q.q, correct: q.opts[cIdx], opts: q.opts });
  }

  // 2. Traps in distractors
  const distTrapCount = q.opts.filter((_, i) => i !== cIdx).filter(o => trapRegex.test(o)).length;
  if (distTrapCount >= 2 && !trapRegex.test(q.opts[cIdx])) {
    trapQuestions.push({ id: q.docId, q: q.q, correct: q.opts[cIdx], opts: q.opts, trapCount: distTrapCount });
  }

  // 3. High ratio or big length diff
  if (ratio > 1.20 || cLen - maxDist > 25 || minDist - cLen > 20) {
    highRatio.push({ id: q.docId, ratio: ratio.toFixed(2), diff: cLen - maxDist, q: q.q, correct: q.opts[cIdx], opts: q.opts, cIdx });
  }
});

console.log(`Pedmahorat Issues:`);
console.log(`  All above count: ${allAbove.length}`);
console.log(`  Trap questions count: ${trapQuestions.length}`);
console.log(`  High ratio count: ${highRatio.length}`);

console.log('\n--- All Above Questions ---');
allAbove.forEach(x => console.log(`ID: ${x.id}, Q: "${x.q.slice(0, 70)}", Correct: "${x.correct}"`));

console.log('\n--- Trap Questions (First 3) ---');
trapQuestions.slice(0, 3).forEach(x => {
  console.log(`ID: ${x.id}, Q: "${x.q.slice(0, 70)}"`);
  x.opts.forEach((o, i) => console.log(`  [${i}] ${o}`));
});

console.log('\n--- High Ratio (First 3) ---');
highRatio.slice(0, 3).forEach(x => {
  console.log(`ID: ${x.id}, Ratio: ${x.ratio}, Diff: ${x.diff}, Q: "${x.q.slice(0, 70)}"`);
  x.opts.forEach((o, i) => console.log(`  [${i}] ${o}`));
});
