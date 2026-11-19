/**
 * milliySertifikat.js — UzBMB Milliy Sertifikat (A+, A, B+, B, C+, C)
 * simulyatori uchun rasmiy 2025/2026 spetsifikatsiyalar, savollarni
 * qiyinlik va bo'lim bo'yicha muvozanatlash hamda 1PL Rash modeli (Rasch IRT)
 * bo'yicha baholash mexanizmi.
 *
 * Rasmiy me'yoriy asoslar:
 *  - Vazirlar Mahkamasining 646-son qarori (2024-yil 10-yanvar tahriri):
 *      * Rash modeli asosida standartlashtirilgan T-ball (0.0 – 75.0 ball)
 *      * Darajalar: A+ (70.0+), A (65.0–69.9), B+ (60.0–64.9),
 *                   B (55.0–59.9), C+ (50.0–54.9), C (46.0–49.9)
 *      * OTM imtiyozi: A+ va A = 100% maksimal ball (testdan ozod);
 *                      B+, B, C+, C = raschScore / 65 × 100% proporsional ball
 *      * Amal qilish muddati: 3 yil
 *  - Prezidentning PF-37-son Farmoni (2025-yil 1-yanvardan):
 *      * Ona tili va adabiyot, Tarix (B+ va yuqori): +50% oylik ustama
 *  - Prezidentning PF-134-son Farmoni / amaldagi tartib:
 *      * Aniq, tabiiy va boshqa umumta'lim fanlari (B+ va yuqori): +20% oylik ustama
 *      * Chet tili (CEFR/Multilevel): C1 (65+ ball) = +50%, B2 (60+ ball) = +20%
 *  - Vazirlar Mahkamasining 411-son qarori (2026/2027-o'quv yilidan):
 *      * Boshlang'ich ta'lim (B+ va yuqori): +15% oylik ustama
 */

import { EXAM_BLUEPRINT, isPedBlockTopic } from '../data/examBlueprint';

export const MILLIY_CERT_TOTAL = 45;
export const MILLIY_CERT_DURATION_MIN = 150;
export const MILLIY_CERT_DURATION_SEC = MILLIY_CERT_DURATION_MIN * 60;
export const MILLIY_CERT_VALID_YEARS = 3;

/** 45 savollik Milliy Sertifikat uchun qiyinlik kvotalari (12 + 23 + 10 = 45) */
export const MILLIY_CERT_DIFF_TARGETS = {
  Y1: 12,
  Y2: 23,
  Y3: 10,
};

/** Rash modelida qiyinlik darajasi bo'yicha savol vazni (UI ko'rsatkichi) */
export const RASCH_WEIGHTS = {
  Y1: 1.0,
  Y2: 1.5,
  Y3: 2.2,
};

/** Rasch/IRT modeli uchun kalibrlangan savol qiyinlik (b_i) va farqlash kuchi (a_i) parametrlari */
export const RASCH_DIFFICULTY_B = {
  Y1: -1.10,
  Y2: 0.00,
  Y3: 1.25,
};

export const RASCH_DISCRIMINATION_A = {
  Y1: 1.0,
  Y2: 1.35,
  Y3: 1.80,
};

/** Milliy sertifikatning 3 ta progressiv bo'limi (1–12, 13–35, 36–45) */
export const MILLIY_CERT_PARTS = [
  { id: 'part1', diff: 'Y1', start: 0,  end: 12, label: 'I qism · Bazaviy (1–12)' },
  { id: 'part2', diff: 'Y2', start: 12, end: 35, label: "II qism · Asosiy (13–35)" },
  { id: 'part3', diff: 'Y3', start: 35, end: 45, label: 'III qism · Murakkab / Ochiq daraja (36–45)' },
];

/**
 * Fanlar kesimidagi RASMIY UzBMB Milliy Sertifikat spetsifikatsiyalari (2025/2026).
 * Faqat shu ro'yxatdagi fanlarda UzBMB (yoki VM 411) Milliy Sertifikat imtihoni o'tkaziladi.
 */
export const MILLIY_CERT_SPECS = {
  matematika: {
    durationMin: 150, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq',
  },
  fizika: {
    durationMin: 150, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq',
  },
  kimyo: {
    durationMin: 180, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq/yozma',
  },
  biologiya: {
    durationMin: 180, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq',
  },
  til: {
    durationMin: 180, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 9, hasEssay: true,
    bonusMinGrade: 'B+', bonusPct: 50, bonusLaw: 'PF-37 (2025-yildan B+ va yuqori: +50%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 9 ochiq + 1 esse',
  },
  rus_tili: {
    durationMin: 180, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 9, hasEssay: true,
    bonusMinGrade: 'B+', bonusPct: 50, bonusLaw: 'PF-37 (Ona tili va adabiyoti, B+: +50%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 9 ochiq + 1 esse',
  },
  tarix: {
    durationMin: 90, totalQuestions: 45, closedCount: 36, matchingCount: 0, openCount: 9, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 50, bonusLaw: 'PF-37 (2025-yildan B+ va yuqori: +50%)',
    formatLabel: '36 yopiq + 9 ochiq topshiriq',
  },
  geografiya: {
    durationMin: 150, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq',
  },
  huquq: {
    durationMin: 150, totalQuestions: 45, closedCount: 32, matchingCount: 3, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq',
  },
  ingliz: {
    durationMin: 150, totalQuestions: 45, closedCount: 35, matchingCount: 0, openCount: 10, hasEssay: true,
    bonusMinGrade: 'B+', bonusPct: 50, bonusPctBPlus: 20, bonusLaw: 'CEFR/Multilevel (C1/A+: +50%, B2/B+: +20%)',
    formatLabel: 'Reading · Grammar · Vocabulary · Pragmatics',
  },
  boshlangich: {
    durationMin: 150, totalQuestions: 45, closedCount: 35, matchingCount: 0, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 15, bonusLaw: 'VM 411 (2026/2027-yildan B+ va yuqori: +15%)',
    formatLabel: 'Ona tili · Matematika · Tabiiy fanlar (45 savol)',
  },
  musiqa: {
    durationMin: 120, totalQuestions: 45, closedCount: 35, matchingCount: 0, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'UzBMB Milliy sertifikat (B+ va yuqori: +20%)',
    formatLabel: '35 yopiq + 10 murakkab/amaliy nazariya',
  },
  sport: {
    durationMin: 120, totalQuestions: 45, closedCount: 35, matchingCount: 0, openCount: 10, hasEssay: false,
    bonusMinGrade: 'B+', bonusPct: 20, bonusLaw: 'UzBMB Milliy sertifikat (B+ va yuqori: +20%)',
    formatLabel: '35 yopiq + 10 murakkab/amaliy nazariya',
  },
};

/** Rasmiy sertifikat darajalari shkalasi (yuqoridan pastga, VM 646) */
export const MILLIY_CERT_TIERS = [
  { grade: 'A+', minScore: 70.0, color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', qualifiesForBonus: true,  isMaxDtm: true },
  { grade: 'A',  minScore: 65.0, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', qualifiesForBonus: true,  isMaxDtm: true },
  { grade: 'B+', minScore: 60.0, color: '#0E97E0', bg: 'rgba(14, 151, 224, 0.12)', qualifiesForBonus: true,  isMaxDtm: false },
  { grade: 'B',  minScore: 55.0, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', qualifiesForBonus: false, isMaxDtm: false },
  { grade: 'C+', minScore: 50.0, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', qualifiesForBonus: false, isMaxDtm: false },
  { grade: 'C',  minScore: 46.0, color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)',  qualifiesForBonus: false, isMaxDtm: false },
];

/**
 * Fan rasmiy UzBMB Milliy Sertifikat imtihonini qo'llab-quvvatlaydimi?
 * Faqat MILLIY_CERT_SPECS dagi rasmiy fanlar (MTT, pedmahorat va UzBMB sertifikati
 * mavjud bo'lmagan fanlar bundan mustasno).
 */
export const supportsMilliyCert = (category) =>
  Boolean(category && Object.prototype.hasOwnProperty.call(MILLIY_CERT_SPECS, category));

/**
 * Fan uchun rasmiy UzBMB Milliy Sertifikat spetsifikatsiyasi (davomiylik, tuzilish, ustama).
 */
export function getMilliyCertSpec(category) {
  const base = MILLIY_CERT_SPECS[category] || {
    durationMin: MILLIY_CERT_DURATION_MIN,
    totalQuestions: MILLIY_CERT_TOTAL,
    closedCount: 32,
    matchingCount: 3,
    openCount: 10,
    hasEssay: false,
    bonusMinGrade: 'B+',
    bonusPct: 20,
    bonusLaw: 'PF-134 / VM 646 (B+ va yuqori: +20%)',
    formatLabel: '32 yopiq + 3 moslashtirish + 10 ochiq',
  };
  return {
    ...base,
    durationSec: base.durationMin * 60,
    validYears: MILLIY_CERT_VALID_YEARS,
  };
}

/**
 * Fan va olingan daraja asosida qonuniy oylik ustama foizini hisoblaydi.
 * - B+, A, A+ dan past (B, C+, C) darajalarga umumiy fan o'qituvchilari uchun ustama berilmaydi (0%).
 * - Ona tili (`til`), Tarix (`tarix`), Rus tili (`rus_tili`): B+/A/A+ = 50% (PF-37).
 * - Ingliz tili (`ingliz`): A/A+ (C1) = 50%, B+ (B2) = 20%.
 * - Boshlang'ich ta'lim (`boshlangich`): B+/A/A+ = 15% (VM 411).
 * - Qolgan fanlar (Matematika, Fizika, Kimyo, Biologiya, Geografiya, Huquq, Musiqa, Sport): B+/A/A+ = 20%.
 */
export function salaryBonusForCert(category, grade) {
  if (!grade) return 0;
  const tier = MILLIY_CERT_TIERS.find((t) => t.grade === grade);
  if (!tier || !tier.qualifiesForBonus) return 0;

  const spec = getMilliyCertSpec(category);
  if (category === 'ingliz') {
    return grade === 'B+' ? (spec.bonusPctBPlus ?? 20) : spec.bonusPct;
  }
  return spec.bonusPct;
}

/**
 * Fan bo'limlari (validTopicIds) uchun 45 talik Milliy Sertifikat blueprint'ini
 * hisoblaydi. Pedagogik mahorat va kasb standarti bo'limlari (isPedBlockTopic)
 * chiqarib tashlanadi va qolgan 35 savollik mutaxassislik ulushi 45 taga
 * proporsional kengaytiriladi.
 *
 * @param {number[]} validTopicIds
 * @returns {Record<number, number>|null}
 */
export function milliyCertBlueprintForTopics(validTopicIds = []) {
  const coreTopicIds = validTopicIds.filter((id) => !isPedBlockTopic(id));
  if (coreTopicIds.length === 0) return null;

  const hasAll = coreTopicIds.every((id) => EXAM_BLUEPRINT[id] > 0);
  if (!hasAll) return null;

  const baseSum = coreTopicIds.reduce((sum, id) => sum + (EXAM_BLUEPRINT[id] || 0), 0);
  if (baseSum <= 0) return null;

  const scaled = {};
  let allocated = 0;
  let maxId = coreTopicIds[0];

  coreTopicIds.forEach((id) => {
    const raw = (EXAM_BLUEPRINT[id] / baseSum) * MILLIY_CERT_TOTAL;
    const count = Math.max(1, Math.round(raw));
    scaled[id] = count;
    allocated += count;
    if ((EXAM_BLUEPRINT[id] || 0) > (EXAM_BLUEPRINT[maxId] || 0)) {
      maxId = id;
    }
  });

  // Yaxlitlash farqini eng katta bo'limga qo'shamiz/ayiramiz — jami aniq 45 chiqadi
  const diff = MILLIY_CERT_TOTAL - allocated;
  if (diff !== 0 && scaled[maxId] + diff >= 1) {
    scaled[maxId] += diff;
  }

  return scaled;
}

/**
 * Turli fanlardagi qiyinlik formatlarini (`easy`/`medium`/`hard`/`advanced` va
 * `Y1`/`Y2`/`Y3`) yagona `Y1 | Y2 | Y3` shkalasiga keltiradi.
 * `fallbackIdx` berilsa va qiyinlik noma'lum bo'lsa 30/56/14% nisbatda taqsimlaydi.
 */
export function normalizeDifficulty(raw, fallbackIdx = null) {
  if (raw !== undefined && raw !== null) {
    const s = String(raw).trim().toLowerCase();
    if (s === 'y1' || s === 'easy' || s === 'oson' || s === '1') return 'Y1';
    if (s === 'y2' || s === 'medium' || s === 'orta' || s === "o'rta" || s === '2') return 'Y2';
    if (s === 'y3' || s === 'hard' || s === 'advanced' || s === 'qiyin' || s === '3') return 'Y3';
  }
  if (typeof fallbackIdx === 'number' && Number.isFinite(fallbackIdx)) {
    const mod = Math.abs(Math.floor(fallbackIdx)) % 100;
    if (mod < 30) return 'Y1';
    if (mod < 86) return 'Y2';
    return 'Y3';
  }
  return 'Y2';
}

/**
 * Milliy sertifikat uchun tanlangan 45 ta savolni UzBMB rasmiy tartibiga keltiradi:
 *  - Agar fan bazasida qiyinliklar bir xil teglangan bo'lsa (masalan, `rus_tili`
 *    yoki `ingliz` da barcha savol `hard/advanced` bo'lsa), savol matni va izoh
 *    murakkabligi bo'yicha 12 Y1 + 23 Y2 + 10 Y3 ga tabiiy muvozanatlaydi.
 *  - Savollarni progressiv tartibda joylashtiradi:
 *      1–12: Y1 (I qism · Bazaviy)
 *     13–35: Y2 (II qism · Asosiy)
 *     36–45: Y3 (III qism · Murakkab / Ochiq daraja)
 */
export function orderAndBalanceMilliyCert(questions = []) {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const counts = { Y1: 0, Y2: 0, Y3: 0 };
  const normalized = questions.map((q, idx) => {
    const d = normalizeDifficulty(q?.difficulty, idx);
    counts[d] += 1;
    return { ...q, difficulty: d };
  });

  const n = normalized.length;
  const maxSingleShare = Math.max(counts.Y1, counts.Y2, counts.Y3) / n;

  // Agar biror qiyinlik darajasi 80%+ ni egallab qolgan bo'lsa (yoki Y1/Y3 umuman bo'lmasa) —
  // matn va tahlil uzunligi bo'yicha 12 / 23 / 10 proporsiyada qayta kalibrlaymiz.
  let balanced = normalized;
  if (n >= 10 && (maxSingleShare >= 0.8 || counts.Y1 === 0 || counts.Y3 === 0)) {
    const complexity = (q) => {
      const qLen = String(q?.q || '').length;
      const optLen = Array.isArray(q?.opts)
        ? q.opts.reduce((s, o) => s + String(o || '').length, 0) / Math.max(1, q.opts.length)
        : 0;
      const hasNumbers = /\d/.test(String(q?.q || '')) ? 25 : 0;
      const expLen = Math.min(200, String(q?.explanation || '').length * 0.25);
      return qLen + optLen * 1.2 + hasNumbers + expLen;
    };

    const y1Target = Math.round((MILLIY_CERT_DIFF_TARGETS.Y1 / MILLIY_CERT_TOTAL) * n);
    const y3Target = Math.round((MILLIY_CERT_DIFF_TARGETS.Y3 / MILLIY_CERT_TOTAL) * n);
    const y2Target = Math.max(0, n - y1Target - y3Target);

    const ranked = normalized
      .map((q, idx) => ({ q, score: complexity(q), idx }))
      .sort((a, b) => a.score - b.score || a.idx - b.idx);

    balanced = ranked.map((item, rank) => {
      const diff = rank < y1Target ? 'Y1' : rank < y1Target + y2Target ? 'Y2' : 'Y3';
      return { ...item.q, difficulty: diff };
    });
  }

  // Rasmiy UzBMB tartibi: avval Y1 (oson), keyin Y2 (o'rta), oxirida Y3 (murakkab/ochiq)
  const y1 = balanced.filter((q) => q.difficulty === 'Y1');
  const y2 = balanced.filter((q) => q.difficulty === 'Y2');
  const y3 = balanced.filter((q) => q.difficulty === 'Y3');

  return [...y1, ...y2, ...y3];
}

/**
 * IRT / Rasch qobiliyat logiti (theta) ni Newton-Raphson MAP usulida baholash.
 * Har bir savol o'zining qiyinlik parametri (b_i) va farqlash kuchi (a_i) bilan
 * qatnashadi: murakkab Y3 savolni yechish oson Y1 ga nisbatan qat'iy yuqori theta beradi.
 */
function estimateRaschTheta(items) {
  let theta = 0.0;
  const priorPrecision = 0.12; // 1 / sigma^2 (yumshoq regulyarizatsiya)

  for (let iter = 0; iter < 15; iter++) {
    let grad = -priorPrecision * theta;
    let hess = -priorPrecision;

    for (const item of items) {
      const a = item.a || 1.0;
      const p = 1 / (1 + Math.exp(-a * (theta - item.b)));
      grad += a * (item.correct - p);
      hess -= a * a * p * (1 - p);
    }

    if (Math.abs(hess) < 1e-8) break;
    const step = grad / hess;
    theta = Math.max(-4.0, Math.min(4.0, theta - step));
    if (Math.abs(step) < 1e-4) break;
  }

  return theta;
}

/**
 * Rash modeli (1PL IRT logit + vaznli aniqlik kalibrlashi) asosida Milliy Sertifikat
 * balli, darajasi, OTM proporsional foizi va fanbo'yicha qonuniy oylik ustamani hisoblash.
 *
 * @param {Array<{correct: number, difficulty?: string}>} questions
 * @param {Record<number, number>} answers
 * @param {string} [category]  Fan kodi (ustama qonunchiligi va spetsifikatsiya uchun)
 */
export function calculateMilliyCertResult(questions = [], answers = {}, category = null) {
  const spec = getMilliyCertSpec(category);
  const breakdown = {
    Y1: { correct: 0, total: 0, weight: RASCH_WEIGHTS.Y1 },
    Y2: { correct: 0, total: 0, weight: RASCH_WEIGHTS.Y2 },
    Y3: { correct: 0, total: 0, weight: RASCH_WEIGHTS.Y3 },
  };

  let earnedWeight = 0;
  let totalWeight = 0;
  let correctCount = 0;
  const irtItems = [];

  questions.forEach((q, idx) => {
    const diff = normalizeDifficulty(q?.difficulty, null);
    const w = RASCH_WEIGHTS[diff];
    const b = RASCH_DIFFICULTY_B[diff];
    const a = RASCH_DISCRIMINATION_A[diff];
    const isCorrect = answers[idx] !== undefined && answers[idx] === q.correct;

    breakdown[diff].total += 1;
    totalWeight += w;
    if (isCorrect) {
      breakdown[diff].correct += 1;
      earnedWeight += w;
      correctCount += 1;
    }

    irtItems.push({ a, b, correct: isCorrect ? 1 : 0 });
  });

  const totalQ = questions.length;
  const wRatio = totalWeight > 0 ? earnedWeight / totalWeight : 0;

  // 1PL Rasch ability logit (theta)
  const rawTheta = totalQ > 0 ? estimateRaschTheta(irtItems) : -3.5;
  const thetaMin = totalQ > 0 ? estimateRaschTheta(irtItems.map((it) => ({ ...it, correct: 0 }))) : -3.5;
  const thetaMax = totalQ > 0 ? estimateRaschTheta(irtItems.map((it) => ({ ...it, correct: 1 }))) : 3.5;
  const thetaNorm = thetaMax > thetaMin
    ? Math.max(0, Math.min(1, (rawTheta - thetaMin) / (thetaMax - thetaMin)))
    : 0;

  // Kombinatsiyalangan Rasch indeksi (70% vaznli qiyinlik nisbati + 30% 1PL IRT logit):
  //  - Barcha javob xato (0%)  → 0.0 ball
  //  - Barcha javob to'g'ri    → 75.0 ball (A+)
  //  - Qiyin Y3 savolni yechish oson Y1 savolni yechishdan sezilarli ko'proq ball beradi
  //  - ~53% daraja → 46.0 ball (C), ~92%+ → 70.0+ ball (A+)
  const compositeRatio = totalQ === 0 || correctCount === 0
    ? 0
    : correctCount === totalQ
      ? 1
      : 0.7 * wRatio + 0.3 * thetaNorm;

  let raschScore = 0;
  if (compositeRatio > 0) {
    if (compositeRatio < 0.53) {
      raschScore = Math.round((compositeRatio / 0.53) * 45.9 * 10) / 10;
    } else {
      raschScore = Math.round((46.0 + ((compositeRatio - 0.53) / 0.47) * 29.0) * 10) / 10;
    }
  }
  raschScore = Math.min(75.0, Math.max(0, raschScore));

  // Mos darajani topish
  let matchedTier = null;
  let nextTier = MILLIY_CERT_TIERS[MILLIY_CERT_TIERS.length - 1]; // C

  for (let i = 0; i < MILLIY_CERT_TIERS.length; i++) {
    if (raschScore >= MILLIY_CERT_TIERS[i].minScore) {
      matchedTier = MILLIY_CERT_TIERS[i];
      nextTier = i > 0 ? MILLIY_CERT_TIERS[i - 1] : null;
      break;
    }
  }

  const grade = matchedTier ? matchedTier.grade : null;
  const pointsToNext = nextTier
    ? Math.max(0.1, Math.round((nextTier.minScore - raschScore) * 10) / 10)
    : 0;

  // VM 646 bo'yicha aniq OTM kirish balli foizi:
  //  - 65.0+ (A / A+) → 100% maksimal ball
  //  - 46.0 – 64.9 (C .. B+) → raschScore / 65 × 100% proporsional
  //  - < 46.0 → 0%
  const dtmPct = !matchedTier
    ? 0
    : matchedTier.isMaxDtm
      ? 100
      : Math.min(99.9, Math.round((raschScore / 65.0) * 1000) / 10);

  const salaryBonusPct = salaryBonusForCert(category, grade);
  const thetaDisplay = Math.round(rawTheta * 100) / 100;

  return {
    raschScore,
    maxRaschScore: 75.0,
    theta: thetaDisplay,
    grade,
    color: matchedTier ? matchedTier.color : 'var(--red)',
    bg: matchedTier ? matchedTier.bg : 'rgba(239, 68, 68, 0.10)',
    salaryBonusPct,
    bonusLaw: spec.bonusLaw,
    dtmPct,
    validYears: spec.validYears,
    spec,
    nextGrade: nextTier ? nextTier.grade : null,
    pointsToNext,
    breakdown,
  };
}
