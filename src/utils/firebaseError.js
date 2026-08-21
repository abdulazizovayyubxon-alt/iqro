/**
 * ════════════════════════════════════════════════════════════════════════
 *  firebaseError.js — Firestore xatosini ODAM O'QIYDIGAN gapga aylantirish
 *
 *  NEGA KERAK (2026-08-20 hodisasi):
 *    Admin panelda foydalanuvchiga Pro berish ishlamadi. Panel esa
 *    `catch (e) { showToast("Xatolik yuz berdi") }` deb turardi — ya'ni
 *    sababni KO'RSATMASDI. Haqiqiy sabab butunlay boshqa joyda edi:
 *    loyihaning Firestore YOZUV KVOTASI tugagan (`resource-exhausted`),
 *    ya'ni ilovadagi hech qanday yozuv ishlamayotgan edi. Admin buni
 *    "tugma buzuq" deb o'qidi va bir necha soat noto'g'ri joyni qidirdi.
 *
 *    Xabar aniq bo'lganda xulosa ham to'g'ri bo'ladi: "kvota tugagan"
 *    degan gap darhol Firebase rejasiga olib boradi, panel kodiga emas.
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * Sun'iy xato kodi: yozuv belgilangan vaqtda tugamadi.
 * Firestore kodlari `firestore/...` ko'rinishida bo'lgani uchun o'zimizning
 * kodni `zehin/` prefiksi bilan ajratamiz.
 */
export const TIMEOUT_CODE = 'zehin/timeout';

/**
 * Kod → tushuntirish. Har biri IKKI narsani aytadi: nima bo'ldi va
 * KEYIN NIMA QILISH kerak. Faqat "xatolik" deyish adminni ko'r qoldiradi.
 */
const MESSAGES = {
  // ⚠️ Eng muhimi. Spark (bepul) rejada kuniga 20 000 yozuv / 50 000 o'qish.
  // Tugasa BUTUN loyihada yozuv rad etiladi — bitta amal emas.
  'resource-exhausted':
    "Firestore kvotasi tugagan — hozir bazaga HECH QANDAY yozuv o'tmaydi. "
    + "Bu tugmaning nosozligi emas: Firebase rejasi/limitini tekshiring.",

  // firestore.rules Vercel bilan deploy QILINMAYDI — kod chiqib, qoidalar
  // chiqmagan oraliqda aynan shu xato keladi.
  'permission-denied':
    "Ruxsat berilmadi. Ehtimol `firebase deploy --only firestore:rules` "
    + "hali bajarilmagan yoki hisobingizda admin huquqi yo'q.",

  'unauthenticated':
    "Seans tugagan — paneldan chiqib, qaytadan kiring.",

  'unavailable':
    "Firestore vaqtincha javob bermayapti yoki internet uzilgan. Qayta urinib ko'ring.",

  'deadline-exceeded':
    "Server javob berishga ulgurmadi. Qayta urinib ko'ring.",

  'not-found':
    "Hujjat topilmadi — u o'chirilgan bo'lishi mumkin. Ro'yxatni yangilang.",

  'already-exists':
    "Bunday yozuv allaqachon bor.",

  'failed-precondition':
    "So'rov bajarilmadi — kerakli Firestore indeksi yo'q bo'lishi mumkin "
    + "(brauzer konsolida indeks yaratish havolasi chiqadi).",

  'invalid-argument':
    "Yuborilgan ma'lumot noto'g'ri — maydonlarni tekshiring.",

  'aborted':
    "Bir vaqtda boshqa o'zgarish bo'ldi (tranzaksiya to'xtadi). Qayta urinib ko'ring.",

  'cancelled':
    "Amal bekor qilindi.",

  // Bizning timeout — Firestore'ning o'zi bermaydi.
  //
  // ⚠️ NEGA BU ALOHIDA KERAK: `resource-exhausted` holatida Firestore SDK
  // promise'ni RAD ETMAYDI — u cheksiz "backoff" bilan qayta urinaveradi.
  // Ya'ni `await updateDoc(...)` hech qachon tugamaydi va `catch` ishga
  // TUSHMAYDI. Shuning uchun kvota tugaganda panel xato ko'rsatmasdi —
  // tugma shunchaki abadiy aylanardi. `withWriteTimeout` shu holatni
  // ko'rinadigan qiladi.
  [TIMEOUT_CODE]:
    "Yozuv belgilangan vaqtda tugamadi. Eng ehtimoliy sabab — Firestore "
    + "kvotasi tugagan yoki internet yo'q. O'zgarish SAQLANMAGAN.",
};

/**
 * Xatoni toast uchun tayyor satrga aylantiradi.
 * Noma'lum kodda `message` qaytadi — "Xatolik yuz berdi" dan ko'ra baribir foydali.
 */
export function describeFirebaseError(e) {
  const code = e?.code ? String(e.code).replace(/^firestore\//, '') : null;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (e?.message) return `Xatolik: ${e.message}`;
  return 'Xatolik yuz berdi (sabab aniqlanmadi)';
}

/**
 * Yozuvni vaqt bilan chegaralaydi.
 *
 * Firestore yozuvlari tarmoq yo'q bo'lganda yoki kvota tugaganda
 * "kutish" holatida qoladi va promise SETTLE BO'LMAYDI. UI esa shu
 * promise'ni kutib turadi — natijada spinner abadiy aylanadi va
 * foydalanuvchi amal bajarilgan-bajarilmaganini BILMAYDI.
 *
 * ⚠️ MUHIM: timeout — yozuv BEKOR QILINDI degani EMAS. Firestore keyinroq
 * (masalan kvota tiklanganda) uni baribir yozib qo'yishi mumkin. Shuning
 * uchun xabar "saqlanmagan" deb qat'iy aytmaydi, "o'zgarish saqlanmagan"
 * deb ogohlantiradi va admin ro'yxatni yangilab tekshirishi kerak.
 *
 * @param {Promise} promise  Firestore yozuvi
 * @param {number} ms        kutish chegarasi (default 12 s — odatiy yozuv <1 s)
 */
export function withWriteTimeout(promise, ms = 12000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('write timeout');
      err.code = TIMEOUT_CODE;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
