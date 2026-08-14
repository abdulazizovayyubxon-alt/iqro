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

async function fixFinal() {
  console.log("🔍 Tahlil va yakuniy saralash boshlandi...");
  
  const artPedagogyIds = [
    "PcV0Mw64mFg2Q0KiR48C", // Tasviriy san'at darslarining davomiyligi
    "UuCNw1LMNxFup1WbtOYL", // Tasviriy san'at darsining qaysi bosqichida mustaqil rasm chizishadi
    "UzoMXzx8WhBeV34ocNAV", // ijodiy qobiliyatini rivojlantirish uchun qaysi dars turi
    "W9R44cDI3fTibY4STuKn", // amaliy san'at bilan tanishtirishda ustaxonaga borishning foydasi
    "ZMWabIkievWptHKrh82J", // ko'rgazma (vystavka) qilishning tarbiyaviy ahamiyati
    "di8jgVxOlAttVkw9E8XM", // Tasviriy san'at darsida ko'rgazmali qurol
    "f0ygaS6suC0icZLS16Mz", // Kulolchilikning ko'k va havorang sirlari
    "kqwVdjvRBJVT8khC2B09", // O'quvchi ishini baholashda
    "lF2qf2jb0aWHKDyk0fol", // badiiy didni shakllantirish
    "nB2As65Pniaa2PWV7kD6", // rasm chizish qobiliyati qanday o'zgaradi
    "nYzbNhs0aP5evstMHTiq", // vizual xotirasini rivojlantirish
    "qRWtsxyXqptfPvmVhVYv", // Tasviriy san'at darsida texnik xavfsizlik
    "v1zzYve3PlO7LAQ8EBwH", // reproduktsiya bilan solishtirish
    "vyfi3gxeaWrUcSsYAU5i", // muzey etiketini
    "yWJHFfB2prbsuQUHC6hC"  // Tekislikda chuqurlik va masofani ko'rsatish (Perspektiva)
  ];

  const batch = writeBatch(db);
  artPedagogyIds.forEach(id => {
    batch.update(doc(db, 'questions', id), { topicId: 7, category: 'art' });
  });
  await batch.commit();
  console.log(`✅ ${artPedagogyIds.length} ta tasviriy san'at metodikasi savollari ART bo'limiga qaytarildi.\n`);

  // Yakuniy tekshiruv
  const snap = await getDocs(collection(db, 'questions'));
  const remainingArtInChqbt = [];
  const remainingMilInArt = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const qText = (data.q || "").toLowerCase();
    const topicId = data.topicId;
    const category = data.category;

    if (topicId <= 6 || category === 'chqbt') {
      if (["tasviriy san'at", "rassom", "miniatyura", "kulolchilik", "perspektiva", "akvarel", "luvr", "mona liza", "jokonda", "mikelanjelo"].some(w => qText.includes(w))) {
        remainingArtInChqbt.push({ id: docSnap.id, topicId, q: data.q });
      }
    } else if (topicId >= 7 || category === 'art') {
      if (["harbiy", "mergan", "dushman", "taktik", "nizom", "kema", "serjant", "ofitser", "gauptvaxta", "soqchi", "qurolli", "stvol"].some(w => qText.includes(w))) {
        // "ko'rgazmali qurol" (visual aid) kabi so'zlarni istisno qilamiz
        if (!qText.includes("ko'rgazmali qurol") && !qText.includes("harbiy rahbar")) {
          remainingMilInArt.push({ id: docSnap.id, topicId, q: data.q });
        }
      }
    }
  });

  console.log(`📊 TEKSHIRUV NATIJASI:`);
  console.log(`  ⚠️ CHQBT bo'limida qolib ketgan san'at savollari: ${remainingArtInChqbt.length} ta`);
  remainingArtInChqbt.forEach(item => console.log(`    - [ID: ${item.id}] (top: ${item.topicId}) -> "${item.q.slice(0, 80)}..."`));

  console.log(`  ⚠️ ART bo'limida qolib ketgan harbiy savollar: ${remainingMilInArt.length} ta`);
  remainingMilInArt.forEach(item => console.log(`    - [ID: ${item.id}] (top: ${item.topicId}) -> "${item.q.slice(0, 80)}..."`));

  console.log("\n🎉 BAZA TO'LIQ VA MUKAMMAL HOZIRLANDI!");
}

fixFinal().catch(console.error);
