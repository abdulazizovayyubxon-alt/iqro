/**
 * upload_ona_tili_safe.js
 *
 * Firebase Web SDK orqali ona tili savollarini xavfsiz yuklash.
 * Quyidagilarni amalga oshiradi:
 *  1. Mahalliy JSON'dan savollar o'qish
 *  2. Schema tekshiruvi (q, opts[4], correct===0, topicId)
 *  3. Mahalliy dublikat tekshiruvi (normalised q text bo'yicha)
 *  4. Asosiy imlo tuzatish (detect + fix)
 *  5. Firebase'da allaqachon bor savollarni tekshirish
 *  6. Faqat yangi savollarni batch yuklash
 *  7. Batafsil hisobot chiqarish
 *
 * Ishga tushirish:
 *   node upload_ona_tili_safe.js
 */

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
import readline from "readline";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";


const require = createRequire(import.meta.url);
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

// ─────────────────────────────────────────────
//  SOZLAMALAR
// ─────────────────────────────────────────────
const QUESTIONS_FILE = path.join(__dirname, "src", "data", "questions_ona_tili.json");
const COLLECTION     = "questions";
const TOPIC_IDS      = [55, 56, 57, 58, 59, 60, 61, 62];
const BATCH_LIMIT    = 490;   // Firestore batch < 500

// Imlo tuzatish qoidalari
const SPELL_FIXES = [
  { re: /\bo'qitutchi\b/gi,  fix: "o'qituvchi"   },
  { re: /\bo'uvchi\b/gi,     fix: "o'quvchi"     },
  { re: /\bd'ars\b/gi,       fix: "dars"          },
  { re: /\bpedagig\b/gi,     fix: "pedagog"       },
  { re: /\bmetodika\b/gi,    fix: "metodika"      },  // shunchaki normallashtirish
  { re: /\bsintak?sis\b/gi,  fix: "sintaksis"     },
  { re: /\bfoneti[ck]a\b/gi, fix: "fonetika"      },
  { re: /\bleksik?a\b/gi,    fix: "leksika"       },
];

// ─────────────────────────────────────────────
//  YORDAMCHI FUNKSIYALAR
// ─────────────────────────────────────────────
const normalise = (s) =>
  (s || "").toLowerCase().replace(/[?.!،;:«»""'']/g, "").replace(/\s+/g, " ").trim();

const applySpellFix = (q) => {
  let changed = false;
  let text = q.q;
  SPELL_FIXES.forEach(({ re, fix }) => {
    if (re.test(text)) { text = text.replace(re, fix); changed = true; }
  });
  const opts = q.opts.map((o) => {
    let ot = o;
    SPELL_FIXES.forEach(({ re, fix }) => { if (re.test(ot)) ot = ot.replace(re, fix); });
    return ot;
  });
  return { ...q, q: text, opts, _spellFixed: changed };
};

const header = () => {
  console.log("\n══════════════════════════════════════════════");
  console.log("  ONA TILI SAVOLLARI — XAVFSIZ YUKLOVCHI v2  ");
  console.log("══════════════════════════════════════════════\n");
};

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
};

// ─────────────────────────────────────────────
//  ASOSIY JARAYON
// ─────────────────────────────────────────────
async function main() {
  header();

  console.log("🔑 Firebase Authentication:");
  const email = await askQuestion("Enter Admin Email (default: 998999154686@iqro.uz): ") || "998999154686@iqro.uz";
  const password = await askQuestion("Enter Admin Password: ");
  
  if (!password) {
    console.error("❌ Password cannot be empty.");
    process.exit(1);
  }

  const auth = getAuth(app);
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Signed in successfully!\n");
  } catch (err) {
    console.error("❌ Authentication failed:", err.message);
    process.exit(1);
  }

  // 1. FAYLNI O'QISH

  if (!existsSync(QUESTIONS_FILE)) {
    console.error(`❌ Fayl topilmadi: ${QUESTIONS_FILE}`);
    process.exit(1);
  }
  const rawAll = JSON.parse(readFileSync(QUESTIONS_FILE, "utf8"));
  const localQ = rawAll.filter((q) => TOPIC_IDS.includes(Number(q.topicId)));
  console.log(`📂 Fayl: ${rawAll.length} ta  |  Ona tili (55–62): ${localQ.length} ta`);

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // 2. SCHEMA + IMLO TEKSHIRUVI
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  console.log("\n[1/4] 📝 Schema va imlo tekshiruvi...");
  let schemaErr = 0, spellFixed = 0;
  const valid = [];

  localQ.forEach((raw, i) => {
    const n = i + 1;
    // Schema
    if (!raw.q || typeof raw.q !== "string" || raw.q.trim().length < 10) {
      console.warn(`  ⚠️  #${n}: "q" yo'q yoki juda qisqa`);
      schemaErr++; return;
    }
    if (!Array.isArray(raw.opts) || raw.opts.length !== 4) {
      console.warn(`  ⚠️  #${n}: "opts" 4 ta bo'lishi kerak`);
      schemaErr++; return;
    }
    if (Number(raw.correct) !== 0) {
      console.warn(`  ⚠️  #${n}: correct=${raw.correct} (0 bo'lishi kerak)`);
      schemaErr++; return;
    }
    const emptyOpt = raw.opts.findIndex((o) => !o || o.trim().length < 3);
    if (emptyOpt >= 0) {
      console.warn(`  ⚠️  #${n}: ${emptyOpt + 1}-variant juda qisqa`);
      schemaErr++; return;
    }

    // Imlo
    const fixed = applySpellFix(raw);
    if (fixed._spellFixed) {
      spellFixed++;
      // console.log(`  🔤 #${n}: imlo tuzatildi`);
    }
    valid.push(fixed);
  });

  console.log(`  ✅ Yaroqli: ${valid.length} ta  |  ❌ Schema xatolari: ${schemaErr} ta  |  🔤 Imlo tuzatildi: ${spellFixed} ta`);

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // 3. MAHALLIY DUBLIKAT TEKSHIRUVI
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  console.log("\n[2/4] 🔍 Mahalliy dublikat tekshiruvi...");
  const seen = new Map();
  const localDups = [];
  const unique = [];

  valid.forEach((q, i) => {
    const norm = normalise(q.q);
    if (seen.has(norm)) {
      localDups.push({ idx: i + 1, firstIdx: seen.get(norm), preview: q.q.slice(0, 70) });
    } else {
      seen.set(norm, i + 1);
      unique.push(q);
    }
  });

  if (localDups.length) {
    console.log(`  ⚠️  Mahalliy dublikatlar: ${localDups.length} ta (o'tkazib yuboriladi)`);
    localDups.slice(0, 8).forEach((d) =>
      console.log(`     • #${d.idx} ≡ #${d.firstIdx}: "${d.preview}..."`)
    );
  } else {
    console.log(`  ✅ Mahalliy dublikat yo'q!`);
  }
  console.log(`  📊 Unikal mahalliy savollar: ${unique.length} ta`);

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // 4. FIREBASE'DA MAVJUD SAVOLLARNI OLISH
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  console.log("\n[3/4] 🌐 Firebase'da mavjud savollar tekshirilmoqda...");
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
      console.log(`     Topic ${topicId}: Firebase'da ${snap.size} ta mavjud`);
    } catch (e) {
      console.warn(`     ⚠️  Topic ${topicId} so'rovida xato: ${e.message}`);
    }
  }
  console.log(`  📊 Firebase'da jami ona tili savollari: ${totalInFirebase} ta`);

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // 5. YANGI SAVOLLARNI AJRATISH
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  console.log("\n[4/4] 🆕 Yangi savollar ajratilmoqda...");
  const newQ = [];
  const fbDups = [];

  unique.forEach((q) => {
    const norm = normalise(q.q);
    if (existingNorms.has(norm)) {
      fbDups.push(q.q.slice(0, 70));
    } else {
      newQ.push(q);
    }
  });

  console.log(`  ✅ Yangi (yuklanadigan): ${newQ.length} ta`);
  console.log(`  ♻️  Firebase'da allaqachon bor: ${fbDups.length} ta`);

  if (newQ.length === 0) {
    console.log("\n  ℹ️  Yuklash uchun yangi savol yo'q. Hammasi allaqachon Firebase'da!");
    summary(localQ.length, valid.length, schemaErr, spellFixed, localDups.length, fbDups.length, 0, 0);
    process.exit(0);
  }

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // 6. BATCH YUKLASH
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  console.log(`\n🚀 ${newQ.length} ta yangi savol Firebase'ga yuklanmoqda...`);
  const now = new Date().toISOString();
  const col = collection(db, COLLECTION);
  let uploaded = 0, failed = 0;

  const categoryOf = (topicId) => {
    const tid = Number(topicId);
    if (tid >= 55 && tid <= 58) return "til";
    return "adabiyot";
  };

  for (let i = 0; i < newQ.length; i += BATCH_LIMIT) {
    const chunk = newQ.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((q) => {
      const ref = doc(col);
      batch.set(ref, {
        q:           q.q,
        opts:        q.opts,
        correct:     0,
        explanation: q.explanation || "",
        topicId:     Number(q.topicId),
        category:    q.category || categoryOf(q.topicId),
        createdAt:   now,
        source:      "ona_tili_v2",
      });
    });

    try {
      await batch.commit();
      uploaded += chunk.length;
      process.stdout.write(
        `\r  ⏳ Yuklandi: ${uploaded}/${newQ.length} (${Math.round((uploaded / newQ.length) * 100)}%)   `
      );
    } catch (e) {
      console.error(`\n  ❌ Batch xatosi (${i}–${i + chunk.length}): ${e.message}`);
      failed += chunk.length;
    }
  }

  console.log("\n");
  summary(localQ.length, valid.length, schemaErr, spellFixed, localDups.length, fbDups.length, uploaded, failed);
  process.exit(0);
}

function summary(total, valid, schErr, spell, localDup, fbDup, uploaded, failed) {
  console.log("══════════════════════════════════════════════");
  console.log("📋  YAKUNIY HISOBOT");
  console.log("══════════════════════════════════════════════");
  console.log(`  📁  Mahalliy fayldagi savollar (55–62)  : ${total}`);
  console.log(`  ✅  Schema tekshiruvidan o'tdi          : ${valid}`);
  console.log(`  ❌  Schema xatolari (o'tkazildi)        : ${schErr}`);
  console.log(`  🔤  Imlo tuzatildi                      : ${spell}`);
  console.log(`  🔁  Mahalliy dublikatlar (o'tkazildi)   : ${localDup}`);
  console.log(`  ♻️   Firebase dublikatlar (o'tkazildi)   : ${fbDup}`);
  console.log(`  🆙  Muvaffaqiyatli yuklandi             : ${uploaded}`);
  if (failed) console.log(`  ❌  Xato bilan o'tkazilmadi            : ${failed}`);
  console.log("══════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("❌ Kutilmagan xato:", e.message, e.stack);
  process.exit(1);
});
