/**
 * check_distribution.js
 * Checks the distribution of correct answers for Tarix, Ona Tili, and MTT Rahbar.
 */
import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("🔍 Checking question distribution in Firestore...");
  const snap = await getDocs(collection(db, 'questions'));
  const docs = snap.docs;
  
  const stats = {
    tarix: { total: 0, answers: { 0: 0, 1: 0, 2: 0, 3: 0 } },
    onaTili: { total: 0, answers: { 0: 0, 1: 0, 2: 0, 3: 0 } },
    mttRahbar: { total: 0, answers: { 0: 0, 1: 0, 2: 0, 3: 0 } }
  };
  
  docs.forEach(doc => {
    const data = doc.data();
    const topicId = parseInt(data.topicId);
    const correct = data.correct ?? 0;
    
    if (topicId >= 15 && topicId <= 22) {
      stats.tarix.total++;
      stats.tarix.answers[correct] = (stats.tarix.answers[correct] || 0) + 1;
    } else if (topicId >= 55 && topicId <= 62) {
      stats.onaTili.total++;
      stats.onaTili.answers[correct] = (stats.onaTili.answers[correct] || 0) + 1;
    } else if (topicId >= 63 && topicId <= 70) {
      stats.mttRahbar.total++;
      stats.mttRahbar.answers[correct] = (stats.mttRahbar.answers[correct] || 0) + 1;
    }
  });
  
  console.log("\n📊 STATISTIKA:");
  console.log("-----------------------------------------");
  console.log("📚 TARIX (15-22):");
  console.log(`   Jami savollar: ${stats.tarix.total}`);
  console.log(`   Javoblar - A: ${stats.tarix.answers[0]}, B: ${stats.tarix.answers[1]}, C: ${stats.tarix.answers[2]}, D: ${stats.tarix.answers[3]}`);
  
  console.log("\n✍️ ONA TILI (55-62):");
  console.log(`   Jami savollar: ${stats.onaTili.total}`);
  console.log(`   Javoblar - A: ${stats.onaTili.answers[0]}, B: ${stats.onaTili.answers[1]}, C: ${stats.onaTili.answers[2]}, D: ${stats.onaTili.answers[3]}`);
  
  console.log("\n🏢 MTT RAHBAR (63-70):");
  console.log(`   Jami savollar: ${stats.mttRahbar.total}`);
  console.log(`   Javoblar - A: ${stats.mttRahbar.answers[0]}, B: ${stats.mttRahbar.answers[1]}, C: ${stats.mttRahbar.answers[2]}, D: ${stats.mttRahbar.answers[3]}`);
  
  process.exit(0);
}

main().catch(console.error);
