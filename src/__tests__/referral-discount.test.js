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
