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
 * Kalit hisoblashdan oldin matnni KANONIK shaklga keltiradi.
 *
 * ⚠️ AUDIT 2026-08-19 — bir savol IKKI xil matn shaklida uchraydi:
 *   · bazadagi xom shakl:   "Konjunktiv II nima? (Savol kodi: #ab12)"
 *   · ekranga chiqadigan:   "Konjunktiv II nima?"
 * `TestPage` xatolar mashqida savol matnidan «Savol kodi» qo'shimchasini
 * OLIB TASHLAYDI (u foydalanuvchiga kerak emas). Normallashtirishsiz bu ikki
 * shakl TURLI kalit berardi, ya'ni xatolar mashqida to'g'ri javob berilgan
 * savol o'zining xato yozuvi bilan mos kelmasdi va xato HECH QACHON
 * yopilmasdi (T-3 hayot sikli jimgina ishlamay qolardi).
 *
 * MIGRATSIYA KERAK EMAS va progress yo'qolmaydi: kalit hamma joyda MATNDAN
 * qayta hisoblanadi (kartada ham, xatoda ham matn saqlanadi), shuning uchun
 * kalit satrining o'zgarishi hech qanday bog'lanishni uzmaydi.
 */
const canonicalText = (text) => (text || '')
  .replace(/\s*\(\s*savol\s+kodi\s*:\s*#[a-z0-9_-]+\s*\)/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Savol yoki takrorlash kartochkasining barqaror identifikatori.
 * Kirish sifatida ikkalasi ham bo'ladi — ikkalasida ham matn `.q` maydonida.
 */
export const questionKey = (item) => 'h' + cyrb53(canonicalText(item?.q));

/**
 * Eski (100 belgilik) identifikator — faqat `customMnemonics` uchun qoldi.
 * Sabab: mnemonika kalitida SAQLANGANI o'sha 100 belgi, to'liq matn esa yo'q,
 * ya'ni uni yangi kalitga o'tkazib bo'lmaydi (foydalanuvchi yozgan izohlar
 * yo'qolardi). Mnemonikadagi to'qnashuvning oqibati yengil — o'xshash savolda
 * o'sha izoh ko'rinadi, xolos.
 */
export const legacyQHash = (item) => (item?.q || '').substring(0, 100);

// ─── TAKRORLASH ORALIQLARI ───
//
// ⚠️ AUDIT 2026-08-19, T-5 BAND — oraliqlar DAQIQADAN KUNGA o'tkazildi.
//
//   Avval formula `10 daq × 2.5^level` edi, `MAX_LEVEL = 7` bilan:
//       10 × 2.5^7 = 6 104 daqiqa ≈ 4.24 KUN
//   Ya'ni 7 marta ketma-ket to'g'ri javob berilgan, mukammal o'zlashtirilgan
//   savol ham har 4 kunda qaytib kelardi, boshlang'ich oraliq esa 10 daqiqa —
//   ko'pincha AYNI SESSIYA ichida takrorlanish (massed practice, spaced emas).
//
//   Attestatsiyaga 2–3 oy tayyorlanadigan foydalanuvchida bu navbatni
//   allaqachon bilinadigan material bilan to'ldirardi va yangi material uchun
//   joy qolmasdi — SRS tizimini o'ldiruvchi klassik xato.
//
//   Endi oraliqlar aniq zinapoyada (SM-2 ning amaliy jadvaliga yaqin).
//   Formula emas, jadval: har bosqichni alohida sozlash mumkin va
//   «4 kun» kabi kutilmagan chegara qayta paydo bo'lmaydi.
const REVIEW_LADDER_MIN = [
  10,       // 0 — xato: ayni sessiyada qayta ko'rish
  1440,     // 1 — 1 kun
  4320,     // 2 — 3 kun
  10080,    // 3 — 7 kun
  23040,    // 4 — 16 kun
  50400,    // 5 — 35 kun
  108000,   // 6 — 75 kun
  216000,   // 7 — 150 kun → "o'zlashtirilgan"
];
export const MAX_LEVEL = REVIEW_LADDER_MIN.length - 1;
// Qiyinlik koeffitsienti — qanchalik ko'p xato → interval qanchalik qisqa
const DIFFICULTY_PENALTY = 0.85; // har bir difficulty level uchun 15% qisqaradi
// Interval «chayqatish» (±10%). Bunsiz bir kunda o'rganilgan 50 ta karta
// aynan bir kunda BIRGA qaytadi va «og'ir kunlar» hosil bo'ladi.
const FUZZ = 0.1;

// Takrorlash imtihondan kamida shuncha oldin tugashi kerak.
export const EXAM_REVIEW_MARGIN_MS = 3 * 24 * 60 * 60 * 1000; // 3 kun

/**
 * Takrorlash muddatini imtihon sanasiga siqadi.
 *
 * NEGA: 150 kunlik oraliq imtihonga 20 kun qolganda ma'nosiz — karta
 * imtihondan KEYIN qaytadi. Siqishdan keyin har bir karta imtihongacha
 * kamida bir marta qaytadi. Bu attestatsiya platformasi uchun asosiy
 * farqlovchi xususiyat.
 *
 * @param {number} nextReviewMs  Hisoblangan muddat (epoch ms)
 * @param {number|null} examAtMs Imtihon sanasi (epoch ms) yoki null
 * @param {number} now
 */
export const clampReviewToExam = (nextReviewMs, examAtMs, now = Date.now()) => {
  if (!examAtMs) return nextReviewMs;
  const cutoff = examAtMs - EXAM_REVIEW_MARGIN_MS;
  // Imtihon juda yaqin (yoki o'tgan) — siqishning ma'nosi yo'q, aks holda
  // hamma karta bir vaqtda «muddati kelgan» bo'lib navbatni bosib ketardi.
  if (cutoff <= now) return nextReviewMs;
  return Math.min(nextReviewMs, cutoff);
};

/**
 * Keyingi takrorlash oralig'ini hisoblaydi.
 *
 * @param {number} level - Joriy o'rganish darajasi (0..MAX_LEVEL)
 * @param {number} difficulty - Qiyinlik koeffitsienti (1-5, ko'p xato = yuqori)
 * @param {object} [opts]
 * @param {boolean} [opts.fuzz=true] - ±10% tasodifiy tarqatish (testda o'chiriladi)
 * @param {Function} [opts.rand=Math.random]
 * @returns {number} Oraliq (millisekund)
 */
export const calculateNextReview = (level, difficulty = 1, { fuzz = true, rand = Math.random } = {}) => {
  const clampedLevel = Math.max(0, Math.min(level, MAX_LEVEL));
  const clampedDifficulty = Math.max(1, Math.min(difficulty, 5));

  let intervalMinutes =
    REVIEW_LADDER_MIN[clampedLevel] *
    Math.pow(DIFFICULTY_PENALTY, clampedDifficulty - 1);

  // Level 0 (xato) chayqatilmaydi — u ataylab qat'iy «10 daqiqadan keyin».
  if (fuzz && clampedLevel > 0) {
    intervalMinutes *= 1 + (rand() * 2 - 1) * FUZZ;
  }

  return Math.round(intervalMinutes * 60 * 1000); // ms ga o'tkazish
};

/**
 * Spaced Repetition kartochkasini yangilaydi
 *
 * @param {object} card - Mavjud kartochka
 * @param {boolean} wasCorrect - Javob to'g'rimi?
 * @param {object} [opts]
 * @param {number|null} [opts.examAtMs] - Imtihon sanasi (oraliqni siqish uchun)
 * @param {number} [opts.now]
 * @returns {object} Yangilangan kartochka
 */
export const updateSpacedCard = (card, wasCorrect, { examAtMs = null, now = Date.now() } = {}) => {
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
      nextReview: clampReviewToExam(now + calculateNextReview(newLevel, newDifficulty), examAtMs, now),
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
 * «Vaqt tugadi» belgisi (`answers[i] === TIMED_OUT`).
 *
 * ⚠️ AUDIT 2026-08-19, T-10 BAND — ilgari bu qiymat oddiy javob sifatida
 * o'tardi: `-1 !== q.correct` → XATO deb sanalardi. Ya'ni mashq rejimida
 * sukut bo'yicha yoqilgan 60 soniyalik taymer, foydalanuvchi savolni o'qib
 * ulgurmasa, uning o'rniga xato «yozib qo'yardi».
 *
 * Oqibati faqat bitta savol bilan cheklanmasdi — yolg'on xato butun zanjirni
 * ifloslantirardi: `newMistakes` → `spacedCards` level 0 → `topicStats.correct`
 * pasayishi → `DiagnosticsEngine` bo'limni «zaif» deb belgilashi →
 * `AnalysisPage` foydalanuvchini NOTO'G'RI mavzuga yo'naltirishi.
 *
 * Endi vaqt tugashi statistikaga UMUMAN kirmaydi: u javob emas, javob
 * BERILMAGANLIK. Foydalanuvchi to'g'ri javobni va izohni baribir ko'radi.
 */
export const TIMED_OUT = -1;

// ════════════════════════════════════════════════════════════════════════════
//  KARTALAR CHEGARASI — «og'ir» va «yengil» kartalar
// ════════════════════════════════════════════════════════════════════════════
//
// ⚠️ AUDIT 2026-08-19, T-4 BAND — tizimning eng jimgina nosozligi shu yerda edi.
//
//   Chegara 200 ta karta edi VA karta HAR javob berilgan savol uchun
//   yaratilardi — to'g'ri javob ham. Hisob: 50 savollik 4 ta blok = 200 savol,
//   ya'ni BIR KUNLIK jadal mashq butun takrorlash tarixini o'chirardi.
//
//   Undan ham yomoni — kesish `sort(lastReview).slice(-200)` edi: birinchi
//   bo'lib eng UZOQ intervalli, hali muddati kelmagan YETUK kartalar qurbon
//   bo'lardi. Ya'ni tizim aynan o'zining eng qimmatli qismini o'chirardi.
//   Foydalanuvchi buni hech qachon ko'rmasdi: xatolik yo'q, jurnal yo'q.
//
//   Chegaraning ASL SABABI — karta savolning TO'LIQ nusxasini saqlashi
//   (~1 KB). Shuning uchun endi ikki xil karta bor:
//
//     · OG'IR karta — ichida savol matni, variantlar, izoh. Faqat XATO
//       qilingan savol uchun. SmartReviewPage uni to'g'ridan-to'g'ri render
//       qiladi, shuning uchun tanasi kerak.
//     · YENGIL karta — faqat `qHash + topicId + SRS metama'lumoti` (~130 bayt).
//       To'g'ri javob berilgan savol uchun. Uning yagona vazifasi — savolni
//       muddatidan oldin qayta ko'rsatmaslik (`smartSort` da `priority *= 0.2`).
//       Render qilinmaydi, demak tanasi kerak emas.
//
//   Byudjet: 250 og'ir × ~1 KB + 550 yengil × ~130 bayt ≈ 320 KB.
//   Firestore hujjat chegarasi 1 MB — xavfsiz zaxira bilan.
export const MAX_SPACED_CARDS = 800;
export const MAX_HEAVY_CARDS = 250;

/** Karta render qilinadigan tanaga egami (savol matni bor). */
export const isHeavyCard = (c) => !!(c && c.q);

/**
 * Takrorlash navbatiga HAQIQATAN tushadigan, muddati kelgan kartalar soni.
 *
 * YAGONA MANBA: BottomNav/Sidebar nishonchasi, Dashboard, DiagnosticsEngine va
 * SmartReviewPage ayni raqamni ko'rsatishi shart. Ilgari har biri o'zi
 * `filter(c => c.nextReview <= now)` qilardi — yengil kartalar paydo bo'lgach
 * bu «12 ta takror» deb turib, ochilganda bo'sh ekran berardi.
 */
export const dueCardCount = (spacedCards = [], now = Date.now()) =>
  spacedCards.filter(c => isHeavyCard(c) && (c.nextReview || 0) <= now).length;

/** Og'ir kartadan tanani olib tashlaydi — SRS jadvali saqlanadi. */
export const lightenCard = (c) => ({
  qHash: c.qHash,
  topicId: c.topicId,
  level: c.level,
  correctStreak: c.correctStreak,
  difficulty: c.difficulty,
  lastReview: c.lastReview,
  nextReview: c.nextReview,
  lastResult: c.lastResult,
});

/**
 * Og'ir kartaga ko'chiriladigan IXTIYORIY maydonlar — SmartReviewPage va
 * QuestionMedia haqiqatan render qiladiganlari. Qolgani hujjatda o'lik yuk.
 */
const HEAVY_CARD_OPTIONAL = ['explanation', 'isHtml', 'image', 'svg', 'diagram'];

/**
 * Savoldan og'ir kartaning TANASINI ajratadi (SRS metama'lumotisiz).
 *
 * ⚠️ JURNAL TAHLILI 2026-08-28 — NEGA `{ ...q }` EMAS:
 *   Ilgari bu yerda butun savol obyekti ko'chirilardi. ExamPage esa savolga
 *   `topicIcon` biriktirardi — u REACT ELEMENTI, ichida `$$typeof: Symbol`.
 *   Symbol karta orqali `state.spacedCards` ga, undan `userStats` yozuviga
 *   tushardi va Firestore uni tavsiflay olmay ichki assertion tashlardi:
 *     «FIRESTORE INTERNAL ASSERTION FAILED (ID: 3029) CONTEXT: {"type":"symbol"}»
 *   `setDoc` ma'lumotni SINXRON tekshiradi — xato Promise yaratilishidan OLDIN
 *   otiladi, ya'ni `.catch()` UMUMAN ishlamaydi va yozuv jimgina yo'qoladi.
 *   22 kunda 164 hodisa, 59 foydalanuvchi; natija ekrani 0 ball ko'rsatardi.
 *
 *   YOPIQ RO'YXAT bu sinfdagi xatoni takrorlanmas qiladi: saqlanadigan qatlam
 *   endi UI ma'lumotini printsipial ravishda ko'tara olmaydi. Ikkinchi qatlam —
 *   AppContext dagi `sanitizeForFirestore`.
 */
export const heavyCardBody = (q, qHash, fallbackTopicId) => {
  const body = {
    qHash,
    topicId: q?.topicId ?? fallbackTopicId,
    q: q?.q,
    opts: q?.opts || [],
    correct: q?.correct,
  };
  // Ixtiyoriylar faqat mavjud bo'lsa — bo'sh kalit ham hujjatni shishiradi.
  for (const k of HEAVY_CARD_OPTIONAL) {
    const v = q?.[k];
    if (v !== undefined && v !== null) body[k] = v;
  }
  return body;
};

/**
 * Kartalar ro'yxatini chegaraga siqadi.
 *
 * Saqlash ustuvorligi (yuqoridan pastga):
 *   1. PAST level — ya'ni yomon o'zlashtirilgan karta hech qachon o'chmaydi;
 *   2. MUDDATI YAQIN — tez orada kerak bo'ladigani saqlanadi.
 * Ya'ni o'chiriladigan birinchi nomzod — eng yaxshi o'zlashtirilgan, muddati
 * eng uzoq karta. Bu eski xatti-harakatning aynan teskarisi.
 *
 * Og'ir kartalar chegarasidan oshgani O'CHIRILMAYDI, YENGILLASHTIRILADI:
 * takrorlash jadvali saqlanib qoladi, faqat savol tanasi tashlanadi.
 */
export const pruneSpacedCards = (cards = [], { limit = MAX_SPACED_CARDS, heavyLimit = MAX_HEAVY_CARDS } = {}) => {
  const byPriority = [...cards].sort((a, b) => {
    const la = a.level ?? 0;
    const lb = b.level ?? 0;
    if (la !== lb) return la - lb;
    return (a.nextReview || 0) - (b.nextReview || 0);
  });

  const kept = byPriority.slice(0, limit);

  let heavySeen = 0;
  return kept.map(c => {
    if (!isHeavyCard(c)) return c;
    heavySeen++;
    return heavySeen <= heavyLimit ? c : lightenCard(c);
  });
};

/**
 * Bitta sessiyaning BO'LIMLAR KESIMI.
 *
 * ⚠️ AUDIT 2026-08-19, T-7 BAND — mashq natijasi ekranida (TestResults.jsx)
 * mavzular kesimi UMUMAN yo'q edi: 50 ta savoldan keyin foydalanuvchi
 * «34/50» ni ko'rardi va KEYIN NIMA QILISHNI BILMASDI. Bitta raqam harakatga
 * aylanmaydi — bu natija ekranining asosiy vazifasi bajarilmagani edi.
 *
 * `minForPercent` — kichik namunadan yolg'on xulosa chiqmasligi uchun chegara.
 * 2 ta savoldan 1 tasi to'g'ri bo'lsa «50%» deb ko'rsatish foydalanuvchini
 * o'zi umuman bilmaydigan bo'limga yuborishi mumkin.
 *
 * @param {Array}  questions
 * @param {object} answers   { [indeks]: tanlangan variant }
 * @param {Array}  topics    TOPICS ro'yxati (nom/ikonka uchun)
 * @returns {Array} Eng zaifdan boshlab tartiblangan kesim
 */
export const topicBreakdown = (questions = [], answers = {}, topics = TOPICS, { minForPercent = 5 } = {}) => {
  const byTopic = new Map();

  questions.forEach((q, i) => {
    const tid = q?.topicId;
    if (tid === undefined || tid === null || tid < 0) return;
    const row = byTopic.get(tid) || { topicId: tid, total: 0, answered: 0, correct: 0 };
    row.total += 1;
    const selected = answers[i];
    // Vaqt tugagan savol javob hisoblanmaydi (T-10) — u foizni buzmasligi kerak.
    if (selected !== undefined && selected !== TIMED_OUT) {
      row.answered += 1;
      if (selected === q.correct) row.correct += 1;
    }
    byTopic.set(tid, row);
  });

  return Array.from(byTopic.values())
    .map(row => {
      const topic = topics.find(t => t.id === row.topicId);
      const enough = row.answered >= minForPercent;
      return {
        ...row,
        name: topic?.name || null,
        icon: topic?.icon || null,
        enough,
        accuracy: row.answered > 0 ? Math.round((row.correct / row.answered) * 100) : null,
      };
    })
    // Zaif bo'lim tepada. Ma'lumoti yetarli bo'lmagan bo'limlar oxirida —
    // ular harakat uchun asos bo'la olmaydi.
    .sort((a, b) => {
      if (a.enough !== b.enough) return a.enough ? -1 : 1;
      return (a.accuracy ?? 101) - (b.accuracy ?? 101);
    });
};

/**
 * @param {object} questionTimes  { [savol indeksi]: soniya } — TestPage/ExamPage
 *   allaqachon yig'adi (questionTimesRef), ilgari faqat jami vaqt ishlatilardi.
 * @param {object} [options]
 * @param {number|null} [options.examAtMs] Imtihon sanasi — takrorlash oralig'i
 *   undan oshib ketmasligi uchun (T-5).
 */
export const summarizeTestResults = (
  questions,
  answers,
  spacedCards = [],
  topicId = -1,
  questionTimes = {},
  { examAtMs = null } = {}
) => {
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
  // ⚠️ AUDIT 2026-08-19, T-3 BAND — to'g'ri javob berilgan savollarning
  // kalitlari. Ilgari xatolar ro'yxatidan chiqishning YAGONA yo'li qo'lda
  // o'chirish edi: o'zlashtirilgan savol abadiy «xato» bo'lib qolardi va
  // «xatolar ustida ishlash» mini-testining yarmini egallardi.
  // Endi `AppContext` shu ro'yxat bo'yicha xatoni «yopish» (retire) qaroriga
  // keladi — mistakeQueue.mergeMistakes ga qarang.
  const correctedHashes = [];
  // ⚠️ ADMIN UX AUDIT 2026-08-18, A-1 BAND — savol darajasidagi javob jurnali.
  //
  // Shu paytgacha platformada "qaysi savolda ko'p xato qilinyapti?" degan
  // savolga javob beradigan MA'LUMOT YO'Q edi: `wrongCount` seans tugashi
  // bilan yo'qolardi, `mistakes` esa foydalanuvchiga xos, chegaralangan va
  // matn bo'yicha kalitlangan. Ya'ni noto'g'ri tuzilgan savolni faqat kimdir
  // shikoyat qilsagina topish mumkin edi.
  //
  // Bu jurnal savol bo'yicha AGREGATLANADI (api/cron-daily.js), shundan keyin
  // xom yozuv o'chiriladi — shaxsiy ma'lumot saqlanmaydi. Faqat: savol necha
  // marta ko'rsatilgani, nechtasi xato bo'lgani va QAYSI VARIANT tanlangani.
  // Aynan oxirgisi eng qimmatli signal: agar 68% B ni tanlasa, "to'g'ri"
  // javob esa C bo'lsa — kalit ehtimol noto'g'ri.
  //
  // `id` faqat paketdan kelgan savolda bo'ladi (AdminPage.jsx:1930).
  // Id siz savol jurnalga tushmaydi — uni agregatlab bo'lmaydi.
  const answerLog = [];
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
    // Javob berilmagan YOKI vaqt tugagan savol hisobga olinmaydi (T-10).
    if (selected === undefined || selected === TIMED_OUT) continue;

    const qHash = questionKey(q);
    const wasCorrect = selected === q.correct;

    // `secs` ilgari faqat topicDeltas bloki ichida e'lon qilinardi; endi
    // answerLog ham undan foydalanadi, shuning uchun yuqoriga ko'chirildi.
    const secs = questionTimes[i] || 0;

    // A-1: savol bo'yicha agregatsiya uchun xom yozuv.
    if (q.id) {
      answerLog.push({
        qid: q.id,
        ok: wasCorrect,
        pick: selected,
        // 10 daqiqadan uzun javob = tab fonda qolgan, o'rtachani buzmasin
        ms: Math.min(secs * 1000, 600000),
      });
    }

    const qTopicId = q.topicId ?? topicId;
    if (qTopicId !== undefined && qTopicId !== null && qTopicId >= 0) {
      const td = topicDeltas[qTopicId] || { answered: 0, correct: 0, timeSum: 0, fast: 0 };
      td.answered += 1;
      if (wasCorrect) td.correct += 1;
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
      correctedHashes.push(qHash);

      // Spaced Repetition: to'g'ri javob → level ko'tariladi
      if (updatedCards.has(qHash)) {
        // Ball uchun faqat vaqti kelgan takror sanaladi — sessiya boshidagi
        // asl kartaning nextReview muddati bo'yicha (vaqti kelmagani 0 ball,
        // bir savolni qayta-qayta ishlab ball yig'ishdan himoya)
        const originalCard = spacedMap.get(qHash);
        if (originalCard && (originalCard.nextReview || 0) <= sessionNow) {
          dueReviewCorrectCount++;
        }
        updatedCards.set(qHash, updateSpacedCard(updatedCards.get(qHash), true, { examAtMs, now: sessionNow }));
      } else {
        newCorrectCount++;
        // Yangi to'g'ri javob — YENGIL karta (T-4). Savol tanasi saqlanmaydi:
        // uning yagona vazifasi savolni muddatidan oldin qayta ko'rsatmaslik,
        // va u hech qachon render qilinmaydi.
        updatedCards.set(qHash, {
          qHash,
          topicId: q.topicId ?? topicId,
          level: 1,
          correctStreak: 1,
          difficulty: 1,
          lastReview: sessionNow,
          nextReview: clampReviewToExam(sessionNow + calculateNextReview(1, 1), examAtMs, sessionNow),
          lastResult: 'correct'
        });
      }
    } else {
      wrongCount++;
      if (leadingRun === null) leadingRun = run;
      run = 0;

      // Xato ma'lumotlarini yig'ish — mavzu har savolning O'Z topicId'sidan olinadi,
      // aks holda aralash testda (topicId=-1) hamma xato "Aralash" bo'lib qolardi.
      //
      // ⚠️ AUDIT 2026-08-19, T-2 BAND — bu yerda `explanation` SAQLANMAS EDI.
      //    Oqibati: «xatolar ustida ishlash» rejimida savol qayta qurilganda
      //    izoh o'rniga «To'g'ri javob: B» degan sun'iy matn qo'yilardi
      //    (TestPage.jsx). Ya'ni eng qimmatli o'quv lahzasida — odam o'z
      //    xatosini qayta ishlayotganda — platforma SABABNI tushuntirmasdi.
      //    Bu regressiya edi: birinchi urinishda izoh KO'RSATILGAN, ikkinchisida
      //    yo'q. Baza esa 100% izohli (chqbt: 2 596/2 596, mediana 226 belgi).
      //
      // `qHash` ham saqlanadi — xatolar navbati (T-3) matn emas, kalit bo'yicha
      // birlashtiriladi.
      newMistakes.push({
        qHash,
        topic: TOPICS.find(t => t.id === qTopicId)?.name || 'Aralash',
        topicId: qTopicId,
        question: q.q,
        correct: q.opts[q.correct],
        opts: q.opts || [],
        picked: selected,
        explanation: q.explanation,
        mnemonic: q.mnemonic,
        source: q.source,
      });

      // Spaced Repetition: noto'g'ri javob
      if (updatedCards.has(qHash)) {
        const prev = updatedCards.get(qHash);
        // Kartaning tanasi yo'q bo'lsa (avval to'g'ri javob berilgan — yengil
        // karta) uni OG'IRLASHTIRAMIZ: endi u takrorlash navbatida ko'rsatiladi,
        // demak SmartReviewPage uchun savol matni kerak bo'ladi.
        const base = isHeavyCard(prev)
          ? prev
          : { ...prev, ...heavyCardBody(q, qHash, topicId) };
        updatedCards.set(qHash, updateSpacedCard(base, false, { examAtMs, now: sessionNow }));
      } else {
        // Yangi xato — OG'IR kartochka (savol tanasi bilan)
        updatedCards.set(qHash, {
          ...heavyCardBody(q, qHash, topicId),
          level: 0,
          correctStreak: 0,
          difficulty: 1,
          lastReview: sessionNow,
          nextReview: sessionNow + calculateNextReview(0, 1),
          lastResult: 'wrong'
        });
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
    correctedHashes,
    answerLog,
    topicDeltas,
    maxRunInSession,
    leadingRun,
    trailingRun: run,
    // Kesish ustuvorlik bo'yicha: yomon o'zlashtirilgan va muddati yaqin
    // kartalar saqlanadi, eng yaxshi o'zlashtirilgani birinchi bo'lib chiqadi
    // (T-4). Ilgari `.sort(lastReview).slice(-200)` edi — teskarisi.
    updatedSpacedCards: pruneSpacedCards(Array.from(updatedCards.values()))
  };
};
