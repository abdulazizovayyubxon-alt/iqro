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

// ── Savol identifikatori ──────────────────────────────────────────────────
//
// ⚠️ AUDIT 2026-08-06, T-7 BAND — ilgari identifikator savol matnining
// BIRINCHI 100 BELGISI edi. Haqiqiy bazada o'lchandi: 44 944 savoldan 891 tasi
// (1.98%, 374 guruh) boshqa savol bilan bir xil 100 belgilik boshlanishga ega.
// Ya'ni A savoliga javob berish B savolini "takrorlandi" deb belgilardi:
// takrorlash jadvali buzilardi, "vaqti kelgan takror" balli noto'g'ri berilardi.
// Eng ko'p zarar `til` fanida (159 savol).
//
// Endi kalit — butun matnning xeshi. MIGRATSIYA KERAK EMAS: kartochka savol
// matnini (`card.q`) o'zida saqlaydi, shuning uchun mavjud kartalarning kaliti
// yuklashda qaytadan hisoblanadi. Xatolar ham to'liq matn saqlaydi.
//
// cyrb53 — qisqa, tez va yaxshi taqsimlangan 53-bitli xesh (kriptografik emas,
// bu yerda kerak ham emas: bizga faqat to'qnashuvsiz identifikator kerak).
const cyrb53 = (str) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/**
 * Savol yoki takrorlash kartochkasining barqaror identifikatori.
 * Kirish sifatida ikkalasi ham bo'ladi — ikkalasida ham matn `.q` maydonida.
 */
export const questionKey = (item) => 'h' + cyrb53((item?.q || '').trim());

/**
 * Eski (100 belgilik) identifikator — faqat `customMnemonics` uchun qoldi.
 * Sabab: mnemonika kalitida SAQLANGANI o'sha 100 belgi, to'liq matn esa yo'q,
 * ya'ni uni yangi kalitga o'tkazib bo'lmaydi (foydalanuvchi yozgan izohlar
 * yo'qolardi). Mnemonikadagi to'qnashuvning oqibati yengil — o'xshash savolda
 * o'sha izoh ko'rinadi, xolos.
 */
export const legacyQHash = (item) => (item?.q || '').substring(0, 100);

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
    topicId = -1,
    repetitionLimit = 0
  } = options;

  if (!allQuestions || allQuestions.length === 0) return [];

  // 1. Zaif mavzularni aniqlash
  const weakness = analyzeWeakTopics(topicStats, activeCategory);

  // 2. Spaced Repetition kartochkalarini tezkor lug'atga aylantirish.
  // Kalit kartaning SAQLANGAN `qHash`idan emas, matnidan qayta hisoblanadi —
  // shu tufayli eski (100 belgilik) kalitli kartalar ham migratsiyasiz topiladi (T-7).
  const spacedMap = new Map();
  for (const card of spacedCards) {
    spacedMap.set(card.q ? questionKey(card) : card.qHash, card);
  }

  // 3. Xatolar to'plamini tezkor lug'atga aylantirish.
  // Xatolar to'liq savol matnini saqlaydi (`m.question`), shuning uchun bu yerda
  // kalit to'g'ridan-to'g'ri yangi shaklda hisoblanadi — migratsiya kerak emas.
  const mistakeSet = new Set(
    mistakes.map(m => questionKey({ q: m.question }))
  );

  const now = Date.now();

  // 4. Har bir savolga "priority" ball hisoblash
  //
  // ⚠️ AUDIT 2026-08-06, T-18 BAND — ilgari bu yerda har savol `{...q}` bilan
  // TO'LIQ klonlanardi (fan bo'yicha ~2 900 obyekt), qHash esa ikki marta
  // hisoblanardi. Endi faqat yengil o'ram (`{q, priority, card}`) yasaladi —
  // savol obyekti nusxalanmaydi.
  const scoredQuestions = allQuestions.map(q => {
    let priority = 1.0;
    const qHash = questionKey(q);

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

    // Takrorlash savolimi — qHash shu yerda allaqachon hisoblangan, pastda
    // qayta hisoblamaymiz (ilgari har savol uchun ikkinchi marta kesilardi).
    const isRepetition = spacedMap.has(qHash) || mistakeSet.has(qHash);
    return { q, priority, card: spacedCard, isRepetition };
  });

  // 5. Savollarni Repetition (takrorlash kerak bo'lgan) va Fresh (yangi) guruhlariga ajratamiz
  const repetitionPool = [];
  const freshPool = [];

  for (const item of scoredQuestions) {
    if (item.isRepetition) {
      repetitionPool.push(item);
    } else {
      freshPool.push(item);
    }
  }

  // Har bir guruhni o'z ustivorligi bo'yicha kamayish tartibida saralaymiz
  repetitionPool.sort((a, b) => b.priority - a.priority);
  freshPool.sort((a, b) => b.priority - a.priority);

  // Ko'rsatkichlar — `shift()` o'rniga. `shift()` massiv boshidan o'chirgani
  // uchun O(n), butun tanlov esa O(n²) bo'lib chiqardi (~2 900 savolda
  // millionlab element ko'chirish, test boshlanishida asosiy oqimda). T-18.
  let repIdx = 0;
  let freshIdx = 0;

  // 6. Savollarni blokkalar (har biri 50 tadan) bo'yicha taqsimlaymiz
  const finalBatch = [];
  const BLOCK_SIZE = 50;
  
  // Bizga batchSize dona savol kerak (odatda allQuestions.length)
  const totalNeeded = Math.min(batchSize, allQuestions.length);
  const numBlocks = Math.ceil(totalNeeded / BLOCK_SIZE);

  for (let b = 0; b < numBlocks; b++) {
    const blockQuestions = [];
    
    // Ushbu blok uchun nechta savol kerakligini hisoblaymiz (oxirgi blok 50 tadan kichikroq bo'lishi mumkin)
    const blockNeeded = Math.min(BLOCK_SIZE, totalNeeded - finalBatch.length);
    // Ushbu blok uchun maksimal takrorlash savollari sonini hisoblaymiz (10% limit uchun 50 ta savoldan maks 5 ta)
    const blockMaxRep = Math.round(blockNeeded * (repetitionLimit / 100));

    let repCount = 0;

    // A. Avval ruxsat etilgan limitgacha takrorlash savollarini qo'shamiz
    while (repCount < blockMaxRep && repIdx < repetitionPool.length && blockQuestions.length < blockNeeded) {
      blockQuestions.push(repetitionPool[repIdx++]);
      repCount++;
    }

    // B. Qolgan joylarni yangi/fresh savollar bilan to'ldiramiz (bu me'yoridan ko'p takrorlanishni oldini oladi)
    while (freshIdx < freshPool.length && blockQuestions.length < blockNeeded) {
      blockQuestions.push(freshPool[freshIdx++]);
    }

    // C. Agar yangi savollar tugab qolsa, qolgan joylarni baribir takrorlash savollari bilan to'ldiramiz
    while (repIdx < repetitionPool.length && blockQuestions.length < blockNeeded) {
      blockQuestions.push(repetitionPool[repIdx++]);
    }

    // Blok ichidagi savollarni aralashtiramiz (foydalanuvchi takrorlashlar joylashuvini sezmasligi uchun)
    for (let i = blockQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blockQuestions[i], blockQuestions[j]] = [blockQuestions[j], blockQuestions[i]];
    }

    finalBatch.push(...blockQuestions);
  }

  // O'ramdan savolni chiqaramiz. Nusxa FAQAT kerak bo'lganda yasaladi —
  // takrorlash kartasi qiyinlikni ustidan yozadigan holatda (T-18). Qolgan
  // savollar (ko'pchilik) o'z havolasi bilan qaytadi, ortiqcha allokatsiya yo'q.
  return finalBatch.map(({ q, card }) => {
    const diff = card?.difficulty;
    return diff === undefined || diff === q.difficulty ? q : { ...q, difficulty: diff };
  });
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
/**
 * Shundan tez berilgan javob «shoshilinch» hisoblanadi. 4 variantli savolni
 * o'qib, o'ylab, tanlash uchun bu juda kam vaqt — bunday javoblar ko'p bo'lsa
 * baho ishonchsizlashadi (DiagnosticsEngine buni oraliqni kengaytirishda
 * ishlatadi). Javobni «xato» deb belgilamaydi: tanish savolga tez javob
 * berish ham mumkin, shuning uchun bu faqat ISHONCH signali.
 */
export const FAST_ANSWER_SEC = 4;

/**
 * Saqlanadigan takrorlash kartalarining maksimal soni.
 * `userStats` hujjati cheksiz o'smasligi uchun chegara (o'lchov: 200 karta ≈ 210 KB,
 * chunki karta savolning to'liq nusxasini saqlaydi — audit 2026-08-06, T-6).
 * AppContext.mergeCloudAndLocal ham AYNAN shu chegarani qo'llaydi.
 */
export const MAX_SPACED_CARDS = 200;

/**
 * @param {object} questionTimes  { [savol indeksi]: soniya } — TestPage/ExamPage
 *   allaqachon yig'adi (questionTimesRef), ilgari faqat jami vaqt ishlatilardi.
 */
export const summarizeTestResults = (questions, answers, spacedCards = [], topicId = -1, questionTimes = {}) => {
  // Kalit matndan qayta hisoblanadi — eski kartalar ham topiladi (T-7)
  const spacedMap = new Map();
  for (const card of spacedCards) {
    spacedMap.set(card.q ? questionKey(card) : card.qHash, card);
  }

  let correctCount = 0;
  let newCorrectCount = 0;
  let dueReviewCorrectCount = 0;
  let wrongCount = 0;
  // Ketma-ket to'g'ri javoblar zanjiri («zanjir» marrasi uchun).
  // leadingRun — sessiya boshidagi zanjir (oldingi sessiya zanjiriga ulanadi),
  // trailingRun — oxiridagi zanjir (keyingi sessiyaga uzatiladi).
  let run = 0;
  let maxRunInSession = 0;
  let leadingRun = null;
  const newMistakes = [];
  // Yangilanadigan kartalar ham YANGI kalit bilan indekslanadi. Eski kalitli
  // kartaning `qHash`i pastda ustiga yozilib, jimgina migratsiya bo'ladi (T-7).
  const updatedCards = new Map(
    spacedCards.map(c => [c.q ? questionKey(c) : c.qHash, { ...c, qHash: c.q ? questionKey(c) : c.qHash }])
  );
  const sessionNow = Date.now();
  // Har savolning O'Z mavzusi bo'yicha hisob — aralash test/imtihonda (topicId=-1)
  // ham har bo'lim o'z ulushini oladi (Dashboard "Bo'limlar xaritasi" shu yerdan o'qiydi)
  const topicDeltas = {};

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const selected = answers[i];
    if (selected === undefined) continue;

    const qHash = questionKey(q);
    const wasCorrect = selected === q.correct;

    const qTopicId = q.topicId ?? topicId;
    if (qTopicId !== undefined && qTopicId !== null && qTopicId >= 0) {
      const td = topicDeltas[qTopicId] || { answered: 0, correct: 0, timeSum: 0, fast: 0 };
      td.answered += 1;
      if (wasCorrect) td.correct += 1;
      const secs = questionTimes[i] || 0;
      if (secs > 0) {
        td.timeSum += secs;
        if (secs < FAST_ANSWER_SEC) td.fast += 1;
      }
      topicDeltas[qTopicId] = td;
    }

    if (wasCorrect) {
      correctCount++;
      run++;
      if (run > maxRunInSession) maxRunInSession = run;

      // Spaced Repetition: to'g'ri javob → level ko'tariladi
      if (updatedCards.has(qHash)) {
        // Ball uchun faqat vaqti kelgan takror sanaladi — sessiya boshidagi
        // asl kartaning nextReview muddati bo'yicha (vaqti kelmagani 0 ball,
        // bir savolni qayta-qayta ishlab ball yig'ishdan himoya)
        const originalCard = spacedMap.get(qHash);
        if (originalCard && (originalCard.nextReview || 0) <= sessionNow) {
          dueReviewCorrectCount++;
        }
        updatedCards.set(qHash, updateSpacedCard(updatedCards.get(qHash), true));
      } else {
        newCorrectCount++;
        // Yangi to'g'ri javob — spacedCards ga qo'shamiz (level 1), 
        // to'g'ri javob berilgan savollar darhol takrorlanmasligi uchun
        const newCard = {
          ...q,
          qHash,
          q: q.q,
          opts: q.opts || [],
          correct: q.correct,
          topicId: q.topicId ?? topicId,
          level: 1,
          correctStreak: 1,
          difficulty: 1,
          lastReview: Date.now(),
          nextReview: Date.now() + calculateNextReview(1, 1),
          lastResult: 'correct'
        };
        updatedCards.set(qHash, newCard);
      }
    } else {
      wrongCount++;
      if (leadingRun === null) leadingRun = run;
      run = 0;

      // Xato ma'lumotlarini yig'ish — mavzu har savolning O'Z topicId'sidan olinadi,
      // aks holda aralash testda (topicId=-1) hamma xato "Aralash" bo'lib qolardi
      newMistakes.push({
        topic: TOPICS.find(t => t.id === qTopicId)?.name || 'Aralash',
        topicId: qTopicId,
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

  // Hech xato bo'lmasa — butun sessiya bitta uzluksiz zanjir
  if (leadingRun === null) leadingRun = run;

  return {
    correctCount,
    wrongCount,
    newCorrectCount,
    dueReviewCorrectCount,
    totalAnswered: correctCount + wrongCount,
    accuracy: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
    newMistakes,
    topicDeltas,
    maxRunInSession,
    leadingRun,
    trailingRun: run,
    // Eng YANGI KO'RILGAN kartalar saqlanadi. Ilgari oddiy `.slice(-200)` edi —
    // u Map'ning kiritilish tartibiga tayanardi, ya'ni bugun takrorlangan, lekin
    // ancha oldin qo'shilgan karta ro'yxatdan tushib ketishi mumkin edi (T-6).
    updatedSpacedCards: Array.from(updatedCards.values())
      .sort((a, b) => (a.lastReview || 0) - (b.lastReview || 0))
      .slice(-MAX_SPACED_CARDS)
  };
};
