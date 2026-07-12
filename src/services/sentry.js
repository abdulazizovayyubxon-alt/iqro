/**
 * Xatolarni kuzatish (Observability)
 *
 * IKKI QATLAM:
 *  1. O'Z Firestore log'imiz (/api/log-error) — HAR DOIM ishlaydi, tashqi
 *     xizmatsiz. Global crash'lar avtomatik qayd etiladi, admin ko'radi.
 *  2. Sentry (ixtiyoriy) — VITE_SENTRY_DSN + `npm i @sentry/react` bo'lsa
 *     qo'shimcha yoqiladi. Bo'lmasa ilova baribir buzilmaydi.
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const LOG_ENDPOINT = '/api/log-error';

let Sentry = null;
let currentUid = null;

// ── Toshqin himoyasi: bir xil xatoni takror yubormaymiz + sessiya bo'yicha cap ──
const _seen = new Set();
let _sentCount = 0;
const MAX_PER_SESSION = 20;

// Shovqin — foydasiz/kutilgan xatolar (log qilinmaydi)
const IGNORE = ['ResizeObserver loop', 'Loading chunk', 'Network Error', 'Failed to fetch'];

function logToServer(message, stack, severity = 'error', context = null) {
  if (!import.meta.env.PROD) return;                 // /api serverless faqat productionда bor
  const msg = String(message || 'unknown');
  if (IGNORE.some(p => msg.includes(p))) return;
  if (_sentCount >= MAX_PER_SESSION) return;
  const sig = msg.slice(0, 200);
  if (_seen.has(sig)) return;                         // dedupe (sessiya ichida)
  _seen.add(sig);
  _sentCount++;

  try {
    const body = JSON.stringify({
      message: msg.slice(0, 1000),
      stack: stack ? String(stack).slice(0, 4000) : null,
      url: typeof location !== 'undefined' ? location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      uid: currentUid,
      severity,
      context,
    });
    // sendBeacon — sahifa yopilsa ham yetkaziladi; bo'lmasa keepalive fetch
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(LOG_ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (_) {
    /* Kuzatuv HECH QACHON ilovani buzmasligi kerak */
  }
}

// ── Ishga tushirish (main.jsx chaqiradi) ──
export function initSentry() {
  // 1. Global crash'larni Firestore'ga log qilish — Sentry'dan MUSTAQIL
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      if (!e.error) return; // resurs yuklanish xatolari (img/script 404) — e'tiborsiz
      logToServer(e.message || 'window.onerror', e.error.stack, 'error');
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      logToServer(r?.message || String(r) || 'unhandledrejection', r?.stack, 'error');
    });
  }

  // 2. Sentry (ixtiyoriy — DSN + paket bo'lsa)
  if (!SENTRY_DSN || !import.meta.env.PROD) return;
  try {
    // Dynamic import faqat runtime'da — paket yo'q bo'lsa build buzilmaydi
    const tryLoad = new Function('return import("@sentry/react")');
    tryLoad().then(mod => {
      Sentry = mod;
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.3,
        ignoreErrors: IGNORE,
      });
    }).catch(() => {
      // @sentry/react o'rnatilmagan — faqat Firestore log ishlaydi
    });
  } catch {
    /* noop */
  }
}

// ── Qo'lda xato qayd etish (kritik catch bloklarida chaqiring) ──
export function captureError(error, context = {}) {
  if (Sentry) Sentry.captureException(error, { extra: context });
  logToServer(error?.message || String(error), error?.stack, 'error', context);
  console.error('[Error]', error, context);
}

export function setUser(user) {
  currentUid = user?.uid || null;
  if (Sentry && user) Sentry.setUser({ id: user.uid });
}

export function clearUser() {
  currentUid = null;
  if (Sentry) Sentry.setUser(null);
}
