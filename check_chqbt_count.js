import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function checkChqbtCount() {
  const qRef = collection(db, 'questions');
  console.log("Checking all questions in Firestore...");
  const snap = await getDocs(qRef);
  console.log("Total questions in Firestore:", snap.size);
  
  const chqbtQuestions = snap.docs.filter(d => d.data().category === 'chqbt');
  console.log("Total chqbt questions:", chqbtQuestions.length);

  const categories = {};
  snap.docs.forEach(d => {
    const cat = d.data().category || 'no_category';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  console.log("Questions per category in Firestore:", categories);
}

checkChqbtCount().catch(console.error);
