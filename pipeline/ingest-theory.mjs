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
 * Nega tekshiruv qat'iy: bu matnni attestatsiyaga tayyorlanayotgan o'qituvchi
 * o'qiydi. Shakli buzuq yoki kirill aralashgan material ilovaga tushmasligi
 * kerak. Tekshiruv AVTOMATIK — lekin mazmun to'g'riligini u KAFOLATLAMAYDI,
 * har bir mavzuni odam ko'zdan kechirishi shart.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// fileURLToPath SHART: yo'lda bo'shliq bor («Toifa Pro PLATFORMA»).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN_DIR = path.join(ROOT, 'pipeline', 'inbox', 'theory');
const TARGET = path.join(ROOT, 'src', 'data', 'theoryContent.json');

const LIMITS = {
  summary: [40, 400],
  keyPoints: [4, 10],
  pointTitle: [3, 90],
  pointBody: [20, 600],
  mustKnow: [2, 12],
  mistakes: [0, 8],
  mnemonics: [0, 6],
};

const CYRILLIC = /[Ѐ-ӿ]/;
const CJK = /[　-鿿가-힯]/;

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const inRange = (n, [lo, hi]) => n >= lo && n <= hi;

/** @returns {{ ok, errors: string[], warns: string[], value }} */
function validate(raw, topicId) {
  const errors = [];
  const warns = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['JSON obyekt emas'], warns, value: null };
  }

  const summary = isStr(raw.summary) ? raw.summary.trim() : '';
  if (!inRange(summary.length, LIMITS.summary)) {
    errors.push(`summary uzunligi ${summary.length} — ${LIMITS.summary.join('-')} oralig'ida bo'lishi kerak`);
  }

  const keyPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints : [];
  if (!inRange(keyPoints.length, LIMITS.keyPoints)) {
    errors.push(`keyPoints soni ${keyPoints.length} — ${LIMITS.keyPoints.join('-')} bo'lishi kerak`);
  }
  const points = [];
  keyPoints.forEach((p, i) => {
    const t = isStr(p?.t) ? p.t.trim() : '';
    const d = isStr(p?.d) ? p.d.trim() : '';
    if (!inRange(t.length, LIMITS.pointTitle)) errors.push(`keyPoints[${i}].t uzunligi ${t.length}`);
    if (!inRange(d.length, LIMITS.pointBody)) errors.push(`keyPoints[${i}].d uzunligi ${d.length}`);
    points.push({ t, d });
  });

  const arr = (v) => (Array.isArray(v) ? v.filter(isStr).map(s => s.trim()) : []);
  const mustKnow = arr(raw.mustKnow);
  const mistakes = arr(raw.mistakes);
  const mnemonics = arr(raw.mnemonics);
  if (!inRange(mustKnow.length, LIMITS.mustKnow)) {
    errors.push(`mustKnow soni ${mustKnow.length} — ${LIMITS.mustKnow.join('-')} bo'lishi kerak`);
  }
  if (!inRange(mistakes.length, LIMITS.mistakes)) errors.push(`mistakes soni ${mistakes.length}`);
  if (!inRange(mnemonics.length, LIMITS.mnemonics)) errors.push(`mnemonics soni ${mnemonics.length}`);

  const all = [summary, ...points.flatMap(p => [p.t, p.d]), ...mustKnow, ...mistakes, ...mnemonics].join(' ');
  if (CYRILLIC.test(all)) errors.push('kirill harfi topildi (o\'zbek matni lotin alifbosida bo\'lishi kerak)');
  if (CJK.test(all)) errors.push('CJK belgisi topildi');
  if (/```|^\s*[#*]/m.test(all)) warns.push('markdown belgilari bor — tozalash kerak');

  // Aniqlik: mustKnow bandi mavhum bo'lmasin.
  // Raqamning O'ZI mezon emas — pedagogika/metodika mavzularida aniq fakt
  // ta'rif shaklida bo'ladi («DTS majburiy talablarni belgilaydi»). Shuning
  // uchun band FAQAT raqamsiz VA qisqa bo'lsa shubhali hisoblanadi.
  const VAGUE_LEN = 40;
  const vague = mustKnow.filter(x => !/\d/.test(x) && x.length < VAGUE_LEN);
  if (vague.length > Math.floor(mustKnow.length / 2)) {
    warns.push(`mustKnow bandlarining ko'pi mavhum (${vague.length}/${mustKnow.length}: raqamsiz va ${VAGUE_LEN} belgidan qisqa)`);
  }

  const source = isStr(raw.source) ? raw.source.trim() : null;
  if (!source) warns.push('source yo\'q — material manbasi ko\'rsatilmagan');

  const updatedAt = /^\d{4}-\d{2}-\d{2}$/.test(raw.updatedAt || '')
    ? raw.updatedAt
    : new Date().toISOString().slice(0, 10);

  return {
    ok: errors.length === 0,
    errors,
    warns,
    value: { summary, keyPoints: points, mustKnow, mistakes, mnemonics, source, updatedAt },
  };
}

// ── Ishga tushirish ───────────────────────────────────────────────────────
const write = process.argv.includes('--write');
const force = process.argv.includes('--force');

if (!fs.existsSync(IN_DIR)) {
  console.error(`Papka yo'q: ${path.relative(ROOT, IN_DIR)}`);
  console.error('Avval promptlarni yarating: node pipeline/make-theory-prompts.mjs --topic 0');
  process.exit(1);
}

const files = fs.readdirSync(IN_DIR).filter(f => /^topic-\d+\.json$/.test(f)).sort();
if (files.length === 0) {
  console.log('Qabul qilinadigan .json fayl topilmadi.');
  process.exit(0);
}

const current = fs.existsSync(TARGET)
  ? JSON.parse(fs.readFileSync(TARGET, 'utf8'))
  : {};

const accepted = {};
let okCount = 0;
let failCount = 0;

for (const f of files) {
  const topicId = Number(f.match(/\d+/)[0]);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), 'utf8'));
  } catch (e) {
    console.log(`✗ ${f} — JSON o'qilmadi: ${e.message}`);
    failCount++;
    continue;
  }

  const { ok, errors, warns, value } = validate(raw, topicId);
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

const merged = { ...current, ...accepted };
// Kalitlar raqam tartibida — diff o'qishga qulay bo'lsin
const sorted = {};
Object.keys(merged).map(Number).sort((a, b) => a - b).forEach(k => { sorted[k] = merged[k]; });

fs.writeFileSync(TARGET, (JSON.stringify(sorted, null, 2) + '\n').replace(/\n/g, '\r\n'), 'utf8');
console.log(`\n${path.relative(ROOT, TARGET)} yangilandi — jami ${Object.keys(sorted).length} mavzu.`);
console.log('⚠ Endi har bir yangi mavzuni soha mutaxassisi ko\'zdan kechirsin.');
