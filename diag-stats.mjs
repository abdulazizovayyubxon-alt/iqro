import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(app);
const snap = await getDocs(collection(db, 'userStats'));
let ge10 = 0, ge30 = 0, any = 0;
snap.forEach(d => { const a = d.data().totalAnswered || 0; if (a > 0) any++; if (a >= 10) ge10++; if (a >= 30) ge30++; });
console.log({ userStats: snap.size, 'javob bergan': any, '>=10 javob': ge10, '>=30 javob': ge30 });
process.exit(0);
