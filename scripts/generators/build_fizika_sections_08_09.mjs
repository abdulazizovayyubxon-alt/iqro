import fs from 'node:fs';
import path from 'node:path';

const outDir = 'fan 4/Fizika/bolimlar';
fs.mkdirSync(outDir, { recursive: true });

function adaptText(str) {
  if (!str) return str;
  return str
    .replace(/Texnologiya fani/g, "Fizika fani")
    .replace(/texnologiya fani/g, "fizika fani")
    .replace(/Texnologiya darsi/g, "Fizika darsi")
    .replace(/texnologiya darsi/g, "fizika darsi")
    .replace(/Texnologiya o'qituvchisi/g, "Fizika o'qituvchisi")
    .replace(/texnologiya o'qituvchisi/g, "fizika o'qituvchisi")
    .replace(/texnologiya xonasi/g, "fizika laboratoriyasi")
    .replace(/texnologiya ustaxonasi/g, "fizika laboratoriyasi va kabineti")
    .replace(/ustaxonada/g, "fizika laboratoriyasida")
    .replace(/ustaxona/g, "fizika kabineti")
    .replace(/texnologiya/g, "fizika");
}

function verifyAndAdjust(arr, secName) {
  let g = 0;
  arr.forEach((q, idx) => {
    const clen = q.opts[q.correct].length;
    const dlen = q.opts.filter((_, i) => i !== q.correct).map(o => o.length).reduce((a, b) => a + b, 0) / 3;
    const ratio = clen / dlen;
    if (ratio > 1.25) {
      g++;
      console.warn(`[Warn] ${secName} Q#${q.id} ratio ${ratio.toFixed(2)} > 1.25`);
    }
  });
  console.log(`Ratio check for ${secName}: ${g} issues out of ${arr.length}`);
}

// Section 08: Kasb standarti (260 questions, topicId 184, IDs 1821–2080)
const src08 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/09_kasb_standarti.json', 'utf8'));
const sec08 = src08.map((q, idx) => {
  const newQ = adaptText(q.q);
  const newOpts = q.opts.map(adaptText);
  const newExp = adaptText(q.explanation).replace(/\b[ABCD]\s*(?:javob|variant)[a-z']*/gi, "to'g'ri javob");
  const newMnem = adaptText(q.mnemonic);

  return {
    id: 1821 + idx,
    q: newQ,
    opts: newOpts,
    correct: q.correct,
    explanation: newExp,
    mnemonic: newMnem,
    topicId: 184,
    category: "fizika",
    difficulty: q.difficulty || "Y2",
    bloom_level: q.bloom_level || "Qo'llash",
    question_type: q.question_type || "Y1",
    source_file: "08_kasb_standarti.json"
  };
});
verifyAndAdjust(sec08, "08_kasb_standarti.json");
fs.writeFileSync(path.join(outDir, '08_kasb_standarti.json'), JSON.stringify(sec08, null, 2), 'utf8');
console.log(`✅ 08_kasb_standarti.json: ${sec08.length} ta savol (IDs 1821–2080)`);

// Section 09: Pedagogik mahorat (520 questions, topicId 185, IDs 2081–2600)
const src09 = JSON.parse(fs.readFileSync('fan 4/Texnologiya (Dizayn)/bolimlar/10_pedagogik_mahorat.json', 'utf8'));
const sec09 = src09.map((q, idx) => {
  const newQ = adaptText(q.q);
  const newOpts = q.opts.map(adaptText);
  const newExp = adaptText(q.explanation).replace(/\b[ABCD]\s*(?:javob|variant)[a-z']*/gi, "to'g'ri javob");
  const newMnem = adaptText(q.mnemonic);

  return {
    id: 2081 + idx,
    q: newQ,
    opts: newOpts,
    correct: q.correct,
    explanation: newExp,
    mnemonic: newMnem,
    topicId: 185,
    category: "fizika",
    difficulty: q.difficulty || "Y2",
    bloom_level: q.bloom_level || "Qo'llash",
    question_type: q.question_type || "Y1",
    source_file: "09_pedagogik_mahorat.json"
  };
});
verifyAndAdjust(sec09, "09_pedagogik_mahorat.json");
fs.writeFileSync(path.join(outDir, '09_pedagogik_mahorat.json'), JSON.stringify(sec09, null, 2), 'utf8');
console.log(`✅ 09_pedagogik_mahorat.json: ${sec09.length} ta savol (IDs 2081–2600)`);
