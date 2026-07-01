/**
 * Migratsiya: totalScore ni totalCorrect asosida tuzatish
 * 
 * Muammo: newCorrectCount qaytarilmagani sababli barcha foydalanuvchilarning
 * totalScore qiymati 0 bo'lib qolgan. totalCorrect esa to'g'ri hisoblanib kelgan.
 * 
 * Yechim: totalScore = totalCorrect qilib yangilaymiz.
 * Admin sifatida kiradi (barcha userStats ni o'zgartirish huquqi bor).
 * 
 * Ishlatish: node fix_scores_migration.js <admin_parol>
 */

import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function migrate() {
  const email = process.env.ADMIN_EMAIL || "998999154686@iqro.uz";
  const password = process.env.ADMIN_PASSWORD || process.argv[2];

  if (!password) {
    console.error("❌ Parolni kiriting: node fix_scores_migration.js <parol>");
    console.error("   yoki .env faylida ADMIN_PASSWORD ni to'ldiring");
    process.exit(1);
  }

  // Admin sifatida kirish
  console.log(`🔐 Admin sifatida kirish: ${email}`);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Muvaffaqiyatli kirildi!\n');
  } catch (err) {
    console.error('❌ Kirishda xatolik:', err.message);
    process.exit(1);
  }

  console.log('🔄 Barcha userStats ni o\'qish...\n');
  const snapshot = await getDocs(collection(db, 'userStats'));
  console.log(`👥 Jami foydalanuvchilar: ${snapshot.size}\n`);

  let fixed = 0;
  let alreadyOk = 0;
  let noData = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const uid = docSnap.id;
    const name = data.displayName || data.userName || uid.slice(0, 8);

    const totalCorrect = data.totalCorrect || 0;
    const currentScore = data.totalScore || 0;

    if (totalCorrect === 0) {
      noData++;
      continue;
    }

    if (currentScore >= totalCorrect) {
      alreadyOk++;
      console.log(`  ✅ ${name}: totalScore=${currentScore}, totalCorrect=${totalCorrect} — OK`);
      continue;
    }

    // totalScore ni totalCorrect ga teng qilamiz
    console.log(`  🔧 ${name}: totalScore ${currentScore} → ${totalCorrect}`);

    try {
      await updateDoc(doc(db, 'userStats', uid), {
        totalScore: totalCorrect,
      });
      fixed++;
    } catch (err) {
      console.error(`  ❌ ${name} (${uid}): ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Tuzatildi: ${fixed} ta foydalanuvchi`);
  console.log(`✅ Allaqachon to'g'ri: ${alreadyOk} ta`);
  console.log(`⏭️  Ma'lumot yo'q (totalCorrect=0): ${noData} ta`);
  console.log('═'.repeat(50));
  console.log('\n🎉 Migratsiya tugadi!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Xatolik:', err);
  process.exit(1);
});
