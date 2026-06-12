// Variantlarni aralashtirish: to'g'ri javob doim "A" da yozilgan bo'lsa ham, qabul qilishda
// A/B/C/D bo'ylab TENG taqsimlanadi — bir xil harf yoki ketma-ketlik shabloni bo'lmaydi.
// Deterministik (savol matni seed) — qayta ishlatilsa natija barqaror.

const LETTERS = ["A", "B", "C", "D"];

// Oddiy deterministik RNG (mulberry32) + matn xeshi
function seedFrom(text) {
  let h = 1779033703 ^ String(text).length;
  for (let i = 0; i < String(text).length; i++) {
    h = Math.imul(h ^ String(text).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bitta savol variantlarini aralashtiradi, "answer" ni mos ravishda yangilaydi.
export function shuffleOptions(q) {
  const opts = q.options || {};
  if (!LETTERS.every((L) => opts[L] != null)) return q; // to'liq emas — tegmaymiz
  const answer = q.answer;
  const correctText = opts[answer];

  const values = LETTERS.map((L) => opts[L]);
  const rng = mulberry32(seedFrom(q.question || JSON.stringify(values)));
  // Fisher–Yates (seeded)
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const newOptions = {};
  LETTERS.forEach((L, i) => { newOptions[L] = values[i]; });
  // To'g'ri javob qayerga tushdi?
  let newAnswer = LETTERS[values.findIndex((v) => v === correctText)];
  if (!newAnswer) newAnswer = answer; // ehtiyot

  return { ...q, options: newOptions, answer: newAnswer };
}

// Massivni aralashtiradi va taqsimotni qaytaradi (tekshiruv uchun)
export function shuffleAll(questions) {
  const dist = { A: 0, B: 0, C: 0, D: 0 };
  const out = questions.map((q) => {
    const s = shuffleOptions(q);
    if (dist[s.answer] != null) dist[s.answer]++;
    return s;
  });
  return { out, dist };
}
