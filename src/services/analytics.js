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

  objectionSubmit: (topicName) =>
    trackEvent('objection_submit', { topic: topicName, category: 'feedback' }),

  reviewSession: (cardCount) =>
    trackEvent('review_session', { card_count: cardCount, category: 'review' })
};
