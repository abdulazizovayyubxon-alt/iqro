import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

const MAX_CHUNK_BYTES = 800 * 1024;

async function main() {
  console.log('--- CHQBT SMART BUNDLE YUKLASH BOSHLANDI ---');
  
  // 1. Read local cleaned questions
  const localQuestionsPath = 'src/data/questions_chqbt.json';
  if (!fs.existsSync(localQuestionsPath)) {
    console.error('❌ Fayl topilmadi:', localQuestionsPath);
    process.exit(1);
  }

  const rawQuestions = JSON.parse(fs.readFileSync(localQuestionsPath, 'utf8'));
  console.log(`📋 Lokal bazada ${rawQuestions.length} ta savol o'qildi.`);

  // Ensure each question has a clean id
  const list = rawQuestions.map((q, idx) => ({
    id: q.id || `chqbt_${String(idx + 1).padStart(4, '0')}`,
    q: q.q,
    opts: q.opts,
    correct: q.correct,
    explanation: q.explanation || '',
    mnemonic: q.mnemonic || '',
    topicId: q.topicId,
    category: 'chqbt'
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
  const category = 'chqbt';

  // 3. Upload Firestore Bundle Chunks (questionBundles/chqbt__n)
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

  // 4. Upload Storage Bundle (bundles/chqbt.json) if storage is available
  const storagePath = `bundles/${category}.json`;
  let storageUploaded = false;
  try {
    console.log(`\n📤 2-QADAM: Firebase Storage ga paket yuklanmoqda (${storagePath})...`);
    const fullJson = JSON.stringify(list);
    await uploadBytes(ref(storage, storagePath), new Uint8Array(Buffer.from(fullJson, 'utf8')), {
      contentType: 'application/json',
      cacheControl: 'no-store',
    });
    console.log(`   ✓ Storage ga muvaffaqiyatli yuklandi: ${storagePath}`);
    storageUploaded = true;
  } catch (err) {
    console.warn('   ⚠️ Storage ga yuklashda ogohlantirish (Firestore Bundle asosiy yo\'l bo\'lib ishlaydi):', err.message);
  }

  // 5. Update settings/version
  console.log('\n⚙️ 3-QADAM: settings/version yangilanmoqda...');
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

  if (storageUploaded) {
    versionUpdate.bundles = {
      ...(prev.bundles || {}),
      [category]: { path: storagePath, count: list.length, updatedAt: nowIso },
    };
  }

  await setDoc(vref, versionUpdate, { merge: true });
  console.log(`✅ settings/version yangilandi!`);
  console.log(`   - dbVersion: ${dbVersion}`);
  console.log(`   - fsBundles.chqbt: ${chunks.length} ta bo'lak, ${list.length} ta savol`);

  // ── settings/questionMeta: UI SON SHU YERDAN O'QIYDI ────────────────────
  //
  // NEGA ALOHIDA: Dashboard.jsx va OnboardingPage.jsx fan kartochkasidagi
  // savol sonini ("ishonch badge" va blok soni) `settings/questionMeta`
  // hujjatidan oladi — yuqoridagi `settings/version.questionMeta` dan EMAS.
  // Ikkalasi bir xil nomli, lekin BOSHQA hujjat. Ilgari buni faqat admin
  // panelidagi "Yangilanishni yuborish" tugmasi yozardi, deploy esa yozmasdi —
  // shuning uchun deploy'dan keyin foydalanuvchi eski sonni ko'rardi (yoki
  // hujjat umuman bo'lmasa, son butunlay ko'rinmasdi).
  console.log('\n📐 4-QADAM: settings/questionMeta yangilanmoqda...');
  await setDoc(doc(db, 'settings', 'questionMeta'), {
    [category]: { count: list.length, updatedAt: nowIso },
  }, { merge: true });
  console.log(`   ✓ questionMeta.${category} = ${list.length}`);

  console.log(`\n🎉 BARCHASI TAYYOR! CHQBT to'liq paketi bulutga yuklandi.`);
}

main().catch((err) => {
  console.error('❌ Xatolik yuz berdi:', err);
  process.exit(1);
});
