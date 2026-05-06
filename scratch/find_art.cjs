const fs = require('fs');
const path = require('path');

const keywords = ['natyurmort', 'portret', 'janr', 'rang', 'kompozitsiya', 'rassom', 'haykaltarosh', 'me\'mor', 'dizayn'];
const dataDir = 'src/data';

const files = fs.readdirSync(dataDir).filter(f => f.startsWith('questions_') && f.endsWith('.js'));

files.forEach(file => {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const matches = keywords.filter(k => content.toLowerCase().includes(k));
    if (matches.length > 0) {
        console.log(`File: ${file} contains keywords: ${matches.join(', ')}`);
        // Print first 5 matches
        const lines = content.split('\n');
        let count = 0;
        for (let i = 0; i < lines.length && count < 5; i++) {
            if (keywords.some(k => lines[i].toLowerCase().includes(k))) {
                console.log(`  L${i + 1}: ${lines[i].trim()}`);
                count++;
            }
        }
    }
});
