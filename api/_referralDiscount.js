/**
 * ════════════════════════════════════════════════════════════
 *  Taklif (referral) chegirmasining AMALDAGI foizi — yagona manba
 *  api/_referralDiscount.js
 * ════════════════════════════════════════════════════════════
 *
 *  `users/{uid}.referralDiscount` — chegirmaga HUQUQ: api/find-referral.js
 *  havola bilan kelgan hisobga 50 yozadi. Qo'llanishi esa vaqtga bog'liq —
 *  ro'yxatdan o'tgach REFERRAL_DISCOUNT_DAYS (7 kun sinov + 3 kun) ichida.
 *  ReferralPage taklif qiluvchiga ham aynan shu muddatni ko'rsatadi.
 *
 *  ── NEGA O'QISH PAYTIDA TEKSHIRILADI (2026-09-11) ─────────────
 *  Ilgari muddati o'tgan chegirmani FAQAT api/cron-daily.js nolga tushirardi,
 *  PremiumModal va payment-webhook esa maydonni sanaga qaramay o'qirdi. Cron
 *  esa hech qachon ishlamagan (`meta/cronHealth` yo'q) — chegirma hech kimda
 *  tugamagan: 2026-09-11 da 68 hisobdan 39 tasida muddati o'tgan 50% turardi
 *  (A0469 murojaati). Endi narx hisoblanadigan har joy shu funksiyadan
 *  foydalanadi, cron esa faqat bazani tartibga keltiradi.
 *
 *  ── ESKI HISOBLAR: BIRINCHI TO'LOVGACHA ───────────────────────
 *  LEGACY_CUTOFF dan oldin ro'yxatdan o'tganlar chegirmani ilovada muddatsiz
 *  ko'rib kelgan, qo'llanmada ham «birinchi to'lovida 50%» deyilgan. Ayrimlari
 *  aynan shu narx bilan operatorga yozgan bo'lishi mumkin. Orqaga qarab olib
 *  qo'yish va'dani buzardi — shuning uchun ularda chegirma to'lovgacha qoladi
 *  (payment-webhook uni to'lovda nolga tushiradi). Muddat faqat shu sanadan
 *  keyin ro'yxatdan o'tganlarga qo'llanadi. Sanani O'ZGARTIRMANG: oldinga
 *  sursangiz yangi hisoblar ham muddatsiz bo'ladi, orqaga sursangiz eski
 *  hisoblar va'da qilingan chegirmasidan jimgina ayriladi.
 *
 *  Mijoz (src/components/PremiumModal.jsx) ham shu faylni import qiladi —
 *  ekrandagi narx server kutgan summadan ajralib ketmasin. Fayl `_` bilan
 *  boshlanadi: Vercel uni alohida funksiya deb sanamaydi. Ichida faqat sof
 *  mantiq — brauzerda ham, Node'da ham ishlaydi.
 * ════════════════════════════════════════════════════════════
 */

/** Chegirma amal qiladigan kunlar: FREE_TRIAL_DAYS (7) + URGENCY_DAYS (3). */
export const REFERRAL_DISCOUNT_DAYS = 10;

/** Shu lahzadan OLDIN yaratilgan hisoblar muddatsiz (Toshkent, 2026-09-12 00:00). */
export const LEGACY_CUTOFF = '2026-09-12T00:00:00+05:00';

const DAY_MS = 86400000;
const LEGACY_CUTOFF_MS = new Date(LEGACY_CUTOFF).getTime();

// `createdAt` bazada har xil ko'rinishda keladi: mijoz va Admin SDK
// Timestamp'i, JSON'dan tiklangan `{seconds}` / `{_seconds}`, ISO satr, Date.
function toMillis(v) {
  if (!v) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (typeof v._seconds === 'number') return v._seconds * 1000;
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Referral chegirmasining hozir qo'llanadigan foizi.
 *
 * @param {object} userData  `users/{uid}` hujjati (yoki uning bir qismi)
 * @param {Date|number} [now]
 * @returns {number} 0 — chegirma yo'q. 0..100 ga QISILMAYDI: bu chaqiruvchida
 *   (payment-webhook `expectedAmount`).
 */
export function effectiveReferralDiscount(userData, now = Date.now()) {
  const pct = Number(userData?.referralDiscount) || 0;
  if (pct <= 0) return 0;

  const createdMs = toMillis(userData?.createdAt);
  // Sana noma'lum — eski xatti-harakat saqlanadi. Amalda bunday bo'lmaydi:
  // find-referral `createdAt` siz hisobni ulamaydi (`account_age_unknown`),
  // mijoz esa `createdAt` ni o'zgartira olmaydi (firestore.rules).
  if (createdMs === null) return pct;
  if (createdMs < LEGACY_CUTOFF_MS) return pct;

  const nowMs = typeof now === 'number' ? now : new Date(now).getTime();
  return nowMs - createdMs < REFERRAL_DISCOUNT_DAYS * DAY_MS ? pct : 0;
}
