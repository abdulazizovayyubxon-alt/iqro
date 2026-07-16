import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
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

import SubjectTopicChips, { Chip } from '../components/SubjectTopicChips';
import QuestionBox from '../components/test/QuestionBox';
import FlashcardView from '../components/test/FlashcardView';
import TestResults from '../components/test/TestResults';
import { useExitGuard } from '../hooks/useExitGuard';
import { useModalBackButton } from '../components/profile/useModalBackButton';

const TestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, batchCommitResults, updateState, saveCustomMnemonic } = useContext(AppContext);
  const mode = state.testMode || 'exam';
  const setMode = (m) => updateState({ testMode: m });
  const topicId = state.topicId ?? -1;
  const goBack = () => {
    localforage.removeItem('test_session').catch(() => {});
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
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [showBlockPicker, setShowBlockPicker] = useState(false); // Blok tanlash oynasi (blok chipi orqali)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false); // Test o'rtasida blok almashtirish tasdig'i

  // New States: Difficulty Filter and Timer Mode
  const [diffFilter] = useState('ALL'); // 'ALL', 'Y1', 'Y2', 'Y3'
  const [timerMode, setTimerMode] = useState('countdown'); // 'countdown', 'stopwatch', 'off'

  // Testdan chiqish tasdig'i (orqa tugma himoyasi)
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  // Mini-darslik va ko'rilgan mavzular xotirasi
  const [showTheory, setShowTheory] = useState(false);
  const [seenTheoryTopics, setSeenTheoryTopics] = useState({});

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
  }, [topicId, mode, state.activeCategory, diffFilter]);

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
      try {
        const s = await localforage.getItem('test_session');
        const valid = s && s.activeCategory === state.activeCategory && s.mode === mode && s.topicId === topicId && (!s.uid || s.uid === user?.uid) && Array.isArray(s.questions) && s.questions.length > 0;
        if (valid && currentReq === generateReqRef.current) {
          isResumingRef.current = true;
          setFullPool(s.fullPool || []);
          setSelectedBatch(s.selectedBatch || 0);
          setQuestions(s.questions || []);
          setCurrentQ(s.currentQ || 0);
          setAnswers(s.answers || {});
          setComboCount(s.comboCount || 0);
          questionTimesRef.current = s.questionTimes || {};
          setIsGenerating(false);
          return;
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
        let storageUrls = {};

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
        storageUrls = vData.urls || {};

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
          try {
            const directUrl = storageUrls[state.activeCategory];
            if (directUrl) {
              console.log(`Direct storage dan yuklanmoqda: ${state.activeCategory} -> ${directUrl}`);
              const directRes = await fetch(directUrl);
              if (directRes.ok) {
                rawList = await directRes.json();
                console.log(`✅ Direct storage dan ${rawList.length} ta savol yuklandi`);
              } else {
                console.warn(`Direct storage xatosi: ${directRes.status}`);
              }
            }
          } catch (directErr) {
            console.error("Direct storage yuklashda xatolik:", directErr);
          }

          // Agar direct yuklanmasa, API orqali sinab ko'ramiz
          if (!rawList || rawList.length === 0) {
            try {
              const res = await fetch(`/api/get-questions?category=${state.activeCategory}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              if (!res.ok) {
                if (res.status === 403) {
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

          // 🔄 FALLBACK: Agar bundle yuklanmasa, topicId bo'yicha parallel Firestore query
          if (!rawList || rawList.length === 0) {
            console.warn("Bundle yuklanmadi — Firestore dan topicId bo'yicha o'qilmoqda...");
            try {
              const qRef = collection(db, 'questions');
              // Joriy kategoriya uchun mavzu IDlarini olamiz
              const categoryTopicIds = TOPICS.filter(t =>
                Array.isArray(t.category)
                  ? t.category.includes(state.activeCategory)
                  : t.category === state.activeCategory
              ).map(t => t.id);

              // Har bir topicId uchun alohida query — parallel bajariladi (tezroq)
              const snapshots = await Promise.all(
                categoryTopicIds.map(tid =>
                  getDocs(query(qRef, where('topicId', '==', tid)))
                )
              );
              rawList = snapshots.flatMap(snap =>
                snap.docs.map(d => ({ id: d.id, ...d.data() }))
              );
              console.log(`✅ Firestore dan ${rawList.length} ta savol yuklandi (${categoryTopicIds.length} mavzu)`);
              if (rawList.length > 0) {
                await localforage.setItem(cacheKey, rawList);
                await localforage.setItem(versionKey, remoteVersion);
              }
            } catch (fsErr) {
              console.error("Firestore fallback xatosi:", fsErr);
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

  // Sessiyani localforage'da avtomatik saqlash
  useEffect(() => {
    if (questions.length === 0 || showResults) return;
    localforage.setItem('test_session', {
      uid: user?.uid || null,
      activeCategory: state.activeCategory,
      mode,
      topicId,
      questions,
      fullPool,
      answers,
      currentQ,
      selectedBatch,
      comboCount,
      questionTimes: questionTimesRef.current,
      savedAt: Date.now()
    }).catch(e => console.error("Save test session error:", e));
  }, [questions, answers, currentQ, selectedBatch, comboCount, showResults, mode, topicId, state.activeCategory, user?.uid, fullPool]);

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

  useEffect(() => {
    if (topicObj?.theoryHint && questions.length > 0) {
      // Faqat shu mavzuga birinchi marta kirganda ko'rsatiladi (blok o'zgarganda emas)
      if (!seenTheoryTopics[topicId]) {
        setShowTheory(true);
        setSeenTheoryTopics(prev => ({ ...prev, [topicId]: true }));
      }
    }
  }, [topicId, mode, questions.length]);

  const handleShowResults = () => {
    if (committedRef.current) return; // ikki marta bosish / sekin tarmoq himoyasi
    committedRef.current = true;
    localforage.removeItem('test_session').catch(() => {});
    setShowResults(true);
    // 🧠 SMART ENGINE: Natijalarni tahlil qilish va bir marta saqlash
    const results = summarizeTestResults(questions, answers, state.spacedCards || [], topicId);
    
    // Add total session time and topicId to results
    const totalSessionTime = Object.values(questionTimesRef.current).reduce((a, b) => a + b, 0);
    results.sessionTime = totalSessionTime;
    results.topicId = topicId;

    const commitResult = batchCommitResults(results);
    setAmiDelta(commitResult?.amiDelta || 0);

    // Send result to Telegram
    const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;
    const wrongCount = Object.keys(answers).length - correctCount;
    AnalyticsEvents.testComplete(topicName, correctCount, questions.length);
    // Telegramga natija — ID token bilan (server uid'ni TOKEN'dan oladi, tanaga ishonmaydi)
    auth.currentUser?.getIdToken().then(token => {
      if (!token) return;
      fetch('/api/send-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          correct: correctCount,
          wrong: wrongCount,
          total: questions.length,
          time: Math.round(totalSessionTime / 60) + ' daqiqa',
          mode: mode === 'exam' ? 'Imtihon rejim' : 'O\'rganish rejim',
          title: topicName
        })
      }).catch(e => console.error(e));
    }).catch(() => {});
  };

  const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;

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

  if (showTheory) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="theory-container">
        <div className="theory-card">
          <div className="theory-icon">📚</div>
          <h2 className="theory-title">{t('test.theoryTitle')}</h2>
          <p className="theory-subtitle">
            {t('test.theorySubtitle')}
          </p>
          <div className="theory-content">
            {topicObj?.theoryHint}
          </div>
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="theory-btn"
            onClick={() => setShowTheory(false)}
          >
            {t('test.theoryBtn')}
          </motion.button>
        </div>
      </motion.div>
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
              extraChip={hasBlocks ? (
                <Chip
                  label={t('test.blockChip', { n: selectedBatch + 1, total: totalBatches })}
                  onClick={openBlockPicker}
                  ariaLabel={t('test.selectBlock')}
                  noShrink
                />
              ) : null}
            />
            {fullPool.length > 0 && mode !== 'mistakes' && (
              <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 10, paddingLeft: 2 }}>
                {hasBlocks
                  ? `${t('test.questionRange', { start: rangeStart, end: rangeEnd })} · ${t('test.totalAvailable', { count: fullPool.length })}`
                  : t('test.totalAvailable', { count: fullPool.length })}
              </div>
            )}
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
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>{t('test.selectBlock')}</h3>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{t('test.totalAvailable', { count: fullPool.length })}</div>
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
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{t('test.block', { n: i + 1 })}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.75 }}>{start}–{end}</span>
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
                    <div style={{ width: '220px', padding: '12px', borderRadius: '14px', background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 700, fontSize: '13px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.25)' }}>
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
                    <div style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--text2)' }}>
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
              />
              <div className="q-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button disabled={currentQ === 0} className="btn btn-outline" onClick={() => { accumulateTime(); setCurrentQ(prev => prev - 1); }}>{t('common.back')}</button>
                {Object.keys(answers).length === questions.length ? (
                  <button className="btn btn-primary" onClick={handleShowResults}>{t('test.viewResults')}</button>
                ) : (
                  <button disabled={currentQ === questions.length - 1} className="btn btn-outline" onClick={() => { accumulateTime(); setCurrentQ(prev => prev + 1); }}>{t('test.next')}</button>
                )}
              </div>
            </>
          ) : (
            <TestResults
              correctCount={correctCount}
              amiDelta={amiDelta}
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

      {/* Test o'rtasida blok almashtirish tasdig'i (window.confirm o'rniga) */}
      <ConfirmDialog
        open={showBlockConfirm}
        title={t('test.changeWarn')}
        onConfirm={() => { setShowBlockConfirm(false); setShowBlockPicker(true); }}
        onCancel={() => setShowBlockConfirm(false)}
      />

      {/* TESTDAN CHIQISH TASDIG'I (orqa tugma) */}
      {showExitConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 24, maxWidth: 320, width: '90%', borderRadius: 20, textAlign: 'center', background: 'var(--bg2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{t('test.exitTitle')}</h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>{t('test.exitText')}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setShowExitConfirm(false)}>{t('test.continueBtn')}</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} onClick={() => { setShowExitConfirm(false); localforage.removeItem('test_session').catch(() => {}); navigate('/test'); }}>{t('test.exit')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default TestPage;
