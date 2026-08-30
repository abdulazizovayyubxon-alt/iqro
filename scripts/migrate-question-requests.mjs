#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// migrate-question-requests.mjs — `questionRequests` ni TAKRORSIZ shaklga
// o'tkazadi: har (uid, fan, mavzu) uchun BITTA hujjat, ID'si
// `${uid}__${fan}__${topicId}`.
//
// NEGA (2026-08-30 tahlili):
//   Mijoz ilgari `addDoc` ishlatardi — har yozuv YANGI tasodifiy ID. "Allaqachon
//   so'radi" belgisi esa localStorage'ga `await` TUGAGACH yozilardi. Sekin
//   tarmoqda tugmani qayta bosgan odam bir necha hujjat yaratardi: 41 yozuvning
//   11 tasi shunday takror (bitta foydalanuvchi 1,7 soniyada 6 ta yozgan).
//   Admin paneldagi «talab darajasi» shu sababli shishib ko'rinardi.
//
//   src/services/questionRequests.js endi hujjat ID'sini (uid, fan, mavzu) dan
//   yasaydi — takror yozuv fizik jihatdan mumkin emas. Bu skript ESKI
//   yozuvlarni ham o'sha shaklga keltiradi; aks holda xotirasi tozalangan
//   qurilma eski tasodifiy ID yonida YANGI hujjat yaratib, takror qaytardi.
//
// GURUHDAN NIMA SAQLANADI: eng ERTA so'rov (talab qachon paydo bo'lgani
//   muhim), `fulfilled` esa guruhda bittasi ham bajarilgan bo'lsa — `true`.
//
// FOYDALANISH:
//   node scripts/migrate-question-requests.mjs           # quruq yurish
//   node scripts/migrate-question-requests.mjs --apply   # jonli
// ════════════════════════════════════════════════════════════════════════
import 'dotenv/config';
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q"); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(app), email, password);
const db = getFirestore(app);
console.log(`🔐 ${email}`);
console.log(APPLY ? '🔴 REJIM: JONLI' : '🟢 REJIM: QURUQ YURISH');

const snap = await getDocs(collection(db, 'questionRequests'));
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
console.log(`\n📥 Jami hujjat: ${rows.length}`);

const msOf = (r) => (r.timestamp?.toDate ? r.timestamp.toDate().getTime() : 0);
const idFor = (r) => `${r.uid}__${r.category || ''}__${r.topicId ?? -1}`;

// ── Guruhlash ───────────────────────────────────────────────────────────
const groups = new Map();
for (const r of rows) {
  const key = idFor(r);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const plan = [];
for (const [key, items] of groups) {
  // ENG ERTA so'rov qoladi — talab qachon paydo bo'lgani muhim.
  const sorted = [...items].sort((a, b) => msOf(a) - msOf(b));
  const keep = sorted[0];
  plan.push({
    key,
    keep,
    deleteIds: sorted.slice(1).map((x) => x.id),
    dupCount: items.length - 1,
  });
}

const dups = plan.reduce((a, p) => a + p.dupCount, 0);
console.log(`   noyob (uid, fan, mavzu): ${plan.length}`);
console.log(`   takror yozuv           : ${dups}`);
console.log("\n   takrori bor guruhlar:");
plan.filter((p) => p.dupCount > 0).forEach((p) =>
  console.log(`   ${String(p.dupCount + 1).padStart(2)} yozuv → 1 | ${p.keep.category} t${p.keep.topicId} ${p.keep.topicName}`));

if (!APPLY) {
  console.log(`\n(quruq yurish — hech narsa yozilmadi. Jonli: --apply)`);
  process.exit(0);
}

// ── Zaxira: o'chirishdan OLDIN xom holat faylga ─────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `src/data/backup_question_requests_${stamp}.json`;
fs.writeFileSync(backup, JSON.stringify(rows.map((r) => ({
  ...r,
  timestamp: r.timestamp?.toDate ? r.timestamp.toDate().toISOString() : null,
})), null, 1));
console.log(`\n💾 Zaxira: ${backup}`);

// ── Faqat TAKRORLARNI o'chirish ────────────────────────────────
// Dastlab bu yerda hujjatlar YANGI (uid__fan__mavzu) ID'ga ko'chirilardi.
// Firestore rad etdi va bu TO'G'RI: firestore.rules da
//     allow create: if isLoggedIn() && request.resource.data.uid == request.auth.uid
// ya'ni hujjatni faqat EGASI yarata oladi — admin boshqa odam nomidan
// yozolmaydi (va yozolmagani ma'qul: so'rov egasi haqiqiy bo'lishi kerak).
//
// Shuning uchun eski yozuvlar joyida qoladi, faqat ORTIQCHA nusxalar
// o'chiriladi (admin uchun delete ochiq). Kelajakdagi takrorni mijozning
// o'zi to'xtatadi: src/services/questionRequests.js endi hujjat ID'sini
// (uid, fan, mavzu) dan yasaydi.
const toDelete = plan.flatMap((p) => p.deleteIds);
for (let i = 0; i < toDelete.length; i += 400) {
  const batch = writeBatch(db);
  for (const id of toDelete.slice(i, i + 400)) batch.delete(doc(db, 'questionRequests', id));
  await batch.commit();
}
console.log(`🗑️  ${toDelete.length} ta takror hujjat o'chirildi`);

const after = await getDocs(collection(db, 'questionRequests'));
console.log(`\n✅ ${rows.length} → ${after.size} ta hujjat`);
process.exit(0);
