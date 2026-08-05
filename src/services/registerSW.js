/**
 * Service Worker'ni QO'LDA ro'yxatga olish
 *
 * NEGA qo'lda? vite-plugin-pwa avtomatik yaratadigan `/registerSW.js` shunday edi:
 *     navigator.serviceWorker.register('/sw.js', { scope: '/' })
 * — ya'ni `.catch()` YO'Q. Quyidagi holatlarda brauzer ro'yxatga olishni rad etadi:
 *   • Safari/Chrome private (inkognito) rejimi
 *   • Ichki brauzerlar (Telegram, Instagram, Facebook webview)
 *   • Saytlararo saqlash (storage) bloklangan qurilmalar
 * Rad etilgan Promise ushlanmasa → `unhandledrejection` → services/sentry.js uni
 * xato deb Firestore'ga yozadi → admin "Xatolar" bo'limi "Rejected" bilan to'ladi.
 *
 * SW bo'lmasligi QULASH EMAS — shunchaki offline kesh va yangilanish so'rovi
 * ishlamaydi. Shuning uchun xatoni jimgina yutamiz.
 *
 * vite.config.js da `injectRegister: null` — avtomatik skript endi qo'shilmaydi.
 */

export function registerServiceWorker() {
  // `/sw.js` faqat production build'ida mavjud (devOptions yoqilmagan) —
  // dev'da ro'yxatga olishga urinish 404 beradi, shuning uchun o'tkazib yuboramiz.
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* Private rejim / ichki brauzer — offline kesh yo'q, ilova ishlayveradi */
    });
  });
}
