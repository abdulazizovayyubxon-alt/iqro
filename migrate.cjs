const fs = require('fs');
const path = './qoshimcha/chqbt_questions_database.json';
const db = JSON.parse(fs.readFileSync(path, 'utf8'));

const sectionMap = {
  'nizomlar': '1',
  'otish': '2',
  'taktika': '3',
  'fv': '4',
  'tibbiyot': '5',
  'pedagogika': '6'
};

for (const [sectionKey, sectionData] of Object.entries(db.sections)) {
  const fileId = sectionMap[sectionKey];
  if (!fileId) continue;

  const filePath = `./src/data/questions_${fileId}.js`;
  let fileContent = fs.readFileSync(filePath, 'utf8');

  const newQuestions = sectionData.questions.map(q => {
    let exp = q.explanation.replace(/"/g, '\\"').replace(/\n/g, ' ');
    if (q.mnemonic) exp += ` 🧠 Eslab qoling: ${q.mnemonic.replace(/"/g, '\\"')}`;
    if (q.examTip) exp += ` 💡 Maslahat: ${q.examTip.replace(/"/g, '\\"')}`;
    
    let optsStr = q.options.map(o => `"${o.replace(/"/g, '\\"')}"`).join(', ');

    return `  {
    q: "${q.question.replace(/"/g, '\\"').replace(/\n/g, ' ')}",
    opts: [${optsStr}],
    correct: ${q.correctAnswer},
    explanation: "${exp}"
  }`;
  });

  const appendStr = ",\n" + newQuestions.join(",\n") + "\n];\n";
  
  // Replace the closing bracket and semicolon at the end
  fileContent = fileContent.replace(/\]\s*;\s*$/, appendStr);
  fs.writeFileSync(filePath, fileContent, 'utf8');
}
console.log('Mapping completed successfully.');
