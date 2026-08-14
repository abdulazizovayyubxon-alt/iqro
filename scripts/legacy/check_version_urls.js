import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkVersion() {
  console.log("\n🔍 settings/version hujjati tekshirilmoqda...\n");

  try {
    const snap = await getDoc(doc(db, "settings", "version"));
    if (!snap.exists()) {
      console.log("❌ settings/version hujjati YO'Q!");
      process.exit(1);
    }

    const data = snap.data();
    console.log("✅ settings/version MAVJUD");
    console.log("dbVersion:", data.dbVersion);
    console.log("\nurls maydoni:");
    
    const urls = data.urls || {};
    const allCategories = ['chqbt', 'art', 'tarix', 'sport', 'boshlangich', 'info', 'mtt', 'til', 'mtt_rahbar', 'nemis'];
    
    for (const cat of allCategories) {
      if (urls[cat]) {
        console.log(`  ✅ ${cat}: URL bor`);
      } else {
        console.log(`  ❌ ${cat}: URL YO'Q!`);
      }
    }

  } catch (e) {
    console.error("Xato:", e.message);
  }

  process.exit(0);
}

checkVersion();
