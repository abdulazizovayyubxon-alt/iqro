/**
 * fix_topic62_category.js
 * 1. topicId=55-62 savollarni topadi: category noto'g'ri bo'lsa "til" ga o'zgartiradi  
 * 2. topicId=63-70 savollarni tekshiradi: "mtt_rahbar" ga o'zgartiradi
 * 3. Barcha javoblarni aralashtiradi (Fisher-Yates)
 * 
 * Ishlatish: node fix_topic62_category.js <parol>
 */
import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

// Fisher-Yates shuffle (to'g'ri javobni saqlagan holda)
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

function getCorrectCategory(topicId) {
  if (topicId >= 0 && topicId <= 6) return 'chqbt';
  if (topicId >= 7 && topicId <= 14) return 'art';
  if (topicId >= 15 && topicId <= 22) return 'tarix';
  if (topicId >= 23 && topicId <= 30) return 'sport';
  if (topicId >= 31 && topicId <= 38) return 'boshlangich';
  if (topicId >= 39 && topicId <= 46) return 'info';
  if (topicId >= 47 && topicId <= 54) return 'mtt';
  if (topicId >= 55 && topicId <= 62) return 'til';
  if (topicId >= 63 && topicId <= 70) return 'mtt_rahbar';
  return null;
}

async function main() {
  const password = process.env.ADMIN_PASSWORD || process.argv[2];
  if (!password || password === 'sizning_parolingiz') {
    console.error("❌ Parolni argument sifatida kiriting: node fix_topic62_category.js <parol> yoki .env faylida ADMIN_PASSWORD ni to'ldiring");
    process.exit(1);
  }

  // Admin login
  const envEmail = process.env.ADMIN_EMAIL;
  const adminEmails = envEmail ? [envEmail] : ["abdulazizovayyubxon@gmail.com", "998999154686@iqro.uz"];
  let loggedIn = false;
  for (const email of adminEmails) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log(`✅ ${email} sifatida tizimga kirildi!`);
      loggedIn = true;
      break;
    } catch (err) {
      console.log(`  ⚠️ ${email}: ${err.message}`);
    }
  }
  
  if (!loggedIn) {
    console.error("❌ Hech qaysi email bilan kira olmadim. Parolni tekshiring.");
    process.exit(1);
  }

  console.log("\n🔍 Barcha savollarni yuklamoqda...");
  const allDocsSnap = await getDocs(collection(db, 'questions'));
  console.log(`📊 Jami: ${allDocsSnap.size} ta savol`);
  
  // Category noto'g'ri bo'lgan savollarni topamiz
  const wrongCatDocs = allDocsSnap.docs.filter(d => {
    const data = d.data();
    const correctCat = getCorrectCategory(data.topicId);
    return correctCat && data.category !== correctCat;
  });
  
  console.log(`\n🔧 Category noto'g'ri: ${wrongCatDocs.length} ta savol tuzatiladi`);
  
  if (wrongCatDocs.length === 0) {
    console.log("✅ Hamma category to'g'ri! Tuzatish kerak emas.");
    
    // Shunday bo'lsa, faqat til va mtt_rahbar savollarini aralashtirish
    const tilMttDocs = allDocsSnap.docs.filter(d => {
      const data = d.data();
      return (data.topicId >= 55 && data.topicId <= 70);
    });
    console.log(`\n🔀 ${tilMttDocs.length} ta til/mtt_rahbar savoli aralashtiriladi...`);
    
    const BATCH_LIMIT = 400;
    for (let i = 0; i < tilMttDocs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const chunk = tilMttDocs.slice(i, i + BATCH_LIMIT);
      chunk.forEach(docSnap => {
        const data = docSnap.data();
        if (Array.isArray(data.opts) && data.opts.length >= 4) {
          const { opts: newOpts, correct: newCorrect } = shuffleWithCorrect(data.opts, data.correct ?? 0);
          batch.update(doc(db, 'questions', docSnap.id), { opts: newOpts, correct: newCorrect });
        }
      });
      await batch.commit();
      process.stdout.write(`\r⏳ ${i + chunk.length}/${tilMttDocs.length} bajarildi`);
    }
    console.log("\n✅ Javoblar aralashtirildi!");
    process.exit(0);
  }
  
  // Category + javoblarni tuzatish
  const BATCH_LIMIT = 400;
  let totalFixed = 0;
  
  for (let i = 0; i < wrongCatDocs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = wrongCatDocs.slice(i, i + BATCH_LIMIT);
    
    chunk.forEach(docSnap => {
      const data = docSnap.data();
      const correctCat = getCorrectCategory(data.topicId);
      const updates = { category: correctCat };
      
      // Javoblarni aralashtirish
      if (Array.isArray(data.opts) && data.opts.length >= 4) {
        const { opts: newOpts, correct: newCorrect } = shuffleWithCorrect(data.opts, data.correct ?? 0);
        updates.opts = newOpts;
        updates.correct = newCorrect;
      }
      
      batch.update(doc(db, 'questions', docSnap.id), updates);
      totalFixed++;
    });
    
    await batch.commit();
    const pct = Math.round(Math.min(100, ((i + chunk.length) / wrongCatDocs.length) * 100));
    process.stdout.write(`\r⏳ ${i + chunk.length}/${wrongCatDocs.length} (${pct}%) bajarildi`);
  }
  
  console.log(`\n\n✅ Yakunlandi! ${totalFixed} ta savol muvaffaqiyatli tuzatildi!`);
  console.log("📌 category va correct javob indekslari yangilandi.");
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Xatolik:", e);
  process.exit(1);
});
