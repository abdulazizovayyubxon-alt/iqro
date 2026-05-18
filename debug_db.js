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

async function scanAndFix() {
  console.log("🔍 Firestore'dagi barcha savollar o'qilmoqda...");
  const snap = await getDocs(collection(db, 'questions'));
  
  // San'at, chizmachilik, arxitektura, dizayn va hunarmandchilikka oid barcha kalit so'zlar
  const artKeywords = [
    "mona liza", "jokonda", "rafael", "mikelanjelo", "leonardo", "donatello", "uyg'onish", "impressionizm", "hal tajsim", "luvr", "eritaj", "prado", "metropoliten",
    "yog'och o'ymakorligi", "xiva naqsh", "islimiy", "ganch", "kashtachilik", "so'zana", "rapport", "iroqi", "shahrisabz", "adras", "atlas", "bexasam", "shoyi",
    "zardo'zi", "mirhaydar", "shirin murodov", "marjon", "registon", "karvonsaroy", "sardoba", "kalta minor", "islomxo'ja", "muralqa", "muraqqa", "shayboniylar",
    "ichan qal'a", "ark qal'asi", "shohi zinda", "go'ri amir", "bibixonim", "behzod", "mirak naqqosh", "qosim ali", "mahmud muzahhib", "unvon", "ko'kaldosh",
    "minorai kalon", "siyoh", "qurum", "tashir", "tilla-qori", "muhammad aminxon", "syurrealizm", "salvador dali", "skandinavcha", "provans", "futer", "eko-uslub",
    "gost", "aksonometrik", "dimetrik", "izometrik", "a4 format", "a3 format", "rezba", "shponka", "shpilka", "tsirkul", "transportir", "o'lcham chizig'i",
    "kontur chizig'i", "proyeksiya", "dopuska", "tolerans", "mashinasozlik", "chizma", "san'at", "tasviriy", "rassom", "kompozitsiya", "haykal", "miniatyura",
    "dizayn", "akvarel", "palitra", "garmoniya", "me'mor", "bezak", "fasad", "poydevor", "perekritiye", "genplan", "eksplikatsiya", "izolyatsiya", "uklon",
    "kotlovan", "proportsiya", "smeta", "spetsifikatsiya", "armatura", "portik", "ventilyatsiya"
  ];

  // Harbiy va tibbiy so'zlar (bular qatnashgan savollarni chetlab o'tamiz)
  const militaryMedicalWords = [
    "harbiy", "mergan", "dushman", "kema", "serjant", "ofitser", "general", "nizom", "qurolli", "modda", "umurtqa", "taktik", "bemor", "mashinalarga", "shaxsiy tarkib",
    "komandir", "minalar", "muhandislik", "otish", "doktrina", "boshliq", "tarbiyaviy", "interaktiv", "o'quvchilar", "fuqaro", "trayektoriya", "ballistika", "fiksatsiyalovchi",
    "izogipsa", "kapitan"
  ];

  const toMigrate = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const qText = (data.q || "").toLowerCase();
    const topicId = data.topicId;

    if (topicId <= 6) {
      const matchedArt = artKeywords.find(w => qText.includes(w));
      const matchedMil = militaryMedicalWords.find(w => qText.includes(w));

      // Yuz foizlik sof san'at va chizmachilik so'zlari
      const isPureArt = [
        "miniatyura", "mona liza", "jokonda", "leonardo", "rafael", "mikelanjelo", "impressionizm", "luvr", "eritaj", "yog'och o'ymakorligi", "so'zana", "zardo'zi",
        "karvonsaroy", "sardoba", "kalta minor", "islomxo'ja", "muralqa", "muraqqa", "behzod", "syurrealizm", "salvador dali", "skandinavcha", "provans", "futer",
        "eko-uslub", "gost", "aksonometrik", "dimetrik", "izometrik", "a4 format", "a3 format", "rezba", "shponka", "shpilka", "tsirkul", "o'lcham chizig'i",
        "mashinasozlik", "fasad", "poydevor", "perekritiye", "genplan", "eksplikatsiya", "izolyatsiya", "kotlovan", "smeta", "spetsifikatsiya", "portik"
      ].some(w => qText.includes(w));

      if (isPureArt || (matchedArt && !matchedMil)) {
        toMigrate.push({
          id: docSnap.id,
          oldTopicId: topicId,
          oldCat: data.category,
          q: data.q
        });
      }
    }
  });

  console.log(`\n⚠️ Jami CHQBT bo'limida (topicId 0-6) turgan SAN'AT VA CHIZMACHILIK savollari: ${toMigrate.length} ta\n`);
  toMigrate.forEach((item, idx) => {
    console.log(`${idx + 1}. [ID: ${item.id}] (top: ${item.oldTopicId}) -> "${item.q.slice(0, 90)}..."`);
  });

  if (toMigrate.length === 0) {
    console.log("🎉 Barcha savollar joyida! Ko'chirishga ehtiyoj yo'q.");
    return;
  }

  console.log(`\n🚀 ${toMigrate.length} ta savol ART bo'limiga (topicId: 7, category: 'art') ko'chirilmoqda...`);

  let migratedCount = 0;
  for (let i = 0; i < toMigrate.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = toMigrate.slice(i, i + 400);

    chunk.forEach(item => {
      const docRef = doc(db, 'questions', item.id);
      batch.update(docRef, { topicId: 7, category: 'art' });
    });

    await batch.commit();
    migratedCount += chunk.length;
    console.log(`  ✅ ${migratedCount}/${toMigrate.length} ta savol muvaffaqiyatli ko'chirildi...`);
  }

  console.log(`\n🎉 Muvaffaqiyatli yakunlandi! Jami ${migratedCount} ta savol ART bo'limiga o'tkazildi.`);
}

scanAndFix().catch(console.error);
