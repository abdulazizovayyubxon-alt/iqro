/**
 * questionLoader.js — /api/get-questions muvaffaqiyatsiz bo'lganda
 * Firestore zaxirasiga tushish uchun kvota himoyachisi (circuit breaker).
 *
 * Muammo: server 500/502/429 yoki tarmoq uzilishi berganda barcha mijozlar
 * `getDocs(query(collection(db, 'questions'), where('category', '==', cat)))`
 * orqali fan boshiga ~2 000–3 900 ta o'qishga yopirilsa, Spark kvotasi bir necha
 * daqiqada tugaydi.
 *
 * Qoida:
 *  1) Paywall (403) va rate-limit (429) holatida zaxira UMUMAN chaqirilmaydi.
 *  2) 5xx server xatolari yoki tarmoq uzilishida zaxira chaqirilmaydi — faqat
 *     paket haqiqatan topilmaganda (404) yoki dev muhitida (`api_not_json`).
 *  3) Seans ichida bir fan ko'pi bilan 1 marta, jami ko'pi bilan 3 ta fan
 *     zaxira orqali o'qilishi mumkin.
 */

const SESSION_PREFIX = 'zehin_fs_fallback_';
const MAX_FALLBACKS_PER_SESSION = 3;
const memoryTried = new Set();

function readTriedCategories() {
  if (typeof sessionStorage === 'undefined') return new Set(memoryTried);
  try {
    const set = new Set(memoryTried);
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_PREFIX)) {
        set.add(k.slice(SESSION_PREFIX.length));
      }
    }
    return set;
  } catch {
    return new Set(memoryTried);
  }
}

export function canUseFirestoreFallback(category, { paywalled = false, throttled = false, apiStatus = null, apiErrorCode = null } = {}) {
  if (!category || paywalled || throttled) return false;

  // Faqat paket mavjud bo'lmaganda (404) yoki lokal Vite dev serverida (api_not_json) ruxsat.
  // 500/502/503/network xatolarida Firestore bazasiga ommaviy tushishni to'samiz.
  const isMissingBundle = apiStatus === 404 || apiErrorCode === 'api_not_json';
  if (!isMissingBundle) return false;

  const tried = readTriedCategories();
  if (tried.has(category)) return false;
  if (tried.size >= MAX_FALLBACKS_PER_SESSION) return false;
  return true;
}

export function markFirestoreFallbackUsed(category) {
  if (!category) return;
  memoryTried.add(category);
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(`${SESSION_PREFIX}${category}`, '1');
    } catch { /* sessionStorage bloklangan */ }
  }
}

export function resetFallbackCircuitBreakerForTest() {
  memoryTried.clear();
  if (typeof sessionStorage !== 'undefined') {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
  }
}
