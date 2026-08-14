import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";

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

async function deleteChqbtQuestions() {
  const qRef = collection(db, 'questions');
  console.log("🔍 CHQBT savollarini qidiryapmiz...");

  const qQuery = query(qRef, where('category', '==', 'chqbt'));
  const snap = await getDocs(qQuery);

  console.log(`📊 Topildi: ${snap.size} ta CHQBT savol`);

  if (snap.size === 0) {
    console.log("✅ O'chirish uchun savol yo'q. Tugadi.");
    return;
  }

  // Batch o'chirish (500 tadan)
  let deleted = 0;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach(d => batch.delete(doc(qRef, d.id)));
    await batch.commit();
    deleted += chunk.length;
    console.log(`🗑️  O'chirildi: ${deleted} / ${docs.length}`);
  }

  console.log(`✅ Hammasi o'chirildi! Jami: ${deleted} ta CHQBT savol o'chirildi.`);
}

deleteChqbtQuestions().catch(console.error);
