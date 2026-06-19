import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ────────────────────────────────────────────────────────
// Firebase konfiguratsiyasi — .env faylidan olinadi
// Hech qachon kalitlarni to'g'ridan-to'g'ri kodga yozmang!
// ────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// .env faylida kalitlar borligini tekshirish (dev mode uchun ogohlantirish)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "⚠️ Firebase konfiguratsiya topilmadi! .env faylida VITE_FIREBASE_* kalitlari borligini tekshiring."
  );
}

// Ilovani ishga tushirish
const app = initializeApp(firebaseConfig);

// Bazaga ulanish (Firestore) — yangi API bilan offline persistence
// enableIndexedDbPersistence() — DEPRECATED (eskirgan)
// Yangi usul: initializeFirestore + persistentLocalCache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwnership: false })
  })
});

// Auth
export const auth = getAuth(app);
// Eslatma: `storage` (firebase/storage) ataylab shu yerda eksport QILINMAYDI —
// u faqat AdminPage'da kerak. Eager import dastlabki yuklanishni ~og'irlashtirardi.
// AdminPage o'zi `getStorage()` ni chaqiradi (default app, lazy chunk: fb-storage).
