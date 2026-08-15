/**
 * interrupts.js — "kechiktirsa bo'ladigan e'tibor" oynalari uchun jimlik hisobi.
 *
 * NEGA YAGONA JOYDA: bu naqsh bir nechta joyda ishlatiladi (obuna, yangilanish,
 * zanjir, push, o'rnatish). Agar har biri o'z hisobini yuritsa, foydalanuvchi bir
 * ochilishda ketma-ket 3 ta oyna ko'radi va refleks bilan ✕ bosadigan bo'lib
 * qoladi — natijada HAMMASINING kuchi yo'qoladi, jumladan eng muhimlarining ham.
 *
 * Uch qatlamli tiyilish:
 *   1. jimlik  — "keyinroq" bosilsa shu oyna N vaqtga o'chadi (localStorage);
 *   2. limit   — ba'zilari umuman N martadan ortiq so'ralmaydi (masalan push);
 *   3. sessiya — bir ochilishda FAQAT BITTA oyna chiqadi (sessionStorage).
 */

const PREFIX = 'zehin_intr_';
const SESSION_SHOWN = `${PREFIX}session_shown`;

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// localStorage private rejim / ichki brauzerlarda otilishi mumkin — hech qachon
// qulash sababi bo'lmasligi kerak, jimlik yo'qolsa ham ilova ishlayveradi.
const read = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* bloklangan saqlash */ }
};
const drop = (key) => {
  try { localStorage.removeItem(key); } catch { /* bloklangan saqlash */ }
};

// ── Jimlik ────────────────────────────────────────────────────────────────────

export function isSnoozed(id) {
  const until = Number(read(`${PREFIX}${id}_until`)) || 0;
  return Date.now() < until;
}

export function snooze(id, ms) {
  write(`${PREFIX}${id}_until`, String(Date.now() + ms));
}

export function clearSnooze(id) {
  drop(`${PREFIX}${id}_until`);
}

// ── So'rov soni ───────────────────────────────────────────────────────────────

export function askCount(id) {
  return Number(read(`${PREFIX}${id}_asks`)) || 0;
}

export function bumpAsk(id) {
  write(`${PREFIX}${id}_asks`, String(askCount(id) + 1));
}

// ── Sessiya chegarasi ─────────────────────────────────────────────────────────
// sessionStorage ATAYLAB: "sessiya" = ilovaning bitta ochilishi. localStorage
// bo'lsa chegara kunlab saqlanib, hech qachon oyna chiqmay qolardi.

export function shownThisSession() {
  try { return window.sessionStorage.getItem(SESSION_SHOWN) === '1'; } catch { return false; }
}

export function markShownThisSession() {
  try { window.sessionStorage.setItem(SESSION_SHOWN, '1'); } catch { /* bloklangan */ }
}

/** Kechgacha emas, ertagacha jim bo'lish — zanjir kabi kunlik holatlar uchun. */
export function msUntilTomorrow() {
  const t = new Date();
  t.setHours(24, 0, 0, 0); // keyingi yarim tun
  return Math.max(HOUR, t.getTime() - Date.now());
}
