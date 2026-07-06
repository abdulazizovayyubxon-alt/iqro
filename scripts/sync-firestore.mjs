#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// sync-firestore.mjs — Lokal JSON'dagi tuzatishlarni Firestore'ga sinxronlash.
//
// fix-questions.mjs lokal faylni tuzatgandan KEYIN ishga tushiriladi.
// Eski (.bak) va yangi JSON'ni solishtirib, o'zgargan savollarni topadi,
// so'ng Firestore'dagi 'questions' kolleksiyasidan ESKI matn bo'yicha
// hujjatni qidirib, JOYIDA yangilaydi:
//   • hujjat ID o'zgarmaydi (statistika/tarix buzilmaydi)
//   • dublikat yaratilmaydi (admin panel yuklashidan farqli)
//   • faqat q / opts / explanation yangilanadi — correct, topicId,
//     category, mnemonic maydonlariga tegilmaydi.
//
// FOYDALANISH:
//   node scripts/sync-firestore.mjs chqbt --dry-run   # nima o'zgarishini ko'rsatadi
//   node scripts/sync-firestore.mjs chqbt             # Firestore'ga yozadi
//   node scripts/sync-firestore.mjs chqbt --base src/data/questions_chqbt.bak-....json
//
// Login: .env dagi ADMIN_EMAIL / ADMIN_PASSWORD (firestore.rules bo'yicha admin).
// Eski nusxa: --base berilmasa, eng yangi .bak-* fayli olinadi.
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// ── CLI ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const fan = argv.find((a) => !a.startsWith('--'));
const dryRun = argv.includes('--dry-run');
const baseArgIdx = argv.indexOf('--base');
const baseOverride = baseArgIdx !== -1 ? argv[baseArgIdx + 1] : null;

if (!fan) {
  console.log('Foydalanish: node scripts/sync-firestore.mjs <fan> [--dry-run] [--base <eski.json>]');
  process.exit(1);
}

// ── Fayllarni yuklash ─────────────────────────────────────────────────────
const dataDir = path.join('src', 'data');
const newFile = path.join(dataDir, `questions_${fan}.json`);
if (!fs.existsSync(newFile)) { console.error(`❌ Fayl topilmadi: ${newFile}`); process.exit(1); }

let baseFile = baseOverride;
if (!baseFile) {
  const baks = fs.readdirSync(dataDir)
    .filter((f) => f.startsWith(`questions_${fan}.bak-`) && f.endsWith('.json'))
    .sort();
  if (!baks.length) {
    console.error(`❌ ${fan} uchun .bak fayl topilmadi. --base bilan eski nusxani ko'rsating.`);
    process.exit(1);
  }
  baseFile = path.join(dataDir, baks[baks.length - 1]); // eng yangisi
}

const oldQ = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const newQ = JSON.parse(fs.readFileSync(newFile, 'utf8'));
if (oldQ.length !== newQ.length) {
  console.error(`❌ Savollar soni mos emas: eski ${oldQ.length}, yangi ${newQ.length}. --base to'g'ri faylni ko'rsating.`);
  process.exit(1);
}

// ── O'zgarishlarni aniqlash ───────────────────────────────────────────────
const sameOpts = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, k) => x === b[k]);
const changes = [];
for (let i = 0; i < oldQ.length; i++) {
  const o = oldQ[i], n = newQ[i];
  const diff = {};
  if (o.q !== n.q) diff.q = n.q;
  if (!sameOpts(o.opts, n.opts)) diff.opts = n.opts;
  if ((o.explanation || '') !== (n.explanation || '')) diff.explanation = n.explanation;
  if (Object.keys(diff).length) changes.push({ i, old: o, diff });
}

console.log(`\n📄 Eski nusxa: ${baseFile}`);
console.log(`📄 Yangi nusxa: ${newFile}`);
console.log(`🔍 O'zgargan savollar: ${changes.length} ta${dryRun ? ' | DRY-RUN (Firestore\'ga yozilmaydi)' : ''}\n`);
if (!changes.length) { console.log('✨ Sinxronlash uchun o\'zgarish yo\'q.'); process.exit(0); }

// ── Firebase ulanish ──────────────────────────────────────────────────────
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error('❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo\'q'); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

console.log(`🔐 ${email} bilan kirilmoqda...`);
await signInWithEmailAndPassword(auth, email, password);

// ── Firestore'dan fan savollarini olish ───────────────────────────────────
// Matn taqqoslash uchun normalizatsiya: apostrof variantlari + bo'shliqlar
const norm = (s) => (s || '')
  .replace(/[‘’ʻʼ´`]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', fan)));
console.log(`☁️  Firestore'da '${fan}' kategoriyasida ${snap.size} ta savol bor\n`);

const byText = new Map(); // norm(q) -> [{id, data}]
snap.forEach((d) => {
  const k = norm(d.data().q);
  if (!byText.has(k)) byText.set(k, []);
  byText.get(k).push({ id: d.id, data: d.data() });
});

// ── Har bir o'zgarishni moslashtirib yangilash ────────────────────────────
let updated = 0, already = 0, notFound = 0, skipped = 0;

for (const ch of changes) {
  const label = `#${ch.i} "${ch.old.q.slice(0, 60)}..."`;
  let matches = byText.get(norm(ch.old.q)) || [];

  if (!matches.length) {
    // Balki allaqachon sinxronlangan — yangi matn bo'yicha ham qidiramiz
    const byNew = byText.get(norm(newQ[ch.i].q)) || [];
    if (byNew.length) {
      console.log(`♻️  ${label} — Firestore'da allaqachon yangi matn turibdi`);
      already++;
      continue;
    }
    console.log(`❓ ${label} — Firestore'da topilmadi (qo'lda tekshiring)`);
    notFound++;
    continue;
  }

  for (const m of matches) {
    // Xavfsizlik: variantlar soni mos bo'lsin
    if (Array.isArray(m.data.opts) && ch.old.opts && m.data.opts.length !== ch.old.opts.length) {
      console.log(`⚠️  ${label} [doc ${m.id}] — variantlar soni mos emas, o'tkazib yuborildi`);
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`📝 ${label} [doc ${m.id}] — yangilanadi: ${Object.keys(ch.diff).join(', ')}`);
      updated++;
      continue;
    }
    await updateDoc(doc(db, 'questions', m.id), ch.diff);
    console.log(`✅ ${label} [doc ${m.id}] — yangilandi: ${Object.keys(ch.diff).join(', ')}`);
    updated++;
  }
}

console.log(`\n📊 Yakun: ${updated} ta ${dryRun ? 'yangilanadi (dry-run)' : 'yangilandi'} | ${already} ta allaqachon yangi | ${notFound} ta topilmadi | ${skipped} ta o'tkazildi`);
process.exit(0);
