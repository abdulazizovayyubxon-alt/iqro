import fs from 'node:fs';

const subs = ['matematika', 'tarbiya', 'pedmahorat', 'fizika', 'texnologiya_dizayn', 'texnologiya_servis'];

subs.forEach(sub => {
  const list = JSON.parse(fs.readFileSync(`fan 4/_app/${sub}.json`, 'utf8'));
  console.log(`=== ${sub.toUpperCase()} SAMPLES ===`);
  
  // 1. All of the above
  const allAbove = list.filter(q => /(barcha|hamma|yuqoridagi).*to'g'ri/i.test(q.opts[q.correct]));
  if (allAbove.length > 0) {
    console.log(`"Barchasi to'g'ri" kalitli savol namunasi (${allAbove.length} ta):`);
    console.log('ID:', allAbove[0].docId || allAbove[0].id);
    console.log('Q:', allAbove[0].q);
    console.log('Opts:', allAbove[0].opts);
    console.log('');
  }

  // 2. Biggest length disparity
  const sortedByDiff = [...list].sort((a, b) => {
    const dlenA = a.opts.filter((_, i) => i !== a.correct).map(o=>o.length).reduce((x,y)=>x+y,0)/3;
    const dlenB = b.opts.filter((_, i) => i !== b.correct).map(o=>o.length).reduce((x,y)=>x+y,0)/3;
    return (b.opts[b.correct].length / dlenB) - (a.opts[a.correct].length / dlenA);
  });

  const topDisparity = sortedByDiff[0];
  const cLen = topDisparity.opts[topDisparity.correct].length;
  const dLens = topDisparity.opts.filter((_, i) => i !== topDisparity.correct).map(o=>o.length);
  const avgD = (dLens.reduce((x,y)=>x+y,0)/3).toFixed(1);
  console.log(`Eng katta uzunlik farqi (Ratio: ${(cLen/avgD).toFixed(2)}x, correct=${cLen}, avgDist=${avgD}):`);
  console.log('ID:', topDisparity.docId || topDisparity.id);
  console.log('Q:', topDisparity.q);
  console.log(`To'g'ri javob [${topDisparity.correct}]:`, topDisparity.opts[topDisparity.correct]);
  console.log('Chalg\'ituvchilar:', topDisparity.opts.filter((_, i) => i !== topDisparity.correct));
  console.log('--------------------------------------------------\n');
});
