import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

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

async function restore() {
  console.log("🔍 ART bo'limidagi (topicId: 7) barcha savollar tekshirilmoqda...");
  const snap = await getDocs(collection(db, 'questions'));

  const militaryMedicalPedagogyWords = [
    "garnizon", "qorovullik", "nizom", "taktik", "biologik", "bakteriologik", "chqbt", "kema", "kapitan", "flot", "zobit", "askar", "qurol", "stvol", "mudofaa",
    "sinf rahbari", "topografiya", "relyef", "gorizontal", "izogipsa", "moliya", "maktab", "o'quv", "xavfsizlik", "qonun", "serjant", "ofitser", "mashinalarga",
    "shaxsiy tarkib", "komandir", "minalar", "muhandislik", "otish", "doktrina", "boshliq", "tarbiyaviy", "interaktiv", "o'quvchilar", "fuqaro", "trayektoriya",
    "ballistika", "fiksatsiyalovchi", "konstitutsiya", "gauptvaxta", "soqchi", "yig'inlar", "safarbarlik", "chaqiruv"
  ];

  // Lekin quyidagi sof san'at so'zlari bo'lsa, ularni adashib harbiy demaymiz:
  const pureArtOverride = ["miniatyura", "mona liza", "jokonda", "leonardo", "rafael", "mikelanjelo", "impressionizm", "luvr", "eritaj", "yog'och o'ymakorligi", "so'zana", "zardo'zi", "karvonsaroy", "sardoba", "kalta minor", "islomxo'ja", "muralqa", "muraqqa", "behzod", "syurrealizm", "salvador dali", "skandinavcha", "provans", "futer", "eko-uslub", "gost", "aksonometrik", "dimetrik", "izometrik", "a4 format", "a3 format", "rezba", "shponka", "shpilka", "tsirkul", "o'lcham chizig'i", "mashinasozlik", "fasad"];

  const toRestore = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const qText = (data.q || "").toLowerCase();
    const topicId = data.topicId;
    const category = data.category;

    if (topicId >= 7 || category === 'art') {
      const matchedMilOverride = militaryMedicalPedagogyWords.find(w => qText.includes(w));
      const matchedArtOverride = pureArtOverride.find(w => qText.includes(w));

      if (matchedMilOverride && !matchedArtOverride) {
        // Determine correct topicId
        let correctTopicId = 0; // Default Harbiy xizmat asoslari

        if (["nizom", "qorovullik", "garnizon", "saf", "kema", "flot", "kapitan", "zobit", "serjant", "ofitser", "boshliq", "gauptvaxta", "soqchi"].some(w => qText.includes(w))) {
          correctTopicId = 1;
        } else if (["otish", "qurol", "stvol", "o'q", "avtomat", "mergan", "trayektoriya", "ballistika"].some(w => qText.includes(w))) {
          correctTopicId = 2;
        } else if (["taktik", "topografiya", "relyef", "xarita", "izogipsa", "azimut", "gorizontal"].some(w => qText.includes(w))) {
          correctTopicId = 3;
        } else if (["biologik", "bakteriologik", "avariya", "kimyoviy", "muhofaza", "fuqaro"].some(w => qText.includes(w))) {
          correctTopicId = 4;
        } else if (["bemor", "bog'lam", "shikast", "yarador", "fiksatsiyalovchi"].some(w => qText.includes(w))) {
          correctTopicId = 5;
        } else if (["sinf rahbari", "tarbiya", "pedagog", "o'quvchi", "interaktiv"].some(w => qText.includes(w))) {
          correctTopicId = 6;
        } else if (["chqbt", "mudofaa", "doktrina", "konstitutsiya", "qonun", "xona", "moliya", "maktab", "yig'inlar", "safarbarlik"].some(w => qText.includes(w))) {
          correctTopicId = 0;
        }

        toRestore.push({
          id: docSnap.id,
          correctTopicId,
          q: data.q
        });
      }
    }
  });

  console.log(`\n⚠️ ART bo'limida (topicId: 7) adashib turgan HARBIY savollar: ${toRestore.length} ta\n`);
  toRestore.forEach((item, idx) => {
    console.log(`${idx + 1}. [ID: ${item.id}] (qaytariladigan topicId: ${item.correctTopicId}) -> "${item.q.slice(0, 90)}..."`);
  });

  if (toRestore.length === 0) {
    console.log("🎉 Barcha harbiy savollar o'z joyida!");
    return;
  }

  console.log(`\n🚀 ${toRestore.length} ta savol CHQBT bo'limiga qaytarilmoqda...`);

  let restoredCount = 0;
  for (let i = 0; i < toRestore.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = toRestore.slice(i, i + 400);

    chunk.forEach(item => {
      const docRef = doc(db, 'questions', item.id);
      batch.update(docRef, { topicId: item.correctTopicId, category: 'chqbt' });
    });

    await batch.commit();
    restoredCount += chunk.length;
    console.log(`  ✅ ${restoredCount}/${toRestore.length} ta savol muvaffaqiyatli qaytarildi...`);
  }

  console.log(`\n🎉 Muvaffaqiyatli yakunlandi! Jami ${restoredCount} ta savol CHQBT bo'limiga qaytarildi.`);
}

restore().catch(console.error);
