import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(app);
const snap = await getDocs(query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc'), limit(60)));
console.log('errorLogs:', snap.size);
const byMsg = new Map();
snap.forEach(d => {
  const x = d.data();
  const k = (x.message || x.error || '').slice(0, 90);
  byMsg.set(k, (byMsg.get(k) || 0) + 1);
});
for (const [k, v] of [...byMsg.entries()].sort((a,b)=>b[1]-a[1])) console.log(String(v).padStart(3), k);
process.exit(0);
