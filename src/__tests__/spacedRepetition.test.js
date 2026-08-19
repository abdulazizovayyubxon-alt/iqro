import { describe, it, expect } from 'vitest';
import {
  calculateNextReview,
  clampReviewToExam,
  updateSpacedCard,
  pruneSpacedCards,
  summarizeTestResults,
  topicBreakdown,
  dueCardCount,
  isHeavyCard,
  questionKey,
  MAX_LEVEL,
  MAX_SPACED_CARDS,
  MAX_HEAVY_CARDS,
  TIMED_OUT,
  EXAM_REVIEW_MARGIN_MS,
} from '../engine/SmartQuestionEngine';

/**
 * AUDIT 2026-08-19, T-4 / T-5 / T-7 / T-10 BANDLARI.
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const noFuzz = { fuzz: false };

const mkQ = (text, extra = {}) => ({
  q: text,
  opts: ["A) To'g'ri", 'B) Xato', 'C) Xato', 'D) Xato'],
  correct: 0,
  topicId: 1,
  explanation: `${text} uchun ilmiy izoh`,
  ...extra,
});

describe('calculateNextReview — oraliqlar zinapoyasi (T-5)', () => {
  it('xato → 10 daqiqa (ayni sessiyada qayta ko\'rish)', () => {
    expect(calculateNextReview(0, 1, noFuzz)).toBe(10 * MIN);
  });

  it('1-daraja → 1 kun (ilgari 25 DAQIQA edi)', () => {
    expect(calculateNextReview(1, 1, noFuzz)).toBe(DAY);
  });

  it('eng yuqori daraja OYLAR bilan o\'lchanadi, kunlar bilan emas', () => {
    const top = calculateNextReview(MAX_LEVEL, 1, noFuzz);
    // Eski formula bu yerda 4.24 KUN berardi — SRS ni o'ldiruvchi chegara.
    expect(top).toBeGreaterThan(100 * DAY);
  });

  it('oraliqlar qat\'iy o\'suvchi', () => {
    const seq = Array.from({ length: MAX_LEVEL + 1 }, (_, l) => calculateNextReview(l, 1, noFuzz));
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThan(seq[i - 1]);
    }
  });

  it('qiyinlik oshsa oraliq qisqaradi', () => {
    expect(calculateNextReview(3, 5, noFuzz)).toBeLessThan(calculateNextReview(3, 1, noFuzz));
  });

  it('darajadan tashqari qiymatlar chegaralanadi', () => {
    expect(calculateNextReview(999, 1, noFuzz)).toBe(calculateNextReview(MAX_LEVEL, 1, noFuzz));
    expect(calculateNextReview(-5, 1, noFuzz)).toBe(calculateNextReview(0, 1, noFuzz));
  });

  it('fuzz ±10% ichida qoladi (bir kunda o\'rganilgan kartalar birga qaytmasin)', () => {
    const base = calculateNextReview(3, 1, noFuzz);
    for (let i = 0; i < 200; i++) {
      const v = calculateNextReview(3, 1);
      expect(v).toBeGreaterThanOrEqual(Math.floor(base * 0.9));
      expect(v).toBeLessThanOrEqual(Math.ceil(base * 1.1));
    }
  });

  it('fuzz haqiqatan tarqatadi (bir xil qiymat qaytarmaydi)', () => {
    const seen = new Set(Array.from({ length: 50 }, () => calculateNextReview(4, 1)));
    expect(seen.size).toBeGreaterThan(10);
  });
});

describe('clampReviewToExam — imtihon sanasiga siqish (T-5)', () => {
  const now = Date.now();

  it('imtihon sanasi yo\'q bo\'lsa tegmaydi', () => {
    const next = now + 150 * DAY;
    expect(clampReviewToExam(next, null, now)).toBe(next);
  });

  it('imtihondan keyingi takror imtihondan OLDINGA siqiladi', () => {
    const exam = now + 20 * DAY;
    const clamped = clampReviewToExam(now + 150 * DAY, exam, now);

    expect(clamped).toBe(exam - EXAM_REVIEW_MARGIN_MS);
    expect(clamped).toBeLessThan(exam);
  });

  it('imtihongacha ulguradigan takror o\'zgarmaydi', () => {
    const exam = now + 60 * DAY;
    const next = now + 7 * DAY;
    expect(clampReviewToExam(next, exam, now)).toBe(next);
  });

  it('imtihon JUDA YAQIN bo\'lsa siqilmaydi — aks holda hamma karta birdan «muddati kelgan» bo\'lardi', () => {
    const exam = now + DAY; // margin (3 kun) dan kam
    const next = now + 30 * DAY;
    expect(clampReviewToExam(next, exam, now)).toBe(next);
  });
});

describe('updateSpacedCard', () => {
  const now = Date.now();
  const base = { qHash: 'h1', level: 2, correctStreak: 1, difficulty: 1 };

  it('to\'g\'ri javob darajani oshiradi', () => {
    const out = updateSpacedCard(base, true, { now });
    expect(out.level).toBe(3);
    expect(out.lastResult).toBe('correct');
  });

  it('xato javob darajani 0 ga tushiradi va qiyinlikni oshiradi', () => {
    const out = updateSpacedCard(base, false, { now });
    expect(out.level).toBe(0);
    expect(out.difficulty).toBe(2);
    expect(out.nextReview).toBe(now + calculateNextReview(0, 2, noFuzz));
  });

  it('imtihon sanasi to\'g\'ri javobda hisobga olinadi', () => {
    const exam = now + 10 * DAY;
    const out = updateSpacedCard({ ...base, level: MAX_LEVEL - 1 }, true, { now, examAtMs: exam });
    expect(out.nextReview).toBeLessThanOrEqual(exam - EXAM_REVIEW_MARGIN_MS);
  });
});

describe('pruneSpacedCards — chegara oshganda NIMA o\'chadi (T-4)', () => {
  const now = Date.now();

  it('YETUK kartani o\'chiradi, yomon o\'zlashtirilganini SAQLAYDI', () => {
    // Eski mantiq `sort(lastReview).slice(-N)` edi: u aynan teskarisini qilardi.
    const mature = { qHash: 'mature', level: MAX_LEVEL, nextReview: now + 150 * DAY, lastReview: now - 100 * DAY };
    const struggling = { qHash: 'struggling', level: 0, nextReview: now + 10 * MIN, lastReview: now - 200 * DAY };

    const kept = pruneSpacedCards([mature, struggling], { limit: 1 });
    expect(kept).toHaveLength(1);
    expect(kept[0].qHash).toBe('struggling');
  });

  it('bir xil darajada muddati YAQINROG\'I saqlanadi', () => {
    const soon = { qHash: 'soon', level: 2, nextReview: now + HOUR };
    const later = { qHash: 'later', level: 2, nextReview: now + 30 * DAY };

    const kept = pruneSpacedCards([later, soon], { limit: 1 });
    expect(kept[0].qHash).toBe('soon');
  });

  it('og\'ir kartalar chegarasidan oshgani O\'CHIRILMAYDI, YENGILLASHADI', () => {
    const heavy = Array.from({ length: 5 }, (_, i) => ({
      qHash: `h${i}`, q: `Savol ${i}?`, opts: ['A', 'B'], correct: 0,
      level: i, nextReview: now + i * DAY,
    }));

    const kept = pruneSpacedCards(heavy, { limit: 10, heavyLimit: 2 });

    expect(kept).toHaveLength(5);              // hech biri yo'qolmadi
    expect(kept.filter(isHeavyCard)).toHaveLength(2);
    // Yengillashgan kartada ham SRS jadvali saqlanadi
    const light = kept.find(c => !isHeavyCard(c));
    expect(light.nextReview).toBeDefined();
    expect(light.level).toBeDefined();
  });

  it('tana faqat eng KERAKSIZ kartalardan olinadi', () => {
    const cards = [
      { qHash: 'weak', q: 'Zaif?', level: 0, nextReview: now },
      { qHash: 'strong', q: 'Kuchli?', level: MAX_LEVEL, nextReview: now + 150 * DAY },
    ];
    const kept = pruneSpacedCards(cards, { limit: 10, heavyLimit: 1 });
    expect(kept.find(c => c.qHash === 'weak').q).toBeDefined();
    expect(kept.find(c => c.qHash === 'strong').q).toBeUndefined();
  });

  it('chegaralar oqilona (bir kunlik mashq tarixni yuvmaydi)', () => {
    // 50 savollik 4 blok = 200 — eski chegara aynan shu edi.
    expect(MAX_SPACED_CARDS).toBeGreaterThan(200 * 3);
    expect(MAX_HEAVY_CARDS).toBeLessThan(MAX_SPACED_CARDS);
  });
});

describe('summarizeTestResults — karta og\'irligi (T-4)', () => {
  it('TO\'G\'RI javob YENGIL karta yaratadi (tanasiz)', () => {
    const res = summarizeTestResults([mkQ('Savol A?')], { 0: 0 }, [], 1, {});
    expect(res.updatedSpacedCards).toHaveLength(1);
    expect(isHeavyCard(res.updatedSpacedCards[0])).toBe(false);
    expect(res.updatedSpacedCards[0].nextReview).toBeDefined();
  });

  it('XATO javob OG\'IR karta yaratadi (SmartReviewPage uni ko\'rsatadi)', () => {
    const res = summarizeTestResults([mkQ('Savol B?')], { 0: 1 }, [], 1, {});
    const card = res.updatedSpacedCards[0];
    expect(isHeavyCard(card)).toBe(true);
    expect(card.opts).toHaveLength(4);
    expect(card.explanation).toBeDefined();
  });

  it('avval to\'g\'ri javob berilgan savol XATO qilinsa karta OG\'IRLASHADI', () => {
    const first = summarizeTestResults([mkQ('Savol C?')], { 0: 0 }, [], 1, {});
    expect(isHeavyCard(first.updatedSpacedCards[0])).toBe(false);

    const second = summarizeTestResults([mkQ('Savol C?')], { 0: 2 }, first.updatedSpacedCards, 1, {});
    const card = second.updatedSpacedCards[0];
    expect(isHeavyCard(card)).toBe(true);
    expect(card.level).toBe(0);
  });
});

describe('summarizeTestResults — xato yozuvi (T-2, T-3)', () => {
  it('ILMIY IZOH xato yozuviga tushadi', () => {
    const res = summarizeTestResults([mkQ('Savol D?')], { 0: 1 }, [], 1, {});
    expect(res.newMistakes[0].explanation).toBe('Savol D? uchun ilmiy izoh');
  });

  it('xato yozuvida qHash bor (navbat matn emas, kalit bo\'yicha ishlaydi)', () => {
    const res = summarizeTestResults([mkQ('Savol E?')], { 0: 1 }, [], 1, {});
    expect(res.newMistakes[0].qHash).toBe(questionKey({ q: 'Savol E?' }));
  });

  it('tanlangan variant ham saqlanadi (savol sifatini tahlil qilish uchun)', () => {
    const res = summarizeTestResults([mkQ('Savol F?')], { 0: 2 }, [], 1, {});
    expect(res.newMistakes[0].picked).toBe(2);
  });

  it('to\'g\'ri javoblarning kalitlari qaytariladi (xatoni yopish uchun)', () => {
    const qs = [mkQ('Q1?'), mkQ('Q2?')];
    const res = summarizeTestResults(qs, { 0: 0, 1: 1 }, [], 1, {});
    expect(res.correctedHashes).toEqual([questionKey({ q: 'Q1?' })]);
  });
});

describe('summarizeTestResults — vaqt tugashi statistikani buzmaydi (T-10)', () => {
  const qs = [mkQ('Q1?'), mkQ('Q2?'), mkQ('Q3?')];

  it('TIMED_OUT xato deb sanalmaydi', () => {
    const res = summarizeTestResults(qs, { 0: 0, 1: TIMED_OUT, 2: 0 }, [], 1, {});
    expect(res.correctCount).toBe(2);
    expect(res.wrongCount).toBe(0);
    expect(res.totalAnswered).toBe(2);
  });

  it('TIMED_OUT xatolar ro\'yxatiga TUSHMAYDI', () => {
    const res = summarizeTestResults(qs, { 1: TIMED_OUT }, [], 1, {});
    expect(res.newMistakes).toHaveLength(0);
  });

  it('TIMED_OUT takrorlash kartasi yaratmaydi', () => {
    const res = summarizeTestResults(qs, { 1: TIMED_OUT }, [], 1, {});
    expect(res.updatedSpacedCards).toHaveLength(0);
  });

  it('TIMED_OUT bo\'lim statistikasiga ta\'sir qilmaydi', () => {
    const res = summarizeTestResults(qs, { 0: 0, 1: TIMED_OUT }, [], 1, {});
    expect(res.topicDeltas[1]).toEqual(expect.objectContaining({ answered: 1, correct: 1 }));
  });

  it('TIMED_OUT savol sifati jurnaliga tushmaydi', () => {
    const withIds = [mkQ('Q1?', { id: 'a' }), mkQ('Q2?', { id: 'b' })];
    const res = summarizeTestResults(withIds, { 0: 0, 1: TIMED_OUT }, [], 1, {});
    expect(res.answerLog).toHaveLength(1);
    expect(res.answerLog[0].qid).toBe('a');
  });
});

describe('topicBreakdown — bo\'limlar kesimi (T-7)', () => {
  const TOPICS_STUB = [
    { id: 1, name: 'Didaktika', icon: '📘' },
    { id: 2, name: 'Tarbiya', icon: '📗' },
  ];

  const build = (rows) => rows.flatMap(([topicId, total, correct]) =>
    Array.from({ length: total }, (_, i) => mkQ(`T${topicId}-Q${i}?`, { topicId, __ok: i < correct }))
  );
  const answersFor = (qs) => Object.fromEntries(qs.map((q, i) => [i, q.__ok ? q.correct : q.correct + 1]));

  it('har bo\'lim uchun kasr va foiz beradi', () => {
    const qs = build([[1, 9, 3], [2, 8, 6]]);
    const rows = topicBreakdown(qs, answersFor(qs), TOPICS_STUB);

    const didaktika = rows.find(r => r.topicId === 1);
    expect(didaktika).toMatchObject({ name: 'Didaktika', correct: 3, answered: 9, accuracy: 33, enough: true });
  });

  it('eng zaif bo\'lim TEPADA', () => {
    const qs = build([[1, 9, 3], [2, 8, 6]]);
    const rows = topicBreakdown(qs, answersFor(qs), TOPICS_STUB);
    expect(rows[0].topicId).toBe(1);
  });

  it('KICHIK NAMUNADAN foiz chiqarilmaydi', () => {
    const qs = build([[1, 2, 1]]);
    const rows = topicBreakdown(qs, answersFor(qs), TOPICS_STUB);
    expect(rows[0].enough).toBe(false);
  });

  it('ma\'lumoti yetarli bo\'lmagan bo\'lim oxirda turadi (harakat asosi bo\'la olmaydi)', () => {
    const qs = build([[1, 2, 0], [2, 8, 6]]);
    const rows = topicBreakdown(qs, answersFor(qs), TOPICS_STUB);
    expect(rows[0].topicId).toBe(2);
    expect(rows[1].enough).toBe(false);
  });

  it('vaqt tugagan savol foizni buzmaydi', () => {
    const qs = build([[1, 6, 6]]);
    const answers = { ...answersFor(qs), 5: TIMED_OUT };
    const rows = topicBreakdown(qs, answers, TOPICS_STUB);

    expect(rows[0].total).toBe(6);
    expect(rows[0].answered).toBe(5);
    expect(rows[0].accuracy).toBe(100);
  });

  it('bo\'limsiz savollar (topicId < 0) hisobga olinmaydi', () => {
    const qs = [mkQ('X?', { topicId: -1 })];
    expect(topicBreakdown(qs, { 0: 0 }, TOPICS_STUB)).toHaveLength(0);
  });
});

describe('dueCardCount — yagona manba', () => {
  const now = Date.now();

  it('yengil kartalar hisobga olinmaydi (nishoncha va navbat mos kelishi shart)', () => {
    const cards = [
      { qHash: 'a', q: 'Ko\'rsatiladi?', nextReview: now - 1000 },
      { qHash: 'b', nextReview: now - 1000 }, // yengil — SmartReviewPage uni ko'rsata olmaydi
    ];
    expect(dueCardCount(cards, now)).toBe(1);
  });

  it('muddati kelmagan karta sanalmaydi', () => {
    expect(dueCardCount([{ qHash: 'a', q: 'X?', nextReview: now + DAY }], now)).toBe(0);
  });
});

describe('questionKey — kanonik shakl (T-2/T-3 bog\'lanishi)', () => {
  const clean = 'Konjunktiv II nima?';
  const withCode = 'Konjunktiv II nima? (Savol kodi: #ab12)';

  it('«Savol kodi» qo\'shimchasi kalitga TA\'SIR QILMAYDI', () => {
    // TestPage xatolar mashqida bu qo'shimchani olib tashlaydi. Normallashtirishsiz
    // to'g'ri javob o'z xato yozuvi bilan mos kelmasdi va xato yopilmasdi.
    expect(questionKey({ q: withCode })).toBe(questionKey({ q: clean }));
  });

  it('ortiqcha bo\'shliqlar kalitni o\'zgartirmaydi', () => {
    expect(questionKey({ q: '  Konjunktiv   II  nima?  ' })).toBe(questionKey({ q: clean }));
  });

  it('turli savollar baribir turli kalit oladi', () => {
    expect(questionKey({ q: clean })).not.toBe(questionKey({ q: 'Konjunktiv I nima?' }));
  });
});
