/**
 * Analytics Service — Google Analytics + sahifa vaqt kuzatuvi
 *
 * Funksiyalar:
 * - Sahifa ko'rishlari (page views) avtomatik tracking
 * - Sahifada o'tkazilgan vaqt (time on page)
 * - Custom eventlar (test boshlash, yakunlash, xato va h.k.)
 *
 * .env: VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// ── gtag() funksiyasi ──
function gtag() {
  if (!window.dataLayer) return;
  window.dataLayer.push(arguments);
}

// ── GA skriptini yuklash (bir marta) ──
export function initAnalytics() {
  if (!GA_ID || typeof window === 'undefined') return;

  // Skript allaqachon yuklangan bo'lsa, qayta yuklamaymiz
  if (document.querySelector(`script[src*="googletagmanager"]`)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, {
    send_page_view: false // Manual tracking qilamiz
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

// ── Sahifa ko'rish (page view) ──
export function trackPageView(pageName, pagePath) {
  if (!GA_ID) return;
  gtag('event', 'page_view', {
    page_title: pageName,
    page_location: window.location.href,
    page_path: pagePath
  });
}

// ── Sahifada o'tkazilgan vaqt ──
let pageEnterTime = null;
let currentPage = null;

export function startPageTimer(pageName) {
  // Oldingi sahifa vaqtini yuborish
  if (pageEnterTime && currentPage) {
    const duration = Math.round((Date.now() - pageEnterTime) / 1000);
    if (duration > 1 && duration < 3600) {
      gtag('event', 'time_on_page', {
        page_name: currentPage,
        duration_seconds: duration,
        event_category: 'engagement'
      });
    }
  }
  pageEnterTime = Date.now();
  currentPage = pageName;
}

// ── Custom eventlar ──
export function trackEvent(eventName, params = {}) {
  if (!GA_ID) return;
  gtag('event', eventName, {
    event_category: params.category || 'general',
    ...params
  });
}

// Tayyor event'lar:
export const AnalyticsEvents = {
  testStart: (topicName, mode) =>
    trackEvent('test_start', { topic: topicName, mode, category: 'test' }),

  testComplete: (topicName, score, total) =>
    trackEvent('test_complete', {
      topic: topicName,
      score,
      total,
      accuracy: Math.round((score / total) * 100),
      category: 'test'
    }),

  examStart: () =>
    trackEvent('exam_start', { category: 'exam' }),

  examComplete: (score, total) =>
    trackEvent('exam_complete', {
      score,
      total,
      accuracy: Math.round((score / total) * 100),
      category: 'exam'
    }),

  premiumClick: (method) =>
    trackEvent('premium_click', { method, category: 'monetization' }),

  // Ro'yxatdan o'tish — GA4 standart `sign_up` (user acquisition hisobotlari uchun)
  register: (method) =>
    trackEvent('sign_up', { method, category: 'auth' }),

  // Xarid yakunlandi — GA4 standart `purchase` (monetizatsiya hisobotlari uchun)
  purchase: (planId, method, amount) =>
    trackEvent('purchase', {
      transaction_id: `${planId}_${Date.now()}`,
      plan: planId,
      method,
      value: amount,
      currency: 'UZS',
      category: 'monetization'
    }),

  objectionSubmit: (topicName) =>
    trackEvent('objection_submit', { topic: topicName, category: 'feedback' }),

  // "Ko'proq savol kerak" so'rovi (tirik halqa — questionRequests)
  questionRequest: (topicName) =>
    trackEvent('question_request', { topic: topicName, category: 'feedback' }),

  reviewSession: (cardCount) =>
    trackEvent('review_session', { card_count: cardCount, category: 'review' }),

  // ── Retention hodisalari ──────────────────────────────────────────────────
  //
  // NEGA KERAK: yuqoridagi hodisalar mahsulotdan FOYDALANISHNI o'lchaydi
  // (test boshlandi, tugadi, xarid bo'ldi), lekin QAYTISHNI emas. Odat
  // qatlamining butun mexanikasi — kunlik maqsad, zanjir, muzlatish zaxirasi —
  // hech qayerda qayd etilmasdi, ya'ni D1/D7/D30 ni o'lchash imkoni yo'q edi
  // va har qanday «retention oshdi» da'vosi isbotlanmasdi.
  //
  // Bu hodisalar GA4 da kohorta hisoboti uchun asos bo'ladi:
  //   · `streak_day` taqsimoti — foydalanuvchilar qaysi kunda uzilishini
  //     ko'rsatadi (odatda 2- va 7-kun);
  //   · `goal_completed` / faol foydalanuvchi — odat halqasi yopilish ulushi;
  //   · `paywall_view` + `source` — qaysi lahza konversiya qilishini ajratadi.

  /** Kunlik maqsad yopildi (kuniga ko'pi bilan bir marta) */
  goalCompleted: (target, streak) =>
    trackEvent('goal_completed', { target, streak, category: 'retention' }),

  /** Zanjir +1 bo'ldi. `days` — yangi uzunlik; taqsimoti asosiy indikator */
  streakDay: (days) =>
    trackEvent('streak_day', { days, category: 'retention' }),

  /** Zanjir 1 ga qaytdi. `lost` — yo'qotilgan uzunlik */
  streakBroken: (lost) =>
    trackEvent('streak_broken', { lost, category: 'retention' }),

  /** Muzlatish zaxirasi sarflanib zanjir saqlandi. `remaining` — qolgan zaxira */
  freezeUsed: (remaining) =>
    trackEvent('freeze_used', { remaining, category: 'retention' }),

  /** Push ruxsati so'raldi. `result`: 'granted' | 'denied' | 'default' */
  pushOptIn: (result) =>
    trackEvent('push_opt_in', { result, category: 'retention' }),

  /** Natija/pasport ulashildi. `kind`: 'result'|'passport', `channel`: 'native'|'telegram'|'download' */
  shareClick: (kind, channel) =>
    trackEvent('share_click', { kind, channel, category: 'viral' }),

  /** Obuna oynasi ochildi. `source` — QAYSI lahzadan (eng muhim parametr) */
  paywallView: (source) =>
    trackEvent('paywall_view', { source, category: 'monetization' }),

  /** Reyting ko'rildi. `scope`: 'all'|'weekly'|'monthly' */
  leaderboardView: (scope) =>
    trackEvent('leaderboard_view', { scope, category: 'social' })
};
