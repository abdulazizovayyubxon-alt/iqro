import { describe, it, expect } from 'vitest';
import { calculateToifaResult, TOIFA_TIERS } from '../toifaAttestatsiya';
import { SUBJECTS, TOPICS } from '../../data/mockData';
import { getTheory } from '../../data/theory';

describe('toifaAttestatsiya — 100 ballik rasmiy attestatsiya hisoblagichi', () => {
  const build50Questions = ({ splitPed = true } = {}) => {
    const list = [];
    // 35 ta mutaxassislik (masalan, Matematika topicId 146)
    for (let i = 0; i < 35; i++) list.push({ id: `s_${i}`, topicId: 146, correct: 0 });
    if (splitPed) {
      // 5 ta kasb standarti (topicId 152) + 10 ta pedmahorat (topicId 153)
      for (let i = 0; i < 5; i++) list.push({ id: `k_${i}`, topicId: 152, correct: 0 });
      for (let i = 0; i < 10; i++) list.push({ id: `p_${i}`, topicId: 153, correct: 0 });
    } else {
      // Birlashgan 15 ta pedmahorat+kasb (masalan, CHQBT topicId 6)
      for (let i = 0; i < 15; i++) list.push({ id: `p_${i}`, topicId: 6, correct: 0 });
    }
    return list;
  };

  it('44/50 to\'g\'ri javob uchun 88 ball, Oliy toifa va 70% Vazir jamg\'armasi ustamasini qaytaradi', () => {
    const questions = build50Questions({ splitPed: true });
    const answers = {};
    // 31/35 mutaxassislik + 4/5 kasb standarti + 9/10 pedmahorat = 44/50 (88 ball)
    for (let i = 0; i < 31; i++) answers[i] = 0;
    for (let i = 35; i < 39; i++) answers[i] = 0;
    for (let i = 40; i < 49; i++) answers[i] = 0;

    const res = calculateToifaResult(questions, answers);
    expect(res.score100).toBe(88);
    expect(res.grade).toBe('Oliy toifa');
    expect(res.tierId).toBe('oliy');
    expect(res.vazirBonusEligible).toBe(true);
    expect(res.vazirBonusPct).toBe(70);
    expect(res.nextGrade).toBeNull();
    expect(res.pointsToNext).toBe(0);
    expect(res.blocks.hasSplitPedBlock).toBe(true);
    expect(res.blocks.specialty).toEqual({ correct: 31, total: 35, score: 62, maxScore: 70 });
    expect(res.blocks.standard).toEqual({ correct: 4, total: 5, score: 8, maxScore: 10 });
    expect(res.blocks.pedagogy).toEqual({ correct: 9, total: 10, score: 18, maxScore: 20 });
  });

  it('38/50 (76 ball) uchun Birinchi toifa va Oliy toifagacha +10 ball qaytaradi', () => {
    const questions = build50Questions({ splitPed: false });
    const answers = {};
    for (let i = 0; i < 38; i++) answers[i] = 0;

    const res = calculateToifaResult(questions, answers);
    expect(res.score100).toBe(76);
    expect(res.grade).toBe('Birinchi toifa');
    expect(res.vazirBonusEligible).toBe(false);
    expect(res.nextGrade).toBe('Oliy toifa');
    expect(res.pointsToNext).toBe(10);
    expect(res.blocks.hasSplitPedBlock).toBe(false);
  });

  it('30/50 (60 ball) uchun Ikkinchi toifa va Birinchi toifagacha +10 ball qaytaradi', () => {
    const questions = build50Questions();
    const answers = {};
    for (let i = 0; i < 30; i++) answers[i] = 0;

    const res = calculateToifaResult(questions, answers);
    expect(res.score100).toBe(60);
    expect(res.grade).toBe('Ikkinchi toifa');
    expect(res.nextGrade).toBe('Birinchi toifa');
    expect(res.pointsToNext).toBe(10);
  });

  it('25/50 (50 ball) uchun o\'tmagan holat va Ikkinchi toifagacha +6 ball qaytaradi', () => {
    const questions = build50Questions();
    const answers = {};
    for (let i = 0; i < 25; i++) answers[i] = 0;

    const res = calculateToifaResult(questions, answers);
    expect(res.score100).toBe(50);
    expect(res.grade).toBeNull();
    expect(res.nextGrade).toBe('Ikkinchi toifa');
    expect(res.pointsToNext).toBe(6);
  });

  it('TOIFA_TIERS rasmiy 86 / 70 / 56 chegaralariga ega', () => {
    expect(TOIFA_TIERS.map(t => t.minScore)).toEqual([86, 70, 56]);
  });

  it('barcha 30 ta fandagi har bir mavzu (254/254) boyitilgan nazariy konspektga ega (legacy === false)', async () => {
    expect(SUBJECTS.length).toBe(30);
    for (const topic of TOPICS) {
      const theory = await getTheory(topic.id);
      expect(theory.legacy, `Mavzu ${topic.id} (${topic.category}: ${topic.name}) konspekti yo'q`).toBe(false);
      expect(theory.keyPoints.length).toBeGreaterThanOrEqual(4);
      expect(theory.mustKnow.length).toBeGreaterThanOrEqual(2);
    }
  });
});
