/**
 * Eski Firestore IndexedDB keshini bir marta o'chirish (2026-08-16)
 *
 * NEGA KERAK:
 *   `firebase.js` da `persistentLocalCache` → `memoryLocalCache` ga o'tildi
 *   (sabab o'sha faylda batafsil yozilgan: Android'da imtihon paytida SDK'ni
 *   o'ldiradigan "INTERNAL ASSERTION FAILED" xatosi). Yangi sozlama bilan SDK
 *   `firestore/[DEFAULT]/<projectId>/main` bazasini BOSHQA OCHMAYDI — lekin
 *   MAVJUD foydalanuvchilarning telefonida u o'z holicha qolib ketadi.
 *
 *   Ya'ni bu crash manbai emas (hech kim ochmaydi), lekin O'LIK YUK: faol
 *   foydalanuvchida o'nlab megabaytga yetishi mumkin. Bu esa haqiqiy muammoga
 *   olib boradi — brauzer saqlash kvotasi to'lsa, BIZGA KERAK bo'lgan
 *   `localforage` (savollar paketi va tugallanmagan imtihon sessiyasi) yozilmay
 *   qoladi. Shuning uchun bo'shatamiz.
 *
 * XAVFSIZLIK:
 *   · FAQAT Firestore SDK'ning o'z bazasi o'chiriladi. `localforage`
 *     (savollar + imtihon sessiyasi) va `firebaseLocalStorageDb` (Auth —
 *     o'chirilsa foydalanuvchi tizimdan chiqib ketardi) TEGILMAYDI.
 *   · Baza yo'q bo'lsa `deleteDatabase` jimgina muvaffaqiyat qaytaradi.
 *   · `onblocked` — boshqa tab ushlab turibdi. Qayta urinmaymiz: bayroq
 *     qo'yilmaydi, demak keyingi ochilishda o'zi takrorlanadi.
 *   · Hech qanday xato yuqoriga chiqmaydi — tozalash ilovani BUZMASLIGI shart.
 */
import { firebaseConfig } from '../firebase';

const DONE_FLAG = 'zehin_legacy_fs_cache_dropped';

export function dropLegacyFirestoreCache() {
  try {
    if (typeof indexedDB === 'undefined') return;
    if (localStorage.getItem(DONE_FLAG)) return;
    const projectId = firebaseConfig?.projectId;
    if (!projectId) return;

    const req = indexedDB.deleteDatabase(`firestore/[DEFAULT]/${projectId}/main`);
    // Bayroq FAQAT muvaffaqiyatda qo'yiladi — bloklangan holat keyingi
    // ochilishda qayta urinib ko'riladi (o'shanda ikkinchi tab yopiq bo'ladi).
    req.onsuccess = () => { try { localStorage.setItem(DONE_FLAG, '1'); } catch { /* noop */ } };
  } catch {
    /* Tozalash HECH QACHON ilovani buzmasligi kerak */
  }
}

export default dropLegacyFirestoreCache;
