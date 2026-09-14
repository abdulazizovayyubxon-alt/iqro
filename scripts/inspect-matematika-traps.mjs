import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('fan 4/_app/matematika.json', 'utf8'));
const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi|nolga teng)\b/i;
const traps = [];

questions.forEach(q => {
  const cIdx = q.correct;
  const distTrapCount = q.opts.filter((_, i) => i !== cIdx).filter(o => trapRegex.test(o)).length;
  if (distTrapCount >= 2 && !trapRegex.test(q.opts[cIdx])) {
    traps.push({
      id: q.docId,
      q: q.q,
      correct: q.opts[cIdx],
      opts: q.opts
    });
  }
});

console.log('Total trap questions in Matematika:', traps.length);
traps.forEach((t, i) => {
  console.log(`\n[${i + 1}] ID: ${t.id}`);
  console.log(`Q: ${t.q}`);
  console.log(`Opts:`);
  t.opts.forEach((o, idx) => console.log(`  ${o === t.correct ? '✅' : '  '} [${idx}] ${o}`));
});
