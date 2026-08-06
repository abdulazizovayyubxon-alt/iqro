import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

// Formatlash: 1-harif + 4 xonali raqam (masalan A0001, A9999, B0001...)
//
// AUDIT 2026-08-05, 19-BAND: `String.fromCharCode(65 + letterIndex)` 26 ta
// harfdan keyin (26 × 9999 = 259 974 foydalanuvchi) alifbodan chiqib `[`, `\`,
// `]` kabi belgilar berardi. Endi chegaradan oshganda ikki harfli prefiksga
// o'tadi (AA0001, AB0001, ...) — format buzilmaydi.
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

// Ro'yxatdan o'tishda har bir foydalanuvchiga unikal, ketma-ket qisqa ID beriladi.
// meta/counters hujjatidagi userSeq maydoni transaction orqali oshiriladi (poyga holatidan himoya).
//
// ⚠️ NEGA QO'LDA QAYTA URINISH KERAK (2026-08-06 tekshiruvi):
// firestore.rules:301 `userSeq == resource.data.userSeq + 1` ni talab qiladi.
// Ikki tranzaksiya bir vaqtda `userSeq=5` ni o'qisa, birinchisi 6 yozadi;
// ikkinchisi ham 6 yozmoqchi bo'lganda qoida `6 == 6+1` ni tekshirib FALSE
// beradi. Ya'ni server ABORTED emas, PERMISSION_DENIED qaytaradi — Firestore
// SDK esa faqat ABORTED ni avtomatik retry qiladi. Natijada raqobat
// tranzaksiyasi jimgina o'lardi va foydalanuvchi ID'siz qolardi.
const MAX_ATTEMPTS = 6;

export async function getNextShortId(db) {
  const counterRef = doc(db, 'meta', 'counters');

  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const seq = await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const next = (snap.exists() ? (snap.data().userSeq || 0) : 0) + 1;
        tx.set(counterRef, { userSeq: next }, { merge: true });
        return next;
      });
      return formatShortId(seq);
    } catch (e) {
      lastErr = e;
      // Raqobat (permission-denied/aborted/unavailable) — qayta o'qib urinamiz.
      // Boshqa xatolar (masalan tarmoq yo'q) ham shu yerga tushadi; qisqa
      // kutishdan keyingi urinish ularga ham zarar qilmaydi.
      await new Promise(r => setTimeout(r, 60 * (attempt + 1) + Math.random() * 80));
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────────────────────────────────
// ensureShortId — ID berishning YAGONA nuqtasi.
//
// ⚠️ 2026-08-06: avval ID ikki joyda alohida generatsiya qilinardi
// (AuthContext ro'yxatdan o'tish tarmog'i + onAuthStateChanged tinglovchisi).
// Ular bir vaqtda ishga tushib bitta hisoblagichga urilardi, mag'lub tomon
// `catch → null` bilan yutilar va o'sha `null` foydalanuvchi hujjatiga
// YOZILARDI — yaxshi qiymat ustidan bosib. 22 hisobdan 20 tasi shu sababli
// ID'siz qolgan edi.
//
// Endi:
//  • bitta sahifada bir uid uchun bir vaqtda faqat bitta generatsiya ketadi
//    (inFlight xaritasi) — o'z-o'ziga raqobat butunlay yo'q;
//  • mavjud ID qayta yozilmaydi;
//  • generatsiya muvaffaqiyatsiz bo'lsa hujjatga HECH NARSA yozilmaydi
//    (`null` yozish taqiqlanadi) — keyingi kirishda yana urinib ko'riladi;
//  • yozuv faqat `shortId` maydoniga tegadi. Bu muhim: `role`/`isPremium`/
//    `createdAt` firestore.rules protectedUserFields() ro'yxatida, ular bilan
//    birga yuborilgan yangilanish rad etilardi.
const inFlight = new Map();

export function ensureShortId(db, uid) {
  if (!uid) return Promise.resolve(null);
  if (inFlight.has(uid)) return inFlight.get(uid);

  const task = (async () => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data().shortId : null;
    if (typeof existing === 'string' && existing) return existing;

    const shortId = await getNextShortId(db);
    await setDoc(userRef, { shortId }, { merge: true });
    return shortId;
  })().finally(() => inFlight.delete(uid));

  inFlight.set(uid, task);
  return task;
}
