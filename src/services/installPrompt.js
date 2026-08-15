/**
 * installPrompt.js — brauzerning "ilovani o'rnatish" taklifini ushlab turadi.
 *
 * `beforeinstallprompt` sahifa yuklangandan keyin BIR MARTA otiladi va uni
 * o'sha zahoti ushlab qolmasa yo'qoladi. Shu sababli tinglovchi modul import
 * qilinishi bilan (React daraxti qurilishidan oldin) o'rnatiladi.
 *
 * `preventDefault()` — brauzerning o'z taklif tasmasini to'xtatadi, biz uni
 * o'z oynamizda, o'zimiz tanlagan paytda ko'rsatamiz.
 */

let deferred = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(!!deferred));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export const canInstall = () => !!deferred;

/** Holat o'zgarishini kuzatish — tozalash funksiyasini qaytaradi. */
export function onInstallAvailability(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Brauzerning o'rnatish oynasini ochadi. Taklif bir martalik — ishlatilgach
 * yo'qoladi (rad etilsa ham), shuning uchun tozalab qo'yamiz.
 * @returns {Promise<boolean>} foydalanuvchi o'rnatishga rozi bo'ldimi
 */
export async function promptInstall() {
  if (!deferred) return false;
  const evt = deferred;
  deferred = null;
  notify();
  try {
    evt.prompt();
    const { outcome } = await evt.userChoice;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

/** Ilova allaqachon o'rnatilgan holatda ochilganmi (PWA/TWA). */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator.standalone === true;
}
