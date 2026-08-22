import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * `settings/*` hujjatlari uchun keshli o'qish.
 *
 * ════════════════════════════════════════════════════════════════════
 *  NEGA BOR — O'QISH BYUDJETI
 * ════════════════════════════════════════════════════════════════════
 * Bu hujjatlar oyiga bir marta o'zgaradi, lekin `deps: []` bilan yozilgan
 * `useEffect` ular ichida HAR MOUNT'da qayta o'qirdi. Dashboard asosiy
 * sahifa — foydalanuvchi unga seansda 3-4 marta qaytadi, ya'ni faqat
 * `questionMeta` + `premium` uchun 6-8 ta o'qish sarflanardi (butun qolgan
 * seans ~8 ta).
 *
 * Naqsh yangi emas: `src/utils/examDate.js` `settings/exam` uchun aynan
 * shuni 6 soatlik TTL bilan qiladi. Shu yerda umumlashtirildi.
 *
 * ⚠️ NIMANI KESHLAMASLIK KERAK — TRANZAKSIYA YO'LI
 * `settings/premium` (tariflar) ikki xil ishlatiladi:
 *   · KO'RSATUV (Dashboard banneri «kuniga … so'mdan») — kesh MUMKIN;
 *   · TO'LOV (PremiumModal → Click havolasi summasi) — kesh MUMKIN EMAS.
 * Sabab: `api/payment-webhook.js:218` summani AYNAN o'sha hujjatdagi narx
 * bilan solishtiradi va mos kelmasa to'lovni `amount_mismatch` bilan rad
 * etadi. Admin narxni o'zgartirsa, keshdagi eski narx bilan yaratilgan
 * havola to'lanmay qolardi — foydalanuvchi pulini to'lay olmaydi va sababini
 * bilmaydi. Shuning uchun PremiumModal ataylab TO'G'RIDAN-TO'G'RI o'qiydi.
 *
 * `settings/version` uchun `scope: 'session'` ishlatiladi (TTL yo'q):
 * savol paketining yangiligi muhim, shuning uchun har ilova ochilishida
 * qayta o'qiladi — faqat BITTA seans ichidagi takroriy o'qish yo'qoladi.
 */

const KEY = (id) => `zehin_settings_${id}`;

/** Standart TTL — `examDate.js` dagi GLOBAL_TTL_MS bilan bir xil. */
export const SETTINGS_TTL_MS = 6 * 60 * 60 * 1000;

// Bir sahifa yuklanishida bir xil hujjatga parallel so'rov ketmasin
// (masalan Dashboard va boshqa komponent bir vaqtda so'rasa).
const inflight = new Map();

const store = (scope) => (scope === 'session' ? sessionStorage : localStorage);

/** @returns keshdagi qiymat (`null` ham haqiqiy qiymat: «hujjat yo'q»), yoki `undefined` = kesh yo'q */
const readCache = (id, ttlMs, scope) => {
  try {
    const raw = store(scope).getItem(KEY(id));
    if (!raw) return undefined;
    const c = JSON.parse(raw);
    if (ttlMs != null && Date.now() - (c.ts || 0) > ttlMs) return undefined;
    return c.data;
  } catch {
    return undefined;
  }
};

/** TTL'ga qaramay keshdagi qiymat — tarmoq xatosida zaxira sifatida. */
const readStale = (id, scope) => readCache(id, null, scope);

const writeCache = (id, data, scope) => {
  try {
    store(scope).setItem(KEY(id), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* kvota to'lgan yoki private rejim — kesh ixtiyoriy */
  }
};

/**
 * Keshni bekor qilish. Admin hujjatni yangilagandan keyin chaqiriladi —
 * aks holda o'zgarishni kiritgan odamning o'zi uni 6 soat ko'rmasdi.
 */
export const invalidateSettings = (id) => {
  try { localStorage.removeItem(KEY(id)); } catch { /* private rejim */ }
  try { sessionStorage.removeItem(KEY(id)); } catch { /* private rejim */ }
  inflight.delete(`local:${id}`);
  inflight.delete(`session:${id}`);
};

/**
 * `settings/{id}` hujjatini keshdan yoki Firestore'dan oladi.
 *
 * @param {string} id — hujjat nomi (`questionMeta`, `premium`, `version` …)
 * @param {{ ttlMs?: number|null, scope?: 'local'|'session' }} [opts]
 * @returns {Promise<object|null>} hujjat ma'lumoti yoki `null` (hujjat yo'q).
 *   Tarmoq xatosida eski kesh qaytadi, u ham bo'lmasa `null` — chaqiruvchi
 *   hech qachon `throw` ni ko'rmaydi, chunki bu ikkinchi darajali ma'lumot.
 */
export const getSettings = async (id, { ttlMs = SETTINGS_TTL_MS, scope = 'local' } = {}) => {
  const cached = readCache(id, ttlMs, scope);
  if (cached !== undefined) return cached;

  const key = `${scope}:${id}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = getDoc(doc(db, 'settings', id))
    .then((snap) => {
      const data = snap.exists() ? snap.data() : null;
      // Yo'qligini ham keshlaymiz: hujjat yaratilmagan bo'lsa har mount'da
      // qayta so'rash bekorga o'qish bo'lardi.
      writeCache(id, data, scope);
      return data;
    })
    .catch((e) => {
      console.warn(`settings/${id} o'qilmadi:`, e?.code || e?.message || e);
      const stale = readStale(id, scope);
      return stale === undefined ? null : stale;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
};

export default getSettings;
