import { describe, it, expect } from 'vitest';
import {
  BUILTIN_CATEGORY_RESET_AT,
  mergeCategoryResetMaps,
  getCategoryTopicIds,
  resetCategoryProgress,
  applyPendingCategoryResets,
  stripResetCategoriesFromLocal,
} from '../utils/categoryReset';

describe('categoryReset — fan kesimida xavfsiz nolga qaytarish', () => {
  const sampleState = () => ({
    totalScore: 4250,
    weekly_2026_W47: 320,
    monthly_2026_M11: 980,
    dailyStreak: 14,
    activeCategory: 'chqbt',
    spacedCards: [
      { id: 'old_chqbt_1', qHash: 'h1', topicId: 0, q: 'Eski ChQBT 1', nextReview: 1000 },
      { id: 'old_chqbt_light', qHash: 'h2', topicId: 6, nextReview: 2000 }, // light card (tanasiz)
      { id: 'art_1', qHash: 'h3', topicId: 7, q: 'Sanat savoli', nextReview: 3000 },
      { id: 'tarix_1', qHash: 'h4', topicId: 15, q: 'Tarix savoli', nextReview: 4000 },
    ],
    stats: {
      chqbt: { totalAnswered: 180, totalCorrect: 150, maxStreak: 12, mistakes: [{ id: 'm1', question: 'Xato 1' }] },
      art: { totalAnswered: 90, totalCorrect: 80, maxStreak: 9, mistakes: [{ id: 'a1', question: 'Art xato' }] },
    },
    topicStats: {
      0: { answered: 40, correct: 35 },
      6: { answered: 60, correct: 50 },
      7: { answered: 90, correct: 80 },
      15: { answered: 50, correct: 45 },
    },
    readiness: {
      chqbt: { score: 82, knowledge: 85 },
      art: { score: 78, knowledge: 80 },
    },
    readinessHistory: {
      chqbt: [{ w: '2026_W46', s: 80, k: 82 }],
      art: [{ w: '2026_W46', s: 75, k: 78 }],
    },
    categoryResets: {},
  });

  it('chqbt uchun barcha 0..6 va art uchun 7..14 bo\'lim IDlarini to\'g\'ri topadi', () => {
    const chqbtIds = getCategoryTopicIds('chqbt');
    expect([...chqbtIds].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const artIds = getCategoryTopicIds('art');
    expect([...artIds].sort((a, b) => a - b)).toEqual([7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('faqat art takrorlash/xato/bo\'lim/tayyorlikni nolga tushiradi, reyting va chqbt/tarix ga tegmaydi', () => {
    const ts = 1795442779295;
    const next = resetCategoryProgress(sampleState(), 'art', ts);

    expect(next.spacedCards.map(c => c.id)).toEqual(['old_chqbt_1', 'old_chqbt_light', 'tarix_1']);
    expect(next.stats.art).toEqual({ totalAnswered: 0, totalCorrect: 0, maxStreak: 0, mistakes: [] });
    expect(next.topicStats[7]).toBeUndefined();
    expect(next.readiness.art).toBeUndefined();
    expect(next.readinessHistory.art).toBeUndefined();
    expect(next.categoryResets.art).toBe(ts);

    // Reyting va boshqa fanlar 100% saqlandi
    expect(next.totalScore).toBe(4250);
    expect(next.weekly_2026_W47).toBe(320);
    expect(next.monthly_2026_M11).toBe(980);
    expect(next.dailyStreak).toBe(14);
    expect(next.stats.chqbt.totalAnswered).toBe(180);
    expect(next.topicStats[0]).toEqual({ answered: 40, correct: 35 });
    expect(next.topicStats[15]).toEqual({ answered: 50, correct: 45 });
  });

  it('faqat chqbt takrorlash/xato/bo\'lim/tayyorlikni nolga tushiradi, reyting va boshqa fanlarga tegmaydi', () => {
    const ts = 1795408000000;
    const next = resetCategoryProgress(sampleState(), 'chqbt', ts);

    // ChQBT tozalandi (og'ir ham, yengil ham spacedCards o'chdi)
    expect(next.spacedCards.map(c => c.id)).toEqual(['art_1', 'tarix_1']);
    expect(next.stats.chqbt).toEqual({ totalAnswered: 0, totalCorrect: 0, maxStreak: 0, mistakes: [] });
    expect(next.topicStats[0]).toBeUndefined();
    expect(next.topicStats[6]).toBeUndefined();
    expect(next.readiness.chqbt).toBeUndefined();
    expect(next.readinessHistory.chqbt).toBeUndefined();
    expect(next.categoryResets.chqbt).toBe(ts);

    // Reyting va boshqa fanlar 100% saqlandi
    expect(next.totalScore).toBe(4250);
    expect(next.weekly_2026_W47).toBe(320);
    expect(next.monthly_2026_M11).toBe(980);
    expect(next.dailyStreak).toBe(14);
    expect(next.stats.art.totalAnswered).toBe(90);
    expect(next.stats.art.mistakes).toHaveLength(1);
    expect(next.topicStats[7]).toEqual({ answered: 90, correct: 80 });
    expect(next.topicStats[15]).toEqual({ answered: 50, correct: 45 });
    expect(next.readiness.art).toEqual({ score: 78, knowledge: 80 });
    expect(next.readinessHistory.art).toHaveLength(1);
  });

  it('applyPendingCategoryResets faqat bir marta ishlaydi (idempotent)', () => {
    const ts = 1795408000000;
    const r1 = applyPendingCategoryResets(sampleState(), { chqbt: ts });
    expect(r1.changed).toBe(true);
    expect(r1.resetCats).toEqual(['chqbt']);

    // Yangi ChQBT kartasi qo'shilgandan keyin qayta chaqirilsa O'CHIRMAYDI
    const afterPractice = {
      ...r1.state,
      spacedCards: [...r1.state.spacedCards, { id: 'new_b4_t0_1', qHash: 'hn', topicId: 0, q: 'Yangi savol' }],
    };
    const r2 = applyPendingCategoryResets(afterPractice, { chqbt: ts });
    expect(r2.changed).toBe(false);
    expect(r2.state.spacedCards.some(c => c.id === 'new_b4_t0_1')).toBe(true);
  });

  it('stripResetCategoriesFromLocal eski localStorage dagi chqbt ma\'lumotlarini tiriltirmaydi, lekin boshqa fanlarni saqlaydi', () => {
    const resetTs = 1795408000000;
    const cloud = { categoryResets: { chqbt: resetTs } };
    const staleLocal = { ...sampleState(), savedAt: resetTs - 60_000 };

    const stripped = stripResetCategoriesFromLocal(cloud, staleLocal, { chqbt: resetTs });
    expect(stripped.spacedCards.map(c => c.id)).toEqual(['art_1', 'tarix_1']);
    expect(stripped.stats.chqbt.totalAnswered).toBe(0);
    expect(stripped.stats.art.totalAnswered).toBe(90);
    expect(stripped.totalScore).toBe(4250);

    // BUILTIN_CATEGORY_RESET_AT bilan chqbt, art, tarix va sport tozalanadi, hali reset bo'lmagan fan (fizika) saqlanadi
    const olderStaleLocal = {
      ...sampleState(),
      spacedCards: [
        ...sampleState().spacedCards,
        { id: 'sport_1', qHash: 'h5', topicId: 23, q: 'Sport savoli', nextReview: 5000 },
        { id: 'fizika_1', qHash: 'h6', topicId: 177, q: 'Fizika savoli', nextReview: 6000 },
      ],
      savedAt: BUILTIN_CATEGORY_RESET_AT.chqbt - 60_000,
    };
    const strippedBoth = stripResetCategoriesFromLocal({}, olderStaleLocal);
    expect(strippedBoth.spacedCards.map(c => c.id)).toEqual(['fizika_1']);
    expect(strippedBoth.stats.chqbt.totalAnswered).toBe(0);
    expect(strippedBoth.stats.art.totalAnswered).toBe(0);
    expect(strippedBoth.stats.tarix.totalAnswered).toBe(0);
    expect(strippedBoth.stats.sport.totalAnswered).toBe(0);
    expect(strippedBoth.totalScore).toBe(4250);

    // Resetdan KEYIN saqlangan lokal zaxira esa saqlanib qoladi
    const latestResetTs = Math.max(...Object.values(BUILTIN_CATEGORY_RESET_AT));
    const freshLocal = { ...sampleState(), savedAt: latestResetTs + 5_000 };
    const kept = stripResetCategoriesFromLocal(cloud, freshLocal);
    expect(kept.stats.chqbt.totalAnswered).toBe(180);
    expect(kept.stats.art.totalAnswered).toBe(90);
  });

  it('BUILTIN_CATEGORY_RESET_AT ChQBT, Art, Tarbiya, Boshlangich, Til, Tarix, Biologiya va Sport uchun o\'rnatilgan va mergeCategoryResetMaps eng yangisini oladi', () => {
    expect(BUILTIN_CATEGORY_RESET_AT.chqbt).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.art).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.tarbiya).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.boshlangich).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.til).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.tarix).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.biologiya).toBeGreaterThan(1700000000000);
    expect(BUILTIN_CATEGORY_RESET_AT.sport).toBeGreaterThan(1700000000000);
    const sportIds = getCategoryTopicIds('sport');
    expect([...sportIds].sort((a, b) => a - b)).toEqual([23, 24, 25, 26, 27, 28, 29, 30]);
    const boshIds = getCategoryTopicIds('boshlangich');
    expect([...boshIds].sort((a, b) => a - b)).toEqual([31, 32, 33, 34, 35, 36, 37, 38]);
    const tilIds = getCategoryTopicIds('til');
    expect([...tilIds].sort((a, b) => a - b)).toEqual([55, 56, 57, 58, 59, 60, 61, 62]);
    const tarixIds = getCategoryTopicIds('tarix');
    expect([...tarixIds].sort((a, b) => a - b)).toEqual([15, 16, 17, 18, 19, 20, 21, 22]);
    const bioIds = getCategoryTopicIds('biologiya');
    expect([...bioIds].sort((a, b) => a - b)).toEqual([80, 81, 82, 83, 84, 85, 86]);
    const merged = mergeCategoryResetMaps(BUILTIN_CATEGORY_RESET_AT, {
      chqbt: BUILTIN_CATEGORY_RESET_AT.chqbt + 1000,
      art: BUILTIN_CATEGORY_RESET_AT.art + 2000,
      tarbiya: BUILTIN_CATEGORY_RESET_AT.tarbiya + 3000,
      boshlangich: BUILTIN_CATEGORY_RESET_AT.boshlangich + 4000,
      til: BUILTIN_CATEGORY_RESET_AT.til + 5000,
      tarix: BUILTIN_CATEGORY_RESET_AT.tarix + 6000,
      biologiya: BUILTIN_CATEGORY_RESET_AT.biologiya + 7000,
    });
    expect(merged.chqbt).toBe(BUILTIN_CATEGORY_RESET_AT.chqbt + 1000);
    expect(merged.art).toBe(BUILTIN_CATEGORY_RESET_AT.art + 2000);
    expect(merged.tarbiya).toBe(BUILTIN_CATEGORY_RESET_AT.tarbiya + 3000);
    expect(merged.boshlangich).toBe(BUILTIN_CATEGORY_RESET_AT.boshlangich + 4000);
    expect(merged.til).toBe(BUILTIN_CATEGORY_RESET_AT.til + 5000);
    expect(merged.tarix).toBe(BUILTIN_CATEGORY_RESET_AT.tarix + 6000);
    expect(merged.biologiya).toBe(BUILTIN_CATEGORY_RESET_AT.biologiya + 7000);
  });
});
