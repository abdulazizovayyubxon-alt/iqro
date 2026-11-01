/**
 * milliySertifikat.js — UzBMB Milliy Sertifikat (A+, A, B+, B, C+, C)
 * simulyatori uchun savollar proporsiyasi va Rash modeli (Rasch model)
 * bo'yicha baholash mexanizmi.
 *
 * Rasmiy UzBMB me'yorlari:
 *  - Savollar soni: 45 ta (100% mutaxassislik — pedagogik mahorat bloki yo'q)
 *  - Vaqt: 150 daqiqa (9000 soniya)
 *  - Qiyinlik taqsimoti: Y1 (oson) = 12 ta, Y2 (o'rta) = 23 ta, Y3 (murakkab) = 10 ta
 *  - Baholash: Rash modeli asosida standartlashtirilgan T-ball (0 – 75.0 ball)
 *  - Sertifikat darajalari:
 *      A+ : 70.0 va undan yuqori
 *      A  : 65.0 – 69.9
 *      B+ : 60.0 – 64.9
 *      B  : 55.0 – 59.9
 *      C+ : 50.0 – 54.9
 *      C  : 46.0 – 49.9
 */

import { EXAM_BLUEPRINT, isPedBlockTopic } from '../data/examBlueprint';

export const MILLIY_CERT_TOTAL = 45;
export const MILLIY_CERT_DURATION_MIN = 150;
export const MILLIY_CERT_DURATION_SEC = MILLIY_CERT_DURATION_MIN * 60;

/** 45 savollik Milliy Sertifikat uchun qiyinlik kvotalari (12 + 23 + 10 = 45) */
export const MILLIY_CERT_DIFF_TARGETS = {
  Y1: 12,
  Y2: 23,
  Y3: 10,
};

/** Rash modelida qiyinlik darajasi bo'yicha savol vazni */
export const RASCH_WEIGHTS = {
  Y1: 1.0,
  Y2: 1.5,
  Y3: 2.2,
};

/** Rasmiy sertifikat darajalari shkalasi (yuqoridan pastga) */
export const MILLIY_CERT_TIERS = [
  { grade: 'A+', minScore: 70.0, color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', salaryBonusPct: 50, dtmPct: 100 },
  { grade: 'A',  minScore: 65.0, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', salaryBonusPct: 50, dtmPct: 100 },
  { grade: 'B+', minScore: 60.0, color: '#0E97E0', bg: 'rgba(14, 151, 224, 0.12)', salaryBonusPct: 50, dtmPct: 93 },
  { grade: 'B',  minScore: 55.0, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', salaryBonusPct: 20, dtmPct: 85 },
  { grade: 'C+', minScore: 50.0, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', salaryBonusPct: 20, dtmPct: 78 },
  { grade: 'C',  minScore: 46.0, color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)',  salaryBonusPct: 0,  dtmPct: 70 },
];

/** Milliy sertifikat mavjud bo'lmagan yo'nalishlar (MTT va umumiy pedagogik mahorat) */
const NON_CERT_CATEGORIES = new Set([
  'pedmahorat',
  'mtt',
  'mtt_rahbar',
  'mtt_logoped',
  'mtt_psixolog',
  'mtt_jismoniy',
]);

/**
 * Fan Milliy Sertifikat simulyatorini qo'llab-quvvatlaydimi?
 * Faqat umumta'lim maktab fanlarida ochiq (MTT va pedmahorat dan tashqari).
 */
export const supportsMilliyCert = (category) =>
  Boolean(category && !NON_CERT_CATEGORIES.has(category));

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
 * Rash modeli asosida Milliy Sertifikat balli va darajasini hisoblash.
 *
 * @param {Array<{correct: number, difficulty?: string}>} questions
 * @param {Record<number, number>} answers
 * @returns {{
 *   raschScore: number,
 *   maxRaschScore: number,
 *   grade: string|null,
 *   color: string,
 *   bg: string,
 *   salaryBonusPct: number,
 *   dtmPct: number,
 *   nextGrade: string|null,
 *   pointsToNext: number,
 *   breakdown: {
 *     Y1: { correct: number, total: number, weight: number },
 *     Y2: { correct: number, total: number, weight: number },
 *     Y3: { correct: number, total: number, weight: number }
 *   }
 * }}
 */
export function calculateMilliyCertResult(questions = [], answers = {}) {
  const breakdown = {
    Y1: { correct: 0, total: 0, weight: RASCH_WEIGHTS.Y1 },
    Y2: { correct: 0, total: 0, weight: RASCH_WEIGHTS.Y2 },
    Y3: { correct: 0, total: 0, weight: RASCH_WEIGHTS.Y3 },
  };

  let earnedWeight = 0;
  let totalWeight = 0;

  questions.forEach((q, idx) => {
    const diff = breakdown[q?.difficulty] ? q.difficulty : 'Y2';
    const w = RASCH_WEIGHTS[diff];
    breakdown[diff].total += 1;
    totalWeight += w;

    if (answers[idx] !== undefined && answers[idx] === q.correct) {
      breakdown[diff].correct += 1;
      earnedWeight += w;
    }
  });

  const wRatio = totalWeight > 0 ? earnedWeight / totalWeight : 0;

  // Rash T-ball kalibrlash (0 – 75.0 ball):
  // 53% vaznli natija → 46.0 ball (C daraja o'tish chegarasi)
  // 92%+ vaznli natija → 70.0+ ball (A+ daraja)
  let raschScore = 0;
  if (wRatio > 0) {
    if (wRatio < 0.53) {
      raschScore = Math.round((wRatio / 0.53) * 45.9 * 10) / 10;
    } else {
      raschScore = Math.round((46.0 + ((wRatio - 0.53) / 0.47) * 29.0) * 10) / 10;
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

  const pointsToNext = nextTier
    ? Math.max(0.1, Math.round((nextTier.minScore - raschScore) * 10) / 10)
    : 0;

  return {
    raschScore,
    maxRaschScore: 75.0,
    grade: matchedTier ? matchedTier.grade : null,
    color: matchedTier ? matchedTier.color : 'var(--red)',
    bg: matchedTier ? matchedTier.bg : 'rgba(239, 68, 68, 0.10)',
    salaryBonusPct: matchedTier ? matchedTier.salaryBonusPct : 0,
    dtmPct: matchedTier ? matchedTier.dtmPct : 0,
    nextGrade: nextTier ? nextTier.grade : null,
    pointsToNext,
    breakdown,
  };
}
