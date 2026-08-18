/**
 * Savol matnining dublikat kaliti — ADMIN UX AUDIT 2026-08-18, K-3 BAND.
 *
 * ══════════════════════════════════════════════════════════════════
 *  MUAMMO
 * ══════════════════════════════════════════════════════════════════
 *  Ommaviy import dublikatni MIJOZ TOMONIDA tekshirardi: butun `questions`
 *  kolleksiyasi xotiraga yuklanib, matnlar Set'da solishtirilardi
 *  (AdminPage.jsx). Ya'ni 20 ta savol qo'shish uchun ham ~47 000 Firestore
 *  o'qishi ketardi — bepul rejaning kunlik kvotasi esa 50 000.
 *
 *  Amaliy oqibati: metodist bitta savol qo'shsa, ilova o'sha kuni BARCHA
 *  foydalanuvchilar uchun ishlamay qolishi mumkin edi.
 *
 * ══════════════════════════════════════════════════════════════════
 *  YECHIM
 * ══════════════════════════════════════════════════════════════════
 *  Har savolga normallashtirilgan matnning qisqa hash'i yozib qo'yiladi.
 *  Import esa `where('qHash', 'in', [...])` bilan 30 talab so'raydi:
 *  200 savollik import ≈ 7 ta so'rov (47 000 o'qish o'rniga).
 *
 *  HASH TO'QNASHUVI XAVFSIZ: hash faqat NOMZODLARNI topadi, oxirgi qaror
 *  matnni to'liq solishtirish orqali chiqariladi (`normalizeQuestion`).
 *  Ya'ni to'qnashuv sekinlashtiradi, xato qaror qabul qildirmaydi.
 */

/**
 * Matnni normallashtirish — AdminPage'dagi import mantiqidagi bilan
 * AYNAN BIR XIL bo'lishi SHART, aks holda eski va yangi dublikat
 * tekshiruvi turli natija berardi.
 *
 * ⚠️ ODDIY APOSTROF (U+0027) ATAYLAB QO'SHILDI: eski import normalizatsiyasida
 * u YO'Q edi, ya'ni «bo'lim» (klaviatura) va «bo‘lim» (tipografik) TURLI
 * savol sanalardi va dublikat o'tib ketardi. O'zbek matnlarida bu eng ko'p
 * uchraydigan farq.
 *
 * Apostrof turlari birlashtiriladi ('' ` ʼ → ’): o'zbek matnlarida bir xil
 * so'z turli klaviaturada turlicha yoziladi va ular dublikat sanalishi kerak.
 */
export const normalizeQuestion = (text) => (
  text
    ? String(text).toLowerCase().replace(/['‘’`ʼ]/g, '’').replace(/\s+/g, ' ').trim()
    : ''
);

/**
 * FNV-1a (32-bit) → base36.
 *
 * NEGA KRIPTOGRAFIK EMAS: bu xavfsizlik emas, indeks kaliti. SHA-256
 * `crypto.subtle` orqali ASENXRON bo'lardi va import siklini murakkablashtirardi;
 * bu yerda esa kerak bo'lgani — bir xil matn har doim bir xil qisqa satr
 * berishi. Natija ~7 belgi: Firestore indeksida yengil.
 */
export const qHashOf = (text) => {
  const s = normalizeQuestion(text);
  if (!s) return '';
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // FNV prime (32-bit) ko'paytirish, 32 bitda ushlab turiladi
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Uzunlik ham qo'shiladi — qisqa hash'da to'qnashuvni yanada kamaytiradi
  return h.toString(36) + '_' + (s.length % 1296).toString(36);
};
