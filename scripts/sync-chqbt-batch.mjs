import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';

async function main() {
  const chqbtPath = 'src/data/questions_chqbt.json';
  const list = JSON.parse(fs.readFileSync(chqbtPath, 'utf8'));

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`🔐 ${email} bilan Firebase ga kirilmoqda...`);
  await signInWithEmailAndPassword(auth, email, password);
  console.log('✓ Firebase ga muvaffaqiyatli kirildi.');

  const BATCH_SIZE = 400;
  let batch = writeBatch(db);
  let batchCount = 0;
  let totalUpdated = 0;

  console.log(`\n📤 Firestore 'questions' kolleksiyasiga ${list.length} ta savolni batch orqali yangilash...`);

  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (!q.id) continue;

    const docRef = doc(db, 'questions', q.id);
    batch.update(docRef, {
      opts: q.opts,
      correct: q.correct
    });
    batchCount++;
    totalUpdated++;

    if (batchCount === BATCH_SIZE || i === list.length - 1) {
      await batch.commit();
      console.log(`   ✅ ${totalUpdated}/${list.length} ta hujjat yangilandi`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  console.log(`\n🎉 BARCHASI TUGADI: ${totalUpdated} ta savol Firestore 'questions' kolleksiyasida yangilandi.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Xatolik:', err);
  process.exit(1);
});
