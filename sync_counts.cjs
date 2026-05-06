const fs = require('fs');
const path = require('path');

const dir = './src/data';
const files = fs.readdirSync(dir).filter(f => f.startsWith('questions_') && f.endsWith('.js'));

const counts = {};

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const arrayMatch = content.match(/\[([\s\S]*)\]\s*;/);
  if (!arrayMatch) return;
  const arrayContent = arrayMatch[1];
  const questions = [];
  let depth = 0, start = -1;
  for (let i = 0; i < arrayContent.length; i++) {
    if (arrayContent[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (arrayContent[i] === '}') { depth--; if (depth === 0 && start !== -1) { questions.push(arrayContent.substring(start, i + 1)); start = -1; } }
  }
  const id = file.match(/questions_(\d+)/)[1];
  counts[id] = questions.length;
});

const mockDataPath = './src/data/mockData.js';
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');
Object.keys(counts).forEach(id => {
  const regex = new RegExp(`(id: ${id},[\\s\\S]*?count: )\\d+`);
  mockDataContent = mockDataContent.replace(regex, `$1${counts[id]}`);
});
fs.writeFileSync(mockDataPath, mockDataContent, 'utf8');
console.log('Synchronized all question counts.');
