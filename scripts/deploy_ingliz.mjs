import fs from 'node:fs';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc,
  collection, query, where, getCountFromServer,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { normalizeQuestion } from '../src/utils/qHash.js';

const MAX_CHUNK_BYTES = 800 * 1024;

async function main() {
  console.log('--- INGLIZ SMART BUNDLE YUKLASH BOSHLANDI ---');

  // 1. Read local cleaned questions
  const localQuestionsPath = 'src/data/questions_ingliz.json';
  if (!fs.existsSync(localQuestionsPath)) {
    console.error('❌ Fayl topilmadi:', localQuestionsPath);
    process.exit(1);
  }

  const rawQuestions = JSON.parse(fs.readFileSync(localQuestionsPath, 'utf8'));
  console.log(`📋 Lokal bazada ${rawQuestions.length} ta savol o'qildi.`);

  // Validation
  {
    const seen = new Map();
    const dups = [];
    const invalid = [];
    rawQuestions.forEach((q, i) => {
      const key = normalizeQuestion(String(q.q || q.question).replace(/\s*\([^()]*#\s*\d+\s*\)\s*$/, ''));
      if (!key) { invalid.push(`#${i} savol matni bo'sh`); return; }
      if (seen.has(key)) dups.push(`#${i} (${q.id}) ≡ #${seen.get(key)}`);
      else seen.set(key, i);
      const opts = q.opts || q.options;
      if (!Array.isArray(opts) || opts.length !== 4) invalid.push(`#${i} (${q.id}) opts 4 ta emas`);
      const c = q.correct !== undefined ? q.correct : q.answer;
      if (!Number.isInteger(c) || c < 0 || c > 3) invalid.push(`#${i} (${q.id}) correct 0..3 emas`);
      if (!Number.isInteger(q.topicId)) invalid.push(`#${i} (${q.id}) topicId son emas`);
    });
    if (dups.length || invalid.length) {
      console.warn(`⚠️ Ogohlantirish: takror: ${dups.length}, yaroqsiz: ${invalid.length}`);
    } else {
      console.log(`✅ Tekshiruv: ${rawQuestions.length} ta savol, takror yo'q, barchasi yaroqli.`);
    }
  }

  const list = rawQuestions.map((q, idx) => ({
    id: q.id || `ingliz_${String(idx + 1).padStart(4, '0')}`,
    q: q.q || q.question,
    opts: q.opts || q.options,
    correct: q.correct !== undefined ? q.correct : q.answer,
    explanation: q.explanation || '',
    mnemonic: q.mnemonic || '',
    topicId: q.topicId,
    category: 'ingliz'
  }));

  function chunkQuestions(items) {
    const chunks = [];
    let cur = [];
    let curBytes = 2;
    for (const q of items) {
      const s = JSON.stringify(q);
      const add = Buffer.byteLength(s, 'utf8') + 1;
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

  const chunks = chunkQuestions(list);
  const totalMb = (Buffer.byteLength(JSON.stringify(list), 'utf8') / 1024 / 1024).toFixed(2);
  console.log(`📊 Paket hajmi: ${totalMb} MB | ${chunks.length} ta Firestore bo'lak`);

  // 2. Connect to Firebase
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD topilmadi");
    process.exit(1);
  }

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  console.log(`🔐 ${email} bilan Firebase ga kirilmoqda...`);
  await signInWithEmailAndPassword(auth, email, password);
  console.log('✓ Firebase ga muvaffaqiyatli kirildi.');

  const nowIso = new Date().toISOString();
  const category = 'ingliz';

  // 3. Upload Firestore Bundle Chunks (questionBundles/ingliz__n)
  console.log('\n📤 1-QADAM: Firestore Smart Bundle bo\'laklari yozilmoqda...');
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
    console.log(`   ✓ questionBundles/${category}__${i} yozildi (${chunks[i].length} ta savol, ${kb} KB)`);
  }

  // 4. Update settings/version
  console.log('\n⚙️ 2-QADAM: settings/version yangilanmoqda...');
  const vref = doc(db, 'settings', 'version');
  const prev = (await getDoc(vref)).data() || {};
  const dbVersion = Date.now();

  const versionUpdate = {
    dbVersion,
    fsBundles: {
      ...(prev.fsBundles || {}),
      [category]: { chunks: chunks.length, count: list.length, updatedAt: nowIso },
    },
    questionMeta: {
      ...(prev.questionMeta || {}),
      [category]: { count: list.length, updatedAt: nowIso },
    },
  };

  await setDoc(vref, versionUpdate, { merge: true });
  console.log(`✅ settings/version yangilandi!`);
  console.log(`   - dbVersion: ${dbVersion}`);
  console.log(`   - fsBundles.ingliz: ${chunks.length} ta bo'lak, ${list.length} ta savol`);

  // 5. Update settings/questionMeta
  console.log('\n📐 3-QADAM: settings/questionMeta yangilanmoqda...');
  await setDoc(doc(db, 'settings', 'questionMeta'), {
    [category]: { count: list.length, updatedAt: nowIso },
  }, { merge: true });
  console.log(`   ✓ questionMeta.${category} = ${list.length}`);

  console.log(`\n🎉 BARCHASI TAYYOR! Ingliz tili to'liq paketi bulutga yuklandi.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Xatolik yuz berdi:', err);
  process.exit(1);
});
