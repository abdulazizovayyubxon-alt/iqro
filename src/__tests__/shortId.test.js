/**
 * formatShortId — qisqa foydalanuvchi ID formati.
 * Audit 19-band: 26 harf tugagach format buzilardi.
 */

import { describe, it, expect } from 'vitest';
import { formatShortId } from '../utils/shortId.js';

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
