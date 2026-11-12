/**
 * userStorage.js — Hisobga bog'langan va brendlangan localStorage kalitlari.
 *
 * Umumiy telefonda bir hisobdan chiqib ikkinchisiga kirilganda avvalgi
 * foydalanuvchining rejalari, bannerlari yoki tabrik oynalari keyingisiga
 * aralashib ketmasligi uchun kalitlar `uid` bilan ajratiladi (`zehin_*_${uid}`).
 */

export const scopedKey = (base, uid) => (uid ? `${base}_${uid}` : base);

export function readScopedStorage(base, uid, legacyKeys = []) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const key = scopedKey(base, uid);
    const val = localStorage.getItem(key);
    if (val !== null) return val;
    for (const legacy of legacyKeys) {
      const legacyVal = localStorage.getItem(legacy);
      if (legacyVal !== null) return legacyVal;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeScopedStorage(base, uid, value, legacyKeys = []) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(base, uid), value);
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch { /* kvota yoki private rejim */ }
}

export function removeScopedStorage(base, uid, legacyKeys = []) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(scopedKey(base, uid));
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
