import { describe, it, expect } from 'vitest';
import {
  questionKey,
  legacyQHash,
  summarizeTestResults,
  MAX_SPACED_CARDS,
} from '../engine/SmartQuestionEngine';

/**
 * AUDIT 2026-08-06, T-7 BAND — takrorlash kartochkasining identifikatori.
 *
 * Ilgari identifikator savol matnining birinchi 100 belgisi edi. Haqiqiy bazada
 * o'lchandi: 44 944 savoldan 891 tasi (1.98%) boshqa savol bilan bir xil 100
 * belgilik boshlanishga ega — ya'ni A savoliga javob berish B ni "takrorlandi"
 * deb belgilardi.
 *
 * Bu testlar ikki narsani qo'riqlaydi:
 *   1. uzun umumiy boshlanishli savollar TURLI kalit oladi;
 *   2. eski (100 belgilik) kalitli kartalar migratsiyasiz topiladi.
 */

// 100 belgidan uzun, bir xil boshlanadigan, lekin OXIRI farq qiladigan ikki savol
// 122 belgi — 100 belgilik kesishdan UZUN bo'lishi shart, aks holda test
// tekshirmoqchi bo'lgan to'qnashuv umuman yuz bermaydi.
const PREFIX = 'Quyidagi keltirilgan javob variantlaridan qaysi biri zamonaviy pedagogik faoliyatning asosiy tamoyillariga va talablariga ';
const Q_A = `${PREFIX}to'liq mos keladi?`;
const Q_B = `${PREFIX}umuman mos kelmaydi?`;

describe('questionKey — savol identifikatori', () => {
  it('eski usul bu ikki savolni AJRATA OLMAYDI (regressiyaning o\'zi)', () => {
    expect(PREFIX.length).toBeGreaterThan(100);
    expect(legacyQHash({ q: Q_A })).toBe(legacyQHash({ q: Q_B }));
  });

  it('yangi kalit ularni ajratadi', () => {
    expect(questionKey({ q: Q_A })).not.toBe(questionKey({ q: Q_B }));
  });

  it('bir xil matn doim bir xil kalit beradi (barqaror)', () => {
    expect(questionKey({ q: Q_A })).toBe(questionKey({ q: Q_A }));
  });

  it('bo\'sh/yo\'q matnda ham yiqilmaydi', () => {
    expect(typeof questionKey({})).toBe('string');
    expect(typeof questionKey(null)).toBe('string');
    expect(questionKey({ q: '' })).toBe(questionKey(undefined));
  });

  it('atrofdagi bo\'shliq kalitga ta\'sir qilmaydi', () => {
    expect(questionKey({ q: `  ${Q_A}  ` })).toBe(questionKey({ q: Q_A }));
  });
});

describe('summarizeTestResults — kalit bo\'yicha xatti-harakat', () => {
  const mkQ = (text) => ({ q: text, opts: ['a', 'b', 'c', 'd'], correct: 0, topicId: 1 });

  it('to\'qnashadigan ikki savol ALOHIDA kartochka oladi', () => {
    const questions = [mkQ(Q_A), mkQ(Q_B)];
    const res = summarizeTestResults(questions, { 0: 0, 1: 0 }, [], 1, {});

    expect(res.correctCount).toBe(2);
    expect(res.updatedSpacedCards).toHaveLength(2);
    const keys = res.updatedSpacedCards.map(c => c.qHash);
    expect(new Set(keys).size).toBe(2);
  });

  it('ESKI kalitli mavjud kartochka topiladi va yangi kalitga ko\'chadi', () => {
    const legacyCard = {
      q: Q_A,
      qHash: legacyQHash({ q: Q_A }), // eski format
      opts: ['a', 'b', 'c', 'd'],
      correct: 0,
      topicId: 1,
      level: 3,
      correctStreak: 2,
      difficulty: 1,
      lastReview: Date.now() - 86400000,
      nextReview: Date.now() - 1000, // vaqti kelgan
      lastResult: 'correct',
    };

    const res = summarizeTestResults([mkQ(Q_A)], { 0: 0 }, [legacyCard], 1, {});

    // Yangi kartochka YARATILMAYDI — mavjudi topilib yangilanadi
    expect(res.updatedSpacedCards).toHaveLength(1);
    expect(res.newCorrectCount).toBe(0);
    // Vaqti kelgan takror sifatida sanaladi (ball mantiqi buzilmaydi)
    expect(res.dueReviewCorrectCount).toBe(1);
    // Daraja saqlanib, oshgan — progress yo'qolmagan
    expect(res.updatedSpacedCards[0].level).toBe(4);
    // Kalit yangi formatga ko'chgan
    expect(res.updatedSpacedCards[0].qHash).toBe(questionKey({ q: Q_A }));
  });

  it('kartochkalar soni chegaradan oshmaydi', () => {
    const many = Array.from({ length: MAX_SPACED_CARDS + 25 }, (_, i) => mkQ(`Savol raqami ${i}?`));
    const answers = Object.fromEntries(many.map((_, i) => [i, 0]));
    const res = summarizeTestResults(many, answers, [], 1, {});
    expect(res.updatedSpacedCards).toHaveLength(MAX_SPACED_CARDS);
  });
});
