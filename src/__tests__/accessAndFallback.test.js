import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase', () => ({ auth: {}, db: {} }));

const { computeTrialStatus } = await import('../context/AuthContext.jsx');
const {
  canUseFirestoreFallback,
  markFirestoreFallbackUsed,
  resetFallbackCircuitBreakerForTest,
} = await import('../utils/questionLoader.js');
const { getDynamicMaxReferrals, MAX_REFERRALS, BONUS_MAX_REFERRALS, REFERRAL_BONUS, MAX_TOTAL_BONUS } = await import('../services/referral.js');

describe('computeTrialStatus — obuna muddati yaxlitligi', () => {
  it('paid reja muddati o\'tgan bo\'lsa expired qaytaradi (abadiy Pro emas)', () => {
    const expiredPaid = {
      isPremium: true,
      premiumPlan: 'paid',
      premiumExpire: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    };
    expect(computeTrialStatus(expiredPaid).status).toBe('expired');
  });

  it('paid reja hali faol bo\'lsa qolgan kunlarni aniq hisoblaydi', () => {
    const activePaid = {
      isPremium: true,
      premiumPlan: 'paid',
      premiumExpire: new Date(Date.now() + 12 * 86400000).toISOString(),
    };
    const res = computeTrialStatus(activePaid);
    expect(res.status).toBe('premium');
    expect(res.daysLeft).toBeGreaterThanOrEqual(11);
  });

  it('premiumExpire null bo\'lgan Cheksiz Pro faol qoladi', () => {
    expect(computeTrialStatus({ isPremium: true, premiumPlan: 'paid', premiumExpire: null }).status).toBe('premium');
  });
});

describe('questionLoader — Firestore fallback circuit breaker', () => {
  beforeEach(() => {
    resetFallbackCircuitBreakerForTest();
  });

  it('500/502/network xatolarida Firestore bazasiga ommaviy tushishni to\'sadi', () => {
    expect(canUseFirestoreFallback('chqbt', { apiStatus: 500, apiErrorCode: 'api_500' })).toBe(false);
    expect(canUseFirestoreFallback('chqbt', { apiStatus: 502, apiErrorCode: 'api_502' })).toBe(false);
    expect(canUseFirestoreFallback('chqbt', { apiErrorCode: 'network' })).toBe(false);
    expect(canUseFirestoreFallback('chqbt', { paywalled: true, apiStatus: 404 })).toBe(false);
    expect(canUseFirestoreFallback('chqbt', { throttled: true, apiStatus: 404 })).toBe(false);
  });

  it('faqat 404 yoki api_not_json da seans boshiga har fan uchun 1 marta, jami 3 tagacha ruxsat beradi', () => {
    expect(canUseFirestoreFallback('chqbt', { apiStatus: 404 })).toBe(true);
    markFirestoreFallbackUsed('chqbt');
    expect(canUseFirestoreFallback('chqbt', { apiStatus: 404 })).toBe(false);

    expect(canUseFirestoreFallback('tarix', { apiErrorCode: 'api_not_json' })).toBe(true);
    markFirestoreFallbackUsed('tarix');
    expect(canUseFirestoreFallback('info', { apiStatus: 404 })).toBe(true);
    markFirestoreFallbackUsed('info');

    // 4-fan seans limiti tufayli to'xtatiladi
    expect(canUseFirestoreFallback('biologiya', { apiStatus: 404 })).toBe(false);
  });
});

describe('referral 5 + 2 = 7 qoidalari', () => {
  it('dastlabki 5 ta to\'lovgacha limit 5, 5 ta to\'lagach +2 ta ochilib 7 bo\'ladi', () => {
    expect(MAX_REFERRALS).toBe(5);
    expect(BONUS_MAX_REFERRALS).toBe(7);
    expect(REFERRAL_BONUS).toBe(25000);
    expect(MAX_TOTAL_BONUS).toBe(175000);
    expect(getDynamicMaxReferrals(0)).toBe(5);
    expect(getDynamicMaxReferrals(4)).toBe(5);
    expect(getDynamicMaxReferrals(5)).toBe(7);
    expect(getDynamicMaxReferrals(7)).toBe(7);
  });
});
