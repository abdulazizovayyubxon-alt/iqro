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
// NEGA `urls` BO'SH VA `bundles` BOSHQA MAYDON:
//   Eski `urls` maydoni Storage'ning OCHIQ havolalarini saqlagan (makePublic /
//   getDownloadURL `?token=`) — u qoidalarni chetlab o'tardi va pullik bazani
//   login'siz berardi. Shuning uchun u abadiy bo'sh qoladi.
//   Hozirgi yo'l: `bundles.<fan>.path` — Storage'ning ICHKI yo'li. Faylni faqat
//   `api/get-questions.js` Admin SDK bilan o'qiydi, mijoz unga tegmaydi.
//   Paketni Admin panel → Savollar → «Paketlarni qayta qurish» yasaydi.
//   Paket bo'lmasa ilova Firestore'dan o'qiydi — ISHLAYDI, lekin fan boshiga
//   ~2 900 o'qish (kunlik bepul kvota 50 000).
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
  // Eski OCHIQ havolalar maydoni — doim bo'sh turishi shart (yuqoridagi izoh).
  urls: {},
  updatedAt: new Date().toISOString(),
  note: "urls ataylab bo'sh — savollar maxfiy Storage paketidan (settings/version.bundles) yoki Firestore'dan o'qiladi",
};

const bundleCount = Object.keys(prev?.bundles || {}).length;

console.log('\n── Yangi holat ──');
console.log('  dbVersion:', next, `(${new Date(next).toISOString()})`);
console.log('  bundles  :', bundleCount, 'ta (tegilmaydi)');

// ⚠️ ENG MUHIM OGOHLANTIRISH (2026-08-14):
// Paket qurilgan bo'lsa, ilova savollarni AYNAN paketdan oladi. Firestore'dagi
// savolni tahrirlab faqat versiyani oshirish yetarli EMAS — foydalanuvchi
// paketni qaytadan yuklab oladi, lekin paket ichida ESKI savol turadi.
if (bundleCount > 0) {
  console.log('\n⚠️  DIQQAT: savol paketi faol (' + bundleCount + ' fan).');
  console.log('   Versiyani oshirish keshi bekor qiladi, LEKIN paket ichidagi matn');
  console.log('   o\'zgarmaydi. Savol tahrirlangan bo\'lsa, tuzatish foydalanuvchiga');
  console.log('   YETIB BORMAYDI. Avval: Admin panel → Savollar → «Bazani yuklash» →');
  console.log('   «Paketlarni qayta qurish» (u versiyani ham o\'zi oshiradi).');
}

if (DRY) {
  console.log('\n[dry-run] Yozilmadi.');
  process.exit(0);
}

// ⚠️ `merge: true` SHART. Ilgari bu yerda merge YO'Q edi — ya'ni skript
// `bundles` maydonini butunlay O'CHIRIB yuborardi va ilova qimmat Firestore
// zaxirasiga qaytardi (fan boshiga ~2 900 o'qish, kunlik kvota 50 000).
await setDoc(ref, payload, { merge: true });
console.log('\n✅ settings/version yangilandi.');
console.log('   Barcha qurilmalarda savol keshi bekor bo\'ldi — keyingi kirishda');
console.log('   savollar qaytadan yuklanadi.');
process.exit(0);
