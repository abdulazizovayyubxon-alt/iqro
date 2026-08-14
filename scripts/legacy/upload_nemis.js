import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  where,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────
//  FIREBASE CONFIG
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ─────────────────────────────────────────────
//  SOZLAMALAR
// ─────────────────────────────────────────────
const QUESTIONS_FILE = path.join(__dirname, "src", "data", "questions_nemis.json");
const COLLECTION     = "questions";
const TOPIC_IDS      = [71, 72, 73, 74, 75, 76, 77, 78, 79];
const BATCH_LIMIT    = 490;   // Firestore batch limit is 500

// Helper to normalise questions for duplicate check
const normalise = (s) =>
  (s || "").toLowerCase().replace(/[?.!،;:«»""'']/g, "").replace(/\s+/g, " ").trim();

// Shuffle and prefix options with A), B), C), D)
const shuffleWithCorrect = (opts, correctIdx) => {
  const arr = [...opts];
  const correctText = arr[correctIdx];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const newCorrectIdx = arr.indexOf(correctText);
  const letters = ['A', 'B', 'C', 'D'];
  const relabeled = arr.map((opt, idx) => {
    const text = opt.replace(/^[A-D]\)\s*/, '');
    return `${letters[idx]}) ${text}`;
  });
  return { opts: relabeled, correct: newCorrectIdx !== -1 ? newCorrectIdx : 0 };
};

async function main() {
  console.log("\n=========================================");
  console.log("🚀 GERMAN LANGUAGE QUESTIONS UPLOADER v1");
  console.log("=========================================\n");

  const email = process.env.ADMIN_EMAIL || "998999154686@iqro.uz";
  const password = process.env.ADMIN_PASSWORD;
  if (password && password !== 'sizning_parolingiz') {
    console.log(`🔑 Tizimga kirilmoqda (${email})...`);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Tizimga muvaffaqiyatli kirildi!");
    } catch (err) {
      console.error("❌ Tizimga kirishda xatolik:", err.message);
      process.exit(1);
    }
  } else {
    console.log("ℹ️ Parol kiritilmadi va .env da ADMIN_PASSWORD topilmadi. Parolsiz urinib ko'ramiz...");
  }

  if (!existsSync(QUESTIONS_FILE)) {
    console.error(`❌ File not found: ${QUESTIONS_FILE}`);
    process.exit(1);
  }

  const rawQuestions = JSON.parse(readFileSync(QUESTIONS_FILE, "utf8"));
  const localQ = rawQuestions.filter((q) => TOPIC_IDS.includes(Number(q.topicId)));
  console.log(`📂 Read ${rawQuestions.length} total questions from file.`);
  console.log(`📂 Matching German topic IDs (71-79): ${localQ.length} questions.`);

  // 1. Schema Validation
  console.log("\n[1/4] Checking schema...");
  const valid = [];
  let schemaErrors = 0;

  localQ.forEach((q, i) => {
    const n = i + 1;
    if (!q.q || typeof q.q !== "string" || q.q.trim().length < 10) {
      console.warn(`  ⚠️ #${n}: question text (q) is missing or too short.`);
      schemaErrors++; return;
    }
    if (!Array.isArray(q.opts) || q.opts.length !== 4) {
      console.warn(`  ⚠️ #${n}: opts must be an array of exactly 4 options.`);
      schemaErrors++; return;
    }
    if (Number(q.correct) !== 0) {
      console.warn(`  ⚠️ #${n}: correct answer index must be 0 (got: ${q.correct}).`);
      schemaErrors++; return;
    }
    valid.push(q);
  });
  console.log(`  ✅ Schema check: ${valid.length} valid, ${schemaErrors} errors.`);

  // 2. Local Duplicate Check
  console.log("\n[2/4] Checking local duplicates...");
  const seen = new Map();
  const unique = [];
  let localDups = 0;

  valid.forEach((q, i) => {
    const norm = normalise(q.q);
    if (seen.has(norm)) {
      localDups++;
    } else {
      seen.set(norm, i + 1);
      unique.push(q);
    }
  });
  console.log(`  ✅ Local deduplication: ${unique.length} unique, ${localDups} duplicates.`);

  // 3. Remote Firestore Check
  console.log("\n[3/4] Checking existing questions in Firestore...");
  const existingNorms = new Set();
  let totalInFirebase = 0;

  for (const topicId of TOPIC_IDS) {
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTION), where("topicId", "==", topicId))
      );
      snap.docs.forEach((d) => {
        const txt = d.data().q;
        if (txt) existingNorms.add(normalise(txt));
      });
      totalInFirebase += snap.size;
      console.log(`     Topic ${topicId}: Firestore has ${snap.size} questions`);
    } catch (e) {
      console.warn(`     ⚠️ Error checking topic ${topicId}: ${e.message}`);
    }
  }
  console.log(`  ✅ Firestore check: ${totalInFirebase} existing questions found.`);

  // 4. Filter out duplicates
  const newQ = [];
  let fbDups = 0;

  unique.forEach((q) => {
    const norm = normalise(q.q);
    if (existingNorms.has(norm)) {
      fbDups++;
    } else {
      newQ.push(q);
    }
  });

  console.log(`  ✅ Final count to upload: ${newQ.length}`);
  console.log(`  ♻️  Already in Firestore (skipped): ${fbDups}`);

  if (newQ.length === 0) {
    console.log("\n🎉 All questions are already uploaded to Firestore!");
    process.exit(0);
  }

  // 5. Batch Uploading
  console.log(`\n🚀 Uploading ${newQ.length} questions in batches...`);
  const now = new Date().toISOString();
  const col = collection(db, COLLECTION);
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < newQ.length; i += BATCH_LIMIT) {
    const chunk = newQ.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((q) => {
      const ref = doc(col);
      const { opts: shuffledOpts, correct: shuffledCorrect } = shuffleWithCorrect(q.opts, 0);
      
      batch.set(ref, {
        q:           q.q,
        opts:        shuffledOpts,
        correct:     shuffledCorrect,
        explanation: q.explanation || "",
        topicId:     Number(q.topicId),
        category:    "nemis",
        createdAt:   now,
        source:      "nemis_v1",
        mnemonic:    q.mnemonic || "",
        difficulty:  q.difficulty || "Y2",
        bloom_level: q.bloom_level || "Qo'llash",
      });
    });

    try {
      await batch.commit();
      uploaded += chunk.length;
      process.stdout.write(
        `\r  ⏳ Progress: ${uploaded}/${newQ.length} (${Math.round((uploaded / newQ.length) * 100)}%)   `
      );
    } catch (e) {
      console.error(`\n  ❌ Batch error (${i} to ${i + chunk.length}): ${e.message}`);
      failed += chunk.length;
    }
  }

  console.log("\n\n=========================================");
  console.log("📋 UPLOAD COMPLETE REPORT");
  console.log("=========================================");
  console.log(`  📁 Local file total     : ${rawQuestions.length}`);
  console.log(`  ✅ Validated schema     : ${valid.length}`);
  console.log(`  🔁 Local duplicates     : ${localDups}`);
  console.log(`  ♻️  Firestore duplicates : ${fbDups}`);
  console.log(`  🆙 Successfully uploaded: ${uploaded}`);
  if (failed) console.log(`  ❌ Failed to upload     : ${failed}`);
  console.log("=========================================\n");

  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e.message, e.stack);
  process.exit(1);
});
