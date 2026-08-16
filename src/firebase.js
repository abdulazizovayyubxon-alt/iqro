import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
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

// ════════════════════════════════════════════════════════════════════
//  Firestore keshi — XOTIRADA, IndexedDB'da EMAS
// ════════════════════════════════════════════════════════════════════
//
// ⚠️ 2026-08-16, KUZATUV JURNALI TAHLILI — nega `persistentLocalCache` olib
// tashlandi:
//   `errorLogs` da 10 kun ichida 51 ta hal qilinmagan xatoning 47 tasi (92%)
//   BITTA oiladan chiqdi va hammasining ildizi shu yerdagi IndexedDB keshi edi:
//     · "FIRESTORE (12.17.0) INTERNAL ASSERTION FAILED ... (ID: 3029)" — 35 marta,
//       17 XIL foydalanuvchida, HAMMASI `/exam` sahifasida, hammasi Android;
//     · "... (ID: b815)" + "Failed to obtain exclusive access to the persistence
//       layer" — 8 marta (bitta hodisa ikki yozuv beradi);
//     · "Database is closing/hidden" — 9 marta.
//
//   MEXANIZM: imtihon uzoq davom etadi, odam telefonda boshqa ilovaga o'tadi
//   (qo'ng'iroq, xabar), Android fondagi tabning IndexedDB ulanishini yopib
//   qo'yadi. SDK buni kutmaydi — ichki holati buziladi va BUTUN Firestore o'ladi:
//   keyingi har qanday o'qish/yozish xato beradi. Foydalanuvchi buni "imtihon
//   natijam saqlanmadi" deb ko'radi. ~200 oylik faol foydalanuvchida 17 kishi =
//   taxminan 8-9%.
//
//   NEGA XOTIRA KESHI YETARLI — ilova offline ishlashini Firestore keshidan
//   OLMAYDI, uning o'z ikki qatlami bor:
//     · savollar paketi va tugallanmagan imtihon sessiyasi — `localforage`
//       (ALOHIDA IndexedDB bazasi, bu nosozlikka aloqasi yo'q);
//     · foydalanuvchi profili va progressi — `localStorage` (`iqro_cached_user`,
//       AppContext dual-backup).
//   Kod hech qayerda `fromCache`, `getDocFromCache` yoki `enableNetwork` ga
//   tayanmaydi — tekshirildi. Yo'qotiladigan yagona narsa: tarmoqsiz holatda
//   bildirishnoma/reyting ro'yxatlari bo'sh ko'rinadi (avval eski nusxa chiqardi).
//
// ⚠️ Bu o'zgarishni ORTGA QAYTARMANG jurnalni tekshirmasdan: `persistentLocalCache`
// qaytsa, yuqoridagi crash ham qaytadi.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

// Auth
export const auth = getAuth(app);
// Eslatma: `storage` (firebase/storage) ataylab shu yerda eksport QILINMAYDI —
// u faqat AdminPage'da kerak. Eager import dastlabki yuklanishni ~og'irlashtirardi.
// AdminPage o'zi `getStorage()` ni chaqiradi (default app, lazy chunk: fb-storage).
