import { describe, it, expect } from 'vitest';
import { maskPhone, buildResetPasswordMessage } from '../utils/resetPasswordMessage';

// ════════════════════════════════════════════════════════════════════════
//  2026-09-11: vaqtinchalik parol oynasiga Telegramga tayyor xabar qo'shildi.
//  Xabarda JONLI PAROL bor — pastdagi testlar uni xavfli yoki yaroqsiz
//  qiladigan holatlarni qo'riqlaydi.
// ════════════════════════════════════════════════════════════════════════

const PW = 'S4NRUCzaFA';

describe("maskPhone — xabar adashib ketsa ham tayyor login bo'lmasin", () => {
  it("faqat operator kodi va oxirgi 2 raqam qoladi", () => {
    expect(maskPhone('998901234567')).toBe('+998 90 ••• •• 67');
    expect(maskPhone('+998 90 123 45 67')).toBe('+998 90 ••• •• 67');
    expect(maskPhone('901234567')).toBe('+998 90 ••• •• 67');
  });

  it("telefon bo'lmagan qiymatda null", () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
    expect(maskPhone('')).toBeNull();
    expect(maskPhone('12345')).toBeNull();
    expect(maskPhone('998901234567@iqro.uz')).toBeNull();
  });

  it("`*` ishlatmaydi — Telegram `**` ni qalin matnga aylantirardi", () => {
    expect(maskPhone('998901234567')).not.toContain('*');
  });
});

describe('buildResetPasswordMessage — Telegramga tayyor xabar', () => {
  it("parol AYNAN o'zi: registri saqlangan, backtick ichida", () => {
    const m = buildResetPasswordMessage({ name: 'Zafar', phone: '998901234567', password: PW });
    expect(m).toContain('`' + PW + '`');
    expect(m).toContain('katta va kichik harflar farq qiladi');
  });

  it("to'liq telefon raqami matnga TUSHMAYDI", () => {
    const m = buildResetPasswordMessage({ name: 'Zafar', phone: '998901234567', password: PW });
    expect(m).toContain('+998 90 ••• •• 67');
    expect(m).not.toContain('998901234567');
    expect(m).not.toContain('123 45');
  });

  it("profilda telefon bo'lmasa, raqam Auth emailidan tiklanadi", () => {
    const m = buildResetPasswordMessage({ name: 'Zafar', email: '998901234567@iqro.uz', password: PW });
    expect(m).toContain('+998 90 ••• •• 67');
  });

  it("oddiy emaildagi raqamlar telefon deb olinmaydi", () => {
    const m = buildResetPasswordMessage({ name: 'Zafar', email: 'ali123456789@gmail.com', password: PW });
    expect(m).not.toContain('Raqam:');
    expect(m).toContain('`' + PW + '`');
  });

  it("ism yaroqsiz bo'lsa neytral salom — raqam murojaatga tushmaydi", () => {
    const m = buildResetPasswordMessage({ name: '998901234567', phone: '998901234567', password: PW });
    expect(m.startsWith('Assalomu alaykum!')).toBe(true);
    expect(m).not.toContain('998901234567');
  });

  it("ism bo'lsa ism bilan murojaat qiladi", () => {
    const m = buildResetPasswordMessage({ name: 'Sharof Baratov ', password: PW });
    expect(m.startsWith('Hurmatli Sharof Baratov!')).toBe(true);
  });

  it("parolni o'zgartirish yo'li HAQIQIY joyni ko'rsatadi (Sozlamalar, Profil emas)", () => {
    // PasswordModal faqat SettingsPage.jsx dan ochiladi.
    const m = buildResetPasswordMessage({ name: 'Zafar', password: PW });
    expect(m).toContain("Sozlamalar → Parolni o'zgartirish");
    expect(m).not.toContain('Profil →');
  });

  it('Telegram belgilash sintaksisi faqat parol atrofida', () => {
    const m = buildResetPasswordMessage({ name: 'Zafar', phone: '998901234567', password: PW });
    expect(m.match(/`/g)).toHaveLength(2);
    expect(m).not.toMatch(/\*\*|__|~~|\|\|/);
  });
});
