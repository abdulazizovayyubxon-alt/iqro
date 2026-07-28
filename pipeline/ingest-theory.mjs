/**
 * ingest-theory.mjs — LLM qaytargan konspektlarni tekshirib qabul qiladi.
 *
 * O'qiydi:  pipeline/inbox/theory/topic-<id>.json
 * Yozadi:   src/data/theoryContent.json  (mavjud mavzular ustiga qo'shiladi)
 *
 * Ishlatish:
 *   node pipeline/ingest-theory.mjs            # tekshiruv + hisobot (yozmaydi)
 *   node pipeline/ingest-theory.mjs --write    # tasdiqdan o'tganlarni yozadi
 *   node pipeline/ingest-theory.mjs --write --force   # ogohlantirishlarga ham qaramay
 *
 * Tekshiruv mantiqi pipeline/lib/theory.mjs da (run-theory-api.mjs bilan bir xil).
 */
import fs from 'fs';
import path from 'path';
import { ROOT, INBOX_DIR, TARGET, validateTheory, readTheoryContent, writeTheoryContent, topicLang } from './lib/theory.mjs';

const write = process.argv.includes('--write');
const force = process.argv.includes('--force');

if (!fs.existsSync(INBOX_DIR)) {
  console.error(`Papka yo'q: ${path.relative(ROOT, INBOX_DIR)}`);
  console.error('Avval promptlarni yarating: node pipeline/make-theory-prompts.mjs --topic 0');
  process.exit(1);
}

const files = fs.readdirSync(INBOX_DIR).filter(f => /^topic-\d+\.json$/.test(f)).sort();
if (files.length === 0) {
  console.log('Qabul qilinadigan .json fayl topilmadi.');
  process.exit(0);
}

const current = readTheoryContent();

const accepted = {};
let okCount = 0;
let failCount = 0;

for (const f of files) {
  const topicId = Number(f.match(/\d+/)[0]);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, f), 'utf8'));
  } catch (e) {
    console.log(`✗ ${f} — JSON o'qilmadi: ${e.message}`);
    failCount++;
    continue;
  }

  const { ok, errors, warns, value } = validateTheory(raw, { lang: topicLang({ id: topicId }) });
  const hasWarn = warns.length > 0;

  if (!ok) {
    console.log(`✗ ${f}`);
    errors.forEach(e => console.log(`    xato: ${e}`));
    failCount++;
    continue;
  }
  if (hasWarn && !force) {
    console.log(`⚠ ${f} — qabul qilinmadi (--force bilan majburlash mumkin)`);
    warns.forEach(w => console.log(`    ogoh: ${w}`));
    failCount++;
    continue;
  }

  console.log(`✓ ${f} — ${value.keyPoints.length} band, ${value.mustKnow.length} fakt`
    + (current[topicId] ? '  (mavjud yozuv ALMASHTIRILADI)' : ''));
  warns.forEach(w => console.log(`    ogoh: ${w}`));
  accepted[topicId] = value;
  okCount++;
}

console.log(`\nTasdiqdan o'tdi: ${okCount}, rad etildi: ${failCount}`);

if (!write) {
  console.log('\n(quruq yurish — hech narsa yozilmadi. Yozish uchun: --write)');
  process.exit(0);
}

if (okCount === 0) {
  console.log('Yoziladigan narsa yo\'q.');
  process.exit(0);
}

const total = writeTheoryContent({ ...current, ...accepted });
console.log(`\n${path.relative(ROOT, TARGET)} yangilandi — jami ${total} mavzu.`);
console.log('⚠ Endi har bir yangi mavzuni soha mutaxassisi ko\'zdan kechirsin.');
