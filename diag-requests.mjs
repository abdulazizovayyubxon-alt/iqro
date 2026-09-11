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
const snap = await getDocs(collection(db, 'questionRequests'));
const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
console.log('JAMI so\'rov:', rows.length);

const ts = r => r.timestamp?.toDate ? r.timestamp.toDate() : (r.timestamp?.seconds ? new Date(r.timestamp.seconds*1000) : null);
const byDay = {};
for (const r of rows) { const d = ts(r); const k = d ? d.toISOString().slice(0,10) : 'yo\'q'; byDay[k] = (byDay[k]||0)+1; }
console.log('\n--- KUNLAR BO\'YICHA ---');
Object.entries(byDay).sort().forEach(([k,v]) => console.log(k, v));

const byCat = {};
for (const r of rows) { const k = `${r.category}|${r.categoryName}`; byCat[k] = (byCat[k]||0)+1; }
console.log('\n--- FAN BO\'YICHA ---');
Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(v, k));

const byTopic = {};
for (const r of rows) { const k = `${r.category} :: t${r.topicId} :: ${r.topicName}`; byTopic[k] = (byTopic[k]||0)+1; }
console.log('\n--- MAVZU BO\'YICHA (top 40) ---');
Object.entries(byTopic).sort((a,b)=>b[1]-a[1]).slice(0,40).forEach(([k,v]) => console.log(v, k));

const byUser = {};
for (const r of rows) { byUser[r.uid] = (byUser[r.uid]||0)+1; }
const users = Object.entries(byUser).sort((a,b)=>b[1]-a[1]);
console.log('\n--- FOYDALANUVCHILAR: jami', users.length, ' | top 15 ---');
users.slice(0,15).forEach(([k,v]) => console.log(v, k));
console.log('fulfilled=true:', rows.filter(r=>r.fulfilled).length);

// topicId = -1 ("Aralash") ulushi — butun fan bo'sh ko'ringan holat belgisi
console.log('\ntopicId=-1 (Aralash/butun fan bo\'sh):', rows.filter(r=>r.topicId===-1).length);
process.exit(0);
