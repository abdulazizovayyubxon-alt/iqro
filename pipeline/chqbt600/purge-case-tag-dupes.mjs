#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// purge-case-tag-dupes.mjs — `case_top*` seriyasidagi YORLIQLI takrorlarni
// o'chiradi.
//
// NIMA BO'LGAN (2026-08-30, ikkinchi qatlam):
//   `fix-case-collapse.mjs` case seriyasini masterdan tikladi va "200 noyob"
//   ko'rsatdi. Bu ALDAMCHI edi: master savollari oxiriga «(Nizomiy tahlil #6)»,
//   «(FM tahlili #8)» kabi RAQAMLI YORLIQ qo'yilgan. Yorliq tufayli matn
//   texnik jihatdan boshqa, lekin savolning O'ZI bir xil:
//       case_top1_001 / _006 / _011 / _016 …  → 14 ta ID, 1 ta savol
//   Ya'ni 200 ta case yozuvida atigi 21 ta HAQIQIY savol bor.
//
//   Ikkala manba ham (ilovaga tushgani ham, master ham) shu nuqson bilan:
//   birida bitta matn takrorlangan, ikkinchisida yorliq bilan niqoblangan.
//   `pipeline/chqbt600/new/*` dagi 625 savol esa TOZA (yorliqsiz ham 625 noyob)
//   va ularning 623 tasi bazada allaqachon bor — ya'ni almashtiradigan zaxira
//   manba yo'q. Shuning uchun yagona to'g'ri yo'l — ortiqchasini o'chirish.
//
// NIMA QILADI: har guruhdan ENG KICHIK raqamli bittasi qoladi, qolgani
//   o'chiriladi (fayldan; `--db` bilan Firestore'dan ham — u yerga bu
//   yozuvlar 2026-08-30 da yuklab yuborilgan).
//
// FOYDALANISH:
//   node pipeline/chqbt600/purge-case-tag-dupes.mjs                # quruq
//   node pipeline/chqbt600/purge-case-tag-dupes.mjs --apply        # fayl
//   node pipeline/chqbt600/purge-case-tag-dupes.mjs --apply --db   # fayl + baza
// ════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { normalizeQuestion } from '../../src/utils/qHash.js';

const APPLY = process.argv.includes('--apply');
const DB = process.argv.includes('--db');
const APP = 'src/data/questions_chqbt.json';

// Oxiridagi «(... #12)» / «(#3)» yorlig'ini olib tashlaydi
const strip = (s) => normalizeQuestion(String(s).replace(/\s*\([^()]*#\s*\d+\s*\)\s*$/, ''));

const app = JSON.parse(fs.readFileSync(APP, 'utf8'));
console.log(APPLY ? '🔴 REJIM: JONLI' : '🟢 REJIM: QURUQ YURISH');
console.log(`📄 ${APP}: ${app.length} ta savol`);

const groups = new Map();
app.forEach((q, i) => {
  const k = strip(q.q);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push({ i, q });
});

const removeIdx = new Set();
const removedTexts = [];
let groupCount = 0;
for (const items of groups.values()) {
  if (items.length < 2) continue;
  groupCount++;
  // Eng kichik raqamli ID qoladi (case_top1_001), qolgani ketadi
  const sorted = [...items].sort((a, b) => String(a.q.id).localeCompare(String(b.q.id)));
  for (const x of sorted.slice(1)) { removeIdx.add(x.i); removedTexts.push(x.q.q); }
}

console.log(`   takror guruh   : ${groupCount}`);
console.log(`   o'chiriladi    : ${removeIdx.size}`);
const out = app.filter((_, i) => !removeIdx.has(i));
console.log(`   qoladi         : ${out.length}`);

const left = new Set(out.map((q) => strip(q.q)));
if (left.size !== out.length) { console.error(`❌ Takror qolyapti (${out.length - left.size}) — yozilmadi`); process.exit(1); }
const caseLeft = out.filter((q) => /^case_top/.test(String(q.id || '')));
console.log(`   case_top* qoldi: ${caseLeft.length} ta (hammasi turli savol)`);

// Fayl bo'limi: --apply bo'lsa yoziladi. --db bilan chaqirilganda bu yerda TO'XTAMAYMIZ —
// baza tozalash mustaqil bosqich (fayl allaqachon toza bo'lishi mumkin).
if (!APPLY) {
  console.log("(quruq yurish — fayl o'zgarmadi. Jonli: --apply)");
  if (!DB) process.exit(0);
} else if (removeIdx.size === 0) {
  console.log("(faylda takror yo'q — fayl tegilmadi)");
} else {

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `src/data/backup_chqbt_tagdup_${stamp}.json`;
fs.copyFileSync(APP, backup);
fs.writeFileSync(APP, JSON.stringify(out, null, 2));
console.log(`\n💾 Zaxira: ${backup}`);
console.log(`✅ ${APP}: ${app.length} → ${out.length}`);

}

if (!DB) { console.log("\n(baza tegilmadi. Firestore uchun: --db)"); process.exit(0); }

// ── Firestore: MUSTAQIL tozalash ────────────────────────────────────────
// Fayldan chiqqan ro'yxatga TAYANMAYDI: fayl allaqachon tozalangan bo'lsa u
// ro'yxat bo'sh bo'lardi. Bu yerda baza o'zi guruhlanadi — ya'ni skriptni
// istalgan paytda, mustaqil ishlatsa bo'ladi.
const { default: dotenv } = await import('dotenv');
dotenv.config();
const { initializeApp } = await import('firebase/app');
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc, setDoc, getDoc } =
  await import('firebase/firestore');

const fbApp = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(fbApp), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(fbApp);

const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', 'chqbt')));
console.log(`\nFirestore: ${snap.size} ta chqbt savoli`);

const dbGroups = new Map();
for (const d of snap.docs) {
  const k = strip(d.data()?.q || '');
  if (!k) continue;
  if (!dbGroups.has(k)) dbGroups.set(k, []);
  dbGroups.get(k).push(d);
}
const toDelete = [];
for (const items of dbGroups.values()) {
  if (items.length < 2) continue;
  // Qoladigani: matni eng qisqa bo'lgani (ya'ni «#12» yorlig'i eng kichigi)
  const sorted = [...items].sort((a, b) => String(a.data()?.q || '').localeCompare(String(b.data()?.q || '')));
  toDelete.push(...sorted.slice(1));
}
console.log(`   takror guruh: ${[...dbGroups.values()].filter((v) => v.length > 1).length}`);
console.log(`   o'chiriladi : ${toDelete.length}`);
[...dbGroups.values()].filter((v) => v.length > 1).slice(0, 10).forEach((v) =>
  console.log(`     ${String(v.length).padStart(3)} nusxa | ${JSON.stringify(String(v[0].data()?.q || '').slice(0, 70))}`));

if (!APPLY) { console.log('\n(quruq yurish — baza tegilmadi. Jonli: --apply --db)'); process.exit(0); }
if (toDelete.length === 0) { console.log('\nBazada takror yo\'q.'); process.exit(0); }

for (let i = 0; i < toDelete.length; i += 400) {
  const batch = writeBatch(db);
  for (const d of toDelete.slice(i, i + 400)) batch.delete(d.ref);
  await batch.commit();
}
const newCount = snap.size - toDelete.length;
console.log(`🗑️  ${toDelete.length} ta hujjat o'chirildi | baza: ${snap.size} → ${newCount}`);

const iso = new Date().toISOString();
await setDoc(doc(db, 'settings', 'questionMeta'), { chqbt: { count: newCount, updatedAt: iso } }, { merge: true });
const prev = (await getDoc(doc(db, 'settings', 'version'))).data() || {};
await setDoc(doc(db, 'settings', 'version'),
  { questionMeta: { ...(prev.questionMeta || {}), chqbt: { count: newCount, updatedAt: iso } } }, { merge: true });
console.log('🔢 questionMeta yangilandi:', newCount);

// Firebase SDK tarmoq ulanishini ochiq qoldiradi — bu satrsiz skript ishini
// tugatgach ham chiqmaydi (2026-08-30 da 10 daqiqa osilib turdi).
process.exit(0);
