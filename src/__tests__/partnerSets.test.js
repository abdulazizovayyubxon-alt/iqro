import { describe, it, expect } from 'vitest';
import { qulfHolatini, sanaMatni } from '../services/partnerSets';

/**
 * Haftalik diagnostika to'plamlarining QULF mantiqi.
 *
 * Bu yerdagi xato foydalanuvchiga to'g'ridan-to'g'ri ko'rinadi: yo hali
 * ochilmagan hafta ochilib ketadi (ustozning reja-tartibi buziladi), yo
 * ochilishi kerak bo'lgan hafta yopiq qolib, guruh «ishlay olmadik» deb
 * qoladi. Ikkalasi ham qimmat, shuning uchun chegara holatlari qo'riqlanadi.
 *
 * Eng nozik joy — SANA chegarasi: ochilish kuni soat 00:00 dan ochiq
 * bo'lishi kerak, o'sha kuni ertalab emas.
 */

const kun = (offset) => {
  const d = new Date(Date.now() + offset * 86400000);
  return d.toISOString().slice(0, 10);
};

const sets = (over = {}) => ([
  { id: 'h1', title: '1-hafta diagnostika', order: 1, opensAt: null, ...(over.h1 || {}) },
  { id: 'h2', title: '2-hafta diagnostika', order: 2, opensAt: kun(6), ...(over.h2 || {}) },
]);

const ishlangan = { h1: { correct: 20, answered: 35, doneAt: '2026-08-18T10:00:00.000Z' } };

describe('qulfHolatini — ketma-ketlik', () => {
  it('birinchi to\'plam har doim ochiq (oldingisi yo\'q)', () => {
    const r = qulfHolatini(sets(), {});
    expect(r[0].locked).toBe(false);
  });

  it('oldingi hafta ishlanmagan bo\'lsa keyingisi qulflanadi', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: null } }), {});
    expect(r[1].locked).toBe(true);
    expect(r[1].lockReason).toBe('sequence');
  });

  it('qulf xabari oldingi haftaning NOMINI aytadi — foydalanuvchi nima qilishni bilsin', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: null } }), {});
    expect(r[1].lockMessage).toContain('1-hafta diagnostika');
  });

  it('oldingi hafta ishlangach ochiladi', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: null } }), ishlangan);
    expect(r[1].locked).toBe(false);
  });

  it('past natija ham YAKUNLANGAN hisoblanadi — diagnostika baho emas', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: null } }), { h1: { correct: 2, answered: 35 } });
    expect(r[1].locked).toBe(false);
  });
});

describe('qulfHolatini — sana', () => {
  it('sana kelmagan bo\'lsa qulflanadi', () => {
    const r = qulfHolatini(sets(), ishlangan);
    expect(r[1].locked).toBe(true);
    expect(r[1].lockReason).toBe('date');
  });

  it('ochilish KUNI ochiq bo\'ladi — o\'sha kuni ertalab ham', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: kun(0) } }), ishlangan);
    expect(r[1].locked).toBe(false);
  });

  it('sana o\'tgan bo\'lsa ochiq', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: kun(-3) } }), ishlangan);
    expect(r[1].locked).toBe(false);
  });

  it('qulf xabarida sana o\'zbekcha yoziladi', () => {
    const r = qulfHolatini(sets({ h2: { opensAt: '2026-08-23' } }), ishlangan);
    expect(r[1].lockMessage).toBe('23-avgust, yakshanba kuni ochiladi');
  });
});

describe('qulfHolatini — ikkala shart ham buzilganda', () => {
  it('KETMA-KETLIK xabari ustun — sanani kutishdan boshqa ilojsiz ish aytilmaydi', () => {
    const r = qulfHolatini(sets(), {}); // h1 ishlanmagan VA h2 sanasi kelmagan
    expect(r[1].lockReason).toBe('sequence');
  });
});

describe('bir nechta hamkor bir ro\'yxatda (admin ko\'rinishi)', () => {
  // Admin barcha hamkorlarning to'plamini bitta ro'yxatda ko'radi. Ketma-ketlik
  // HAR HAMKOR ICHIDA hisoblanishi kerak — aks holda A hamkorning 1-haftasi
  // B hamkorning 1-haftasini qulflab qo'yardi.
  const aralash = [
    { id: 'a1', title: 'A 1-hafta', order: 1, opensAt: null, partnerCode: 'AAA' },
    { id: 'a2', title: 'A 2-hafta', order: 2, opensAt: null, partnerCode: 'AAA' },
    { id: 'b1', title: 'B 1-hafta', order: 1, opensAt: null, partnerCode: 'BBB' },
    { id: 'b2', title: 'B 2-hafta', order: 2, opensAt: null, partnerCode: 'BBB' },
  ];

  it('har hamkorning birinchi haftasi ochiq', () => {
    const r = qulfHolatini(aralash, {});
    expect(r.find(x => x.id === 'a1').locked).toBe(false);
    expect(r.find(x => x.id === 'b1').locked).toBe(false);
  });

  it('boshqa hamkorning haftasi qulfga sabab bo\'lmaydi', () => {
    const r = qulfHolatini(aralash, {});
    // b1 ochiq bo'lsa ham, a2 faqat a1 ga bog'liq
    expect(r.find(x => x.id === 'a2').lockMessage).toContain('A 1-hafta');
    expect(r.find(x => x.id === 'b2').lockMessage).toContain('B 1-hafta');
  });

  it('bir hamkorda ishlash boshqasini ochib yubormaydi', () => {
    const r = qulfHolatini(aralash, { a1: { correct: 10, answered: 35 } });
    expect(r.find(x => x.id === 'a2').locked).toBe(false);
    expect(r.find(x => x.id === 'b2').locked).toBe(true);
  });
});

describe('sanaMatni', () => {
  it('23-avgust 2026 — yakshanba', () => {
    expect(sanaMatni('2026-08-23')).toBe('23-avgust, yakshanba');
  });

  it('30-avgust 2026 — keyingi yakshanba', () => {
    expect(sanaMatni('2026-08-30')).toBe('30-avgust, yakshanba');
  });

  it('yaroqsiz sana buzilmaydi, o\'zini qaytaradi', () => {
    expect(sanaMatni('xato')).toBe('xato');
  });
});

describe('natija to\'plamga biriktiriladi', () => {
  it('ishlangan haftaning natijasi qaytariladi', () => {
    const r = qulfHolatini(sets(), ishlangan);
    expect(r[0].result).toEqual(ishlangan.h1);
    expect(r[1].result).toBeNull();
  });
});
