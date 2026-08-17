// ════════════════════════════════════════════════════════════════════════
// upload-partner-set.mjs — hamkor ustozning haftalik diagnostika to'plamini
// Firestore'ga yuklaydi.
//
// Foydalanish:
//   node scripts/upload-partner-set.mjs <savollar.json> \
//        --code MIRONSHOH --category chqbt --order 1 \
//        --title "1-hafta diagnostika" [--opens 2026-08-23] [--dry-run]
//
// Yoziladigan joy (firestore.rules bilan bir xil):
//   partnerSets/{kod}_h{tartib}                    → metama'lumot
//   partnerSets/{kod}_h{tartib}/content/questions  → savollar massivi
//
// Kirish sync-firestore.mjs bilan BIR XIL yo'l bilan: .env dagi
// ADMIN_EMAIL / ADMIN_PASSWORD (firestore.rules bo'yicha admin).
//
// Tekshiruv admin paneldagi bilan bir xil qattiqlikda: noto'g'ri `correct`
// indeksi ustozlarga XATO javobni to'g'ri deb ko'rsatadi va buni hech kim
// sezmaydi, shuning uchun bitta xato ham butun yuklashni to'xtatadi.
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// ── CLI ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const val = (flag) => {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : null;
};
const file = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') === false);
const jsonPath = argv[0] && !argv[0].startsWith('--') ? argv[0] : file;
const code = (val('--code') || '').trim().toUpperCase();
const category = (val('--category') || 'chqbt').trim();
const order = Number(val('--order'));
const title = (val('--title') || '').trim();
const opensAt = val('--opens') || null;
const dryRun = argv.includes('--dry-run');

if (!jsonPath || !code || !title || !Number.isInteger(order) || order < 1) {
  console.log('Foydalanish: node scripts/upload-partner-set.mjs <savollar.json> --code KOD --order 1 --title "1-hafta diagnostika" [--category chqbt] [--opens 2026-08-23] [--dry-run]');
  process.exit(1);
}
if (!fs.existsSync(jsonPath)) { console.error(`❌ Fayl topilmadi: ${jsonPath}`); process.exit(1); }

// ── Savollarni tekshirish ─────────────────────────────────────────────────
const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const list = Array.isArray(parsed) ? parsed : parsed.questions;
if (!Array.isArray(list) || !list.length) { console.error('❌ Savollar massivi topilmadi'); process.exit(1); }

const questions = [];
for (let i = 0; i < list.length; i++) {
  const q = list[i];
  const nom = q.n ? `${q.n}-test` : `${i + 1}-savol`;
  if (!q || typeof q.q !== 'string' || !q.q.trim()) { console.error(`❌ ${nom}: savol matni yo'q`); process.exit(1); }
  if (!Array.isArray(q.opts) || q.opts.length < 2) { console.error(`❌ ${nom}: kamida 2 ta variant kerak`); process.exit(1); }
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.opts.length) {
    console.error(`❌ ${nom}: to'g'ri javob indeksi xato (${q.correct})`); process.exit(1);
  }
  // Faqat kerakli maydonlar — `confidence`, `_izoh`, `n` kabi ish maydonlari
  // hujjat hajmini bekorga oshiradi.
  questions.push({
    q: q.q.trim(),
    opts: q.opts.map(String),
    correct: q.correct,
    ...(q.explanation ? { explanation: String(q.explanation) } : {}),
    ...(q.image ? { image: String(q.image) } : {}),
  });
}

const hajm = Buffer.byteLength(JSON.stringify(questions), 'utf8');
if (hajm > 900_000) { console.error(`❌ To'plam juda katta (${Math.round(hajm / 1024)} KB), chegara ~900 KB`); process.exit(1); }

const setId = `${code.toLowerCase().replace(/[^a-z0-9]/g, '')}_h${order}`;
const rasmli = questions.filter((q) => q.image).length;

console.log(`📦 ${title}`);
console.log(`   ${questions.length} ta savol (${rasmli} tasi rasmli), ${Math.round(hajm / 1024)} KB`);
console.log(`   → partnerSets/${setId}  [${code} · ${category} · ${order}-hafta · ${opensAt || 'darhol ochiq'}]`);
if (dryRun) { console.log('\n✨ DRY-RUN — Firestore\'ga yozilmadi.'); process.exit(0); }

// ── Firebase ─────────────────────────────────────────────────────────────
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error('❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo\'q'); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

console.log(`\n🔐 ${email} bilan kirilmoqda...`);
const cred = await signInWithEmailAndPassword(auth, email, password);

// Promokod mavjudligini tekshiramiz: kod bo'lmasa to'plamni HECH KIM ko'ra
// olmaydi (qoidalar redemption hujjatiga qaraydi).
const promo = await getDoc(doc(db, 'promoCodes', code));
if (!promo.exists()) { console.error(`❌ «${code}» promokodi topilmadi — avval Promo bo'limida yarating`); process.exit(1); }

await setDoc(doc(db, 'partnerSets', setId), {
  partnerCode: code,
  category,
  title,
  order,
  opensAt: opensAt || null,
  active: true,
  questionCount: questions.length,
  updatedAt: new Date().toISOString(),
  createdBy: cred.user.uid,
}, { merge: true });

// `partnerCode` savollar hujjatida ham takrorlanadi — qoida ota hujjatni
// `get()` bilan o'qishga majbur bo'lmasin (har ochishda qo'shimcha o'qish).
await setDoc(doc(db, 'partnerSets', setId, 'content', 'questions'), {
  partnerCode: code,
  questions,
  updatedAt: new Date().toISOString(),
});

console.log(`✅ Yuklandi: partnerSets/${setId}`);
process.exit(0);
