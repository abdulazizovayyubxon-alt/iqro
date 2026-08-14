import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function checkVersion() {
  const versionDocRef = doc(db, 'settings', 'version');
  const snap = await getDoc(versionDocRef);
  if (snap.exists()) {
    console.log("VERSION DOC DATA:");
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("VERSION DOC DOES NOT EXIST!");
  }
}

checkVersion().catch(console.error);
