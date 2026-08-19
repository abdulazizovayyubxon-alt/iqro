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

// ── Qisqa foydalanuvchi ID (A0001…) ─────────────────────────────────────
//
// ⚠️ 2026-08-14 TEKSHIRUVI — nima uchun ID berish SERVERGA ko'chirildi:
// 99 hisobdan 17 tasida ID yo'q edi, hammasi 6–8 avgustda ro'yxatdan
// o'tganlar. Sabab zanjiri:
//   1) ID mijoz tomonda `meta/counters` hujjatiga tranzaksiya bilan
//      yozilardi — bu BITTA umumiy hujjat, ya'ni "issiq nuqta";
//   2) firestore.rules yangi qiymat eskisidan AYNAN +1 bo'lishini talab
//      qiladi. Raqobatda mag'lub tranzaksiya ABORTED emas,
//      PERMISSION_DENIED oladi — Firestore SDK bunday xatoni O'ZI qayta
//      urinmaydi (faqat ABORTED ni);
//   3) mijozdagi `catch → null` xatoni yutardi, foydalanuvchi ID'siz
//      qolardi va faqat KEYINGI kirishda yana urinib ko'rilardi. Kim
//      qaytmasa — ID'siz qolaverardi.
//
// Admin SDK qoidalarni chetlab o'tadi va raqobatda tranzaksiyani O'ZI
// qayta urinib bajaradi, shuning uchun bu yerda 2-band umuman yuzaga
// kelmaydi. Foydalanuvchi hujjati va hisoblagich BIR tranzaksiyada
// yangilanadi — ya'ni raqam olinib, yozuv yiqilishi (raqam yo'qolishi)
// ham mumkin emas.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PER_LETTER = 9999;

export function formatShortId(seq) {
  const idx = Math.floor((seq - 1) / PER_LETTER);
  const num = String(((seq - 1) % PER_LETTER) + 1).padStart(4, '0');
  if (idx < LETTERS.length) return `${LETTERS[idx]}${num}`;
  // 26 harf tugadi → ikki harfli prefiks (AA, AB, ... ZZ)
  const over = idx - LETTERS.length;
  return `${LETTERS[Math.floor(over / LETTERS.length) % LETTERS.length]}${LETTERS[over % LETTERS.length]}${num}`;
}

/**
 * Foydalanuvchiga qisqa ID beradi. IDEMPOTENT: ID allaqachon bo'lsa
 * hech narsa yozmaydi va mavjudini qaytaradi (ko'rilgan ID hech qachon
 * o'zgarmaydi). Foydalanuvchi hujjati yo'q bo'lsa `null`.
 *
 * @param {FirebaseFirestore.Firestore} db  Admin SDK Firestore
 * @param {string} uid
 * @returns {Promise<string|null>}
 */
export async function ensureShortIdAdmin(db, uid) {
  if (!uid) return null;
  const userRef = db.collection('users').doc(uid);
  const counterRef = db.collection('meta').doc('counters');

  return db.runTransaction(async (tx) => {
    // Admin SDK tranzaksiyasida BARCHA o'qishlar yozuvdan oldin bo'lishi shart.
    const [uSnap, cSnap] = await tx.getAll(userRef, counterRef);
    if (!uSnap.exists) return null;

    const existing = uSnap.data().shortId;
    if (typeof existing === 'string' && existing) return existing;

    const next = (cSnap.exists ? (cSnap.data().userSeq || 0) : 0) + 1;
    const shortId = formatShortId(next);
    tx.set(counterRef, { userSeq: next }, { merge: true });
    tx.set(userRef, { shortId }, { merge: true });
    return shortId;
  });
}

// ── Cron yurishining izi (`meta/cronHealth`) ────────────────────────────
//
// ⚠️ 2026-08-19 TEKSHIRUVI — NEGA BU KERAK BO'LDI:
// 11 ta hisob ID'siz qolgani aniqlandi. ID berishning ZAXIRA yo'li
// (`cron-daily` kechasi to'ldiradi) qog'ozda bor edi, amalda esa cron
// BIRON MARTA ishlamagan: `metrics/*` hujjatlari umuman yo'q,
// `settings/leaderboard` yo'q, 357 hisobning HECH BIRIDA `notifyWelcomeSent`
// bayrog'i yo'q, muddati o'tgan Pro esa hamon `isPremium: true`.
// Sabab — endpoint `verifySecret` bilan deny-by-default himoyalangan, ya'ni
// Vercel `CRON_SECRET` env'i bo'lmasa har chaqiruv 401 bilan qaytadi.
//
// Eng yomoni: BUNI KO'RSATADIGAN JOY YO'Q edi. Panel "hali ma'lumot
// yig'ilmagan, ertaga paydo bo'ladi" deb turardi — ya'ni o'n kunlik
// nosozlik odatiy kutishga o'xshab ko'rinardi.
//
// Endi har yurish IZ qoldiradi: boshida `startedAt`, oxirida `finishedAt`.
// Uch holat farqlanadi va uchalasi ham panelda ko'rinadi:
//   · hujjat YO'Q            → cron umuman chaqirilmayapti (401 / sozlanmagan)
//   · startedAt eski         → jadval ishlamayapti
//   · finishedAt < startedAt → chaqirildi, lekin yarim yo'lda uzildi (60s)
//
// Narxi: kuniga 2 ta yozuv. Yozuv XATOSI cron'ni to'xtatmaydi — kuzatuv
// asosiy ishdan muhimroq bo'lib qolmasligi kerak.
export async function cronHeartbeat(db, job, patch) {
  try {
    await db.collection('meta').doc('cronHealth').set({ [job]: patch }, { merge: true });
  } catch (e) {
    console.warn(`cronHeartbeat(${job}):`, e?.message);
  }
}

// ── Hafta / oy identifikatorlari ────────────────────────────────────────
//
// ⚠️ BU FUNKSIYALAR `src/context/AppContext.jsx` DAGILAR BILAN AYNI SATRNI
// QAYTARISHI SHART. Ular `userStats` hujjatidagi MAYDON NOMI bo'ladi
// (`weekly_2026_W33`, `monthly_2026_M08`). Bir belgi farq qilsa server
// boshqa maydonni o'qiydi/yozadi va reyting jimgina bo'sh chiqadi.
//
// NEGA TOSHKENT VAQTI: mijozdagi nusxalar brauzerning MAHALLIY vaqtidan
// foydalanadi (foydalanuvchilar O'zbekistonda, UTC+5), server esa UTC'da
// ishlaydi. Siljitmasak, oyning 1-sanasida 00:00–05:00 (Toshkent) oralig'ida
// server hali oldingi oyda bo'lardi va boshqa maydonga yozardi.
// (`cron-daily.js` dagi `dayKey` ham aynan shu sabab +5 soat siljitiladi.)
const TASHKENT_OFFSET_MS = 5 * 3600_000;
const toTashkent = (date) => new Date(date.getTime() + TASHKENT_OFFSET_MS);

/** ISO-8601 hafta raqami — `YYYY_Www` */
export function getWeekId(date = new Date()) {
  const tk = toTashkent(date);
  // Mijozdagi nusxa mahalliy kalendar sanasini olib, uni UTC deb qaraydi.
  // Bu yerda ham xuddi shunday: siljitilgan sananing UTC qismlari = Toshkent
  // mahalliy sanasi.
  const d = new Date(Date.UTC(tk.getUTCFullYear(), tk.getUTCMonth(), tk.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}_W${String(weekNo).padStart(2, '0')}`;
}

/** Oy identifikatori — `YYYY_MM` */
export function getMonthId(date = new Date()) {
  const tk = toTashkent(date);
  return `${tk.getUTCFullYear()}_M${String(tk.getUTCMonth() + 1).padStart(2, '0')}`;
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
