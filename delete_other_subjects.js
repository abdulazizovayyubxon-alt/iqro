import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc, query, where, getCountFromServer } from "firebase/firestore";

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

// SAQLANADIGAN fanlar (FAQAT SHUALAR QOLADI):
// - chqbt (2,191 ta)
// - tarix (2,327 ta)
// - til   (1,619 ta)

const OCHIRILADIGAN_FANLAR = [
  'boshlangich',  // 664 ta
  'nemis',        // 90 ta
  'info',         // 42 ta
  'art',          // 32 ta
  'sport',        // 27 ta
  'mtt',          // 18 ta
  'mtt_rahbar',   // 17 ta
  'adabiyot',     // ehtimol bor
];

async function deleteCategory(categoryName, qRef) {
  const q = query(qRef, where('category', '==', categoryName));
  const snap = await getDocs(q);

  if (snap.size === 0) {
    console.log(`  ⚪ ${categoryName}: 0 ta savol topilmadi, o'tkazib yuborildi.`);
    return 0;
  }

  console.log(`  🔍 ${categoryName}: ${snap.size} ta savol topildi. O'chirilmoqda...`);
  let deleted = 0;

  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = snap.docs.slice(i, i + 400);
    chunk.forEach(d => batch.delete(doc(db, 'questions', d.id)));
    await batch.commit();
    deleted += chunk.length;
  }

  console.log(`  ✅ ${categoryName}: ${deleted} ta savol o'chirildi.`);
  return deleted;
}

async function main() {
  console.log("\n========================================================");
  console.log("🗑️  BOSHQA FANLAR SAVOLLARINI O'CHIRISH TIZIMI");
  console.log("========================================================");
  console.log("\n✅ SAQLANADIGAN fanlar: chqbt, tarix, til (Ona tili)");
  console.log("❌ O'CHIRILADIGAN fanlar:", OCHIRILADIGAN_FANLAR.join(', '));
  console.log("\n");

  const qRef = collection(db, 'questions');
  let totalDeleted = 0;

  for (const fan of OCHIRILADIGAN_FANLAR) {
    try {
      const count = await deleteCategory(fan, qRef);
      totalDeleted += count;
    } catch (err) {
      console.error(`  ❌ ${fan} o'chirishda xatolik:`, err.message);
    }
  }

  console.log("\n========================================================");
  console.log(`🎉 JAMI O'CHIRILDI: ${totalDeleted} ta savol`);
  console.log("========================================================\n");

  // Yakuniy tekshiruv
  console.log("📊 Firestore-dagi qolgan savollar (yakuniy tekshiruv):\n");
  const saqlanadigan = ['chqbt', 'tarix', 'til'];
  let grandTotal = 0;

  for (const fan of saqlanadigan) {
    const q = query(qRef, where('category', '==', fan));
    const snap = await getCountFromServer(q);
    const count = snap.data().count;
    grandTotal += count;
    console.log(`  ✅ ${fan.padEnd(10)}: ${count.toLocaleString()} ta savol`);
  }

  // Umumiy soni
  const totalSnap = await getCountFromServer(qRef);
  const totalAll = totalSnap.data().count;

  console.log(`\n  ${'─'.repeat(35)}`);
  console.log(`  Jami (3 fan): ${grandTotal.toLocaleString()} ta`);
  console.log(`  Firestore jami: ${totalAll.toLocaleString()} ta`);

  if (totalAll === grandTotal) {
    console.log("\n🎉 Muvaffaqiyat! Faqat 3 ta fan savollari Firestore-da qoldi.");
  } else {
    console.log(`\n⚠️ Diqqat! ${totalAll - grandTotal} ta boshqa kategoriya savollari hali ham bor.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Xatolik:", err.message);
  process.exit(1);
});
