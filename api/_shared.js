/**
 * ════════════════════════════════════════════════════════════
 *  api/_shared.js — endpointlar uchun umumiy xavfsizlik yordamchilari
 * ════════════════════════════════════════════════════════════
 *
 *  DIQQAT: fayl nomi `_` bilan boshlanadi — Vercel bunday fayllarni
 *  serverless funksiya DEB HISOBLAMAYDI (Hobby rejasidagi 12 funksiya
 *  chegarasiga kirmaydi). Faqat import qilinadigan modul.
 *
 *  Nima uchun kerak:
 *   1. `secret !== process.env.X` naqshi env sozlanmaganda IKKALASI
 *      `undefined` bo'lib, tekshiruvni CHETLAB O'TADI. Bu yerdagi
 *      verifySecret() deny-by-default ishlaydi.
 *   2. Imzo/maxfiy kalit taqqoslash doimiy vaqtda bo'lishi kerak.
 *   3. `x-forwarded-for` — vergul bilan ajratilgan ro'yxat; xom holda
 *      kalit sifatida ishlatilsa, mijoz header qo'shib rate-limitni
 *      chetlab o'tadi. clientIp() FAQAT ishonchli qismini oladi.
 * ════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

// ── Doimiy vaqtli satr taqqoslash ────────────────────────────────────────
// Uzunliklar farq qilsa timingSafeEqual tashlaydi — shuning uchun avval
// har ikkalasini SHA-256 ga o'tkazamiz (hosil doim 32 bayt).
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Maxfiy kalit tekshiruvi — DENY BY DEFAULT.
 * Env o'zgaruvchisi sozlanmagan bo'lsa DOIM `false` qaytaradi.
 *
 * @param {string|undefined} provided  so'rovdan kelgan qiymat
 * @param {string|undefined} expected  process.env.X
 */
export function verifySecret(provided, expected) {
  if (!expected || typeof expected !== 'string' || expected.length < 8) return false;
  if (!provided || typeof provided !== 'string') return false;
  return safeEqual(provided, expected);
}

/**
 * Cron/servis so'rovidagi maxfiy kalitni ajratib olish.
 * Vercel Cron `Authorization: Bearer <CRON_SECRET>` headerini O'ZI qo'shadi
 * (agar CRON_SECRET env'da bo'lsa). Query parametri qo'lda sinov uchun.
 */
export function extractSecret(req) {
  const auth = req.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const q = req.query?.secret;
  return typeof q === 'string' ? q : null;
}

// ── Mijoz IP manzili ────────────────────────────────────────────────────
// Vercel `x-forwarded-for`ga HAQIQIY mijoz IP'sini birinchi element qilib
// qo'yadi; mijoz o'zi header yuborsa, u ORTIDAN qo'shiladi. Demak ishonchli
// qism — BIRINCHI element. (Xom `x-forwarded-for` kalit sifatida ishlatilsa,
// hujumkor har so'rovda boshqa qiymat yuborib limitni chetlab o'tardi.)
export function clientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'anonymous';
}

// ── Rate limiting (jarayon xotirasida) ──────────────────────────────────
//
// ⚠️ CHEKLOV — HUJJATLASHTIRILGAN, YASHIRILMAGAN:
// Serverless'da har lambda nusxasi o'z xotirasiga ega va nusxalar yuk ostida
// ko'payadi. Demak samarali chegara = LIMIT × faol nusxa soni. Bu himoya
// tasodifiy toshqin va oddiy skriptni to'xtatadi, lekin TAQSIMLANGAN yoki
// IP aylantiruvchi hujumni TO'XTATMAYDI.
//
// Haqiqiy himoya uchun (keyingi bosqich): Firebase App Check + Upstash Redis.
// Shu sababli quyidagi funksiyalardan tashqari, MUHIM endpointlar Firebase
// ID token ham talab qiladi — rate-limit yolg'iz himoya emas.
const buckets = new Map();
const MAX_KEYS = 5000;

export function rateLimit(key, limit, windowMs = 60_000) {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets.entries()) {
      const alive = v.filter((t) => now - t < windowMs);
      if (alive.length === 0) buckets.delete(k);
      else buckets.set(k, alive);
    }
  }

  const times = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  times.push(now);
  buckets.set(key, times);
  return { limited: times.length > limit, count: times.length };
}

// ── Firebase Admin (bir marta ishga tushirish) ──────────────────────────
// Har endpoint o'z getDb()siga ega bo'lgani uchun bu yerda faqat maxfiy
// kalitni ajratish mantiqini birlashtiramiz.
export function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT sozlanmagan');
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString());
  }
}

/**
 * Bearer ID tokenni ajratib olish (tekshirmaydi — chaqiruvchi
 * getAuth().verifyIdToken() bilan tekshiradi).
 */
export function extractBearer(req) {
  const auth = req.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// ── Kiritilgan matnni cheklash ──────────────────────────────────────────
export const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

/**
 * Ixtiyoriy obyektni XAVFSIZ hajmga keltirish — Firestore'ga nazoratsiz
 * katta/chuqur obyekt yozilishini to'xtatadi (kvota/xarajat himoyasi).
 */
export function clampObject(obj, maxChars = 2000) {
  if (!obj || typeof obj !== 'object') return null;
  try {
    const s = JSON.stringify(obj);
    if (s.length <= maxChars) return JSON.parse(s);
    return { _truncated: true, _preview: s.slice(0, maxChars) };
  } catch {
    return null;
  }
}
