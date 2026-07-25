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

const clamp01 = (v) => Math.max(0, Math.min(1, v));

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

  // Og'irlik: bazada savoli ko'p bo'lim imtihonda ham ko'proq uchraydi.
  // Kesh bo'lmasa — barcha bo'limlar teng.
  const rawWeights = catTopics.map(t => Math.max(1, topicTotals[t.id] || 0));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0) || 1;

  let practiced = 0;
  let mastered = 0;

  const topics = catTopics.map((t, i) => {
    const ts = topicStats[t.id] || { answered: 0, correct: 0 };
    const n = ts.answered || 0;
    const c = Math.min(ts.correct || 0, n);
    const accPct = n > 0 ? Math.round((c / n) * 100) : null;
    const pEst = (c + PRIOR_STRENGTH * prior) / (n + PRIOR_STRENGTH);
    const weight = rawWeights[i] / weightSum;
    const status = topicStatus(n, accPct ?? 0);

    if (n >= COVERAGE_MIN_ANSWERED) practiced += 1;
    if (status === 'mastered') mastered += 1;

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
      pEst,                              // silliqlangan baho (0-1)
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

  // Ishonch: hajm + qamrov. Ikkalasi ham past bo'lsa, baho taxminiy.
  const volumeConf = clamp01(catAnswered / CONFIDENCE_TARGET);
  const coverageConf = catTopics.length > 0 ? clamp01(practiced / catTopics.length) : 0;
  const confidence = clamp01(0.55 * volumeConf + 0.45 * coverageConf);

  // Eng katta yo'qotish manbalari — «aynan nima ustida ishlash kerak»
  const losses = [...topics]
    .filter(tp => tp.expectedLoss > 0.15)   // ahamiyatsiz farqlarni ko'rsatmaymiz
    .sort((a, b) => b.expectedLoss - a.expectedLoss);

  const dueCards = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

  return {
    category: cat,
    readiness,
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

const practiceGain = (tp, m = PRACTICE_BATCH) => {
  const nAfter = tp.answered + m;
  const cAfter = tp.correct + PRACTICE_ASSUMED_ACC * m;
  const priorMass = tp.pEst * (tp.answered + PRIOR_STRENGTH) - tp.correct; // K*prior
  const pAfter = (cAfter + priorMass) / (nAfter + PRIOR_STRENGTH);
  return Math.max(0, (pAfter - tp.pEst) * tp.weight * 100);
};

/**
 * Shaxsiy trayektoriya — tartiblangan qadamlar ro'yxati.
 * Qadam turlari: retention | practice | coverage | mistakes | exam
 *
 * @param {object} diag  computeDiagnostics natijasi
 * @param {object} state AppContext holati
 * @param {object} opts  { maxSteps }
 */
export function buildTrajectory(diag, state, opts = {}) {
  const { maxSteps = 6 } = opts;
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
      gain: null,
      done: false,
      route: '/review',
    });
  }

  // 2. Ma'lumoti yetarli, lekin zaif bo'limlar — eng katta foyda shu yerda.
  // MIN_STEP_GAIN: bo'lim allaqachon PRACTICE_ASSUMED_ACC dan yuqori bo'lsa,
  // qo'shimcha mashq tayyorlikni deyarli oshirmaydi — bunday qadam rejaga
  // kirmaydi, aks holda ro'yxat "foydasi 0" tavsiyalar bilan to'lib ketardi.
  const practiceCandidates = diag.topics
    .filter(tp => tp.answered >= COVERAGE_MIN_ANSWERED && tp.status !== 'mastered')
    .map(tp => ({ tp, gain: practiceGain(tp) }))
    .filter(({ gain }) => gain >= MIN_STEP_GAIN)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

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
      gain: Math.round(gain * 10) / 10,
      done: (tp.acc ?? 0) >= targetAcc && tp.answered >= targetN,
      route: '/test',
    });
  });

  // 3. Qamrov teshiklari — baho ishonchli bo'lishi uchun ular yopilishi shart.
  const coverageCandidates = diag.topics
    .filter(tp => tp.answered < COVERAGE_MIN_ANSWERED)
    .sort((a, b) => (b.weight - a.weight) || (b.answered - a.answered))
    .slice(0, 2);

  coverageCandidates.forEach(tp => {
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
      gain: null,
      done: false,
      route: '/exam',
    });
  }

  return steps
    .sort((a, b) => (a.priority - b.priority) || ((b.gain || 0) - (a.gain || 0)))
    .slice(0, maxSteps);
}
