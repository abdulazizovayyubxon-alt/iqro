#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// fix-case-collapse.mjs — `case_top*` seriyasidagi 178 ta AYNAN takrorni
// tuzatadi.
//
// NIMA BO'LGAN (2026-08-30 tahlili):
//   `scratch/chqbt_500_new_master_questions.json` — 500 ta savol, HAMMASI
//   noyob. Shu fayl `src/data/questions_chqbt.json` ga qo'shilishidan oldin
//   savol matnini qayta yozadigan bosqichdan o'tgan («[Mavzu: ...]» prefiksi
//   o'sha bosqichdan). Bosqich `calc_*` seriyasini to'g'ri qayta yozgan
//   (300 ta, hammasi noyob), LEKIN `case_*` seriyasida bir mavzuning BARCHA
//   ID'lariga BITTA savol matnini yozib qo'ygan:
//       case_top4_001 … case_top4_015  →  15 ta ID, 1 ta savol
//       case_top1_001 … case_top1_070  →  70 ta ID, 5 ta savol
//   Natijada 200 ta case yozuvidan atigi 22 tasi noyob qolgan (178 takror).
//
// TUZATISH: 200 ta `case_top*` yozuvi masterdagi AYNAN SHU ID li yozuv bilan
//   almashtiriladi. Master tekshirildi: 200 ta noyob, opts=4, correct 0..3,
//   topicId seriya raqamiga mos, izoh bor, mavzu taqsimoti bir xil
//   (t0:50 t1:70 t2:25 t3:15 t4:15 t5:15 t6:10).
//
// FOYDALANISH:
//   node pipeline/chqbt600/fix-case-collapse.mjs           # quruq yurish
//   node pipeline/chqbt600/fix-case-collapse.mjs --apply
// ════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { normalizeQuestion } from '../../src/utils/qHash.js';

const APPLY = process.argv.includes('--apply');
const APP = 'src/data/questions_chqbt.json';
const MASTER = 'scratch/chqbt_500_new_master_questions.json';

const app = JSON.parse(fs.readFileSync(APP, 'utf8'));
const master = JSON.parse(fs.readFileSync(MASTER, 'utf8'));
const mById = new Map(master.filter((q) => /^case_top/.test(String(q.id || ''))).map((q) => [q.id, q]));

console.log(APPLY ? '🔴 REJIM: JONLI' : '🟢 REJIM: QURUQ YURISH');
console.log(`📄 ${APP}: ${app.length} ta savol`);

const dupsBefore = app.length - new Set(app.map((q) => normalizeQuestion(q.q)).filter(Boolean)).size;
console.log(`   takror (oldin): ${dupsBefore}`);

let swapped = 0, notFound = [];
const out = app.map((q) => {
  if (!/^case_top/.test(String(q.id || ''))) return q;
  const m = mById.get(q.id);
  if (!m) { notFound.push(q.id); return q; }
  swapped++;
  return m;
});

console.log(`   almashtiriladi : ${swapped} ta case_top* yozuvi`);
if (notFound.length) console.log(`   ⚠️ masterda topilmadi: ${notFound.length} — ${notFound.slice(0, 5).join(', ')}`);

// ── Tekshiruv: natija toza va yaroqli bo'lishi SHART ──
const texts = out.map((q) => normalizeQuestion(q.q)).filter(Boolean);
const dupsAfter = out.length - new Set(texts).size;
const invalid = out.filter((q) =>
  !Array.isArray(q.opts) || q.opts.length !== 4 ||
  !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3 ||
  !Number.isInteger(q.topicId) || q.category !== 'chqbt');
console.log(`\n   jami (keyin)   : ${out.length}`);
console.log(`   takror (keyin) : ${dupsAfter}`);
console.log(`   yaroqsiz yozuv : ${invalid.length}`);
if (invalid.length) { console.error('❌ Yaroqsiz yozuv bor — yozilmadi'); process.exit(1); }
if (dupsAfter > 0) { console.error(`❌ Takror qolyapti (${dupsAfter}) — yozilmadi`); process.exit(1); }

if (!APPLY) { console.log('\n(quruq yurish — fayl o\'zgarmadi. Jonli: --apply)'); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `src/data/backup_chqbt_case_fix_${stamp}.json`;
fs.copyFileSync(APP, backup);
fs.writeFileSync(APP, JSON.stringify(out, null, 2));
console.log(`\n💾 Zaxira: ${backup}`);
console.log(`✅ ${APP}: ${dupsBefore} takror → 0`);
