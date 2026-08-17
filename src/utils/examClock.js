/**
 * examClock.js — imtihon vaqtini DEADLINE (mutlaq nuqta) bilan hisoblash.
 *
 * ⚠️ AUDIT 2026-08-17 — nega bu fayl bor:
 *   Imtihon taymeri avval `setInterval` bilan har soniya 1 ayirardi. Mobil
 *   brauzer ilovani fonga tushirganda intervalni to'xtatadi, ya'ni taymer
 *   muzlar edi (imtihon simulyatsiyasi yaroqsiz + ochiq aldash vektori).
 *   Sessiya esa qoldiq soniyani saqlardi va u faqat javob bosilganda yoki har
 *   30 soniyada yangilanardi — natijada har uzilishda foydalanuvchiga
 *   30 soniyagacha vaqt qaytarilardi.
 *
 *   Endi haqiqat manbasi — `deadlineMs` (epoch ms). Bu modul o'sha nuqtani
 *   hisoblash va eski formatdan ko'chirish mantiqini o'z ichiga oladi.
 *   Alohida fayl: mantiq sof va testlanadigan bo'lishi kerak (`ExamPage.jsx`
 *   ichida u React state'iga bog'lanib qolardi).
 */

/**
 * Saqlangan sessiyadan deadline'ni tiklaydi.
 *
 * Yangi format: `deadlineMs` — mutlaq nuqta, to'g'ridan-to'g'ri qaytariladi.
 * Eski format: `timeLeft` (qoldiq soniya) — `now` ga qo'shiladi. Bu BIR MARTALIK
 * moslik qatlami: 2026-08-17 dan oldin saqlangan tugallanmagan imtihonlar shu
 * yo'ldan o'tadi va yo'qolmaydi (eski sxemadagi "sovg'a vaqt" ham shu bir
 * martada tugaydi — keyingi saqlashlar allaqachon deadline bo'ladi).
 *
 * @param {object|null} s   Saqlangan sessiya
 * @param {number} [now]    Hozirgi vaqt (testda in'ektsiya qilinadi)
 * @returns {number|null}   epoch ms yoki null
 */
export function deadlineFromSession(s, now = Date.now()) {
  if (Number.isFinite(s?.deadlineMs)) return s.deadlineMs;
  if (Number.isFinite(s?.timeLeft) && s.timeLeft > 0) return now + s.timeLeft * 1000;
  return null;
}

/**
 * Saqlangan sessiyada hali vaqt qolganmi — ya'ni uni DAVOM ETTIRISH mumkinmi.
 */
export function sessionHasTime(s, now = Date.now()) {
  const d = deadlineFromSession(s, now);
  return !!d && d - now > 0;
}

/** Muddati o'tgan sessiya bu muddatdan eski bo'lsa — tiklanmaydi. */
export const STALE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Muddati o'tgan sessiyani YAKUNLASH kerakmi?
 *
 * ⚠️ AUDIT 2026-08-17, X-4 BAND — nega bu funksiya bor:
 *   Avval `sessionHasTime(s)` false bo'lsa sessiya JIMGINA tashlab
 *   yuborilardi — `else` shoxi umuman yo'q edi. Real ssenariy: odam 50
 *   savolli imtihonda 45 tasiga javob berdi, 4 daqiqa qoldi, telefon
 *   quvvati tugadi. 10 daqiqadan keyin quvvatlab ochadi — deadline o'tib
 *   ketgan, sessiya yaroqsiz deb topiladi va 45 ta javob IZSIZ yo'qoladi.
 *   Ekranda «Imtihonni boshlash» turadi, hech qanday tushuntirishsiz.
 *
 *   To'g'ri xatti-harakat: vaqti tugagan imtihon O'CHIRILMAYDI, YAKUNLANADI.
 *   Haqiqiy imtihonda ham vaqt tugasa varaq yig'ib olinadi, yirtilmaydi.
 *
 * Ikkita chegara qo'yiladi:
 *   · javob YO'Q bo'lsa — saqlaydigan narsa ham yo'q, jim o'chiriladi
 *     (aks holda foydalanuvchi sababsiz 0 ballik natija ekranini ko'rardi);
 *   · juda eski sessiya (> 7 kun) yakunlanmaydi — bir oy oldin tashlab
 *     ketilgan imtihonning to'satdan natijaga aylanishi foydalanuvchi uchun
 *     tushunarsiz bo'lardi. 7 kun «telefon o'chdi, zaryadlagich ertasiga
 *     topildi» holatini bemalol qoplaydi.
 *
 * @param {object|null} s   Saqlangan sessiya
 * @param {number} [now]    Hozirgi vaqt (testda in'ektsiya qilinadi)
 */
export function shouldFinalizeExpired(s, now = Date.now()) {
  if (!s || sessionHasTime(s, now)) return false;
  const answered = Object.keys(s.answers || {}).length;
  if (answered === 0) return false;
  const stamp = Number.isFinite(s.savedAt) ? s.savedAt : deadlineFromSession(s, now);
  if (!Number.isFinite(stamp)) return false;
  return now - stamp <= STALE_SESSION_MS;
}

/**
 * Sessiyadagi qoldiq soniya — «davom ettirish» kartochkasida ko'rsatish uchun.
 * HOZIR hisoblanadi: kartochka ochiq turgan vaqt ham imtihon vaqtidan ketadi.
 */
export function sessionSecondsLeft(s, now = Date.now()) {
  const d = deadlineFromSession(s, now);
  return d ? Math.max(0, Math.round((d - now) / 1000)) : 0;
}

/** Deadline'gacha qolgan soniya (manfiy bo'lmaydi) */
export function secondsUntil(deadlineMs, now = Date.now()) {
  if (!Number.isFinite(deadlineMs)) return 0;
  return Math.max(0, Math.round((deadlineMs - now) / 1000));
}

/** mm:ss yoki uzun imtihonda hh:mm:ss */
export function formatExamTime(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
