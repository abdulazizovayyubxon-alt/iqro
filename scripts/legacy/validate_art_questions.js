import fs from 'fs';
import nodePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);
const TARGET_DIR = nodePath.join(__dirname, 'fan', 'art');
const REPORT_FILE = nodePath.join(__dirname, 'fan', 'art_report.md');

function normaliseText(text) {
  return (text || '').toLowerCase().replace(/[‘'`ʼ?.!,;:]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  console.log("🔍 Scanning Art question blocks...");
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`❌ Directory not found: ${TARGET_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.json')).sort();
  console.log(`📂 Found ${files.length} JSON block files.`);

  let totalQuestions = 0;
  let schemaErrors = [];
  let duplicates = [];
  const questionTexts = new Map();

  const difficultyStats = { Y1: 0, Y2: 0, Y3: 0 };
  const bloomStats = {};
  const topicStats = {};

  files.forEach(file => {
    const filePath = nodePath.join(TARGET_DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      schemaErrors.push(`${file}: Invalid JSON parsing - ${e.message}`);
      return;
    }

    if (!data.block || typeof data.block !== 'string') {
      schemaErrors.push(`${file}: Missing or invalid "block" field.`);
    }
    if (!data.topic || typeof data.topic !== 'string') {
      schemaErrors.push(`${file}: Missing or invalid "topic" field.`);
    }
    if (!Array.isArray(data.questions)) {
      schemaErrors.push(`${file}: "questions" is not an array.`);
      return;
    }
    if (data.questions.length !== 10) {
      schemaErrors.push(`${file}: "questions" array length is ${data.questions.length} (expected 10).`);
    }

    // Per block difficulty counters
    let blockY1 = 0, blockY2 = 0, blockY3 = 0;

    data.questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const ref = `${file} #Question ${q.id || qNum}`;

      if (!q.id) schemaErrors.push(`${ref}: Missing "id".`);
      if (!q.subject || q.subject !== "Tasviriy san’at va chizmachilik") {
        schemaErrors.push(`${ref}: Invalid or missing "subject". Got: ${q.subject}`);
      }
      if (!q.topic) schemaErrors.push(`${ref}: Missing "topic".`);
      if (!q.subtopic) schemaErrors.push(`${ref}: Missing "subtopic".`);
      
      if (!['Y1', 'Y2', 'Y3'].includes(q.difficulty)) {
        schemaErrors.push(`${ref}: Invalid "difficulty" value: ${q.difficulty}`);
      } else {
        difficultyStats[q.difficulty]++;
        if (q.difficulty === "Y1") blockY1++;
        if (q.difficulty === "Y2") blockY2++;
        if (q.difficulty === "Y3") blockY3++;
      }

      if (!q.bloom_level) {
        schemaErrors.push(`${ref}: Missing "bloom_level".`);
      } else {
        bloomStats[q.bloom_level] = (bloomStats[q.bloom_level] || 0) + 1;
      }

      if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 10) {
        schemaErrors.push(`${ref}: "question" text is missing or too short.`);
      } else {
        const norm = normaliseText(q.question);
        if (questionTexts.has(norm)) {
          const original = questionTexts.get(norm);
          duplicates.push(`${ref} is a duplicate of ${original}`);
        } else {
          questionTexts.set(norm, ref);
        }
      }

      if (!q.options || typeof q.options !== 'object') {
        schemaErrors.push(`${ref}: "options" is missing or not an object.`);
      } else {
        const keys = ['A', 'B', 'C', 'D'];
        keys.forEach(k => {
          if (!q.options[k] || q.options[k].trim().length === 0) {
            schemaErrors.push(`${ref}: Option ${k} is missing or empty.`);
          }
        });
      }

      if (!['A', 'B', 'C', 'D'].includes(q.answer)) {
        schemaErrors.push(`${ref}: Invalid "answer" key: ${q.answer}`);
      }

      if (!q.explanation || q.explanation.trim().length < 5) {
        schemaErrors.push(`${ref}: "explanation" is missing or too short.`);
      }

      if (!q.mnemonic || q.mnemonic.trim().length < 5) {
        schemaErrors.push(`${ref}: "mnemonic" is missing or too short.`);
      }

      if (q.topic) {
        topicStats[q.topic] = (topicStats[q.topic] || 0) + 1;
      }

      totalQuestions++;
    });

    if (blockY1 !== 3 || blockY2 !== 4 || blockY3 !== 3) {
      schemaErrors.push(`${file}: Invalid difficulty balance. Got Y1=${blockY1}, Y2=${blockY2}, Y3=${blockY3} (expected 3, 4, 3)`);
    }
  });

  console.log(`\n📊 VALIDATION COMPLETE`);
  console.log(`   Jami savollar: ${totalQuestions}`);
  console.log(`   Schema xatoliklari: ${schemaErrors.length}`);
  console.log(`   Takroriy savollar: ${duplicates.length}`);

  const reportMd = `# Art Question Bank Audit Report

Generated on: ${new Date().toISOString()}

## Summary Stats
* **Total JSON Files Scanned:** ${files.length}
* **Total Questions Evaluated:** ${totalQuestions}
* **Schema Violations / Errors:** ${schemaErrors.length}
* **Duplicates Detected:** ${duplicates.length}

## Difficulty Distribution
* **Y1 (Easy):** ${difficultyStats.Y1} (${Math.round((difficultyStats.Y1/totalQuestions)*100) || 0}%)
* **Y2 (Medium):** ${difficultyStats.Y2} (${Math.round((difficultyStats.Y2/totalQuestions)*100) || 0}%)
* **Y3 (Hard):** ${difficultyStats.Y3} (${Math.round((difficultyStats.Y3/totalQuestions)*100) || 0}%)

## Bloom Taxonomy Levels
${Object.entries(bloomStats).map(([lvl, cnt]) => `* **${lvl}:** ${cnt}`).join('\n')}

## Topic Distribution
${Object.entries(topicStats).map(([t, cnt]) => `* **${t}:** ${cnt}`).join('\n')}

${schemaErrors.length > 0 ? `\n## Schema Errors\n${schemaErrors.map(e => `* ❌ ${e}`).join('\n')}` : '\n## Schema Status\n* ✅ All JSON schemas and difficulty splits are perfectly valid.'}

${duplicates.length > 0 ? `\n## Duplicates Found\n${duplicates.map(d => `* 🔁 ${d}`).join('\n')}` : '\n## Duplicate Status\n* ✅ No duplicate questions found.'}
`;

  fs.writeFileSync(REPORT_FILE, reportMd, 'utf8');
  console.log(`\n📝 Audit report saved to: ${REPORT_FILE}`);
}

main().catch(console.error);
