import fs from 'node:fs';
import path from 'node:path';

const tarbiyaPrepared = JSON.parse(fs.readFileSync('fan 4/_app/tarbiya.json', 'utf8'));
const ks165 = tarbiyaPrepared.filter(q => q.topicId === 165);
const pm166 = tarbiyaPrepared.filter(q => q.topicId === 166);

console.log(`Source topics: 165 count=${ks165.length}, 166 count=${pm166.length}`);

function adaptText(str) {
  if (!str) return str;
  return str
    .replace(/Tarbiya fani/g, 'Texnologiya fani')
    .replace(/tarbiya fani/g, 'texnologiya fani')
    .replace(/Tarbiya darsi/g, 'Texnologiya darsi')
    .replace(/tarbiya darsi/g, 'texnologiya darsi')
    .replace(/Tarbiya o['`‘ʻʼ]qituvchisi/g, "Texnologiya o'qituvchisi")
    .replace(/tarbiya o['`‘ʻʼ]qituvchisi/g, "texnologiya o'qituvchisi");
}

// Section 09: Kasb standarti (IDs 1821-2080, topicId 194)
const ksAdapted = ks165.map((q, idx) => ({
  id: 1821 + idx,
  q: adaptText(q.q),
  opts: q.opts.map(adaptText),
  correct: q.correct,
  explanation: adaptText(q.explanation),
  mnemonic: adaptText(q.mnemonic),
  topicId: 194,
  category: 'texnologiya_dizayn',
  difficulty: q.difficulty || 'Y1',
  bloom_level: 'Bilish',
  question_type: q.difficulty || 'Y1',
  source_file: '09_kasb_standarti.json'
}));

// Section 10: Pedagogik mahorat (IDs 2081-2600, topicId 195)
const pmAdapted = pm166.map((q, idx) => ({
  id: 2081 + idx,
  q: adaptText(q.q),
  opts: q.opts.map(adaptText),
  correct: q.correct,
  explanation: adaptText(q.explanation),
  mnemonic: adaptText(q.mnemonic),
  topicId: 195,
  category: 'texnologiya_dizayn',
  difficulty: q.difficulty || 'Y2',
  bloom_level: 'Qo\'llash',
  question_type: q.difficulty || 'Y2',
  source_file: '10_pedagogik_mahorat.json'
}));

const outDir = 'fan 4/Texnologiya (Dizayn)/bolimlar';
fs.writeFileSync(path.join(outDir, '09_kasb_standarti.json'), JSON.stringify(ksAdapted, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, '10_pedagogik_mahorat.json'), JSON.stringify(pmAdapted, null, 2), 'utf8');

console.log(`✅ 09_kasb_standarti.json yozildi: ${ksAdapted.length} ta savol (IDs 1821–2080)`);
console.log(`✅ 10_pedagogik_mahorat.json yozildi: ${pmAdapted.length} ta savol (IDs 2081–2600)`);
