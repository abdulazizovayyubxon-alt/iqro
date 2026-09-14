#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// prepare-fan4-subjects.mjs — «fan 4» dagi tayyor bo'lim fayllarini ilova
// sxemasiga keltiradi va sifat darvozasidan o'tkazadi. TARMOQSIZ ishlaydi.
//
//   fan 4/<Fan>/bolimlar/NN_*.json  →  fan 4/_app/<category>.json
//
// Fanlar va topicId oraliqlari (firestore.rules / mockData.js bilan bir xil):
//   matematika 146–153 · tarbiya 154–166 · pedmahorat 167–176
//
// Bo'lim → topicId FAYL TARTIBIDAN olinadi. Fayllardagi `topicId` maydoniga
// ishonilmaydi: pedmahorat'da u "04_pedagogik_texnika_..." kabi satr ham,
// tarbiya'da esa fan ichidagi 1–13 raqami. 09–10-fayllar esa `question` /
// `options` nomli maydonlar bilan yozilgan — ikkala shakl ham qabul qilinadi.
//
// Chiqish sxemasi (Firestore `questions`):
//   { q, opts[4], correct, explanation, mnemonic, topicId, category,
//     difficulty?('Y1'|'Y2'|'Y3'), createdBy }  +  docId (hujjat ID'si)
//
// docId = `<category>_<NNNN>` (manba fayldagi id). DETERMINISTIK, chunki:
//   · yuklash kvota tufayli yarim yo'lda uzilsa, qayta ishga tushirish
//     dublikat emas, o'sha hujjatni qayta yozadi;
//   · keyingi tuzatish ham shu hujjatga JOYIDA yoziladi.
// ⚠️ `id` MAYDONI YOZILMAYDI: build-fs-bundle.mjs `{ id: d.id, ...d.data() }`
//   qiladi — maydondagi `id` hujjat ID'sini bosib ketardi.
//
// TUZATISHLAR QATLAMI — `fan 4/_app/overrides/<category>.json`:
//   { "<manba id>": { "opts": [4 ta variant] } }
//   Variantlar TO'LIQ almashtiriladi, `correct` indeksi o'zgarmaydi. Manba
//   fayllarga (bolimlar/) tegilmaydi — tuzatish alohida turadi va har yurishda
//   qayta qo'llanadi. Asosiy maqsad: to'g'ri javob uzunligidan sezilib qolmasin
//   (Tarbiya spetsifikatsiyasi: to'g'ri javob ≤ 1.25 × chalg'ituvchilar o'rtachasi).
//
// DARVOZA — savol TASHLANADI: sxema buzilgan; bitta savolda bir xil variant;
//   fan ichida takror matn; qo'lda yechib, xatosi tasdiqlanganlar (EXCLUDE).
// HISOBOT — faqat o'lchanadi: to'g'ri javob eng uzun variant bo'lgan ulush va
//   uzunlik bo'yicha sezilib qolish (>1.25×).
//
// FOYDALANISH:  node scripts/prepare-fan4-subjects.mjs
// Keyin:        node scripts/upload-fan4-subjects.mjs --dry-run
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'fan 4';
const OUT_DIR = path.join(ROOT, '_app');
const OVERRIDES_DIR = path.join(OUT_DIR, 'overrides');

// `parts` — fan bir nechta bo'lim papkasidan yig'ilishi mumkin. pedmahorat —
// maktab va MTT pedagoglari uchun UMUMIY fan: `bolimlar/` MTT yo'nalishi
// (167–176), `bolimlar_maktab/` maktab yo'nalishi (204–207). Manba id'lari
// fan ichida yagona bo'lishi shart (maktab yo'nalishi 5001 dan boshlanadi).
// `optional` — papka hali yo'q bo'lsa jim o'tkazib yuboriladi.
const FAN4 = [
  { category: 'matematika', folder: 'Matematika', parts: [{ dir: 'bolimlar', base: 146, sections: 8 }] },
  { category: 'tarbiya', folder: 'Tarbiya', parts: [{ dir: 'bolimlar', base: 154, sections: 13 }] },
  { category: 'pedmahorat', folder: 'Pedagogik mahorat va kasbiy standartlar', parts: [
    { dir: 'bolimlar', base: 167, sections: 10 },
    { dir: 'bolimlar_maktab', base: 204, sections: 4, optional: true },
  ] },
  { category: 'fizika', folder: 'Fizika', parts: [{ dir: 'bolimlar', base: 177, sections: 9 }] },
  { category: 'texnologiya_dizayn', folder: 'Texnologiya (Dizayn)', parts: [{ dir: 'bolimlar', base: 186, sections: 10 }] },
  { category: 'texnologiya_servis', folder: 'Texnologiya (Servis)', parts: [{ dir: 'bolimlar', base: 196, sections: 8 }] },
];

// Qo'lda yechib tekshirilgan (2026-09-13): shart yoki kalit xato.
const EXCLUDE = {
  matematika: {
    1: "τ(N)=120 / 12|d→70 / 15|d→64 tizimining butun yechimi yo'q; izoh o'zini o'zi inkor qiladi",
    45: "x + ⌊x⌋ = 7.4 yechimsiz (3.2 < n ≤ 3.7 oralig'ida butun son yo'q); belgilangan 4.4 → 8.4",
    461: "to'g'ri soha [2; 2.25), belgilangan kalit (1.75; 2]",
    472: "ildizlar ±4√5, modullar yig'indisi 8√5 ≈ 17.9; belgilangan kalit 20",
  },
};

const Y_TYPES = new Set(['Y1', 'Y2', 'Y3']);
const stripLetter = (s) => String(s ?? '').replace(/^\s*[A-D]\)\s*/, '').trim();
// Takrorni aniqlash uchun: faqat registr, apostrof shakli va bo'shliq.
// Belgilar ATAYLAB olib tashlanmaydi — matematikada `$x^2$` va `$x_2$`
// kabi farqli variantlar bir xil bo'lib qolardi (148 ta soxta takror).
const normText = (s) => String(s || '').toLowerCase().replace(/[`‘’ʻʼ']/g, "'").replace(/\s+/g, ' ').trim();

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');

fs.mkdirSync(OUT_DIR, { recursive: true });
const report = { generatedAt: new Date().toISOString(), subjects: {} };
let hardError = false;

for (const s of FAN4) {
  // Bo'lim fayllari: har qism papkasida NN_*.json, topicId = qism bazasi + tartib raqami
  const sources = [];
  let partError = false;
  for (const part of s.parts) {
    const dir = path.join(ROOT, s.folder, part.dir);
    if (!fs.existsSync(dir) && part.optional) continue;
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{2}_.+\.json$/.test(f)).sort() : [];
    if (files.length !== part.sections) {
      console.error(`❌ ${s.category}/${part.dir}: ${part.sections} ta bo'lim fayli kutilgan, topildi ${files.length}`);
      partError = true;
      continue;
    }
    files.forEach((file, idx) => sources.push({ dir, file, topicId: part.base + idx }));
  }
  if (partError) { hardError = true; continue; }

  const ovPath = path.join(OVERRIDES_DIR, `${s.category}.json`);
  const overrides = fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, 'utf8')) : {};
  const usedOverrides = new Set();

  const out = [];
  const seenIds = new Set();
  const seenText = new Map();
  const dropped = {};
  const perTopic = {};
  const drop = (reason, ref) => { (dropped[reason] ||= []).push(ref); };

  sources.forEach(({ dir, file, topicId }) => {
    const rows = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const raw of rows) {
      const srcId = Number(raw.id);
      const ref = `${file}#${raw.id}`;
      if (!Number.isInteger(srcId) || srcId <= 0 || seenIds.has(srcId)) {
        console.error(`❌ ${s.category}: id yaroqsiz yoki takror — ${ref} (docId shunga tayanadi)`);
        hardError = true;
        continue;
      }
      seenIds.add(srcId);

      if (EXCLUDE[s.category]?.[srcId]) { drop('qo\'lda tekshirilgan xato', `${ref} — ${EXCLUDE[s.category][srcId]}`); continue; }

      const q = String(raw.q ?? raw.question ?? '').trim();
      const optsRaw = raw.opts ?? raw.options;
      const correct = raw.correct;
      const explanation = String(raw.explanation ?? '').trim();
      if (q.length < 15) { drop('savol matni yo\'q/qisqa', ref); continue; }
      if (!Array.isArray(optsRaw) || optsRaw.length !== 4) { drop('variantlar 4 ta emas', ref); continue; }

      const ov = overrides[srcId];
      if (ov && (!Array.isArray(ov.opts) || ov.opts.length !== 4)) {
        console.error(`❌ ${s.category}: tuzatish yaroqsiz — ${ref} (opts 4 ta bo'lishi shart)`);
        hardError = true;
        continue;
      }
      if (ov) usedOverrides.add(String(srcId));
      const opts = (ov ? ov.opts : optsRaw).map(stripLetter);

      if (opts.some((o) => !o)) { drop('bo\'sh variant', ref); continue; }
      if (new Set(opts.map(normText)).size !== 4) { drop('bir xil variant', ref); continue; }
      if (!Number.isInteger(correct) || correct < 0 || correct > 3) { drop('correct indeksi yaroqsiz', ref); continue; }
      if (explanation.length < 10) { drop('izoh yo\'q', ref); continue; }

      const key = normText(q);
      if (seenText.has(key)) { drop('takror savol matni', `${ref} = ${seenText.get(key)}`); continue; }
      seenText.set(key, ref);

      const rec = {
        docId: `${s.category}_${String(srcId).padStart(4, '0')}`,
        q,
        opts,
        correct,
        explanation,
        mnemonic: String(raw.mnemonic ?? '').trim(),
        topicId,
        category: s.category,
        createdBy: 'fan4_import',
      };
      if (Y_TYPES.has(raw.question_type)) rec.difficulty = raw.question_type;
      out.push(rec);
      perTopic[topicId] = (perTopic[topicId] || 0) + 1;
    }
  });

  // Manbada topilmagan tuzatish — id adashgan bo'lishi mumkin
  const orphan = Object.keys(overrides).filter((id) => !usedOverrides.has(id));
  if (orphan.length) console.warn(`⚠️  ${s.category}: manbada yo'q ${orphan.length} ta tuzatish: ${orphan.slice(0, 10).join(', ')}`);

  // ── Faqat o'lchov: javob kaliti joylashuvi va uzunlik bo'yicha sezilib qolish
  const keyPos = [0, 0, 0, 0];
  let longest = 0, giveaway = 0;
  for (const r of out) {
    keyPos[r.correct]++;
    const lens = r.opts.map((o) => o.length);
    if (lens.indexOf(Math.max(...lens)) === r.correct) longest++;
    const avg = lens.filter((_, i) => i !== r.correct).reduce((a, b) => a + b, 0) / 3;
    if (lens[r.correct] > avg * 1.25) giveaway++;
  }

  const outFile = path.join(OUT_DIR, `${s.category}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const droppedCount = Object.values(dropped).reduce((a, b) => a + b.length, 0);
  report.subjects[s.category] = {
    ready: out.length, dropped: droppedCount, droppedByReason: dropped, perTopic, overridden: usedOverrides.size,
    keyPositions: keyPos, correctIsLongest: pct(longest, out.length), lengthGiveaway125: pct(giveaway, out.length),
  };

  console.log(`\n✓ ${s.category.padEnd(11)} ${out.length} savol tayyor → ${outFile}`);
  console.log(`   bo'limlar: ${Object.entries(perTopic).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log(`   tashlandi: ${droppedCount}${droppedCount ? ' — ' + Object.entries(dropped).map(([k, v]) => `${k} ${v.length}`).join(', ') : ''}`);
  console.log(`   tuzatish qo'llandi: ${usedOverrides.size}`);
  console.log(`   kalit A/B/C/D: ${keyPos.join('/')} · to'g'ri = eng uzun: ${pct(longest, out.length)} · >1.25× uzun: ${pct(giveaway, out.length)}`);
}

fs.writeFileSync(path.join(OUT_DIR, '_report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
if (hardError) {
  console.error('\n❌ Jiddiy xato bor — yuklamang.');
  process.exit(1);
}
console.log(`\n📄 Hisobot: ${path.join(OUT_DIR, '_report.json')}`);
