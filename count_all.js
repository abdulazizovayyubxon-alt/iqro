import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getCountFromServer, query, where } from "firebase/firestore";
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
  const email = process.env.ADMIN_EMAIL || "998999154686@iqro.uz";
  const password = process.env.ADMIN_PASSWORD || process.argv[2];
  if (!password || password === 'sizning_parolingiz') {
    console.error("❌ Parolni kiriting: node count_all.js <parol> yoki .env faylida ADMIN_PASSWORD ni to'ldiring");
    process.exit(1);
  }

  await signInWithEmailAndPassword(auth, email, password);
  console.log("✅ Kirildi\n");

  const categories = ['chqbt', 'art', 'tarix', 'sport', 'boshlangich', 'info', 'mtt', 'til', 'mtt_rahbar'];
  
  let grandTotal = 0;
  
  for (const cat of categories) {
    const q = query(collection(db, 'questions'), where('category', '==', cat));
    const snap = await getCountFromServer(q);
    const count = snap.data().count;
    grandTotal += count;
    console.log(`  ${cat.padEnd(15)}: ${count.toLocaleString()} ta savol`);
  }

  // Umumiy hamma savollar
  const totalSnap = await getCountFromServer(collection(db, 'questions'));
  const totalAll = totalSnap.data().count;
  
  console.log(`\n${'─'.repeat(35)}`);
  console.log(`  Kategoriyalar jami: ${grandTotal.toLocaleString()}`);
  console.log(`  Firestore jami:     ${totalAll.toLocaleString()}`);
  
  if (totalAll < 30000) {
    console.log(`\n⚠️  ${30000 - totalAll} ta savol yetishmayapti!`);
  } else {
    console.log(`\n✅ 30,000 ta savol to'liq mavjud!`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Xatolik:", err.message);
  process.exit(1);
});
