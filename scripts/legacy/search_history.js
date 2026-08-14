import fs from 'fs';
import path from 'path';

const searchTerms = ['password', 'auth', 'node', 'fix', 'parol'];

const baseDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain';
const convs = ['1a822587-3210-41df-9ffb-1813f365894d', '9b6a2a70-40ab-4a00-bc16-8fcf92b11a34'];

convs.forEach(conv => {
  const logFile = path.join(baseDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(logFile)) {
    console.log(`\n--- Searching in ${conv} ---`);
    const lines = fs.readFileSync(logFile, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (!line) return;
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            if (tc.name === 'run_command') {
              const cmd = tc.args.CommandLine;
              if (cmd) {
                console.log(`Line ${idx + 1} run_command: ${cmd}`);
              }
            }
          });
        }
        if (obj.type === 'USER_INPUT') {
          console.log(`Line ${idx + 1} USER: ${obj.content}`);
        }
      } catch (e) {
        // ignore parse errors
      }
    });
  } else {
    console.log(`File not found: ${logFile}`);
  }
});
