/**
 * api/_shared.js — xavfsizlik primitivlari.
 *
 * Bu testlar auditda topilgan ANIQ xatolarni qaytib kelishidan saqlaydi:
 *  · verifySecret — env sozlanmaganda endpoint OCHIQ qolmasligi (3-, 4-band)
 *  · clientIp     — mijoz `x-forwarded-for` qo'shib rate-limitni chetlab
 *                   o'tolmasligi (6-, 8-band)
 *  · clampObject  — nazoratsiz katta obyekt Firestore'ga tushmasligi (6-band)
 */

import { describe, it, expect } from 'vitest';
import {
  safeEqual, verifySecret, extractSecret, clientIp, rateLimit, clampObject, clip,
} from '../../api/_shared.js';

describe('verifySecret — deny by default', () => {
  // ⚠️ ASOSIY REGRESSIYA TESTI.
  // Avvalgi kod `secret !== process.env.CRON_SECRET` edi: env sozlanmagan bo'lsa
  // ikkala tomon `undefined` bo'lib, shart false qaytarardi va cron endpoint
  // (u BARCHA foydalanuvchining isPremium holatini o'zgartiradi) ochiq qolardi.
  it('env sozlanmagan bo\'lsa har qanday qiymatni rad etadi', () => {
    expect(verifySecret('nimadir', undefined)).toBe(false);
    expect(verifySecret('nimadir', '')).toBe(false);
    expect(verifySecret('nimadir', null)).toBe(false);
  });

  it('ikkalasi ham undefined bo\'lganda ham rad etadi (aynan eski bug)', () => {
    expect(verifySecret(undefined, undefined)).toBe(false);
    expect(verifySecret(null, null)).toBe(false);
  });

  it('juda qisqa (ishonchsiz) kalitni rad etadi', () => {
    expect(verifySecret('abc', 'abc')).toBe(false);
  });

  it('to\'g\'ri kalitni qabul qiladi', () => {
    const secret = 'super-maxfiy-kalit-123';
    expect(verifySecret(secret, secret)).toBe(true);
  });

  it('noto\'g\'ri kalitni rad etadi', () => {
    expect(verifySecret('boshqa-kalit-12345678', 'super-maxfiy-kalit-123')).toBe(false);
  });
});

describe('safeEqual', () => {
  it('bir xil satrlar uchun true', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
  });

  it('har xil UZUNLIKdagi satrlar uchun tashlamaydi, false qaytaradi', () => {
    // timingSafeEqual uzunliklar farq qilsa TypeError tashlaydi — shu sababli
    // safeEqual avval SHA-256 qiladi. Bu test o'sha himoyani qulflab qo'yadi.
    expect(() => safeEqual('qisqa', 'ancha-uzun-satr')).not.toThrow();
    expect(safeEqual('qisqa', 'ancha-uzun-satr')).toBe(false);
  });

  it('satr bo\'lmagan qiymatlar uchun false', () => {
    expect(safeEqual(null, 'abc')).toBe(false);
    expect(safeEqual(undefined, undefined)).toBe(false);
    expect(safeEqual(123, 123)).toBe(false);
  });
});

describe('extractSecret', () => {
  it('Authorization: Bearer dan oladi (Vercel Cron shunday yuboradi)', () => {
    expect(extractSecret({ headers: { authorization: 'Bearer abc' } })).toBe('abc');
  });

  it('query.secret dan oladi (qo\'lda sinov uchun)', () => {
    expect(extractSecret({ headers: {}, query: { secret: 'xyz' } })).toBe('xyz');
  });

  it('header query\'dan ustun turadi', () => {
    const req = { headers: { authorization: 'Bearer h' }, query: { secret: 'q' } };
    expect(extractSecret(req)).toBe('h');
  });

  it('hech narsa bo\'lmasa null', () => {
    expect(extractSecret({ headers: {} })).toBe(null);
  });
});

describe('clientIp — rate-limit chetlab o\'tishga qarshi', () => {
  // Vercel HAQIQIY mijoz IP'sini x-forwarded-for ning BIRINCHI elementi qiladi;
  // mijoz o'zi header yuborsa, u ORTIDAN qo'shiladi. Avvalgi kod xom qiymatni
  // kalit sifatida ishlatardi — hujumkor har so'rovda boshqa qiymat yuborib
  // chegarani cheksiz aylanib o'tishi mumkin edi.
  it('faqat BIRINCHI IP\'ni oladi', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 192.168.1.1' } };
    expect(clientIp(req)).toBe('203.0.113.7');
  });

  it('mijoz qo\'shgan qiymat kalitni o\'zgartirmaydi', () => {
    const a = clientIp({ headers: { 'x-forwarded-for': '203.0.113.7, soxta-1' } });
    const b = clientIp({ headers: { 'x-forwarded-for': '203.0.113.7, soxta-2' } });
    expect(a).toBe(b); // ⇒ ikkala so'rov AYNI bucket'ga tushadi
  });

  it('bo\'shliqlarni tozalaydi', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '  203.0.113.7  , 10.0.0.1' } })).toBe('203.0.113.7');
  });

  it('header yo\'q bo\'lsa socket manzilini oladi', () => {
    expect(clientIp({ headers: {}, socket: { remoteAddress: '198.51.100.9' } })).toBe('198.51.100.9');
  });

  it('hech narsa bo\'lmasa "anonymous"', () => {
    expect(clientIp({ headers: {} })).toBe('anonymous');
  });
});

describe('rateLimit', () => {
  it('chegaradan oshganda limited: true beradi', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3).limited).toBe(false);
    }
    expect(rateLimit(key, 3).limited).toBe(true);
  });

  it('har xil kalitlar bir-biriga ta\'sir qilmaydi', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1);
    rateLimit(a, 1);
    expect(rateLimit(a, 1).limited).toBe(true);
    expect(rateLimit(b, 1).limited).toBe(false);
  });
});

describe('clampObject — Firestore yozuv hajmi himoyasi', () => {
  it('kichik obyektni o\'zgartirmaydi', () => {
    expect(clampObject({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' });
  });

  it('katta obyektni qisadi', () => {
    const big = { data: 'x'.repeat(50_000) };
    const out = clampObject(big, 2000);
    expect(out._truncated).toBe(true);
    expect(JSON.stringify(out).length).toBeLessThan(3000);
  });

  it('obyekt bo\'lmagan qiymat uchun null', () => {
    expect(clampObject('satr')).toBe(null);
    expect(clampObject(null)).toBe(null);
    expect(clampObject(42)).toBe(null);
  });

  it('aylanma havolali obyektda yiqilmaydi', () => {
    const circular = { a: 1 };
    circular.self = circular;
    expect(() => clampObject(circular)).not.toThrow();
    expect(clampObject(circular)).toBe(null);
  });
});

describe('clip', () => {
  it('uzun matnni qisadi', () => {
    expect(clip('abcdef', 3)).toBe('abc');
  });
  it('null/undefined uchun null', () => {
    expect(clip(null, 10)).toBe(null);
    expect(clip(undefined, 10)).toBe(null);
  });
  it('son ham satrga aylanadi', () => {
    expect(clip(12345, 3)).toBe('123');
  });
});
