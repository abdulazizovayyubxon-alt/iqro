import { describe, it, expect } from 'vitest';
import {
  mistakeKey,
  mergeMistakes,
  pruneMistakes,
  buildMistakeDrill,
  activeMistakes,
  retiredMistakes,
  leechMistakes,
  shuffle,
  RETIRE_STREAK,
  RETIRE_MIN_AGE_MS,
  LEECH_THRESHOLD,
} from '../engine/mistakeQueue';
import { questionKey } from '../engine/SmartQuestionEngine';

/**
 * AUDIT 2026-08-19, T-3 va T-6 BANDLARI.
 *
 * Bu testlar aynan o'lchangan nosozlikni qo'riqlaydi: 60% aniqlikdagi
 * foydalanuvchi har 50 savollik blokda ~20 xato qiladi, ya'ni eski 50 lik
 * FIFO ro'yxat 2.5 blokdan keyin to'lardi va ENG ESKI (eng uzoq
 * o'zlashtirilmagan) xatoni jimgina o'chirardi.
 */

const DAY = 24 * 60 * 60 * 1000;
const mk = (text, extra = {}) => ({
  question: text,
  correct: "A) To'g'ri",
  opts: ["A) To'g'ri", 'B) Xato', 'C) Xato', 'D) Xato'],
  topic: 'Didaktika',
  topicId: 1,
  qHash: questionKey({ q: text }),
  ...extra,
});

describe('mistakeKey — kalit', () => {
  it('qHash bor bo\'lsa uni ishlatadi', () => {
    expect(mistakeKey({ qHash: 'hABC', question: 'boshqa' })).toBe('hABC');
  });

  it('qHash yo\'q ESKI yozuvni matndan tanib oladi — migratsiya kerak emas', () => {
    const text = 'Pedagogik texnologiya nima?';
    expect(mistakeKey({ question: text })).toBe(questionKey({ q: text }));
  });

  it('bo\'sh yozuvda yiqilmaydi', () => {
    expect(mistakeKey(null)).toBe('');
    expect(mistakeKey({})).toBe('');
  });
});

describe('mergeMistakes — dedup', () => {
  it('AYNI savolni ikki marta xato qilish IKKITA yozuv yaratmaydi (asosiy regressiya)', () => {
    const q = mk('Savol A?');
    let list = mergeMistakes([], [q], []);
    list = mergeMistakes(list, [q], []);

    expect(list).toHaveLength(1);
    expect(list[0].wrongCount).toBe(2);
  });

  it('eski (qHash siz) yozuv yangi (qHash li) yozuv bilan birlashadi', () => {
    const text = 'Savol B?';
    const legacy = { question: text, correct: 'A) X', opts: ['A) X'], topic: 'T', topicId: 1 };
    const list = mergeMistakes([legacy], [mk(text)], []);

    expect(list).toHaveLength(1);
    expect(list[0].qHash).toBe(questionKey({ q: text }));
  });

  it('mavjud ro\'yxatdagi dublikatlar ham birlashtiriladi (eski ma\'lumotni tozalash)', () => {
    const q = mk('Savol C?');
    const list = mergeMistakes([q, { ...q }], [], []);
    expect(list).toHaveLength(1);
  });
});

describe('mergeMistakes — izoh saqlanishi (T-2)', () => {
  it('izoh yozuvda qoladi', () => {
    const list = mergeMistakes([], [mk('Savol D?', { explanation: 'Ilmiy izoh' })], []);
    expect(list[0].explanation).toBe('Ilmiy izoh');
  });

  it('izohsiz yangi xato MAVJUD izohni o\'chirmaydi', () => {
    const withExp = mk('Savol E?', { explanation: 'Ilmiy izoh' });
    const withoutExp = { ...mk('Savol E?'), explanation: undefined };
    const list = mergeMistakes([withExp], [withoutExp], []);
    expect(list[0].explanation).toBe('Ilmiy izoh');
  });
});

describe('mergeMistakes — hayot sikli (yopish / qayta ochish)', () => {
  const now = Date.now();
  const key = questionKey({ q: 'Savol F?' });

  it('to\'g\'ri javob zanjirni oshiradi, lekin darhol YOPMAYDI', () => {
    const existing = [mk('Savol F?', { wrongCount: 1, lastWrongAt: now - 10 * DAY, streakSinceWrong: 0 })];
    const list = mergeMistakes(existing, [], [key], { now });

    expect(list[0].streakSinceWrong).toBe(1);
    expect(list[0].retiredAt).toBeUndefined();
  });

  it(`${RETIRE_STREAK} marta ketma-ket to'g'ri javobdan keyin YOPILADI`, () => {
    const existing = [mk('Savol F?', { wrongCount: 1, lastWrongAt: now - 10 * DAY, streakSinceWrong: RETIRE_STREAK - 1 })];
    const list = mergeMistakes(existing, [], [key], { now });

    expect(list[0].retiredAt).toBe(now);
    expect(retiredMistakes(list)).toHaveLength(1);
    expect(activeMistakes(list)).toHaveLength(0);
  });

  it('AYNI SESSIYADA xato qilib, o\'sha zahoti yopib bo\'lmaydi (qisqa muddatli xotira)', () => {
    // Xato hozirgina bo'lgan — RETIRE_MIN_AGE_MS o'tmagan
    const existing = [mk('Savol F?', { wrongCount: 1, lastWrongAt: now - 60_000, streakSinceWrong: RETIRE_STREAK - 1 })];
    const list = mergeMistakes(existing, [], [key], { now });

    expect(list[0].retiredAt).toBeUndefined();
    expect(list[0].streakSinceWrong).toBe(RETIRE_STREAK);
  });

  it(`chegara aynan ${RETIRE_MIN_AGE_MS / DAY} kun`, () => {
    const base = { wrongCount: 1, streakSinceWrong: RETIRE_STREAK - 1 };
    const justUnder = mergeMistakes([mk('Savol F?', { ...base, lastWrongAt: now - RETIRE_MIN_AGE_MS + 1000 })], [], [key], { now });
    const justOver = mergeMistakes([mk('Savol F?', { ...base, lastWrongAt: now - RETIRE_MIN_AGE_MS })], [], [key], { now });

    expect(justUnder[0].retiredAt).toBeUndefined();
    expect(justOver[0].retiredAt).toBe(now);
  });

  it('yopilgan xato QAYTA XATO qilinsa yana ochiladi', () => {
    const closed = [mk('Savol G?', { wrongCount: 2, retiredAt: now - DAY, streakSinceWrong: 3 })];
    const list = mergeMistakes(closed, [mk('Savol G?')], [], { now });

    expect(list[0].retiredAt).toBeUndefined();
    expect(list[0].streakSinceWrong).toBe(0);
    expect(list[0].wrongCount).toBe(3);
  });

  it('yopilgan xatoga to\'g\'ri javob berilsa u yopiq qoladi', () => {
    const closed = [mk('Savol H?', { wrongCount: 1, retiredAt: now - DAY, streakSinceWrong: 2 })];
    const list = mergeMistakes(closed, [], [questionKey({ q: 'Savol H?' })], { now });
    expect(list[0].retiredAt).toBe(now - DAY);
  });
});

describe('mergeMistakes — tirishqoq (leech)', () => {
  it(`${LEECH_THRESHOLD} marta xatodan keyin mashqdan chiqadi`, () => {
    const m = mk('Savol I?', { wrongCount: LEECH_THRESHOLD - 1 });
    const list = mergeMistakes([m], [mk('Savol I?')], []);

    expect(list[0].wrongCount).toBe(LEECH_THRESHOLD);
    expect(leechMistakes(list)).toHaveLength(1);
    expect(activeMistakes(list)).toHaveLength(0);
  });
});

describe('pruneMistakes — chegara oshganda NIMA o\'chadi', () => {
  it('eng eskisini emas, YOPILGANINI o\'chiradi (eski FIFO ning teskarisi)', () => {
    const now = Date.now();
    const closedOld = mk('Yopilgan eski?', { retiredAt: now - 5 * DAY, wrongCount: 1, lastWrongAt: now - 30 * DAY });
    const openOld = mk('Ochiq eski?', { wrongCount: 3, lastWrongAt: now - 30 * DAY });
    const openNew = mk('Ochiq yangi?', { wrongCount: 1, lastWrongAt: now });

    const kept = pruneMistakes([closedOld, openOld, openNew], 2);
    const texts = kept.map(m => m.question);

    // Eski FIFO `openOld` ni o'chirardi (u eng oldin qo'shilgan).
    expect(texts).toContain('Ochiq eski?');
    expect(texts).toContain('Ochiq yangi?');
    expect(texts).not.toContain('Yopilgan eski?');
  });

  it('ochiq xatolar orasida KO\'P xato qilingani saqlanadi', () => {
    const now = Date.now();
    const rare = mk('Kam xato?', { wrongCount: 1, lastWrongAt: now });
    const frequent = mk('Ko\'p xato?', { wrongCount: 4, lastWrongAt: now - 10 * DAY });

    const kept = pruneMistakes([rare, frequent], 1);
    expect(kept[0].question).toBe('Ko\'p xato?');
  });

  it('chegaradan kam bo\'lsa ro\'yxatga umuman tegmaydi (tartib saqlanadi)', () => {
    const list = [mk('1?'), mk('2?')];
    expect(pruneMistakes(list, 10)).toBe(list);
  });

  it('60% aniqlikdagi 5 blok — ochiq xatolar YO\'QOLMAYDI', () => {
    // Eski chegara 50 edi va 2.5 blokdan keyin to'lardi.
    let list = [];
    for (let block = 0; block < 5; block++) {
      const wrongs = Array.from({ length: 20 }, (_, i) => mk(`B${block}-Q${i}?`));
      list = mergeMistakes(list, wrongs, []);
    }
    expect(list).toHaveLength(100);
    // Eng birinchi blokdagi xato hali ham ro'yxatda
    expect(list.some(m => m.question === 'B0-Q0?')).toBe(true);
  });
});

describe('buildMistakeDrill — navbat (T-6)', () => {
  const now = Date.now();

  it('bo\'sh ro\'yxatda bo\'sh qaytaradi', () => {
    expect(buildMistakeDrill([], [])).toEqual([]);
  });

  it('MUDDATI KELGAN xato muddati kelmaganidan oldin tanlanadi', () => {
    const due = mk('Muddati kelgan?', { wrongCount: 1 });
    const notDue = mk('Muddati kelmagan?', { wrongCount: 1 });
    const cards = [
      { qHash: mistakeKey(due), nextReview: now - DAY },
      { qHash: mistakeKey(notDue), nextReview: now + 30 * DAY },
    ];

    const drill = buildMistakeDrill([due, notDue], cards, { size: 1, now });
    expect(drill).toHaveLength(1);
    expect(drill[0].question).toBe('Muddati kelgan?');
  });

  it('kartasi YO\'Q xato ham muddati kelgan hisoblanadi', () => {
    const fresh = mk('Kartasiz?');
    const drill = buildMistakeDrill([fresh], [], { size: 1, now });
    expect(drill).toHaveLength(1);
  });

  it('tirishqoq savol ochiqlar bo\'lsa mashqqa TUSHMAYDI', () => {
    const leech = mk('Tirishqoq?', { wrongCount: LEECH_THRESHOLD });
    const normal = mk('Oddiy?', { wrongCount: 1 });

    const drill = buildMistakeDrill([leech, normal], [], { size: 1, now });
    expect(drill[0].question).toBe('Oddiy?');
  });

  it('boshqa hech narsa yo\'q bo\'lsa tirishqoq ham beriladi (bo\'sh mashq bo\'lmaydi)', () => {
    const leech = mk('Tirishqoq?', { wrongCount: LEECH_THRESHOLD });
    const drill = buildMistakeDrill([leech], [], { size: 5, now });
    expect(drill).toHaveLength(1);
  });

  it('yopilgan xatolar NAZORAT savoli sifatida qo\'shiladi', () => {
    const open = Array.from({ length: 10 }, (_, i) => mk(`Ochiq ${i}?`));
    const closed = Array.from({ length: 10 }, (_, i) => mk(`Yopilgan ${i}?`, { retiredAt: now - (i + 1) * DAY }));

    const drill = buildMistakeDrill([...open, ...closed], [], { size: 20, now });
    const controlCount = drill.filter(m => m.retiredAt).length;

    expect(controlCount).toBeGreaterThan(0);
    // ...lekin mashqni egallab olmaydi
    expect(controlCount).toBeLessThan(drill.length / 2);
  });

  it('bir savol ikki marta tushmaydi', () => {
    const list = Array.from({ length: 30 }, (_, i) => mk(`Savol ${i}?`));
    const drill = buildMistakeDrill(list, [], { size: 20, now });
    const keys = drill.map(mistakeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('mavjuddan ko\'p savol so\'ralmaydi', () => {
    const list = [mk('Bitta?')];
    expect(buildMistakeDrill(list, [], { size: 20, now })).toHaveLength(1);
  });
});

describe('shuffle — Fisher-Yates', () => {
  it('barcha elementlarni saqlaydi', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src);
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual(src);
  });

  it('asl massivni o\'zgartirmaydi', () => {
    const src = [1, 2, 3];
    shuffle(src, () => 0);
    expect(src).toEqual([1, 2, 3]);
  });

  it('taqsimot xolis — `sort(() => 0.5 - random)` dan farqli', () => {
    // Birinchi element 1000 ta aralashtirishda har pozitsiyaga tushishi kerak.
    const positions = new Set();
    for (let i = 0; i < 1000; i++) {
      positions.add(shuffle([0, 1, 2, 3, 4]).indexOf(0));
    }
    expect(positions.size).toBe(5);
  });
});
