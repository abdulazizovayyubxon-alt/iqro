/**
 * mergeRules.js — bulut va lokal zaxirani birlashtirish QOIDALARI.
 *
 * ⚠️ AUDIT 2026-08-17 — nega bu fayl bor:
 *   `AppContext.mergeCloudAndLocal` `merged = { ...cloud }` bilan boshlanadi.
 *   Ya'ni u yerda ATAYLAB ishlov berilmagan har qanday maydon uchun bulut
 *   nusxasi so'zsiz g'olib bo'ladi — oflayn qilingan ish jimgina yo'qoladi.
 *   Bu xato ikki marta sodir bo'lgan (T-15 `spacedCards`, X-2 `partnerSets`),
 *   chunki qoidalar 200 qatorlik funksiya ichida ko'milgan va testlanmagan edi.
 *
 *   Endi har bir nozik qoida shu yerda — sof funksiya sifatida, testi bilan.
 *   `examClock.js` bilan bir xil mulohaza.
 */

/**
 * Haftalik diagnostika to'plamlari natijalarini birlashtiradi.
 *
 * NEGA max() EMAS: bu hisoblagich emas, HODISA yozuvi. `ExamPage` ataylab
 * faqat BIRINCHI urinishni yozadi — ustoz hisobotda guruhning haqiqiy
 * boshlang'ich darajasini ko'rishi kerak, aks holda hamma «to'g'irlab»
 * 100% qilib qo'yardi. Demak ikki qurilmada yechilgan bo'lsa ham haqiqiy
 * birinchi urinish saqlanishi shart.
 *
 * Ziddiyat qoidasi: ERTAROQ `doneAt` g'olib. `doneAt` — ISO satr, uning
 * leksikografik taqqoslashi xronologik bilan bir xil (barchasi bir xil
 * formatda, `toISOString()` dan).
 *
 * @param {object} [cloud]  Bulutdagi partnerSets
 * @param {object} [local]  Lokal zaxiradagi partnerSets
 * @returns {object|null}   Birlashtirilgan obyekt; ikkalasi ham bo'sh bo'lsa null
 */
export function mergePartnerSets(cloud, local) {
  const c = cloud || {};
  const l = local || {};
  const ids = new Set([...Object.keys(c), ...Object.keys(l)]);
  if (ids.size === 0) return null;

  const out = {};
  ids.forEach(id => {
    const cv = c[id];
    const lv = l[id];
    // Faqat bir tomonda bor — o'shani olamiz (asosiy holat: oflayn yechilgan
    // to'plam faqat lokalda; ilgari AYNAN SHU yozuv yo'qolardi).
    if (!cv || !lv) { out[id] = cv || lv; return; }
    // Eski yozuvda `doneAt` bo'lmasligi mumkin — vaqti ma'lumi ustun.
    if (!lv.doneAt) { out[id] = cv; return; }
    if (!cv.doneAt) { out[id] = lv; return; }
    out[id] = lv.doneAt < cv.doneAt ? lv : cv;
  });
  return out;
}
