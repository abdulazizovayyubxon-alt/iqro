#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// upload-missing-questions.mjs — lokal JSON fayldagi savollardan bazada
// YO'QLARINI Firestore'ga qo'shadi.
//
// NEGA KERAK (2026-08-29):
//   `feat(attestation)` commiti bilan `src/data/yangi_testlar/
//   chqbt_140_yangi_savollar.json` reposga tushdi, lekin bazaga faqat 125 tasi
//   yetib borgan — 15 tasi yo'q edi. Ular dedup tozalashida O'CHIRILMAGAN
//   (tekshirildi: tozalashdan OLDINGI paketda ham yo'q edi), ya'ni yuklash
//   yarim yo'lda uzilgan yoki import ularni rad etgan. Fayl bilan baza
//   o'rtasidagi farqni qayta va qayta qo'lda topmaslik uchun shu skript.
//
// QANDAY SOLISHTIRADI: savol matni normallashtirilib (apostrof turlari,
//   ketma-ket bo'shliqlar, registr — `src/utils/qHash.js` dagi
//   `normalizeQuestion` bilan bir xil) taqqoslanadi. Ya'ni «bo'lim» va
//   «bo‘lim» BIR XIL savol sanaladi.
//
// MANBA — API PAKETI, KOLLEKSIYA EMAS: `/api/get-questions` 4 ta o'qish
//   turadi, `getDocs(where(category))` esa ~2 400. Paket har o'zgarishdan
//   keyin `build-fs-bundle.mjs` bilan qayta quriladi, ya'ni bazaning aynan
//   nusxasi. Shubha bo'lsa avval paketni qayta quring.
//
// FOYDALANISH:
//   node scripts/upload-missing-questions.mjs src/data/yangi_testlar/chqbt_140_yangi_savollar.json chqbt
//   node scripts/upload-missing-questions.mjs <fayl> <fan> --apply
//   node scripts/upload-missing-questions.mjs <fayl> <fan> --from-db   # paket emas, kolleksiya
//
// ⚠️ QO'SHGANDAN KEYIN SHART:
//   node scripts/build-fs-bundle.mjs <fan>
//   node scripts/bump-questions-version.mjs
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, setDoc, writeBatch } from 'firebase/firestore';
import { qHashOf, normalizeQuestion } from '../src/utils/qHash.js';

const APP_URL = 'https://zehin-t41p.vercel.app';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
// ⚠️ 2026-08-30: paket har doim ham bazaning nusxasi EMAS. `deploy_chqbt.mjs`
// paketni LOKAL FAYLDAN quradi — o'sha kuni paket 3524 ta savol berardi,
// `questions` kolleksiyasida esa 3024 ta bor edi. Paketga solishtirilsa farq
// «0» bo'lib ko'rinadi va yetishmagan savollar bazaga hech qachon tushmaydi.
// `--from-db` KOLLEKSIYANING O'ZINI o'qiydi: qimmatroq (fan boshiga ~3 000
// o'qish), lekin haqiqatni ko'rsatadi.
const FROM_DB = argv.includes('--from-db');
const [file, category] = argv.filter((a) => !a.startsWith('--'));

if (!file || !category) {
  console.error('❌ Foydalanish: node scripts/upload-missing-questions.mjs <fayl.json> <fan> [--apply]');
  process.exit(1);
}
if (!fs.existsSync(file)) { console.error('❌ Fayl topilmadi:', file); process.exit(1); }

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q"); process.exit(1); }

const app = initializeApp(cfg);
const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
const db = getFirestore(app);
console.log(`🔐 ${email} | fan: ${category}`);
console.log(APPLY ? '🔴 REJIM: JONLI' : '🟢 REJIM: QURUQ YURISH');

// ── 1. Bazaning joriy holati (paket orqali — arzon) ─────────────────────
let live;
if (FROM_DB) {
  const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', category)));
  live = snap.docs.map((d) => d.data());
  console.log(`🗄️  Manba: questions kolleksiyasi (${snap.size} o'qish)`);
} else {
  const token = await cred.user.getIdToken();
  const res = await fetch(`${APP_URL}/api/get-questions?category=${encodeURIComponent(category)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { console.error('❌ Paket olinmadi, HTTP', res.status); process.exit(1); }
  live = await res.json();
  console.log('📦 Manba: API paketi');
}
const liveSet = new Set(live.map((q) => normalizeQuestion(q.q)));
console.log(`📦 Bazada hozir: ${live.length} ta savol`);

// ── 2. Fayl va farq ─────────────────────────────────────────────────────
const incoming = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(incoming)) { console.error('❌ Fayl massiv emas'); process.exit(1); }
console.log(`📄 Faylda: ${incoming.length} ta savol`);

const seen = new Set();
const missing = [], invalid = [], dupInFile = [];

for (const q of incoming) {
  const key = normalizeQuestion(q.q);
  if (!key) { invalid.push({ q, why: 'savol matni bo\'sh' }); continue; }
  if (seen.has(key)) { dupInFile.push(q); continue; }
  seen.add(key);
  if (liveSet.has(key)) continue;

  // Firestore rules `questions` create uchun topicId + category mosligini talab
  // qiladi; noto'g'ri yozuv butun to'plamni rad ettirardi — oldindan tekshiramiz.
  if (!Array.isArray(q.opts) || q.opts.length !== 4) { invalid.push({ q, why: 'opts 4 ta emas' }); continue; }
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) { invalid.push({ q, why: 'correct 0..3 emas' }); continue; }
  if (!Number.isInteger(q.topicId)) { invalid.push({ q, why: 'topicId son emas' }); continue; }
  if (q.category && q.category !== category) { invalid.push({ q, why: `category "${q.category}" mos emas` }); continue; }
  missing.push(q);
}

console.log(`\n   bazada bor      : ${incoming.length - missing.length - invalid.length - dupInFile.length}`);
console.log(`   QO'SHILADI      : ${missing.length}`);
if (dupInFile.length) console.log(`   fayl ichida takror: ${dupInFile.length} (o'tkazib yuborildi)`);
if (invalid.length) {
  console.log(`   ⚠️ yaroqsiz      : ${invalid.length}`);
  invalid.slice(0, 5).forEach((x) => console.log(`      · ${x.why}: ${JSON.stringify(String(x.q.q || '').slice(0, 70))}`));
}

if (missing.length === 0) { console.log('\n✅ Farq yo\'q — hamma savol bazada.'); process.exit(0); }

const byTopic = missing.reduce((a, q) => { a[q.topicId] = (a[q.topicId] || 0) + 1; return a; }, {});
console.log(`   mavzu bo'yicha  : ${JSON.stringify(byTopic)}`);
console.log('\n   qo\'shiladigan savollar:');
missing.forEach((q, i) => console.log(`   ${String(i + 1).padStart(3)}. t${q.topicId} ${JSON.stringify(String(q.q).slice(0, 78))}`));

// ── 3. Hujjat shakli — AdminPage «Savol qo'shish» bilan AYNAN bir xil ────
const nowIso = new Date().toISOString();
const docs = missing.map((q) => ({
  q: q.q,
  opts: q.opts,
  correct: q.correct,
  topicId: q.topicId,
  category,
  explanation: q.explanation || `✓ To'g'ri javob: ${String.fromCharCode(65 + q.correct)}`,
  mnemonic: q.mnemonic || '',
  image: q.image || '',
  // Ixtiyoriy: manba va qiyinlik. `source_ref` — e'tirozga javob shu maydondan
  // yoziladi (savol qaysi nizom bandiga tayanganini ko'rsatadi). Faylda
  // bo'lmasa yozilmaydi, ya'ni eski import fayllari uchun hech narsa o'zgarmaydi.
  ...(q.source_ref ? { source_ref: q.source_ref } : {}),
  ...(q.difficulty ? { difficulty: q.difficulty } : {}),
  // K-3: keyingi importlar dublikatni SERVERDAN shu maydon orqali topadi
  qHash: qHashOf(q.q),
  createdAt: nowIso,
}));

if (!APPLY) {
  console.log('\n(quruq yurish — hech narsa yozilmadi. Jonli: --apply)');
  process.exit(0);
}

// ── 4. Yozish ───────────────────────────────────────────────────────────
const col = collection(db, 'questions');
for (let i = 0; i < docs.length; i += 450) {
  const slice = docs.slice(i, i + 450);
  const batch = writeBatch(db);
  for (const d of slice) batch.set(doc(col), d);
  await batch.commit();
  console.log(`   ✍️  ${Math.min(i + slice.length, docs.length)}/${docs.length} qo'shildi`);
}

// ── 5. Savol soni badge'i (Dashboard shu hujjatni o'qiydi) ──────────────
const newCount = live.length + docs.length;
const stampIso = new Date().toISOString();
await setDoc(doc(db, 'settings', 'questionMeta'),
  { [category]: { count: newCount, updatedAt: stampIso } }, { merge: true });
const prevVer = (await getDoc(doc(db, 'settings', 'version'))).data() || {};
await setDoc(doc(db, 'settings', 'version'), {
  questionMeta: { ...(prevVer.questionMeta || {}), [category]: { count: newCount, updatedAt: stampIso } },
}, { merge: true });

console.log(`\n✅ ${category}: ${live.length} → ${newCount}`);
console.log('\n⚠️  KEYINGI QADAM (SHART):');
console.log(`   node scripts/build-fs-bundle.mjs ${category}`);
console.log('   node scripts/bump-questions-version.mjs');
process.exit(0);
