import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { useTheory } from '../hooks/useTheory';
import { matchKeyPoint } from '../data/theory';
import TheoryPreCard from '../components/theory/TheoryPreCard';
import TheoryModal from '../components/theory/TheoryModal';
import { isTheorySeen, markTheorySeen } from '../services/theorySeen';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../utils/motion';
import ObjectionModal from '../components/shared/ObjectionModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import PremiumModal from '../components/PremiumModal';
import FreeMonthBanner from '../components/FreeMonthBanner';
import { BATCH_SIZE, QUESTION_TIMER_SECONDS } from '../config';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { smartSort, summarizeTestResults } from '../engine/SmartQuestionEngine';
import { AnalyticsEvents } from '../services/analytics';
import { submitQuestionRequest, hasRequested } from '../services/questionRequests';
import localforage from 'localforage';

// Savol matnidan kirish/kontekst qismini olib tashlaydi va asosiy savolni qaytaradi.
// Bu funksiya dublikatlarni aniqlashda ishlatiladi: masalan,
//   "Im Unterricht, Konjunktiv II nima?" va "Dars davomida, Konjunktiv II nima?"
// bir xil hisoblanishi uchun ikkalasidan ham kirish qismi olib tashlanadi.
function cleanForDedup(text) {
  let clean = (text || '').trim().toLowerCase();
  // [Mavzu: ...] yoki [... yangi savol] prefikslarini olib tashlash
  clean = clean.replace(/^\s*\[mavzu:\s*[^\]]+\]\s*/gi, '');
  clean = clean.replace(/^\s*\[[^\]]+yangi\s+savol\]\s*/gi, '');
  // Savol kodlarini olib tashlash
  clean = clean.replace(/\s*\(\s*savol\s+kodi\s*:\s*#[a-z0-9_]+\s*\)/gi, '');
  clean = clean.replace(/\s*#[a-z0-9_]+/gi, '');
  // Verguldan oldingi kirish qismini olib tashlash (agar u qisqa va kontekst bo'lsa)
  const parts = clean.split(/,\s+/);
  if (parts.length > 1) {
    const firstPart = parts[0].trim();
    const isIntro =
      /^(in|im|w\u00e4hrend|bei|f\u00fcr|dars|o'qituvchi|sinf|maktab|o'quvchi|ota-ona|attestatsiya|metodik|pedagogik|ichki|tashqi|harbiy|amaliy|kasbiy|ilmiy|seminar|muhokama)/i.test(firstPart) ||
      firstPart.split(' ').length <= 6;
    if (isIntro) {
      return parts.slice(1).join(', ').trim();
    }
  }
  return clean.trim();
}

import SubjectTopicChips, { BlockRow } from '../components/SubjectTopicChips';
import QuestionBox from '../components/test/QuestionBox';
import FlashcardView from '../components/test/FlashcardView';
import TestResults from '../components/test/TestResults';
import { useExitGuard } from '../hooks/useExitGuard';
import { useModalBackButton } from '../components/profile/useModalBackButton';

// ════════════════════════════════════════════════════════════════════════════
//  SESSIYA SAQLASH — ikki kalitli sxema
// ════════════════════════════════════════════════════════════════════════════
//
// ⚠️ AUDIT 2026-08-17 — bu yerda ikkita alohida nuqson bor edi:
//
// 1-BAND (MAXFIYLIK). Kalit YAGONA global `test_session` edi va tiklash sharti
//    `(!s.uid || s.uid === user?.uid)` — ya'ni `uid` YO'Q sessiya (masalan
//    token yangilanayotganda, `user` bir lahza null bo'lganda saqlangani)
//    ISTALGAN hisob tomonidan ochilardi. Umumiy qurilmada (maktab kompyuteri,
//    oiladagi bitta telefon) bir o'qituvchi boshqasining tugallanmagan testini
//    — javoblari bilan — ko'rardi. Bu AYNAN o'sha xato `ExamPage.jsx` da T-21
//    bandi sifatida yopilgan, bu faylga esa qo'llanmagan.
//    Endi: kalit uid bo'yicha ajratilgan VA tekshiruv qat'iy (uid bo'lmasa
//    yoki mos kelmasa — tiklanmaydi).
//
// 2-BAND (UNUMDORLIK). Yozuvga `fullPool` — FANNING BARCHA savollari — kirardi
//    va yozuv HAR javob/o'tishda, debounce'siz bajarilardi. O'lchov: CHQBT =
//    2 596 savol ≈ 2.45 MB; 50 savolli blokda ~100 yozuv ≈ 240 MB IndexedDB
//    trafigi, har teginishda o'rta Android'da ~40–60 ms asosiy oqim bloklanishi.
//    Bu ustiga-ustak `firebase.js` da `persistentLocalCache`dan voz kechishga
//    sabab bo'lgan AYNI IndexedDB qatlamini bosim ostida ushlab turardi.
//
//    Yechim — og'ir va yengil ma'lumotni AJRATISH:
//      · `test_pool_${uid}`    — hovuz, BIR MARTA (hovuz yasalganda) yoziladi;
//      · `test_session_${uid}` — javoblar/joriy savol, har o'zgarishda, lekin
//                                debounce bilan va ~2–5 KB hajmda.
//    `questions` ham saqlanmaydi: u `pool.slice(batch*BATCH_SIZE, ...)` dan
//    aynan qayta hosil bo'ladi (pastdagi blok effekti bilan bir xil formula).
//    `stamp` ikki yozuvni bog'laydi — hovuz almashib, sessiya eski qolsa
//    javoblar boshqa savollarga yopishib qolmasligi uchun.
const sessionKeyFor = (uid) => `test_session_${uid}`;
const poolKeyFor = (uid) => `test_pool_${uid}`;
// Eski yagona kalit — faqat tozalash uchun (ichida 2.4 MB qolib ketgan bo'lishi
// mumkin, hech qachon o'qilmaydi).
const LEGACY_SESSION_KEY = 'test_session';

const TestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, batchCommitResults, updateState, saveCustomMnemonic } = useContext(AppContext);
  const mode = state.testMode || 'exam';
  const setMode = (m) => updateState({ testMode: m });
  const topicId = state.topicId ?? -1;
  // Aralash mashq uchun bo'limlar to'plami (Tahlil sahifasidagi «mixed» qadam).
  // Bo'sh/yaroqsiz bo'lsa null — oddiy test mantiqi o'zgarmaydi.
  const topicSubset = Array.isArray(state.topicSubset) && state.topicSubset.length > 0
    ? state.topicSubset
    : null;
  const goBack = () => {
    clearSavedSession();
    navigate('/test');
  };
  const { addObjection } = useContext(ObjectionContext);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [reqJustSent, setReqJustSent] = useState(false);
  const [showRepetitionBanner, setShowRepetitionBanner] = useState(() => {
    try {
      return localStorage.getItem('hide_repetition_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissBanner = () => {
    setShowRepetitionBanner(false);
    try {
      localStorage.setItem('hide_repetition_banner', 'true');
    } catch (e) {
      console.error(e);
    }
  };
  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;
  const versionCacheRef = useRef(null);



  // Premium tekshiruvli mavzu o'zgartirish
  const setTopicId = (id) => {
    if (isFreeLimitReached) {
      setShowPremiumModal(true);
      return;
    }
    updateState({ topicId: id });
  };
  const { showToast } = useContext(ToastContext);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [amiDelta, setAmiDelta] = useState(0); // shu sessiyada AMI necha ballga o'zgargani
  const [gainedTiers, setGainedTiers] = useState([]); // shu sessiyada olingan track darajalari (muhr-qator)
  const [reward, setReward] = useState({ points: 0, freezes: 0 }); // daraja uchun berilgan ball/zaxira
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [showBlockPicker, setShowBlockPicker] = useState(false); // Blok tanlash oynasi (blok chipi orqali)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false); // Test o'rtasida blok almashtirish tasdig'i

  // New States: Difficulty Filter and Timer Mode
  const [diffFilter] = useState('ALL'); // 'ALL', 'Y1', 'Y2', 'Y3'
  const [timerMode, setTimerMode] = useState('countdown'); // 'countdown', 'stopwatch', 'off'

  // Testdan chiqish tasdig'i (orqa tugma himoyasi)
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Javobsiz savollar qolganda oxirgi savolda yakunlash tasdig'i
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Objection Modal State
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState('analysis');

  // Timer — har soniyalik wall-clock holati TimerPill komponentida yashaydi
  // (fon/qo'ng'iroqqa chidamli va butun sahifani qayta render qilmaydi).
  const explanationRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const questionTimesRef = useRef({});
  // Test natijasini ikki marta saqlashdan himoya (double-tap / sekin tarmoq)
  const committedRef = useRef(false);
  const sessionCheckedRef = useRef(false);
  const isResumingRef = useRef(false);
  // Hovuz «shtampi» — sessiya yozuvi qaysi hovuzga tegishli ekanini bildiradi.
  // Hovuz qayta yasalsa shtamp o'zgaradi va eski sessiya yaroqsiz bo'ladi.
  const poolStampRef = useRef(null);
  // Debounce taymeri (sessiya yozuvi uchun)
  const saveTimerRef = useRef(null);

  // ── Faqat progress yozuvini o'chirish, hovuz qoladi ──
  // Natija ekranida ishlatiladi: keyingi blokka o'tish uchun hovuz kerak,
  // lekin tugagan blokning javoblari tiklanmasligi kerak.
  const clearSessionProgress = () => {
    clearTimeout(saveTimerRef.current);
    const uid = user?.uid;
    if (uid) localforage.removeItem(sessionKeyFor(uid)).catch(() => {});
  };

  // ── Sessiyani to'liq o'chirish (ikkala kalit ham) ──
  // Testdan chiqishda: hovuzni ham qoldirmaymiz, aks holda 2.4 MB gacha yozuv
  // hech kimga kerak bo'lmagan holda IndexedDB'da yotib qolardi.
  const clearSavedSession = () => {
    clearSessionProgress();
    const uid = user?.uid;
    if (uid) localforage.removeItem(poolKeyFor(uid)).catch(() => {});
  };

  // ── Sessiyani DARHOL yozish (debounce'ni kutmasdan) ──
  // Ref orqali chaqiriladi: `visibilitychange` tinglovchisi bir marta
  // o'rnatiladi, lekin har doim eng so'nggi holatni yozishi kerak.
  const persistRef = useRef(null);
  persistRef.current = () => {
    const uid = user?.uid;
    if (!uid || questions.length === 0 || showResults || !poolStampRef.current) return;
    // FAQAT yengil ma'lumot: hovuz va savollar bu yerda YO'Q (yuqoridagi izoh).
    localforage.setItem(sessionKeyFor(uid), {
      uid,
      activeCategory: state.activeCategory,
      mode,
      topicId,
      topicSubset,
      poolStamp: poolStampRef.current,
      selectedBatch,
      currentQ,
      answers,
      comboCount,
      questionTimes: questionTimesRef.current,
      savedAt: Date.now(),
    }).catch(e => console.error('Save test session error:', e));
  };

  // Eski global `test_session` yozuvini bir marta tozalaymiz — ichida 2.4 MB
  // qolib ketgan bo'lishi mumkin va u boshqa hech qachon o'qilmaydi.
  useEffect(() => {
    localforage.removeItem(LEGACY_SESSION_KEY).catch(() => {});
  }, []);

  // Vaqt tugaganda (countdown) — javobni -1 ("vaqt tugadi") deb belgilaymiz.
  // TimerPill onExpire orqali chaqiradi.
  const handleTimeExpire = () => {
    setAnswers(prev => (prev[currentQ] === undefined ? { ...prev, [currentQ]: -1 } : prev));
    questionTimesRef.current[currentQ] = QUESTION_TIMER_SECONDS;
  };

  const accumulateTime = () => {
    if (answers[currentQ] === undefined && questionStartTimeRef.current) {
      let elapsed = 0;
      if (timerMode === 'countdown') {
        elapsed = Math.min(QUESTION_TIMER_SECONDS, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
      } else if (timerMode === 'stopwatch') {
        elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      }
      questionTimesRef.current[currentQ] = (questionTimesRef.current[currentQ] || 0) + elapsed;
      questionStartTimeRef.current = Date.now();
    }
  };

  // Motivatsion so'zlar va combo
  const [comboCount, setComboCount] = useState(0);
  const [motivationText, setMotivationText] = useState('');
  const motivationTimerRef = useRef(null);

  // Konspekt. `theoryCardOpen` — 1-savol ustidagi ixcham kartochka holati;
  // «o'qilgan» belgisi endi komponent ichida emas, localStorage'da yashaydi
  // (`services/theorySeen`), shuning uchun sahifadan chiqib qaytilsa ham qoladi.
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [theoryCardOpen, setTheoryCardOpen] = useState(false);
  const theoryMarkedRef = useRef(false);

  // Flashcard state
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcKnown, setFcKnown] = useState({}); // { [index]: true/false }

  // Orqa tugma himoyasi: javob belgilangan, natija hali saqlanmagan holatda
  // orqa bosilsa to'satdan chiqib ketmasdan tasdiq so'raladi
  const guardActive = questions.length > 0 && !showResults && mode !== 'flashcard' && Object.keys(answers).length > 0;
  useExitGuard(guardActive, () => setShowExitConfirm(true));

  // Premium/blok modali ochiq bo'lsa orqa tugma sahifadan emas, modaldan chiqaradi
  // (fan/mavzu tanlagichlarning orqa-tugma himoyasi SubjectTopicChips ichida)
  useModalBackButton(showPremiumModal || showBlockPicker, () => {
    setShowPremiumModal(false);
    setShowBlockPicker(false);
  });

  // Motivatsiya timeout'ini unmount'da tozalash
  useEffect(() => () => clearTimeout(motivationTimerRef.current), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveReviewTab('analysis');
    // Yangi savolga o'tilganda vaqt o'lchovini boshlash
    // (taymer effekti TimerPill'ga ko'chgani uchun shu yerda tiklanadi).
    questionStartTimeRef.current = Date.now();
  }, [currentQ]);


  const [fullPool, setFullPool] = useState([]);

  const generateReqRef = useRef(0);

  useEffect(() => {
    generateFullPool();
    // topicSubset o'zgarsa ham qayta yig'iladi: aralash mashqda topicId
    // o'zgarmaydi (-1), demak usiz eski to'plam qolib ketardi
  }, [topicId, mode, state.activeCategory, diffFilter, topicSubset?.join(',')]);

  useEffect(() => {
    if (isResumingRef.current) {
      isResumingRef.current = false;
      return;
    }
    if (fullPool.length > 0) {
      const start = selectedBatch * BATCH_SIZE;
      setQuestions(fullPool.slice(start, start + BATCH_SIZE));
      setCurrentQ(0);
      setFcFlipped(false);
      setAnswers({});
      questionTimesRef.current = {};
      committedRef.current = false; // yangi bo'lim → natijani qayta saqlashga ruxsat
      // Natija ekranida bo'lim almashtirilsa yangi bo'lim savollari ko'rinishi kerak
      setShowResults(false);
      setComboCount(0);
      setMotivationText('');
    } else {
      setQuestions([]);
      setCurrentQ(0);
      setAnswers({});
    }
  }, [selectedBatch, fullPool]);

  // Dashboard'dagi blok chipidan kelinganda (navigate state.openBlocks) — hovuz
  // yuklangach blok tanlagichni bir marta avtomatik ochamiz.
  const blockIntentRef = useRef(location.state?.openBlocks === true);
  useEffect(() => {
    if (blockIntentRef.current && fullPool.length > BATCH_SIZE && mode !== 'mistakes') {
      blockIntentRef.current = false;
      setShowBlockPicker(true);
    }
  }, [fullPool, mode]);

  const generateFullPool = async () => {
    const currentReq = ++generateReqRef.current;
    setIsGenerating(true);

    // session check on initial mount
    if (!sessionCheckedRef.current) {
      sessionCheckedRef.current = true;
      const uid = user?.uid;
      try {
        // Tizimga kirmagan holatda tiklash UMUMAN qilinmaydi: egasi aniq
        // bo'lmagan sessiya begona qurilmada ochilmasligi kerak.
        const s = uid ? await localforage.getItem(sessionKeyFor(uid)) : null;
        // topicSubset ham kalitning bir qismi: aralash mashqda topicId ikkala
        // holatda ham -1 bo'ladi, shuning uchun usiz eski sessiya tiklanardi
        const sameSubset = (s?.topicSubset || []).join(',') === (topicSubset || []).join(',');
        // ⚠️ Egalik QAT'IY (AUDIT 2026-08-17, 1-band): uid bo'lmasa yoki mos
        // kelmasa — tiklanmaydi. Kamchiligi (juda kam holatda bitta sessiya
        // yo'qolishi) maxfiylikdan arzon — ExamPage'dagi T-21 bilan bir xil qaror.
        const sessionOk = s && !!s.uid && s.uid === uid
          && s.activeCategory === state.activeCategory && s.mode === mode
          && s.topicId === topicId && sameSubset && !!s.poolStamp;

        if (sessionOk) {
          // Hovuz alohida yozuvda — shtamp mos kelishi shart, aks holda
          // javoblar boshqa savollarga yopishib qolardi.
          const p = await localforage.getItem(poolKeyFor(uid));
          const pool = Array.isArray(p?.pool) ? p.pool : null;
          const poolOk = pool && pool.length > 0 && p.stamp === s.poolStamp;

          if (poolOk && currentReq === generateReqRef.current) {
            const batch = s.selectedBatch || 0;
            const start = batch * BATCH_SIZE;
            // `questions` saqlanmaydi — hovuzdan aynan shu formula bilan
            // qayta hosil qilinadi (blok effekti ham shuni ishlatadi).
            const restored = pool.slice(start, start + BATCH_SIZE);
            if (restored.length > 0) {
              isResumingRef.current = true;
              poolStampRef.current = s.poolStamp;
              setFullPool(pool);
              setSelectedBatch(batch);
              setQuestions(restored);
              setCurrentQ(Math.min(s.currentQ || 0, restored.length - 1));
              setAnswers(s.answers || {});
              setComboCount(s.comboCount || 0);
              questionTimesRef.current = s.questionTimes || {};
              setIsGenerating(false);
              return;
            }
          }
          // Hovuz yo'qolgan/yaroqsiz — eski sessiyani tozalaymiz va pastda
          // hovuz normal yo'l bilan qaytadan yasaladi.
          localforage.removeItem(sessionKeyFor(uid)).catch(() => {});
        }
      } catch (err) {
        console.error("Load test session error:", err);
      }
    }

    setShowResults(false);
    setAnswers({});
    questionTimesRef.current = {};
    setCurrentQ(0);
    setFcFlipped(false);
    setFcKnown({});

    try {
      let qList = [];

      if (mode === 'mistakes') {
        const catStats = state.stats?.[state.activeCategory];
        const mistakesSource = catStats?.mistakes || [];
        
        const filteredMistakes = mistakesSource.filter(m => {
          const topic = TOPICS.find(t => t.name === m.topic);
          // Xatolar allaqachon fan bo'yicha saqlanadi (stats[cat].mistakes) —
          // topic nomi TOPICS'da topilmasa ham (eski "Aralash" yozuvlari) shu fanga tegishli
          if (!topic) return true;
          return Array.isArray(topic.category)
            ? topic.category.includes(state.activeCategory)
            : topic.category === state.activeCategory;
        });

        if (filteredMistakes.length > 0) {
          const shuffledMistakes = [...filteredMistakes].sort(() => 0.5 - Math.random());
          qList = shuffledMistakes.slice(0, 15).map((m) => {
            const cleanQ = m.question ? m.question.replace(/\s*\(Savol kodi:\s*#[a-zA-Z0-9_-]+\)/gi, '') : '';
            if (m.opts && m.opts.length > 0) {
              return {
                q: cleanQ,
                opts: m.opts,
                correct: m.opts.findIndex(o =>
                  o.replace(/^[A-D]\)\s*/, '') === m.correct.replace(/^[A-D]\)\s*/, '')
                ),
                explanation: t('test.correctAnswerWas', { answer: m.correct })
              };
            }
            return {
              q: cleanQ,
              opts: [`A) ${m.correct}`, 'B) —', 'C) —', 'D) —'],
              correct: 0,
              explanation: t('test.correctAnswerWas', { answer: m.correct })
            };
          });
        }
      } else {
        // 1. Firebase'dan faqat 1 dona qog'ozni o'qiymiz (Versiyani bilish uchun - sessiya davomida 1 marta)
        let remoteVersion = 0;

        if (!versionCacheRef.current) {
          try {
            const versionDocRef = doc(db, 'settings', 'version');
            const versionSnap = await getDoc(versionDocRef);
            if (versionSnap.exists()) {
              versionCacheRef.current = versionSnap.data();
            } else {
              versionCacheRef.current = { dbVersion: 0, urls: {} };
            }
          } catch (e) {
            console.error("Version xatosi:", e);
            versionCacheRef.current = { dbVersion: 0, urls: {} };
          }
        }

        const vData = versionCacheRef.current;
        remoteVersion = vData.dbVersion || 0;
        // `vData.urls` ATAYLAB ishlatilmaydi — ochiq Storage havolalari orqali
        // yuklash yo'li olib tashlangan (audit 2026-08-05, 2-band).

        // v2: old Storage-bundle caches are invalidated; fresh Firestore data will be used
        const cacheKey = `bundle_v2_${state.activeCategory}`;
        const versionKey = `version_v2_${state.activeCategory}`;
        
        // 2. Telefon xotirasidan izlaymiz
        const localCategoryVersion = await localforage.getItem(versionKey);
        let rawList = await localforage.getItem(cacheKey);

        // 3. Agar telefonda savollar yo'q bo'lsa yoki versiya eskirgan bo'lsa (yangi savol qo'shilgan)
        if (!rawList || localCategoryVersion !== remoteVersion) {
          // auth.currentUser sahifa yuklanishida null bo'lishi mumkin — kuting
          let currentUser = auth.currentUser;
          if (!currentUser) {
            currentUser = await new Promise((resolve) => {
              const unsub = auth.onAuthStateChanged(u => {
                unsub();
                resolve(u);
              });
              setTimeout(() => resolve(null), 5000);
            });
          }
          if (!currentUser) {
            throw new Error('Foydalanuvchi tizimga kirmagan');
          }
          const token = await currentUser.getIdToken();

          // ⚠️ AUDIT 2026-08-05, 2-BAND — "direct storage" yo'li OLIB TASHLANDI.
          // Avval bu yerda `fetch(storageUrls[fan])` chaqirilardi va u
          // Authorization sarlavhasi BILAN EMAS edi: ya'ni pullik savol bazasiga
          // birinchi va asosiy yo'l umuman avtorizatsiyasiz ishlardi. URL esa
          // ochiq (makePublic) va to'liq taxmin qilinadigan edi.
          // Endi yagona tarmoq yo'li — /api/get-questions (premium/trial
          // tekshiruvi bilan), zaxira esa Firestore (rules bilan gated).
          // Obuna talab qilinishi ANIQLANGAN bo'lsa, Firestore zaxirasini ham
          // sinamaymiz (u ham rules bilan yopilgan — foydasiz so'rov bo'lardi).
          let paywalled = false;

          {
            try {
              const res = await fetch(`/api/get-questions?category=${encodeURIComponent(state.activeCategory)}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              if (!res.ok) {
                if (res.status === 403) {
                  paywalled = true;
                  showToast(t('test.toastPremiumRequired'), 'error');
                  setShowPremiumModal(true);
                }
                throw new Error('Server error: ' + res.status);
              }
              // Dev muhitida /api/* serverless funksiyalari ishlamaydi va HTML/JS
              // qaytaradi — JSON.parse cryptic xato beradi. Avval content-type ni
              // tekshiramiz; JSON bo'lmasa, bu kutilgan holat (Firestore fallback bor).
              const contentType = res.headers.get('content-type') || '';
              if (!contentType.includes('application/json')) {
                throw new Error('API JSON qaytarmadi (dev muhitida normal holat)');
              }
              rawList = await res.json();
            } catch (err) {
              console.warn("API bundle mavjud emas — Firestore fallback ishlatiladi:", err.message);
              rawList = [];
            }
          }

          if (rawList && rawList.length > 0) {
            await localforage.setItem(cacheKey, rawList);
            await localforage.setItem(versionKey, remoteVersion);
          }

          // 🔄 FALLBACK: Agar bundle yuklanmasa — Firestore'dan fan bo'yicha o'qiymiz.
          //
          // ⚠️ AUDIT 2026-08-06, T-4 BAND: avval bu yerda HAR `topicId` uchun
          // ALOHIDA query bajarilardi (fanga qarab 7–10 ta). Qaytadigan hujjatlar
          // soni bir xil, LEKIN har query alohida so'rov — ya'ni firestore.rules
          // `hasContentAccess()` ichidagi `get(users/{uid})` ham har safar qayta
          // bajarilib, har sovuq yuklashda 7–10 ta ORTIQCHA o'qish sarflanardi.
          // ExamPage.jsx allaqachon bitta `category` query ishlatadi.
          //
          // Natija to'plami AYNAN BIR XIL: pastda baribir
          // `q.category === activeCategory` va `validTopicIds.includes(q.topicId)`
          // filtrlari qo'llanadi, ya'ni ikkala yo'l ham (topicId ∈ fan) ∧ (category = fan)
          // kesishmasini beradi. Faqat so'rovlar soni kamayadi.
          if ((!rawList || rawList.length === 0) && !paywalled) {
            console.warn("Bundle yuklanmadi — Firestore dan fan bo'yicha o'qilmoqda...");
            try {
              const qRef = collection(db, 'questions');
              const snap = await getDocs(query(qRef, where('category', '==', state.activeCategory)));
              rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              console.log(`✅ Firestore dan ${rawList.length} ta savol yuklandi (1 ta so'rov)`);
              if (rawList.length > 0) {
                await localforage.setItem(cacheKey, rawList);
                await localforage.setItem(versionKey, remoteVersion);
              }
            } catch (fsErr) {
              // `permission-denied` = obuna/sinov muddati tugagan (firestore.rules
              // → hasContentAccess). Bu NOSOZLIK EMAS, kutilgan paywall holati:
              // foydalanuvchiga bo'sh ekran emas, obuna oynasi ko'rsatiladi.
              if (fsErr?.code === 'permission-denied') {
                paywalled = true;
                showToast(t('test.toastPremiumRequired'), 'error');
                setShowPremiumModal(true);
              } else if (fsErr?.code === 'resource-exhausted') {
                // Firestore kunlik o'qish kvotasi tugagan. Ilgari bu holat
                // jimgina `rawList = []` bo'lib qolardi — foydalanuvchi
                // sababsiz BO'SH ekran ko'rib, ilovani buzuq deb o'ylardi.
                // Sabab foydalanuvchida emas, shuning uchun matn ham
                // "xato" emas, "vaqtinchalik cheklov" deb yoziladi.
                console.error('Firestore kvotasi tugagan:', fsErr);
                showToast(t('test.toastServerBusy'), 'error');
              } else {
                console.error("Firestore fallback xatosi:", fsErr);
              }
              rawList = [];
            }
          }
        }

        // Agar ma'lum bir mavzu tanlangan bo'lsa, JavaScript yordamida tezkor filter qilamiz
        if (topicId !== -1) {
          const topicObj = TOPICS.find(t => t.id === topicId);
          const expectedCategory = topicObj ? topicObj.category : state.activeCategory;
          rawList = rawList.filter(q => q.topicId === topicId && q.category === expectedCategory);
        } else {
          rawList = rawList.filter(q => q.category === state.activeCategory);
        }

        // Aralash mashq (reja «mixed» qadami): faqat tanlangan bir necha
        // bo'lim savollari qoladi — bloklab emas, aralashtirib mashq qilish uchun
        if (topicSubset && topicSubset.length > 0) {
          rawList = rawList.filter(q => topicSubset.includes(q.topicId));
        }

        // BAZADAGI XATOLIKLARNI OLDINI OLISH: Faqat joriy fan mavzularini qoldiramiz
        const validTopicIds = TOPICS.filter(t => 
          Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory
        ).map(t => t.id);
        
        rawList = rawList.filter(q => validTopicIds.includes(q.topicId));

        // SAVOL KODLARINI UI'DAN OLIB TASHLASH VA MOSLASHTIRISH SAVOLLARINI ARALASHTIRISH
        rawList = processQuestionsOnTheFly(rawList);

        // Dublikat savollarni tozalaymiz (kirish kontekst qismlarini hisobga olmagan holda)
        const seenCore = new Set();
        rawList = rawList.filter(q => {
          const core = cleanForDedup(q.q || '');
          if (!core) return true;
          if (seenCore.has(core)) return false;
          seenCore.add(core);
          return true;
        });

        // 🧠 SMART SORT — aqlli savol tanlash
        // Zaif mavzulardagi savollarni ko'proq ko'rsatadi,
        // spaced repetition muddati kelgan savollarni ustivor qiladi
        qList = smartSort(rawList, {
          topicStats: state.topicStats,
          spacedCards: state.spacedCards || [],
          mistakes: (state.stats?.[state.activeCategory]?.mistakes) || [],
          activeCategory: state.activeCategory,
          batchSize: rawList.length,
          topicId,
          repetitionLimit: state.repetitionLimit ?? 0
        });
      }

      let finalPool = qList;
      if (diffFilter !== 'ALL') {
        finalPool = qList.filter(q => q.difficulty === diffFilter);
      }

      if (currentReq === generateReqRef.current) {
        setFullPool(finalPool);

        // ── Hovuzni BIR MARTA yozamiz ──
        // Bu yerdagi yozuv og'ir (CHQBT'da ~2.4 MB), lekin u seans boshida
        // BITTA marta bo'ladi — javob bosilganda emas. Shtamp sessiya yozuvini
        // shu hovuzga bog'laydi.
        const uid = user?.uid;
        if (uid && finalPool.length > 0) {
          const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          poolStampRef.current = stamp;
          localforage.setItem(poolKeyFor(uid), {
            uid,
            stamp,
            activeCategory: state.activeCategory,
            mode,
            topicId,
            topicSubset,
            pool: finalPool,
          }).catch(e => console.error('Save test pool error:', e));
        } else {
          poolStampRef.current = null;
        }

        // Analitika: yangi test sessiyasi boshlandi (bo'lim navigatsiyasida emas — bu effekt
        // faqat fan/mavzu/rejim o'zgarganda ishlaydi)
        if (finalPool.length > 0) {
          AnalyticsEvents.testStart(topicName, mode);
        }
      }
    } catch (error) {
      console.error("Firestore Error:", error);
      if (currentReq === generateReqRef.current) {
        showToast(t('test.toastLoadError'), 'error');
      }
    } finally {
      if (currentReq === generateReqRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const generateQuestions = () => {
    generateFullPool();
  };

  const handleSelect = (qIndex, optIdx) => {
    if (answers[qIndex] !== undefined) return;

    const elapsed = Math.min(QUESTION_TIMER_SECONDS, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
    questionTimesRef.current[qIndex] = (questionTimesRef.current[qIndex] || 0) + elapsed;

    setAnswers(prev => ({ ...prev, [qIndex]: optIdx }));
    const q = questions[qIndex];

    if (q.correct === optIdx) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);

      const MOTIVATIONS = [
        { min: 1, words: t('test.motiv.t1', { returnObjects: true }) },
        { min: 3, words: t('test.motiv.t3', { returnObjects: true }) },
        { min: 5, words: t('test.motiv.t5', { returnObjects: true }) },
        { min: 10, words: t('test.motiv.t10', { returnObjects: true }) },
      ];
      const tier = [...MOTIVATIONS].reverse().find(m => newCombo >= m.min);
      const word = (tier && Array.isArray(tier.words)) ? tier.words[Math.floor(Math.random() * tier.words.length)] : t('test.motivFallback');
      setMotivationText(newCombo >= 3 ? t('test.motivCombo', { word, combo: newCombo }) : word);
      clearTimeout(motivationTimerRef.current);
      motivationTimerRef.current = setTimeout(() => setMotivationText(''), 2000);

      // Konfetti — har to'g'ri javobda emas, faqat katta combo bosqichlarida (5, 10, 15...)
      if (newCombo >= 5 && newCombo % 5 === 0 && !prefersReducedMotion()) {
        confetti({
          particleCount: newCombo >= 10 ? 200 : 120,
          spread: 90,
          origin: { y: 0.7 },
          colors: newCombo >= 10 ? ['#FFD700', '#FFA500', '#FF4500'] : ['#34D399', '#10B981', '#ffffff']
        });
      }
    } else {
      setComboCount(0);
      setMotivationText('');
    }

    setTimeout(() => {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  };

  const handleObjection = (text) => {
    const qObj = questions[currentQ];
    addObjection(topicId, state.activeCategory, qObj, text);
    setShowObjectionModal(false);
    showToast(t('test.toastObjectionThanks'), 'success');
  };

  const handleFlashcardKnown = (known) => {
    setFcKnown(prev => ({ ...prev, [currentQ]: known }));
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setFcFlipped(false);
    } else {
      const knownCount = Object.values({ ...fcKnown, [currentQ]: known }).filter(Boolean).length;
      showToast(t('test.toastFlashcardDone', { known: knownCount, total: questions.length }), 'info');
    }
  };

  // ── Sessiyani avtomatik saqlash (debounce 400 ms) ──
  // Avval bu effekt har javob/o'tishda DARHOL ishga tushar va yozuvga butun
  // `fullPool` kirardi. Endi yozuv yengil (~2–5 KB) va 400 ms ichida ketma-ket
  // kelgan o'zgarishlar bitta yozuvga yig'iladi: tez javob berayotgan
  // foydanaluvchi asosiy oqimni bloklamaydi.
  useEffect(() => {
    if (questions.length === 0 || showResults) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistRef.current?.(), 400);
    return () => clearTimeout(saveTimerRef.current);
  }, [answers, currentQ, selectedBatch, comboCount, questions.length, showResults]);

  // Ilova fonga tushganda / yopilganda — debounce'ni KUTMASDAN yozamiz.
  // Mobil PWA foydalanuvchisi ilovani 400 ms ichida yopishi mumkin.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') persistRef.current?.(); };
    const onPageHide = () => persistRef.current?.();
    document.addEventListener('visibilitychange', onHide);
    // `pagehide` — iOS Safari'da `visibilitychange` har doim ishonchli emas
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    setSelectedBatch(0);
    setReqJustSent(false); // mavzu o'zgarsa so'rov tugma holatini tiklash
  }, [topicId, mode]);

  const topicObj = TOPICS.find(t => t.id === topicId);
  const topicName = topicId === -1 ? t('test.allSections') : (topicObj?.name || t('test.allSections'));

  // Shu mavzu uchun avval so'rov yuborilganmi (localStorage) yoki shu sessiyada yuborildimi
  const reqAlreadySent = reqJustSent || (user ? hasRequested(user.uid, state.activeCategory, topicId) : false);

  // "Ko'proq savol kerak" — tirik halqa so'rovi (questionRequests)
  const handleRequestMore = async () => {
    if (!user) { showToast(t('test.toastLoginToRequest'), 'error'); return; }
    const categoryName = SUBJECTS.find(s => s.id === state.activeCategory)?.name || state.activeCategory;
    const res = await submitQuestionRequest(user, {
      category: state.activeCategory,
      categoryName,
      topicId,
      topicName,
    });
    if (res.ok) {
      setReqJustSent(true);
      showToast(t('test.toastRequestOk'), 'success');
    } else if (res.reason === 'duplicate') {
      setReqJustSent(true);
      showToast(t('test.toastRequestDup'), 'info');
    } else {
      showToast(t('test.toastRequestErr'), 'error');
    }
  };

  const handleShowResults = () => {
    if (committedRef.current) return; // ikki marta bosish / sekin tarmoq himoyasi
    committedRef.current = true;
    // Hovuz saqlanadi: natija ekranidan «keyingi blok»ga o'tish mumkin.
    clearSessionProgress();
    setShowResults(true);
    // 🧠 SMART ENGINE: Natijalarni tahlil qilish va bir marta saqlash
    const results = summarizeTestResults(questions, answers, state.spacedCards || [], topicId, questionTimesRef.current);
    
    // Add total session time and topicId to results
    const totalSessionTime = Object.values(questionTimesRef.current).reduce((a, b) => a + b, 0);
    results.sessionTime = totalSessionTime;
    results.topicId = topicId;

    const commitResult = batchCommitResults(results);
    setAmiDelta(commitResult?.amiDelta || 0);
    setGainedTiers(commitResult?.gained || []);
    setReward({ points: commitResult?.rewardPoints || 0, freezes: commitResult?.rewardFreezes || 0 });

    // ⚠️ AUDIT 2026-08-06, T-14 BAND — bu yerda `fetch('/api/send-result', ...)`
    // turardi, LEKIN `api/send-result.js` fayli mavjud emas (api/ da aynan 12 ta
    // funksiya bor va u ular orasida yo'q). `fetch` 404 da reject QILMAYDI va javob
    // o'qilmasdi, shuning uchun xato hech qayerda ko'rinmasdi: «natijani Telegramga
    // yuborish» hech qachon ishlamagan, har test yakunida esa bekorga so'rov ketardi.
    // O'lik chaqiruv olib tashlandi. Funksiya kerak bo'lsa — Vercel Hobby 12 funksiya
    // chegarasi sababli YANGI endpoint emas, `notify-admin.js` ga `action=result`
    // qo'shilishi kerak (naqsh: `action=delete-request`).
    const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;
    AnalyticsEvents.testComplete(topicName, correctCount, questions.length);
  };

  const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;

  // ── Nazariya: joriy savolning O'Z mavzusi bo'yicha (aralash testda ham) ──
  const currentTopicId = questions[currentQ]?.topicId ?? topicId;
  const { theory: currentTheory, loading: theoryLoading } = useTheory(currentTopicId);

  // Konspekt kartochkasi imtihon rejimida chiqmaydi (u imtihon simulyatsiyasi)
  // va aralash mashqda ham (topicId -1 — u yerda bitta mavzu yo'q).
  const theoryCardEligible = mode !== 'exam' && topicId >= 0 && questions.length > 0;

  // Mavzuga BIRINCHI kirishda kartochka ochiq, keyingi kirishlarda yig'ilgan.
  // `theoryLoading` kutiladi: zaxira matnda `updatedAt` bo'lmagani uchun
  // kutmasak kartochka bir lahza ochilib, keyin yopilib ko'z oldida sakrardi.
  useEffect(() => {
    if (!theoryCardEligible || theoryLoading || !currentTheory) {
      setTheoryCardOpen(false);
      return;
    }
    setTheoryCardOpen(!isTheorySeen(user?.uid, topicId, currentTheory.updatedAt));
  }, [topicId, theoryCardEligible, theoryLoading, currentTheory?.updatedAt, user?.uid]);

  // Mavzu almashsa «belgilandi» qulfi ochiladi
  useEffect(() => { theoryMarkedRef.current = false; }, [topicId]);

  // «O'qildi» — kartochka qo'lda yopilganda yoki birinchi javob berilganda.
  // Ochilishning o'ziga qarab belgilamaymiz: tasodifan kirib darrov chiqqan
  // odam konspektni umuman ko'rmay qolardi.
  const markTheoryRead = () => {
    if (theoryMarkedRef.current || !theoryCardEligible || theoryLoading || !currentTheory) return;
    theoryMarkedRef.current = true;
    markTheorySeen(user?.uid, topicId, currentTheory.updatedAt);
  };

  useEffect(() => {
    if (Object.keys(answers).length > 0) markTheoryRead();
  }, [answers, theoryCardEligible, theoryLoading]);

  // Xato javobdan keyin aynan kerakli nazariy band topiladi. Savol matniga
  // TO'G'RI javob ham qo'shiladi — u ko'pincha bandning kalit so'zini beradi.
  const theoryMatch = useMemo(() => {
    const q = questions[currentQ];
    const picked = answers[currentQ];
    if (!q || picked === undefined || picked === q.correct) return null;
    if (!currentTheory || currentTheory.keyPoints.length === 0) return null;
    return matchKeyPoint(`${q.q || ''} ${q.opts?.[q.correct] || ''}`, currentTheory);
  }, [questions, currentQ, answers, currentTheory]);

  if (isGenerating) {
    return (
      <div className="test-skeleton-container">
        {/* Header Skeleton */}
        <div className="test-skeleton-header">
           <div className="test-skeleton-line" style={{ width: '40%', height: 24 }} />
           <div className="test-skeleton-line" style={{ width: '20%', height: 24 }} />
        </div>
        {/* Question Text Skeleton */}
        <div className="test-skeleton-box">
          <div className="test-skeleton-line" style={{ width: '100%', height: 22, marginBottom: 12, animationDelay: '0.1s' }} />
          <div className="test-skeleton-line" style={{ width: '80%', height: 22, marginBottom: 24, animationDelay: '0.2s' }} />
          
          {/* Answers Skeletons */}
          {[1,2,3,4].map((i, idx) => (
            <div key={i} className="test-skeleton-line" style={{ width: '100%', height: 56, borderRadius: 16, marginBottom: 10, animationDelay: `0.${3 + idx}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // Bepul limit tekshiruvi (hooks ishga tushgandan so'ng)
  if (isFreeLimitReached) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="limit-container">
        <div className="limit-card">
          <div className="limit-icon">🔒</div>
          <div className="limit-title">{t('test.limitTitle')}</div>
          <div className="limit-text">
            {t('test.limitText')}
          </div>
          <button className="limit-btn-primary" onClick={() => setShowPremiumModal(true)}>
            {t('test.limitActivate')}
          </button>
          <button className="limit-btn-secondary" onClick={goBack}>{t('test.backHomeArrow')}</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px 80px' }}>
      {questions.length === 0 && <FreeMonthBanner onPayClick={() => setShowPremiumModal(true)} />}

      {/* Header — fan + mavzu + blok chiplari (Dashboard bilan bir xil), pastida jami savol soni */}
      {(() => {
        const totalBatches = Math.ceil(fullPool.length / BATCH_SIZE);
        const hasBlocks = mode !== 'mistakes' && totalBatches > 1;
        const rangeStart = selectedBatch * BATCH_SIZE + 1;
        const rangeEnd = Math.min((selectedBatch + 1) * BATCH_SIZE, fullPool.length);
        const openBlockPicker = () => {
          if (guardActive) { setShowBlockConfirm(true); return; }
          setShowBlockPicker(true);
        };
        return (
          <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
            <SubjectTopicChips
              state={state}
              updateState={updateState}
              SUBJECTS={SUBJECTS}
              TOPICS={TOPICS}
              setTopicId={setTopicId}
              guardChange={guardActive}
              // Blok endi yuqorida uchinchi chip emas — savollar oralig'i yozuvining
              // o'zi bosiladigan qatorga aylandi (bloklar bo'lmasa oddiy matn qoladi)
              belowRow={fullPool.length > 0 && mode !== 'mistakes' ? (
                <BlockRow
                  label={hasBlocks ? t('selector.blockOf', { n: selectedBatch + 1, total: totalBatches }) : null}
                  hint={hasBlocks
                    ? `${t('test.questionRange', { start: rangeStart, end: rangeEnd })} · ${t('test.totalAvailable', { count: fullPool.length })}`
                    : t('test.totalAvailable', { count: fullPool.length })}
                  onClick={hasBlocks ? openBlockPicker : undefined}
                  ariaLabel={t('test.selectBlock')}
                />
              ) : null}
            />
          </div>
        );
      })()}

      {/* Blok tanlash oynasi (blok chipi orqali) */}
      <AnimatePresence>
        {showBlockPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBlockPicker(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 1000 }}
            />
            <motion.div
              initial={{ y: '100%', x: '-50%' }} animate={{ y: 0, x: '-50%' }} exit={{ y: '100%', x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed', bottom: 0, left: '50%', width: '100%', maxWidth: 720,
                background: 'var(--bg2)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                border: '1px solid var(--glass-border)', borderBottom: 'none',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', zIndex: 1001,
                display: 'flex', flexDirection: 'column', maxHeight: '70vh', overflow: 'hidden'
              }}
            >
              <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 'var(--fs-4xl)', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>{t('test.selectBlock')}</h3>
                  <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', marginTop: 2 }}>{t('test.totalAvailable', { count: fullPool.length })}</div>
                </div>
                <button onClick={() => setShowBlockPicker(false)} aria-label={t('common.close')} style={{ flexShrink: 0, background: 'var(--bg3)', border: 'none', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 30px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 8 }}>
                  {Array.from({ length: Math.ceil(fullPool.length / BATCH_SIZE) }).map((_, i) => {
                    const start = i * BATCH_SIZE + 1;
                    const end = Math.min((i + 1) * BATCH_SIZE, fullPool.length);
                    const isSel = selectedBatch === i;
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedBatch(i); setShowBlockPicker(false); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                          minHeight: 54, borderRadius: 12, border: '1.5px solid',
                          background: isSel ? 'var(--accent)' : 'var(--bg3)',
                          borderColor: isSel ? 'var(--accent)' : 'transparent',
                          color: isSel ? '#fff' : 'var(--text)', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: 800 }}>{t('test.block', { n: i + 1 })}</span>
                        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, opacity: 0.75 }}>{start}–{end}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {questions.length === 0 ? (
        <div className="empty-state-card">
          <div className={`empty-state-glow ${mode === 'mistakes' ? 'success' : 'info'}`} />
          <div className="empty-state-content">
            {mode === 'mistakes' ? (
              <>
                <div className="empty-state-icon success float-animation">🏆</div>
                <h3 className="empty-state-title">{t('test.emptyMistakesTitle')}</h3>
                <p className="empty-state-text">
                  {t('test.emptyMistakesText')}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-outline" onClick={goBack}><ArrowLeft size={16} /> {t('test.changeSubject')}</button>
                </div>
              </>
            ) : (
              <>
                <div className="empty-state-icon info float-animation">⏳</div>
                <h3 className="empty-state-title">{t('test.emptyInfoTitle')}</h3>
                <p className="empty-state-text">
                  {t('test.emptyInfoText')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  {reqAlreadySent ? (
                    <div style={{ width: '220px', padding: '12px', borderRadius: '14px', background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 700, fontSize: 'var(--fs-md)', textAlign: 'center', border: '1px solid rgba(16,185,129,0.25)' }}>
                      {t('test.requestSent')}
                    </div>
                  ) : (
                    <button className="btn btn-primary" style={{ width: '220px' }} onClick={handleRequestMore}>{t('test.needMore')}</button>
                  )}
                  {topicId !== -1 && (
                    <button className="btn btn-outline" style={{ width: '220px' }} onClick={() => setTopicId(-1)}>{t('test.allTopicsBtn')}</button>
                  )}
                  <button className="btn btn-outline" style={{ width: '220px' }} onClick={goBack}><ArrowLeft size={16} /> {t('test.chooseOtherSubject')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : mode === 'flashcard' ? (
        <FlashcardView 
          questions={questions}
          currentQ={currentQ}
          setCurrentQ={setCurrentQ}
          fcFlipped={fcFlipped}
          setFcFlipped={setFcFlipped}
          fcKnown={fcKnown}
          handleFlashcardKnown={handleFlashcardKnown}
          setShowObjectionModal={setShowObjectionModal}
        />
      ) : (
        <div className="exam-mode-container">
          {!showResults ? (
            <>
              {/* Repetition Informational Banner */}
              {(state.repetitionLimit ?? 0) > 0 && showRepetitionBanner && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'var(--blue-bg)',
                    border: '1px solid rgba(14, 151, 224, 0.25)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'var(--blue-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--blue)',
                      flexShrink: 0
                    }}>
                      <RefreshCw size={16} />
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', lineHeight: '1.4', color: 'var(--text2)' }}>
                      <strong style={{ color: 'var(--text)' }}>{t('test.repetitionActive')}</strong> {t('test.repetitionText', { pct: state.repetitionLimit ?? 0 })}
                    </div>
                  </div>
                  <button
                    onClick={handleDismissBanner}
                    aria-label={t('common.close')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text3)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
              {/* Konspekt — to'siq emas, savol ustidagi ixcham qator.
                  Yig'ilgan holatda ham turadi: test davomida konspektga
                  yagona doimiy kirish nuqtasi shu. */}
              {theoryCardEligible && !theoryLoading && (
                <TheoryPreCard
                  theory={currentTheory}
                  open={theoryCardOpen}
                  onToggle={() => {
                    if (theoryCardOpen) markTheoryRead();
                    setTheoryCardOpen(v => !v);
                  }}
                  onOpenFull={() => { markTheoryRead(); setShowTheoryModal(true); }}
                />
              )}
              <QuestionBox
                questions={questions}
                currentQ={currentQ}
                answers={answers}
                topicId={topicId}
                topicName={topicName}
                mode={mode}
                timerMode={timerMode}
                setTimerMode={setTimerMode}
                QUESTION_TIMER_SECONDS={QUESTION_TIMER_SECONDS}
                accumulateTime={accumulateTime}
                onTimeExpire={handleTimeExpire}
                motivationText={motivationText}
                comboCount={comboCount}
                state={state}
                handleSelect={handleSelect}
                explanationRef={explanationRef}
                activeReviewTab={activeReviewTab}
                setActiveReviewTab={setActiveReviewTab}
                saveCustomMnemonic={saveCustomMnemonic}
                setShowObjectionModal={setShowObjectionModal}
                onPremiumClick={() => setShowPremiumModal(true)}
                theoryMatch={theoryMatch}
                onOpenTheory={() => setShowTheoryModal(true)}
              />
              <div className="q-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button disabled={currentQ === 0} className="btn btn-outline" onClick={() => { accumulateTime(); setCurrentQ(prev => prev - 1); }}>{t('common.back')}</button>
                {(Object.keys(answers).length === questions.length || currentQ === questions.length - 1) ? (
                  <button className="btn btn-primary" onClick={() => {
                    accumulateTime();
                    // Oxirgi savolda javobsiz savollar qolgan bo'lsa — avval tasdiq so'raymiz,
                    // aks holda foydalanuvchi tugmani bosolmay "qamalib" qolardi.
                    if (Object.keys(answers).length < questions.length) {
                      setShowFinishConfirm(true);
                    } else {
                      handleShowResults();
                    }
                  }}>{t('test.viewResults')}</button>
                ) : (
                  <button className="btn btn-outline" onClick={() => { accumulateTime(); setCurrentQ(prev => prev + 1); }}>{t('test.next')}</button>
                )}
              </div>
            </>
          ) : (
            <TestResults
              correctCount={correctCount}
              amiDelta={amiDelta}
              gained={gainedTiers}
              reward={reward}
              questionsLength={questions.length}
              topicName={topicName}
              state={state}
              setMode={setMode}
              generateQuestions={generateQuestions}
              showToast={showToast}
              nextBatchLabel={(() => {
                const totalBatches = Math.ceil(fullPool.length / BATCH_SIZE);
                if (selectedBatch >= totalBatches - 1) return null;
                const start = (selectedBatch + 1) * BATCH_SIZE + 1;
                const end = Math.min((selectedBatch + 2) * BATCH_SIZE, fullPool.length);
                return `${start}–${end}`;
              })()}
              onNextBatch={selectedBatch < Math.ceil(fullPool.length / BATCH_SIZE) - 1 ? () => {
                setSelectedBatch(prev => prev + 1);
                setShowResults(false);
              } : null}
            />
          )}
        </div>
      )}

      {/* E'TIROZ MODALI */}
      <ObjectionModal
        isOpen={showObjectionModal}
        onClose={() => setShowObjectionModal(false)}
        questionText={questions[currentQ]?.q}
        onSubmit={handleObjection}
      />

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      {/* Konspekt — xato javobdan keyin aynan mos band ajratilgan holda */}
      <TheoryModal
        open={showTheoryModal}
        onClose={() => setShowTheoryModal(false)}
        topicId={currentTopicId}
        topicName={TOPICS.find(x => x.id === currentTopicId)?.name || topicName}
        highlight={theoryMatch?.index ?? null}
      />

      {/* Test o'rtasida blok almashtirish tasdig'i (window.confirm o'rniga) */}
      <ConfirmDialog
        open={showBlockConfirm}
        title={t('test.changeWarn')}
        onConfirm={() => { setShowBlockConfirm(false); setShowBlockPicker(true); }}
        onCancel={() => setShowBlockConfirm(false)}
      />

      {/* Javobsiz savollar qolganda yakunlash tasdig'i */}
      <ConfirmDialog
        open={showFinishConfirm}
        title={t('test.finishTitle')}
        text={t('test.finishUnanswered', { count: questions.length - Object.keys(answers).length })}
        confirmLabel={t('test.finishAnyway')}
        onConfirm={() => { setShowFinishConfirm(false); handleShowResults(); }}
        onCancel={() => setShowFinishConfirm(false)}
      />

      {/* TESTDAN CHIQISH TASDIG'I (orqa tugma) */}
      {showExitConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 24, maxWidth: 320, width: '90%', borderRadius: 20, textAlign: 'center', background: 'var(--bg2)' }}>
            <div style={{ fontSize: 'var(--fs-10xl)', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{t('test.exitTitle')}</h3>
            <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: 24 }}>{t('test.exitText')}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setShowExitConfirm(false)}>{t('test.continueBtn')}</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} onClick={() => { setShowExitConfirm(false); clearSavedSession(); navigate('/test'); }}>{t('test.exit')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default TestPage;
