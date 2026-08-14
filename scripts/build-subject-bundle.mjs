#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// build-subject-bundle.mjs — BITTA fanning savol paketini Storage'ga quradi.
//
// NEGA ALOHIDA SKRIPT: Admin panel → «Paketlarni qayta qurish» BARCHA fanni
// qayta quradi, ya'ni avval butun bazani (~50 000 savol) o'qiydi. Spark
// tarifidagi kunlik bepul kvota ham 50 000 o'qish — bitta yangi fan qo'shilganda
// hammasini qayta o'qish kvotani yeb qo'yadi va o'sha kuni foydalanuvchilar
// savol ko'ra olmay qolishi mumkin. Bu skript FAQAT bitta fanni o'qiydi va
// `settings/version.bundles` ga o'sha fanni QO'SHADI (boshqalarini o'chirmaydi).
//
// Paket bo'lmasa ilova Firestore'ga tushadi va fan boshiga ~3 000 o'qish
// sarflaydi; paket bilan esa foydalanuvchi boshiga 2 o'qish
// (api/get-questions.js Admin SDK bilan faylni o'qiydi).
//
// FOYDALANISH:
//   node scripts/build-subject-bundle.mjs mtt_jismoniy --dry-run
//   node scripts/build-subject-bundle.mjs mtt_jismoniy
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const category = argv.find((a) => !a.startsWith('--'));
if (!category) { console.error('❌ Fan (category) kerak. Masalan: node scripts/build-subject-bundle.mjs mtt_jismoniy'); process.exit(1); }

const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q"); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
});
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log(`🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(auth, email, password);

// ── 1) Fan savollarini o'qish ────────────────────────────────────────────
console.log(`\n📖 "${category}" savollari o'qilmoqda...`);
const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', category)));
if (snap.empty) { console.error(`❌ "${category}" bo'yicha savol topilmadi`); process.exit(1); }

// Paket ilova kutgan shaklda: hujjat id + maydonlar (AdminPage bilan bir xil).
const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
// serverTimestamp JSON'ga tushmaydi — createdAt'ni tashlaymiz (ilova ishlatmaydi).
for (const q of list) delete q.createdAt;

const json = JSON.stringify(list);
const sizeMb = (Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(2);
console.log(`   ${list.length} savol | paket hajmi ${sizeMb} MB`);

const byTopic = {};
for (const q of list) byTopic[q.topicId] = (byTopic[q.topicId] || 0) + 1;
console.log('   bo\'limlar:', Object.keys(byTopic).sort((a, b) => a - b).map((k) => `${k}=${byTopic[k]}`).join(' '));

if (dryRun) { console.log('\n(quruq yurish — hech narsa yozilmadi)'); process.exit(0); }

// ── 2) Storage'ga yuklash (maxfiy: storage.rules → read: if false) ───────
const path = `bundles/${category}.json`;
console.log(`\n📤 Storage'ga yuklanmoqda: ${path}`);
// DIQQAT: Node'da `Blob` berilsa Firebase Web SDK 404 (storage/unknown) qaytaradi —
// brauzerdagi `Blob` yo'lini tanlab, `Content-Length`siz so'rov yuboradi. Uint8Array ishlaydi.
await uploadBytes(ref(storage, path), new Uint8Array(Buffer.from(json, 'utf8')), {
  contentType: 'application/json',
  cacheControl: 'no-store',   // eski nusxa qaytib qolmasin (GCS keshi)
});

// ── 3) settings/version ni MERGE bilan yangilash + dbVersion bump ────────
const nowIso = new Date().toISOString();
const vref = doc(db, 'settings', 'version');
const prev = (await getDoc(vref)).data() || {};
const dbVersion = Date.now();
await setDoc(vref, {
  dbVersion,
  bundles: { ...(prev.bundles || {}), [category]: { path, count: list.length, updatedAt: nowIso } },
  questionMeta: { ...(prev.questionMeta || {}), [category]: { count: list.length, updatedAt: nowIso } },
}, { merge: true });   // merge SHART — boshqa fanlarning paketi o'chib ketmasin

console.log(`✅ settings/version yangilandi — dbVersion=${dbVersion} (barcha qurilmada kesh bekor bo'ldi)`);
console.log(`\n📊 Yakun: "${category}" paketi tayyor (${list.length} savol). Endi ilova bu fan uchun`);
console.log('   Firestore o\'rniga Storage paketini o\'qiydi — foydalanuvchi boshiga 2 o\'qish.');
process.exit(0);
