import { describe, it, expect } from 'vitest';
import {
  MILLIY_CERT_TOTAL,
  MILLIY_CERT_DURATION_MIN,
  supportsMilliyCert,
  milliyCertBlueprintForTopics,
  calculateMilliyCertResult,
} from '../utils/milliySertifikat';

describe('Milliy Sertifikat Simulyatori (Rasch Modeli va Blueprint)', () => {
  it('supportsMilliyCert umumta\'lim maktab fanlari uchun ochiq, MTT va pedmahorat uchun yopiq', () => {
    expect(supportsMilliyCert('matematika')).toBe(true);
    expect(supportsMilliyCert('til')).toBe(true);
    expect(supportsMilliyCert('tarix')).toBe(true);
    expect(supportsMilliyCert('pedmahorat')).toBe(false);
    expect(supportsMilliyCert('mtt')).toBe(false);
    expect(supportsMilliyCert('mtt_rahbar')).toBe(false);
    expect(supportsMilliyCert('mtt_logoped')).toBe(false);
    expect(supportsMilliyCert('mtt_psixolog')).toBe(false);
    expect(supportsMilliyCert('mtt_jismoniy')).toBe(false);
    expect(supportsMilliyCert('')).toBe(false);
  });

  it('milliyCertBlueprintForTopics pedagogik blokni chiqarib, aniq 45 ta savolga proporsiyalaydi', () => {
    // Matematika topic IDs: 146..151 (mutaxassislik), 152, 153 (kasb standarti + pedmahorat)
    const mathTopicIds = [146, 147, 148, 149, 150, 151, 152, 153];
    const bp = milliyCertBlueprintForTopics(mathTopicIds);
    expect(bp).not.toBeNull();
    expect(bp[152]).toBeUndefined();
    expect(bp[153]).toBeUndefined();

    const total = Object.values(bp).reduce((a, b) => a + b, 0);
    expect(total).toBe(MILLIY_CERT_TOTAL);
    expect(MILLIY_CERT_DURATION_MIN).toBe(150);
  });

  it('calculateMilliyCertResult 100% natijada 75.0 ball va A+ daraja beradi', () => {
    const questions = Array.from({ length: 45 }, (_, i) => ({
      correct: 0,
      difficulty: i < 12 ? 'Y1' : i < 35 ? 'Y2' : 'Y3',
    }));
    const answers = Object.fromEntries(questions.map((_, i) => [i, 0]));

    const res = calculateMilliyCertResult(questions, answers);
    expect(res.raschScore).toBe(75);
    expect(res.grade).toBe('A+');
    expect(res.salaryBonusPct).toBe(50);
    expect(res.dtmPct).toBe(100);
    expect(res.nextGrade).toBeNull();
  });

  it('calculateMilliyCertResult qiyin (Y3) savollarga oson (Y1) savollardan ko\'proq Rash vazni beradi', () => {
    const questions = [
      { correct: 0, difficulty: 'Y1' },
      { correct: 0, difficulty: 'Y3' },
    ];
    const onlyY1 = calculateMilliyCertResult(questions, { 0: 0, 1: 1 });
    const onlyY3 = calculateMilliyCertResult(questions, { 0: 1, 1: 0 });

    expect(onlyY3.raschScore).toBeGreaterThan(onlyY1.raschScore);
  });
});
