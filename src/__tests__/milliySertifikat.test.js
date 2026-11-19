import { describe, it, expect } from 'vitest';
import {
  MILLIY_CERT_TOTAL,
  MILLIY_CERT_DURATION_MIN,
  supportsMilliyCert,
  getMilliyCertSpec,
  salaryBonusForCert,
  milliyCertBlueprintForTopics,
  orderAndBalanceMilliyCert,
  calculateMilliyCertResult,
  normalizeDifficulty,
} from '../utils/milliySertifikat';

describe('Milliy Sertifikat Simulyatori (Rasmiy UzBMB 2025/2026 Spetsifikatsiyasi va 1PL Rasch)', () => {
  it('supportsMilliyCert faqat rasmiy UzBMB fanlari uchun ochiq, MTT/pedmahorat va no-UzBMB fanlar uchun yopiq', () => {
    // Rasmiy UzBMB Milliy Sertifikat fanlari
    for (const s of ['matematika', 'fizika', 'kimyo', 'biologiya', 'til', 'rus_tili', 'tarix', 'geografiya', 'huquq', 'ingliz', 'boshlangich', 'musiqa', 'sport']) {
      expect(supportsMilliyCert(s), `${s} ochiq bo'lishi kerak`).toBe(true);
    }
    // UzBMB Milliy Sertifikati bo'lmagan fanlar
    for (const s of ['pedmahorat', 'mtt', 'mtt_rahbar', 'mtt_logoped', 'mtt_psixolog', 'mtt_jismoniy', 'mtt_musiqa', 'chqbt', 'art', 'info', 'tarbiya', 'texnologiya_dizayn', 'texnologiya_servis', 'iqtisod', '']) {
      expect(supportsMilliyCert(s), `${s} yopiq bo'lishi kerak`).toBe(false);
    }
  });

  it('getMilliyCertSpec fanbo\'yicha rasmiy UzBMB davomiyligini qaytaradi (90/120/150/180 daqiqa)', () => {
    expect(getMilliyCertSpec('tarix').durationMin).toBe(90);
    expect(getMilliyCertSpec('kimyo').durationMin).toBe(180);
    expect(getMilliyCertSpec('biologiya').durationMin).toBe(180);
    expect(getMilliyCertSpec('til').durationMin).toBe(180);
    expect(getMilliyCertSpec('til').hasEssay).toBe(true);
    expect(getMilliyCertSpec('rus_tili').durationMin).toBe(180);
    expect(getMilliyCertSpec('matematika').durationMin).toBe(150);
    expect(getMilliyCertSpec('fizika').durationMin).toBe(150);
    expect(getMilliyCertSpec('geografiya').durationMin).toBe(150);
    expect(getMilliyCertSpec('huquq').durationMin).toBe(150);
    expect(getMilliyCertSpec('sport').durationMin).toBe(120);
    expect(getMilliyCertSpec('musiqa').durationMin).toBe(120);
  });

  it('salaryBonusForCert qonunchilikka (PF-37, PF-134, VM 411) aniq mos keladi', () => {
    // Ona tili va Tarix: B+ va yuqori = 50% (PF-37)
    expect(salaryBonusForCert('til', 'A+')).toBe(50);
    expect(salaryBonusForCert('til', 'B+')).toBe(50);
    expect(salaryBonusForCert('tarix', 'B+')).toBe(50);
    // B, C+, C darajalarga umumiy fan o'qituvchisi uchun ustama yo'q (0%)
    expect(salaryBonusForCert('til', 'B')).toBe(0);
    expect(salaryBonusForCert('til', 'C+')).toBe(0);
    expect(salaryBonusForCert('til', 'C')).toBe(0);

    // Aniq va tabiiy fanlar: B+ va yuqori = 20% (PF-134 / VM 646)
    expect(salaryBonusForCert('matematika', 'A+')).toBe(20);
    expect(salaryBonusForCert('fizika', 'B+')).toBe(20);
    expect(salaryBonusForCert('kimyo', 'A')).toBe(20);
    expect(salaryBonusForCert('huquq', 'B+')).toBe(20);
    expect(salaryBonusForCert('matematika', 'B')).toBe(0);

    // Boshlang'ich ta'lim (VM 411): B+ va yuqori = 15%
    expect(salaryBonusForCert('boshlangich', 'B+')).toBe(15);
    expect(salaryBonusForCert('boshlangich', 'A+')).toBe(15);
    expect(salaryBonusForCert('boshlangich', 'C+')).toBe(0);

    // Ingliz tili (CEFR/Multilevel): A/A+ (C1) = 50%, B+ (B2) = 20%
    expect(salaryBonusForCert('ingliz', 'A+')).toBe(50);
    expect(salaryBonusForCert('ingliz', 'A')).toBe(50);
    expect(salaryBonusForCert('ingliz', 'B+')).toBe(20);
    expect(salaryBonusForCert('ingliz', 'B')).toBe(0);
  });

  it('milliyCertBlueprintForTopics pedagogik blokni chiqarib, aniq 45 ta savolga proporsiyalaydi', () => {
    const mathTopicIds = [146, 147, 148, 149, 150, 151, 152, 153];
    const bp = milliyCertBlueprintForTopics(mathTopicIds);
    expect(bp).not.toBeNull();
    expect(bp[152]).toBeUndefined();
    expect(bp[153]).toBeUndefined();

    const total = Object.values(bp).reduce((a, b) => a + b, 0);
    expect(total).toBe(MILLIY_CERT_TOTAL);
    expect(MILLIY_CERT_DURATION_MIN).toBe(150);
  });

  it('orderAndBalanceMilliyCert bir xil qiyinlikdagi bankni (mas. rus_tili) 12 Y1 -> 23 Y2 -> 10 Y3 tartibiga keltiradi', () => {
    const uniformHard = Array.from({ length: 45 }, (_, i) => ({
      id: `ru_${i}`,
      q: `Savol matni ${'a'.repeat(i * 4)}`,
      opts: ['A', 'B', 'C', 'D'],
      correct: 0,
      difficulty: 'hard',
      explanation: 'Izoh '.repeat(i + 1),
    }));

    const ordered = orderAndBalanceMilliyCert(uniformHard);
    expect(ordered.length).toBe(45);
    // Progressiv tartib: 0..11 = Y1, 12..34 = Y2, 35..44 = Y3
    expect(ordered.slice(0, 12).every(q => q.difficulty === 'Y1')).toBe(true);
    expect(ordered.slice(12, 35).every(q => q.difficulty === 'Y2')).toBe(true);
    expect(ordered.slice(35, 45).every(q => q.difficulty === 'Y3')).toBe(true);
  });

  it('calculateMilliyCertResult 100% natijada 75.0 ball, A+ daraja va fanga mos ustama beradi', () => {
    const questions = Array.from({ length: 45 }, (_, i) => ({
      correct: 0,
      difficulty: i < 12 ? 'Y1' : i < 35 ? 'Y2' : 'Y3',
    }));
    const answers = Object.fromEntries(questions.map((_, i) => [i, 0]));

    const resTil = calculateMilliyCertResult(questions, answers, 'til');
    expect(resTil.raschScore).toBe(75);
    expect(resTil.grade).toBe('A+');
    expect(resTil.salaryBonusPct).toBe(50);
    expect(resTil.dtmPct).toBe(100);
    expect(resTil.validYears).toBe(3);
    expect(resTil.nextGrade).toBeNull();

    const resMath = calculateMilliyCertResult(questions, answers, 'matematika');
    expect(resMath.salaryBonusPct).toBe(20);
    expect(resMath.dtmPct).toBe(100);
  });

  it('VM 646 proporsional OTM foizi: B+/B/C+/C da raschScore / 65 × 100% hisoblanadi', () => {
    const questions = Array.from({ length: 45 }, (_, i) => ({
      correct: 0,
      difficulty: i < 12 ? 'Y1' : i < 35 ? 'Y2' : 'Y3',
    }));
    // ~72% to'g'ri javob -> B/B+ oralig'i (46.0..64.9)
    const answers = {};
    for (let i = 0; i < 33; i++) answers[i] = 0;
    const res = calculateMilliyCertResult(questions, answers, 'matematika');
    expect(res.raschScore).toBeGreaterThanOrEqual(46);
    expect(res.raschScore).toBeLessThan(65);
    expect(res.dtmPct).toBe(Math.round((res.raschScore / 65) * 1000) / 10);
  });

  it('calculateMilliyCertResult qiyin (Y3) savollarga oson (Y1) savollardan ko\'proq 1PL Rash balli va logit beradi', () => {
    const questions = [
      { correct: 0, difficulty: 'Y1' },
      { correct: 0, difficulty: 'Y3' },
    ];
    const onlyY1 = calculateMilliyCertResult(questions, { 0: 0, 1: 1 });
    const onlyY3 = calculateMilliyCertResult(questions, { 0: 1, 1: 0 });

    expect(onlyY3.raschScore).toBeGreaterThan(onlyY1.raschScore);
    expect(onlyY3.theta).toBeGreaterThan(onlyY1.theta);
  });

  it('normalizeDifficulty va calculateMilliyCertResult easy/medium/hard/advanced qiyinliklarini Y1/Y2/Y3 ga to\'g\'ri o\'tkazadi', () => {
    expect(normalizeDifficulty('easy')).toBe('Y1');
    expect(normalizeDifficulty('medium')).toBe('Y2');
    expect(normalizeDifficulty('hard')).toBe('Y3');
    expect(normalizeDifficulty('advanced')).toBe('Y3');
    expect(normalizeDifficulty(undefined, 0)).toBe('Y1');
    expect(normalizeDifficulty(undefined, 50)).toBe('Y2');
    expect(normalizeDifficulty(undefined, 90)).toBe('Y3');

    const fan5Questions = [
      { correct: 0, difficulty: 'easy' },
      { correct: 0, difficulty: 'medium' },
      { correct: 0, difficulty: 'hard' },
    ];
    const res = calculateMilliyCertResult(fan5Questions, { 0: 0, 1: 0, 2: 0 }, 'huquq');
    expect(res.breakdown.Y1.total).toBe(1);
    expect(res.breakdown.Y2.total).toBe(1);
    expect(res.breakdown.Y3.total).toBe(1);
    expect(res.raschScore).toBe(75);
    expect(res.salaryBonusPct).toBe(20);
  });
});
