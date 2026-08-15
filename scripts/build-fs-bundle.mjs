#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// build-fs-bundle.mjs — BITTA fanning savol paketini FIRESTORE'ga quradi.
//
// NEGA BU SKRIPT BOR (build-subject-bundle.mjs dan farqi):
//   Storage yo'li loyihada BLOKLANGAN — `iqro-platforma` da Firebase Storage
//   umuman yoqilmagan (konsol amali, faqat egasi qila oladi). Shu sababli
//   `settings/version.bundles` bo'sh qolgan va ilova HAR sovuq yuklashda
//   `getDocs(where('category','==',fan))` ga tushib, fan boshiga ~2 900
//   Firestore o'qishi sarflaydi. Spark kunlik kvotasi 50 000 ⇒ ~17 ta yuklash.
//
//   Bu skript o'sha paketni Storage'siz, FIRESTORE HUJJATLARI ko'rinishida
//   saqlaydi: `questionBundles/{fan}__{n}`. Har hujjat — savollar massivining
//   bir bo'lagi, JSON SATR sifatida (`data` maydoni). api/get-questions.js
//   ularni Admin SDK bilan `getAll()` orqali oladi:
//
//        fan boshiga ~2 900 o'qish  →  ~4 o'qish
//
//   Hujjat chegarasi 1 MiB, shuning uchun bo'lak hajmi ~800 KB da ushlanadi.
//
// MAXFIYLIK: `questionBundles` mijozga UMUMAN ochiq emas
// (firestore.rules → `allow read: if false`). Yagona o'quvchi —
// api/get-questions.js, u premium/trial tekshiruvidan keyin uzatadi.
//
// FOYDALANISH:
//   node scripts/build-fs-bundle.mjs chqbt --dry-run
//   node scripts/build-fs-bundle.mjs chqbt
//   node scripts/build-fs-bundle.mjs --all          (barcha fan — QIMMAT!)
//
// ⚠️ NARXI: har fan uchun bir martalik ~2 900 o'qish. `--all` = ~47 000 o'qish
//   (kunlik bepul kvotaning deyarli hammasi) — trafik eng past paytda qiling.
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, query, where, getDocs,
  doc, getDoc, setDoc, deleteDoc,
} from 'firebase/firestore';

// Firestore hujjati chegarasi 1 MiB. Maydon nomlari, indekslar va UTF-8
// kengayishi uchun zaxira qoldiramiz — bo'lak 800 KB dan oshmaydi.
const MAX_CHUNK_BYTES = 800 * 1024;

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const doAll = argv.includes('--all');
const arg = argv.find((a) => !a.startsWith('--'));

if (!arg && !doAll) {
  console.error('❌ Fan (category) kerak. Masalan: node scripts/build-fs-bundle.mjs chqbt');
  console.error('   Yoki barchasi uchun: node scripts/build-fs-bundle.mjs --all');
  process.exit(1);
}

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

console.log(`🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(auth, email, password);

/**
 * Savollar massivini ≤MAX_CHUNK_BYTES bo'laklarga ajratadi.
 * Har bo'lak MUSTAQIL to'g'ri JSON massiv satri bo'ladi ("[{...},{...}]") —
 * shunda hujjatni qo'lda ochib tekshirish mumkin, server esa faqat tashqi
 * qavslarni olib tashlab ulaydi (JSON.parse qilmaydi — 2.5 MB uchun ortiqcha CPU).
 */
function chunkQuestions(list) {
  const chunks = [];
  let cur = [];
  let curBytes = 2; // "[" va "]"
  for (const q of list) {
    const s = JSON.stringify(q);
    const add = Buffer.byteLength(s, 'utf8') + 1; // +1 — vergul
    if (cur.length > 0 && curBytes + add > MAX_CHUNK_BYTES) {
      chunks.push(cur);
      cur = [];
      curBytes = 2;
    }
    cur.push(q);
    curBytes += add;
  }
  if (cur.length > 0) chunks.push(cur);
  return chunks;
}

async function buildOne(category) {
  console.log(`\n📖 "${category}" savollari o'qilmoqda...`);
  const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', category)));
  if (snap.empty) { console.warn(`⚠️  "${category}" bo'yicha savol topilmadi — o'tkazib yuborildi`); return null; }

  // Paket ilova kutgan shaklda: hujjat id + maydonlar (AdminPage bilan bir xil).
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // serverTimestamp JSON'ga tushmaydi — createdAt'ni tashlaymiz (ilova ishlatmaydi).
  for (const q of list) delete q.createdAt;

  const totalMb = (Buffer.byteLength(JSON.stringify(list), 'utf8') / 1024 / 1024).toFixed(2);
  const chunks = chunkQuestions(list);
  console.log(`   ${list.length} savol | ${totalMb} MB | ${chunks.length} ta bo'lak`);

  if (dryRun) { console.log('   (quruq yurish — yozilmadi)'); return null; }

  // ── Eski bo'laklar soni: fan qisqarsa ortiqchasi o'chirilishi kerak ──
  const vref = doc(db, 'settings', 'version');
  const prev = (await getDoc(vref)).data() || {};
  const prevChunks = Number(prev.fsBundles?.[category]?.chunks || 0);

  // ── Bo'laklarni yozish ──
  const nowIso = new Date().toISOString();
  for (let i = 0; i < chunks.length; i++) {
    const json = JSON.stringify(chunks[i]);
    const kb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(0);
    await setDoc(doc(db, 'questionBundles', `${category}__${i}`), {
      category,
      chunk: i,
      chunks: chunks.length,
      count: chunks[i].length,
      data: json,
      updatedAt: nowIso,
    });
    console.log(`   ✓ ${category}__${i}  (${chunks[i].length} savol, ${kb} KB)`);
  }

  // ── Ortiqcha eski bo'laklarni o'chirish ──
  for (let i = chunks.length; i < prevChunks; i++) {
    await deleteDoc(doc(db, 'questionBundles', `${category}__${i}`));
    console.log(`   🗑  ${category}__${i} o'chirildi (eski, ortiqcha)`);
  }

  // ── settings/version.fsBundles ni MERGE bilan yangilash ──
  // merge SHART — boshqa fanlarning yozuvi o'chib ketmasin.
  await setDoc(vref, {
    fsBundles: {
      ...(prev.fsBundles || {}),
      [category]: { chunks: chunks.length, count: list.length, updatedAt: nowIso },
    },
    questionMeta: {
      ...(prev.questionMeta || {}),
      [category]: { count: list.length, updatedAt: nowIso },
    },
  }, { merge: true });

  return { chunks: chunks.length, count: list.length };
}

// ── Qaysi fanlar? ────────────────────────────────────────────────────────
let categories;
if (doAll) {
  // Fan ro'yxatini `settings/version.questionMeta` dan olamiz — butun
  // `questions` kolleksiyasini skanerlash 47 000 o'qish turadi.
  const meta = (await getDoc(doc(db, 'settings', 'version'))).data()?.questionMeta || {};
  categories = Object.keys(meta);
  if (categories.length === 0) {
    console.error("❌ settings/version.questionMeta bo'sh — fan ro'yxatini aniqlab bo'lmadi.");
    console.error('   Fanni aniq ko\'rsating: node scripts/build-fs-bundle.mjs <fan>');
    process.exit(1);
  }
  console.log(`\n📋 ${categories.length} ta fan: ${categories.join(', ')}`);
} else {
  categories = [arg];
}

let okCount = 0;
for (const cat of categories) {
  const r = await buildOne(cat);
  if (r) okCount++;
}

if (dryRun) {
  console.log('\n(quruq yurish tugadi — hech narsa yozilmadi)');
  process.exit(0);
}

console.log(`\n✅ ${okCount} ta fan paketi Firestore'da tayyor.`);
console.log('   Tekshirish: /api/health → questionSource: "firestore-bundle"');
console.log("   ⚠️ dbVersion ATAYLAB bump QILINMADI — mijoz keshi bekor bo'lmasin");
console.log('      (savol matni o\'zgarmadi, faqat yetkazish yo\'li o\'zgardi).');
process.exit(0);
