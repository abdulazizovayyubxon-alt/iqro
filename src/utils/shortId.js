// Formatlash: 1-harif + 4 xonali raqam (masalan A0001, A9999, B0001...)
//
// AUDIT 2026-08-05, 19-BAND: `String.fromCharCode(65 + letterIndex)` 26 ta
// harfdan keyin (26 × 9999 = 259 974 foydalanuvchi) alifbodan chiqib `[`, `\`,
// `]` kabi belgilar berardi. Endi chegaradan oshganda ikki harfli prefiksga
// o'tadi (AA0001, AB0001, ...) — format buzilmaydi.
//
// ⚠️ Bu funksiya endi FAQAT ko'rsatish/skriptlar uchun (scripts/backfill-short-ids.mjs).
// Haqiqiy raqam berish serverda — api/_shared.js `ensureShortIdAdmin`.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PER_LETTER = 9999;

export const formatShortId = (seq) => {
  const idx = Math.floor((seq - 1) / PER_LETTER);
  const digits = ((seq - 1) % PER_LETTER) + 1;
  const num = String(digits).padStart(4, '0');

  if (idx < LETTERS.length) {
    return `${LETTERS[idx]}${num}`;
  }
  // 26 harf tugadi → ikki harfli prefiks (AA, AB, ... ZZ = yana 6.7M o'rin)
  const over = idx - LETTERS.length;
  const first = LETTERS[Math.floor(over / LETTERS.length) % LETTERS.length];
  const second = LETTERS[over % LETTERS.length];
  return `${first}${second}${num}`;
};

// ─────────────────────────────────────────────────────────────────────────
// ensureShortId — ID ni SERVERDAN so'raydi.
//
// ⚠️ 2026-08-14 TEKSHIRUVI — nima uchun mijoz endi hisoblagichga tegmaydi:
// 99 hisobdan 17 tasi ID'siz edi (hammasi 6–8 avgust). Mijoz `meta/counters`
// hujjatiga o'zi tranzaksiya yozardi, firestore.rules esa yangi qiymat
// eskisidan AYNAN +1 bo'lishini talab qiladi. Ikki kishi bir vaqtda ursa,
// mag'lubi ABORTED emas PERMISSION_DENIED oladi — Firestore SDK bunday
// xatoni qayta urinmaydi. Qo'lda 6 marta qayta urinish ham yetmasdi, chunki
// ID'siz qolganlar har ilova ochilishida o'sha bitta hujjatga qayta urinib,
// uni doimiy "issiq nuqta"ga aylantirgan edi.
//
// Endi raqamni Admin SDK beradi (qoidalardan ozod, raqobatda o'zi qayta
// urinadi), foydalanuvchi hujjati va hisoblagich esa BIR tranzaksiyada
// yangilanadi. Mijozning vazifasi — bir marta so'rash.
//
// Kafolat zanjiri: ro'yxatdan o'tish → shu chaqiruv → api?action=register
// (server yana bir bor tekshiradi) → cron-daily kechasi qolganini to'ldiradi.
const inFlight = new Map();

export function ensureShortId(firebaseUser) {
  const uid = firebaseUser?.uid;
  if (!uid) return Promise.resolve(null);
  if (inFlight.has(uid)) return inFlight.get(uid);

  const task = (async () => {
    const token = await firebaseUser.getIdToken();
    const res = await fetch('/api/notify-admin?action=ensure-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`ensure-id: HTTP ${res.status}`);
    const data = await res.json();
    return typeof data?.shortId === 'string' && data.shortId ? data.shortId : null;
  })().finally(() => inFlight.delete(uid));

  inFlight.set(uid, task);
  return task;
}
