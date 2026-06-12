import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";
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

const questions = JSON.parse(readFileSync('./chqbt_app_import.json', 'utf8'));

console.log(`📂 Fayl o'qildi: ${questions.length} ta savol`);

async function uploadChqbt() {
  const qRef = collection(db, 'questions');
  let uploaded = 0;

  for (let i = 0; i < questions.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = questions.slice(i, i + 500);

    chunk.forEach(q => {
      const newDoc = doc(qRef);
      batch.set(newDoc, {
        ...q,
        category: 'chqbt',
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
    uploaded += chunk.length;
    console.log(`✅ Yuklandi: ${uploaded} / ${questions.length}`);
  }

  console.log(`🎉 Hammasi muvaffaqiyatli yuklandi! Jami: ${uploaded} ta savol.`);
}

uploadChqbt().catch(console.error);
