/**
 * fix_batch83_questions.js
 * Batch 83 savollarini Firestore'da tuzatadi:
 * 1. category: "adabiyot" -> "til" ga o'zgartiradi
 * 2. correct indekslarini aralashtiradi (barchasi 0 emas)
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD3Y2s4OgMHsqNvQhWO_jk3y2YhXIqlDrs",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "chqbt-platforma.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "chqbt-platforma",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "chqbt-platforma.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "871527438412",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:871527438412:web:5c0e7d3f1b2a8c9e4f3d12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// topicId 62 va 63-70 (mtt_rahbar) uchun ham tekshiramiz
const TARGET_TOPIC_IDS = [62]; // Adabiyot nazariyasi

async function fixBatch83() {
  console.log('🔍 Firestore\'dan topicId=62 savollarini qidiryapman...');
  
  const qRef = collection(db, 'questions');
  const q = query(qRef, where('topicId', '==', 62));
  const snap = await getDocs(q);
  
  console.log(`📊 ${snap.size} ta savol topildi`);
  
  if (snap.size === 0) {
    console.log('❌ Savollar topilmadi');
    return;
  }

  // To'g'ri javob indekslarini tartib bilan tarqatamiz (0,1,2,3 aylantirish)
  const correctRotation = [0, 1, 2, 3];
  
  const batch = writeBatch(db);
  let fixCount = 0;
  
  snap.docs.forEach((docSnap, idx) => {
    const data = docSnap.data();
    const updates = {};
    
    // Category tuzatish
    if (data.category !== 'til') {
      updates.category = 'til';
    }
    
    // Correct indeksini aralashtirish (0,1,2,3 tartibida)
    // Lekin javoblarni ham shunga mos ravishda almashtirish kerak
    const newCorrectIdx = correctRotation[idx % 4];
    
    if (data.correct === 0 && data.opts && data.opts.length >= 4) {
      // Joriy to'g'ri javobni saqlaymiz
      const correctAnswer = data.opts[0];
      const newOpts = [...data.opts];
      
      // To'g'ri javobni newCorrectIdx joyiga o'tkazamiz
      if (newCorrectIdx !== 0) {
        // Almashtirish
        const temp = newOpts[0];
        newOpts[0] = newOpts[newCorrectIdx];
        newOpts[newCorrectIdx] = temp;
        
        updates.opts = newOpts;
        updates.correct = newCorrectIdx;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, 'questions', docSnap.id), updates);
      fixCount++;
    }
  });
  
  if (fixCount > 0) {
    await batch.commit();
    console.log(`✅ ${fixCount} ta savol muvaffaqiyatli tuzatildi!`);
  } else {
    console.log('ℹ️ Tuzatish kerak emas yoki barchasi to\'g\'ri');
  }
}

fixBatch83().catch(console.error);
