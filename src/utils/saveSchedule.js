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
