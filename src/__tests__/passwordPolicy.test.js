/**
 * Parol siyosati — ro'yxatdan o'tishda zaif parollarni rad etish.
 * Audit TC-A02 test-case'lari.
 */

import { describe, it, expect } from 'vitest';
import {
  validatePassword, calculatePasswordStrength,
  hasRepeatedChars, hasSequentialChars,
} from '../utils/passwordPolicy.js';

describe('validatePassword — rad etilishi kerak', () => {
  it('bo\'sh parol', () => {
    expect(validatePassword('')).toBeTruthy();
    expect(validatePassword(null)).toBeTruthy();
  });

  it('6 belgidan qisqa', () => {
    expect(validatePassword('abc12')).toContain('6 ta belgi');
  });

  it('qora ro\'yxatdagi parol', () => {
    expect(validatePassword('parol123')).toBeTruthy();
    expect(validatePassword('password')).toBeTruthy();
    expect(validatePassword('iqro2026')).toBeTruthy();
  });

  it('qora ro\'yxat REGISTRGA BOG\'LIQ EMAS', () => {
    // Audit TC-A02: "Parol123" bosh harf bilan ham rad etilishi kerak
    expect(validatePassword('Parol123')).toBeTruthy();
    expect(validatePassword('PASSWORD')).toBeTruthy();
  });

  it('takrorlanuvchi belgilar (aaaa, 1111)', () => {
    expect(validatePassword('aaaaaa')).toBeTruthy();
    expect(validatePassword('xy1111zz')).toBeTruthy();
  });

  it('ketma-ketlik (12345, qwerty, abcde)', () => {
    expect(validatePassword('12345x')).toBeTruthy();
    expect(validatePassword('qwertyx')).toBeTruthy();
    expect(validatePassword('xabcdey')).toBeTruthy();
  });
});

describe('validatePassword — qabul qilinishi kerak', () => {
  it('kuchli aralash parol', () => {
    expect(validatePassword('Men7oqit')).toBe(null);
    expect(validatePassword('T0ifa9Pro')).toBe(null);
  });

  it('aynan 6 belgi, ketma-ketlik/takrorsiz', () => {
    expect(validatePassword('a9k2m4')).toBe(null);
  });

  it('uzun parol', () => {
    expect(validatePassword('men2026yilAttestatsiya7')).toBe(null);
  });
});

describe('hasRepeatedChars', () => {
  it('4 va undan ko\'p takror aniqlanadi', () => {
    expect(hasRepeatedChars('aaaa')).toBe(true);
    expect(hasRepeatedChars('xx1111')).toBe(true);
  });
  it('3 takror o\'tadi', () => {
    expect(hasRepeatedChars('aaa123')).toBe(false);
  });
  it('bo\'sh satrda yiqilmaydi', () => {
    expect(hasRepeatedChars('')).toBe(false);
  });
});

describe('hasSequentialChars', () => {
  it('raqamli ketma-ketlik', () => {
    expect(hasSequentialChars('1234')).toBe(true);
    expect(hasSequentialChars('9876')).toBe(true);
  });
  it('klaviatura ketma-ketligi', () => {
    expect(hasSequentialChars('qwer')).toBe(true);
    expect(hasSequentialChars('asdf')).toBe(true);
  });
  it('tasodifiy satr o\'tadi', () => {
    expect(hasSequentialChars('a9k2m4')).toBe(false);
  });
});

describe('calculatePasswordStrength', () => {
  it('bo\'sh parol → score 0', () => {
    expect(calculatePasswordStrength('').score).toBe(0);
    expect(calculatePasswordStrength('').level).toBe('none');
  });

  it('kuchli parol → 80+', () => {
    const r = calculatePasswordStrength('T0ifa9Pro');
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.level).toBe('strong');
  });

  it('zaif parol ball 25 dan oshmaydi', () => {
    // Qora ro'yxat / ketma-ketlik / takror bo'lsa ball qisiladi
    expect(calculatePasswordStrength('12345678').score).toBeLessThanOrEqual(25);
    expect(calculatePasswordStrength('aaaaaaaa').score).toBeLessThanOrEqual(25);
  });

  it('score DOIM 0..100 oralig\'ida', () => {
    const inputs = ['', 'a', 'abc123', 'T0ifa9Pro', 'x'.repeat(200), 'ЖЖЖЖ9k'];
    for (const p of inputs) {
      const { score } = calculatePasswordStrength(p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
