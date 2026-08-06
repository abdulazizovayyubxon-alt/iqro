#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// backfill-short-ids.mjs — ID'siz qolgan foydalanuvchilarga qisqa ID beradi.
//
// NEGA KERAK (2026-08-06 tekshiruvi):
//   • 2026-07-06 gacha ro'yxatdan o'tganlarda `shortId` maydoni umuman yo'q
//     edi — funksiya hali yozilmagan edi, backfill ham qilinmagan.
//   • Undan keyingilarda esa poyga tufayli `shortId: null` yozilgan:
//     ID bir vaqtda ikki joyda generatsiya qilinardi (ro'yxatdan o'tish
//     tarmog'i + onAuthStateChanged tinglovchisi), mag'lub tranzaksiya
//     firestore.rules:301 sabab PERMISSION_DENIED olardi va `catch → null`
//     bilan yutilardi.
//   Kod tuzatildi (src/utils/shortId.js: ensureShortId + qayta urinish),
//   bu skript esa mavjud hisoblarni to'g'rilaydi.
//
// TAMOYIL:
//   • MAVJUD ID HECH QACHON O'ZGARTIRILMAYDI — foydalanuvchi uni allaqachon
//     ko'rgan bo'lishi mumkin.
//   • Yo'qolgan (hisoblagich yeb ketgan, lekin hech kimga tegmagan) tartib
//     raqamlari QAYTA ISHLATILADI — natijada ketma-ketlik zich chiqadi.
//   • Foydalanuvchilar ro'yxatdan o'tgan sanasi bo'yicha tartiblanadi.
//   • Hujjatga faqat `shortId` maydoni yoziladi.
//
// FOYDALANISH:
//   node scripts/backfill-short-ids.mjs --dry    # faqat ko'rsatadi, yozmaydi
//   node scripts/backfill-short-ids.mjs          # haqiqiy yozuv
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, doc, getDoc, setDoc, runTransaction,
} from 'firebase/firestore';
import { formatShortId } from '../src/utils/shortId.js';

const DRY = process.argv.includes('--dry');

const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q");
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

console.log(`🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(getAuth(app), email, password);
const db = getFirestore(app);

// formatShortId ning teskarisi — band qilingan tartib raqamlarini aniqlash uchun.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PER_LETTER = 9999;
function parseShortId(id) {
  const m = /^([A-Z]{1,2})(\d{4})$/.exec(id || '');
  if (!m) return null;
  const [, prefix, num] = m;
  const digits = Number(num);
  if (digits < 1 || digits > PER_LETTER) return null;
  const idx = prefix.length === 1
    ? LETTERS.indexOf(prefix)
    : LETTERS.length + LETTERS.indexOf(prefix[0]) * LETTERS.length + LETTERS.indexOf(prefix[1]);
  return idx * PER_LETTER + digits;
}

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string') return new Date(v);
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  return null;
};

const snap = await getDocs(collection(db, 'users'));
const used = new Set();
const missing = [];

snap.forEach((d) => {
  const x = d.data();
  const seq = typeof x.shortId === 'string' ? parseShortId(x.shortId) : null;
  if (seq) {
    used.add(seq);
  } else {
    missing.push({
      uid: d.id,
      created: toDate(x.createdAt),
      name: x.displayName || x.email || d.id,
      had: 'shortId' in x ? (x.shortId === null ? 'null' : JSON.stringify(x.shortId)) : 'maydon yo\'q',
    });
  }
});

// Sanasi yo'qlar oxiriga tushadi.
missing.sort((a, b) => (a.created?.getTime() ?? Infinity) - (b.created?.getTime() ?? Infinity));

const counterRef = doc(db, 'meta', 'counters');
const counterSnap = await getDoc(counterRef);
const counter = counterSnap.exists() ? (counterSnap.data().userSeq || 0) : 0;

// Hisoblagich yeb ketgan, lekin hech kimga berilmagan raqamlar.
const freeSlots = [];
for (let i = 1; i <= counter; i++) if (!used.has(i)) freeSlots.push(i);

console.log(`\n📊 Jami: ${snap.size} | ID bor: ${used.size} | ID yo'q: ${missing.length}`);
console.log(`   meta/counters.userSeq = ${counter}, bo'sh tartib raqamlari: ${freeSlots.length}`);
if (!missing.length) { console.log('\n✅ Hamma foydalanuvchida ID bor — qiladigan ish yo\'q.'); process.exit(0); }
console.log(DRY ? '\n🧪 QURUQ REJIM — hech narsa yozilmaydi\n' : '\n✍️  YOZUV REJIMI\n');

// Hisoblagichni +1 oshirish. firestore.rules:301 aynan +1 ni talab qiladi,
// shuning uchun "sakrab" o'rnatib bo'lmaydi — har safar bittadan.
async function bumpCounter() {
  return runTransaction(db, async (tx) => {
    const s = await tx.get(counterRef);
    const next = (s.exists() ? (s.data().userSeq || 0) : 0) + 1;
    tx.set(counterRef, { userSeq: next }, { merge: true });
    return next;
  });
}

let ok = 0, failed = 0, bumps = 0;
for (const u of missing) {
  let seq;
  try {
    if (freeSlots.length) {
      seq = freeSlots.shift();              // yo'qolgan raqamni qayta ishlatamiz
    } else if (DRY) {
      seq = counter + (++bumps);            // quruq rejimda faqat hisoblaymiz
    } else {
      seq = await bumpCounter();
    }
    const shortId = formatShortId(seq);
    const when = u.created ? u.created.toISOString().slice(0, 10) : '????-??-??';

    if (!DRY) await setDoc(doc(db, 'users', u.uid), { shortId }, { merge: true });

    console.log(`  ${shortId}  ←  ${when}  ${u.uid.slice(0, 8)}  ${String(u.name).slice(0, 24).padEnd(24)} (avval: ${u.had})`);
    ok++;
  } catch (e) {
    failed++;
    console.error(`  ❌ ${u.uid.slice(0, 8)} ${u.name}: ${e.code || ''} ${e.message}`);
  }
}

console.log(`\n${DRY ? '🧪 Quruq natija' : '✅ Yakun'}: ${ok} ta berildi${failed ? `, ${failed} ta xato` : ''}`);
if (DRY) console.log('   Haqiqiy yozuv uchun --dry siz qayta ishga tushiring.');
process.exit(failed ? 1 : 0);
