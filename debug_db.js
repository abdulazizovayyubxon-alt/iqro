
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, limit, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
  measurementId: "G-GPTQZDZ79J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const qRef = collection(db, 'questions');
  const snap = await getDocs(query(qRef, limit(3)));
  console.log("Documents found:", snap.size);
  snap.forEach(doc => {
    console.log("ID:", doc.id, "Data:", JSON.stringify(doc.data(), null, 2));
  });
}

check().catch(console.error);
