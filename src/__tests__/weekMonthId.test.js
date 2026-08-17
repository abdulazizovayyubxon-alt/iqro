import { describe, it, expect, afterEach, vi } from 'vitest';
import { getWeekId as srvWeek, getMonthId as srvMonth } from '../../api/_shared.js';
import { getWeekId as cliWeek, getMonthId as cliMonth } from '../context/AppContext.jsx';

/**
 * ⚠️ SERVER va MIJOZ bir xil satr qaytarishi SHART.
 *
 * `weekly_2026_W33` / `monthly_2026_M08` — bular `userStats` hujjatidagi
 * MAYDON NOMLARI. Cron reyting snapshot'ini shu nom bo'yicha yozadi, mijoz
 * esa shu nom bo'yicha o'qiydi. Bir belgi farq qilsa — xato chiqmaydi,
 * shunchaki reyting bo'sh bo'ladi. Aynan shunday jim buzilishlarni test
 * bilan qulflaymiz.
 *
 * Mijoz nusxasi MAHALLIY vaqtdan foydalanadi, server esa UTC'da ishlaydi —
 * shuning uchun test Toshkent zonasida bajariladi (foydalanuvchilar shu yerda).
 */

// Mijoz kodi mahalliy vaqtga tayanadi — testni Toshkent zonasiga qo'yamiz.
process.env.TZ = 'Asia/Tashkent';

afterEach(() => { vi.useRealTimers(); });

/** Toshkent vaqtidagi lahzani UTC sifatida beradi (UTC+5). */
const tashkent = (y, m, d, h = 12, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h - 5, min));

describe('getWeekId / getMonthId — server va mijoz mosligi', () => {
  const nuqtalar = [
    ['oddiy kun', tashkent(2026, 8, 17, 12)],
    ['yil boshi', tashkent(2026, 1, 1, 12)],
    ['yil oxiri', tashkent(2026, 12, 31, 12)],
    ['oy chegarasi — 1-sana ertalab', tashkent(2026, 9, 1, 2)],
    ['oy chegarasi — oxirgi kun kechqurun', tashkent(2026, 8, 31, 23)],
    ['dushanba (ISO hafta boshi)', tashkent(2026, 8, 17, 0, 30)],
    ['yakshanba (ISO hafta oxiri)', tashkent(2026, 8, 16, 23, 30)],
    ['kabisa yili — 29 fevral', tashkent(2028, 2, 29, 12)],
  ];

  it.each(nuqtalar)('hafta ID mos keladi: %s', (_nom, sana) => {
    expect(srvWeek(sana)).toBe(cliWeek(sana));
  });

  it.each(nuqtalar)('oy ID mos keladi: %s', (_nom, sana) => {
    expect(srvMonth(sana)).toBe(cliMonth(sana));
  });

  it('format kutilganidek — `YYYY_Www` va `YYYY_MM`', () => {
    // Format o'zgarsa mavjud hujjatlardagi maydonlar «yetim» qolib ketardi.
    expect(srvWeek(tashkent(2026, 8, 17))).toMatch(/^\d{4}_W\d{2}$/);
    expect(srvMonth(tashkent(2026, 8, 17))).toBe('2026_M08');
  });

  it('cron ishlaydigan soatda (06:00 UTC) ham mos keladi', () => {
    // vercel.json: "0 6 * * *" — snapshot AYNAN shu lahzada yoziladi.
    const cronVaqti = new Date(Date.UTC(2026, 8, 1, 6, 0));
    expect(srvWeek(cronVaqti)).toBe(cliWeek(cronVaqti));
    expect(srvMonth(cronVaqti)).toBe(cliMonth(cronVaqti));
  });
});
