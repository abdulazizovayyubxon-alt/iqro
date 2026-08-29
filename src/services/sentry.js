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

// ── uid'ni DARHOL tiklash ──
// setUser() ni App.jsx faqat Firebase auth hal bo'lgach chaqiradi
// (onAuthStateChanged — asinxron). Sahifa ochilishidayoq sodir bo'lgan xatolar
// esa undan OLDIN yuz beradi va `uid: null` bilan yozilardi — ya'ni admin
// panelida kim duch kelgani ko'rinmasdi. AuthContext'ning localStorage keshini
// sinxron o'qib, qaytgan foydalanuvchi uchun uid'ni boshidanoq bilamiz.
// ── ID token keshi ──
// Server `uid`ni MIJOZ aytganiga ishonmaydi — u tekshirilgan tokendan olinadi
// (audit 2026-08-05, 6-band). Token BODY'da yuboriladi, sarlavhada emas:
// `navigator.sendBeacon` sarlavha qo'shishga imkon bermaydi, lekin sahifa
// yopilganda ham xabarni yetkazadi — kuzatuv uchun bu muhimroq.
//
// Token SINXRON kerak (crash paytida await qilib bo'lmaydi), shuning uchun
// setUser() chaqirilganda oldindan olib qo'yiladi. Bo'lmasa log anonim ketadi.
let currentToken = null;

// ── Toshqin himoyasi: bir xil xatoni takror yubormaymiz + sessiya bo'yicha cap ──
const _seen = new Set();
let _sentCount = 0;
const MAX_PER_SESSION = 20;

// Shovqin — foydasiz/kutilgan xatolar (log qilinmaydi).
//
// ⚠️ 2026-08-16, JURNAL TAHLILI: ro'yxat kengaytirildi. Jurnal faqat HARAKAT
// TALAB QILADIGAN narsani ko'rsatishi kerak — kutilgan hodisalar oqimi orasida
// haqiqiy xato ko'zdan qochadi (51 yozuvning 12 tasi aynan shu ikki turdan edi).
const IGNORE = [
  'ResizeObserver loop', 'Loading chunk', 'Network Error', 'Failed to fetch',
  // Firebase Auth IndexedDB'ga sahifa yopilayotganda/fonga o'tayotganda murojaat
  // qiladi. Bu NORMAL hayot sikli — odam ilovani yopgan, tuzatadigan narsa yo'q.
  'Database is closing/hidden',
];

// Aniq TENGLIK bo'yicha e'tiborsizlar. `includes` bilan qidirsa juda keng
// tutardi: masalan 'Rejected' qismi "Promise Rejected" yoki "PERMISSION_DENIED …
// Rejected" kabi HAQIQIY xatolarni ham yutib yuborardi.
//   · 'Rejected' — `registerSW.js` service worker'ni ro'yxatdan o'tkaza olmadi
//     (private rejim yoki brauzer sozlamasi). PWA keshi ishlamaydi, ilovaning
//     o'zi to'liq ishlaydi — main.jsx buni allaqachon jimgina o'tkazib yuboradi.
const IGNORE_EXACT = ['Rejected'];

// ── HECH QACHON YUTILMAYDIGANLAR (IGNORE dan USTUN) ──
//
// ⚠️ 2026-08-29: `IGNORE` `includes` bilan qidiradi, shuning uchun
// 'Failed to fetch' Vite'ning "Failed to fetch dynamically imported module"
// xabarini ham yutib yuborardi, 'Loading chunk' esa to'g'ridan-to'g'ri
// ro'yxatda turardi. Ya'ni "PAKET YUKLANMAYAPTI" degan eng muhim signal
// jurnalga UMUMAN tushmasdi.
//
// Bu qimmatga tushdi: o'sha kuni odamlar splash ekranida qotib qolganda
// `errorLogs` jimjit turdi va sukunat "hammasi joyida" deb o'qildi. Aslida
// qurilmada eski `index.html` qolib ketgan, u esa Vercel allaqachon
// o'chirgan JS ga murojaat qilardi (har deploy oldingi paketni o'chiradi).
const ALWAYS_REPORT = [
  'dynamically imported module',
  'Loading chunk',
  'Importing a module script failed',
  'Paket fayli yuklanmadi',
];

function logToServer(message, stack, severity = 'error', context = null) {
  if (!import.meta.env.PROD) return;                 // /api serverless faqat productionда bor
  const msg = String(message || 'unknown');
  const mustReport = ALWAYS_REPORT.some(p => msg.includes(p));
  if (!mustReport) {
    if (IGNORE.some(p => msg.includes(p))) return;
    if (IGNORE_EXACT.includes(msg.trim())) return;
  }
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
      // `uid` YUBORILMAYDI — server uni tokendan o'zi ajratadi. Token bo'lmasa
      // log anonim yoziladi (login'gacha bo'lgan crash'lar shunday keladi).
      idToken: currentToken,
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

// ── Firestore KESH assertion xatosi → keshni tozalab, bir marta reload ──
// Modul dinamik yuklanadi: dastlabki bundle'ga og'irlik qo'shmaydi.
//
// ⚠️ 2026-08-28: shart `isFirestoreAssertion` dan `isRecoverableAssertion`
// ga o'zgartirildi. Ma'lumot validatsiyasi assertion'ida (ID 3029) reload
// hech narsani tuzatmaydi, lekin imtihon yakunlayotgan odamni natija
// ekranidan uloqtiradi — sababi `firestoreRecovery.js` izohida.
function maybeRecoverFirestore(message) {
  import('./firestoreRecovery')
    .then(({ isRecoverableAssertion, recoverFirestore }) => {
      if (isRecoverableAssertion(message)) recoverFirestore();
    })
    .catch(() => { /* Tiklanish moduli yuklanmadi — ilova o'z holicha davom etadi */ });
}

// ── Ishga tushirish (main.jsx chaqiradi) ──
export function initSentry() {
  // 1. Global crash'larni Firestore'ga log qilish — Sentry'dan MUSTAQIL
  if (typeof window !== 'undefined') {
    // ── Paket fayli yuklanmadi (script/link 404) ──
    // Resurs xatolari DOM'da ko'pikka CHIQMAYDI, shuning uchun pastdagi oddiy
    // tinglovchi ularni ko'ra olmaydi (u `e.error` talab qiladi, resurs
    // xatosida esa u yo'q). Faqat capture bosqichi ushlaydi.
    //
    // NEGA MUHIM: qurilmada eski `index.html` qolib ketsa, u Vercel
    // allaqachon o'chirgan chunk'ga murojaat qiladi — sahifa jimgina
    // ochilmaydi. Dastlabki paket uchun bundan ham ilgari index.html dagi
    // boot qo'riqchisi ishlaydi (u bundle'dan tashqarida); bu tinglovchi
    // ishga tushgandan KEYINGI lazy chunk'larni qoplaydi.
    window.addEventListener('error', (e) => {
      const t = e.target;
      if (!t || t === window || !t.tagName) return;
      const src = t.src || t.href || '';
      if (!src.includes('/assets/')) return;
      logToServer(`Paket fayli yuklanmadi: ${src}`, null, 'error', { tag: t.tagName });
    }, true);

    window.addEventListener('error', (e) => {
      if (!e.error) return; // resurs xatolari yuqoridagi capture tinglovchida
      const msg = e.message || 'window.onerror';
      logToServer(msg, e.error.stack, 'error');
      maybeRecoverFirestore(msg);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      const msg = r?.message || String(r) || 'unhandledrejection';
      logToServer(msg, r?.stack, 'error');
      maybeRecoverFirestore(msg);
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
  if (Sentry && user) Sentry.setUser({ id: user.uid });

  // Tokenni oldindan olib qo'yamiz — crash paytida await qilish imkoni yo'q.
  // Xatolik yutiladi: kuzatuv HECH QACHON ilovani buzmasligi kerak.
  const fbUser = user?._firebaseUser;
  if (fbUser?.getIdToken) {
    fbUser.getIdToken().then((t) => { currentToken = t; }).catch(() => { currentToken = null; });
  } else {
    currentToken = null;
  }
}

export function clearUser() {
  currentToken = null;
  if (Sentry) Sentry.setUser(null);
}
