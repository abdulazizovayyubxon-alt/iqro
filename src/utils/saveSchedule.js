/**
 * ════════════════════════════════════════════════════════════════════════
 *  saveSchedule.js — bulutga saqlash ritmini hisoblash
 *
 *  NEGA ALOHIDA FAYL: bu mantiq AppContext.jsx dagi `useEffect` ichida edi
 *  va TESTDAN CHETDA qolgan edi. Aynan shu joydagi noto'g'ri qiymat
 *  (3 soniyalik debounce) 2026-08-20 da loyihaning kunlik Firestore yozuv
 *  kvotasini tugatdi: har javobga bitta yozuv ketib, kvota tugagach
 *  ilovada BUTUNLAY yozuv to'xtadi — admin Pro bera olmadi, cron
 *  `metrics` yozmadi, `questionStats` bo'sh qoldi.
 *
 *  Ritm — kvota bilan ma'lumot xavfsizligi o'rtasidagi almashuv. Bunday
 *  qaror testsiz turmasligi kerak.
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * Keyingi bulut yozuvi qancha kutishi kerakligini qaytaradi.
 *
 * Sof debounce YETARLI EMAS: uzluksiz javob berayotgan odamda taymer har
 * safar qayta boshlanadi va yozuv umuman bo'lmasligi mumkin. Shuning uchun
 * "maksimal kutish shifti" bor: birinchi saqlanmagan o'zgarishdan beri
 * `maxWaitMs` o'tgan bo'lsa, jimlik kutilmaydi va 0 qaytadi (darhol yoz).
 *
 * @param {object} p
 * @param {number|null} p.oldestPendingAt  eng eski saqlanmagan o'zgarish vaqti (ms). null — kutayotgan o'zgarish yo'q
 * @param {number} p.now                   hozirgi vaqt (ms)
 * @param {number} p.debounceMs            jimlik kutish oynasi
 * @param {number} p.maxWaitMs             shift: bundan uzoq kutilmaydi
 * @returns {number} kutish vaqti ms da; 0 — darhol yozish kerak
 */
export function nextCloudSaveDelay({ oldestPendingAt, now, debounceMs, maxWaitMs }) {
  // Kutayotgan o'zgarish belgilanmagan — bu BIRINCHI o'zgarish, to'liq
  // debounce beriladi. (Chaqiruvchi shu paytda `oldestPendingAt` ni o'rnatadi.)
  if (oldestPendingAt === null || oldestPendingAt === undefined) {
    return Math.min(debounceMs, maxWaitMs);
  }

  const waited = now - oldestPendingAt;

  // Shift bosildi — darhol yozamiz.
  if (waited >= maxWaitMs) return 0;

  // Taymer shiftdan oshib ketmasligi kerak: aks holda "eng ko'pi bilan
  // maxWaitMs" kafolati buziladi.
  const remaining = maxWaitMs - waited;
  return Math.min(debounceMs, remaining);
}

/**
 * Bir test seansida taxminan nechta bulut yozuvi bo'lishini hisoblaydi —
 * qiymatlarni tanlashda "bu kvotaga sig'adimi?" degan savolga javob beradi.
 *
 * Model ATAYLAB sodda: foydalanuvchi `answerCount` marta, har
 * `gapMs` oraliqda javob beradi. Har javobda ritm qayta hisoblanadi.
 *
 * @returns {number} yozuvlar soni (oxirgi flush hisobga olinmagan)
 */
export function estimateCloudWrites({ answerCount, gapMs, debounceMs, maxWaitMs }) {
  let writes = 0;
  let oldestPendingAt = null;
  let now = 0;
  let scheduledAt = null; // yozuv qachon bajarilishi rejalashtirilgan

  for (let i = 0; i < answerCount; i++) {
    // Oldingi javobdan keyin rejalashtirilgan yozuv shu javobga qadar
    // bajarilib bo'lgan bo'lsa — hisoblaymiz va oynani yopamiz.
    if (scheduledAt !== null && scheduledAt <= now) {
      writes++;
      oldestPendingAt = null;
      scheduledAt = null;
    }
    if (oldestPendingAt === null) oldestPendingAt = now;
    const delay = nextCloudSaveDelay({ oldestPendingAt, now, debounceMs, maxWaitMs });
    if (delay === 0) {
      writes++;
      oldestPendingAt = null;
      scheduledAt = null;
    } else {
      scheduledAt = now + delay;
    }
    now += gapMs;
  }
  return writes;
}

/**
 * ═════════════════════════════════════════════════════════════════════════
 *  2026-08-23 KVOTA HALOKATI — qayta urinish darvozasi
 *
 *  AppContext'dagi qayta urinish effekti `pendingCloudRef` yoqilgan bo'lsa
 *  HAR 60 SONIYADA yangi `setDoc` yuborardi. Kvota tugaganda esa Firestore
 *  promise'i NA resolve NA reject bo'ladi — ya'ni bayroq hech qachon
 *  o'chmaydi. Natijada har tab daqiqasiga bitta yangi mutatsiyani navbatga
 *  qo'shar, 4 soatda ~240 tasi yig'ilar, kvota tiklanishi bilan hammasi
 *  birdan quyilib limitni qaytadan tugatardi.
 *
 *  Qaror shu yerda, sof funksiyada — `nextCloudSaveDelay` bilan bir xil
 *  sababga ko'ra: ritm qarori testsiz turmasligi kerak.
 * ═════════════════════════════════════════════════════════════════════════
 */

/** Birinchi qayta urinishgacha kutish (ms) */
export const RETRY_BASE_MS = 60_000;
/** Backoff shifti — bundan uzoq kutilmaydi (ms) */
export const RETRY_MAX_MS = 15 * 60_000;

/**
 * Tasdiqlanmagan bulut yozuvini HOZIR qayta yuborish kerakmi?
 *
 * @param {object} p
 * @param {boolean} p.pending        yozuv tasdiqlanmagan (bayroq yoqilgan)
 * @param {boolean} p.inFlight       hali settle bo'lmagan yozuv YO'LDA
 * @param {boolean} p.online         navigator.onLine (false — ishonchli "yo'q")
 * @param {number}  p.now            hozirgi vaqt (ms)
 * @param {number}  p.nextAttemptAt  backoff bo'yicha ruxsat etilgan eng erta vaqt (ms)
 * @returns {boolean}
 */
export function shouldRetryCloudWrite({ pending, inFlight, online, now, nextAttemptAt }) {
  // Yozuv tasdiqlangan — qayta urinishga hojat yo'q.
  if (!pending) return false;

  // ⚠️ ENG MUHIM SHART. Ochiq yozuv borida yangisini yubormaymiz.
  // Kvota tugaganda promise abadiy osilib qoladi va aynan shu holatda
  // eski kod har daqiqada navbatga yangi mutatsiya qo'shardi.
  if (inFlight) return false;

  // `online === false` ishonchli "yo'q"; `true` esa kafolat emas, unga
  // tayanmaymiz — urinib ko'ramiz, muvaffaqiyatsiz bo'lsa backoff o'sadi.
  if (online === false) return false;

  // Backoff oynasi hali ochilmagan.
  if (nextAttemptAt && now < nextAttemptAt) return false;

  return true;
}

/**
 * Ketma-ket muvaffaqiyatsizlik soniga qarab keyingi kutishni qaytaradi.
 * Eksponensial: 1, 2, 4, 8… daqiqa, `RETRY_MAX_MS` da to'xtaydi.
 *
 * @param {number} attempt  nechanchi ketma-ket muvaffaqiyatsizlik (1 dan)
 * @returns {number} ms
 */
export function nextRetryDelay(attempt, { baseMs = RETRY_BASE_MS, maxMs = RETRY_MAX_MS } = {}) {
  if (!attempt || attempt <= 1) return Math.min(baseMs, maxMs);
  return Math.min(baseMs * 2 ** (attempt - 1), maxMs);
}
