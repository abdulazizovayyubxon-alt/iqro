/**
 * ════════════════════════════════════════════════
 *  FIRESTORE CATEGORY TUZATISH SKRIPTI
 * ════════════════════════════════════════════════
 *
 * Bu skript Firestore'dagi barcha savollarni tekshirib,
 * noto'g'ri yoki yo'q `category` fieldlarini tuzatadi.
 *
 * QOIDA:
 *   topicId 0-6  → category: 'chqbt'
 *   topicId 7+   → category: 'art'
 *
 * ISHLATISH:
 *   Loyiha papkasiga kopyalang va ishga tushiring:
 *   node fix_categories_in_firestore.js
 *
 * DIQQAT: Bu skript faqat bir marta ishga tushiriladi.
 * ════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { readFileSync } from 'fs';

// .env fayldan firebase config o'qiymiz
// Agar import ishlamasa, quyidagi config ni to'g'ridan-to'g'ri yozing:
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

/**
 * topicId asosida to'g'ri categoryni qaytaradi
 * Bu funksiya mockData.js dagi mantiqqa to'liq mos keladi:
 */
function getExpectedCategory(topicId) {
  if (typeof topicId !== 'number' || isNaN(topicId)) return null;
  const tid = topicId;
  if (tid >= 0 && tid <= 6) return 'chqbt';
  if (tid >= 7 && tid <= 14) return 'art';
  if (tid >= 15 && tid <= 22) return 'tarix';
  if (tid >= 23 && tid <= 30) return 'sport';
  if (tid >= 31 && tid <= 38) return 'boshlangich';
  if (tid >= 39 && tid <= 46) return 'info';
  if (tid >= 47 && tid <= 54) return 'mtt';
  if (tid >= 55 && tid <= 62) return 'til';
  if (tid >= 63 && tid <= 70) return 'mtt_rahbar';
  return null;
}

async function fixCategories() {
  console.log("🔍 Firestore'dagi barcha savollar tekshirilmoqda...");
  
  const qRef = collection(db, 'questions');
  const snap = await getDocs(qRef);
  
  console.log(`📊 Jami savollar soni: ${snap.docs.length}`);
  
  const toFix = [];      // category noto'g'ri yoki yo'q
  const alreadyOk = [];  // category to'g'ri
  const problematic = []; // topicId yo'q yoki noto'g'ri

  snap.docs.forEach(d => {
    const data = d.data();
    const { topicId, category, q } = data;

    if (typeof topicId !== 'number' || isNaN(topicId)) {
      problematic.push({ id: d.id, q: (q || '').slice(0, 60), topicId, category });
      return;
    }

    const expected = getExpectedCategory(topicId);
    
    if (category !== expected) {
      toFix.push({
        id: d.id,
        q: (q || '').slice(0, 60),
        topicId,
        oldCategory: category || '(yo\'q)',
        newCategory: expected
      });
    } else {
      alreadyOk.push(d.id);
    }
  });

  // Hisobot
  console.log(`\n✅ To'g'ri category bor: ${alreadyOk.length} ta`);
  console.log(`⚠️  Tuzatish kerak: ${toFix.length} ta`);
  console.log(`❌ Muammoli (topicId yo'q): ${problematic.length} ta`);

  if (problematic.length > 0) {
    console.log('\n❌ MUAMMOLI SAVOLLAR (topicId yo\'q yoki noto\'g\'ri):');
    problematic.forEach(p => {
      console.log(`  ID: ${p.id} | topicId: ${p.topicId} | category: ${p.category}`);
      console.log(`  Savol: "${p.q}..."`);
    });
    console.log('\nBu savollarni Admin paneldan qo\'lda tekshiring va topicId ni belgilang.\n');
  }

  if (toFix.length === 0) {
    console.log('\n🎉 Barcha savollar to\'g\'ri! Hech narsa tuzatilmadi.');
    return;
  }

  console.log('\n📝 Tuzatiladigan savollardan namunalar (dastlabki 10 ta):');
  toFix.slice(0, 10).forEach(f => {
    console.log(`  topicId: ${f.topicId} | ${f.oldCategory} → ${f.newCategory} | "${f.q}..."`);
  });

  // Tasdiqlash (production'da `--yes` flagini ishlatish mumkin)
  if (!process.argv.includes('--yes')) {
    console.log(`\n⚡ ${toFix.length} ta savolni tuzatish uchun '--yes' flagini qo'shing:`);
    console.log('   node fix_categories_in_firestore.js --yes\n');
    return;
  }

  // Batch update
  console.log(`\n🚀 ${toFix.length} ta savol tuzatilmoqda...`);
  
  let fixed = 0;
  for (let i = 0; i < toFix.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = toFix.slice(i, i + 400);
    
    chunk.forEach(item => {
      const docRef = doc(db, 'questions', item.id);
      batch.update(docRef, { category: item.newCategory });
    });
    
    await batch.commit();
    fixed += chunk.length;
    console.log(`  ✅ ${fixed}/${toFix.length} ta tuzatildi...`);
  }

  console.log(`\n🎉 Muvaffaqiyatli! Jami ${fixed} ta savol tuzatildi.`);
  console.log('Endi platformani qayta yuklab, savollar aralashib ketmasligi tekshiring.');
}

fixCategories().catch(err => {
  console.error('❌ Xatolik:', err);
  process.exit(1);
});
