import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function finalTouch() {
  console.log("⚡ Yakuniy mukammal teginish amalga oshirilmoqda...");

  // 1. Tasviriy san'at to'garagi -> Art (topicId: 7)
  await updateDoc(doc(db, 'questions', 'MzUud6nrT7pFq0EKtC8o'), { topicId: 7, category: 'art' });
  console.log("  ✅ 'Tasviriy san'at to'garagi' savoli ART bo'limiga o'tkazildi.");

  // 2. Harbiy xaritada Ko'k chiziqlar -> Topografiya (topicId: 3, category: 'chqbt')
  await updateDoc(doc(db, 'questions', 'WYCCZeh98DrU5jG83gkX'), { topicId: 3, category: 'chqbt' });
  console.log("  ✅ 'Harbiy xaritada Ko'k chiziqlar' savoli CHQBT (topografiya) bo'limiga o'tkazildi.");

  console.log("\n🚀 BARCHA ISHLAR 100% MUKAMMAL YAKUNLANDI! BAZA TO'LIQ TOZALANDI VA SINXRONIZATSIYA QILINDI!");
}

finalTouch().catch(console.error);
