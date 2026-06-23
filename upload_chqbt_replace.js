// CHQBT bankini Firestore'da TO'LIQ ALMASHTIRADI: admin kirish → eski chqbt o'chirish → yangi yuklash.
// Dublikat bo'lmaydi. node upload_chqbt_replace.js
import dotenv from 'dotenv';
dotenv.config();
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync } from 'fs';

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

const questions = JSON.parse(readFileSync('./chqbt_app_import.json', 'utf8'));
console.log(`📂 Yuklanadigan: ${questions.length} ta savol`);

async function run() {
  const email = process.env.ADMIN_EMAIL || "998999154686@iqro.uz";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password === 'sizning_parolingiz') { console.error("❌ .env da ADMIN_PASSWORD yo'q."); process.exit(1); }
  console.log(`🔑 Kirilmoqda (${email})...`);
  await signInWithEmailAndPassword(auth, email, password);
  console.log("✅ Kirildi (admin).");

  const qRef = collection(db, 'questions');

  // 1) Eski chqbt savollarni o'chirish
  console.log("🔍 Eski chqbt savollar qidirilmoqda...");
  const snap = await getDocs(query(qRef, where('category', '==', 'chqbt')));
  console.log(`📊 Jonli eski chqbt: ${snap.size} ta`);
  const docs = snap.docs;
  let deleted = 0;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach(d => batch.delete(doc(qRef, d.id)));
    await batch.commit();
    deleted += Math.min(450, docs.length - i);
    console.log(`🗑️  O'chirildi: ${deleted}/${docs.length}`);
  }

  // 2) Yangi savollarni yuklash
  let uploaded = 0;
  for (let i = 0; i < questions.length; i += 450) {
    const batch = writeBatch(db);
    questions.slice(i, i + 450).forEach(q => {
      batch.set(doc(qRef), { ...q, category: 'chqbt', createdAt: new Date().toISOString() });
    });
    await batch.commit();
    uploaded += Math.min(450, questions.length - i);
    console.log(`⬆️  Yuklandi: ${uploaded}/${questions.length}`);
  }

  // 3) Tekshirish
  const after = await getDocs(query(qRef, where('category', '==', 'chqbt')));
  console.log(`\n🎉 TUGADI. O'chirilgan: ${deleted} | yuklangan: ${uploaded} | jonli chqbt hozir: ${after.size}`);
}
run().catch(e => { console.error("❌ Xato:", e.message); process.exit(1); });
