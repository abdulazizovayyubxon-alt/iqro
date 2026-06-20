import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "iqro-platforma.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "iqro-platforma",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "iqro-platforma.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637089963772",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:637089963772:web:a4165d8ae157986cbac179",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  const email = process.env.ADMIN_EMAIL || "998999154686@iqro.uz";
  const password = process.env.ADMIN_PASSWORD || process.argv[2];
  if (!password || password === 'sizning_parolingiz') {
    console.error("❌ Parolni kiriting: node check_and_fix_version.js <parol> yoki .env faylida ADMIN_PASSWORD ni to'ldiring");
    process.exit(1);
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Tizimga kirildi!");
  } catch (err) {
    console.error("❌ Kirishda xatolik:", err.message);
    process.exit(1);
  }

  console.log("\n🔍 settings/version tekshirilmoqda...\n");
  const vRef = doc(db, 'settings', 'version');
  const snap = await getDoc(vRef);

  if (!snap.exists()) {
    console.log("❌ settings/version hujjati YO'Q!");
    console.log("\n🔧 Hujjat yaratilmoqda...\n");
    
    // Hujjatni yaratamiz (URLsiz - keyinroq qo'shiladi)
    await setDoc(vRef, {
      dbVersion: 0,
      urls: {}
    });
    console.log("✅ settings/version yaratildi (bo'sh urls bilan)");
    console.log("\n⚠️  Endi Firebase Storage'ga savollar JSON faylini yuklang va URL ni qo'shing.");
    console.log("   node set_version_url.js <parol> chqbt <url>");
  } else {
    const data = snap.data();
    console.log("✅ settings/version MAVJUD!");
    console.log("\n📄 Joriy ma'lumot:");
    console.log(JSON.stringify(data, null, 2));

    console.log("\n📊 Kategoriyalar tekshiruvi:");
    const cats = ['chqbt', 'art', 'tarix', 'sport', 'boshlangich', 'info', 'mtt', 'til', 'mtt_rahbar'];
    let missingCount = 0;
    for (const cat of cats) {
      if (data.urls && data.urls[cat]) {
        // URL ni tekshiramiz
        try {
          const res = await fetch(data.urls[cat], { method: 'HEAD' });
          if (res.ok) {
            console.log(`  ✅ ${cat}: URL ishlayapti (${res.status})`);
          } else {
            console.log(`  ⚠️  ${cat}: URL mavjud lekin xato qaytaradi (${res.status})`);
            missingCount++;
          }
        } catch (e) {
          console.log(`  ❌ ${cat}: URL ishlayapti emas - ${e.message}`);
          missingCount++;
        }
      } else {
        console.log(`  ❌ ${cat}: URL YO'Q`);
        missingCount++;
      }
    }

    if (missingCount === 0) {
      console.log("\n✅ Barcha kategoriyalar URL lari to'g'ri! Muammo boshqa joyda.");
      console.log("   Tekshiring: foydalanuvchi tizimga kirganmi? /api/get-questions ishlayaptimi?");
    } else {
      console.log(`\n❌ ${missingCount} ta kategoriyada URL yo'q yoki ishlamaydi!`);
      console.log("   Bu savollar yuklanmasligi sababidir.");
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Umumiy xatolik:", err);
  process.exit(1);
});
