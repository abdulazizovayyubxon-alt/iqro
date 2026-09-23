import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      let val = clean.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[clean.substring(0, idx).trim()] = val;
    }
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

async function checkNew() {
  await signInWithEmailAndPassword(auth, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  console.log('✅ Logged in as admin');

  const qUnsolved = query(collection(db, 'objections'), where('solved', '==', false));
  const snapUnsolved = await getDocs(qUnsolved);
  console.log(`\n=== UNSOLVED OBJECTIONS: ${snapUnsolved.size} ===\n`);

  snapUnsolved.forEach((d, i) => {
    const o = d.data();
    console.log(`[Unsolved #${i+1}] ID: ${d.id}`);
    console.log(`  User: ${o.userName} (${o.userEmail}) | Date: ${o.date}`);
    console.log(`  Fan/Category: ${o.category} | Mavzu: ${o.topic} | QuestionId: ${o.questionId}`);
    console.log(`  Question: ${o.question}`);
    console.log(`  Options: ${JSON.stringify(o.options)}`);
    console.log(`  Correct (tizimdagi): ${o.correct}`);
    console.log(`  Reason: ${o.reason}`);
    console.log(`  User Note (e'tiroz matni): "${o.note}"`);
    console.log('------------------------------------------------------------\n');
  });

  const qLatest = query(collection(db, 'objections'), orderBy('timestamp', 'desc'), limit(8));
  const snapLatest = await getDocs(qLatest);
  console.log(`=== LATEST 8 OBJECTIONS (by timestamp) ===\n`);
  snapLatest.forEach((d, i) => {
    const o = d.data();
    console.log(`[#${i+1}] ID: ${d.id} | Solved: ${o.solved} | Date: ${o.date} | User: ${o.userName} (${o.userEmail})`);
    console.log(`  Category: ${o.category} | Topic: ${o.topic}`);
    console.log(`  Question: ${o.question?.slice(0, 80)}...`);
    console.log(`  Note: "${o.note}"`);
    console.log('------------------------------------------------------------\n');
  });

  process.exit(0);
}

checkNew().catch(err => {
  console.error(err);
  process.exit(1);
});
