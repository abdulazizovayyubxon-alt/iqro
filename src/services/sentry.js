/**
 * Sentry Error Monitoring (Zero-dependency)
 *
 * @sentry/react paketini o'rnatganingizdan keyin avtomatik ishlaydi.
 * O'rnatmasangiz ham ilova buzilmaydi — barcha xatolar console'ga yoziladi.
 *
 * O'rnatish: npm install @sentry/react
 * .env: VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

let Sentry = null;

// ── Global xatolarni ushlab qolish ──
export function initSentry() {
  if (!SENTRY_DSN || !import.meta.env.PROD) return;

  // @sentry/react mavjudligini tekshirish
  try {
    // Dynamic import faqat runtime'da — build buzilmaydi
    const tryLoad = new Function('return import("@sentry/react")');
    tryLoad().then(mod => {
      Sentry = mod;
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.3,
        ignoreErrors: ['ResizeObserver loop', 'Loading chunk', 'Network Error']
      });
    }).catch(() => {
      // @sentry/react yo'q — faqat console ishlaydi
    });
  } catch {
    // Fallback: hech narsa qilmaslik
  }

  // Global error handler (Sentry'siz ham ishlaydi)
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Unhandled]', e.reason);
  });
}

export function captureError(error, context = {}) {
  if (Sentry) Sentry.captureException(error, { extra: context });
  console.error('[Error]', error, context);
}

export function setUser(user) {
  if (Sentry && user) Sentry.setUser({ id: user.uid });
}

export function clearUser() {
  if (Sentry) Sentry.setUser(null);
}
