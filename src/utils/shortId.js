import { doc, runTransaction } from 'firebase/firestore';

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
export async function getNextShortId(db) {
  const counterRef = doc(db, 'meta', 'counters');
  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists() ? (snap.data().userSeq || 0) : 0) + 1;
    tx.set(counterRef, { userSeq: next }, { merge: true });
    return next;
  });
  return formatShortId(seq);
}
