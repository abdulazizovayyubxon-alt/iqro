import { describe, it, expect } from 'vitest';
import { streakRisk, RISK_MIN_STREAK } from '../utils/streakRisk';

/**
 * Zanjir xavfi — «bugun bajarilmasa uziladi» ogohlantirishi.
 *
 * Bu mantiq SANA bilan ishlaydi, ya'ni eng oson buziladigan joy. Asosiy
 * xavf — YOLG'ON ogohlantirish: bir necha kun kirmagan odamga «zanjiringiz
 * bugun uziladi» deyish. Uning zanjiri allaqachon uzilgan va bunday xabar
 * ishonchni yo'qotadi. Shu sababli testlar avvalo shu chegara holatlarini
 * qo'riqlaydi.
 */

const day = (offset) => new Date(Date.now() + offset * 86400000).toDateString();

/** Berilgan maydonlar bilan minimal holat */
const st = (over = {}) => ({
  dailyStreak: 5,
  lastGoalDate: day(-1),                                  // kecha bajarilgan
  streakFreezes: 2,
  dailyGoal: { date: day(0), answered: 4, target: 20, completed: false },
  ...over,
});

describe('streakRisk', () => {
  it('kecha bajarilgan va bugun bajarilmagan — xavf bor', () => {
    const r = streakRisk(st());
    expect(r).not.toBeNull();
    expect(r.streak).toBe(5);
    expect(r.remaining).toBe(16);
    expect(r.usesFreeze).toBe(false);
  });

  it('bugun maqsad bajarilgan — xavf yo\'q', () => {
    expect(streakRisk(st({ dailyGoal: { date: day(0), answered: 20, target: 20, completed: true } }))).toBeNull();
  });

  it('qisqa zanjir uchun ogohlantirilmaydi (shovqin)', () => {
    expect(streakRisk(st({ dailyStreak: RISK_MIN_STREAK - 1 }))).toBeNull();
  });

  it('zanjir ALLAQACHON uzilgan bo\'lsa yolg\'on ogohlantirish bermaydi', () => {
    // 4 kun oldin bajarilgan: keyingi bajarilishda zanjir baribir 1 dan boshlanadi
    expect(streakRisk(st({ lastGoalDate: day(-4) }))).toBeNull();
  });

  it('bir kun o\'tkazilgan va zaxira bor — muzlatish sarflanishi aytiladi', () => {
    const r = streakRisk(st({ lastGoalDate: day(-2), streakFreezes: 1 }));
    expect(r).not.toBeNull();
    expect(r.usesFreeze).toBe(true);
  });

  it('bir kun o\'tkazilgan, zaxira yo\'q — zanjirni saqlab bo\'lmaydi', () => {
    expect(streakRisk(st({ lastGoalDate: day(-2), streakFreezes: 0 }))).toBeNull();
  });

  it('bugungi maqsad yozuvi eskirgan bo\'lsa hisob noldan boshlanadi', () => {
    // dailyGoal kechagi kunniki — bugun hali bitta ham savol yechilmagan
    const r = streakRisk(st({ dailyGoal: { date: day(-1), answered: 20, target: 20, completed: true } }));
    expect(r).not.toBeNull();
    expect(r.answered).toBe(0);
    expect(r.remaining).toBe(20);
  });

  it('kun oxiriga yaqin holat shoshilinch deb belgilanadi', () => {
    const evening = new Date();
    evening.setHours(21, 0, 0, 0);
    const morning = new Date();
    morning.setHours(9, 0, 0, 0);
    // `st()` sanalari `now` ga bog'liq emas (toDateString), shuning uchun faqat soat farq qiladi
    expect(streakRisk(st(), evening).urgent).toBe(true);
    expect(streakRisk(st(), morning).urgent).toBe(false);
  });

  it('zanjir yo\'q foydalanuvchida hech narsa ko\'rsatilmaydi', () => {
    expect(streakRisk({ dailyStreak: 0 })).toBeNull();
    expect(streakRisk({})).toBeNull();
  });
});
