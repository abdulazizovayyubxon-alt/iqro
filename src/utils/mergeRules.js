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

/**
 * Faol fanni (`activeCategory`) birlashtiradi.
 *
 * ⚠️ 2026-09-14 — «qaysi fanni tanlasam ham, sahifa yangilangach
 * Informatikaga qaytib qolyapti». `mergeCloudAndLocal` `{ ...cloud }` bilan
 * boshlanadi va `activeCategory` uchun qoida YO'Q edi, ya'ni bulut nusxasi
 * so'zsiz g'olib edi. Bulut esa ataylab sekin yoziladi (CLOUD_DEBOUNCE_MS
 * 30 s, shift 3 daqiqa), kvota tugagan kuni esa umuman yozilmaydi. Natijada
 * fan almashtirilib, sahifa yangilansa yoki ilova yopib ochilsa, bulutda
 * qolib ketgan ESKI fan qaytib kelardi.
 *
 * Qoida — yangiroq TANLOV g'olib (`activeCategoryAt`, `updateState` qo'yadi):
 *   · ikkala nusxada vaqt bor ...... kattasi (boshqa qurilmadagi tanlov ham to'g'ri keladi);
 *   · faqat bittasida bor .......... o'sha — vaqtli yozuv aniq tanlovdan qolgan;
 *   · ikkalasida ham yo'q (eski) ... LOKAL: u shu qurilmaning oxirgi holati
 *     (600 ms debounce + yopilishda flush), bulut esa orqada qolishi mumkin.
 *
 * @param {object} [cloud]  Bulutdagi holat
 * @param {object} [local]  Lokal zaxira
 * @returns {{activeCategory: string, activeCategoryAt: number|null}|null}
 *          Ikkalasida ham fan yo'q bo'lsa null — maydonga tegilmaydi.
 */
export function mergeActiveCategory(cloud, local) {
  const c = cloud || {};
  const l = local || {};
  if (!c.activeCategory && !l.activeCategory) return null;

  const pick = (src) => ({
    activeCategory: src.activeCategory,
    activeCategoryAt: Number(src.activeCategoryAt) || null,
  });
  if (!l.activeCategory) return pick(c);
  if (!c.activeCategory) return pick(l);

  const cAt = Number(c.activeCategoryAt) || 0;
  const lAt = Number(l.activeCategoryAt) || 0;
  if (cAt && lAt) return pick(lAt > cAt ? l : c);
  // Faqat bulutda vaqt bor — u tuzatishdan keyingi aniq tanlov. Aks holda
  // (faqat lokalda bor yoki ikkalasida ham yo'q) lokal nusxa ustun.
  return pick(cAt ? c : l);
}
