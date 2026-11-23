import { TOPICS } from '../data/mockData';

/**
 * Fan bazasi tubdan yangilanganda o'rnatilgan reset tamg'alari (ms).
 * `settings/version.categoryResetAt` bilan birlashtiriladi (har fan uchun max).
 *
 * NEGA BUILT-IN: 2 252+ ta `userStats` hujjatini Firestore'dan ommaviy o'qib-yozish
 * Spark kunlik kvotasini sarflamaydi — har bir foydalanuvchi ilovani ochganida
 * o'zining eski ChQBT takrorlash/xato/bo'lim statistikasini 1 marta (idempotent)
 * nolga qaytaradi; reyting ballari va boshqa 29 ta fan 100% saqlanadi.
 */
export const BUILTIN_CATEGORY_RESET_AT = {
  chqbt: 1795407597513, // 2026-11-23 — ChQBT 4 875 talik «Oliy Toifa+» yangi bazasi
  art: 1795442779295,   // 2026-11-23 — Tasviriy san'at va chizmachilik 3 391 talik «Oliy Toifa+» yangi bazasi
};

/**
 * O'rnatilgan (`BUILTIN_CATEGORY_RESET_AT`) va serverdagi (`settings/version.categoryResetAt`)
 * reset tamg'alarini birlashtiradi (har fan uchun eng katta vaqt g'olib).
 */
export function mergeCategoryResetMaps(builtin = BUILTIN_CATEGORY_RESET_AT, remote = null) {
  const out = {};
  for (const src of [builtin, remote]) {
    if (!src || typeof src !== 'object') continue;
    for (const [cat, rawTs] of Object.entries(src)) {
      const ts = Number(rawTs || 0);
      if (Number.isFinite(ts) && ts > 0) {
        out[cat] = Math.max(out[cat] || 0, ts);
      }
    }
  }
  return out;
}

/**
 * Fan (`cat`) ga tegishli barcha `topicId` lar to'plami.
 * Masalan, `chqbt` -> Set([0, 1, 2, 3, 4, 5, 6]).
 */
export function getCategoryTopicIds(cat) {
  const ids = new Set();
  if (!cat) return ids;
  for (const tp of TOPICS) {
    const match = Array.isArray(tp.category) ? tp.category.includes(cat) : tp.category === cat;
    if (match && Number.isInteger(tp.id)) ids.add(tp.id);
  }
  return ids;
}

/**
 * Faqat bitta fan (`cat`) bo'yicha takrorlash (`spacedCards`), xatolar daftari
 * (`stats[cat]`), bo'lim o'zlashtirishi (`topicStats[topicId]`) va tayyorlik
 * (`readiness[cat]`, `readinessHistory[cat]`) ko'rsatkichlarini nolga qaytaradi.
 *
 * QAT'IY KAFOLAT:
 *   - Reyting ballari (`totalScore`, `weekly_*`, `monthly_*`), `dailyStreak`,
 *     `achievements`, `milestones`, `partnerSets` ga TEGILMAYDI.
 *   - Boshqa barcha 29 ta fan statistikasi va ularning `spacedCards` kartalari
 *     to'liq saqlanib qoladi.
 */
export function resetCategoryProgress(state, cat, resetTs = Date.now()) {
  if (!state || !cat) return state;
  const topicIds = getCategoryTopicIds(cat);

  const nextSpacedCards = (state.spacedCards || []).filter(
    (c) => c && !topicIds.has(Number(c.topicId))
  );

  const nextStats = { ...(state.stats || {}) };
  nextStats[cat] = {
    totalAnswered: 0,
    totalCorrect: 0,
    maxStreak: 0,
    mistakes: [],
  };

  const nextTopicStats = { ...(state.topicStats || {}) };
  for (const tid of topicIds) {
    delete nextTopicStats[tid];
    delete nextTopicStats[String(tid)];
  }

  const nextReadiness = { ...(state.readiness || {}) };
  delete nextReadiness[cat];

  const nextReadinessHistory = { ...(state.readinessHistory || {}) };
  delete nextReadinessHistory[cat];

  const nextCategoryResets = {
    ...(state.categoryResets || {}),
    [cat]: Math.max(Number(state.categoryResets?.[cat] || 0), Number(resetTs) || Date.now()),
  };

  return {
    ...state,
    spacedCards: nextSpacedCards,
    stats: nextStats,
    topicStats: nextTopicStats,
    readiness: nextReadiness,
    readinessHistory: nextReadinessHistory,
    categoryResets: nextCategoryResets,
  };
}

/**
 * `settings/version.categoryResetAt` (masalan `{ chqbt: 1795408000000 }`) bilan
 * foydalanuvchi holatini solishtiradi va hali qo'llanmagan fan resetlarini
 * bir marta bajaradi (idempotent).
 */
export function applyPendingCategoryResets(state, remoteCategoryResetAt) {
  if (!state || !remoteCategoryResetAt || typeof remoteCategoryResetAt !== 'object') {
    return { state, changed: false, resetCats: [] };
  }
  let next = state;
  const resetCats = [];

  for (const [cat, rawTs] of Object.entries(remoteCategoryResetAt)) {
    const ts = Number(rawTs || 0);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const appliedTs = Number(next.categoryResets?.[cat] || 0);
    if (ts > appliedTs) {
      next = resetCategoryProgress(next, cat, ts);
      resetCats.push(cat);
    }
  }

  return {
    state: next,
    changed: resetCats.length > 0,
    resetCats,
  };
}

/**
 * Bulut va lokal zaxira birlashtirilishidan OLDIN:
 * agar bulutda biror fan `categoryResets[cat]` lokal zaxira `savedAt` vaqtidan
 * KEYIN nolga qaytarilgan bo'lsa, eski lokal zaxiradagi o'sha fan ma'lumotlari
 * tozalanadi — shunda eski telefon keshi o'chirilgan kartalarni «tiriltira» olmaydi.
 * Boshqa fanlardagi oflayn yutuqlar va reyting ballari esa to'liq saqlanadi.
 */
export function stripResetCategoriesFromLocal(cloud, local, extraResetAt = BUILTIN_CATEGORY_RESET_AT) {
  if (!local) return local;
  const resetMap = mergeCategoryResetMaps(extraResetAt, cloud?.categoryResets);
  const localSavedAt = Number(local.savedAt || 0);
  let cleaned = local;

  for (const [cat, resetTs] of Object.entries(resetMap)) {
    if (resetTs > 0 && localSavedAt < resetTs) {
      cleaned = resetCategoryProgress(cleaned, cat, resetTs);
    }
  }
  return cleaned;
}
