/**
 * partner.js — Hamkor (Ustoz/Partner) mijoz tomoni xizmati.
 * Ma'lumotlar xavfsiz tarzda serverless API (api/partner.js) orqali olinadi.
 */
import { auth } from '../firebase';

export const PARTNER_ERRORS = {
  unauthorized: "Tizimga qaytadan kiring",
  no_partner_code_found: "Sizga biriktirilgan hamkorlik kodi topilmadi",
  promo_not_found: "Hamkorlik promokodi topilmadi",
  forbidden: "Ushbu hamkorlik hisobotini ko'rish huquqingiz yo'q",
  rate_limited: "Iltimos, biroz kuting va qayta urinib ko'ring",
  server_error: "Server xatosi — birozdan so'ng urinib ko'ring",
  network: "Internet aloqasini tekshiring",
};

/**
 * Hamkor statistikasi va a'zolari hisobotini serverdan yuklash
 * @param {string} [partnerCode] - Ixtiyoriy, agar berilmasa foydalanuvchining o'z kodi olinadi
 * @param {object} [opts]
 * @param {boolean} [opts.withPromoList] - Admin tanlagichi uchun promokodlar
 *   ro'yxatini ham qaytarish. Ro'yxat `promoCodes` kolleksiyasini butunlay
 *   o'qiydi, shuning uchun u har so'rovda emas, BIR MARTA so'raladi.
 * @returns {Promise<{ok: boolean, promo?: object, summary?: object, members?: Array, error?: string}>}
 */
export async function fetchPartnerStats(partnerCode = null, opts = {}) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/partner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'stats',
        partnerCode: partnerCode ? partnerCode.trim().toUpperCase() : undefined,
        withPromoList: opts.withPromoList === true,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('fetchPartnerStats error:', err);
    return { ok: false, error: 'network' };
  }
}
