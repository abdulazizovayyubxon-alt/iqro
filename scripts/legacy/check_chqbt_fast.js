import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, limit } from "firebase/firestore";

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

async function checkChqbtFast() {
  const qRef = collection(db, 'questions');
  console.log("Checking chqbt questions fast...");
  const qQuery = query(qRef, where('category', '==', 'chqbt'));
  const snap = await getDocs(qQuery);
  console.log("Found CHQBT questions in Firestore count:", snap.size);
  if (snap.size > 0) {
    console.log("Sample question:", JSON.stringify(snap.docs[0].data(), null, 2));
  }
}

checkChqbtFast().catch(console.error);
