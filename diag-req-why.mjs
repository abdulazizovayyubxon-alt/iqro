import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(app);

// 1) settings/version — paket holati
const v = (await getDoc(doc(db, 'settings', 'version'))).data() || {};
console.log('dbVersion:', v.dbVersion);
console.log('bundles (Storage):', JSON.stringify(v.bundles || {}, null, 1).slice(0, 1500));
console.log('fsBundles:', JSON.stringify(v.fsBundles || {}, null, 1).slice(0, 1500));

// 2) chqbt / art savollar soni (aggregatsiya — arzon)
for (const cat of ['chqbt', 'art']) {
  const c = await getCountFromServer(query(collection(db, 'questions'), where('category', '==', cat)));
  console.log(`questions[${cat}] =`, c.data().count);
}
// chqbt topicId 0
const c0 = await getCountFromServer(query(collection(db, 'questions'), where('category','==','chqbt'), where('topicId','==',0)));
console.log('questions[chqbt, topicId=0] =', c0.data().count);

// 3) So'rov yuborgan foydalanuvchilar obuna holati
const snap = await getDocs(collection(db, 'questionRequests'));
const uids = [...new Set(snap.docs.map(d => d.data().uid))];
let pro = 0, trialAlive = 0, expired = 0, noDoc = 0;
const detail = [];
for (const uid of uids) {
  const u = (await getDoc(doc(db, 'users', uid))).data();
  if (!u) { noDoc++; detail.push([uid, 'HUJJAT YO\'Q']); continue; }
  const isPro = u.isPremium === true;
  let days = null;
  if (u.createdAt) {
    const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
    days = (Date.now() - d.getTime()) / 86400000;
  }
  if (isPro) { pro++; detail.push([uid, 'PRO']); }
  else if (days !== null && days <= 7) { trialAlive++; detail.push([uid, `trial ochiq (${days.toFixed(1)} kun)`]); }
  else { expired++; detail.push([uid, days === null ? 'createdAt YO\'Q → 403' : `trial TUGAGAN (${days.toFixed(1)} kun) → 403`]); }
}
console.log('\n--- SO\'ROV YUBORGANLAR OBUNASI ---');
console.log({ jami: uids.length, pro, 'trial ochiq': trialAlive, 'trial tugagan/403': expired, 'hujjatsiz': noDoc });
detail.forEach(([u, s]) => console.log(' ', s));
process.exit(0);
