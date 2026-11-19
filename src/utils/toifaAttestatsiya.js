/**
 * toifaAttestatsiya.js — O'zbekiston Respublikasi Maktabgacha va maktab ta'limi
 * vazirligi malaka toifa (attestatsiya) imtihoni uchun 100 ballik rasmiy baholash
 * mexanizmi (VM 572-son qarori va 2026-yilgi fan spetsifikatsiyalari asosida).
 *
 * Rasmiy me'yorlar:
 *  - Standart imtihon: 50 ta savol × 2 ball = 100 ball
 *      1) Mutaxassislik fani: 35 ta savol (70 ball)
 *      2) Pedagogik mahorat:  10 ta savol (20 ball)
 *      3) Kasb standarti:      5 ta savol (10 ball)
 *    (Birinchi 9 ta fanda Pedagogik mahorat va Kasb standarti bitta 15 savollik
 *     blokda birlashgan = 30 ball; `pedmahorat` umumiy fanida esa jami 15 savol).
 *  - Malaka toifasi darajalari (100 ballik shkalada):
 *      Oliy toifa     : 86 – 100 ball (shuningdek 70% Vazir jamg'armasi ustamasi talabi)
 *      Birinchi toifa : 70 – 85 ball
 *      Ikkinchi toifa : 56 – 69 ball
 *      O'tmadi        : 0 – 55 ball
 */

import { isPedBlockTopic } from '../data/examBlueprint';

export const TOIFA_MAX_SCORE = 100;
export const TOIFA_POINTS_PER_QUESTION = 2;

/** Kasb standarti bo'limlari (5 savol = 10 ball) */
export const KASB_STANDARTI_TOPIC_IDS = new Set([
  85,   // Biologiya
  95,   // Geografiya
  105,  // MTT logoped
  112,  // MTT psixolog
  119,  // Kimyo
  127,  // Rus tili
  135,  // Ingliz tili
  144,  // MTT jismoniy tarbiya
  152,  // Matematika
  165,  // Tarbiya
  167, 176, // Pedmahorat (MTT: Qonunchilik 1 + Kasbiy standart 4 = 5)
  184,  // Fizika
  194,  // Texnologiya (dizayn)
  202,  // Texnologiya (servis)
  204,  // Pedmahorat (Maktab: Kasb standarti = 5)
  221,  // Davlat va huquq asoslari
  229,  // Musiqa madaniyati
  237,  // Iqtisodiy bilim asoslari
  244,  // Maktab logopediyasi
  252,  // Defektologiya
  257,  // MTT Musiqa rahbari
  265,  // Maktab psixologi
]);

/** Rasmiy malaka toifa darajalari shkalasi (yuqoridan pastga) */
export const TOIFA_TIERS = [
  {
    id: 'oliy',
    grade: 'Oliy toifa',
    shortLabel: 'Oliy',
    minScore: 86,
    maxScore: 100,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    vazirBonusPct: 70,
  },
  {
    id: 'birinchi',
    grade: 'Birinchi toifa',
    shortLabel: 'I toifa',
    minScore: 70,
    maxScore: 85,
    color: '#0E97E0',
    bg: 'rgba(14, 151, 224, 0.12)',
    vazirBonusPct: 0,
  },
  {
    id: 'ikkinchi',
    grade: 'Ikkinchi toifa',
    shortLabel: 'II toifa',
    minScore: 56,
    maxScore: 69,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    vazirBonusPct: 0,
  },
];

/**
 * Toifa attestatsiyasi imtihoni natijasini 100 ballik rasmiy shkala va
 * bloklar (Mutaxassislik / Pedagogik mahorat / Kasb standarti) kesimida hisoblaydi.
 *
 * @param {Array<{correct: number, topicId?: number}>} questions
 * @param {Record<number, number>} answers
 * @returns {{
 *   score100: number,
 *   maxScore: number,
 *   correctCount: number,
 *   totalQuestions: number,
 *   tierId: string|null,
 *   grade: string|null,
 *   shortLabel: string,
 *   color: string,
 *   bg: string,
 *   vazirBonusEligible: boolean,
 *   vazirBonusPct: number,
 *   nextGrade: string|null,
 *   pointsToNext: number,
 *   blocks: {
 *     specialty: { correct: number, total: number, score: number, maxScore: number },
 *     pedagogy:  { correct: number, total: number, score: number, maxScore: number },
 *     standard:  { correct: number, total: number, score: number, maxScore: number },
 *     hasSplitPedBlock: boolean,
 *   }
 * }}
 */
export function calculateToifaResult(questions = [], answers = {}) {
  const totalQuestions = Array.isArray(questions) ? questions.length : 0;
  const spec = { correct: 0, total: 0 };
  const ped = { correct: 0, total: 0 };
  const std = { correct: 0, total: 0 };

  let correctCount = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const q = questions[i];
    if (!q) continue;
    const isCorrect = answers[i] !== undefined && answers[i] === q.correct;
    if (isCorrect) correctCount++;

    const tid = Number(q.topicId);
    if (KASB_STANDARTI_TOPIC_IDS.has(tid)) {
      std.total++;
      if (isCorrect) std.correct++;
    } else if (isPedBlockTopic(tid)) {
      ped.total++;
      if (isCorrect) ped.correct++;
    } else {
      spec.total++;
      if (isCorrect) spec.correct++;
    }
  }

  // 50 ta savolda har bir savol aniq 2 ball; boshqa savol sonida (masalan 15 talik
  // pedmahorat yoki haftalik diagnostika) 100 ballik shkalaga proporsional o'giriladi.
  const pointWeight = totalQuestions > 0 ? TOIFA_MAX_SCORE / totalQuestions : TOIFA_POINTS_PER_QUESTION;
  const score100 = totalQuestions === 50
    ? correctCount * TOIFA_POINTS_PER_QUESTION
    : totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * TOIFA_MAX_SCORE)
      : 0;

  const matchedTier = TOIFA_TIERS.find((t) => score100 >= t.minScore) || null;

  let nextGrade = null;
  let pointsToNext = 0;
  if (!matchedTier) {
    const lowest = TOIFA_TIERS[TOIFA_TIERS.length - 1];
    nextGrade = lowest.grade;
    pointsToNext = Math.max(0, lowest.minScore - score100);
  } else {
    const idx = TOIFA_TIERS.findIndex((t) => t.id === matchedTier.id);
    if (idx > 0) {
      const higher = TOIFA_TIERS[idx - 1];
      nextGrade = higher.grade;
      pointsToNext = Math.max(0, higher.minScore - score100);
    }
  }

  const toScore = (c) => Math.round(c * pointWeight);

  return {
    score100,
    maxScore: TOIFA_MAX_SCORE,
    correctCount,
    totalQuestions,
    tierId: matchedTier ? matchedTier.id : null,
    grade: matchedTier ? matchedTier.grade : null,
    shortLabel: matchedTier ? matchedTier.shortLabel : '—',
    color: matchedTier ? matchedTier.color : '#EF4444',
    bg: matchedTier ? matchedTier.bg : 'rgba(239, 68, 68, 0.10)',
    vazirBonusEligible: score100 >= 86,
    vazirBonusPct: matchedTier ? matchedTier.vazirBonusPct : 0,
    nextGrade,
    pointsToNext,
    blocks: {
      specialty: {
        correct: spec.correct,
        total: spec.total,
        score: toScore(spec.correct),
        maxScore: toScore(spec.total),
      },
      pedagogy: {
        correct: ped.correct,
        total: ped.total,
        score: toScore(ped.correct),
        maxScore: toScore(ped.total),
      },
      standard: {
        correct: std.correct,
        total: std.total,
        score: toScore(std.correct),
        maxScore: toScore(std.total),
      },
      hasSplitPedBlock: std.total > 0,
    },
  };
}
