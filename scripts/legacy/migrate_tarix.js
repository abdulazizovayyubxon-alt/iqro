import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc, query, where, getCountFromServer } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync, existsSync } from 'fs';

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

const LOCAL_FILE = './Qoshimcha 3/tarix_baza_tozalangan.json';

async function main() {
  console.log("\n========================================================");
  console.log("🚀 TARIX SAVOLLARINI O'CHIRISH VA YANGI YUKLASH TIZIMI");
  console.log("========================================================\n");

  // 1. Tizimga kirish (ixtiyoriy)
  const email = process.env.ADMIN_EMAIL || "998999154686@iqro.uz";
  const password = process.env.ADMIN_PASSWORD || process.argv[2];
  if (password && password !== 'sizning_parolingiz') {
    console.log(`🔑 Tizimga kirilmoqda (${email})...`);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Tizimga muvaffaqiyatli kirildi!");
    } catch (authErr) {
      console.error("❌ Tizimga kirishda xatolik:", authErr.message);
      process.exit(1);
    }
  } else {
    console.log("ℹ️ Parol kiritilmadi va .env da ADMIN_PASSWORD topilmadi. Amallarni parolsiz bajarishga urinib ko'ramiz...");
  }

  // 2. Local faylni o'qish
  if (!existsSync(LOCAL_FILE)) {
    console.error(`❌ Local fayl topilmadi: ${LOCAL_FILE}`);
    process.exit(1);
  }

  const localQuestions = JSON.parse(readFileSync(LOCAL_FILE, 'utf8'));
  console.log(`📂 Local fayl o'qildi: ${localQuestions.length} ta savol topildi.`);

  const qRef = collection(db, 'questions');

  // 3. Firestore-dan barcha eski tarix savollarini topish va o'chirish
  console.log("\n[1/3] Firestore-dan eski tarix savollarini qidiryapmiz (category == 'tarix')...");
  const qQuery = query(qRef, where('category', '==', 'tarix'));
  let snap;
  try {
    snap = await getDocs(qQuery);
  } catch (err) {
    console.error("❌ Firestore-dan hujjatlarni olishda xatolik:", err.message);
    if (!password) {
      console.error("\n💡 Eslatma: Firestore xavfsizlik qoidalari sababli ruxsat berilmagan bo'lishi mumkin.");
      console.error("Agar ruxsat xatosi (permission-denied) bo'lsa, skriptni parolingiz bilan ishga tushiring:");
      console.error("   node migrate_tarix.js <admin_parol>\n");
    }
    process.exit(1);
  }

  console.log(`📊 Firestore-da jami ${snap.size} ta eski tarix savoli topildi.`);

  if (snap.size > 0) {
    console.log("\n[2/3] Eski tarix savollarini o'chirish boshlandi...");
    let deleted = 0;
    const docs = snap.docs;
    const BATCH_SIZE = 400;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach(d => batch.delete(doc(db, 'questions', d.id)));
      
      try {
        await batch.commit();
        deleted += chunk.length;
        console.log(`  🗑️ O'chirildi: ${deleted} / ${docs.length}`);
      } catch (err) {
        console.error(`❌ Batch o'chirishda xatolik (${i} - ${i + chunk.length}):`, err.message);
        process.exit(1);
      }
    }
    console.log("✅ Eski savollar to'liq o'chirildi!");
  } else {
    console.log("\n[2/3] O'chiriladigan eski tarix savollari topilmadi. Keyingi bosqichga o'tilmoqda.");
  }

  // 4. Yangi savollarni yuklash
  console.log(`\n[3/3] Yangi ${localQuestions.length} ta tarix savolini yuklash boshlandi...`);
  let uploaded = 0;
  const BATCH_SIZE = 400;
  const now = new Date().toISOString();

  for (let i = 0; i < localQuestions.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = localQuestions.slice(i, i + BATCH_SIZE);

    chunk.forEach(q => {
      const newDocRef = doc(qRef);
      batch.set(newDocRef, {
        q: q.q,
        opts: q.opts,
        correct: Number(q.correct),
        explanation: q.explanation || "",
        topicId: Number(q.topicId) || 15,
        category: 'tarix',
        createdAt: now
      });
    });

    try {
      await batch.commit();
      uploaded += chunk.length;
      console.log(`  ✅ Yuklandi: ${uploaded} / ${localQuestions.length}`);
    } catch (err) {
      console.error(`❌ Batch yuklashda xatolik (${i} - ${i + chunk.length}):`, err.message);
      process.exit(1);
    }
  }
  console.log("✅ Yangi savollar to'liq yuklandi!");

  // 5. Yakuniy tekshiruv
  console.log("\n========================================================");
  console.log("📊 YAKUNIY HISOBOT VA TEKSHIRUV");
  console.log("========================================================\n");
  console.log("🔍 Firestore-dagi tarix savollarini qayta sanab ko'ramiz...");
  try {
    const finalSnap = await getCountFromServer(qQuery);
    const finalCount = finalSnap.data().count;
    console.log(`📊 Firestore-da joriy tarix savollari soni: ${finalCount} ta.`);
    if (finalCount === localQuestions.length) {
      console.log("🎉 TABRIKLAYMIZ! Barcha savollar muvaffaqiyatli va to'liq yuklandi! Ish yakunlandi.");
    } else {
      console.warn(`⚠️ Diqqat! Kutilayotgan son (${localQuestions.length}) va amaldagi son (${finalCount}) bir-biriga mos kelmadi!`);
    }
  } catch (err) {
    console.error("❌ Yakuniy sanashda xatolik:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
