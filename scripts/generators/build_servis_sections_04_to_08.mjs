import fs from 'node:fs';
import path from 'node:path';

const outDir = 'fan 4/Texnologiya (Servis)/bolimlar';
fs.mkdirSync(outDir, { recursive: true });

// Section 04: Ishlab chiqarish va ro'zg'orshunoslik (104 questions, topicId 199, IDs 1509–1612)
const src04 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/05_ishlab_chiqarish_va_rozgorshunoslik.json', 'utf8'));
const sec04 = src04.slice(0, 104).map((q, idx) => ({
  ...q,
  id: 1509 + idx,
  topicId: 199,
  category: "texnologiya_servis",
  source_file: "04_ishlab_chiqarish_va_rozgorshunoslik.json"
}));
fs.writeFileSync(path.join(outDir, '04_ishlab_chiqarish_va_rozgorshunoslik.json'), JSON.stringify(sec04, null, 2), 'utf8');
console.log(`✅ 04_ishlab_chiqarish_va_rozgorshunoslik.json: ${sec04.length} ta savol (IDs 1509–1612)`);

// Section 05: Kasb tanlashga yo'llash (104 questions, topicId 200, IDs 1613–1716)
const src05 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/07_kasb_tanlashga_yollash.json', 'utf8'));
const sec05 = src05.slice(0, 104).map((q, idx) => ({
  ...q,
  id: 1613 + idx,
  topicId: 200,
  category: "texnologiya_servis",
  source_file: "05_kasb_tanlashga_yollash.json"
}));
fs.writeFileSync(path.join(outDir, '05_kasb_tanlashga_yollash.json'), JSON.stringify(sec05, null, 2), 'utf8');
console.log(`✅ 05_kasb_tanlashga_yollash.json: ${sec05.length} ta savol (IDs 1613–1716)`);

// Section 06: Robototexnika asoslari (104 questions, topicId 201, IDs 1717–1820)
const src06 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/08_robototexnika_asoslari.json', 'utf8'));
const sec06 = src06.slice(0, 104).map((q, idx) => ({
  ...q,
  id: 1717 + idx,
  topicId: 201,
  category: "texnologiya_servis",
  source_file: "06_robototexnika_asoslari.json"
}));
fs.writeFileSync(path.join(outDir, '06_robototexnika_asoslari.json'), JSON.stringify(sec06, null, 2), 'utf8');
console.log(`✅ 06_robototexnika_asoslari.json: ${sec06.length} ta savol (IDs 1717–1820)`);

// Section 07: Kasb standarti (260 questions, topicId 202, IDs 1821–2080)
const src07 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/09_kasb_standarti.json', 'utf8'));
const sec07 = src07.map((q, idx) => ({
  ...q,
  id: 1821 + idx,
  topicId: 202,
  category: "texnologiya_servis",
  source_file: "07_kasb_standarti.json"
}));
fs.writeFileSync(path.join(outDir, '07_kasb_standarti.json'), JSON.stringify(sec07, null, 2), 'utf8');
console.log(`✅ 07_kasb_standarti.json: ${sec07.length} ta savol (IDs 1821–2080)`);

// Section 08: Pedagogik mahorat (520 questions, topicId 203, IDs 2081–2600)
const src08 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/10_pedagogik_mahorat.json', 'utf8'));
const sec08 = src08.map((q, idx) => ({
  ...q,
  id: 2081 + idx,
  topicId: 203,
  category: "texnologiya_servis",
  source_file: "08_pedagogik_mahorat.json"
}));
fs.writeFileSync(path.join(outDir, '08_pedagogik_mahorat.json'), JSON.stringify(sec08, null, 2), 'utf8');
console.log(`✅ 08_pedagogik_mahorat.json: ${sec08.length} ta savol (IDs 2081–2600)`);
