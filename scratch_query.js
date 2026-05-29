import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

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
  const snap = await getDocs(collection(db, 'questions'));
  
  let matchingQuestions = [];
  let withCode = [];
  
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.q && data.q.includes('Savol kodi')) {
      withCode.push({ id: d.id, q: data.q });
    }
    if (data.opts && data.opts.some(o => o.toLowerCase().includes('1-a') || o.toLowerCase().includes('1-a,') || o.includes('1-A') || o.includes('1.A'))) {
       matchingQuestions.push({ id: d.id, ...data });
    }
  });

  fs.writeFileSync('sample_analysis.json', JSON.stringify({
    matchingCount: matchingQuestions.length,
    withCodeCount: withCode.length,
    sampleMatching: matchingQuestions.slice(0, 5)
  }, null, 2));

  console.log("Done. Check sample_analysis.json");
  process.exit(0);
}

main().catch(console.error);
