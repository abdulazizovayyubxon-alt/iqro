import fs from 'fs';
import path from 'path';

const baseDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain';
const conv = '9b6a2a70-40ab-4a00-bc16-8fcf92b11a34';

const logFile = path.join(baseDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
if (fs.existsSync(logFile)) {
  const lines = fs.readFileSync(logFile, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (!line) return;
    try {
      const obj = JSON.parse(line);
      if (obj.content && (obj.content.includes('GERMAN') || obj.content.includes('UPLOAD COMPLETE REPORT'))) {
        console.log(`Output found at step ${obj.step_index}:`);
        console.log(obj.content);
      }
    } catch (e) {}
  });
}
