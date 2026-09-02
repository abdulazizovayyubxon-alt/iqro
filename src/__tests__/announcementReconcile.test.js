import { describe, it, expect } from 'vitest';
import { reconcileAnnouncements, ANNOUNCEMENTS_LIMIT } from '../utils/announcements';

// ════════════════════════════════════════════════════════════════════════
//  AUDIT 2026-09-02 (2), A-1 — O'CHIRILGAN E'LON MIJOZDA QOLIB KETARDI.
//
//  Admin tomonda o'chirish TO'G'RI ishlardi (surat qayta yozilardi), lekin
//  mijozdagi `absorb()` faqat qo'shishni bilardi. Natijada noto'g'ri narx
//  yoki imtihon sanasini yuborib, keyin o'chirgan admin «qaytarib oldim»
//  deb o'ylardi — e'lon esa uni olgan har bir odamda turaverardi.
//
//  ⚠️ BU TESTLARNING ASOSIY VAZIFASI — O'CHIRMASLIK KERAK BO'LGANINI
//  QO'RIQLASH. Shaxsiy bildirishnomalar (yutuq, marra, unvon) `targetUser`
//  va `userId` maydonlarisiz yoziladi, ya'ni `isBroadcast()` ular uchun
//  `true` qaytaradi. Solishtirish faqat shakl bo'yicha qilinganda HAR
//  FOYDALANUVCHINING butun yutuqlar tarixi o'chib ketardi.
// ════════════════════════════════════════════════════════════════════════

const ANCHOR = '2026-09-02T10:00:00.000Z';

const global_ = (id, date) => ({ id, date, src: 'global', title: id });
const personal = (id, date, extra = {}) => ({ id, date, src: 'personal', title: id, ...extra });

describe('⚠️ O‘CHIRILMASLIGI SHART', () => {
  it('shaxsiy yutuq bildirishnomasi — `targetUser` YO‘Q, lekin tegilmaydi', () => {
    // Aynan AppContext.jsx:1374 yozadigan shakl: targetUser/userId yo'q.
    const yutuq = personal('ach1', '2026-09-01T00:00:00.000Z', { type: 'achievement', tier: 2 });
    const local = [yutuq];
    expect(reconcileAnnouncements(local, [], ANCHOR)).toEqual([yutuq]);
  });

  it('marra va unvon bildirishnomalari ham qoladi', () => {
    const local = [
      personal('ms1', '2026-08-20T00:00:00.000Z', { type: 'milestone' }),
      personal('uv1', '2026-08-21T00:00:00.000Z', { type: 'unvon' }),
    ];
    expect(reconcileAnnouncements(local, [], ANCHOR)).toHaveLength(2);
  });

  it('belgisiz ESKI yozuv (tuzatishdan oldin saqlangan) tegilmaydi', () => {
    const eski = { id: 'x1', date: '2026-08-01T00:00:00.000Z', title: 'eski' }; // src yo'q
    expect(reconcileAnnouncements([eski], [], ANCHOR)).toEqual([eski]);
  });

  it('ochiq kolleksiyadagi eski `targetUser: <uid>` yozuvi tegilmaydi', () => {
    // Surat bunday yozuvlarni ATAYLAB o'z ichiga olmaydi (buildAnnouncementItems),
    // ya'ni «suratda yo'q» degani «o'chirilgan» degani EMAS.
    const legacy = { id: 'l1', date: '2026-09-01T00:00:00.000Z', src: 'global', targetUser: 'uid-42' };
    expect(reconcileAnnouncements([legacy], [], ANCHOR)).toEqual([legacy]);
  });

  it('suratdan KEYIN kelgan e‘lon (jonli tinglovchi) tegilmaydi', () => {
    const yangi = global_('n1', '2026-09-02T11:00:00.000Z'); // anchor'dan keyin
    expect(reconcileAnnouncements([yangi], [], ANCHOR)).toEqual([yangi]);
  });

  it('surat TO‘LGAN bo‘lsa, undan eski e‘lonlarga tegilmaydi', () => {
    // 30 ta element = surat kesilgan bo'lishi mumkin, eskisi haqida hech
    // narsa deya olmaydi.
    const snap = Array.from({ length: ANNOUNCEMENTS_LIMIT }, (_, i) =>
      global_(`s${i}`, `2026-09-0${(i % 2) + 1}T00:00:00.000Z`));
    const juda_eski = global_('old1', '2026-01-01T00:00:00.000Z');
    expect(reconcileAnnouncements([juda_eski], snap, ANCHOR)).toContainEqual(juda_eski);
  });

  it('anchor yo‘q bo‘lsa (surat o‘qilmadi) hech narsa o‘chirilmaydi', () => {
    const local = [global_('g1', '2026-09-01T00:00:00.000Z')];
    expect(reconcileAnnouncements(local, [], null)).toEqual(local);
  });
});

describe('o‘chirilishi KERAK bo‘lgan holat', () => {
  it('admin o‘chirgan umumiy e‘lon lokal ro‘yxatdan chiqadi', () => {
    const qolgan = global_('g1', '2026-09-01T00:00:00.000Z');
    const ochirilgan = global_('g2', '2026-09-01T05:00:00.000Z');
    const out = reconcileAnnouncements([qolgan, ochirilgan], [qolgan], ANCHOR);
    expect(out.map(n => n.id)).toEqual(['g1']);
  });

  it('hammasi o‘chirilsa — surat bo‘sh, umumiylar ketadi, shaxsiylar qoladi', () => {
    const local = [
      global_('g1', '2026-09-01T00:00:00.000Z'),
      global_('g2', '2026-09-01T01:00:00.000Z'),
      personal('ach1', '2026-09-01T02:00:00.000Z', { type: 'achievement' }),
    ];
    const out = reconcileAnnouncements(local, [], ANCHOR);
    expect(out.map(n => n.id)).toEqual(['ach1']);
  });

  it('surat to‘lmagan bo‘lsa, u TO‘LIQ manba — eski e‘lon ham o‘chadi', () => {
    const snap = [global_('g1', '2026-09-01T00:00:00.000Z')];
    const ochirilgan = global_('g0', '2026-08-01T00:00:00.000Z'); // snapshot'dagidan eski
    const out = reconcileAnnouncements([...snap, ochirilgan], snap, ANCHOR);
    expect(out.map(n => n.id)).toEqual(['g1']);
  });
});

describe('havola barqarorligi', () => {
  it('o‘zgarish bo‘lmasa AYNAN o‘sha massiv qaytadi (keraksiz render yo‘q)', () => {
    const local = [global_('g1', '2026-09-01T00:00:00.000Z')];
    expect(reconcileAnnouncements(local, local, ANCHOR)).toBe(local);
  });

  it('yaroqsiz kirish qiymatlarida ham o‘sha massiv qaytadi', () => {
    const local = [global_('g1', '2026-09-01T00:00:00.000Z')];
    expect(reconcileAnnouncements(local, null, ANCHOR)).toBe(local);
    expect(reconcileAnnouncements(local, undefined, ANCHOR)).toBe(local);
  });

  it('sanasiz element tegilmaydi (buzuq yozuvni o‘chirmaymiz)', () => {
    const sanasiz = { id: 'g9', src: 'global', title: 'sanasiz' };
    expect(reconcileAnnouncements([sanasiz], [], ANCHOR)).toEqual([sanasiz]);
  });
});
