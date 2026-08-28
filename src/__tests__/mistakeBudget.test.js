import { describe, it, expect } from 'vitest';
import { enforceMistakeBudget, LEECH_THRESHOLD } from '../engine/mistakeQueue';
import { MAX_MISTAKES_TOTAL } from '../config';

/**
 * JURNAL TAHLILI 2026-08-28 — NEGA BU TEST BOR.
 *
 * `MAX_MISTAKES_SAVED` (300) FAN BO'YICHA qo'llanadi, `userStats` hujjati esa
 * BITTA. Ya'ni ikki fanli foydalanuvchi 600 ta xato saqlaydi, uch fanli — 900.
 * Bitta yozuv o'lchandi: ~948 bayt (savol matni, variantlar, izoh bilan).
 * `spacedCards` ustiga qo'shilganda hujjat Firestore ning 1 MiB QAT'IY
 * chegarasidan oshadi va o'shanda `userStats` BUTUNLAY yozilmaydigan bo'lib
 * qoladi — bu tuzatilgan nosozlikdan ham yomon, chunki undan chiqish yo'q.
 *
 * O'lchandi (476 hujjat): eng kattasi 606 KB = limitning 59%. Xavf hali yuz
 * bermagan, lekin yo'lda edi — shu sababli byudjet HUJJAT bo'yicha qo'yildi.
 */

const m = (id, over = {}) => ({
  qHash: `h${id}`,
  question: `Savol ${id}`,
  wrongCount: 1,
  lastWrongAt: 1000 + id,
  ...over,
});

const statsWith = (counts) => {
  const out = {};
  let id = 0;
  for (const [cat, n] of Object.entries(counts)) {
    out[cat] = { totalAnswered: 100, mistakes: Array.from({ length: n }, () => m(id++)) };
  }
  return out;
};

const jami = (stats) => Object.values(stats).reduce((s, c) => s + c.mistakes.length, 0);

describe('enforceMistakeBudget', () => {
  it('byudjetdan oshmasa AYNI obyektni qaytaradi (ortiqcha yozuv bo\'lmasin)', () => {
    const stats = statsWith({ chqbt: 100, art: 50 });
    expect(enforceMistakeBudget(stats)).toBe(stats);
  });

  it('bitta fan chegarada bo\'lsa ham tegmaydi', () => {
    const stats = statsWith({ chqbt: MAX_MISTAKES_TOTAL });
    expect(enforceMistakeBudget(stats)).toBe(stats);
  });

  it('IKKI fan chegaraga chiqqanda jami byudjetga siqadi', () => {
    // Aynan xavfli holat: har fan o'z chegarasida (300), hujjat esa ikki barobar
    const stats = statsWith({ chqbt: 300, art: 300 });
    expect(jami(stats)).toBe(600);
    const out = enforceMistakeBudget(stats);
    expect(jami(out)).toBe(MAX_MISTAKES_TOTAL);
  });

  it('UCH fanli holat ham byudjetdan oshmaydi', () => {
    const out = enforceMistakeBudget(statsWith({ chqbt: 300, art: 300, tarix: 300 }));
    expect(jami(out)).toBe(MAX_MISTAKES_TOTAL);
  });

  it('fanlarning boshqa maydonlariga TEGMAYDI', () => {
    const out = enforceMistakeBudget(statsWith({ chqbt: 300, art: 300 }));
    expect(out.chqbt.totalAnswered).toBe(100);
    expect(out.art.totalAnswered).toBe(100);
  });

  it('birinchi bo\'lib YOPILGAN (retired) xatolar tashlanadi', () => {
    const ochiq = Array.from({ length: MAX_MISTAKES_TOTAL }, (_, i) => m(i));
    const yopiq = Array.from({ length: 50 }, (_, i) => m(1000 + i, { retiredAt: 5 }));
    const out = enforceMistakeBudget({
      chqbt: { mistakes: [...yopiq, ...ochiq] },
    });
    expect(out.chqbt.mistakes).toHaveLength(MAX_MISTAKES_TOTAL);
    expect(out.chqbt.mistakes.some(x => x.retiredAt)).toBe(false);
  });

  it("KO'P xato qilingan savol kam xato qilinganidan ustun turadi", () => {
    const kam = Array.from({ length: MAX_MISTAKES_TOTAL }, (_, i) => m(i, { wrongCount: 1 }));
    // 4 < LEECH_THRESHOLD (5) — hali "tirishqoq" emas, ya'ni to'liq faol xato
    const kop = m(9999, { wrongCount: 4 });
    const out = enforceMistakeBudget({ chqbt: { mistakes: [...kam, kop] } });
    expect(out.chqbt.mistakes).toContainEqual(kop);
  });

  it('TIRISHQOQ (leech) xato faol xatodan OLDIN tashlanadi', () => {
    // `pruneMistakes` bilan bir xil ustuvorlik: wrongCount >= LEECH_THRESHOLD
    // bo'lgan savol mashqni bo'g'ib qo'yadi, shuning uchun byudjet qisilganda
    // birinchi bo'lib u chiqadi — bu ATAYLAB qilingan tanlov, tasodif emas.
    const faol = Array.from({ length: MAX_MISTAKES_TOTAL }, (_, i) => m(i, { wrongCount: 1 }));
    const leech = m(9999, { wrongCount: LEECH_THRESHOLD });
    const out = enforceMistakeBudget({ chqbt: { mistakes: [leech, ...faol] } });
    expect(out.chqbt.mistakes).not.toContainEqual(leech);
  });

  it('yaroqsiz kirishda yiqilmaydi', () => {
    expect(enforceMistakeBudget(null)).toBe(null);
    expect(enforceMistakeBudget({})).toEqual({});
    expect(enforceMistakeBudget({ chqbt: {} })).toEqual({ chqbt: {} });
  });

  it('byudjet hujjat hajmini 1 MiB dan ancha pastda ushlaydi', () => {
    // O'lchangan o'rtacha yozuv ~948 bayt
    const engYomon = MAX_MISTAKES_TOTAL * 948;
    expect(engYomon).toBeLessThan(420 * 1024);   // xatolar ulushi < 420 KB
  });
});
