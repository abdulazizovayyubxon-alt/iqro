/**
 * api/_sms.js — SMS qatlami.
 *
 * Bu testlar uchta aniq xavfni ushlab turadi:
 *  · deny-by-default — env yarim sozlangan holatda haqiqiy SMS ketib qolmasligi
 *  · telefon normallashuvi — provayder rad etadigan raqam navbatga tushmasligi
 *  · GSM-7 — bitta tipografik apostrof butun kampaniya narxini ikkilantirmasligi
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  normalizePhone, asciiFold, segments, activeProvider, isSmsEnabled, TEXT,
} from '../../api/_sms.js';

// Har testdan keyin env'ni tozalaymiz — aks holda test tartibi natijaga ta'sir qiladi
const ENV_KEYS = [
  'SMS_ENABLED', 'SMS_PROVIDER',
  'ESKIZ_EMAIL', 'ESKIZ_PASSWORD',
  'PLAYMOBILE_LOGIN', 'PLAYMOBILE_PASSWORD',
];
let saved = {};
beforeEach(() => { saved = {}; ENV_KEYS.forEach(k => { saved[k] = process.env[k]; delete process.env[k]; }); });
afterEach(() => { ENV_KEYS.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }); });

describe('activeProvider — deny by default', () => {
  it('env butunlay bo\'sh bo\'lsa haqiqiy provayder tanlanmaydi', () => {
    expect(isSmsEnabled()).toBe(false);
    expect(activeProvider()).toBe('log');
  });

  // ⚠️ ASOSIY REGRESSIYA TESTI: provayder kaliti to'liq sozlangan, lekin
  // SMS_ENABLED qo'yilmagan. Bu deploy paytida juda oson yuz beradi —
  // shunda ham hech kimga SMS ketmasligi kerak.
  it('kalitlar bor, lekin SMS_ENABLED yo\'q — baribir log rejimi', () => {
    process.env.SMS_PROVIDER = 'eskiz';
    process.env.ESKIZ_EMAIL = 'a@b.uz';
    process.env.ESKIZ_PASSWORD = 'parol';
    expect(activeProvider()).toBe('log');
  });

  // Teskari holat: yoqilgan, lekin kalit yarim sozlangan.
  it('SMS_ENABLED bor, lekin parol yo\'q — log rejimi', () => {
    process.env.SMS_ENABLED = '1';
    process.env.SMS_PROVIDER = 'eskiz';
    process.env.ESKIZ_EMAIL = 'a@b.uz';
    expect(activeProvider()).toBe('log');
  });

  it('to\'liq sozlanganda tanlanadi', () => {
    process.env.SMS_ENABLED = '1';
    process.env.SMS_PROVIDER = 'eskiz';
    process.env.ESKIZ_EMAIL = 'a@b.uz';
    process.env.ESKIZ_PASSWORD = 'parol';
    expect(activeProvider()).toBe('eskiz');

    process.env.SMS_PROVIDER = 'playmobile';
    expect(activeProvider()).toBe('log');   // playmobile kalitlari yo'q
    process.env.PLAYMOBILE_LOGIN = 'l';
    process.env.PLAYMOBILE_PASSWORD = 'p';
    expect(activeProvider()).toBe('playmobile');
  });

  it('SMS_ENABLED faqat aynan "1" da yoqiladi', () => {
    for (const v of ['true', 'yes', '0', 'on', '']) {
      process.env.SMS_ENABLED = v;
      expect(isSmsEnabled()).toBe(false);
    }
    process.env.SMS_ENABLED = '1';
    expect(isSmsEnabled()).toBe(true);
  });
});

describe('normalizePhone', () => {
  it('ro\'yxatdan o\'tishdagi 12 xonali shaklni o\'zgartirmaydi', () => {
    expect(normalizePhone('998901234567')).toBe('998901234567');
  });

  it('formatlangan variantlarni tozalaydi', () => {
    expect(normalizePhone('+998 90 123 45 67')).toBe('998901234567');
    expect(normalizePhone('(998) 90-123-45-67')).toBe('998901234567');
    expect(normalizePhone(' 998901234567 ')).toBe('998901234567');
  });

  it('9 xonali lokal raqamga 998 qo\'shadi', () => {
    expect(normalizePhone('901234567')).toBe('998901234567');
  });

  // Yaroqsizni null qaytarish MUHIM: navbatga tushsa provayder xato beradi,
  // lekin bayroq baribir qo'yilib, odam xabarni hech qachon olmasdi.
  it('yaroqsiz qiymatlarni rad etadi', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('79001234567')).toBeNull();   // 998 emas
    expect(normalizePhone('9989012345678')).toBeNull(); // uzun
    expect(normalizePhone('salom')).toBeNull();
  });
});

describe('asciiFold va segments — GSM-7 narxi', () => {
  it('o\'zbek tipografik apostrofini ASCII ga tushiradi', () => {
    expect(asciiFold("oʻqituvchi")).toBe("o'qituvchi");
    expect(asciiFold('“matn”')).toBe('"matn"');
  });

  // ⚠️ NARX TESTI. U+02BB GSM-7 da yo'q → xabar UCS-2 ga o'tadi va bir
  // bo'lakka 160 emas, 70 belgi sig'adi. 100 belgilik matn shunda 1 emas,
  // 2 SMS bo'lib ketardi — ya'ni butun kampaniya ikki barobar qimmat.
  it('apostrof tufayli xabar ikki bo\'lakka bo\'linib ketmaydi', () => {
    const raw = `Zehin: sinov muddatingiz ertaga tugaydi. Pro obuna uchun yozing: t.me/zehinuz`;
    expect(segments(raw)).toBe(1);
    expect(segments(raw.replace('Zehin', 'Zehinʻ'))).toBe(1); // fold ishlaydi
  });

  it('kirill matn UCS-2 sifatida hisoblanadi', () => {
    expect(segments('a'.repeat(160))).toBe(1);
    expect(segments('a'.repeat(161))).toBe(2);
    expect(segments('я'.repeat(70))).toBe(1);
    expect(segments('я'.repeat(71))).toBe(2);
  });
});

describe('TEXT — matnlar', () => {
  const kinds = ['welcome', 'trialEnd', 'expired'];

  it('uchala matn ham bitta SMS ga sig\'adi', () => {
    for (const k of kinds) expect(segments(TEXT[k]())).toBe(1);
  });

  // Butun oqimning maqsadi — foydalanuvchini ILOVADAN TASHQARIDAGI kanalga
  // olib borish. Havola tushib qolsa SMS ma'nosini yo'qotadi.
  it('har bir matnda aloqa manzili bor', () => {
    for (const k of kinds) expect(TEXT[k]()).toContain('t.me/');
  });

  it('matnlar ASCII — tasodifiy tipografik belgi kirib qolmagan', () => {
    for (const k of kinds) {
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(TEXT[k]())).toBe(true);
    }
  });
});
