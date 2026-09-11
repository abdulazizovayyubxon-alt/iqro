#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// build.mjs — namuna savol + javob kaliti → ilova sxemasi.
//
//   pipeline/namuna/parsed/<cat>.json  (savol + 4 variant, javobsiz — parse.mjs)
// + pipeline/namuna/keys/<cat>.json    (to'g'ri javob, bo'lim, izoh — qo'lda)
// = pipeline/namuna/out/<cat>.json     ({ q, opts[4], correct, ... })
//
// Tekshiradi: kalit to'liqligi, javob harfi, topicId diapazoni, izoh uzunligi,
// variantlar takrorlanmasligi, krill harf yo'qligi va BAZADAGI dublikat.
//
// FOYDALANISH:
//   node pipeline/namuna/build.mjs              # barcha fanlar
//   node pipeline/namuna/build.mjs tarix chqbt  # faqat ko'rsatilganlar
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { REGISTRY, ALL, parsedPath } from './registry.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const KEYS = path.join(ROOT, 'pipeline/namuna/keys');
const OUT = path.join(ROOT, 'pipeline/namuna/out');
const LETTERS = ['A', 'B', 'C', 'D'];

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = only.length ? only : ALL;

fs.mkdirSync(OUT, { recursive: true });

// ── yordamchilar ──────────────────────────────────────────────────────────
const norm = (s) => String(s || '')
  .toLowerCase().replace(/[ʻʼ‘’'`´]/g, "'")
  .replace(/[^a-z0-9а-яё]+/gi, ' ').replace(/\s+/g, ' ').trim();

// Variantlarni taqqoslash uchun YENGIL normallashtirish. `norm` matematik va
// mantiqiy belgilarni (∩ ∪ ¬ va minus) tashlab yuboradi — natijada "6/20/0/-20"
// yoki "A∩B∩C / ¬A∩¬B∩¬C" kabi variantlar takror bo'lib ko'rinardi.
const normOpt = (s) => String(s || '')
  .toLowerCase().replace(/[ʻʼ‘’'`´]/g, "'").replace(/\s+/g, ' ').trim();

const hasCyrillic = (s) => /[Ѐ-ӿ]/.test(String(s || ''));

// eng so'nggi Firestore zaxirasi — dublikat tekshiruvi uchun (bo'lsa)
function baseTexts(cat) {
  const dir = path.join(ROOT, 'src/data');
  if (!fs.existsSync(dir)) return null;
  const pre = `firestore_backup_${cat}_`;
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith(pre) && f.endsWith('.json'))
    .filter((f) => /^(typos_)?\d{4}-\d{2}-\d{2}T/.test(f.slice(pre.length)))
    .sort();
  if (!files.length) return null;
  const rows = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
  return { file: files[files.length - 1], set: new Set(rows.map((r) => norm(r.q))) };
}

// ── asosiy ────────────────────────────────────────────────────────────────
let grandOk = 0, grandSkip = 0, grandErr = 0;
const summary = [];

for (const cat of targets) {
  const reg = REGISTRY[cat];
  if (!reg) { console.error(`❌ Noma'lum fan: ${cat}`); process.exitCode = 1; continue; }

  const rel = parsedPath(cat);
  const srcPath = path.join(ROOT, rel);
  if (!fs.existsSync(srcPath)) { console.error(`❌ Manba yo'q: ${rel} — avval parse.mjs`); process.exitCode = 1; continue; }
  const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

  const keyPath = path.join(KEYS, `${cat}.json`);
  if (!fs.existsSync(keyPath)) {
    console.log(`⏭️  ${cat.padEnd(13)} kalit hali yozilmagan (${src.length} savol kutmoqda)`);
    continue;
  }
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const items = key.items || {};

  const base = baseTexts(cat);
  const errors = [];
  const rows = [];
  const seen = new Map();   // namuna to'plami ichidagi takrorlar
  let skipped = 0;

  // Kalit indeksi = parsed massivdagi O'RIN (1 dan). Asl test raqami (q.n)
  // art'da TEST A/TEST B uchun qaytadan boshlanadi, shuning uchun o'rin ishlatiladi.
  src.forEach((q, i) => {
    const n = i + 1;
    const tag = `#${n}${q.n && q.n !== n ? ` (asl ${q.section ? q.section + ' ' : ''}${q.n})` : ''}`;
    const k = items[String(n)];
    if (!k) { errors.push(`${tag}: kalitda yo'q`); return; }
    if (k.skip) { skipped++; return; }

    // Kalitdagi `q` — o'zak matnini almashtirish. Ayrim namunalarda ikki savol
    // bir blokka qo'shilib ketgan yoki o'zak chala ko'chgan; shunday holatda
    // to'g'ri matn kalitda qo'lda beriladi.
    const stem = k.q ? String(k.q).trim() : String(q.question).trim();

    const o = q.options || {};
    // 1) variantlar
    for (const L of LETTERS) {
      if (!o[L] || !String(o[L]).trim()) errors.push(`${tag}: ${L} varianti bo'sh`);
    }
    const vals = LETTERS.map((L) => normOpt(o[L]));
    if (new Set(vals).size !== 4) errors.push(`${tag}: variantlar orasida takror bor`);

    // 2) javob
    if (!LETTERS.includes(k.c)) { errors.push(`${tag}: javob "${k.c}" A/B/C/D emas`); return; }

    // 3) bo'lim
    if (!Number.isInteger(k.t) || k.t < reg.min || k.t > reg.max) {
      errors.push(`${tag}: topicId ${k.t} — ${reg.min}..${reg.max} oralig'ida emas`);
      return;
    }

    // 4) izoh
    if (!k.e || String(k.e).trim().length < 40) errors.push(`${tag}: izoh juda qisqa`);

    // 5) lotin-only
    for (const [f, v] of [['savol', stem], ['izoh', k.e], ['mnemonika', k.m]]) {
      if (hasCyrillic(v)) errors.push(`${tag}: ${f} da krill harf bor`);
    }

    // 6) takror (namuna ichida va bazaga nisbatan)
    const nq = norm(stem);
    if (seen.has(nq)) errors.push(`${tag}: #${seen.get(nq)} bilan bir xil savol`);
    else seen.set(nq, n);
    if (base?.set.has(nq)) errors.push(`${tag}: bazada ALLAQACHON bor`);

    rows.push({
      q: stem,
      opts: LETTERS.map((L) => `${L}) ${String(o[L]).trim()}`),
      correct: LETTERS.indexOf(k.c),
      explanation: String(k.e).trim(),
      ...(k.m ? { mnemonic: String(k.m).trim() } : {}),
      topicId: k.t,
      category: cat,
      source: 'namuna',      // demotest.uzedu.uz namuna testi — generatsiya emas
      verified: false,       // javob qo'lda aniqlangan; admin tasdig'i kutilmoqda
    });
  });

  // javob taqsimoti — hammasi bitta harfga tushib qolmaganini ko'rsatadi
  const dist = { A: 0, B: 0, C: 0, D: 0 };
  rows.forEach((r) => { dist[LETTERS[r.correct]]++; });

  const outPath = path.join(OUT, `${cat}.json`);
  if (errors.length) {
    console.log(`\n❌ ${cat} — ${errors.length} ta xato:`);
    errors.slice(0, 25).forEach((e) => console.log(`   ${e}`));
    if (errors.length > 25) console.log(`   … yana ${errors.length - 25} ta`);
    grandErr += errors.length;
    process.exitCode = 1;
  } else {
    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
    console.log(`✅ ${cat.padEnd(13)} ${String(rows.length).padStart(3)} savol → out/${cat}.json` +
      `  (chetga: ${skipped})  A/B/C/D = ${dist.A}/${dist.B}/${dist.C}/${dist.D}` +
      (base ? '' : '  ⚠️ zaxira yo\'q — dublikat tekshirilmadi'));
  }
  grandOk += rows.length; grandSkip += skipped;
  summary.push({ cat, ok: rows.length, skipped, errors: errors.length, total: src.length });
}

console.log('\n' + '─'.repeat(64));
console.log(`JAMI: ${grandOk} savol tayyor, ${grandSkip} chetga chiqarildi, ${grandErr} xato`);
if (grandErr) console.log('Xatolar tuzatilmaguncha out/ fayllari yozilmaydi.');
