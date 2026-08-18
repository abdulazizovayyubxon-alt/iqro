import { describe, it, expect } from 'vitest';
import { diagnoseQuestion, SUSP_MIN_SHOWN } from '../utils/questionDiagnosis';

/**
 * ADMIN UX AUDIT 2026-08-18, A-1 BAND — «Shubhali savollar» diagnozi.
 *
 * Bu mantiq panelning eng «aqlli» qismi: u xato foizini DIAGNOZGA aylantiradi.
 * Farqi muhim — yuqori xato foizi o'z-o'zidan nuqson emas (savol qiyin ham
 * bo'lishi mumkin). Metodist ro'yxatga ishonishi uchun diagnoz to'g'ri
 * bo'lishi shart: soxta «kalit noto'g'ri» xulosasi uni to'g'ri savolni
 * "tuzatishga" majbur qilardi.
 */

const q4 = (correct) => ({ opts: ['A', 'B', 'C', 'D'], correct });

describe('diagnoseQuestion', () => {
  it('kalit shubhali — ko\'pchilik bitta NOTO\'G\'RI variantda to\'plangan', () => {
    // 68% B ni tanlagan, "to'g'ri" esa C
    const row = { shown: 100, picks: { 0: 10, 1: 68, 2: 15, 3: 7 } };
    const d = diagnoseQuestion(row, q4(2));

    expect(d.kind).toBe('key');
    expect(d.text).toContain('68%');
    expect(d.text).toContain('B');
  });

  it("ko'pchilik TO'G'RI javobda bo'lsa — kalit shubhali EMAS", () => {
    const row = { shown: 100, picks: { 0: 5, 1: 20, 2: 70, 3: 5 } };
    const d = diagnoseQuestion(row, q4(2));

    expect(d.kind).not.toBe('key');
  });

  it('ikki xil tushuniladi — ikkita variant deyarli teng', () => {
    // A 38%, D 33% — farq 5 punkt, ikkalasi ham 25% dan yuqori
    const row = { shown: 100, picks: { 0: 38, 1: 15, 2: 14, 3: 33 } };
    const d = diagnoseQuestion(row, q4(0));

    expect(d.kind).toBe('ambiguous');
  });

  it("o'lik distraktor — variantni deyarli hech kim tanlamagan", () => {
    // D ni 0%, C ni 1% tanlagan; javoblar A/B orasida, A to'g'ri
    const row = { shown: 200, picks: { 0: 120, 1: 78, 2: 2, 3: 0 } };
    const d = diagnoseQuestion(row, q4(0));

    expect(d.kind).toBe('dead');
    expect(d.text).toContain('D');
  });

  it("o'lik distraktor kam namunada E'LON QILINMAYDI (tasodif bo'lishi mumkin)", () => {
    // Bir xil naqsh, lekin atigi 40 ta ko'rsatish (50 dan kam)
    const row = { shown: 40, picks: { 0: 24, 1: 16, 2: 0, 3: 0 } };
    const d = diagnoseQuestion(row, q4(0));

    expect(d.kind).not.toBe('dead');
  });

  it('sochilgan javoblar — «shunchaki qiyin» deb belgilanadi', () => {
    const row = { shown: 100, picks: { 0: 30, 1: 24, 2: 24, 3: 22 } };
    const d = diagnoseQuestion(row, q4(0));

    expect(d.kind).toBe('hard');
  });

  it("chegaradan kam ko'rsatilgan savolga diagnoz QO'YILMAYDI", () => {
    // 3 tadan 3 tasi xato = 100%, lekin bu hech narsani anglatmaydi
    const row = { shown: SUSP_MIN_SHOWN - 1, picks: { 1: 29 } };
    expect(diagnoseQuestion(row, q4(2))).toBeNull();
  });

  it("savol o'chirilgan bo'lsa yiqilmaydi", () => {
    const row = { shown: 100, picks: { 1: 90 } };
    expect(diagnoseQuestion(row, null)).toBeNull();
    expect(diagnoseQuestion(row, { opts: [] })).toBeNull();
  });

  it('statistikasi yo\'q savolda yiqilmaydi', () => {
    expect(diagnoseQuestion({ shown: 100 }, q4(0))).toBeTruthy();
    expect(diagnoseQuestion(null, q4(0))).toBeNull();
  });
});
