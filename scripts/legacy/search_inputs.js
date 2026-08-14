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
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          if (tc.name === 'manage_task' && tc.args.Action === 'send_input') {
            console.log(`Line ${idx + 1} send_input: ${JSON.stringify(tc.args.Input)}`);
          }
        });
      }
    } catch (e) {}
  });
}
