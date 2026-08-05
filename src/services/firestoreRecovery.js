/**
 * Firestore ichki "assertion" xatosidan AVTOMATIK TIKLANISH
 *
 * MUAMMO:
 *   "FIRESTORE (x.y.z) INTERNAL ASSERTION FAILED: Unexpected state"
 *   Firebase JS SDK'ning uzoq yillik ichki nosozligi. Ko'pincha Android
 *   brauzerlarida (Samsung Internet, Chrome) sodir bo'ladi: OS ilova fonga
 *   o'tganda IndexedDB ulanishini yopib qo'yadi yoki tab "egaligi" (ownership)
 *   yo'qoladi → persistentLocalCache ichki holati buziladi.
 *
 * OQIBATI:
 *   SDK butunlay ishlamay qoladi — keyingi HAR QANDAY o'qish/yozish xato beradi.
 *   Foydalanuvchi buni "imtihon natijam saqlanmadi" deb ko'radi.
 *
 * YECHIM:
 *   Buzilgan IndexedDB keshini tozalab, sahifani bir marta qayta yuklaymiz.
 *   Bu XAVFSIZ, chunki:
 *     • imtihon sessiyasi localforage'da (ALOHIDA IndexedDB bazasi) saqlanadi —
 *       clearIndexedDbPersistence unga TEGMAYDI, resume oynasi ishlaydi;
 *     • savollar bundle'i ham localforage'da — qayta yuklanmaydi.
 *
 * HALQA HIMOYASI:
 *   sessionStorage bayrog'i — bir sessiyada FAQAT BIR MARTA reload qilinadi.
 *   Aks holda xato takrorlanaversa cheksiz reload halqasi yuzaga kelardi.
 */

const ASSERTION_RE = /FIRESTORE\s*\([\d.]+\)\s*INTERNAL ASSERTION FAILED/i;
const RECOVERED_FLAG = 'zehin_fs_recovered';

/** Xabar aynan Firestore ichki assertion xatosimi? */
export function isFirestoreAssertion(message) {
  return ASSERTION_RE.test(String(message || ''));
}

let running = false;

/** Vaqt chegarasi — buzilgan SDK'da promise'lar hech qachon hal bo'lmasligi mumkin */
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

/**
 * Keshni tozalab, sahifani bir marta qayta yuklaydi.
 * Ikkinchi marta chaqirilsa hech narsa qilmaydi (halqa himoyasi).
 */
export async function recoverFirestore() {
  if (running) return;
  running = true;

  try {
    if (sessionStorage.getItem(RECOVERED_FLAG)) return; // allaqachon urinib ko'rilgan
    sessionStorage.setItem(RECOVERED_FLAG, '1');
  } catch {
    return; // sessionStorage bloklangan (private rejim) — reload halqasi xavfi bor, to'xtaymiz
  }

  try {
    const [{ terminate, clearIndexedDbPersistence }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('../firebase'),
    ]);
    // terminate() SHART — clearIndexedDbPersistence faqat to'xtatilgan
    // instansiyada ishlaydi. Boshqa tab ochiq bo'lsa 'failed-precondition'
    // qaytaradi; bu holda ham reload in-memory holatni tiklaydi.
    await withTimeout(terminate(db), 1500);
    await withTimeout(clearIndexedDbPersistence(db), 1500);
  } catch {
    /* Tozalash imkoni bo'lmadi — reload baribir SDK holatini noldan tiklaydi */
  }

  window.location.reload();
}
