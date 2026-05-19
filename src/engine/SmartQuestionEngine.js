/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          SMART QUESTION ENGINE — IQRO Platformasi           ║
 * ║                                                              ║
 * ║  Ebbinghaus Unutish Egri Chizig'i + Adaptive Difficulty      ║
 * ║  asosida aqlli savol tanlash va takrorlash algoritmi          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * QANDAY ISHLAYDI:
 *
 * 1. ADAPTIVE SELECTION (Moslashtiruvchi Tanlash):
 *    - Foydalanuvchining topicStats'dan zaif mavzularni aniqlaydi
 *    - Zaif mavzularga 2-3x ko'proq og'irlik beradi
 *    - Qiyinlik darajasini foydalanuvchi natijasiga qarab moslaydi
 *
 * 2. SPACED REPETITION (Takroriy Ko'rsatish):
 *    - Ebbinghaus formulasi: interval = baseInterval * (2.5 ^ level)
 *    - To'g'ri javob → level + 1, interval oshadi (kamroq ko'rsatiladi)
 *    - Noto'g'ri javob → level = 0, interval 0 (darhol qayta ko'rsatiladi)
 *    - difficulty factor: ko'p xato qilingan savollar uchun intervallar qisqartiriladi
 *
 * 3. QUESTION PRIORITIZATION (Savol Ustivorligi):
 *    Priority = weakTopicWeight * difficultyWeight * spacedRepetitionWeight
 *    - weakTopicWeight:  zaif mavzudagi savollar 3x ustivor
 *    - difficultyWeight: qiyinroq savollar 1.5x ustivor
 *    - spacedRepetition: takrorlash muddati kelgan savollar 5x ustivor
 */

import { TOPICS } from '../data/mockData';

// ─── EBBINGHAUS CONSTANTS ───
// Base interval (daqiqada) - 10 daqiqa
const BASE_INTERVAL_MIN = 10;
// Multiplikator — har level da interval shu koeffitsientga ko'payadi
const INTERVAL_MULTIPLIER = 2.5;
// Maksimal level (7 ta o'tgandan so'ng savol "o'rganilgan" hisoblanadi)
const MAX_LEVEL = 7;
// Qiyinlik koeffitsienti — qanchalik ko'p xato → interval qanchalik qisqa
const DIFFICULTY_PENALTY = 0.85; // har bir difficulty level uchun 15% qisqaradi

/**
 * Ebbinghaus formulasi bo'yicha keyingi takrorlash vaqtini hisoblaydi
 *
 * @param {number} level - Joriy o'rganish darajasi (0-7)
 * @param {number} difficulty - Qiyinlik koeffitsienti (1-5, ko'p xato = yuqori)
 * @returns {number} Keyingi takrorlash vaqti (millisekund)
 *
 * Intervallar (difficulty=1 uchun):
 *   Level 0: 10 min
 *   Level 1: 25 min
 *   Level 2: ~1 soat
 *   Level 3: ~2.5 soat
 *   Level 4: ~6.5 soat
 *   Level 5: ~16 soat
 *   Level 6: ~1.7 kun
 *   Level 7: ~4.3 kun
 */
export const calculateNextReview = (level, difficulty = 1) => {
  const clampedLevel = Math.min(level, MAX_LEVEL);
  const clampedDifficulty = Math.max(1, Math.min(difficulty, 5));

  // Interval (daqiqada): base * (multiplier ^ level) * (penalty ^ (difficulty - 1))
  const intervalMinutes =
    BASE_INTERVAL_MIN *
    Math.pow(INTERVAL_MULTIPLIER, clampedLevel) *
    Math.pow(DIFFICULTY_PENALTY, clampedDifficulty - 1);

  return Math.round(intervalMinutes * 60 * 1000); // ms ga o'tkazish
};

/**
 * Spaced Repetition kartochkasini yangilaydi
 *
 * @param {object} card - Mavjud kartochka
 * @param {boolean} wasCorrect - Javob to'g'rimi?
 * @returns {object} Yangilangan kartochka
 */
export const updateSpacedCard = (card, wasCorrect) => {
  const now = Date.now();

  if (wasCorrect) {
    const newLevel = Math.min((card.level || 0) + 1, MAX_LEVEL);
    const newCorrectStreak = (card.correctStreak || 0) + 1;
    // Agar 3x ketma-ket to'g'ri javob bersa, difficulty kamayadi
    const newDifficulty = newCorrectStreak >= 3
      ? Math.max(1, (card.difficulty || 1) - 0.5)
      : (card.difficulty || 1);

    return {
      ...card,
      level: newLevel,
      correctStreak: newCorrectStreak,
      difficulty: newDifficulty,
      lastReview: now,
      nextReview: now + calculateNextReview(newLevel, newDifficulty),
      lastResult: 'correct'
    };
  } else {
    // Noto'g'ri javob — level 0 ga tushadi, difficulty oshadi
    const newDifficulty = Math.min((card.difficulty || 1) + 1, 5);
    return {
      ...card,
      level: 0,
      correctStreak: 0,
      difficulty: newDifficulty,
      lastReview: now,
      nextReview: now + calculateNextReview(0, newDifficulty), // 10 min keyin
      lastResult: 'wrong'
    };
  }
};

/**
 * Foydalanuvchi statistikasi asosida zaif mavzularni aniqlaydi
 *
 * @param {object} topicStats - { topicId: { answered, correct } }
 * @param {string} activeCategory - 'chqbt' | 'art'
 * @returns {object} { topicId: weaknessScore } — yuqori skor = zaifroq
 */
export const analyzeWeakTopics = (topicStats = {}, activeCategory = 'chqbt') => {
  const weakness = {};

  const categoryTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(activeCategory) : t.category === activeCategory
  );

  for (const topic of categoryTopics) {
    const stats = topicStats[topic.id];

    if (!stats || stats.answered === 0) {
      // Hech javob berilmagan → o'rtacha zaif (o'rganilmagan)
      weakness[topic.id] = 2.0;
    } else {
      const accuracy = stats.correct / stats.answered;
      // Accuracy 0-1 orasida: 0 = juda zaif, 1 = juda kuchli
      // Weakness formulasi: past accuracy = yuqori weakness
      // accuracy 0.3 → weakness 3.5
      // accuracy 0.5 → weakness 2.5
      // accuracy 0.7 → weakness 1.5
      // accuracy 0.9 → weakness 0.5
      weakness[topic.id] = Math.max(0.3, (1 - accuracy) * 5);

      // Kam javob berilgan mavzularga qo'shimcha og'irlik
      if (stats.answered < 10) {
        weakness[topic.id] *= 1.3;
      }
    }
  }

  return weakness;
};

/**
 * Savollarni aqlli tarzda saralaydi va tanlaydi
 *
 * @param {Array} allQuestions - Firestore'dan olingan barcha savollar
 * @param {object} options
 * @param {object} options.topicStats - Foydalanuvchi mavzu statistikasi
 * @param {Array}  options.spacedCards - Spaced Repetition kartochkalari
 * @param {Array}  options.mistakes - Mavjud xatolar ro'yxati
 * @param {string} options.activeCategory - Faol kategoriya
 * @param {number} options.batchSize - Kerakli savollar soni
 * @param {number} options.topicId - Tanlangan mavzu (-1 = barchasi)
 * @returns {Array} Aqlli tartiblangan savollar
 */
export const smartSort = (allQuestions, options = {}) => {
  const {
    topicStats = {},
    spacedCards = [],
    mistakes = [],
    activeCategory = 'chqbt',
    batchSize = 50,
    topicId = -1
  } = options;

  if (!allQuestions || allQuestions.length === 0) return [];

  // 1. Zaif mavzularni aniqlash
  const weakness = analyzeWeakTopics(topicStats, activeCategory);

  // 2. Spaced Repetition kartochkalarini tezkor lug'atga aylantirish
  const spacedMap = new Map();
  for (const card of spacedCards) {
    spacedMap.set(card.qHash, card);
  }

  // 3. Xatolar to'plamini tezkor lug'atga aylantirish
  const mistakeSet = new Set(
    mistakes.map(m => (m.question || '').substring(0, 100))
  );

  const now = Date.now();

  // 4. Har bir savolga "priority" ball hisoblash
  const scoredQuestions = allQuestions.map(q => {
    let priority = 1.0;
    const qHash = (q.q || '').substring(0, 100);

    // A. Zaif mavzu bo'yicha og'irlik (1.0 - 5.0x)
    const qTopicId = q.topicId ?? topicId;
    const topicWeakness = weakness[qTopicId] || 1.0;
    priority *= topicWeakness;

    // B. Spaced Repetition — takrorlash muddati kelganmi?
    const spacedCard = spacedMap.get(qHash);
    if (spacedCard) {
      if (spacedCard.nextReview <= now) {
        // Takrorlash muddati kelgan — YUQORI ustivorlik
        const overdueMinutes = (now - spacedCard.nextReview) / (60 * 1000);
        const overdueBonus = Math.min(5.0, 2.0 + overdueMinutes / 60);
        priority *= overdueBonus;
      } else {
        // Hali muddati kelmagan — PAST ustivorlik
        priority *= 0.2;
      }

      // Qiyinlik koeffitsienti
      priority *= Math.max(1.0, (spacedCard.difficulty || 1) * 0.8);
    }

    // C. Xatolar ro'yxatidagi savollar 1.5x ustivor
    if (mistakeSet.has(qHash)) {
      priority *= 1.5;
    }

    // D. Tasodifiy o'zgaruvchanlik (10%) — monotonlikni oldini olish
    priority *= (0.9 + Math.random() * 0.2);

    return { ...q, _priority: priority, _spacedCard: spacedCard };
  });

  // 5. Priority bo'yicha kamayish tartibida saralash
  scoredQuestions.sort((a, b) => b._priority - a._priority);

  // 6. Takrorlash muddati kelgan savollarni ajratib olish
  const dueForReview = [];
  const regular = [];

  for (const q of scoredQuestions) {
    if (q._spacedCard && q._spacedCard.nextReview <= now) {
      dueForReview.push(q);
    } else {
      regular.push(q);
    }
  }

  // 7. Final ro'yxat: avval takrorlash savollari (maks 30%), keyin oddiy
  const maxReviewSlots = Math.ceil(batchSize * 0.3);
  const reviewQuestions = dueForReview.slice(0, maxReviewSlots);
  const remainingSlots = batchSize - reviewQuestions.length;
  const regularQuestions = regular.slice(0, remainingSlots);

  // Aralashtirib qo'shamiz (foydalanuvchi farq qilmasligi uchun)
  const finalBatch = [...reviewQuestions, ...regularQuestions];

  // Ichki shuffle — foydalanuvchi takrorlash va yangi savollar tartibini sezmasligi uchun
  for (let i = finalBatch.length - 1; i > 0; i--) {
    // Faqat yaqin atrofdagi savollarni almashtiramiz (3 ta ichida)
    const j = Math.max(0, i - Math.floor(Math.random() * 3));
    [finalBatch[i], finalBatch[j]] = [finalBatch[j], finalBatch[i]];
  }

  // Debug flag'larni tozalash
  return finalBatch.map(({ _priority, _spacedCard, ...q }) => ({
    ...q,
    // TestPage uchun qiyinlik indikatori
    difficulty: _spacedCard?.difficulty ?? q.difficulty
  }));
};

/**
 * Test natijalarini jamlaydi — TestPage test yakunida chaqiradi
 * Natija: { corrections, spacedUpdates, topicDeltas }
 *
 * @param {Array} questions  - Test savollari
 * @param {object} answers   - { qIndex: selectedOptIdx }
 * @param {Array} spacedCards - Joriy spaced cards ro'yxati
 * @param {number} topicId   - Mavzu ID
 * @returns {object} Jamlanma
 */
export const summarizeTestResults = (questions, answers, spacedCards = [], topicId = -1) => {
  const spacedMap = new Map();
  for (const card of spacedCards) {
    spacedMap.set(card.qHash, card);
  }

  let correctCount = 0;
  let wrongCount = 0;
  const newMistakes = [];
  const updatedCards = new Map(spacedCards.map(c => [c.qHash, { ...c }]));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const selected = answers[i];
    if (selected === undefined) continue;

    const qHash = (q.q || '').substring(0, 100);
    const wasCorrect = selected === q.correct;

    if (wasCorrect) {
      correctCount++;

      // Spaced Repetition: to'g'ri javob → level ko'tariladi
      if (updatedCards.has(qHash)) {
        updatedCards.set(qHash, updateSpacedCard(updatedCards.get(qHash), true));
      }
    } else {
      wrongCount++;

      // Xato ma'lumotlarini yig'ish
      newMistakes.push({
        topic: topicId >= 0 ? TOPICS.find(t => t.id === topicId)?.name || 'Aralash' : 'Aralash',
        question: q.q,
        correct: q.opts[q.correct],
        opts: q.opts || []
      });

      // Spaced Repetition: noto'g'ri javob
      if (updatedCards.has(qHash)) {
        updatedCards.set(qHash, updateSpacedCard(updatedCards.get(qHash), false));
      } else {
        // Yangi xato — kartochka yaratish
        const newCard = {
          ...q, // image, isHtml, explanation kabi xususiyatlarni yo'qotmaslik uchun
          qHash,
          q: q.q,
          opts: q.opts || [],
          correct: q.correct,
          topicId: q.topicId ?? topicId,
          level: 0,
          correctStreak: 0,
          difficulty: 1,
          lastReview: Date.now(),
          nextReview: Date.now() + calculateNextReview(0, 1),
          lastResult: 'wrong'
        };
        updatedCards.set(qHash, newCard);
      }
    }
  }

  return {
    correctCount,
    wrongCount,
    totalAnswered: correctCount + wrongCount,
    accuracy: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
    newMistakes,
    updatedSpacedCards: Array.from(updatedCards.values()).slice(-200) // Maks 200 ta
  };
};
