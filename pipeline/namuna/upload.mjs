#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// upload.mjs — pipeline/namuna/out/*.json → Firestore `questions`.
//
// Ilova savollarni Firestore'dan o'qiydi (settings/version.urls ataylab
// bo'sh — bump-questions-version.mjs izohiga qarang). Shuning uchun
// yuklashdan keyin MAJBURIY:
//     node scripts/bump-questions-version.mjs
// aks holda eski foydalanuvchilar keshdagi eski to'plamni ko'raveradi.
//
// FOYDALANISH:
//   node pipeline/namuna/upload.mjs --dry-run        # nima yoziladi
//   node pipeline/namuna/upload.mjs                  # JONLI
//   node pipeline/namuna/upload.mjs --subject tarix  # bitta fan
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, limit, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { REGISTRY } from './registry.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'pipeline/namuna/out');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const only = argv.includes('--subject') ? argv[argv.indexOf('--subject') + 1] : null;

// ── Yuklanadigan ma'lumot ─────────────────────────────────────────────────
if (!fs.existsSync(OUT)) { console.error('❌ out/ yo\'q — avval build.mjs ni ishga tushiring'); process.exit(1); }
const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json`);
if (!files.length) { console.error('❌ out/ bo\'sh yoki fan topilmadi'); process.exit(1); }

const payload = [];
for (const f of files) {
  const cat = f.replace(/\.json$/, '');
  const reg = REGISTRY[cat];
  if (!reg) { console.error(`❌ Reyestrda yo'q: ${cat}`); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  for (const [i, q] of rows.entries()) {
    const bad =
      !q.q || q.q.length < 10 ||
      !Array.isArray(q.opts) || q.opts.length !== 4 || q.opts.some((o) => !o || !o.trim()) ||
      !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3 ||
      !q.explanation || q.explanation.length < 40 ||
      q.category !== cat ||
      !Number.isInteger(q.topicId) || q.topicId < reg.min || q.topicId > reg.max;
    if (bad) { console.error(`❌ ${cat} #${i + 1} yaroqsiz (sxema/topicId/category)`); process.exit(1); }
  }
  payload.push({ cat, rows });
  console.log(`✓ ${cat.padEnd(13)} ${String(rows.length).padStart(3)} savol tayyor (topicId ${reg.min}-${reg.max})`);
}
const total = payload.reduce((a, p) => a + p.rows.length, 0);
console.log(`\n📦 Jami: ${total} savol${dryRun ? ' | DRY-RUN — hech narsa yozilmaydi' : ''}`);

if (dryRun) {
  for (const p of payload) {
    const byTopic = {};
    p.rows.forEach((r) => { byTopic[r.topicId] = (byTopic[r.topicId] || 0) + 1; });
    console.log(`   ${p.cat.padEnd(13)} bo'limlar: ${Object.entries(byTopic).map(([t, n]) => `${t}:${n}`).join(' ')}`);
  }
  process.exit(0);
}

// ── Firebase ──────────────────────────────────────────────────────────────
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error('❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo\'q'); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);
console.log(`\n🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(getAuth(app), email, password);

// Takroriy yurishdan himoya: bu fandan `source: 'namuna'` savol bormi?
let written = 0;
for (const p of payload) {
  const probe = await getDocs(query(
    collection(db, 'questions'),
    where('category', '==', p.cat), where('source', '==', 'namuna'), limit(1),
  ));
  if (!probe.empty) {
    console.log(`\n⏭️  ${p.cat}: namuna savollari ALLAQACHON yuklangan — o'tkazib yuborildi`);
    continue;
  }

  console.log(`\n📤 ${p.cat}: ${p.rows.length} ta savol yuklanmoqda`);
  const SIZE = 400;
  for (let i = 0; i < p.rows.length; i += SIZE) {
    const chunk = p.rows.slice(i, i + SIZE);
    const batch = writeBatch(db);
    for (const q of chunk) {
      batch.set(doc(collection(db, 'questions')), { ...q, createdAt: serverTimestamp() });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`   ✅ ${Math.min(i + SIZE, p.rows.length)}/${p.rows.length}`);
  }
}

console.log(`\n📊 Yakun: ${written} savol yuklandi.`);
console.log('⚠️  ENDI SHART:  node scripts/bump-questions-version.mjs');
process.exit(0);
