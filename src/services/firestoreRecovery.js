/**
 * Firestore ichki "assertion" xatosidan AVTOMATIK TIKLANISH
 *
 * MUAMMO:
 *   "FIRESTORE (x.y.z) INTERNAL ASSERTION FAILED: Unexpected state"
 *   Firebase JS SDK'ning uzoq yillik ichki nosozligi. Ko'pincha Android
 *   brauzerlarida (Samsung Internet, Chrome) sodir bo'ladi: OS ilova fonga
 *   o'tganda IndexedDB ulanishini yopib qo'yadi yoki tab "egaligi" (ownership)
 *   yo'qoladi → SDK ichki holati buziladi.
 *
 * OQIBATI:
 *   SDK butunlay ishlamay qoladi — keyingi HAR QANDAY o'qish/yozish xato beradi.
 *   Foydalanuvchi buni "imtihon natijam saqlanmadi" deb ko'radi.
 *
 * ⚠️ 2026-08-16 — BU MODUL ENDI ZAXIRA, BIRINCHI HIMOYA EMAS:
 *   Xatoning ILDIZI (firebase.js dagi `persistentLocalCache`) olib tashlandi —
 *   kesh endi xotirada, IndexedDB qatlami umuman yo'q. Ya'ni kutilayotgani:
 *   bu modul deyarli hech qachon ishga tushmaydi. Ataylab QOLDIRILDI, chunki
 *   assertion xatosi SDK'ning boshqa joyidan ham chiqishi mumkin va o'shanda
 *   ilovaning o'lik holatda qolgani reload'dan ko'ra yomonroq.
 *   Agar jurnalda bu xato QAYTA paydo bo'lsa — sabab boshqa, izlash shu yerdan
 *   emas, `errorLogs` dagi stack'dan boshlanadi.
 *
 * YECHIM:
 *   Buzilgan keshni tozalab, sahifani bir marta qayta yuklaymiz.
 *   Bu XAVFSIZ, chunki:
 *     • imtihon sessiyasi localforage'da (ALOHIDA IndexedDB bazasi) saqlanadi —
 *       clearIndexedDbPersistence unga TEGMAYDI, resume oynasi ishlaydi;
 *     • savollar bundle'i ham localforage'da — qayta yuklanmaydi.
 *   `clearIndexedDbPersistence` xotira keshida ma'nosiz — u xato tashlaydi va
 *   quyidagi `catch` uni yutadi. Reload esa baribir bajariladi, kerakli qism shu.
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

// ── TIKLAB BO'LMAYDIGAN assertion'lar ────────────────────────────────────
//
// ⚠️ JURNAL TAHLILI 2026-08-28 — nega bu ajratish paydo bo'ldi:
//   Hamma assertion ham keshning buzilishi emas. Firestore YOZILAYOTGAN
//   MA'LUMOT yaroqsiz bo'lganda ham xuddi shu xabarni beradi:
//     «... (ID: 3029) CONTEXT: {"type":"symbol"}»
//   Bu — mijoz kodidagi xato (obyekt ichida symbol/funksiya bor), keshga
//   aloqasi YO'Q. Bunday holatda reload HECH NARSANI tuzatmaydi: qayta
//   yuklangan ilova ayni ma'lumotni yana yasaydi va yana yiqiladi.
//
//   Narxi esa yuqori edi: 22 kun davomida imtihonni YAKUNLAYOTGAN odam
//   natija ekranidan uloqtirilardi (164 hodisa, 59 foydalanuvchi). Ya'ni
//   «tiklanish» xatoni tuzatmasdan, ustiga tajribani ham buzardi.
//
//   Belgisi: CONTEXT ichida "type" bo'lishi — bu Firestore ning
//   valueDescription() funksiyasidan chiqqan degani, ya'ni SDK qiymat
//   TURINI tavsiflay olmagan. Kesh muammosi hech qachon bunday ko'rinmaydi.
const isDataAssertion = (m) => m.includes('CONTEXT:') && m.includes('"type"');

/**
 * Keshni tozalash + reload bu xatoni tuzata OLADIMI?
 * Ma'lumot validatsiyasi xatosida — YO'Q (yuqoridagi izoh).
 */
export function isRecoverableAssertion(message) {
  const m = String(message || '');
  return ASSERTION_RE.test(m) && !isDataAssertion(m);
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
