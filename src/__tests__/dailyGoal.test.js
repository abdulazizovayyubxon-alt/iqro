import { describe, it, expect } from 'vitest';
import {
  FREE_DAILY_LIMIT,
  getTodayAnswered,
  isFreeDailyLimitReached,
  parseFirestoreDate,
} from '../utils/dailyGoal';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import { qHashOf } from '../utils/qHash';

describe('dailyGoal — kunlik 50 ta bepul savol limiti va sana yangilanishi', () => {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  it('FREE_DAILY_LIMIT = 50', () => {
    expect(FREE_DAILY_LIMIT).toBe(50);
  });

  it('kechagi 50 ta javob bugungi limitni bloklamaydi (sana almashganda 0 ga tushadi)', () => {
    const staleGoal = { date: yesterday, answered: 50, target: 20, completed: true };
    expect(getTodayAnswered(staleGoal)).toBe(0);
    expect(isFreeDailyLimitReached(true, staleGoal)).toBe(false);
  });

  it('bugun 50 ta yechilganda sinovi tugagan foydalanuvchida limitga yetadi', () => {
    const todayGoal = { date: today, answered: 50, target: 20, completed: true };
    expect(getTodayAnswered(todayGoal)).toBe(50);
    expect(isFreeDailyLimitReached(true, todayGoal)).toBe(true);
  });

  it('Pro yoki sinov muddatidagi foydalanuvchida 50 tadan keyin ham limit chiqmaydi', () => {
    const todayGoal = { date: today, answered: 120, target: 20, completed: true };
    expect(isFreeDailyLimitReached(false, todayGoal)).toBe(false);
  });

  it('parseFirestoreDate ISO, Timestamp va seconds obyektlarini to\'g\'ri o\'qiydi', () => {
    const now = Date.now();
    expect(parseFirestoreDate(new Date(now).toISOString())?.getTime()).toBe(now);
    expect(parseFirestoreDate({ toDate: () => new Date(now) })?.getTime()).toBe(now);
    expect(parseFirestoreDate({ seconds: Math.floor(now / 1000) })?.getTime()).toBe(Math.floor(now / 1000) * 1000);
    expect(parseFirestoreDate(null)).toBeNull();
  });
});

describe('processQuestionsOnTheFly — moslashtirish savollarida deterministik aralashtirish', () => {
  const matchingQ = {
    id: 'match_test_1',
    topicId: 1,
    category: 'chqbt',
    q: 'Quyidagilarni moslashtiring:\n1) Birinchi\n2) Ikkinchi\nA) Alfa\nB) Beta',
    opts: [
      '1-A, 2-B',
      '1-A, 2-B',
      '1-A, 2-B',
      '1-A, 2-B',
    ],
    correct: 0,
  };

  it('ikki marta chaqirilganda AYNAN bir xil variantlar, correct indeks va qHash qaytaradi', () => {
    const [first] = processQuestionsOnTheFly([{ ...matchingQ, opts: [...matchingQ.opts] }]);
    const [second] = processQuestionsOnTheFly([{ ...matchingQ, opts: [...matchingQ.opts] }]);

    expect(first.opts).toEqual(second.opts);
    expect(first.correct).toBe(second.correct);
    expect(qHashOf(first.q)).toBe(qHashOf(second.q));
  });
});
