/**
 * Savol diagnozi — ADMIN UX AUDIT 2026-08-18, A-1 BAND.
 *
 * «Xato foizi yuqori» — bu hali diagnoz EMAS: savol shunchaki qiyin bo'lishi
 * ham mumkin. Javob TAQSIMOTI esa buzuq savolni qiyin savoldan ajratadi:
 *
 *   · kalit shubhali — ko'pchilik BITTA noto'g'ri variantda to'plangan.
 *     Qiyin savolda javoblar sochiladi; kalit noto'g'ri bo'lsa — to'planadi.
 *   · ikki xil tushuniladi — ikkita variant deyarli teng. Odatda savol matni
 *     yoki variantlar bir-birini istisno qilmaydi.
 *   · o'lik distraktor — variantni deyarli hech kim tanlamaydi, ya'ni u
 *     ishlamayapti va savol aslida 4 emas, 3 variantli.
 *
 * Diagnoz TAKLIF, hukm emas — oxirgi qarorni metodist qabul qiladi.
 *
 * Alohida modulda: AdminPage.jsx (233 KB) ni test qilib bo'lmaydi, bu mantiq
 * esa panelning eng «aqlli» qismi — regressiyasi jimgina o'tib ketmasin.
 */

// Kam ko'rsatilgan savolda foiz shovqin: 3 tadan 3 tasi xato = 100%, lekin bu
// hech narsani anglatmaydi. 30 — statistik ma'noga ega eng past chegara.
export const SUSP_MIN_SHOWN = 30;

// 65% dan yuqori xato — savol qiyin BO'LISHI mumkin, buzuq bo'lishi ham.
// Ro'yxat aynan shu ikkisini ajratish uchun diagnoz qo'yadi.
export const SUSP_MIN_WRONG_RATE = 0.65;

// Bir marta o'qiladigan statistika hujjatlari soni. Admin ATAYLAB bosganda —
// 300 ta o'qish kunlik 50 000 kvota oldida sezilmaydi.
export const SUSP_SCAN_LIMIT = 300;

// Ro'yxatda ko'rsatiladigan (va savol matni yuklanadigan) yakuniy soni.
export const SUSP_TOP = 20;

const L = ['A', 'B', 'C', 'D', 'E', 'F'];

export const diagnoseQuestion = (row, q) => {
  if (!q || !Array.isArray(q.opts) || q.opts.length < 2) return null;
  const shown = row?.shown || 0;
  if (shown < SUSP_MIN_SHOWN) return null;

  const picks = row.picks || {};
  const pct = (i) => (picks[i] || 0) / shown;
  const ranked = q.opts
    .map((_, i) => ({ i, p: pct(i) }))
    .sort((a, b) => b.p - a.p);

  const [first, second] = ranked;
  if (!first) return null;

  // 40% — bitta noto'g'ri variantda «to'planish» belgisi. Tasodifiy
  // taqsimotda 4 variantli savolda har biriga ~25% tushardi.
  if (first.i !== q.correct && first.p >= 0.40) {
    return {
      kind: 'key',
      text: `Kalit shubhali — ${Math.round(first.p * 100)}% ${L[first.i]} ni tanlagan, «to'g'ri» esa ${L[q.correct]}`,
    };
  }

  if (second && first.p >= 0.25 && second.p >= 0.25 && (first.p - second.p) <= 0.12) {
    return {
      kind: 'ambiguous',
      text: `Ikki xil tushuniladi — ${L[first.i]} va ${L[second.i]} deyarli teng`,
    };
  }

  // O'lik distraktorni faqat yetarli namunada e'lon qilamiz: 30 ta
  // ko'rsatishda 0% tasodif ham bo'lishi mumkin.
  if (shown >= 50) {
    const dead = ranked.filter(r => r.p < 0.02).map(r => L[r.i]);
    if (dead.length > 0 && dead.length < q.opts.length - 1) {
      return {
        kind: 'dead',
        text: `O'lik distraktor — ${dead.join(', ')} variantini deyarli hech kim tanlamagan`,
      };
    }
  }

  return { kind: 'hard', text: "Diagnoz yo'q — savol shunchaki qiyin bo'lishi mumkin" };
};
