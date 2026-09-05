import { describe, it, expect } from 'vitest';
import {
  cleanDisplayName, formatUzDate, daysUntil, buildGrantMessage, buildGrantPush,
} from '../utils/premiumMessage';
import { SUPPORT_URL } from '../config';

// ════════════════════════════════════════════════════════════════════════
//  2026-09-05: admin qo'li bilan Pro berilganda foydalanuvchiga hech qanday
//  xabar ketmasdi (to'lov va muddat tugashi yo'llarida ketardi). Xabar
//  qo'shildi — pastdagi testlar uni ZARARLI qiladigan holatlarni qo'riqlaydi.
//
//  Har bir "yomon ism" HAQIQIY bazadan olingan naqsh, o'ylab topilgan emas.
// ════════════════════════════════════════════════════════════════════════

describe("cleanDisplayName — ism har doim ism emas", () => {
  it('telefon raqamiga «Hurmatli» deb murojaat qilmaydi', () => {
    expect(cleanDisplayName('998901234567')).toBeNull();
    expect(cleanDisplayName('+998 90 123 45 67')).toBeNull();
  });

  it('email va uning bo\'lagini rad etadi', () => {
    expect(cleanDisplayName('ali@gmail.com')).toBeNull();
  });

  it('shortId va Firebase uid ni rad etadi', () => {
    expect(cleanDisplayName('A0070')).toBeNull();
    expect(cleanDisplayName('q9gtnqTmWdWTuQBeRuM1IVocKjy1')).toBeNull();
  });

  it('bo\'sh va faqat probelli qiymatda null', () => {
    expect(cleanDisplayName('')).toBeNull();
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName(null)).toBeNull();
    expect(cleanDisplayName(undefined)).toBeNull();
  });

  it('bazadagi iflos ismlarni tozalaydi (ortiqcha probel)', () => {
    expect(cleanDisplayName('Sharof Baratov ')).toBe('Sharof Baratov');
    expect(cleanDisplayName('Oyxon ')).toBe('Oyxon');
    expect(cleanDisplayName('Sarvar  Valiyarov')).toBe('Sarvar Valiyarov');
  });

  it('kirill ismga tegmaydi', () => {
    expect(cleanDisplayName('Жуманазаров Равшан Рахимович')).toBe('Жуманазаров Равшан Рахимович');
  });

  it('kichik harfli ismga bosh harf qo\'yadi', () => {
    expect(cleanDisplayName('inobatsaxadova')).toBe('Inobatsaxadova');
    expect(cleanDisplayName('zafar tuychiyev')).toBe('Zafar Tuychiyev');
  });
});

describe('formatUzDate / daysUntil', () => {
  it('sanani chalkashmaydigan ko\'rinishda beradi', () => {
    // MAHALLIY 23:59:59 — panel `premiumExpire` ni shunday yozadi.
    expect(formatUzDate(new Date(2026, 9, 5, 23, 59, 59))).toBe('2026-yil 5-oktabr');
  });

  it('yaroqsiz sanada bo\'sh satr (xabar buzilmasin)', () => {
    expect(formatUzDate('salom')).toBe('');
  });

  it('kun oxiriga qo\'yilgan muddatni tugma bilan bir xil sanaydi', () => {
    // Kunduzi berilgan "30 kun" = 30.4 kun. `ceil` 31 derdi.
    const now = new Date(2026, 8, 5, 12, 0, 0);
    const exp = new Date(2026, 9, 5, 23, 59, 59);
    expect(daysUntil(exp, now)).toBe(30);
  });

  it('eng kami 1 kun (bugun tugaydigan obuna «0 kun» bo\'lmasin)', () => {
    const now = new Date(2026, 8, 5, 20, 0, 0);
    expect(daysUntil(new Date(2026, 8, 5, 23, 59, 59), now)).toBe(1);
  });
});

describe('buildGrantMessage — ilova ichidagi xabar', () => {
  const exp = new Date(2026, 9, 5, 23, 59, 59);
  const now = new Date(2026, 8, 5, 12, 0, 0);

  it('ism bo\'lsa ism bilan murojaat qiladi', () => {
    const m = buildGrantMessage({ name: 'Sharof Baratov ', expireIso: exp, now });
    expect(m).toContain('Hurmatli Sharof Baratov!');
    expect(m).toContain('2026-yil 5-oktabrgacha');
    expect(m).toContain('(30 kun)');
  });

  it('ism yaroqsiz bo\'lsa neytral salom — raqam matnga tushmaydi', () => {
    const m = buildGrantMessage({ name: '998901234567', expireIso: exp, now });
    expect(m).toContain('Assalomu alaykum!');
    expect(m).not.toContain('998901234567');
  });

  it('aloqa manzili TO\'LIQ havola — `@zehinuz` kanalga olib ketmasin', () => {
    const m = buildGrantMessage({ name: 'Zafar', expireIso: exp, now });
    expect(m).toContain(SUPPORT_URL);
    expect(m).toContain('?direct');
    expect(m).toContain("savolingiz bo'lsa");
  });
});

describe('buildGrantPush — Play anti-steering', () => {
  const exp = new Date(2026, 9, 5, 23, 59, 59);

  it('push matnida ALOQA MANZILI bo\'lmaydi', () => {
    const p = buildGrantPush({ name: 'Zafar', expireIso: exp });
    expect(p).not.toContain('t.me');
    expect(p).not.toContain(SUPPORT_URL);
  });

  it('qulf ekraniga sig\'adigan uzunlikda', () => {
    expect(buildGrantPush({ name: 'Zafar', expireIso: exp }).length).toBeLessThan(120);
  });
});
