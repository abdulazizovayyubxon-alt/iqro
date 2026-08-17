#!/usr/bin/env node
/**
 * find-question.mjs — savolni matn bo'yicha topish.
 *
 * ⚠️ NEGA BU FAYL BOR (2026-08-17 hodisasi):
 *   Ildizdagi `find_exact_question.js` shunday boshlanardi:
 *       const snap = await getDocs(collection(db, 'questions'));
 *   `questions` da ~47 000 hujjat bor, ya'ni BITTA ishga tushirish =
 *   47 000 Firestore o'qish = Spark bepul rejasining kunlik kvotasining
 *   (50 000) 94%. 2026-08-17 kuni production shu sababdan `quota_exceeded`
 *   holatiga tushdi: reyting, statistika va bildirishnomalar HAMMA
 *   foydalanuvchi uchun UTC yarim tunigacha ishlamadi.
 *
 *   Bu — YUK_VA_BARQARORLIK.md 2.3-bo'limida ogohlantirilgan naqsh:
 *   kvotani ilova emas, ishlab chiqish vositalari yeydi.
 *
 * QOIDA: bu vosita CHEKSIZ kolleksiya o'qishini UMUMAN QILA OLMAYDI.
 *   · standart rejim — LOKAL eksport fayllari, 0 ta o'qish;
 *   · `--firestore` — faqat `--category` bilan (fan boshiga ~2 900 o'qish,
 *     47 038 emas) va faqat `--yes` tasdig'i bilan.
 *
 * FOYDALANISH:
 *   node scripts/find-question.mjs "qidiruv matni"
 *   node scripts/find-question.mjs "matn" --firestore --category=chqbt --yes
 *
 * Lokal rejim savol matnini, variantlarini va `topicId` ni topadi. Firestore
 * hujjat ID'si kerak bo'lsagina (masalan tahrirlash uchun) ikkinchi rejim kerak.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const flagVal = (name) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const needle = args.find(a => !a.startsWith('--'));

if (!needle) {
  console.error('Qidiruv matni berilmadi.\n');
  console.error('  node scripts/find-question.mjs "Qurolning uchki qismi"');
  console.error('  node scripts/find-question.mjs "matn" --firestore --category=chqbt --yes');
  process.exit(1);
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const target = norm(needle);

const chop = (s, n = 120) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// ── 1-REJIM: lokal eksportlar (0 ta o'qish) ────────────────────────────────
function searchLocal() {
  const root = process.cwd();
  const files = fs.readdirSync(root).filter(f => /_app_import\.json$/.test(f));
  if (files.length === 0) {
    console.error('Lokal eksport fayli topilmadi (*_app_import.json).');
    return [];
  }

  const hits = [];
  for (const file of files) {
    let list;
    try {
      list = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    } catch (e) {
      console.warn(`  ${file} o'qilmadi: ${e.message}`);
      continue;
    }
    if (!Array.isArray(list)) continue;
    list.forEach((q, i) => {
      if (norm(q?.q).includes(target)) hits.push({ file, index: i, ...q });
    });
  }
  return hits;
}

// ── 2-REJIM: Firestore, FAN bo'yicha cheklangan ────────────────────────────
async function searchFirestore(category) {
  // Import shu yerda — lokal rejimda firebase paketi umuman yuklanmasin.
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');
  const dotenv = await import('dotenv');
  dotenv.default.config();

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  });
  const db = getFirestore(app);

  // ⚠️ `where('category','==',…)` MAJBURIY. Filtrsiz so'rov shu faylning
  // mavjud bo'lish sababi bo'lgan hodisani takrorlardi.
  const snap = await getDocs(
    query(collection(db, 'questions'), where('category', '==', category))
  );
  console.log(`  (${snap.size} hujjat o'qildi)`);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(q => norm(q.q).includes(target));
}

const chop2 = (arr) => (Array.isArray(arr) ? arr.map(o => chop(o, 60)) : arr);

async function main() {
  if (flags.has('--firestore')) {
    const category = flagVal('category');
    if (!category) {
      console.error('❌ `--firestore` uchun `--category=<fan>` MAJBURIY.\n');
      console.error('   Sababi: filtrsiz so\'rov ~47 000 o\'qish qiladi va Spark');
      console.error('   rejasining kunlik kvotasini bitta ishga tushirishda tugatadi.');
      console.error('   Fan bo\'yicha so\'rov ~2 900 o\'qish — 16 barobar arzon.\n');
      console.error('   node scripts/find-question.mjs "matn" --firestore --category=chqbt --yes');
      process.exit(1);
    }
    if (!flags.has('--yes')) {
      console.error(`⚠️  Bu so'rov «${category}» fanidan ~2 900 hujjat o'qiydi.`);
      console.error('   Spark kunlik kvotasi — 50 000. Davom etish uchun `--yes` qo\'shing.');
      process.exit(1);
    }
    console.log(`Firestore'dan qidirilmoqda (fan: ${category})…`);
    const hits = await searchFirestore(category);
    report(hits, true);
    return;
  }

  console.log('Lokal eksportlardan qidirilmoqda (0 ta Firestore o\'qishi)…');
  const hits = searchLocal();
  report(hits, false);
  if (hits.length > 0) {
    console.log('\nℹ️  Firestore hujjat ID\'si kerak bo\'lsa (tahrirlash uchun):');
    console.log(`   node scripts/find-question.mjs "${needle}" --firestore --category=<fan> --yes`);
  }
}

function report(hits, fromFirestore) {
  if (hits.length === 0) {
    console.log('\nHech narsa topilmadi.');
    if (!fromFirestore) {
      console.log('Lokal eksport eskirgan bo\'lishi mumkin — savol keyin qo\'shilgan bo\'lsa');
      console.log('u yerda bo\'lmaydi. U holda `--firestore --category=<fan>` bilan qidiring.');
    }
    return;
  }
  console.log(`\n${hits.length} ta moslik:\n`);
  hits.forEach((q, n) => {
    console.log(`── ${n + 1} ────────────────────────────────────────`);
    if (q.id) console.log(`  id:       ${q.id}`);
    if (q.file) console.log(`  fayl:     ${q.file} [${q.index}]`);
    console.log(`  savol:    ${chop(q.q, 200)}`);
    console.log(`  variant:  ${JSON.stringify(chop2(q.opts))}`);
    console.log(`  to'g'ri:  ${q.correct}`);
    console.log(`  topicId:  ${q.topicId}`);
    console.log('');
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
