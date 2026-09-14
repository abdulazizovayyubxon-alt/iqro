import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('fan 4/_app/matematika.json', 'utf8'));
const flags = [];

questions.forEach(q => {
  const cLen = q.opts[q.correct].length;
  const dLens = q.opts.filter((_, i) => i !== q.correct).map(o => o.length);
  const avg = dLens.reduce((a, b) => a + b, 0) / 3;
  const ratio = cLen / avg;
  if (ratio > 1.18) {
    flags.push({
      id: q.docId,
      ratio: ratio.toFixed(2),
      cLen,
      dLens,
      q: q.q,
      opts: q.opts,
      correct: q.correct
    });
  }
});

console.log('Total ratio > 1.18:', flags.length);
flags.forEach((f, i) => {
  console.log(`\n[${i + 1}] ID: ${f.id} (Ratio: ${f.ratio})`);
  console.log(`Q: ${f.q}`);
  console.log(`Opts:`);
  f.opts.forEach((o, idx) => console.log(`  ${idx === f.correct ? '✅' : '  '} [${idx}] ${o}`));
});
