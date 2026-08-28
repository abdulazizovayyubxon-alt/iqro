/**
 * firestoreSafe.js — Firestore'ga yozishdan OLDINGI oxirgi to'siq.
 *
 * Firestore qabul qiladigan turlar to'plami cheklangan. Ikki xil buzilish bor
 * va ikkalasi ham JIMGINA kechadi:
 *
 *  1. `undefined` — `setDoc` BUTUN yozuvni rad etadi (masalan `spacedCards`
 *     yoki `mistakes` ichida `correct: undefined`). Natijada bulutga ball
 *     yozilmaydi, reyting 0 turadi.
 *
 *  2. `symbol` / `function` / `bigint` — bundan ham yomoni. Firestore bu
 *     turlarni xato XABARIDA ham tavsiflay olmaydi (`valueDescription` da
 *     ular uchun shox yo'q) va o'z ichki assertion'ini tashlaydi:
 *       «FIRESTORE INTERNAL ASSERTION FAILED (ID: 3029) CONTEXT: {"type":"symbol"}»
 *     Bu xato `setDoc` ichidan SINXRON otiladi — Promise hali YARATILMAGAN,
 *     ya'ni `.catch()` uni USHLAY OLMAYDI. Chaqiruvchi `try` ichida bo'lmasa,
 *     xato butun oqimni uzadi.
 *
 * ⚠️ JURNAL TAHLILI 2026-08-28 — NEGA BU QATLAM KERAK:
 *   ExamPage savol obyektiga `topicIcon` (React elementi) biriktirardi; u SRS
 *   kartasi orqali `state.spacedCards` ga, undan `userStats` yozuviga tushardi.
 *   React elementining `$$typeof` maydoni — Symbol. 22 kun ichida 164 crash,
 *   59 foydalanuvchi, hammasi jimgina: imtihon natijasi ekrani 0 ball ko'rsatar,
 *   bulutga esa hech narsa yozilmasdi.
 *
 *   Ildiz sabab MANBADA tuzatildi (`SmartQuestionEngine.heavyCardBody` va
 *   ExamPage'dan `topicIcon` ni olib tashlash). Bu modul esa ATAYLAB qo'shildi:
 *   kelajakda UI ma'lumoti state'ga yana sizib chiqsa, u yozuvni O'LDIRMASLIGI
 *   kerak — eng yomon holatda o'sha bitta maydon tushib qoladi, xolos.
 *
 * ⚠️ SENTINELLARGA TEGILMAYDI: `deleteField()`, `serverTimestamp()`,
 *   `Timestamp`, `Date`, `GeoPoint` — bularning `constructor` i `Object` emas,
 *   shuning uchun rekursiya ularning ichiga UMUMAN kirmaydi.
 */

/** Ichki belgi: "bu qiymat tashlab yuborilsin". */
const DROP = Symbol('firestore-drop');

const sanitize = (value) => {
  const t = typeof value;

  // Firestore umuman qabul qilmaydigan turlar
  if (value === undefined || t === 'symbol' || t === 'function' || t === 'bigint') return DROP;

  if (Array.isArray(value)) {
    // Massivda "bo'sh joy" qoldirib bo'lmaydi — yaroqsiz element olib tashlanadi.
    return value.map(sanitize).filter(v => v !== DROP);
  }

  if (value !== null && t === 'object') {
    // React elementi / portali / forwardRef — `$$typeof` Symbol bo'ladi.
    // Ichiga kirsak faqat ma'nosiz qoldiq (`{props, key, ref, _owner}`) qolardi
    // — aynan shu axlat 74 ta `userStats` hujjatiga tushib qolgan edi.
    if (typeof value.$$typeof === 'symbol') return DROP;

    // Oddiy obyekt bo'lmasa (Date, Timestamp, FieldValue sentineli) — tegmaymiz.
    if (value.constructor !== Object) return value;

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const s = sanitize(v);
      if (s !== DROP) out[k] = s;
    }
    return out;
  }

  return value;
};

/**
 * Obyektni Firestore qabul qiladigan holatga keltiradi.
 * Natija HAR DOIM yoziladigan bo'ladi — funksiya hech qachon xato tashlamaydi.
 */
export const sanitizeForFirestore = (value) => {
  const out = sanitize(value);
  return out === DROP ? {} : out;
};

export default sanitizeForFirestore;

/**
 * Chaqiruvni HAR DOIM Promise qilib qaytaradi — sinxron `throw` ham rad etilgan
 * Promise'ga aylanadi.
 *
 * ⚠️ NEGA KERAK: `setDoc`/`addDoc` ma'lumotni SINXRON tekshiradi. Yaroqsiz
 *   qiymatda xato Promise YARATILISHIDAN OLDIN otiladi, ya'ni yozilgan
 *   `.catch()` UMUMAN ishga tushmaydi:
 *
 *       setDoc(ref, buzuqData).catch(...)   // ← catch chaqirilmaydi, xato yuqoriga uchadi
 *
 *   2026-08 da aynan shu sabab bilan: (a) «Natijalar saqlanmadi» toast'i hech
 *   qachon ko'rinmagan, (b) `inFlightRef` bayrog'i abadiy yoqilgan qolib,
 *   seansning oxirigacha bulutga bitta ham yozuv ketmagan, (c) imtihon
 *   yakunlash funksiyasi yarmida uzilib, natija ekrani 0 ball ko'rsatgan.
 *
 *       asPromise(() => setDoc(ref, buzuqData)).catch(...)   // ← catch ishlaydi
 */
export const asPromise = (fn) => {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    return Promise.reject(e);
  }
};
