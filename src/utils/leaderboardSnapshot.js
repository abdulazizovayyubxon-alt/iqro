/**
 * ════════════════════════════════════════════════════════════════════════
 *  leaderboardSnapshot.js — reyting ro'yxati QAYERDAN olinishini hal qiladi
 *
 *  NEGA ALOHIDA FAYL: bu qaror `LeaderboardPage.jsx` ichidagi `load()`
 *  funksiyasida edi va TESTDAN CHETDA qolgan edi. U esa butun ilovadagi eng
 *  qimmat o'qishni boshqaradi:
 *
 *      surat (`settings/leaderboard`)  =  1 o'qish
 *      jonli so'rov (orderBy+limit 50) = 50 o'qish
 *
 *  Spark rejasida kunlik o'qish limiti 50 000. Ya'ni jonli yo'lga tushgan
 *  ~1000 foydalanuvchi limitni bir o'zi tugatadi — va cron ham o'sha kvotaga
 *  bog'liq, demak ertasi kuni surat yozilmay, halqa o'zini o'zi quvvatlaydi.
 *
 *  `saveSchedule.js` bilan bir xil sabab: bunday qaror testsiz turmasligi
 *  kerak.
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * ⚠️ AUDIT 2026-09-02, K-2 — DAVR ALMASHISH OYNASI.
 *
 * `getWeekId` Toshkent kalendari bo'yicha ishlaydi (server va mijozda bir xil,
 * `api/_shared.js`), ya'ni hafta DUSHANBA 00:00 da almashadi. Cron esa suratni
 * 14:00 da yozadi (`vercel.json`). Oradagi 14 soatda surat SOG'LOM, lekin davri
 * eski. Oylik taxtada ham xuddi shu — har oyning 1-sanasida.
 *
 * Ilgari bu oynada har foydalanuvchi jonli so'rovga tushardi. Ertalabki cho'qqi
 * aynan shu oynaga tushadi (o'qituvchilar darsdan oldin), ya'ni eng qimmat yo'l
 * eng gavjum soatda ochilardi.
 *
 * NEGA JONLI SO'ROV BU YERDA BARIBIR YECHIM EMAS: yangi davr boshida
 * `weekly_<yangi>` maydoni hujjatlarda HALI YO'Q, Firestore esa `orderBy` da
 * maydoni yo'q hujjatni umuman qaytarmaydi. Ya'ni 50 ta o'qish sarflab ham
 * to'liq taxta chiqmaydi — u shunchaki o'sha ertalab ball yig'ganlarni
 * ko'rsatadi. Qimmat ham, to'liq ham emas.
 *
 * Shuning uchun `SNAPSHOT_MAX_AGE` bilan bir xil falsafa: yashirish emas,
 * ROSTINI AYTISH — «yangi hafta boshlandi, reyting 14:00 da yangilanadi».
 *
 * @param {object} p
 * @param {object|null} p.data       `settings/leaderboard` hujjati (yo'q bo'lsa null)
 * @param {'all'|'weekly'|'monthly'} p.boardType
 * @param {string} p.weekId          mijozdagi joriy hafta IDsi
 * @param {string} p.monthId         mijozdagi joriy oy IDsi
 * @param {number} p.now             hozirgi vaqt (ms)
 * @param {number} p.maxAgeMs        surat yaroqlilik oynasi (SNAPSHOT_MAX_AGE)
 * @returns {{source: 'snapshot'|'periodPending'|'live', rows: Array|null, updatedAt: string|null}}
 *   `snapshot`      — suratdagi ro'yxat ishlatiladi (1 o'qish)
 *   `periodPending` — davr almashgan, ro'yxat KO'RSATILMAYDI (0 qo'shimcha o'qish)
 *   `live`          — surat yo'q yoki eskirgan, jonli so'rovga tushamiz (50 o'qish)
 */
export function decideLeaderboardSource({ data, boardType, weekId, monthId, now, maxAgeMs }) {
  const live = { source: 'live', rows: null, updatedAt: null };

  const rows = data?.boards?.[boardType];
  if (!Array.isArray(rows)) return live;

  // `updatedAt` yo'q yoki buzuq bo'lsa yosh = Infinity, ya'ni surat ishonchsiz.
  const stamp = data?.updatedAt ? new Date(data.updatedAt).getTime() : NaN;
  const age = Number.isFinite(stamp) ? now - stamp : Infinity;

  // Surat kelajakdan bo'lsa (qurilma soati orqada) uni eskirgan deb
  // hisoblamaymiz — manfiy yosh ham oynaga sig'adi.
  if (age > maxAgeMs) return live;

  // Hafta/oy taxtasi uchun surat AYNAN shu davrniki bo'lishi shart:
  // o'tgan haftaning ro'yxatini «joriy hafta» deb ko'rsatish — yolg'on.
  const periodOk =
    boardType === 'all' ? true
      : boardType === 'weekly' ? data?.weekId === weekId
        : data?.monthId === monthId;

  if (!periodOk) return { source: 'periodPending', rows: null, updatedAt: null };

  return { source: 'snapshot', rows, updatedAt: data.updatedAt || null };
}

export default decideLeaderboardSource;
