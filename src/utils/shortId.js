import { doc, runTransaction } from 'firebase/firestore';

// Formatlash: 1-harif + 4 xonali raqam (masalan A0001, A9999, B0001...)
const formatShortId = (seq) => {
  const letterIndex = Math.floor((seq - 1) / 9999);
  const digits = ((seq - 1) % 9999) + 1;
  return `${String.fromCharCode(65 + letterIndex)}${String(digits).padStart(4, '0')}`;
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
