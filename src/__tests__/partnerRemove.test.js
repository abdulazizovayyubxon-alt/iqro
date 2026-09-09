/**
 * shouldCancelPromoPremium() — hamkor guruhidan chiqarishda Pro obunasi
 * bekor qilinishi kerakmi degan QAROR.
 *
 * Nima uchun aynan bu funksiya test bilan qulflanadi:
 *
 *  1. XATO IKKI TOMONGA HAM QIMMAT.
 *     · Ortiqcha bekor qilish — foydalanuvchi O'Z PULIGA olgan obunani
 *       yo'qotadi. Bu pullik xizmatni tortib olish, ya'ni to'lov nizosi va
 *       "to'ladim, Pro yo'q" murojaati (loyihada bu naqsh allaqachon bor —
 *       `payments` jurnali aynan shu savol uchun yuritiladi).
 *     · Kam bekor qilish — to'lov qilmagan ustoz guruhdan chiqarilgach ham
 *       3 oylik bepul Pro'da qolaveradi, ya'ni tugmaning ma'nosi yo'qoladi.
 *
 *  2. QAROR IKKI MAYDONNING MOSLIGIGA suyanadi (`premiumMethod` +
 *     `promoRedeemed.code`), ya'ni bitta shartni tushirib qoldirish oson va
 *     natijasi kod o'qiganda ko'zga tashlanmaydi.
 *
 *  3. `api/payment-webhook.js` to'lov paytida `premiumMethod` ni ALMASHTIRADI,
 *     lekin `promoRedeemed` ni TEGMASDAN qoldiradi. Ya'ni "promokod bilan
 *     kirgan, keyin pul to'lagan" foydalanuvchida `promoRedeemed.code` hamon
 *     hamkor kodiga teng bo'lib turadi — faqat `premiumMethod` uni himoya
 *     qiladi. Bu holat quyida alohida qulflangan.
 */

import { describe, it, expect } from 'vitest';
import { shouldCancelPromoPremium } from '../../api/partner.js';

const KOD = 'MIRONSHOH';

/** Hamkor kodi orqali 3 oylik Pro olgan tipik guruh a'zosi. */
const promoAzo = (over = {}) => ({
  isPremium: true,
  premiumPlan: 'paid',
  premiumMethod: 'promo_team',
  premiumExpire: '2026-12-01T00:00:00.000Z',
  promoRedeemed: { code: KOD, days: 90, at: '2026-09-01T00:00:00.000Z' },
  ...over,
});

describe('shouldCancelPromoPremium — bekor QILINADIGAN hollar', () => {
  it("hamkor kodi bergan Pro ('promo_team') bekor qilinadi", () => {
    expect(shouldCancelPromoPremium(promoAzo(), KOD)).toBe(true);
  });

  it("yakka promokod turi ('promo') ham bekor qilinadi", () => {
    expect(shouldCancelPromoPremium(promoAzo({ premiumMethod: 'promo' }), KOD)).toBe(true);
  });
});

describe('shouldCancelPromoPremium — obuna SAQLANADIGAN hollar', () => {
  // ⚠️ ENG MUHIM TEST. Foydalanuvchi promokod bilan kirgan, keyin o'z puliga
  // obuna sotib olgan: `promoRedeemed.code` hamon hamkor kodiga TENG, chunki
  // webhook uni tozalamaydi. Faqat `premiumMethod` farqni ko'rsatadi.
  it("to'langan obunaga TEGILMAYDI (promoRedeemed hamon o'sha kodda tursa ham)", () => {
    const tolagan = promoAzo({ premiumMethod: 'click', premiumTransId: 'tx_123' });
    expect(shouldCancelPromoPremium(tolagan, KOD)).toBe(false);
  });

  it('boshqa hamkorning kodi bergan Pro bekor qilinmaydi', () => {
    expect(shouldCancelPromoPremium(promoAzo(), 'BOSHQAKOD')).toBe(false);
  });

  it('maktab (B2B) obunasiga tegilmaydi', () => {
    const maktab = promoAzo({ premiumMethod: 'school', promoRedeemed: null });
    expect(shouldCancelPromoPremium(maktab, KOD)).toBe(false);
  });

  it('admin qo\'li bilan berilgan Pro bekor qilinmaydi', () => {
    expect(shouldCancelPromoPremium(promoAzo({ premiumMethod: 'admin' }), KOD)).toBe(false);
  });

  it('faol obunasi yo\'q foydalanuvchida bekor qilinadigan narsa yo\'q', () => {
    expect(shouldCancelPromoPremium(promoAzo({ isPremium: false }), KOD)).toBe(false);
  });

  // Trial (sinov muddati) `isPremium` ni Firestore'da YOQMAYDI — u
  // AuthContext'da `createdAt` bo'yicha hisoblanadi. Ya'ni sinovdagi
  // foydalanuvchi hujjatida `isPremium` yo'q va uning sinov muddati
  // guruhdan chiqarish bilan qisqarmasligi kerak.
  it('sinov muddatidagi foydalanuvchiga tegilmaydi', () => {
    const sinov = { createdAt: '2026-09-01T00:00:00.000Z' };
    expect(shouldCancelPromoPremium(sinov, KOD)).toBe(false);
  });
});

describe('shouldCancelPromoPremium — buzuq/yetishmayotgan ma\'lumot', () => {
  // Ma'lumot yetishmasa javob DOIM `false` bo'lishi kerak: shubha bo'lganda
  // obunani saqlash — foydalanuvchi tomonda xato qilish demak.
  it('hujjat yo\'q bo\'lsa false', () => {
    expect(shouldCancelPromoPremium(null, KOD)).toBe(false);
    expect(shouldCancelPromoPremium(undefined, KOD)).toBe(false);
  });

  it('kod bo\'sh bo\'lsa false', () => {
    expect(shouldCancelPromoPremium(promoAzo(), '')).toBe(false);
    expect(shouldCancelPromoPremium(promoAzo(), null)).toBe(false);
  });

  it('promoRedeemed yo\'q (eski yozuv) bo\'lsa false', () => {
    expect(shouldCancelPromoPremium(promoAzo({ promoRedeemed: null }), KOD)).toBe(false);
    expect(shouldCancelPromoPremium(promoAzo({ promoRedeemed: undefined }), KOD)).toBe(false);
  });

  it("`isPremium` haqiqiy `true` bo'lishi shart — 'true' satri emas", () => {
    expect(shouldCancelPromoPremium(promoAzo({ isPremium: 'true' }), KOD)).toBe(false);
    expect(shouldCancelPromoPremium(promoAzo({ isPremium: 1 }), KOD)).toBe(false);
  });

  // Kod taqqoslash katta-kichik harfga SEZGIR: server uni doim
  // `toUpperCase()` qilib uzatadi, `promoRedeemed.code` esa redeem paytida
  // xuddi shunday saqlangan. Kichik harfli kod kelsa — mos kelmasin
  // (jimgina noto'g'ri odamning obunasini bekor qilgandan ko'ra, hech narsa
  // qilmagan ma'qul).
  it('kichik harfli kod mos kelmaydi', () => {
    expect(shouldCancelPromoPremium(promoAzo(), KOD.toLowerCase())).toBe(false);
  });
});
