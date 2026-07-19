#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// bump-questions-version.mjs — savol keshini bekor qilish tetigi.
//
// NEGA KERAK:
//   Ilova savollarni telefon xotirasida (localforage `bundle_v2_<fan>`)
//   keshlaydi va uni FAQAT Firestore'dagi settings/version → dbVersion
//   o'zgarganda qayta yuklaydi (TestPage.jsx, ExamPage.jsx, SettingsPage.jsx).
//   Firestore'dagi savollarni to'g'ridan-to'g'ri tahrirlash (fix-questions.mjs,
//   fix-typos-dict.mjs) dbVersion'ga tegmaydi — natijada eski foydalanuvchilar
//   keshdagi ESKI savollarni ko'raverad. Bu skript o'sha tetikni bosadi.
//
//   ⇒ Savol matnini o'zgartirgan HAR SAFAR shuni ishga tushiring.
//
// NEGA `urls` BO'SH:
//   settings/version.urls to'ldirilsa, ilova savollarni Storage'dagi ochiq
//   (makePublic) bundle'dan oladi — URL manzili to'liq taxmin qilinadi, ya'ni
//   pullik baza login'siz yuklab olinadi. Bo'sh qoldirilsa, ilova Firestore'dan
//   o'qiydi (qoida: questions read if isLoggedIn()). Ataylab shunday.
//
// FOYDALANISH:
//   node scripts/bump-questions-version.mjs --dry-run   # ko'rsatadi, yozmaydi
//   node scripts/bump-questions-version.mjs             # JONLI
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const DRY = process.argv.includes('--dry-run');

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(cfg);
await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(app);

const ref = doc(db, 'settings', 'version');
const before = await getDoc(ref);
const prev = before.exists() ? before.data() : null;

console.log('── Oldingi holat ──');
if (!prev) {
  console.log('  settings/version mavjud emas (dbVersion = 0 deb hisoblanadi)');
} else {
  console.log('  dbVersion:', prev.dbVersion, prev.dbVersion ? `(${new Date(Number(prev.dbVersion)).toISOString()})` : '');
  console.log('  updatedAt:', prev.updatedAt);
  console.log('  urls     :', Object.keys(prev.urls || {}).length, 'ta');
}

const next = Date.now();
const payload = {
  dbVersion: next,
  urls: {},
  updatedAt: new Date().toISOString(),
  note: "urls ataylab bo'sh — savollar Firestore'dan o'qiladi, ochiq Storage bundle'dan emas",
};

console.log('\n── Yangi holat ──');
console.log('  dbVersion:', next, `(${new Date(next).toISOString()})`);

if (DRY) {
  console.log('\n[dry-run] Yozilmadi.');
  process.exit(0);
}

// urls mavjud bo'lsa ham bo'shatamiz — shuning uchun merge ishlatilmaydi
await setDoc(ref, payload);
console.log('\n✅ settings/version yangilandi.');
console.log('   Barcha qurilmalarda savol keshi bekor bo\'ldi — keyingi kirishda');
console.log('   Firestore\'dan yangi (tuzatilgan) savollar yuklanadi.');
process.exit(0);
