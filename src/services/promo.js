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
