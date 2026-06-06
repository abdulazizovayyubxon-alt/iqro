import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function checkNemis() {
  console.log("\n🔍 Nemis savollari tekshirilmoqda...\n");

  const TOPIC_IDS = [71, 72, 73, 74, 75, 76, 77, 78, 79];
  let total = 0;

  for (const topicId of TOPIC_IDS) {
    try {
      const snap = await getDocs(
        query(collection(db, "questions"), where("topicId", "==", topicId))
      );
      console.log(`  Topic ${topicId}: ${snap.size} ta savol`);
      total += snap.size;
    } catch (e) {
      console.log(`  Topic ${topicId}: ❌ XATO - ${e.message}`);
      if (e.message.includes('permission') || e.message.includes('Missing')) {
        console.log(`    → Firestore rules login talab qiladi. Bu normal - savollar upload scriptdan yuklanadi.`);
      }
    }
  }

  console.log(`\n📊 Jami nemis savollari: ${total} ta`);
  
  if (total === 0) {
    console.log("\n❌ SABAB: Savollar Firestore'da yo'q!");
    console.log("   → upload_nemis.js ni ishlatib yuklash kerak");
    console.log("   → Avval Firestore Rules'da nemis ruxsatini qo'shing");
  } else {
    console.log("\n✅ Savollar bor. Muammo boshqa joyda.");
    console.log("   → settings/version dagi urls.nemis tekshirish kerak");
  }

  process.exit(0);
}

checkNemis().catch(e => {
  console.error("Xato:", e.message);
  process.exit(1);
});
