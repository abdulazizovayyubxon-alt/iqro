#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// upload-fan4-subjects.mjs — prepare-fan4-subjects.mjs natijasini Firestore
// `questions` kolleksiyasiga yozadi, DETERMINISTIK hujjat ID bilan.
//
//   fan 4/_app/<category>.json  →  questions/<category>_NNNN
//
// upload-new-subjects.mjs dan farqi: u tasodifiy ID bilan yozadi va fan
// bazada bor bo'lsa o'tkazib yuboradi — kvota yarim yo'lda tugasa davom
// ettirishning xavfsiz yo'li yo'q. Bu yerda qayta ishga tushirish o'sha
// hujjatlarni QAYTA YOZADI, dublikat paydo bo'lmaydi.
//
// `--changed`: faqat oxirgi muvaffaqiyatli yuklangandan beri O'ZGARGAN
//   savollar yoziladi. Taqqoslash `fan 4/_app/<category>.uploaded.json`
//   nusxasi bilan (har fan to'liq yuklangach shu nusxa yangilanadi). Tuzatish
//   qatlami (overrides) qo'shilganda butun fanni emas, faqat tegilgan
//   hujjatlarni yozish uchun — kunlik 20 000 yozuv kvotasi tejaladi.
// `--prune`: nusxada bor, lekin endi tayyor ro'yxatda yo'q hujjatlarni o'chiradi
//   (masalan, keyinroq xato deb tashlangan savol). Busiz faqat ogohlantiradi.
//
// ⚠️ KVOTA (Spark: kuniga 20 000 yozuv): kvota tugaganda Firestore promise'i
//   rad etmaydi, abadiy kutadi. Shuning uchun har partiya timeout bilan
//   yuboriladi; uzilsa skript qaysi joyda to'xtaganini aytadi → `--from N`.
//
// ⚠️ firestore.rules da shu fanlarning topicId oraliqlari DEPLOY qilingan
//   bo'lishi shart, aks holda yozuv "permission-denied" bilan rad etiladi.
//
// Keyingi qadamlar (paket ilova shu yerdan o'qiydi):
//   node scripts/build-fs-bundle.mjs <fan>      (har o'zgargan fan uchun)
//   node scripts/bump-questions-version.mjs     (mavjud savol matni o'zgargan bo'lsa)
//
// FOYDALANISH:
//   node scripts/upload-fan4-subjects.mjs --dry-run
//   node scripts/upload-fan4-subjects.mjs
//   node scripts/upload-fan4-subjects.mjs --changed --dry-run
//   node scripts/upload-fan4-subjects.mjs --subject tarbiya --from 1200
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, query, where, limit, getDocs, writeBatch, doc, serverTimestamp,
} from 'firebase/firestore';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const changedOnly = argv.includes('--changed');
const prune = argv.includes('--prune');
const argVal = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const only = argVal('--subject');
const from = Number(argVal('--from') || 0);

// topicId oraliqlari firestore.rules bilan bir xil. pedmahorat — umumiy fan:
// 167–176 MTT yo'nalishi, 204–211 maktab yo'nalishi.
const SUBJECTS = [
  { slug: 'matematika', ranges: [[146, 153]] },
  { slug: 'tarbiya', ranges: [[154, 166]] },
  { slug: 'pedmahorat', ranges: [[167, 176], [204, 211]] },
  { slug: 'fizika', ranges: [[177, 185]] },
  { slug: 'texnologiya_dizayn', ranges: [[186, 195]] },
  { slug: 'texnologiya_servis', ranges: [[196, 203]] },
].filter((s) => !only || s.slug === only);
const inRanges = (s, id) => s.ranges.some(([a, b]) => id >= a && id <= b);
const rangesLabel = (s) => s.ranges.map(([a, b]) => `${a}-${b}`).join(', ');

if (!SUBJECTS.length) { console.error(`❌ Noma'lum fan: ${only}`); process.exit(1); }
if (from && !only) { console.error('❌ --from faqat --subject bilan ishlatiladi'); process.exit(1); }

const BATCH = 400;          // Firestore limiti 500
const BATCH_TIMEOUT_MS = 90_000;
const snapshotFile = (slug) => `fan 4/_app/${slug}.uploaded.json`;

// ── Ma'lumotni tekshirish ─────────────────────────────────────────────────
const payload = [];
for (const s of SUBJECTS) {
  const file = `fan 4/_app/${s.slug}.json`;
  if (!fs.existsSync(file)) { console.error(`❌ Fayl yo'q: ${file} — avval prepare-fan4-subjects.mjs`); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ids = new Set();
  for (const [i, q] of rows.entries()) {
    const bad =
      typeof q.docId !== 'string' || !q.docId.startsWith(`${s.slug}_`) || ids.has(q.docId) ||
      !q.q || q.q.length < 10 ||
      !Array.isArray(q.opts) || q.opts.length !== 4 ||
      !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3 ||
      q.category !== s.slug || 'id' in q ||
      !Number.isInteger(q.topicId) || !inRanges(s, q.topicId);
    if (bad) { console.error(`❌ ${s.slug} #${i} (${q.docId}) yaroqsiz: sxema/docId/topicId/category`); process.exit(1); }
    ids.add(q.docId);
  }

  let toWrite = rows;
  let removed = [];
  if (changedOnly) {
    if (!fs.existsSync(snapshotFile(s.slug))) {
      console.error(`❌ ${s.slug}: ${snapshotFile(s.slug)} yo'q — avval --changed siz to'liq yuklang`);
      process.exit(1);
    }
    const prev = new Map(JSON.parse(fs.readFileSync(snapshotFile(s.slug), 'utf8')).map((r) => [r.docId, JSON.stringify(r)]));
    toWrite = rows.filter((r) => prev.get(r.docId) !== JSON.stringify(r));
    removed = [...prev.keys()].filter((id) => !ids.has(id));
  }
  payload.push({ ...s, rows, toWrite, removed });
  console.log(`✓ ${s.slug.padEnd(11)} ${rows.length} savol (topicId ${rangesLabel(s)})${changedOnly ? ` · o'zgargan ${toWrite.length}` : ''}${removed.length ? ` · ro'yxatdan chiqqan ${removed.length}` : ''}`);
}

if (dryRun) {
  const total = payload.reduce((a, s) => a + Math.max(0, s.toWrite.length - from), 0);
  const dels = prune ? payload.reduce((a, s) => a + s.removed.length, 0) : 0;
  console.log(`\n[dry-run] ${total} ta yozuv${dels ? ` va ${dels} ta o'chirish` : ''} bo'lardi. Hech narsa yozilmadi.`);
  process.exit(0);
}

// ── Firebase ──────────────────────────────────────────────────────────────
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q"); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);
console.log(`\n🔐 ${email} bilan kirilmoqda... (loyiha: ${process.env.VITE_FIREBASE_PROJECT_ID})`);
await signInWithEmailAndPassword(getAuth(app), email, password);

const withTimeout = (p, label) => Promise.race([
  p,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout (${BATCH_TIMEOUT_MS / 1000}s): ${label}`)), BATCH_TIMEOUT_MS)),
]);

let written = 0;
for (const s of payload) {
  // Bazada shu fanning BOSHQA shakldagi (tasodifiy ID) hujjatlari bo'lsa,
  // bu yuklash ularni almashtirmaydi — ikki nusxa paydo bo'lardi.
  const probe = await getDocs(query(collection(db, 'questions'), where('category', '==', s.slug), limit(5)));
  const foreign = probe.docs.filter((d) => !d.id.startsWith(`${s.slug}_`));
  if (foreign.length) {
    console.error(`\n❌ ${s.slug}: bazada deterministik bo'lmagan ID'li hujjat bor (${foreign.map((d) => d.id).join(', ')}) — dublikat bo'lmasligi uchun to'xtatildi.`);
    process.exit(1);
  }

  const list = s.toWrite;
  console.log(`\n📤 ${s.slug}: ${list.length - from} ta yozuv${from ? ` (${from}-dan davom)` : ''}`);
  for (let i = from; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    const batch = writeBatch(db);
    for (const { docId, ...data } of chunk) {
      batch.set(doc(db, 'questions', docId), { ...data, createdAt: serverTimestamp() });
    }
    try {
      await withTimeout(batch.commit(), `${s.slug} ${i}-${i + chunk.length}`);
    } catch (e) {
      console.error(`\n❌ ${s.slug}: ${i}-${i + chunk.length} partiyasi yozilmadi — ${e.message}`);
      console.error(`   Kvota tugagan bo'lishi mumkin (node diag-kvota.mjs). Davom ettirish:`);
      console.error(`   node scripts/upload-fan4-subjects.mjs --subject ${s.slug}${changedOnly ? ' --changed' : ''} --from ${i}`);
      process.exit(2);
    }
    written += chunk.length;
    console.log(`   ✅ ${Math.min(i + BATCH, list.length)}/${list.length}`);
  }

  if (s.removed.length) {
    if (prune) {
      for (let i = 0; i < s.removed.length; i += BATCH) {
        const batch = writeBatch(db);
        s.removed.slice(i, i + BATCH).forEach((id) => batch.delete(doc(db, 'questions', id)));
        await withTimeout(batch.commit(), `${s.slug} o'chirish ${i}`);
      }
      console.log(`   🗑  ${s.removed.length} ta ro'yxatdan chiqqan hujjat o'chirildi`);
    } else {
      console.warn(`   ⚠️  ${s.removed.length} ta hujjat bazada qoldi (ro'yxatda yo'q): ${s.removed.slice(0, 8).join(', ')} — o'chirish uchun --prune`);
    }
  }

  // Fan to'liq yozildi — keyingi `--changed` shu holatga nisbatan hisoblanadi
  if (!s.removed.length || prune) {
    fs.writeFileSync(snapshotFile(s.slug), JSON.stringify(s.rows, null, 2) + '\n', 'utf8');
  }
}

console.log(`\n📊 Yakun: ${written} ta yozuv.`);
console.log('   Keyingi qadam: o\'zgargan har fan uchun `node scripts/build-fs-bundle.mjs <fan>`,');
console.log('   mavjud savol matni o\'zgargan bo\'lsa `node scripts/bump-questions-version.mjs`.');
process.exit(0);
