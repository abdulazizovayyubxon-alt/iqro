import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDUlD2LaZegs0ifhNY2wLBDenB2oNX5sVU",
  authDomain: "iqro-platforma.firebaseapp.com",
  projectId: "iqro-platforma",
  storageBucket: "iqro-platforma.firebasestorage.app",
  messagingSenderId: "637089963772",
  appId: "1:637089963772:web:a4165d8ae157986cbac179",
  measurementId: "G-GPTQZDZ79J"
};

// Ilovani ishga tushirish
const app = initializeApp(firebaseConfig);

// Bazaga ulanish (Firestore)
export const db = getFirestore(app);

// Offline persistence (Keshni yoqish)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Firestore keshini faqat bitta tabda yoqish mumkin.");
    } else if (err.code === 'unimplemented') {
        console.warn("Brauzer Firestore keshini qo'llab-quvvatlamaydi.");
    }
});

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

