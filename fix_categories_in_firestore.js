import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
  measurementId: "G-GPTQZDZ79J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const isAuto = process.argv.includes('--yes') || process.argv.includes('-y');

async function fixCategories() {
  const adminEmail = process.env.VITE_ADMIN_EMAIL || 'abdulazizovayyubxon@gmail.com';
  const adminPassword = process.env.VITE_ADMIN_PASSWORD;

  if (adminPassword) {
    console.log(`🔑 Bazaga admin (${adminEmail}) bo'lib ulanilmoqda...`);
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log("✅ Admin ulanishi muvaffaqiyatli!");
    } catch (authErr) {
      console.error("❌ Logindan o'tishda xatolik! Parol yoki email noto'g'ri:", authErr.message);
      process.exit(1);
    }
  } else {
    console.log("🔓 Baza qoidalaridagi (allow read, write: if true;) ochiq ruxsat orqali ulanilmoqda...");
  }

  console.log("Qidirilmoqda: Firestore'dagi barcha savollar...");
  const snap = await getDocs(collection(db, 'questions'));
  const docsToUpdate = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const topicId = parseInt(data.topicId);
    let expectedCat = topicId === 7 ? 'art' : 'chqbt';
    
    if (data.category !== expectedCat) {
      docsToUpdate.push({
        id: docSnap.id,
        expectedCat,
        oldCat: data.category || 'none',
        topicId
      });
    }
  });

  if (docsToUpdate.length === 0) {
    console.log("✅ Barcha savollarning kategoriyasi allaqachon to'g'ri! Hech narsani o'zgartirish shart emas.");
    process.exit(0);
  }

  console.log(`⚠️ Jami ${docsToUpdate.length} ta savolning kategoriyasi noto'g'ri ekanligi aniqlandi.`);
  
  if (!isAuto) {
    console.log("Tasdiqlash uchun '--yes' bayrog'i bilan ishga tushiring.");
    process.exit(0);
  }

  console.log("Tahrirlash boshlandi...");
  const qRef = collection(db, 'questions');
  
  // 400 tadan batch qilib yozamiz
  for (let i = 0; i < docsToUpdate.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = docsToUpdate.slice(i, i + 400);
    
    chunk.forEach(item => {
      const docRef = doc(qRef, item.id);
      batch.update(docRef, { category: item.expectedCat });
    });

    await batch.commit();
    console.log(`  🔄 Batch ${i / 400 + 1} muvaffaqiyatli saqlandi.`);
  }

  console.log("✅ Muvaffaqiyatli! Barcha savollar kategoriyalari to'liq to'g'rilandi.");
  process.exit(0);
}

fixCategories().catch(err => {
  console.error("Xatolik yuz berdi:", err);
  process.exit(1);
});
