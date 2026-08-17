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
 * Saqlangan sessiyada hali vaqt qolganmi (tiklashga arziydimi).
 * Vaqti tugagan sessiya tiklanmasligi kerak: aks holda foydalanuvchi ochilgan
 * zahoti avto-yakunlanadigan imtihonga tushib qolardi.
 */
export function sessionHasTime(s, now = Date.now()) {
  const d = deadlineFromSession(s, now);
  return !!d && d - now > 0;
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
