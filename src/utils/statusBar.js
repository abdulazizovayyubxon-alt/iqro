/**
 * statusBar.js — status-bar rangini (meta[name="theme-color"]) boshqarish.
 *
 * MUAMMO: o'rnatilgan PWA'da (display:standalone) status-bar viewport'dan
 * TASHQARIDA turadi — uni CSS bilan bo'yab bo'lmaydi, rangi faqat shu meta
 * orqali belgilanadi. Splash to'q navy (#0A2440), status-bar esa tema rangi
 * (och #F4F3EF) bo'lgani uchun ilova ochilganda tepada och tasma qolib,
 * "ekranga to'liq ochilmagandek" ko'rinardi.
 *
 * YECHIM: splash ko'rinib turgan paytda status-bar ham navy bo'ladi, splash
 * yopilganda tema rangiga qaytadi.
 *
 * NEGA SANOQCHI: splash'lar bir-birining ustiga tushadi — SimpleSplash ~1s
 * dan keyin yopiladi, lekin Firebase sekin bo'lsa App'ning navy "yuklanmoqda"
 * ekrani hali turgan bo'ladi. Oddiy true/false bilan status-bar o'rtada bir
 * lahzaga och rangga sakrardi; sanoqchi bilan rang faqat OXIRGI splash
 * yopilganda qaytadi.
 *
 * iOS standalone'da status-bar sohasi sahifa FON rangini oladi (meta emas) —
 * shuning uchun splash paytida <html> ga `splash-active` klassi ham qo'yiladi.
 * O'sha klassning CSS'i index.html ichidagi splash <style> blokida (birinchi
 * bo'yoqdan ishlashi uchun — index.css keyinroq yuklanadi).
 */

/** Splash foni — brend-kitob §5 "To'q navy". index.html va SimpleSplash bilan bir xil. */
export const SPLASH_BG = '#0A2440';

/** Tema fonlari — index.css dagi --bg qiymatlari bilan bir xil bo'lishi SHART. */
export const THEME_COLORS = { light: '#F4F3EF', sepia: '#F5EEDD', dark: '#070B16' };

const SPLASH_CLASS = 'splash-active';

let splashDepth = 0;
let baseColor = null; // joriy tema rangi; null bo'lsa localStorage'dan o'qiladi

function readSavedThemeColor() {
  try {
    const t = localStorage.getItem('iqro-theme') || localStorage.getItem('chqbt-theme');
    return THEME_COLORS[t] || THEME_COLORS.light;
  } catch {
    return THEME_COLORS.light; // localStorage bloklangan bo'lishi mumkin
  }
}

function writeThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}

/**
 * Tema almashganda status-bar rangini yangilaydi.
 * Splash turgan bo'lsa faqat eslab qo'yadi — rang splash yopilgach qo'llanadi.
 * @param {'light'|'sepia'|'dark'} theme
 */
export function applyThemeColor(theme) {
  baseColor = THEME_COLORS[theme] || THEME_COLORS.light;
  if (splashDepth === 0) writeThemeColor(baseColor);
}

/** Splash ochildi — status-bar va sahifa foni navy bo'ladi. */
export function enterSplash() {
  splashDepth += 1;
  document.documentElement.classList.add(SPLASH_CLASS);
  writeThemeColor(SPLASH_BG);
}

/** Splash yopildi — oxirgisi bo'lsa tema rangiga qaytadi. */
export function exitSplash() {
  splashDepth = Math.max(0, splashDepth - 1);
  if (splashDepth > 0) return;
  document.documentElement.classList.remove(SPLASH_CLASS);
  writeThemeColor(baseColor || readSavedThemeColor());
}
