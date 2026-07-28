/**
 * make-theory-prompts.mjs — mavzu konspekti uchun prompt tayyorlaydi.
 *
 * QO'LDA ishlash yo'li (bepul web LLM). To'liq avtomat uchun:
 *   node pipeline/run-theory-api.mjs --category chqbt
 *
 * Savol fabrikasi bilan bir xil ish tartibi: og'ir ish (mavzu metadatasi,
 * o'z savol bazangizdan tasdiqlangan izohlarni tanlash) LOKALDA bepul
 * bajariladi, LLM faqat matnni tartibga soladi.
 *
 * Ishlatish:
 *   node pipeline/make-theory-prompts.mjs --topic 0
 *   node pipeline/make-theory-prompts.mjs --category chqbt
 *   node pipeline/make-theory-prompts.mjs --all --limit 10
 *
 * Chiqish: pipeline/inbox/theory/topic-<id>.txt
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, INBOX_DIR, MIN_NEEDED,
  readTopics, loadQuestionsByTopic, pickExplanations, buildTheoryPrompt,
} from './lib/theory.mjs';

const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const topics = readTopics();
const byTopic = loadQuestionsByTopic();

let selected;
const topicArg = argVal('--topic');
const catArg = argVal('--category');
if (topicArg !== null) {
  selected = topics.filter(t => t.id === Number(topicArg));
} else if (catArg) {
  selected = topics.filter(t => t.category === catArg);
} else if (args.includes('--all')) {
  selected = topics;
} else {
  console.log(`Foydalanish:
  node pipeline/make-theory-prompts.mjs --topic 0
  node pipeline/make-theory-prompts.mjs --category chqbt
  node pipeline/make-theory-prompts.mjs --all [--limit N]

Mavzular: ${topics.length} ta, zaxirada savoli bor mavzular: ${byTopic.size} ta`);
  process.exit(0);
}

const limit = Number(argVal('--limit') || 0);
if (limit > 0) selected = selected.slice(0, limit);

fs.mkdirSync(INBOX_DIR, { recursive: true });

let written = 0;
let skipped = 0;
for (const topic of selected) {
  const rows = byTopic.get(topic.id) || [];
  const explanations = pickExplanations(rows);
  if (explanations.length < MIN_NEEDED) {
    console.warn(`  ⚠ ${topic.id} «${topic.name}» — yetarli izoh yo'q (${explanations.length}), o'tkazildi`);
    skipped++;
    continue;
  }
  const file = path.join(INBOX_DIR, `topic-${topic.id}.txt`);
  fs.writeFileSync(file, buildTheoryPrompt(topic, explanations), 'utf8');
  console.log(`  ✓ ${topic.id} «${topic.name}» — ${explanations.length} izoh → ${path.relative(ROOT, file)}`);
  written++;
}

console.log(`\nTayyor: ${written} ta prompt${skipped ? `, ${skipped} ta o'tkazildi` : ''}.`);
console.log(`Keyingi qadam: har bir .txt ni bepul web LLM'ga qo'ying, javobni`);
console.log(`shu papkaga topic-<id>.json nomi bilan saqlang, so'ng:`);
console.log(`  node pipeline/ingest-theory.mjs`);
