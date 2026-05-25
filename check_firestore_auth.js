import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
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

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("❌ Iltimos, parolni argument sifatida kiriting: node check_firestore_auth.js <password>");
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

  console.log("\nChecking Ona Tili in Firestore (topics 55-62)...");
  let onaTiliDocs = [];
  for (const tid of onaTiliTopics) {
    const qQuery = query(qRef, where('topicId', '==', tid));
    const snap = await getDocs(qQuery);
    snap.docs.forEach(d => onaTiliDocs.push(d.data()));
  }
  
  const otDist = {};
  onaTiliDocs.forEach(d => {
    const c = d.correct ?? 0;
    otDist[c] = (otDist[c] || 0) + 1;
  });
  console.log(`Ona tili jami: ${onaTiliDocs.length}`);
  console.log(`Ona tili correct taqsimoti:`, otDist);

  console.log("\nChecking Tarix in Firestore (topics 15-22)...");
  let tarixDocs = [];
  for (const tid of tarixTopics) {
    const qQuery = query(qRef, where('topicId', '==', tid));
    const snap = await getDocs(qQuery);
    snap.docs.forEach(d => tarixDocs.push(d.data()));
  }

  const txDist = {};
  tarixDocs.forEach(d => {
    const c = d.correct ?? 0;
    txDist[c] = (txDist[c] || 0) + 1;
  });
  console.log(`Tarix jami: ${tarixDocs.length}`);
  console.log(`Tarix correct taqsimoti:`, txDist);
}

main().catch(console.error);
