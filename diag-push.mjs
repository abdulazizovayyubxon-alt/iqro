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
const snap = await getDocs(collection(db, 'users'));
const c = { jami: snap.size, qaydEtilgan: 0, granted: 0, denied: 0, default: 0, playIlova: 0, brauzer: 0, token: 0, xato: {} };
snap.forEach(d => {
  const x = d.data();
  if (Array.isArray(x.fcmTokens) && x.fcmTokens.length) c.token++;
  if (!x.pushPerm) return;
  c.qaydEtilgan++;
  c[x.pushPerm] = (c[x.pushPerm] || 0) + 1;
  if (x.pushIsPlayApp) c.playIlova++; else c.brauzer++;
  if (x.pushLastError) c.xato[x.pushLastError] = (c.xato[x.pushLastError] || 0) + 1;
});
console.log(JSON.stringify(c, null, 2));
process.exit(0);
