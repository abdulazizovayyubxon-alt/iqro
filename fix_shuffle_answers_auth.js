import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "iqro-platforma.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "iqro-platforma",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "iqro-platforma.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637089963772",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:637089963772:web:a4165d8ae157986cbac179",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Shuffling options helper
const shuffleWithCorrect = (opts, correctIdx) => {
  const arr = [...opts];
  const correctText = arr[correctIdx] || arr[0];
  
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  const newCorrectIdx = arr.indexOf(correctText) !== -1 ? arr.indexOf(correctText) : 0;
  const letters = ['A', 'B', 'C', 'D'];
  const relabeled = arr.map((opt, i) => {
    const text = opt.replace(/^[A-D]\)\s*/, '');
    return `${letters[i]}) ${text}`;
  });
  return { opts: relabeled, correct: newCorrectIdx };
};

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("❌ Iltimos, parolni argument sifatida kiriting: node fix_shuffle_answers_auth.js <password>");
    process.exit(1);
  }

  const email = "998999154686@iqro.uz";
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Tizimga muvaffaqiyatli kirildi!");
  } catch (err) {
    console.error("❌ Kirishda xatolik:", err.message);
    process.exit(1);
  }

  const qRef = collection(db, 'questions');
  const onaTiliTopics = [55, 56, 57, 58, 59, 60, 61, 62];
  const tarixTopics = [15, 16, 17, 18, 19, 20, 21, 22];
  const allTargetTopics = [...onaTiliTopics, ...tarixTopics];

  console.log("🔍 Savollar yuklanmoqda...");
  const snap = await getDocs(qRef);
  const targetDocs = snap.docs.filter(d => allTargetTopics.includes(parseInt(d.data().topicId)));

  console.log(`📊 Jami topildi: ${targetDocs.length} ta savol (Ona tili va Tarix)`);
  if (targetDocs.length === 0) {
    console.log("⚠️ Tuzatiladigan savollar topilmadi.");
    process.exit(0);
  }

  console.log("🔄 Savollarni aralashtirish va tuzatish boshlandi...");

  let updated = 0;
  const batchLimit = 400;
  
  for (let i = 0; i < targetDocs.length; i += batchLimit) {
    const batch = writeBatch(db);
    const chunk = targetDocs.slice(i, i + batchLimit);
    
    chunk.forEach(docSnap => {
      const data = docSnap.data();
      if (Array.isArray(data.opts) && data.opts.length === 4) {
        const currentCorrect = data.correct ?? 0;
        const { opts: newOpts, correct: newCorrect } = shuffleWithCorrect(data.opts, currentCorrect);
        batch.update(doc(db, 'questions', docSnap.id), {
          opts: newOpts,
          correct: newCorrect
        });
        updated++;
      }
    });
    
    try {
      await batch.commit();
      const pct = Math.round(((i + chunk.length) / targetDocs.length) * 100);
      process.stdout.write(`\r⏳ Bajarildi: ${i + chunk.length}/${targetDocs.length} (${pct}%)`);
    } catch (err) {
      console.error(`\n❌ Batch xatosi: ${err.message}`);
    }
  }

  console.log(`\n\n✅ Muvaffaqiyatli yakunlandi! Jami ${updated} ta savol aralashtirildi va to'g'ri javoblar Firestore'da tuzatildi.`);
  process.exit(0);
}

main().catch(console.error);
