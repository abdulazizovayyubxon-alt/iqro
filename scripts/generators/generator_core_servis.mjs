import fs from 'node:fs';
import path from 'node:path';

export function createQuestionBankServis(sectionName, topicId, startId, count, itemBuilders) {
  const questions = [];
  
  for (let i = 0; i < count; i++) {
    const qId = startId + i;
    const builder = itemBuilders[i % itemBuilders.length];
    const target = i % 4;
    const item = builder(qId, i, target);
    
    // Validate length ratio: correctLen / avgDistLen <= 1.25
    const correctLen = item.opts[item.correct].length;
    const distractorLens = item.opts.filter((_, idx) => idx !== item.correct).map(o => o.length);
    const avgDistLen = distractorLens.reduce((a, b) => a + b, 0) / 3;
    const ratio = correctLen / avgDistLen;
    
    if (ratio > 1.25) {
      console.warn(`[Warn] Q#${qId} length ratio is ${ratio.toFixed(2)} in ${sectionName}`);
    }
    
    questions.push({
      id: qId,
      q: item.q,
      opts: item.opts,
      correct: item.correct,
      explanation: item.explanation,
      mnemonic: item.mnemonic,
      topicId: topicId,
      category: "texnologiya_servis",
      difficulty: item.difficulty || "Y2",
      bloom_level: item.bloom_level || "Qo'llash",
      question_type: item.question_type || "Y1",
      source_file: sectionName
    });
  }

  const outDir = 'fan 4/Texnologiya (Servis)/bolimlar';
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, sectionName), JSON.stringify(questions, null, 2), 'utf8');
  console.log(`✅ ${sectionName} muvaffaqiyatli saqlandi: ${questions.length} ta savol (IDs ${startId}–${startId + count - 1})`);
  return questions;
}

export function balanceOptions(correctText, distractors, targetIdx) {
  const opts = ["", "", "", ""];
  opts[targetIdx] = correctText;
  let d = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== targetIdx) {
      opts[i] = distractors[d++];
    }
  }
  return opts;
}
