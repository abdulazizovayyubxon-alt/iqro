/**
 * expectedAmount() — to'lov summasini SERVER hisoblashi.
 *
 * Bu auditda topilgan KRITIK teshikning (1-band) qulfi:
 * mijoz `users/{uid}.referralDiscount` ni 99 ga qo'yib narxning 1%ini to'lab
 * to'liq premium olishi mumkin edi. Maydon endi firestore.rules'da bloklangan,
 * bu testlar esa formulaning o'zi ishonchsiz qiymatga qanday munosabatda
 * bo'lishini qulflab qo'yadi (ikkinchi himoya qatlami).
 */

import { describe, it, expect } from 'vitest';
import { expectedAmount } from '../../api/payment-webhook.js';

describe('expectedAmount — asosiy hollar', () => {
  it('chegirma va bonus bo\'lmasa to\'liq narx', () => {
    expect(expectedAmount(30000, {})).toBe(30000);
  });

  it('50% referral chegirmasi', () => {
    expect(expectedAmount(30000, { referralDiscount: 50 })).toBe(15000);
  });

  it('bonus narxdan ayiriladi', () => {
    expect(expectedAmount(30000, { referralBonus: 10000 })).toBe(20000);
  });

  it('chegirma va bonus BIRGA: avval chegirma, keyin bonus', () => {
    // 30000 * 0.5 = 15000, keyin -5000 = 10000
    expect(expectedAmount(30000, { referralDiscount: 50, referralBonus: 5000 })).toBe(10000);
  });
});

describe('chegirmalar STACK qilinmaydi — eng kattasi olinadi', () => {
  it('referral 50% va promo 30% → 50% qo\'llanadi', () => {
    expect(expectedAmount(30000, {
      referralDiscount: 50,
      promoDiscount: { percent: 30 },
    })).toBe(15000);
  });

  it('referral 20% va promo 60% → 60% qo\'llanadi', () => {
    expect(expectedAmount(30000, {
      referralDiscount: 20,
      promoDiscount: { percent: 60 },
    })).toBe(12000);
  });
});

describe('ishonchsiz kiritish qiymatlariga qarshi himoya', () => {
  // 1-BAND REGRESSIYA TESTLARI: bu qiymatlar endi mijozdan kelmaydi, lekin
  // formula o'zi ham ularga bardosh berishi kerak (ikkinchi qatlam).
  it('100%dan katta chegirma 100% ga qisiladi (manfiy summa bo\'lmaydi)', () => {
    expect(expectedAmount(30000, { referralDiscount: 500 })).toBe(0);
    expect(expectedAmount(30000, { referralDiscount: 99999 })).toBe(0);
  });

  it('manfiy chegirma 0 ga qisiladi — narx OSHMAYDI', () => {
    expect(expectedAmount(30000, { referralDiscount: -50 })).toBe(30000);
  });

  it('manfiy bonus narxni oshirmaydi', () => {
    expect(expectedAmount(30000, { referralBonus: -100000 })).toBe(30000);
  });

  it('bonus narxdan katta bo\'lsa natija 0, manfiy emas', () => {
    expect(expectedAmount(30000, { referralBonus: 999999 })).toBe(0);
  });

  it('satr ko\'rinishidagi son to\'g\'ri o\'qiladi', () => {
    expect(expectedAmount(30000, { referralDiscount: '50' })).toBe(15000);
  });

  it('son bo\'lmagan qiymat 0 deb qabul qilinadi', () => {
    expect(expectedAmount(30000, { referralDiscount: 'abc' })).toBe(30000);
    expect(expectedAmount(30000, { referralBonus: {} })).toBe(30000);
    expect(expectedAmount(30000, { referralDiscount: null })).toBe(30000);
  });

  it('narx son bo\'lmasa null qaytaradi (summa tekshiruvi o\'tkazib yuboriladi)', () => {
    expect(expectedAmount(undefined, {})).toBe(null);
    expect(expectedAmount('bepul', {})).toBe(null);
    expect(expectedAmount(NaN, {})).toBe(null);
  });

  it('userData berilmasa yiqilmaydi', () => {
    expect(expectedAmount(30000)).toBe(30000);
  });
});

describe('yaxlitlash', () => {
  it('kasr natija butun songa yaxlitlanadi', () => {
    // 30000 * (100-33)/100 = 20100
    expect(expectedAmount(30000, { referralDiscount: 33 })).toBe(20100);
    // 10000 * (100-33)/100 = 6700
    expect(expectedAmount(10000, { referralDiscount: 33 })).toBe(6700);
  });

  it('natija DOIM butun son', () => {
    const out = expectedAmount(9999, { referralDiscount: 37 });
    expect(Number.isInteger(out)).toBe(true);
  });
});
