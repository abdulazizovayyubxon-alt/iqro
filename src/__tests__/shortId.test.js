/**
 * formatShortId — qisqa foydalanuvchi ID formati.
 * Audit 19-band: 26 harf tugagach format buzilardi.
 *
 * ensureShortId — 2026-08-06 tekshiruvi: 22 hisobdan 20 tasi ID'siz qolgan edi.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: (_db, ...path) => ({ path: path.join('/') }),
  getDoc: (...a) => globalThis.__getDoc(...a),
  setDoc: (...a) => globalThis.__setDoc(...a),
  runTransaction: (...a) => globalThis.__runTransaction(...a),
}));

const { formatShortId, getNextShortId, ensureShortId } = await import('../utils/shortId.js');

describe('formatShortId — normal oraliq', () => {
  it('birinchi foydalanuvchi A0001', () => {
    expect(formatShortId(1)).toBe('A0001');
  });

  it('A harfining oxiri A9999', () => {
    expect(formatShortId(9999)).toBe('A9999');
  });

  it('keyingisi B0001 ga o\'tadi', () => {
    expect(formatShortId(10000)).toBe('B0001');
  });

  it('o\'rtadagi qiymat', () => {
    expect(formatShortId(5000)).toBe('A5000');
    expect(formatShortId(12345)).toBe('B2346');
  });

  it('Z harfining oxiri', () => {
    // 26 harf × 9999 = 259 974
    expect(formatShortId(259974)).toBe('Z9999');
  });
});

describe('formatShortId — 19-BAND: alifbo chegarasidan oshish', () => {
  // AVVAL: `String.fromCharCode(65 + letterIndex)` 26 dan oshganda `[`, `\`, `]`
  // kabi belgilar berardi — ID formati buzilardi.
  it('Z9999 dan keyin AA0001 ga o\'tadi, buzilmaydi', () => {
    expect(formatShortId(259975)).toBe('AA0001');
  });

  it('ikki harfli prefiks ham to\'g\'ri sanaydi', () => {
    expect(formatShortId(259975 + 9999)).toBe('AB0001');
  });

  it('chegaradan oshgan qiymatlar DOIM harf bilan boshlanadi', () => {
    for (const seq of [259975, 300000, 500000, 1_000_000, 5_000_000]) {
      const id = formatShortId(seq);
      expect(id).toMatch(/^[A-Z]{1,2}\d{4}$/);
    }
  });
});

describe('formatShortId — invariantlar', () => {
  it('raqam qismi DOIM 4 xonali va 0001..9999 oralig\'ida', () => {
    for (const seq of [1, 2, 9998, 9999, 10000, 99999, 259974, 259975, 400000]) {
      const id = formatShortId(seq);
      const digits = Number(id.slice(-4));
      expect(id.slice(-4)).toHaveLength(4);
      expect(digits).toBeGreaterThanOrEqual(1);
      expect(digits).toBeLessThanOrEqual(9999);
    }
  });

  it('ketma-ket seq → ketma-ket UNIKAL ID', () => {
    const ids = new Set();
    for (let seq = 9995; seq <= 10005; seq++) ids.add(formatShortId(seq));
    expect(ids.size).toBe(11); // dublikat yo'q
  });

  it('katta oraliqda ham dublikat bermaydi', () => {
    const ids = new Set();
    for (let seq = 259970; seq <= 259990; seq++) ids.add(formatShortId(seq));
    expect(ids.size).toBe(21);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2026-08-06 TEKSHIRUVI — nega 22 hisobdan 20 tasi ID'siz qolgan edi
//
// Sabab zanjiri:
//   1) ID bir ro'yxatdan o'tishda IKKI joyda parallel generatsiya qilinardi;
//   2) firestore.rules `userSeq == oldingi + 1` ni talab qilgani uchun mag'lub
//      tranzaksiya ABORTED emas, PERMISSION_DENIED olardi — SDK uni retry
//      QILMAYDI;
//   3) `catch → null` xatoni yutib, o'sha `null` hujjatga yozilardi.
// ══════════════════════════════════════════════════════════════════════════

const denied = () => Object.assign(new Error('permission denied'), { code: 'permission-denied' });

describe('getNextShortId — raqobatda qayta urinish', () => {
  beforeEach(() => {
    globalThis.__getDoc = vi.fn();
    globalThis.__setDoc = vi.fn(async () => {});
    globalThis.__runTransaction = vi.fn();
  });

  it('PERMISSION_DENIED dan keyin qayta urinib ID qaytaradi', async () => {
    let calls = 0;
    globalThis.__runTransaction = vi.fn(async () => {
      calls++;
      if (calls < 3) throw denied();
      return 7;
    });

    await expect(getNextShortId({})).resolves.toBe('A0007');
    expect(calls).toBe(3);
  });

  it('urinishlar tugagach xato QAYTARADI (jimgina null emas)', async () => {
    globalThis.__runTransaction = vi.fn(async () => { throw denied(); });
    await expect(getNextShortId({})).rejects.toThrow(/permission denied/);
  });
});

describe('ensureShortId — ID berishning yagona nuqtasi', () => {
  beforeEach(() => {
    globalThis.__getDoc = vi.fn(async () => ({ exists: () => true, data: () => ({}) }));
    globalThis.__setDoc = vi.fn(async () => {});
    globalThis.__runTransaction = vi.fn(async () => 5);
  });

  it('mavjud ID ni QAYTA YOZMAYDI', async () => {
    globalThis.__getDoc = vi.fn(async () => ({ exists: () => true, data: () => ({ shortId: 'A0009' }) }));

    await expect(ensureShortId({}, 'uid-mavjud')).resolves.toBe('A0009');
    expect(globalThis.__setDoc).not.toHaveBeenCalled();
    expect(globalThis.__runTransaction).not.toHaveBeenCalled();
  });

  it('yetishmaganda generatsiya qilib FAQAT shortId maydonini yozadi', async () => {
    await expect(ensureShortId({}, 'uid-yangi')).resolves.toBe('A0005');

    expect(globalThis.__setDoc).toHaveBeenCalledTimes(1);
    const [, payload, opts] = globalThis.__setDoc.mock.calls[0];
    // role/isPremium/createdAt firestore.rules protectedUserFields() da —
    // ular bilan birga yuborilgan yangilanish rad etilardi.
    expect(Object.keys(payload)).toEqual(['shortId']);
    expect(opts).toEqual({ merge: true });
  });

  it('generatsiya muvaffaqiyatsiz bo\'lsa hujjatga HECH NARSA yozmaydi', async () => {
    globalThis.__runTransaction = vi.fn(async () => { throw denied(); });

    await expect(ensureShortId({}, 'uid-xato')).rejects.toThrow();
    // Asosiy regressiya: avval shu yerda `shortId: null` yozilardi.
    expect(globalThis.__setDoc).not.toHaveBeenCalled();
  });

  it('bir uid uchun parallel chaqiruvlar BITTA generatsiyani baham ko\'radi', async () => {
    // Aynan shu poyga hisoblagichni yeb, foydalanuvchini ID'siz qoldirardi.
    const [a, b, c] = await Promise.all([
      ensureShortId({}, 'uid-poyga'),
      ensureShortId({}, 'uid-poyga'),
      ensureShortId({}, 'uid-poyga'),
    ]);

    expect([a, b, c]).toEqual(['A0005', 'A0005', 'A0005']);
    expect(globalThis.__runTransaction).toHaveBeenCalledTimes(1);
    expect(globalThis.__setDoc).toHaveBeenCalledTimes(1);
  });

  it('tugagach keyingi chaqiruv yangi generatsiya qila oladi', async () => {
    await ensureShortId({}, 'uid-1');
    await ensureShortId({}, 'uid-2');
    expect(globalThis.__runTransaction).toHaveBeenCalledTimes(2);
  });
});
