
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { q0_harbiy_xizmat } from './src/data/questions_0.js';
import { q1_umumharbiy_nizomlar } from './src/data/questions_1.js';
import { q2_otish_tayyorgarligi } from './src/data/questions_2.js';
import { q3_taktik_tayyorgarlik } from './src/data/questions_3.js';
import { q4_fuqaro_muhofazasi } from './src/data/questions_4.js';
import { q5_tibbiy_bilim } from './src/data/questions_5.js';
import { q6_pedagogik_mahorat } from './src/data/questions_6.js';
import { q7_tasviriy_sanat } from './src/data/questions_7.js';

const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
  measurementId: "G-GPTQZDZ79J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const allData = [
  { id: 0, data: q0_harbiy_xizmat, cat: 'chqbt' },
  { id: 1, data: q1_umumharbiy_nizomlar, cat: 'chqbt' },
  { id: 2, data: q2_otish_tayyorgarligi, cat: 'chqbt' },
  { id: 3, data: q3_taktik_tayyorgarlik, cat: 'chqbt' },
  { id: 4, data: q4_fuqaro_muhofazasi, cat: 'chqbt' },
  { id: 5, data: q5_tibbiy_bilim, cat: 'chqbt' },
  { id: 6, data: q6_pedagogik_mahorat, cat: 'chqbt' },
  { id: 7, data: q7_tasviriy_sanat, cat: 'art' }
];

async function migrate() {
  const qRef = collection(db, 'questions');
  console.log("Starting migration...");

  for (const item of allData) {
    console.log(`Uploading topic ${item.id} (${item.data.length} questions)...`);
    
    // Split into chunks of 500 for batch
    for (let i = 0; i < item.data.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = item.data.slice(i, i + 500);
      
      chunk.forEach(q => {
        const newDoc = doc(qRef);
        batch.set(newDoc, {
          ...q,
          topicId: item.id,
          category: item.cat,
          createdAt: new Date().toISOString()
        });
      });
      
      await batch.commit();
      console.log(`  Pushed chunk ${i / 500 + 1}`);
    }
  }
  
  console.log("Migration finished successfully!");
}

migrate().catch(console.error);
