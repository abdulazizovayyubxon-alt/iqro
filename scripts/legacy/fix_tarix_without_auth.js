/**
 * fix_tarix_without_auth.js
 * Shuffles Tarix questions (topicId 15-22) without authentication.
 * Requires temporary 'allow read, write: if true;' rule on /questions/{docId} collection.
 */
import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shuffleWithCorrect = (opts, correctIdx) => {
  const arr = [...opts];
  const correctText = arr[correctIdx] || arr[0];
  
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  const newCorrectIdx = arr.findIndex(o => o === correctText);
  const letters = ['A', 'B', 'C', 'D'];
  const relabeled = arr.map((opt, idx) => {
    const text = opt.replace(/^[A-D]\)\s*/, '');
    return `${letters[idx]}) ${text}`;
  });
  return { opts: relabeled, correct: newCorrectIdx !== -1 ? newCorrectIdx : 0 };
};

async function main() {
  console.log("🔍 Tarix savollarini yuklamoqda...");
  const allDocsSnap = await getDocs(collection(db, 'questions'));
  
  const tarixDocs = allDocsSnap.docs.filter(d => {
    const data = d.data();
    return (data.topicId >= 15 && data.topicId <= 22);
  });
  
  console.log(`\n🔀 ${tarixDocs.length} ta Tarix savoli topildi. Aralashtirilmoqda...`);
  
  if (tarixDocs.length === 0) {
    console.log("❌ Tarix savollari topilmadi!");
    process.exit(1);
  }
  
  const BATCH_LIMIT = 400;
  for (let i = 0; i < tarixDocs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = tarixDocs.slice(i, i + BATCH_LIMIT);
    
    chunk.forEach(docSnap => {
      const data = docSnap.data();
      if (Array.isArray(data.opts) && data.opts.length >= 4) {
        const { opts: newOpts, correct: newCorrect } = shuffleWithCorrect(data.opts, data.correct ?? 0);
        batch.update(doc(db, 'questions', docSnap.id), { opts: newOpts, correct: newCorrect });
      }
    });
    
    await batch.commit();
    process.stdout.write(`\r⏳ ${i + chunk.length}/${tarixDocs.length} bajarildi`);
  }
  
  console.log("\n\n✅ Tarix savollari muvaffaqiyatli aralashtirildi!");
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Xatolik:", e);
  process.exit(1);
});
