#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// backup-firestore.mjs — Jonli 'questions' bazasidan fan bo'yicha zaxira dump.
//
// Chiqish: src/data/firestore_backup_<fan>_<YYYY-MM-DDTHH-mm-ss>.json
// Format mavjud zaxiralar bilan bir xil:
//   { __docId, createdAt (ISO string), opts, q, topicId, correct, category, explanation, mnemonic }
//
// FOYDALANISH:
//   node scripts/backup-firestore.mjs kimyo rus_tili ingliz
//   node scripts/backup-firestore.mjs --all      # mockData'dagi barcha kategoriyalar emas — quyidagi ro'yxat
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const ALL = ['chqbt', 'art', 'tarix', 'sport', 'boshlangich', 'info', 'mtt', 'mtt_rahbar',
             'til', 'biologiya', 'geografiya', 'mtt_logoped', 'mtt_psixolog', 'kimyo', 'rus_tili', 'ingliz'];

const argv = process.argv.slice(2);
const fans = argv.includes('--all') ? ALL : argv.filter((a) => !a.startsWith('--'));
if (!fans.length) {
  console.log('Foydalanish: node scripts/backup-firestore.mjs <fan> [<fan>...] | --all');
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q"); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
console.log(`🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(getAuth(app), email, password);
const db = getFirestore(app);

const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const outDir = path.join('src', 'data');
fs.mkdirSync(outDir, { recursive: true });

// Firestore Timestamp → ISO satr (mavjud zaxira formati bilan bir xil)
const toIso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  return null;
};

let grand = 0;
for (const fan of fans) {
  const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', fan)));
  if (snap.empty) { console.log(`⏭️  ${fan.padEnd(13)} savol topilmadi — o'tkazildi`); continue; }
  const rows = [];
  snap.forEach((d) => {
    const x = d.data();
    rows.push({
      __docId: d.id,
      createdAt: toIso(x.createdAt),
      opts: x.opts,
      q: x.q,
      topicId: x.topicId,
      correct: x.correct,
      category: x.category,
      explanation: x.explanation ?? '',
      mnemonic: x.mnemonic ?? '',
    });
  });
  rows.sort((a, b) => (a.__docId < b.__docId ? -1 : 1));
  const file = path.join(outDir, `firestore_backup_${fan}_${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
  const mb = (fs.statSync(file).size / 1048576).toFixed(2);
  console.log(`✅ ${fan.padEnd(13)} ${String(rows.length).padEnd(6)} savol → ${file} (${mb} MB)`);
  grand += rows.length;
}
console.log(`\n📊 Jami: ${grand} ta savol zaxiralandi.`);
process.exit(0);
