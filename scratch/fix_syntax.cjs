const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const FILES = ['questions_0.js', 'questions_1.js', 'questions_2.js', 'questions_3.js', 'questions_4.js', 'questions_5.js', 'questions_6.js'];

FILES.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix: Add comma between explanation and mnemonic if missing
    // Match explanation: "..." followed by mnemonic: "..."
    // We use a regex that handles both double and single quotes
    const fixedContent = content.replace(/(explanation:\s*[`"'][\s\S]*?[`"'])\s*(mnemonic:)/g, '$1,\n      $2');

    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed syntax in ${file}`);
});
