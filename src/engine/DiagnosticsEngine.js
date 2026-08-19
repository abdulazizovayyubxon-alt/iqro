/**
 * DiagnosticsEngine — «Tayyorlik darajasi» va shaxsiy o'quv trayektoriyasi.
 *
 * Bu fayl SOF (pure): faqat AppContext state'idan o'qiydi, hech narsa yozmaydi
 * va Firestore'ga tegmaydi — tracks.js bilan bir xil qoida.
 *
 * Nima uchun oddiy "to'g'ri/jami" foizi yetarli emas:
 *   3 ta savolda 3 ta to'g'ri javob 100% ko'rsatadi, lekin bu bo'lim
 *   o'zlashtirilgani DEGANI EMAS. Shu sababli har bo'lim uchun Bayes
 *   silliqlashi qo'llanadi: kam ma'lumotli bo'lim foydalanuvchining o'z
 *   o'rtacha darajasiga (prior) tortiladi. Ma'lumot ko'paygan sari
 *   baho haqiqiy aniqlikka yaqinlashadi.
 */
import { TOPICS } from '../data/mockData';
import { EXAM_BLUEPRINT, hasBlueprint } from '../data/examBlueprint';
import { dueCardCount } from './SmartQuestionEngine';
import {
  MASTERY_MIN_ANSWERED,
  MASTERY_MIN_ACC,
  COVERAGE_MIN_ANSWERED,
} from '../data/tracks';

// ── Model konstantalari ───────────────────────────────────────────────────
export const PRIOR_STRENGTH = 12;     // silliqlash kuchi — "soxta savollar" soni
export const NEUTRAL_PRIOR = 0.5;     // umuman ma'lumot bo'lmaganda boshlang'ich taxmin
export const PRIOR_MIN_SAMPLE = 10;   // shundan kam javobda kategoriya prior'i ishonchsiz
export const CONFIDENCE_TARGET = 300; // ishonch 100% bo'lishi uchun kerakli savol hajmi
export const DEFAULT_EXAM_QUESTIONS = 50;
export const PRACTICE_BATCH = 20;     // trayektoriya qadamida tavsiya etiladigan savol soni
export const PRACTICE_ASSUMED_ACC = 0.85; // qadam foydasini baholashda kutilgan aniqlik
export const MIN_STEP_GAIN = 0.2;         // shundan kam foyda beradigan qadam ko'rsatilmaydi

// ── Taxmin (guessing) tuzatmasi ───────────────────────────────────────────
// Test yopiq variantli: hech narsa bilmagan odam ham 1/k ehtimol bilan
// to'g'ri tushadi. Shuning uchun IKKI xil raqam kerak:
//   readiness  — kutilayotgan BALL (taxmin ham ball keltiradi, imtihonda ham shunday)
//   knowledge  — taxmin ajratib tashlangan HAQIQIY bilim
// Bazadagi savollarning ~99% i 4 variantli, shuning uchun k = 4.
export const DEFAULT_OPTIONS = 4;
export const GUESS_P = 1 / DEFAULT_OPTIONS;

// ── Ishonch oralig'i ──────────────────────────────────────────────────────
// Hech ishlanmagan bo'lim uchun biz ROSTDAN ham hech narsa bilmaymiz —
// Beta(1,1) (tekis taqsimot) dispersiyasi = 1/12. Silliqlash priori bu yerda
// ishlatilmaydi: aks holda "ma'lumot yo'q" holat asossiz ishonchli ko'rinardi.
export const UNSEEN_VARIANCE = 1 / 12;
export const Z_95 = 1.96;

// ── Dalilning yangiligi (freshness) ───────────────────────────────────────
// Bilim eskiradi. Model buni «aniqlik tushdi» deb emas, «dalil zaiflashdi»
// deb ifodalaydi: eski javoblar OG'IRLIGI kamayadi, natijada baho
// foydalanuvchining o'z o'rtachasiga (prior) qaytadi va oraliq kengayadi.
// Bu Bayes ma'nosida to'g'ri va o'zboshimcha «jarima» emas.
export const FRESHNESS_HALFLIFE_DAYS = 60;  // 60 kunda dalil og'irligi yarmiga tushadi
export const MIN_EVIDENCE_WEIGHT = 0.35;    // ancha eski dalil ham butunlay yo'qolmaydi
export const STALE_THRESHOLD = 0.6;         // ~44 kundan keyin bo'lim «eskirgan» belgisini oladi

/** lastAt yo'q bo'lsa 1 qaytadi — eski ma'lumotli foydalanuvchi jazolanmaydi. */
export const freshnessOf = (lastAt) => {
  if (!lastAt) return 1;
  const days = (Date.now() - lastAt) / 86400000;
  if (days <= 0) return 1;
  return Math.pow(0.5, days / FRESHNESS_HALFLIFE_DAYS);
};

// ── Shoshilinch javoblar ──────────────────────────────────────────────────
// SmartQuestionEngine.FAST_ANSWER_SEC dan tez berilgan javoblar ulushi.
// Bu javobni xato qilmaydi — faqat bahoning ishonchini pasaytiradi.
export const RUSHED_SHARE = 0.35;      // shundan yuqori ulush ogohlantirish beradi
export const RUSHED_MIN_ANSWERED = 10; // kichik namunada ulush ma'nosiz

// ── Vaqt bahosi ───────────────────────────────────────────────────────────
export const DEFAULT_SECONDS_PER_Q = 45;  // o'z statistikasi yetarli bo'lmaganda
export const TIME_MIN_SAMPLE = 30;        // shundan kam savolda o'rtacha ishonchsiz
export const RETENTION_TIME_FACTOR = 0.6; // kartochka savoldan tezroq ko'riladi

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Xom ehtimollikdan taxmin ulushini ajratadi: 25% → 0 bilim, 100% → to'liq bilim. */
export const knowledgeOf = (p) => clamp01((p - GUESS_P) / (1 - GUESS_P));

/**
 * Bo'lim bahosining dispersiyasi (Beta posterior).
 * n = 0 bo'lsa — ma'lumot yo'q, tekis taqsimot dispersiyasi qaytadi.
 */
const topicVariance = (n, c, prior) => {
  if (n <= 0) return UNSEEN_VARIANCE;
  const a = c + PRIOR_STRENGTH * prior;
  const b = (n - c) + PRIOR_STRENGTH * (1 - prior);
  const s = a + b;
  return (a * b) / (s * s * (s + 1));
};

/**
 * Foydalanuvchining bitta savolga sarflagan o'rtacha vaqti (soniya).
 * Statistikasi kam bo'lsa — umumiy standart qiymat.
 */
export const avgSecondsPerQuestion = (state) => {
  const ts = state?.timeStats || {};
  const n = ts.totalQuestions || 0;
  const total = ts.totalTime || 0;
  if (n >= TIME_MIN_SAMPLE && total > 0) return clamp(total / n, 10, 180);
  return DEFAULT_SECONDS_PER_Q;
};

const minutesFor = (count, sec, factor = 1) =>
  Math.max(1, Math.round((count * sec * factor) / 60));

const topicsOfCategory = (cat) => TOPICS.filter(t =>
  Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
);

// ── Bo'lim holati ─────────────────────────────────────────────────────────
// untouched — hech ishlanmagan; thin — ma'lumot yetarli emas;
// weak/medium/strong — aniqlik bo'yicha; mastered — chuqurlik mezoniga mos.
// i18n: analysis.status.<holat>
const topicStatus = (n, accPct) => {
  if (n === 0) return 'untouched';
  if (n >= MASTERY_MIN_ANSWERED && accPct >= MASTERY_MIN_ACC) return 'mastered';
  if (n < COVERAGE_MIN_ANSWERED) return 'thin';
  if (accPct < 55) return 'weak';
  if (accPct < 75) return 'medium';
  return 'strong';
};

export const READINESS_BANDS = [
  { id: 'low', max: 45 },
  { id: 'mid', max: 60 },
  { id: 'good', max: 75 },
  { id: 'high', max: 101 },
];

export const readinessBand = (score) =>
  READINESS_BANDS.find(b => score < b.max)?.id || 'high';

/**
 * Bo'limlar bo'yicha to'liq diagnostika.
 *
 * @param {object} state        AppContext holati
 * @param {object} opts
 * @param {object} opts.topicTotals   { [topicId]: bazadagi savollar soni } — og'irlik uchun
 * @param {number} opts.goalScore     maqsad foizi (config: EXAM_GOAL_SCORE)
 * @param {number} opts.examQuestions imtihondagi savollar soni
 * @param {string} opts.category      fan (default: state.activeCategory)
 */
export function computeDiagnostics(state, opts = {}) {
  const {
    topicTotals = {},
    goalScore = 70,
    examQuestions = DEFAULT_EXAM_QUESTIONS,
    category,
  } = opts;

  const cat = category || state.activeCategory;
  const catTopics = topicsOfCategory(cat);
  const catStats = state.stats?.[cat] || { totalAnswered: 0, totalCorrect: 0 };
  const topicStats = state.topicStats || {};

  // Prior — foydalanuvchining shu fandagi o'z o'rtacha darajasi. Hajm kichik
  // bo'lsa neytral 0.5 ga tortiladi (o'zi ham silliqlanadi).
  const catAnswered = catStats.totalAnswered || 0;
  const catCorrect = catStats.totalCorrect || 0;
  const prior = catAnswered >= PRIOR_MIN_SAMPLE
    ? (catCorrect + PRIOR_MIN_SAMPLE * NEUTRAL_PRIOR) / (catAnswered + PRIOR_MIN_SAMPLE)
    : NEUTRAL_PRIOR;

  // Og'irlik — uch darajali zaxira zanjiri:
  //   1) RASMIY spetsifikatsiya (examBlueprint) — imtihonda shu bo'limdan
  //      nechta savol tushishi. Eng to'g'ri manba va qurilmaga bog'liq emas.
  //   2) Bazadagi savollar soni — spetsifikatsiya yo'q fanda taxmin.
  //   3) Kesh ham bo'lmasa — barcha bo'limlar teng.
  // ⚠️ 1 va 2 ARALASHTIRILMAYDI: rasmiy raqam 2–18, bazadagi son minglab.
  // Shu sababli blueprint fanning HAMMA bo'limini qoplagandagina ishlatiladi.
  const catTopicIds = catTopics.map(t => t.id);
  const useBlueprint = hasBlueprint(catTopicIds);
  const rawWeights = useBlueprint
    ? catTopics.map(t => EXAM_BLUEPRINT[t.id])
    : catTopics.map(t => Math.max(1, topicTotals[t.id] || 0));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0) || 1;

  let practiced = 0;
  let mastered = 0;
  let staleCount = 0;
  let rushedCount = 0;
  let varianceSum = 0;   // Var(readiness) = Σ wᵢ² · Varᵢ

  const topics = catTopics.map((t, i) => {
    const ts = topicStats[t.id] || { answered: 0, correct: 0 };
    const n = ts.answered || 0;
    const c = Math.min(ts.correct || 0, n);
    const accPct = n > 0 ? Math.round((c / n) * 100) : null;

    // Dalil og'irligi: yangi mashq to'liq, eskisi qisman hisobga olinadi
    const freshness = freshnessOf(ts.lastAt);
    const daysSince = ts.lastAt ? Math.max(0, Math.round((Date.now() - ts.lastAt) / 86400000)) : null;
    const evidence = MIN_EVIDENCE_WEIGHT + (1 - MIN_EVIDENCE_WEIGHT) * freshness;
    const nEff = n * evidence;
    const cEff = c * evidence;
    const pEst = (cEff + PRIOR_STRENGTH * prior) / (nEff + PRIOR_STRENGTH);

    // Shoshilinch javoblar ulushi — ishonchni pasaytiradi
    const fastShare = n > 0 ? Math.min(1, (ts.fast || 0) / n) : 0;
    const rushed = n >= RUSHED_MIN_ANSWERED && fastShare >= RUSHED_SHARE;
    const stale = n > 0 && freshness < STALE_THRESHOLD;

    const weight = rawWeights[i] / weightSum;
    // Holat XOM aniqlikdan aniqlanadi: «o'zlashtirilgan» belgisi vaqt o'tishi
    // bilan o'z-o'zidan yo'qolmasligi kerak — eskirish alohida `stale` bilan
    // ko'rsatiladi, aks holda foydalanuvchi sababsiz orqaga ketgandek bo'lardi.
    const status = topicStatus(n, accPct ?? 0);

    if (n >= COVERAGE_MIN_ANSWERED) practiced += 1;
    if (status === 'mastered') mastered += 1;
    if (stale) staleCount += 1;
    if (rushed) rushedCount += 1;
    // Shoshilinch javob ko'p bo'lsa dispersiya kengayadi (baho «yumshoq»)
    varianceSum += weight * weight * topicVariance(nEff, cEff, prior) * (1 + fastShare);

    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      // mockData'dagi mavjud «nimani o'rganish kerak» matni — trayektoriyada
      // tavsiya sifatida ko'rsatiladi (alohida material bazasi qurilmaydi)
      theoryHint: t.theoryHint || null,
      answered: n,
      correct: c,
      acc: accPct,                       // xom aniqlik (null = ishlanmagan)
      pEst,                              // silliqlangan baho (0-1) — kutilayotgan ball
      knowEst: knowledgeOf(pEst),        // taxmin ajratilgan haqiqiy bilim (0-1)
      nEff,                              // dalil og'irligi hisobga olingan hajm
      cEff,
      freshness,                         // 1 = bugungi mashq, 0.5 = ~60 kun oldin
      daysSince,                         // oxirgi mashqdan beri kun (null = noma'lum)
      stale,                             // takrorlash vaqti kelgan bo'lim
      fastShare,
      rushed,                            // javoblarning katta qismi shoshilinch
      weight,                            // imtihondagi taxminiy ulush
      status,
      // Imtihonda shu bo'limdan kutilayotgan YO'QOTISH (savol birligida)
      expectedLoss: weight * examQuestions * (1 - pEst),
      total: topicTotals[t.id] || 0,
    };
  });

  const readinessRaw = topics.reduce((s, tp) => s + tp.weight * tp.pEst, 0) * 100;
  const readiness = Math.round(readinessRaw);
  const predictedCorrect = Math.round((readinessRaw / 100) * examQuestions);

  // Haqiqiy bilim — o'sha og'irliklar, lekin taxmin ulushisiz. Har doim
  // readiness'dan past bo'ladi; ikkalasi birga ko'rsatilishi kerak, aks holda
  // foydalanuvchi raqam "tushib ketdi" deb tushunadi.
  const knowledge = Math.round(topics.reduce((s, tp) => s + tp.weight * tp.knowEst, 0) * 100);

  // Ishonch: hajm + qamrov. Ikkalasi ham past bo'lsa, baho taxminiy.
  const volumeConf = clamp01(catAnswered / CONFIDENCE_TARGET);
  const coverageConf = catTopics.length > 0 ? clamp01(practiced / catTopics.length) : 0;
  const confidence = clamp01(0.55 * volumeConf + 0.45 * coverageConf);

  // Xatolik chegarasi — «68%» emas, «68% (±6)». Bo'limlar mustaqil deb
  // qaraladi: Var(Σ wᵢpᵢ) = Σ wᵢ²Varᵢ. Yuqori chegara 45 — ma'lumot umuman
  // yo'q holatda raqam ma'nosiz kengaymasin.
  const margin = clamp(Math.round(Z_95 * Math.sqrt(varianceSum) * 100), 1, 45);

  // Eng katta yo'qotish manbalari — «aynan nima ustida ishlash kerak»
  const losses = [...topics]
    .filter(tp => tp.expectedLoss > 0.15)   // ahamiyatsiz farqlarni ko'rsatmaymiz
    .sort((a, b) => b.expectedLoss - a.expectedLoss);

  const dueCards = dueCardCount(state.spacedCards);

  return {
    category: cat,
    readiness,
    readinessRaw,
    knowledge,
    margin,
    band: readinessBand(readiness),
    predicted: { correct: predictedCorrect, total: examQuestions },
    goalScore,
    meetsGoal: readiness >= goalScore,
    gapToGoal: Math.max(0, goalScore - readiness),
    confidence,
    prior,
    answered: catAnswered,
    coverage: {
      practiced,
      total: catTopics.length,
      pct: catTopics.length > 0 ? Math.round((practiced / catTopics.length) * 100) : 0,
    },
    mastered,
    staleCount,
    rushedCount,
    topics,
    losses,
    dueCards,
    hasData: catAnswered > 0,
  };
}

// ── Trayektoriya (shaxsiy o'quv rejasi) ───────────────────────────────────
// Har qadam SOF hisob: bajarilganligi ham state'dan o'qiladi, alohida
// saqlanadigan "progress" yo'q — shuning uchun qurilmalar orasida ziddiyat
// bo'lmaydi va reja natijalar bilan birga o'zi yangilanadi.

// Bugun yechilgan savol TO'LIQ og'irlikka ega (freshness = 1), shuning uchun
// hisob nEff/cEff ustiga qo'shiladi. Eskirgan bo'limda foyda kattaroq chiqadi
// — bu to'g'ri: u yerda dalil zaiflashgan va uni tiklash arziydi.
const practiceGain = (tp, prior, m = PRACTICE_BATCH) => {
  const nAfter = tp.nEff + m;
  const cAfter = tp.cEff + PRACTICE_ASSUMED_ACC * m;
  const pAfter = (cAfter + PRIOR_STRENGTH * prior) / (nAfter + PRIOR_STRENGTH);
  return Math.max(0, (pAfter - tp.pEst) * tp.weight * 100);
};

/**
 * Shaxsiy trayektoriya — tartiblangan qadamlar ro'yxati.
 * Qadam turlari: retention | practice | coverage | mistakes | exam
 *
 * @param {object} diag  computeDiagnostics natijasi
 * @param {object} state AppContext holati
 * @param {object} opts  { maxSteps, maxMinutes }
 *   maxMinutes — kunlik vaqt byudjeti. Berilsa, ro'yxat shu vaqtga
 *   sig'adigan qadamlar bilan cheklanadi (kamida bitta qadam qoladi).
 */
export function buildTrajectory(diag, state, opts = {}) {
  const { maxSteps = 6, maxMinutes = null } = opts;
  const sec = opts.secondsPerQuestion || avgSecondsPerQuestion(state);
  const steps = [];
  const cat = diag.category;
  const mistakes = state.stats?.[cat]?.mistakes || [];

  // 1. Takror navbati — avval o'rganilgan bilim "oqib ketmasligi" kerak.
  if (diag.dueCards > 0) {
    steps.push({
      id: 'retention',
      type: 'retention',
      priority: 0,
      count: diag.dueCards,
      minutes: minutesFor(diag.dueCards, sec, RETENTION_TIME_FACTOR),
      gain: null,
      done: false,
      route: '/review',
    });
  }

  // 2. Ma'lumoti yetarli, lekin zaif bo'limlar — eng katta foyda shu yerda.
  // MIN_STEP_GAIN: bo'lim allaqachon PRACTICE_ASSUMED_ACC dan yuqori bo'lsa,
  // qo'shimcha mashq tayyorlikni deyarli oshirmaydi — bunday qadam rejaga
  // kirmaydi, aks holda ro'yxat "foydasi 0" tavsiyalar bilan to'lib ketardi.
  const eligible = diag.topics
    .filter(tp => tp.answered >= COVERAGE_MIN_ANSWERED && tp.status !== 'mastered')
    .map(tp => ({ tp, gain: practiceGain(tp, diag.prior) }))
    .filter(({ gain }) => gain >= MIN_STEP_GAIN)
    .sort((a, b) => b.gain - a.gain);

  // Blokli va aralash mashqni AJRATAMIZ (o'quv fanidagi asosiy farq):
  //   zaif bo'lim  → ketma-ket bitta mavzu (yangi bilimni EGALLASH uchun yaxshi)
  //   o'rta/kuchli → aralash mashq (MUSTAHKAMLASH va mavzularni farqlash uchun
  //                  ketma-ket blokdan sezilarli samaraliroq)
  // Shu sababli ro'yxat takrorlanmaydi: har bo'lim faqat bitta shaklda tushadi.
  // Zaif bo'limlar 3 tagacha: aralash qadam qo'shilgani uchun ularni 2 ta
  // qilib qisqartirish uchinchi zaif bo'limni rejadan butunlay tushirib
  // qoldirardi (muhrlangan reja sababli u kun bo'yi ko'rinmasdi).
  const blocked = eligible
    .filter(({ tp }) => tp.status === 'weak' || tp.status === 'thin')
    .slice(0, 3);
  const consolidate = eligible
    .filter(({ tp }) => tp.status === 'medium' || tp.status === 'strong')
    .slice(0, 3);
  // Bitta bo'limni «aralashtirib» bo'lmaydi — u oddiy mashq qadami bo'ladi
  const mixable = consolidate.length >= 2 ? consolidate : [];
  const practiceCandidates = mixable.length ? blocked : [...blocked, ...consolidate].slice(0, 3);

  practiceCandidates.forEach(({ tp, gain }) => {
    // Qadam maqsadi: bo'limni keyingi bosqichga ko'tarish
    const targetAcc = tp.status === 'weak' ? 70 : tp.status === 'medium' ? 80 : MASTERY_MIN_ACC;
    const targetN = Math.max(MASTERY_MIN_ANSWERED, tp.answered + PRACTICE_BATCH);
    steps.push({
      id: `practice-${tp.id}`,
      type: 'practice',
      priority: 1,
      topicId: tp.id,
      topicName: tp.name,
      topicIcon: tp.icon,
      theoryHint: tp.theoryHint,
      acc: tp.acc,
      answered: tp.answered,
      targetAcc,
      targetN,
      batch: PRACTICE_BATCH,
      minutes: minutesFor(PRACTICE_BATCH, sec),
      gain: Math.round(gain * 10) / 10,
      done: (tp.acc ?? 0) >= targetAcc && tp.answered >= targetN,
      route: '/test',
    });
  });

  // 2b. Aralash mashq — 2-3 ta o'rta/kuchli bo'lim bitta partiyada aralashadi.
  if (mixable.length >= 2) {
    const ids = mixable.map(({ tp }) => tp.id);
    const per = PRACTICE_BATCH / mixable.length;
    const gain = mixable.reduce((s, { tp }) => s + practiceGain(tp, diag.prior, per), 0);
    steps.push({
      id: `mixed-${ids.join('-')}`,
      type: 'mixed',
      priority: 1.5,
      topicIds: ids,
      topicNames: mixable.map(({ tp }) => tp.name),
      batch: PRACTICE_BATCH,
      minutes: minutesFor(PRACTICE_BATCH, sec),
      gain: Math.round(gain * 10) / 10,
      done: false,
      route: '/test',
    });
  }

  // 2c. Eskirgan bo'lim — o'zlashtirilgan, lekin uzoq vaqt takrorlanmagan.
  // Bittadan ortiq ko'rsatilmaydi: reja «takror ro'yxati»ga aylanib ketmasin.
  const staleTopic = diag.topics
    .filter(tp => tp.stale && tp.answered >= COVERAGE_MIN_ANSWERED && tp.status === 'mastered')
    .sort((a, b) => a.freshness - b.freshness)[0];
  if (staleTopic) {
    steps.push({
      id: `refresh-${staleTopic.id}`,
      type: 'refresh',
      priority: 1.8,
      topicId: staleTopic.id,
      topicName: staleTopic.name,
      topicIcon: staleTopic.icon,
      theoryHint: staleTopic.theoryHint,
      days: staleTopic.daysSince,
      batch: Math.round(PRACTICE_BATCH / 2),
      minutes: minutesFor(Math.round(PRACTICE_BATCH / 2), sec),
      gain: null,
      done: false,
      route: '/test',
    });
  }

  // 3. Qamrov teshiklari — baho ishonchli bo'lishi uchun ular yopilishi shart.
  const coverageCandidates = diag.topics
    .filter(tp => tp.answered < COVERAGE_MIN_ANSWERED)
    .sort((a, b) => (b.weight - a.weight) || (b.answered - a.answered))
    .slice(0, 2);

  coverageCandidates.forEach(tp => {
    const need = Math.max(5, COVERAGE_MIN_ANSWERED - tp.answered);
    steps.push({
      id: `coverage-${tp.id}`,
      type: 'coverage',
      priority: 2,
      topicId: tp.id,
      topicName: tp.name,
      topicIcon: tp.icon,
      theoryHint: tp.theoryHint,
      answered: tp.answered,
      targetN: COVERAGE_MIN_ANSWERED,
      minutes: minutesFor(need, sec),
      gain: null,
      done: false,
      route: '/test',
    });
  });

  // 4. Xatolar daftari — to'plangan xatolar ustida ishlash.
  if (mistakes.length >= 5) {
    steps.push({
      id: 'mistakes',
      type: 'mistakes',
      priority: 3,
      count: mistakes.length,
      // Bir o'tirishda hammasi emas — reja bajarilishi mumkin bo'lib qolsin.
      minutes: minutesFor(Math.min(mistakes.length, PRACTICE_BATCH), sec),
      gain: null,
      done: false,
      route: '/errors',
    });
  }

  // 5. Nazorat sinovi — tayyorlik maqsadga yetganda, uni imtihon sharoitida
  // tasdiqlash. Ishonch past bo'lsa taklif qilinmaydi (baho hali taxminiy).
  if (diag.meetsGoal && diag.confidence >= 0.5) {
    steps.push({
      id: 'exam',
      type: 'exam',
      priority: 4,
      minutes: minutesFor(diag.predicted.total, sec),
      gain: null,
      done: false,
      route: '/exam',
    });
  }

  const ordered = steps
    .sort((a, b) => (a.priority - b.priority) || ((b.gain || 0) - (a.gain || 0)))
    .slice(0, maxSteps);

  if (!maxMinutes) return ordered;

  // Vaqt byudjeti — birinchi qadam har doim qoladi (byudjet undan kichik
  // bo'lsa ham), aks holda foydalanuvchi bo'sh reja ko'radi.
  const fitted = [];
  let spent = 0;
  for (const step of ordered) {
    const cost = step.minutes || 0;
    if (fitted.length > 0 && spent + cost > maxMinutes) continue;
    fitted.push(step);
    spent += cost;
  }
  return fitted;
}

// ── Tendensiya ────────────────────────────────────────────────────────────

/**
 * Haftalik tayyorlik tarixidan o'sish ko'rsatkichi.
 * `state.readinessHistory[cat]` — [{ w: weekId, s: score, k: knowledge }]
 *
 * @returns {{ points: number[], delta: number|null, weeks: number }}
 *   delta = null → taqqoslash uchun kamida 2 hafta kerak
 */
export function readinessTrend(history = [], field = 's') {
  const points = (history || [])
    .map(p => p?.[field])
    .filter(v => typeof v === 'number');
  if (points.length < 2) return { points, delta: null, weeks: points.length };
  return {
    points,
    delta: points[points.length - 1] - points[0],
    weeks: points.length,
  };
}

// ── Sur'at: imtihon sanasiga bog'lash ─────────────────────────────────────

/**
 * Maqsadga yetish uchun model bo'yicha kerak bo'ladigan savollar soni.
 *
 * Simulyatsiya: har partiyada eng ko'p foyda beradigan bo'lim tanlanadi va
 * unga PRACTICE_BATCH savol «yechiladi» (kutilgan aniqlik bilan), keyin
 * tayyorlik qayta hisoblanadi. Bu buildTrajectory bilan bir xil mantiq —
 * shuning uchun ko'rsatilgan sur'at rejadagi qadamlarga mos keladi.
 *
 * @returns {number|null} savollar soni; null = model bo'yicha yetib bo'lmaydi
 */
export function estimateQuestionsToGoal(diag, opts = {}) {
  const { batch = PRACTICE_BATCH, maxQuestions = 5000 } = opts;
  if (diag.meetsGoal) return 0;

  const priorMass = PRIOR_STRENGTH * diag.prior;
  const sim = diag.topics.map(tp => ({
    // Dalil og'irligi qo'llangan hajm — buildTrajectory'dagi practiceGain
    // bilan bir xil asos, aks holda ko'rsatilgan sur'at rejaga mos kelmasdi
    n: tp.nEff,
    c: tp.cEff,
    w: tp.weight,
    p: tp.pEst,
  }));

  let readiness = diag.readinessRaw ?? diag.readiness;
  let total = 0;

  while (readiness < diag.goalScore && total < maxQuestions) {
    let best = -1;
    let bestGain = 0;
    let bestP = 0;
    sim.forEach((s, i) => {
      const nA = s.n + batch;
      const cA = s.c + PRACTICE_ASSUMED_ACC * batch;
      const pA = (cA + priorMass) / (nA + PRIOR_STRENGTH);
      const gain = (pA - s.p) * s.w * 100;
      if (gain > bestGain) { bestGain = gain; best = i; bestP = pA; }
    });
    // Foyda ahamiyatsizlashdi — mashq bilan maqsadga yetib bo'lmaydi
    if (best < 0 || bestGain < 0.01) return null;

    const s = sim[best];
    s.n += batch;
    s.c += PRACTICE_ASSUMED_ACC * batch;
    s.p = bestP;
    readiness += bestGain;
    total += batch;
  }

  return readiness >= diag.goalScore ? total : null;
}

/**
 * Kunlik sur'at — imtihon sanasi bilan bog'langan reja sarlavhasi uchun.
 *
 * @param {object} diag
 * @param {object} state
 * @param {object} opts { daysLeft }  — null/0 = sana belgilanmagan yoki o'tgan
 */
export function buildPace(diag, state, opts = {}) {
  const { daysLeft = null } = opts;
  const sec = opts.secondsPerQuestion || avgSecondsPerQuestion(state);
  // dailyGoal.date AppContext'da `toDateString()` bilan yoziladi — bir xil
  // format ishlatilishi shart, aks holda bugungi hisob doim 0 chiqadi.
  const today = new Date().toDateString();
  const dg = state?.dailyGoal || {};
  const todayAnswered = dg.date === today ? (dg.answered || 0) : 0;

  // Natija umuman bo'lmasa sur'at hisoblanmaydi: simulyatsiya kelajakdagi
  // javoblar PRACTICE_ASSUMED_ACC aniqlikda bo'lishini faraz qiladi, bu esa
  // hali bitta ham test yechmagan foydalanuvchi uchun asossiz raqam beradi.
  const needsData = !diag.hasData;
  const questionsToGoal = needsData ? null : estimateQuestionsToGoal(diag);

  // Sana yo'q bo'lsa ham sur'at ko'rsatilmaydi — foydalanuvchiga sanani
  // belgilash taklif qilinadi (taxminiy raqam yolg'on bo'lardi).
  // daysUntilExam(): null = sana yo'q yoki o'tgan, 0 = imtihon BUGUN.
  const isExamToday = daysLeft === 0;
  const hasDeadline = typeof daysLeft === 'number' && daysLeft > 0;
  const perDay = hasDeadline && questionsToGoal
    ? Math.max(10, Math.ceil(questionsToGoal / daysLeft / 5) * 5)  // 5 ga yaxlitlanadi
    : null;

  return {
    daysLeft: hasDeadline ? daysLeft : null,
    hasDeadline,
    isExamToday,
    needsData,
    questionsToGoal,          // 0 = maqsad bajarilgan, null = hisoblanmadi
    perDay,
    perDayMinutes: perDay ? minutesFor(perDay, sec) : null,
    todayAnswered,
    todayDone: perDay ? todayAnswered >= perDay : false,
  };
}
