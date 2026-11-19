/**
 * effectiveReferralDiscount() — taklif chegirmasining muddati.
 *
 * 2026-09-11: muddati o'tgan 50% chegirma PremiumModal va payment-webhook'da
 * qolib ketardi, chunki uni faqat cron o'chirardi (cron esa ishlamagan).
 * Qoida endi o'qish paytida tekshiriladi. Bu testlar ikki narsani qulflaydi:
 *   1) yangi hisobda chegirma 10 kun to'lganda tugaydi;
 *   2) LEGACY_CUTOFF dan oldingi hisoblar chegirmani to'lovgacha SAQLAYDI —
 *      ular uni ilovada muddatsiz ko'rib kelgan (va'da buzilmasin).
 */

import { describe, it, expect } from 'vitest';
import {
  effectiveReferralDiscount, LEGACY_CUTOFF, REFERRAL_DISCOUNT_DAYS,
  computeBonusUsage, computeStackedExpire, computeStackedDaysExpire,
} from '../../api/_referralDiscount.js';
import { expectedAmount } from '../../api/payment-webhook.js';

const DAY = 86400000;
const CUTOFF_MS = new Date(LEGACY_CUTOFF).getTime();

// Kesish sanasidan bir kun keyin ro'yxatdan o'tgan YANGI hisob
const created = CUTOFF_MS + DAY;
const newUser = { referralDiscount: 50, createdAt: new Date(created) };
const after = (ms) => created + ms;

describe('yangi hisob — 10 kunlik muddat', () => {
  it('muddat ichida 50%', () => {
    expect(effectiveReferralDiscount(newUser, after(3 * DAY))).toBe(50);
  });

  it('oxirgi soniyagacha amal qiladi', () => {
    expect(effectiveReferralDiscount(newUser, after(REFERRAL_DISCOUNT_DAYS * DAY - 1000))).toBe(50);
  });

  it('10 kun to\'lganda tugaydi (cron va computeTrialStatus bilan bir xil chegara)', () => {
    expect(effectiveReferralDiscount(newUser, after(REFERRAL_DISCOUNT_DAYS * DAY))).toBe(0);
    expect(effectiveReferralDiscount(newUser, after(40 * DAY))).toBe(0);
  });

  it('hozirgi vaqt Date obyekti bilan ham beriladi', () => {
    expect(effectiveReferralDiscount(newUser, new Date(after(11 * DAY)))).toBe(0);
  });
});

describe('eski hisob — chegirma birinchi to\'lovgacha qoladi', () => {
  it('A0469: 2026-08-27 da kelgan, 15 kundan keyin ham 50%', () => {
    const a0469 = { referralDiscount: 50, createdAt: new Date('2026-08-27T16:42:15Z') };
    expect(effectiveReferralDiscount(a0469, new Date('2026-09-11T08:00:00Z'))).toBe(50);
    expect(effectiveReferralDiscount(a0469, new Date('2027-01-01T00:00:00Z'))).toBe(50);
  });

  it('kesish sanasidan 1 ms oldin yaratilgan — eski', () => {
    const u = { referralDiscount: 50, createdAt: new Date(CUTOFF_MS - 1) };
    expect(effectiveReferralDiscount(u, CUTOFF_MS + 100 * DAY)).toBe(50);
  });

  it('aynan kesish lahzasida yaratilgan — yangi, muddatli', () => {
    const u = { referralDiscount: 50, createdAt: new Date(CUTOFF_MS) };
    expect(effectiveReferralDiscount(u, CUTOFF_MS + 100 * DAY)).toBe(0);
  });
});

describe('createdAt ko\'rinishlari', () => {
  const past = after(20 * DAY);

  it('Firestore Timestamp (toMillis)', () => {
    expect(effectiveReferralDiscount({ referralDiscount: 50, createdAt: { toMillis: () => created } }, past)).toBe(0);
  });

  it('toDate() li obyekt', () => {
    expect(effectiveReferralDiscount({ referralDiscount: 50, createdAt: { toDate: () => new Date(created) } }, past)).toBe(0);
  });

  it('{seconds} va {_seconds}', () => {
    expect(effectiveReferralDiscount({ referralDiscount: 50, createdAt: { seconds: created / 1000 } }, past)).toBe(0);
    expect(effectiveReferralDiscount({ referralDiscount: 50, createdAt: { _seconds: created / 1000 } }, past)).toBe(0);
  });

  it('ISO satr', () => {
    expect(effectiveReferralDiscount({ referralDiscount: 50, createdAt: new Date(created).toISOString() }, past)).toBe(0);
  });

  it('sana yo\'q yoki buzuq — eski xatti-harakat (chegirma saqlanadi)', () => {
    expect(effectiveReferralDiscount({ referralDiscount: 50 }, past)).toBe(50);
    expect(effectiveReferralDiscount({ referralDiscount: 50, createdAt: 'sana emas' }, past)).toBe(50);
  });
});

describe('chegirma yo\'q yoki yaroqsiz qiymat', () => {
  it('0 qaytaradi', () => {
    expect(effectiveReferralDiscount({}, created)).toBe(0);
    expect(effectiveReferralDiscount(null, created)).toBe(0);
    expect(effectiveReferralDiscount(undefined)).toBe(0);
    expect(effectiveReferralDiscount({ referralDiscount: 'abc', createdAt: new Date(created) }, created)).toBe(0);
    expect(effectiveReferralDiscount({ referralDiscount: -50, createdAt: new Date(created) }, created)).toBe(0);
  });

  it('satr ko\'rinishidagi son o\'qiladi', () => {
    expect(effectiveReferralDiscount({ referralDiscount: '50', createdAt: new Date(created) }, created)).toBe(50);
  });
});

describe('expectedAmount muddatni hisobga oladi', () => {
  it('yangi hisob, muddat ichida → yarim narx', () => {
    expect(expectedAmount(30000, newUser, after(5 * DAY))).toBe(15000);
  });

  it('yangi hisob, muddat o\'tgan → to\'liq narx', () => {
    expect(expectedAmount(30000, newUser, after(11 * DAY))).toBe(30000);
  });

  it('eski hisob, muddat o\'tgan → yarim narx saqlanadi', () => {
    const a0469 = { referralDiscount: 50, createdAt: new Date('2026-08-27T16:42:15Z') };
    expect(expectedAmount(240000, a0469, new Date('2026-09-11T08:00:00Z'))).toBe(120000);
  });

  it('promo chegirmasi referral muddatiga bog\'liq emas', () => {
    expect(expectedAmount(30000, { ...newUser, promoDiscount: { percent: 30 } }, after(11 * DAY))).toBe(21000);
  });

  it('do\'st bonusi muddat o\'tgach ham ayiriladi', () => {
    expect(expectedAmount(30000, { ...newUser, referralBonus: 5000 }, after(11 * DAY))).toBe(25000);
  });
});

describe('computeBonusUsage — qoldiq bonus kuymasligi va foizli yaxlitlash', () => {
  it('75 000 so\'m bonus bilan 50 000 so\'mlik 1 oylik tarif olinganda 25 000 so\'m qoldiq saqlanadi', () => {
    const res = computeBonusUsage(50000, { referralBonus: 75000 }, after(11 * DAY));
    expect(res.discountedPrice).toBe(50000);
    expect(res.usedBonus).toBe(50000);
    expect(res.remainingBonus).toBe(25000);
    expect(res.finalPrice).toBe(0);
  });

  it('50% do\'st chegirmasi + 25 000 so\'m bonus bilan 50 000 so\'mlik tarif 0 so\'mga tushadi', () => {
    const res = computeBonusUsage(50000, { ...newUser, referralBonus: 25000 }, after(3 * DAY));
    expect(res.discountPct).toBe(50);
    expect(res.discountedPrice).toBe(25000);
    expect(res.usedBonus).toBe(25000);
    expect(res.remainingBonus).toBe(0);
    expect(res.finalPrice).toBe(0);
  });
});

describe('computeStackedExpire — faol obuna muddati ustiga qo\'shilishi', () => {
  it('15 kun qolgan faol obuna ustiga 1 oy qo\'shilganda 15 kun saqlanib qoladi', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const currentExpire = new Date('2026-06-16T00:00:00Z').toISOString();
    const nextIso = computeStackedExpire(currentExpire, 1, now);
    expect(nextIso.slice(0, 10)).toBe('2026-07-16');
  });

  it('muddati o\'tgan obunada yangi muddat bugundan boshlanadi', () => {
    const now = new Date('2026-06-10T10:00:00Z');
    const pastExpire = new Date('2026-05-01T00:00:00Z').toISOString();
    const nextIso = computeStackedDaysExpire(pastExpire, 30, now);
    expect(nextIso.slice(0, 10)).toBe('2026-07-10');
  });
});
