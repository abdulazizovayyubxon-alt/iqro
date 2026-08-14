#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// upload-new-subjects.mjs — YANGI fanlar bankini Firestore'ga yuklaydi.
//
// fan/<slug>/_app.json  →  Firestore 'questions' kolleksiyasi.
// Sxema: { q, opts[4], correct(0-3), explanation, topicId, category, createdAt }
//
// XAVFSIZLIK:
//   • Avval har fan uchun Firestore'dagi MAVJUD sonni tekshiradi. Agar 0 dan katta
//     bo'lsa — DUBLIKAT yaratmaslik uchun o'sha fanni O'TKAZIB YUBORADI (--force bilan majburlash).
//   • Partiya (batch) 400 tadan — Firestore limiti 500.
//   • --dry-run bilan hech narsa yozilmaydi.
//
// FOYDALANISH:
//   node scripts/upload-new-subjects.mjs --dry-run          # nima bo'lishini ko'rsatadi
//   node scripts/upload-new-subjects.mjs                    # uchala fanni yuklaydi
//   node scripts/upload-new-subjects.mjs --subject kimyo    # faqat bitta fan
//
// ESLATMA: firestore.rules da topicId 114-136 uchun ruxsat DEPLOY qilingan bo'lishi shart,
// aks holda yozuvlar "permission-denied" bilan rad etiladi.
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
// Eslatma: getCountFromServer (count aggregation) bu loyihada RESOURCE_EXHAUSTED beradi —
// shuning uchun mavjudlikni limit(1) bilan tekshiramiz (arzon va kvotaga urilmaydi).
import { getFirestore, collection, query, where, limit, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');
const only = argv.includes('--subject') ? argv[argv.indexOf('--subject') + 1] : null;

const SUBJECTS = [
  { slug: 'kimyo',    file: 'fan/kimyo/_app.json',    min: 114, max: 120 },
  { slug: 'rus_tili', file: 'fan/rus_tili/_app.json', min: 121, max: 128 },
  { slug: 'ingliz',   file: 'fan/ingliz/_app.json',   min: 129, max: 136 },
  { slug: 'mtt_jismoniy', file: 'fan/mtt_jismoniy/_app.json', min: 137, max: 145 },
].filter((s) => !only || s.slug === only);

if (!SUBJECTS.length) { console.error(`❌ Noma'lum fan: ${only}`); process.exit(1); }

// ── Yuklanadigan ma'lumotni tekshirish ────────────────────────────────────
const payload = [];
for (const s of SUBJECTS) {
  if (!fs.existsSync(s.file)) { console.error(`❌ Fayl yo'q: ${s.file}`); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(s.file, 'utf8'));
  for (const [i, q] of rows.entries()) {
    const bad =
      !q.q || q.q.length < 10 ||
      !Array.isArray(q.opts) || q.opts.length !== 4 ||
      !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3 ||
      q.category !== s.slug ||
      !Number.isInteger(q.topicId) || q.topicId < s.min || q.topicId > s.max;
    if (bad) { console.error(`❌ ${s.slug} #${i} yaroqsiz (sxema/topicId/category)`); process.exit(1); }
  }
  payload.push({ ...s, rows });
  console.log(`✓ ${s.slug.padEnd(9)} ${rows.length} savol tayyor (topicId ${s.min}-${s.max})`);
}

// ── Firebase ──────────────────────────────────────────────────────────────
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error('❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo\'q'); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

console.log(`\n🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(auth, email, password);

let totalWritten = 0;
for (const s of payload) {
  const probe = await getDocs(query(collection(db, 'questions'), where('category', '==', s.slug), limit(1)));
  if (!probe.empty && !force) {
    console.log(`\n⏭️  ${s.slug}: Firestore'da bu fandan savol ALLAQACHON bor — O'TKAZIB YUBORILDI (dublikat bo'lmasligi uchun; majburlash: --force)`);
    continue;
  }
  console.log(`\n📤 ${s.slug}: ${s.rows.length} ta savol yuklanmoqda${dryRun ? ' | DRY-RUN' : ''}`);
  if (dryRun) { totalWritten += s.rows.length; continue; }

  const SIZE = 400;
  for (let i = 0; i < s.rows.length; i += SIZE) {
    const chunk = s.rows.slice(i, i + SIZE);
    const batch = writeBatch(db);
    for (const q of chunk) {
      batch.set(doc(collection(db, 'questions')), {
        q: q.q,
        opts: q.opts,
        correct: q.correct,
        explanation: q.explanation || '',
        topicId: q.topicId,
        category: q.category,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
    totalWritten += chunk.length;
    console.log(`   ✅ ${Math.min(i + SIZE, s.rows.length)}/${s.rows.length}`);
  }
}

// ── Yakuniy tekshiruv ─────────────────────────────────────────────────────
if (!dryRun) {
  console.log('\n🔎 Yakuniy tekshiruv (mavjudlik):');
  for (const s of payload) {
    const probe = await getDocs(query(collection(db, 'questions'), where('category', '==', s.slug), limit(1)));
    console.log(`   ${s.slug.padEnd(9)} ${probe.empty ? '❌ topilmadi' : '✅ Firestore\'da mavjud'}`);
  }
}
console.log(`\n📊 Yakun: ${totalWritten} ta savol ${dryRun ? 'yuklanadi (dry-run)' : 'yuklandi'}.`);
process.exit(0);
