/**
 * promo.js — Promo-kod redemption mijoz tomoni
 * Haqiqiy tekshiruv va qo'llash SERVERDA (api/redeem-promo.js, transaction).
 */
import { auth } from '../firebase';

// Server xato kodlari → foydalanuvchiga tushunarli xabarlar
export const PROMO_ERRORS = {
  not_found: "Bunday promo-kod topilmadi",
  inactive: "Bu promo-kod o'chirilgan",
  expired: "Promo-kod muddati tugagan",
  limit_reached: "Promo-kod ishlatish limiti tugagan",
  already_used: "Siz bu kodni allaqachon ishlatgansiz",
  pending_discount_exists: "Sizda ishlatilmagan chegirma bor — avval undan foydalaning",
  invalid_code_format: "Kod formati noto'g'ri",
  invalid_promo: "Promo-kod sozlamasi xato — adminga murojaat qiling",
  unauthorized: "Qaytadan tizimga kiring",
  server_error: "Server xatosi — birozdan keyin urinib ko'ring",
  network: "Internet aloqasini tekshiring",
};

export async function redeemPromo(code) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/redeem-promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch (e) {
    console.error('redeemPromo error:', e);
    return { ok: false, error: 'network' };
  }
}

/**
 * Kodni FAOLLASHTIRMASDAN tanishtirish ma'lumotini olish.
 * Hamkor havolasidagi tasdiq kartasi ustoz ismini shu orqali biladi
 * (`promoCodes` firestore.rules'da faqat adminga o'qish uchun ochiq).
 * @returns {Promise<{ok:boolean, partnerName?:string, campaign?:string,
 *   type?:string, value?:number, alreadyUsed?:boolean, usable?:boolean, error?:string}>}
 */
export async function fetchPromoInfo(code) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/redeem-promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'info', code }),
    });
    // Dev muhitida /api/* ishlamaydi va HTML qaytaradi — JSON.parse portlamasin
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { ok: false, error: 'network' };
    return await res.json();
  } catch (e) {
    console.error('fetchPromoInfo error:', e);
    return { ok: false, error: 'network' };
  }
}

/* ══════════════════════════════════════════════════════════════
 *  HAMKOR HAVOLASI — `?promo=KOD`
 * ══════════════════════════════════════════════════════════════
 *  Do'st havolasi (`?ref=`) bilan bir xil naqsh: kod sahifa yuklanishida
 *  ilib olinadi va URL tozalanadi (AuthContext'da, modul yuklanishida).
 *
 *  MUHIM FARQ — kod AVTOMATIK qo'llanmaydi. Sabab uchta:
 *   · hamkor kodi ism, ID va test natijalarini guruh ustoziga OCHADI —
 *     bu haqda foydalanuvchi ogohlantirilishi shart (referral.promoPrivacy);
 *   · `promoCodes/{kod}/redemptions/{uid}` yozuvi QAYTARILMAYDI — guruhdan
 *     chiqish yo'li yo'q, ya'ni tasodifiy bosish umrbod natija beradi;
 *   · `percent` turidagi kod `promoDiscount` ni band qilib, keyingi kodni
 *     bloklaydi (`pending_discount_exists`).
 *  Shuning uchun kod saqlanadi, qo'llashni esa PartnerJoinCard so'raydi.
 * ══════════════════════════════════════════════════════════════ */

const PENDING_PROMO_KEY = 'iqro_pending_promo';
const PROMO_SNOOZE_KEY = 'iqro_promo_snoozed_on';

// Server bilan bir xil format tekshiruvi (api/redeem-promo.js).
// Yaroqsiz qator saqlanmaydi — aks holda karta har kirganda so'ralib,
// serverdan doim `invalid_code_format` olardi.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

export function getPromoCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('promo');
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

export function savePendingPromoCode(code) {
  if (code && CODE_RE.test(code)) localStorage.setItem(PENDING_PROMO_KEY, code);
}

export function getPendingPromoCode() {
  const code = localStorage.getItem(PENDING_PROMO_KEY);
  return code && CODE_RE.test(code) ? code : null;
}

export function clearPendingPromoCode() {
  localStorage.removeItem(PENDING_PROMO_KEY);
  localStorage.removeItem(PROMO_SNOOZE_KEY);
}

// «Hozir emas» — kod SAQLANADI, karta esa faqat shu kunga yashiriladi.
const today = () => new Date().toISOString().slice(0, 10);
export function snoozePromoCard() {
  localStorage.setItem(PROMO_SNOOZE_KEY, today());
}
export function isPromoCardSnoozed() {
  return localStorage.getItem(PROMO_SNOOZE_KEY) === today();
}
