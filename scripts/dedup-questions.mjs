#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// dedup-questions.mjs — bir fanning AYNAN TAKRORLANGAN savollarini o'chiradi.
//
// NEGA KERAK (2026-08-29 tekshiruvi):
//   Dashboard fan kartochkasida «Jami 3026 ta savol mavjud» yozilardi, test
//   sahifasi esa xuddi SHU gapni 2383 raqami bilan ko'rsatardi. Sabab —
//   ikkita mustaqil manba:
//     · Dashboard  → settings/questionMeta.<fan>.count  (Firestore XOM hujjat soni)
//     · TestPage   → fullPool.length (mijoz filtrlaridan o'tgan hovuz)
//   Farqning 639 tasi — bazadagi haqiqiy dublikatlar: atigi 50 ta noyob matn,
//   ba'zisi 38 martagacha nusxalangan (ommaviy import bir necha bor qaytadan
//   yurgizilgan). TestPage ularni HAR SAFAR mijoz tomonda tashlab yuboradi
//   (TestPage.jsx `cleanForDedup`), ya'ni ular hech kimga ko'rinmaydi — lekin
//   bazada, paketda (2.4 MB trafik) va kvotada joy egallaydi.
//
// XAVFSIZLIK — NEGA O'CHIRISH PROGRESSNI BUZMAYDI:
//   Foydalanuvchi progressi (spacedCards, mistakes) savol HUJJAT ID'siga emas,
//   MATN hash'iga bog'langan: `engine/SmartQuestionEngine.js` →
//   `questionKey = 'h' + cyrb53(canonicalText(q.q))`. Dublikatning matni bir
//   xil bo'lgani uchun omon qolgan nusxa AYNAN o'sha kalitni beradi.
//
// QAT'IY QOIDA — FAQAT AYNAN BIR XIL MATN O'CHADI:
//   Mijozdagi `cleanForDedup` verguldan oldingi «kirish qismini» ham kesadi,
//   ya'ni MATNI FARQ QILADIGAN savollarni ham birlashtirishi mumkin. Bunday
//   guruhlar bu yerda O'CHIRILMAYDI — faqat hisobotda «qo'lda ko'rish kerak»
//   deb ko'rsatiladi. O'chirish uchun matn (padding/tipografiya tozalangandan
//   keyin) BAYTMA-BAYT bir xil bo'lishi shart.
//
// QAYSI NUSXA QOLADI: eng TO'LIQ hujjat (izoh, mnemonika, manba, rasm,
//   qiyinlik, qHash bo'yicha ball) → teng bo'lsa eng eskisi → keyin id bo'yicha.
//   Shu tufayli natija takrorlanuvchi (deterministik).
//
// FOYDALANISH:
//   node scripts/dedup-questions.mjs chqbt              # QURUQ YURISH (hech narsa o'chmaydi)
//   node scripts/dedup-questions.mjs chqbt --apply      # JONLI o'chirish
//   node scripts/dedup-questions.mjs chqbt art --apply  # bir nechta fan
//
// NARXI: fan boshiga ~3 000 o'qish (hujjatlarni sanash uchun) + o'chirilgan
//   hujjatlar soniga teng yozuv. Bepul Spark: 50 000 o'qish / 20 000 yozuv kunlik.
//
// ⚠️ O'CHIRGANDAN KEYIN SHART:
//   node scripts/build-fs-bundle.mjs <fan>       # paketni qayta qurish
//   node scripts/bump-questions-version.mjs      # mijoz keshini bekor qilish
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, query, where, getDocs,
  doc, getDoc, setDoc, writeBatch,
} from 'firebase/firestore';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const categories = argv.filter((a) => !a.startsWith('--'));

if (categories.length === 0) {
  console.error('❌ Fan kerak. Masalan: node scripts/dedup-questions.mjs chqbt');
  process.exit(1);
}

// ── Mijozdagi tozalash mantig'ining AYNAN nusxasi ────────────────────────
// Manba: src/utils/questionFixer.js. Bu yerda qayta yozilgan, chunki asl fayl
// `processQuestionsOnTheFly` ichida moslashtirish savollarini TASODIFIY
// aralashtiradi — kalit har yurishda o'zgarib, deterministik bo'lmasdi.
const APOS_RE = /[‘’ʻʼ´`]/g;
const DQUOTE_RE = /[“”]/g;
const TYPO_MAP = [[/\bVahziri\b/g, 'Vaziri'], [/\bShartmasa\b/g, 'Shartnomasa']];

function normalizeTypography(s) {
  if (typeof s !== 'string') return s;
  return s.replace(APOS_RE, "'").replace(DQUOTE_RE, '"');
}
function fixTypos(s) {
  if (typeof s !== 'string') return s;
  for (const [re, rep] of TYPO_MAP) s = s.replace(re, rep);
  return s;
}
function stripQuestionPadding(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/\s*\([^)]*Savol\s+kodi[^)]*\)/gi, '')
    .replace(/\s*#KS\d+\b/gi, '')
    .replace(/^\s*\[\s*Mavzu:[^\]]*\]\s*/i, '')
    .trim();
}
/** Ilova ko'radigan yakuniy savol matni (aralashtirishsiz). */
const displayText = (q) => stripQuestionPadding(fixTypos(normalizeTypography(q.q || '')));

/** Mijozdagi TestPage.jsx / ExamPage.jsx `cleanForDedup` — o'zgarishsiz. */
function cleanForDedup(text) {
  let clean = (text || '').trim().toLowerCase();
  clean = clean.replace(/^\s*\[mavzu:\s*[^\]]+\]\s*/gi, '');
  clean = clean.replace(/^\s*\[[^\]]+yangi\s+savol\]\s*/gi, '');
  clean = clean.replace(/\s*\(\s*savol\s+kodi\s*:\s*#[a-z0-9_]+\s*\)/gi, '');
  clean = clean.replace(/\s*#[a-z0-9_]+/gi, '');
  const parts = clean.split(/,\s+/);
  if (parts.length > 1) {
    const firstPart = parts[0].trim();
    const isIntro =
      /^(in|im|während|bei|für|dars|o'qituvchi|sinf|maktab|o'quvchi|ota-ona|attestatsiya|metodik|pedagogik|ichki|tashqi|harbiy|amaliy|kasbiy|ilmiy|seminar|muhokama)/i.test(firstPart) ||
      firstPart.split(' ').length <= 6;
    if (isIntro) return parts.slice(1).join(', ').trim();
  }
  return clean.trim();
}

/** Moslashtirish savolimi (opts[0] = «1-A, 2-B …») — mijoz uni aralashtiradi. */
const isMatchingQuestion = (q) =>
  Array.isArray(q.opts) && q.opts.length > 0 && /1\s*[-.]\s*[A-D]/i.test(q.opts[0]);

/** Qaysi nusxa qolishi kerak — mazmuni eng to'liq bo'lgani. */
function richness(q) {
  let s = 0;
  if (typeof q.explanation === 'string' && q.explanation.trim().length > 20) s += 4;
  if (typeof q.mnemonic === 'string' && q.mnemonic.trim()) s += 2;
  if (q.source) s += 1;
  if (q.image) s += 2;
  if (q.difficulty) s += 1;
  if (q.qHash) s += 1;
  return s;
}
/** createdAt Timestamp | ISO satr | yo'q → solishtiriladigan songa. */
function createdMs(q) {
  const c = q.createdAt;
  if (!c) return Number.MAX_SAFE_INTEGER; // sanasi yo'q bo'lsa oxirgi o'ringa
  if (typeof c.toMillis === 'function') return c.toMillis();
  if (typeof c.seconds === 'number') return c.seconds * 1000;
  const t = Date.parse(c);
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

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
const auth = getAuth(app);
const db = getFirestore(app);

console.log(`🔐 ${email} bilan kirilmoqda... (loyiha: ${cfg.projectId})`);
console.log(APPLY ? "🔴 REJIM: JONLI — hujjatlar O'CHIRILADI" : "🟢 REJIM: QURUQ YURISH — hech narsa o'chmaydi");
await signInWithEmailAndPassword(auth, email, password);

// E'tirozlar bir marta o'qiladi (barcha fanlar uchun umumiy).
console.log("\n📨 E'tirozlar o'qilmoqda (o'chirilgan savolga bog'lanib qolmasin)...");
const objectionsSnap = await getDocs(collection(db, 'objections'));
const objectionsByQid = new Map();
objectionsSnap.docs.forEach((d) => {
  const qid = d.data().questionId;
  if (!qid) return;
  if (!objectionsByQid.has(qid)) objectionsByQid.set(qid, []);
  objectionsByQid.get(qid).push(d.id);
});
console.log(`   ${objectionsSnap.size} ta e'tiroz, ${objectionsByQid.size} ta savolga bog'langan`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

for (const cat of categories) {
  console.log(`\n${'═'.repeat(72)}\n📖 ${cat}\n${'═'.repeat(72)}`);
  const snap = await getDocs(query(collection(db, 'questions'), where('category', '==', cat)));
  if (snap.empty) { console.warn(`⚠️  "${cat}" bo'yicha savol yo'q — o'tkazib yuborildi`); continue; }

  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`   xom hujjatlar: ${list.length}`);

  // ── 1. Mijoz kaliti bo'yicha guruhlash (u nimani birlashtirsa — shu) ──
  const byClientKey = new Map();
  for (const q of list) {
    const k = cleanForDedup(displayText(q));
    if (!k) continue; // bo'sh matn — mijoz ham tegmaydi
    if (!byClientKey.has(k)) byClientKey.set(k, []);
    byClientKey.get(k).push(q);
  }

  const toDelete = [];
  const conflicts = [];   // matni bir xil, lekin javob/variantlari FARQ qiladi
  const needsReview = []; // mijoz birlashtirgan, lekin matni bir xil EMAS
  let hiddenAlready = 0, stillVisible = 0;

  for (const [key, group] of byClientKey) {
    if (group.length < 2) continue;

    // Guruh ichida AYNAN bir xil matnlar bo'yicha qayta bo'lish
    const byExact = new Map();
    for (const q of group) {
      const t = displayText(q);
      if (!byExact.has(t)) byExact.set(t, []);
      byExact.get(t).push(q);
    }
    if (byExact.size > 1) {
      needsReview.push({ key, texts: [...byExact.keys()].map((t) => t.slice(0, 120)) });
    }

    for (const [text, dups] of byExact) {
      if (dups.length < 2) continue;
      // Eng to'liq → eng eski → id: deterministik tartib
      dups.sort((a, b) =>
        richness(b) - richness(a) || createdMs(a) - createdMs(b) || a.id.localeCompare(b.id));
      const keep = dups[0];
      const drop = dups.slice(1);

      const answers = new Set(dups.map((d) => `${d.correct}|${JSON.stringify(d.opts || [])}`));
      if (answers.size > 1) conflicts.push({ text: text.slice(0, 100), n: dups.length });

      // Mijoz bu nusxalarni allaqachon yashirganmi? Moslashtirish savollari
      // aralashtirilgani uchun matni har safar o'zgaradi ⇒ yashirilmaydi.
      if (isMatchingQuestion(keep)) stillVisible += drop.length; else hiddenAlready += drop.length;

      for (const d of drop) toDelete.push({ ...d, __keepId: keep.id });
    }
  }

  const uniqAfter = list.length - toDelete.length;
  console.log(`   o'chiriladi   : ${toDelete.length}`);
  console.log(`   qoladi        : ${uniqAfter}`);
  console.log(`      · ilova allaqachon yashirgan : ${hiddenAlready}`);
  console.log(`      · ilovada hali ko'rinayotgan : ${stillVisible} (moslashtirish savollari)`);
  if (conflicts.length) {
    console.log(`   ⚠️  matni bir xil, javobi FARQLI guruhlar: ${conflicts.length} ta`);
    conflicts.slice(0, 5).forEach((c) => console.log(`        ×${c.n} ${JSON.stringify(c.text)}`));
  }
  if (needsReview.length) {
    console.log(`   ⚠️  ilova birlashtirgan, lekin matni har xil (TEGILMAYDI): ${needsReview.length} ta`);
    needsReview.slice(0, 5).forEach((r) => {
      console.log(`        ~ ${JSON.stringify(r.key.slice(0, 70))}`);
      r.texts.slice(0, 2).forEach((t) => console.log(`            · ${JSON.stringify(t)}`));
    });
  }

  // E'tirozlar: o'chadigan savolga bog'langanlari omon qolgan nusxaga ko'chadi
  const objectionMoves = [];
  for (const d of toDelete) {
    for (const oid of objectionsByQid.get(d.id) || []) {
      objectionMoves.push({ objectionId: oid, from: d.id, to: d.__keepId });
    }
  }
  if (objectionMoves.length) console.log(`   📨 e'tiroz ko'chiriladi: ${objectionMoves.length} ta`);

  if (toDelete.length === 0) { console.log("   ✅ dublikat yo'q — hech narsa qilinmadi"); continue; }

  // ── 2. ZAXIRA — har doim, quruq yurishda ham ──
  const backupPath = `src/data/backup_dedup_${cat}_${stamp}.json`;
  fs.writeFileSync(backupPath, JSON.stringify({
    category: cat,
    createdAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    rawCount: list.length,
    deletedCount: toDelete.length,
    remaining: uniqAfter,
    objectionMoves,
    deleted: toDelete,
  }, null, 1));
  console.log(`   💾 zaxira: ${backupPath}`);

  if (!APPLY) {
    console.log("   (quruq yurish — hech narsa o'chirilmadi. Jonli yurgizish: --apply)");
    continue;
  }

  // ── 3. O'CHIRISH (450 talik to'plamlar) ──
  for (let i = 0; i < toDelete.length; i += 450) {
    const slice = toDelete.slice(i, i + 450);
    const batch = writeBatch(db);
    for (const d of slice) batch.delete(doc(db, 'questions', d.id));
    await batch.commit();
    console.log(`   🗑  ${Math.min(i + slice.length, toDelete.length)}/${toDelete.length} o'chirildi`);
  }

  // E'tirozlarni omon qolgan savolga ulash
  for (let i = 0; i < objectionMoves.length; i += 450) {
    const slice = objectionMoves.slice(i, i + 450);
    const batch = writeBatch(db);
    for (const m of slice) batch.update(doc(db, 'objections', m.objectionId), { questionId: m.to });
    await batch.commit();
  }
  if (objectionMoves.length) console.log(`   📨 ${objectionMoves.length} ta e'tiroz ko'chirildi`);

  // ── 4. Dashboard o'qiydigan sonni ham darhol to'g'rilash ──
  // settings/questionMeta — Dashboard.jsx va OnboardingPage.jsx shu hujjatni
  // o'qiydi; settings/version.questionMeta esa build-fs-bundle yozadi.
  // Ikkalasi ham yangilanmasa badge yana eski raqamda qolardi.
  const nowIso = new Date().toISOString();
  await setDoc(doc(db, 'settings', 'questionMeta'),
    { [cat]: { count: uniqAfter, updatedAt: nowIso } }, { merge: true });
  const prevVer = (await getDoc(doc(db, 'settings', 'version'))).data() || {};
  await setDoc(doc(db, 'settings', 'version'), {
    questionMeta: { ...(prevVer.questionMeta || {}), [cat]: { count: uniqAfter, updatedAt: nowIso } },
  }, { merge: true });
  console.log(`   ✅ ${cat}: ${list.length} → ${uniqAfter} (savol soni badge'i ham yangilandi)`);
}

if (APPLY) {
  console.log('\n⚠️  KEYINGI QADAM (SHART):');
  categories.forEach((c) => console.log(`   node scripts/build-fs-bundle.mjs ${c}`));
  console.log('   node scripts/bump-questions-version.mjs');
} else {
  console.log("\n(quruq yurish tugadi. Jonli o'chirish uchun: --apply)");
}
process.exit(0);
