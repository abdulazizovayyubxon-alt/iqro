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
  // ── Guruhdan chiqarish xatolari ──
  invalid_code_format: "Promokod noto'g'ri",
  invalid_member: "Foydalanuvchi aniqlanmadi",
  not_a_member: "Bu foydalanuvchi sizning guruhingizda emas",
  already_removed: "Bu foydalanuvchi allaqachon guruhdan chiqarilgan",
  cannot_remove_self: "O'zingizni guruhdan chiqara olmaysiz",
};

/** Chiqarish sabablari — server ham AYNAN shu ro'yxatni qabul qiladi. */
export const REMOVE_REASONS = [
  { value: 'unpaid', label: "To'lov qilinmadi" },
  { value: 'left', label: 'Guruhdan chiqdi' },
  { value: 'other', label: 'Boshqa' },
];

/**
 * A'zoni hamkor guruhidan chiqarish.
 *
 * ⚠️ Foydalanuvchining ILOVADAGI HISOBI O'CHIRILMAYDI — profili, test
 * natijalari va ballari joyida qoladi. Faqat guruh a'zoligi uziladi va
 * SHU hamkor kodi bergan Pro obunasi bekor qilinadi.
 *
 * Nega serverdan: obuna maydonlari `firestore.rules` dagi
 * `protectedUserFields()` ro'yxatida — mijoz ularni yoza olmaydi (va yoza
 * olmasligi ham kerak). Huquq tekshiruvi ham serverda: faqat kod egasi
 * yoki platforma admini chiqara oladi.
 *
 * @param {object} p
 * @param {string} p.partnerCode - Guruh promokodi (majburiy)
 * @param {string} p.memberUid   - Chiqariladigan a'zo uid'i
 * @param {'unpaid'|'left'|'other'} [p.reason]
 * @returns {Promise<{ok: boolean, cancelledPremium?: boolean, premiumKeptReason?: string|null, error?: string}>}
 */
export async function removePartnerMember({ partnerCode, memberUid, reason = 'other' }) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };
  if (!partnerCode) return { ok: false, error: 'invalid_code_format' };
  if (!memberUid) return { ok: false, error: 'invalid_member' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/partner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'remove_member',
        partnerCode: partnerCode.trim().toUpperCase(),
        memberUid,
        reason,
      }),
    });

    // ⚠️ Javob JSON bo'lmasligi mumkin (Vercel 502/504 HTML qaytaradi).
    // `res.json()` o'shanda tashlaydi va `catch` uni 'network' deb ko'rsatardi —
    // ya'ni amal BAJARILGAN bo'lsa ham hamkor "internetni tekshiring" o'qib,
    // tugmani QAYTA bosardi. Endi holat kodiga qarab aniq xabar beriladi.
    const data = await res.json().catch(() => null);
    if (!data) {
      return { ok: false, error: res.status === 429 ? 'rate_limited' : 'server_error' };
    }
    return data;
  } catch (err) {
    console.error('removePartnerMember error:', err);
    return { ok: false, error: 'network' };
  }
}

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
