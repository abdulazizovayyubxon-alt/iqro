/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              XATOLAR NAVBATI — Zehin platformasi              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ⚠️ AUDIT 2026-08-19, T-3 va T-6 BANDLARI.
 *
 * MUAMMO NIMA EDI. Xatolar RO'YXAT edi, navbat emas — uchta mustaqil nuqson
 * bir joyda:
 *
 *   1) DEDUP YO'Q. `AppContext` da xatolar shunchaki qo'shilardi:
 *          [...catStats.mistakes, ...results.newMistakes]
 *      Bir savolni ikki marta xato qilsangiz — ikkita yozuv.
 *
 *   2) TO'G'RI JAVOB XATONI O'CHIRMASDI. Ro'yxatdan chiqishning yagona yo'li —
 *      foydalanuvchining qo'lda o'chirishi. O'zlashtirilgan savol abadiy
 *      «xato» bo'lib qolardi.
 *
 *   3) FIFO 50 TA. Chegara oshsa `shift()` — ENG ESKISI o'chirilardi.
 *
 * O'LCHANGAN OQIBAT. 60% aniqlik bilan ishlayotgan pedagog har 50 savollik
 * blokda ~20 ta xato qiladi. 2.5 ta blokdan keyin ro'yxat to'ladi. Undan keyin
 * har yangi xato ENG UZOQ VAQT O'ZLASHTIRILMAGAN xatoni jimgina o'chiradi,
 * allaqachon o'zlashtirilganlari esa qolib mini-testning yarmini egallaydi.
 * Ya'ni xatolar daftari vaqt o'tgani sari KAMROQ foydali bo'lib borardi —
 * o'rganish egri chizig'iga teskari.
 *
 * ENDI QANDAY. Yozuv `qHash` bo'yicha kalitlanadi va hayot sikliga ega:
 *
 *     ochiq ──(2 marta ketma-ket to'g'ri, ≥3 kun o'tib)──▶ yopilgan (retired)
 *       │                                                      │
 *       └──────────────── qayta xato ◀─────────────────────────┘
 *       │
 *       └──(5 marta xato)──▶ tirishqoq (leech): mashqdan chiqadi, nazariya beriladi
 *
 * «Yopilgan» yozuv O'CHIRILMAYDI — u nazorat savoli sifatida mashqning 15%ini
 * tashkil qiladi va foydalanuvchiga «men buni haqiqatan o'rgandim» tasdig'ini
 * beradi.
 */

import { questionKey } from './SmartQuestionEngine';
import { MAX_MISTAKES_SAVED, MAX_MISTAKES_TOTAL } from '../config';

/** Xato «yopilishi» uchun kerakli ketma-ket to'g'ri javoblar soni. */
export const RETIRE_STREAK = 2;

/**
 * Xato «yopilishi» uchun oxirgi xatodan o'tishi kerak bo'lgan eng qisqa muddat.
 * Bunsiz foydalanuvchi bir sessiyada xato qilib, o'sha sessiyada ikki marta
 * to'g'ri javob berib xatoni «yopib» qo'yardi — bu qisqa muddatli xotira,
 * o'zlashtirish emas.
 */
export const RETIRE_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 kun

/**
 * Shuncha marta xato qilingan savol «tirishqoq» (Anki atamasi — leech).
 * Uni yana ko'rsatish isbotlangan samarasiz strategiya: muammo savolda emas,
 * uning ortidagi tushunchada. Bunday savol mashqdan chiqariladi va
 * foydalanuvchiga nazariya taklif etiladi.
 */
export const LEECH_THRESHOLD = 5;

/** Mashqdagi ulushlar: muddati kelgan / ko'p xato / nazorat. */
export const DRILL_MIX = { due: 0.6, frequent: 0.25, control: 0.15 };

/** Bir mashqdagi savollarning eng ko'p soni. */
export const DRILL_SIZE = 20;

/**
 * Yozuvning barqaror kaliti.
 * Yangi yozuvlarda `qHash` bor; eskilarida yo'q — matndan qayta hisoblanadi,
 * shuning uchun migratsiya kerak emas (`SmartQuestionEngine` T-7 bilan bir xil naqsh).
 */
export const mistakeKey = (m) => m?.qHash || (m?.question ? questionKey({ q: m.question }) : '');

export const isRetired = (m) => !!m?.retiredAt;
export const isLeech = (m) => (m?.wrongCount || 0) >= LEECH_THRESHOLD;

/** Mashqqa tushadigan xatolar: yopilmagan va tirishqoq bo'lmaganlar. */
export const activeMistakes = (list = []) => list.filter(m => !isRetired(m) && !isLeech(m));
export const retiredMistakes = (list = []) => list.filter(isRetired);
export const leechMistakes = (list = []) => list.filter(m => !isRetired(m) && isLeech(m));

/**
 * `undefined` qiymatli maydonlarni olib tashlaydi.
 * NEGA KERAK: yangi yozuv eskisining ustiga yozilganda `explanation: undefined`
 * mavjud izohni o'chirib yuborardi. Firestore ham `undefined` ni qabul qilmaydi.
 */
const defined = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
};

/** Ikki nusxani birlashtiradi (dublikat topilganda hisoblagichlar qo'shiladi). */
const combine = (a, b) => ({
  ...defined(a),
  ...defined(b),
  wrongCount: (a.wrongCount || 1) + (b.wrongCount || 1),
  lastWrongAt: Math.max(a.lastWrongAt || 0, b.lastWrongAt || 0) || undefined,
  firstWrongAt: Math.min(a.firstWrongAt || Infinity, b.firstWrongAt || Infinity) || undefined,
  // Biri hali ochiq bo'lsa — birlashma ham ochiq (ehtiyotkor tomon)
  retiredAt: (a.retiredAt && b.retiredAt) ? Math.max(a.retiredAt, b.retiredAt) : undefined,
  streakSinceWrong: Math.min(a.streakSinceWrong || 0, b.streakSinceWrong || 0),
});

/**
 * Ro'yxatni chegaraga siqadi.
 *
 * Saqlash ustuvorligi: ochiq xatolar → tirishqoqlar → yopilganlar.
 * Teng bo'lsa ko'p xato qilingani, keyin yangirog'i saqlanadi.
 * Ya'ni chiqib ketadigan birinchi nomzod — allaqachon yopilgan, kam xato
 * qilingan, eski yozuv. Eski FIFO aynan teskarisini qilardi.
 */
export const pruneMistakes = (list = [], limit = MAX_MISTAKES_SAVED) => {
  if (list.length <= limit) return list;

  const rank = (m) => (isRetired(m) ? 2 : isLeech(m) ? 1 : 0);

  return [...list]
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      const wa = a.wrongCount || 1;
      const wb = b.wrongCount || 1;
      if (wa !== wb) return wb - wa;
      return (b.lastWrongAt || 0) - (a.lastWrongAt || 0);
    })
    .slice(0, limit);
};

/**
 * Mavjud xatolarni yangi natijalar bilan birlashtiradi.
 *
 * @param {Array}  existing        Joriy ro'yxat
 * @param {Array}  incoming        Shu sessiyadagi yangi xatolar (summarizeTestResults)
 * @param {Array}  correctedHashes Shu sessiyada TO'G'RI javob berilgan savollar kalitlari
 * @param {object} [opts]
 * @returns {Array} Yangi ro'yxat
 */
export const mergeMistakes = (existing = [], incoming = [], correctedHashes = [], { now = Date.now(), limit = MAX_MISTAKES_SAVED } = {}) => {
  const byKey = new Map();

  // 1. Mavjudlarni kalit bo'yicha yig'amiz — yo'l-yo'lakay eski dublikatlar ham
  //    birlashadi (ro'yxatda ular allaqachon bo'lishi mumkin).
  for (const m of existing) {
    const k = mistakeKey(m);
    if (!k) continue;
    const normalized = { ...defined(m), qHash: k, wrongCount: m.wrongCount || 1 };
    const prev = byKey.get(k);
    byKey.set(k, prev ? combine(prev, normalized) : normalized);
  }

  // 2. To'g'ri javoblar — zanjirni oshiradi va shart bajarilsa xatoni yopadi.
  const corrected = new Set(correctedHashes);
  for (const [k, m] of byKey) {
    if (!corrected.has(k) || isRetired(m)) continue;
    const streak = (m.streakSinceWrong || 0) + 1;
    const oldEnough = now - (m.lastWrongAt || 0) >= RETIRE_MIN_AGE_MS;
    byKey.set(k, defined({
      ...m,
      streakSinceWrong: streak,
      lastCorrectAt: now,
      retiredAt: (streak >= RETIRE_STREAK && oldEnough) ? now : undefined,
    }));
  }

  // 3. Yangi xatolar — mavjudi bo'lsa hisoblagich oshadi va yopilgani QAYTA
  //    OCHILADI (unutilgan degani; nazorat savoli sifatida emas, mashq sifatida).
  for (const raw of incoming) {
    const k = mistakeKey(raw);
    if (!k) continue;
    const prev = byKey.get(k);
    byKey.set(k, defined({
      ...(prev || {}),
      ...defined(raw),
      qHash: k,
      wrongCount: (prev?.wrongCount || 0) + 1,
      firstWrongAt: prev?.firstWrongAt || now,
      lastWrongAt: now,
      streakSinceWrong: 0,
      retiredAt: undefined,
    }));
  }

  return pruneMistakes(Array.from(byKey.values()), limit);
};

/** Fisher–Yates — `sort(() => 0.5 - Math.random())` xolis emas. */
export const shuffle = (arr, rand = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * «Xatolar ustida ishlash» mashqini yig'adi.
 *
 * ⚠️ T-6 BAND — ilgari bu shunchaki `sort(() => 0.5 - Math.random()).slice(0, 15)`
 * edi. Ya'ni MUDDAT (`nextReview`) mutlaqo hisobga olinmasdi: `spacedCards` da
 * to'liq takrorlash jadvali bor edi, lekin bu rejim undan UMUMAN foydalanmasdi —
 * ikkinchi, parallel, jadvalsiz tizim. Bugun 3 marta mashq qilsangiz deyarli
 * bir xil savollar kelardi va hech biri «muddati kelgani» uchun kelmasdi.
 *
 * Endi tarkib:
 *   60% — muddati kelganlar (eng kechikkani birinchi)
 *   25% — muddati kelmagan, lekin ko'p xato qilinganlar
 *   15% — yopilgan xatolar: NAZORAT savollari
 * Tirishqoqlar (leech) faqat joy qolsa qo'shiladi.
 *
 * @param {Array} mistakes    Xatolar ro'yxati
 * @param {Array} spacedCards Takrorlash kartalari (muddatni bilish uchun)
 * @param {object} [opts]
 * @returns {Array} Aralashtirilgan mashq ro'yxati
 */
export const buildMistakeDrill = (mistakes = [], spacedCards = [], { size = DRILL_SIZE, now = Date.now(), rand = Math.random } = {}) => {
  if (mistakes.length === 0) return [];

  const cardByKey = new Map();
  for (const c of spacedCards) {
    const k = c?.q ? questionKey(c) : c?.qHash;
    if (k) cardByKey.set(k, c);
  }

  // Kartasi yo'q xato = hech qachon takrorlanmagan → muddati kelgan hisoblanadi.
  const overdueOf = (m) => {
    const card = cardByKey.get(mistakeKey(m));
    if (!card) return Infinity;
    return now - (card.nextReview || 0);
  };

  const active = activeMistakes(mistakes);
  const due = active.filter(m => overdueOf(m) >= 0).sort((a, b) => overdueOf(b) - overdueOf(a));
  const notDue = active.filter(m => overdueOf(m) < 0).sort((a, b) => (b.wrongCount || 1) - (a.wrongCount || 1));
  // Nazorat uchun eng UZOQ VAQT oldin yopilgani qimmatliroq — u haqiqiy sinov.
  const control = retiredMistakes(mistakes).sort((a, b) => (a.retiredAt || 0) - (b.retiredAt || 0));
  const leeches = leechMistakes(mistakes).sort((a, b) => (b.wrongCount || 1) - (a.wrongCount || 1));

  const target = Math.min(size, mistakes.length);
  const picked = [];
  const seen = new Set();

  const take = (pool, count) => {
    for (const m of pool) {
      if (picked.length >= target || count <= 0) break;
      const k = mistakeKey(m);
      if (seen.has(k)) continue;
      seen.add(k);
      picked.push(m);
      count--;
    }
  };

  take(due, Math.round(target * DRILL_MIX.due));
  take(notDue, Math.round(target * DRILL_MIX.frequent));
  take(control, Math.round(target * DRILL_MIX.control));

  // Kvotalar to'lmasa — qolgan joylarni HAL QILINMAGAN xatolar bilan
  // to'ldiramiz (masalan muddati kelgani 3 ta bo'lsa, qolgani ko'p xato
  // qilinganlardan olinadi).
  //
  // `control` bu ro'yxatda ATAYLAB yo'q. Aks holda 10 ta ochiq va 10 ta
  // yopilgan xatosi bor foydalanuvchi 20 talik mashqning YARMINI nazorat
  // savollari sifatida olardi — «xatolar ustida ishlash» o'z ma'nosini
  // yo'qotadi. Ochiq xato yetmasa mashq shunchaki QISQAROQ bo'ladi.
  for (const pool of [due, notDue, leeches]) {
    if (picked.length >= target) break;
    take(pool, target - picked.length);
  }

  return shuffle(picked, rand);
};

/**
 * HUJJAT BO'YICHA xato byudjeti — barcha fanlar bo'ylab jami chegara.
 *
 * ⚠️ NEGA `pruneMistakes` YETARLI EMAS: u FAN BO'YICHA ishlaydi, `userStats`
 *   hujjati esa bitta. Ikki fanli foydalanuvchida 2 × 300 = 600 ta xato
 *   yig'ilardi va hujjat Firestore ning 1 MiB chegarasiga yaqinlashardi
 *   (o'lchandi: yozuv ~948 bayt). Chegaraga yetgan hujjat BUTUNLAY
 *   yozilmaydigan bo'lib qoladi — sababi `config.MAX_MISTAKES_TOTAL` izohida.
 *
 * Byudjetdan oshmagan holatda AYNI obyekt qaytariladi (yangi nusxa emas):
 * ortiqcha render ham, keraksiz bulut yozuvi ham kelib chiqmasligi kerak.
 *
 * Ustuvorlik `pruneMistakes` bilan BIR XIL: ochiq xatolar yopilganidan
 * ustun, ko'p xato qilingani kamidan ustun, yangisi eskisidan ustun.
 *
 * @param {object} stats  `state.stats` — { [fan]: { mistakes: [...] } }
 * @param {number} [total]
 * @returns {object} yangi (yoki o'zgarmagan) `stats`
 */
export const enforceMistakeBudget = (stats, total = MAX_MISTAKES_TOTAL) => {
  if (!stats || typeof stats !== 'object') return stats;
  const cats = Object.keys(stats);
  const all = [];
  for (const cat of cats) {
    for (const m of (stats[cat]?.mistakes || [])) all.push({ cat, m });
  }
  if (all.length <= total) return stats;

  const rank = (m) => (isRetired(m) ? 2 : isLeech(m) ? 1 : 0);
  all.sort((a, b) => {
    const ra = rank(a.m); const rb = rank(b.m);
    if (ra !== rb) return ra - rb;
    const wa = a.m.wrongCount || 1; const wb = b.m.wrongCount || 1;
    if (wa !== wb) return wb - wa;
    return (b.m.lastWrongAt || 0) - (a.m.lastWrongAt || 0);
  });

  const kept = new Map(cats.map(c => [c, []]));
  for (const { cat, m } of all.slice(0, total)) kept.get(cat).push(m);

  const out = { ...stats };
  for (const cat of cats) out[cat] = { ...stats[cat], mistakes: kept.get(cat) };
  return out;
};
