import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertCircle, Share2, GraduationCap, FileText, BookOpen, ClipboardList, Crosshair, History, Check, BadgeCheck } from 'lucide-react';
import { reconcileAchievements, nextMilestones } from '../data/tracks';
import NextMilestoneLine from '../components/achievements/NextMilestoneLine';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../utils/motion';
import ObjectionModal from '../components/shared/ObjectionModal';
import ResultShareCard from '../components/shared/ResultShareCard';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import PremiumModal from '../components/PremiumModal';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { summarizeTestResults } from '../engine/SmartQuestionEngine';
import { AnalyticsEvents } from '../services/analytics';
import localforage from 'localforage';
import { EXAM_SESSION_KEY } from '../config';
import { PED_BLOCK_TOTAL, isPedBlockTopic, EXAM_BLUEPRINT, hasBlueprint } from '../data/examBlueprint';
import { useExitGuard } from '../hooks/useExitGuard';
import { useModalBackButton } from '../components/profile/useModalBackButton';

// Savol matnidan kirish/kontekst qismini olib tashlaydi (dublikat aniqlash uchun)
function cleanForDedup(text) {
  let clean = (text || '').trim().toLowerCase();
  clean = clean.replace(/^\s*\[mavzu:\s*[^\]]+\]\s*/gi, '');
  clean = clean.replace(/^\s*\[[^\]]+yangi\s+savol\]\s*/gi, '');
  clean = clean.replace(/\s*\(\s*savol\s+kodi\s*:\s*#[a-z0-9_]+\s*\)/gi, '');
  clean = clean.replace(/\s*#[a-z0-9_]+/gi, '');
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

const EXAM_TOTAL = 50;
/** Mutaxassislik bloki — imtihonning 1–35-savollari. */
const CORE_BLOCK_TOTAL = EXAM_TOTAL - PED_BLOCK_TOTAL;

// INVARIANT: har fanda mutaxassislik bo'limlari yig'indisi 35, oxirgi blok
// (kasb standarti + pedagogik mahorat) esa 15 bo'lishi shart — rasmiy
// spetsifikatsiya shunday (`data/examBlueprint.js`).
//
// ⚠️ AUDIT 2026-08-06, T-5 BAND — bu yerda IKKINCHI, mustaqil
// `SUBJECT_BLUEPRINTS` jadvali turardi. U `data/examBlueprint.js` dagi
// `EXAM_BLUEPRINT` bilan 5 ta fanda (tarix, mtt, mtt_rahbar, til, kimyo)
// bir-biriga MOS KELMASDI: ikkalasining yig'indisi 35+15 bo'lsa ham, bo'limlar
// ichidagi taqsimot boshqacha edi. Natijada DiagnosticsEngine bo'limni bir
// og'irlik bilan baholab, imtihon simulyatori boshqa son savol berardi.
//
// Eng og'iri — `til` fanining 61-bo'limi: bu jadval unga 0 savol berardi
// (`countNeeded === 0 → return`), EXAM_BLUEPRINT esa 4 (tayyorlikning 8%i).
// Bazada o'sha bo'limda 279 ta savol bor, ya'ni bu ataylab emas, xato edi:
// foydalanuvchi hech qachon yopa olmaydigan teshik.
//
// Endi manba BITTA — `EXAM_BLUEPRINT` (u rasmiy spetsifikatsiya PDF'lariga
// havola qiladi va savol oraliqlarini hujjatlashtiradi). `hasBlueprint()` ham
// DiagnosticsEngine bilan ayni bitta funksiya, ya'ni «bu fanda rasmiy raqam
// bormi?» degan savolga ikkala joy bir xil javob beradi.
const blueprintForTopics = (topicIds) =>
  hasBlueprint(topicIds)
    ? Object.fromEntries(topicIds.map(id => [id, EXAM_BLUEPRINT[id]]))
    : null;

const getExamDuration = (category) => {
  switch (category) {
    case 'boshlangich':
    case 'info':
    case 'biologiya':
    case 'kimyo':
      return 120 * 60;
    case 'til':
    case 'rus_tili':
    case 'ingliz':
      return 105 * 60;
    default:
      return 90 * 60;
  }
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ExamPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const goBack = () => navigate('/test');
  const { user } = useAuth();
  const { state, batchCommitResults, updateState } = useContext(AppContext);
  const { addObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const cat = state.activeCategory;
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;



  const [questions, setQuestions] = useState([]);
  const [topicGroups, setTopicGroups] = useState([]); // [{name, icon, start, end}]
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [pacing, setPacing] = useState(null);
  const [weakTopicsSorted, setWeakTopicsSorted] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => getExamDuration(cat));
  const [finished, setFinished] = useState(false);
  const [startTimeMs, setStartTimeMs] = useState(Date.now());
  const [endTime, setEndTime] = useState(null);
  const [examEarnedPoints, setExamEarnedPoints] = useState(0); // haqiqiy yig'ilgan reyting balli
  const [examGained, setExamGained] = useState([]); // shu imtihonda olingan track darajalari (muhr-qator)

  // Natija ekrani uchun keyingi bosqich — sof hisob; memo, chunki taymer
  // har soniya re-render qiladi (context state o'zgarmaguncha qayta hisoblanmaydi)
  const nextMs = useMemo(() => {
    const { live } = reconcileAchievements(state, state.achievements);
    return nextMilestones(state, live)[0] || null;
  }, [state]);
  const [savedSession, setSavedSession] = useState(null); // tugallanmagan imtihon (resume)
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  
  const [examStarted, setExamStarted] = useState(false);
  const [examType, setExamType] = useState('standard');
  const [loading, setLoading] = useState(false);

  // Orqa tugma himoyasi: imtihon davomida orqa bosilsa to'satdan chiqib
  // ketmasdan mavjud "Imtihonni yakunlash" tasdig'i ochiladi
  useExitGuard(examStarted && !finished && !loading && questions.length > 0, () => setShowConfirmModal(true));

  // Premium modal ochiq bo'lsa orqa tugma sahifadan emas, modaldan chiqaradi
  useModalBackButton(showPremiumModal, () => setShowPremiumModal(false));

  // Imtihon boshlangach global header (yuqori menyu) yashiriladi — e'tibor
  // faqat imtihonga qaratiladi. Imtihon tugashi yoki sahifadan chiqishda
  // <body> klassi avtomatik tozalanadi.
  useEffect(() => {
    const active = examStarted && !finished;
    document.body.classList.toggle('exam-fullscreen', active);
    return () => document.body.classList.remove('exam-fullscreen');
  }, [examStarted, finished]);

  const timerRef = useRef(null);
  // Taymer intervali IMTIHON BOSHIDA yaratiladi va `answers` uning dependency'si emas.
  // Agar interval to'g'ridan handleFinish'ni chaqirsa, u eski (bo'sh answers'li) closure'ni
  // ushlab qolib, vaqt tugaganda natijani 0 ball hisoblardi. Ref har renderda yangilanadi —
  // shuning uchun avto-yakun HAR DOIM eng so'nggi javoblar bilan hisoblanadi.
  const handleFinishRef = useRef(null);

  const questionStartTimeRef = useRef(Date.now());
  const questionTimesRef = useRef({});
  const committedRef = useRef(false);   // natija ikki marta yozilishidan himoya
  const resumingRef = useRef(false);    // resume'da savollar qayta yuklanmasligi uchun
  const sessionCheckedRef = useRef(false);
  const timeLeftRef = useRef(timeLeft); // sessiya saqlashda oxirgi qiymatni olish uchun
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // ── Sessiyani saqlash (resume) ──────────────────────────────────────────
  // Faol imtihon holatini localforage'ga yozadi. Har javob/savol almashishida,
  // ilova yashirilganda va har 30 soniyada yangilanadi.
  const persistRef = useRef(null);
  persistRef.current = () => {
    if (!examStarted || finished || reviewMode || loading || questions.length === 0) return;
    localforage.setItem(EXAM_SESSION_KEY, {
      uid: user?.uid || null,
      cat,
      examType,
      // topicIcon/icon — React elementlari, IndexedDB ularni qabul qilmaydi
      // (DataCloneError, butun yozuv rad etiladi). Saqlashdan oldin olib
      // tashlaymiz, resume'da TOPICS'dan qayta biriktiriladi.
      questions: questions.map(({ topicIcon, ...q }) => q),
      topicGroups: topicGroups.map(({ icon, ...g }) => g),
      answers,
      flagged,
      currentQ,
      timeLeft: timeLeftRef.current,
      questionTimes: questionTimesRef.current,
      startTimeMs,
      savedAt: Date.now()
    }).catch(err => console.error('Imtihon sessiyasini saqlashda xato:', err));
  };

  useEffect(() => { persistRef.current?.(); }, [answers, flagged, currentQ]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') persistRef.current?.(); };
    document.addEventListener('visibilitychange', onHide);
    const iv = setInterval(() => persistRef.current?.(), 30000);
    return () => { document.removeEventListener('visibilitychange', onHide); clearInterval(iv); };
  }, []);

  // Kirish oynasida vaqtinchalik saqlangan sessiyani avtomatik tiklash (Resume)
  useEffect(() => {
    if (examStarted || sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;
    localforage.getItem(EXAM_SESSION_KEY).then(s => {
      // ⚠️ AUDIT 2026-08-06, T-21 BAND — avval shart `(!s.uid || s.uid === user?.uid)`
      // edi: `uid` YO'Q sessiya (masalan, `user` bir lahza null bo'lganda saqlangani)
      // ISTALGAN hisob tomonidan tiklanardi. Umumiy qurilmada bir o'qituvchi
      // boshqasining tugallanmagan imtihonini — javoblari bilan — ochib olardi.
      // Endi egalik QAT'IY: uid bo'lmasa yoki mos kelmasa, sessiya tiklanmaydi.
      // Kamchiligi (juda kam holatda bitta sessiya yo'qolishi) maxfiylikdan arzon.
      const valid = s && s.cat === cat && !!s.uid && !!user?.uid && s.uid === user.uid
        && Array.isArray(s.questions) && s.questions.length > 0 && s.timeLeft > 0;
      if (valid) {
        setQuestions(s.questions);
        setTopicGroups(s.topicGroups || []);
        setAnswers(s.answers || {});
        setFlagged(s.flagged || {});
        setCurrentQ(s.currentQ || 0);
        setTimeLeft(s.timeLeft);
        setExamType(s.examType || 'standard');
        setStartTimeMs(s.startTimeMs || Date.now());
        questionTimesRef.current = s.questionTimes || {};
        questionStartTimeRef.current = Date.now();
        committedRef.current = false;
        resumingRef.current = true;
        setExamStarted(true);
      }
    }).catch(e => console.error("Error restoring exam session:", e));
  }, [cat, user?.uid, examStarted]);

  const clearSavedSession = () => {
    localforage.removeItem(EXAM_SESSION_KEY).catch(() => {});
    setSavedSession(null);
  };

  // Saqlangan sessiyadan davom ettirish — savollar qayta yuklanmaydi,
  // javoblar, bayroqlar, joriy savol va qolgan vaqt aynan tiklanadi
  const resumeExam = () => {
    const s = savedSession;
    if (!s) return;
    // Saqlashda olib tashlangan ikonkalarni TOPICS'dan qayta biriktiramiz
    const catTopics = TOPICS.filter(t =>
      Array.isArray(t.category) ? t.category.includes(s.cat) : t.category === s.cat
    );
    setQuestions(s.questions.map(q => {
      const topic = catTopics.find(t => t.id === q.topicId);
      return { ...q, topicIcon: topic ? topic.icon : null };
    }));
    setTopicGroups((s.topicGroups || []).map(g => {
      const topic = catTopics.find(t => t.name === g.name);
      return { ...g, icon: topic ? topic.icon : null };
    }));
    setAnswers(s.answers || {});
    setFlagged(s.flagged || {});
    setCurrentQ(s.currentQ || 0);
    setTimeLeft(s.timeLeft);
    setExamType(s.examType || 'standard');
    setStartTimeMs(s.startTimeMs || Date.now());
    questionTimesRef.current = s.questionTimes || {};
    questionStartTimeRef.current = Date.now();
    committedRef.current = false;
    resumingRef.current = true;
    setSavedSession(null);
    setExamStarted(true);
  };

  const accumulateTime = () => {
    if (questionStartTimeRef.current) {
      const elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      const capped = Math.min(180, elapsed); // 3 daqiqa cap
      questionTimesRef.current[currentQ] = (questionTimesRef.current[currentQ] || 0) + capped;
    }
    questionStartTimeRef.current = Date.now();
  };

  const handleQuestionSwitch = (nextIdx) => {
    accumulateTime();
    setCurrentQ(nextIdx);
  };

  // Savollarni yuklash (Firestore dan)
  useEffect(() => {
    if (!examStarted) return;
    // Resume orqali kirilgan bo'lsa — savollar allaqachon tiklangan, qayta yuklamaymiz
    if (resumingRef.current) {
      resumingRef.current = false;
      return;
    }

    setTimeLeft(getExamDuration(cat));
    setFinished(false);
    setReviewMode(false);
    setAnswers({});
    setFlagged({});
    setPacing(null);
    setWeakTopicsSorted([]);
    setCurrentQ(0);
    setStartTimeMs(Date.now());
    committedRef.current = false;
    questionTimesRef.current = {};
    questionStartTimeRef.current = Date.now();

    const loadExamQuestions = async () => {
      setLoading(true);
      try {
        // 🔥 AQLLI KESHLASH (JSON BUNDLING) 🔥
        const versionDocRef = doc(db, 'settings', 'version');
        const versionSnap = await getDoc(versionDocRef);
        
        let remoteVersion = 0;
        if (versionSnap.exists()) {
          remoteVersion = versionSnap.data().dbVersion || 0;
        }

        // v2: old Storage-bundle caches are invalidated; fresh Firestore data will be used
        const cacheKey = `bundle_v2_${cat}`;
        const versionKey = `version_v2_${cat}`;

        const localCategoryVersion = await localforage.getItem(versionKey);
        let allQ = await localforage.getItem(cacheKey);
        let paywalled = false;

        if (!allQ || localCategoryVersion !== remoteVersion) {
          // ⚠️ AUDIT 2026-08-05, 2-BAND — `settings/version.urls` dan
          // auth'SIZ `fetch(downloadUrl)` yo'li OLIB TASHLANDI: u pullik savol
          // bazasini avtorizatsiyasiz beradigan asosiy yo'l edi. Endi TestPage
          // bilan bir xil zanjir: /api/get-questions (premium tekshiruvi) →
          // Firestore zaxirasi (rules bilan gated).
          try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('no_token');

            const res = await fetch(`/api/get-questions?category=${encodeURIComponent(cat)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              if (res.status === 403) paywalled = true;
              throw new Error(`api_${res.status}`);
            }
            // Dev muhitida /api/* ishlamaydi va HTML qaytaradi — Firestore zaxirasi bor
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) throw new Error('api_not_json');

            allQ = await res.json();
            await localforage.setItem(cacheKey, allQ);
            await localforage.setItem(versionKey, remoteVersion);
          } catch (apiErr) {
            console.warn('API bundle mavjud emas:', apiErr.message);
            allQ = [];
          }

          if ((!allQ || allQ.length === 0) && !paywalled) {
            try {
              const { query, where, getDocs, collection } = await import('firebase/firestore');
              const qRef = collection(db, 'questions');
              const qQuery = query(qRef, where('category', '==', cat));
              const snap = await getDocs(qQuery);
              allQ = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              await localforage.setItem(cacheKey, allQ);
              await localforage.setItem(versionKey, remoteVersion);
            } catch (fallbackErr) {
              if (fallbackErr?.code === 'permission-denied') paywalled = true;
              else if (fallbackErr?.code === 'resource-exhausted') {
                // Kunlik Firestore kvotasi tugagan — sabab foydalanuvchida
                // emas. Jim bo'sh ekran o'rniga aniq sabab ko'rsatiladi
                // (TestPage.jsx dagi bilan bir xil matn).
                console.error('Firestore kvotasi tugagan:', fallbackErr);
                showToast(t('test.toastServerBusy'), 'error');
              } else console.error('Fallback yuklashda xatolik:', fallbackErr);
              allQ = [];
            }
          }
        }

        // Obuna muddati tugagan — jim `goBack()` o'rniga sababni ko'rsatamiz.
        // Avval foydalanuvchi imtihonga bosib, hech qanday tushuntirishsiz
        // orqaga qaytarilardi.
        if (paywalled) {
          setLoading(false);
          showToast(t('test.toastPremiumRequired'), 'error');
          setShowPremiumModal(true);
          return;
        }

        allQ = allQ || [];

        allQ = allQ.filter(q => q.category === cat);
        allQ = processQuestionsOnTheFly(allQ);

        // Dublikat savollarni tozalaymiz (kirish kontekst qismlarini hisobga olmagan holda)
        const seenCore = new Set();
        allQ = allQ.filter(q => {
          const core = cleanForDedup(q.q || '');
          if (!core) return true;
          if (seenCore.has(core)) return false;
          seenCore.add(core);
          return true;
        });

        if (allQ.length === 0) {
          goBack();
          return;
        }

        const filteredTopics = TOPICS.filter(t =>
          Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
        );
        const validTopicIds = filteredTopics.map(t => t.id);
        
        // BAZADAGI XATOLIKLARNI OLDINI OLISH
        allQ = allQ.filter(q => validTopicIds.includes(q.topicId));

        // Savollarga mavzu ma'lumotlarini biriktirish
        allQ = allQ.map((q, idx) => {
          const topic = filteredTopics.find(t => t.id === q.topicId);
          let diff = q.difficulty;
          if (!diff) {
            const mod = idx % 100;
            if (mod < 30) diff = 'Y1';
            else if (mod < 86) diff = 'Y2';
            else diff = 'Y3';
          }
          return {
            ...q,
            difficulty: diff,
            topicName: topic ? topic.name : 'Aralash',
            topicIcon: topic ? topic.icon : null
          };
        });

        // 🎯 RASMIY SPETSIFIKATSIYA BO'YICHA SAVOLLARNI PROPORSIYALASH VA QIYNILIK BALANSI (30-56-14)
        // Og'irliklar `data/examBlueprint.js` dan — DiagnosticsEngine bilan AYNI manba (T-5)
        const blueprint = blueprintForTopics(validTopicIds);
        let finalQuestions = [];

        if (blueprint) {
          const targetY1 = cat === 'sport' ? 12 : 15;
          const targetY2 = cat === 'sport' ? 22 : 28;
          const targetY3 = cat === 'sport' ? 6 : 7;

          let remY1 = targetY1;
          let remY2 = targetY2;
          let remY3 = targetY3;

          const weakTopicIds = filteredTopics
            .filter(t => {
              const s = state.topicStats[t.id];
              return s && s.answered > 0 && (s.correct / s.answered) < 0.7;
            })
            .map(t => t.id);

          Object.keys(blueprint).forEach(topicStr => {
            const topicIdNum = parseInt(topicStr, 10);
            const countNeeded = blueprint[topicIdNum];
            if (countNeeded === 0) return;

            const topicQ = allQ.filter(q => q.topicId === topicIdNum);
            
            let y1Pool = shuffleArray(topicQ.filter(q => q.difficulty === 'Y1'));
            let y2Pool = shuffleArray(topicQ.filter(q => q.difficulty === 'Y2'));
            let y3Pool = shuffleArray(topicQ.filter(q => q.difficulty === 'Y3'));

            // Weak rejimida zaif mavzular xatolarini birinchi qo'yamiz
            if (examType === 'weak' && weakTopicIds.includes(topicIdNum)) {
              const mistakes = (state.stats?.[cat]?.mistakes) || [];
              const isMistake = (q) => mistakes.some(m => m.question === q.q);
              
              y1Pool = [...y1Pool.filter(isMistake), ...y1Pool.filter(q => !isMistake(q))];
              y2Pool = [...y2Pool.filter(isMistake), ...y2Pool.filter(q => !isMistake(q))];
              y3Pool = [...y3Pool.filter(isMistake), ...y3Pool.filter(q => !isMistake(q))];
            }

            for (let s = 0; s < countNeeded; s++) {
              let chosenPool = null;
              let chosenDiff = '';
              let bestScore = -1;

              if (y1Pool.length > 0 && remY1 > 0) {
                const score = remY1 / targetY1;
                if (score > bestScore) { bestScore = score; chosenPool = y1Pool; chosenDiff = 'Y1'; }
              }
              if (y2Pool.length > 0 && remY2 > 0) {
                const score = remY2 / targetY2;
                if (score > bestScore) { bestScore = score; chosenPool = y2Pool; chosenDiff = 'Y2'; }
              }
              if (y3Pool.length > 0 && remY3 > 0) {
                const score = remY3 / targetY3;
                if (score > bestScore) { bestScore = score; chosenPool = y3Pool; chosenDiff = 'Y3'; }
              }

              // Fallback
              if (!chosenPool) {
                if (y2Pool.length > 0) { chosenPool = y2Pool; chosenDiff = 'Y2'; }
                else if (y1Pool.length > 0) { chosenPool = y1Pool; chosenDiff = 'Y1'; }
                else if (y3Pool.length > 0) { chosenPool = y3Pool; chosenDiff = 'Y3'; }
              }

              if (chosenPool && chosenPool.length > 0) {
                const q = chosenPool.shift();
                finalQuestions.push(q);
                if (chosenDiff === 'Y1') remY1--;
                if (chosenDiff === 'Y2') remY2--;
                if (chosenDiff === 'Y3') remY3--;
              }
            }
          });
        } else {
          // Fallback — fan uchun blueprint yo'q: bloklarni bo'lim id'si bo'yicha ajratamiz
          const pedAll = allQ.filter(q => isPedBlockTopic(q.topicId));
          const otherAll = allQ.filter(q => !isPedBlockTopic(q.topicId));
          finalQuestions = [
            ...shuffleArray(otherAll).slice(0, CORE_BLOCK_TOTAL),
            ...shuffleArray(pedAll).slice(0, PED_BLOCK_TOTAL)
          ];
        }

        // ── BLOK TARTIBI + BACKFILL ────────────────────────────────────────
        // Rasmiy imtihonda avval 35 ta mutaxassislik savoli, so'ng 15 ta kasb
        // standarti + pedagogik mahorat savoli keladi. Shuning uchun savollar
        // BLOK ICHIDA aralashtiriladi, bloklar joyi esa hech qachon almashmaydi.
        //
        // Backfill ham blokka bog'liq: ilgari yetishmagan o'rinlar bazadagi
        // istalgan savol bilan to'ldirilardi va pedagogik blok 15 tadan chiqib
        // ketishi mumkin edi.
        const usedKeys = new Set(finalQuestions.map(q => q.id || q.q));
        const spare = shuffleArray(allQ.filter(q => !usedKeys.has(q.id || q.q)));
        const sparePed = spare.filter(q => isPedBlockTopic(q.topicId));
        const spareCore = spare.filter(q => !isPedBlockTopic(q.topicId));

        let pedQs = shuffleArray(finalQuestions.filter(q => isPedBlockTopic(q.topicId)));
        let coreQs = shuffleArray(finalQuestions.filter(q => !isPedBlockTopic(q.topicId)));

        if (pedQs.length > PED_BLOCK_TOTAL) {
          pedQs = pedQs.slice(0, PED_BLOCK_TOTAL);
        } else if (pedQs.length < PED_BLOCK_TOTAL) {
          pedQs = pedQs.concat(sparePed.slice(0, PED_BLOCK_TOTAL - pedQs.length));
        }

        // Odatda 35; pedagogik blokda savol yetmasa, qolgan o'rinlar
        // mutaxassislikka o'tadi — imtihon baribir 50 ta bo'lib qoladi
        const coreTarget = EXAM_TOTAL - pedQs.length;
        if (coreQs.length > coreTarget) {
          coreQs = coreQs.slice(0, coreTarget);
        } else if (coreQs.length < coreTarget) {
          coreQs = coreQs.concat(spareCore.slice(0, coreTarget - coreQs.length));
        }

        const final = [...coreQs, ...pedQs];
        setQuestions(final);

        // Guruhlarni qayta hisoblash
        const regrouped = [];
        filteredTopics.forEach((topic) => {
          const indices = final.map((q, i) => q.topicId === topic.id ? i : -1).filter(i => i >= 0);
          if (indices.length > 0) {
            regrouped.push({ name: topic.name, icon: topic.icon, indices });
          }
        });
        setTopicGroups(regrouped);
      } catch (err) {
        console.error("Exam load error:", err);
        showToast(t('exam.toastError'), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadExamQuestions();
  }, [cat, examStarted, examType]);

  // Taymer — FAQAT faol imtihon paytida ishlaydi.
  // Avval kirish oynasida, yuklanishda va natijadan "ko'rib chiqish"ga
  // o'tilganda ham hisoblab turardi (review'da vaqt tugasa imtihon ikkinchi
  // marta yakunlanib, ball ikki marta yozilardi).
  useEffect(() => {
    if (!examStarted || finished || reviewMode || loading || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinishRef.current?.(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [examStarted, finished, reviewMode, loading, questions.length]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const handleSelect = (optIdx) => {
    if (finished) return;
    setAnswers(prev => ({ ...prev, [currentQ]: optIdx }));
  };

  const handleFinish = (auto = false) => {
    if (!auto) {
      setShowConfirmModal(true);
      return;
    }
    // Ikki marta yakunlashdan himoya: taymer 0 ga yetishi bilan foydalanuvchi
    // "Yakunlash"ni bossa (yoki StrictMode updater ikki marta chaqirsa) —
    // natija faqat bir marta yoziladi
    if (committedRef.current) return;
    committedRef.current = true;

    accumulateTime();
    clearInterval(timerRef.current);
    clearSavedSession(); // imtihon yakunlandi — resume sessiyasi endi kerak emas
    setFinished(true);
    setEndTime(new Date());

    // Vaqt analitikasini hisoblash
    const times = questionTimesRef.current;
    let y1Time = 0, y1Count = 0;
    let y2Time = 0, y2Count = 0;
    let y3Time = 0, y3Count = 0;

    questions.forEach((qObj, idx) => {
      const t = times[idx] || 0;
      if (qObj.difficulty === 'Y1') { y1Time += t; y1Count++; }
      else if (qObj.difficulty === 'Y2') { y2Time += t; y2Count++; }
      else if (qObj.difficulty === 'Y3') { y3Time += t; y3Count++; }
    });

    setPacing({
      avgY1: y1Count > 0 ? Math.round(y1Time / y1Count) : 0,
      avgY2: y2Count > 0 ? Math.round(y2Time / y2Count) : 0,
      avgY3: y3Count > 0 ? Math.round(y3Time / y3Count) : 0,
      totalTime: Object.values(times).reduce((a, b) => a + b, 0)
    });

    // Tavsiyalarni hisoblash
    const topicPerformance = topicGroups.map(group => {
      const totalInTopic = group.indices.length;
      const correctInTopic = group.indices.filter(idx => answers[idx] === questions[idx].correct).length;
      const accuracy = totalInTopic > 0 ? (correctInTopic / totalInTopic) * 100 : 0;
      
      const firstQIndex = group.indices[0];
      const topicId = questions[firstQIndex]?.topicId;

      return {
        name: group.name,
        topicId: topicId,
        accuracy: accuracy,
        total: totalInTopic,
        correct: correctInTopic
      };
    });

    const weakTopics = topicPerformance
      .filter(t => t.accuracy < 80)
      .sort((a, b) => a.accuracy - b.accuracy);
    setWeakTopicsSorted(weakTopics);

    // 🧠 SMART ENGINE
    const results = summarizeTestResults(questions, answers, state.spacedCards || [], -1, questionTimesRef.current);
    results.topicId = -1;
    // Sessiya vaqti — savollarga sarflangan haqiqiy vaqt yig'indisi.
    // Wall-clock (Date.now - startTime) resume'dan keyin noto'g'ri bo'lardi
    // (ilovadan tashqarida o'tgan vaqtni ham qo'shib yuborardi).
    results.sessionTime = Object.values(questionTimesRef.current).reduce((a, b) => a + b, 0);
    const commitResult = batchCommitResults(results);
    setExamEarnedPoints(commitResult?.earnedPoints || 0);
    setExamGained(commitResult?.gained || []);

    const correct = results.correctCount;
    const pct = results.accuracy;
    AnalyticsEvents.examComplete(correct, questions.length);
    if (pct >= 60 && !prefersReducedMotion()) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }

    // Telegramga natija — ID token bilan (server uid'ni TOKEN'dan oladi, tanaga ishonmaydi)
    auth.currentUser?.getIdToken().then(token => {
      if (!token) return;
      fetch('/api/send-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          correct,
          wrong: questions.length - correct,
          total: questions.length,
          time: formatTime(Object.values(times).reduce((a, b) => a + b, 0)),
          mode: examType === 'weak' ? 'Zaif mavzular imtihoni' : 'Standart Attestatsiya Imtihoni',
          title: 'Barcha bo\'limlar'
        })
      }).catch(e => console.error(e));
    }).catch(() => {});
  };
  // Har renderda eng so'nggi handleFinish'ni ref'ga yozamiz — taymer avto-yakuni
  // (yuqoridagi interval) doim joriy `answers`/`questions` bilan ishlashi uchun.
  handleFinishRef.current = handleFinish;

  // ANTI-CHEAT OLIB TASHLANDI (2026-06-17):
  // Avval `visibilitychange` 3 marta sodir bo'lsa imtihon avtomatik
  // diskvalifikatsiya qilinardi. Mobil qurilmada bu hodisa bildirishnoma kelganda,
  // qo'ng'iroq tushganda, ekran qulflanganda yoki boshqa ilovaga o'tilganda ham
  // ishlaydi — natijada halol foydalanuvchi nohaq jazolanardi. IQRO rasmiy DTM
  // imtihoni emas, balki tayyorgarlik platformasi bo'lgani uchun bu cheklov
  // foydadan ko'ra ko'proq zarar keltirardi (Play Market past sharhlar manbai).

  const handleObjectionSubmit = (text) => {
    const q = questions[currentQ];
    addObjection(q.topicId, cat, q, text);
    setShowObjectionModal(false);
    showToast(t('exam.toastObjectionSent'), 'success');
  };

  // Navigator bo'limlari: 1–35 mutaxassislik, oxirgi 15 — kasb standarti va
  // pedagogik mahorat. Indekslar savol massividan skanerlab olinadi (tartibga
  // ishonmaymiz), shuning uchun eski, aralash tartibli resume-sessiyalar ham
  // to'g'ri guruhlanadi.
  const navSections = useMemo(() => {
    const core = [];
    const ped = [];
    questions.forEach((q, i) => {
      (isPedBlockTopic(q.topicId) ? ped : core).push(i);
    });
    const sections = [];
    if (core.length > 0) sections.push({ key: 'core', label: t('exam.sectionCore'), indices: core });
    if (ped.length > 0) sections.push({ key: 'ped', label: t('exam.sectionPed'), indices: ped });
    return sections;
  }, [questions, t]);

  const answeredCount = Object.keys(answers).length;
  const correctCount = finished ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const wrongCount = finished ? questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.correct).length : 0;
  const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const isUrgent = timeLeft <= 300; // 5 daqiqa
  const isWarning = timeLeft <= 600; // 10 daqiqa

  if (!examStarted) {
    const durationMin = Math.round(getExamDuration(cat) / 60);
    const subjName = SUBJECTS.find(s => s.id === cat)?.name || '';

    // Rejim kartalari — chiziqli professional ikonkalar (emoji emas):
    // auditoriya attestatsiyaga tayyorlanayotgan pedagoglar, muhit jiddiy bo'lishi kerak
    const modeCards = [
      { id: 'standard', Icon: ClipboardList, title: t('exam.standardTitle'), desc: t('exam.standardDesc') },
      { id: 'weak', Icon: Crosshair, title: t('exam.weakTitle'), desc: t('exam.weakDesc') }
    ];

    const chipStyle = {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: 'var(--bg3)', border: '1px solid var(--border)',
      fontSize: 'var(--fs-body-sm)', fontWeight: 600, color: 'var(--text2)'
    };
    const chipIconStyle = { color: 'var(--text3)', flexShrink: 0 };

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page" style={{ maxWidth: 600, margin: '0 auto', padding: '16px', display: 'flex', minHeight: '100%', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '28px 20px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', width: '100%' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'var(--blue-bg)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <GraduationCap size={28} style={{ color: 'var(--blue)' }} />
          </div>
          <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text)', marginBottom: 14, letterSpacing: '-0.5px' }}>{t('exam.simulatorTitle')}</h1>

          {/* Uzun matn o'rniga — bir qarashda o'qiladigan chiplar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 22 }}>
            <span style={chipStyle}><FileText size={14} style={chipIconStyle} /> {t('exam.chipQuestions', { n: EXAM_TOTAL })}</span>
            <span style={chipStyle}><Clock size={14} style={chipIconStyle} /> {t('exam.chipMinutes', { n: durationMin })}</span>
            {subjName && <span style={chipStyle}><BookOpen size={14} style={chipIconStyle} /> {subjName}</span>}
          </div>

          {/* Tugallanmagan imtihon — davom ettirish taklifi */}
          {savedSession && (
            <div style={{
              padding: '14px 16px', borderRadius: 14, marginBottom: 16, textAlign: 'left',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderLeft: '3px solid var(--amber)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <History size={20} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-h4)', fontWeight: 700, color: 'var(--text)' }}>{t('exam.resumeTitle')}</div>
                  <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text2)', marginTop: 2 }}>
                    {t('exam.resumeInfo', {
                      answered: Object.keys(savedSession.answers || {}).length,
                      total: savedSession.questions.length,
                      time: formatTime(savedSession.timeLeft)
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={resumeExam}
                style={{ width: '100%', padding: '12px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 10, fontSize: 'var(--fs-lg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {t('exam.resume')}
              </button>
            </div>
          )}

          {/* Rejim tanlash */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, textAlign: 'left' }}>
            {modeCards.map(m => {
              const active = examType === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setExamType(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 14px',
                    borderRadius: 14,
                    border: active ? '1.5px solid var(--blue)' : '1.5px solid var(--border)',
                    background: active ? 'var(--blue-bg)' : 'var(--bg2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'var(--blue)' : 'var(--bg3)',
                    border: active ? 'none' : '1px solid var(--border)',
                    transition: 'all 0.2s'
                  }}>
                    <m.Icon size={20} style={{ color: active ? '#fff' : 'var(--text3)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-h4)', fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{m.title}</div>
                    <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text3)', lineHeight: 1.4 }}>{m.desc}</div>
                  </div>
                  {/* Tanlov belgisi — radio o'rniga aniq ko'rinadigan doira */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: active ? 'none' : '1.5px solid var(--border2)',
                    background: active ? 'var(--blue)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    {active && <Check size={13} strokeWidth={3.5} style={{ color: '#fff' }} />}
                  </div>
                </div>
              );
            })}
          </div>

          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Yangi imtihon boshlansa, eski tugallanmagan sessiya bekor qilinadi
              clearSavedSession();
              setExamStarted(true);
              AnalyticsEvents.examStart();
            }}
            style={{ width: '100%', padding: '15px', background: 'var(--cta)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 'var(--fs-xl)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
          >
            {savedSession ? t('exam.startNew') : t('exam.start')}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Bepul limit tekshiruvi
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
          <button className="limit-btn-secondary" onClick={() => navigate('/')}>{t('test.backHomeArrow')}</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  if (loading) {
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

  if (questions.length === 0) return null;

  // ===== NATIJA SAHIFASI =====
  if (finished) {
    const r = 54, circ = 2 * Math.PI * r;
    const fillArc = (pct / 100) * circ;
    const scoreColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
        {/* Natija kartasi */}
        <div className="glass-panel exam-result-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 'var(--fs-4xl)', fontWeight: 800, marginBottom: 4 }}>
              {pct >= 70 ? t('exam.resultExcellent') : pct >= 50 ? t('exam.resultGood') : t('exam.resultKeep')}
            </div>
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)' }}>{t('exam.finished')}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
            {/* Donut grafik */}
            <div style={{ position: 'relative' }}>
              <svg width={130} height={130} viewBox="0 0 130 130">
                <circle cx={65} cy={65} r={r} fill="none" stroke="var(--bg3)" strokeWidth={12} />
                <circle cx={65} cy={65} r={r} fill="none" stroke={scoreColor} strokeWidth={12}
                  strokeDasharray={`${fillArc} ${circ}`} strokeLinecap="round"
                  transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
                  fontSize={22} fontWeight={800} fill="var(--text)">{pct}%</text>
                <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fill="var(--text3)">{t('exam.done')}</text>
              </svg>
            </div>

            {/* Statistika */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 'var(--fs-6xl)', fontWeight: 900, color: 'var(--green)' }}>{correctCount}</div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', fontWeight: 700 }}>{t('exam.statCorrect')}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 'var(--fs-6xl)', fontWeight: 900, color: 'var(--red)' }}>{wrongCount}</div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', fontWeight: 700 }}>{t('exam.statWrong')}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 'var(--fs-6xl)', fontWeight: 900, color: 'var(--text)' }}>{questions.length - answeredCount}</div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', fontWeight: 700 }}>{t('exam.statSkipped')}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 'var(--fs-6xl)', fontWeight: 900, color: 'var(--accent2)' }}>+{examEarnedPoints}</div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', fontWeight: 700 }}>{t('exam.statRating')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--fs-md)', color: 'var(--text2)' }}>
                <div>{t('exam.date')} <strong>{new Date(startTimeMs).toLocaleDateString()}</strong></div>
                <div>{t('exam.started')} <strong>{new Date(startTimeMs).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong></div>
                <div>{t('exam.ended')} <strong>{endTime?.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong></div>
              </div>
            </div>
          </div>

          {/* Sessiyada olingan darajalar + keyingi bosqich (akademik sokin) */}
          {(examGained.length > 0 || nextMs) && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '14px 16px', marginBottom: 16,
              textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10
            }}>
              {examGained.map(g => (
                <div
                  key={`${g.trackId}_${g.tier}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--accent2)' }}
                >
                  <BadgeCheck size={15} style={{ flexShrink: 0 }} />
                  {t('results.gainedTier', { track: t(`tracks.${g.trackId}.name`), tier: t(`tracks.tier${g.tier}`) })}
                </div>
              ))}
              {nextMs && <NextMilestoneLine milestone={nextMs} />}
            </div>
          )}

          {/* ⚡ PACING ANALYTICS CARD */}
          {pacing && (
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '16px 20px',
              marginTop: 16,
              marginBottom: 16,
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <Clock size={16} style={{ color: 'var(--blue)' }} />
                <strong style={{ fontSize: 'var(--fs-base)', color: 'var(--text)', fontWeight: 800 }}>{t('exam.pacingTitle')}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>{t('exam.easyY1')}</div>
                  <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)' }}>{t('exam.seconds', { n: pacing.avgY1 })}</div>
                </div>
                <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>{t('exam.midY2')}</div>
                  <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)' }}>{t('exam.seconds', { n: pacing.avgY2 })}</div>
                </div>
                <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>{t('exam.hardY3')}</div>
                  <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)' }}>{t('exam.seconds', { n: pacing.avgY3 })}</div>
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 10, lineHeight: 1.4 }}>
                {pacing.avgY3 > 60
                  ? t('exam.pacingSlow')
                  : t('exam.pacingGood')}
              </div>
            </div>
          )}

          {/* 💡 PERSONALIZED ADVICE CARD */}
          {weakTopicsSorted.length > 0 && (
            <div style={{
              background: 'var(--blue-bg)',
              border: '1.5px solid var(--blue)',
              borderRadius: 16,
              padding: '16px 20px',
              marginTop: 16,
              marginBottom: 16,
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--fs-2xl)' }}>💡</span>
                <strong style={{ fontSize: 'var(--fs-base)', color: 'var(--text)', fontWeight: 800 }}>{t('exam.adviceTitle')}</strong>
              </div>
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                {t('exam.adviceP1')} <strong>{weakTopicsSorted[0].name}</strong> {t('exam.adviceP2', { correct: weakTopicsSorted[0].correct, total: weakTopicsSorted[0].total })}
              </p>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => {
                  updateState({ topicId: weakTopicsSorted[0].topicId });
                  navigate('/test');
                }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 'var(--fs-md)', fontWeight: 700 }}
              >
                {t('exam.practiceTopic')}
              </button>
            </div>
          )}

          {/* Izoh */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28, fontSize: 'var(--fs-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--green-bg)', border: '2px solid var(--green)' }} />
              <span>{t('exam.legendCorrect')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--red-bg)', border: '2px dashed var(--red)' }} />
              <span>{t('exam.legendWrong')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg3)', border: '1.5px solid var(--border2)' }} />
              <span>{t('exam.legendSkipped')}</span>
            </div>
          </div>

          {/* Mavzular bo'yicha grid */}
          {topicGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>
                {group.icon} {group.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.indices.map((qi) => {
                  const q = questions[qi];
                  const ans = answers[qi];
                  const isCorrect = ans === q.correct;
                  const isWrong = ans !== undefined && !isCorrect;
                  return (
                    <button
                      key={qi}
                      onClick={() => {
                        setReviewMode(true);
                        setFinished(false);
                        setCurrentQ(qi);
                      }}
                      style={{
                        width: 40, height: 40, borderRadius: 10, border: isWrong ? '2px dashed var(--red)' : isCorrect ? '2px solid var(--green)' : '1.5px solid var(--border2)',
                        background: isCorrect ? 'var(--green-bg)' : isWrong ? 'var(--red-bg)' : 'var(--bg3)',
                        color: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--text3)',
                        fontWeight: 700, fontSize: 'var(--fs-base)', cursor: 'pointer'
                      }}
                    >
                      {qi + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setShowShareCard(true)}
          >
            <Share2 size={17} /> {t('exam.shareImage')}
          </button>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(0)}>
              {t('exam.retry')}
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/test')}>
              {t('results.toHome')}
            </button>
          </div>
        </div>

        <ResultShareCard
          open={showShareCard}
          onClose={() => setShowShareCard(false)}
          score={correctCount}
          total={questions.length}
          title={SUBJECTS.find(s => s.id === cat)?.name || t('exam.examWord')}
          mode="exam"
          userName={user?.displayName}
          showToast={showToast}
        />
      </motion.div>
    );
  }

  // ===== IMTIHON SAHIFASI =====
  const q = questions[currentQ];
  const answered = answers[currentQ];

  return (
    <div className="exam-layout">
      {/* TOP BAR */}
      <div className="exam-topbar glass-panel">
        <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>
          {t('exam.simHeader', { subject: SUBJECTS.find(s => s.id === cat)?.name || "CHQBT" })}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {reviewMode ? (
            <button
              className="btn btn-sm btn-primary"
              style={{ background: 'var(--blue)', color: 'white', border: 'none', fontWeight: 700 }}
              onClick={() => {
                setFinished(true);
                setReviewMode(false);
              }}
            >
              {t('exam.backToResults')}
            </button>
          ) : (
            <>
              <div className={`exam-timer ${isUrgent ? 'timer-danger' : isWarning ? 'timer-warning' : ''}`}>
                <Clock size={16} />
                <span>{t('exam.timeLeft')} <strong>{formatTime(timeLeft)}</strong></span>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red)', color: 'white', border: 'none' }}
                onClick={() => handleFinish(false)}
              >
                <Flag size={14} /> {t('exam.finish')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="exam-content">
        {/* SAVOL QISMI */}
        <div className="exam-question-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('test.questionNum', { current: currentQ + 1, total: questions.length })}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    className="objection-btn"
                    style={{ position: 'static', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 'var(--fs-md)', fontWeight: 600, border: '1px solid var(--border)' }}
                    onClick={() => setShowObjectionModal(true)}
                  >
                    <AlertCircle size={13} /> {t('test.objection')}
                  </button>
                  <button
                    onClick={() => setFlagged(prev => ({ ...prev, [currentQ]: !prev[currentQ] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: flagged[currentQ] ? 'var(--amber-bg)' : 'transparent',
                      border: flagged[currentQ] ? '1px solid var(--amber)' : '1px solid var(--border)',
                      color: flagged[currentQ] ? 'var(--amber)' : 'var(--text3)',
                      padding: '6px 12px', borderRadius: 8, fontSize: 'var(--fs-md)', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Flag size={13} fill={flagged[currentQ] ? 'var(--amber)' : 'none'} />
                    {flagged[currentQ] ? t('exam.flagged') : t('exam.flag')}
                  </button>
                </div>
              </div>

              {/* Mualliflik / Manba nishoni */}
              {(q.author || q.source) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 'var(--fs-2xs)',
                      fontWeight: 800,
                      color: 'var(--accent)',
                      background: 'var(--blue-bg)',
                      padding: '3px 9px',
                      borderRadius: 7,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      border: '1px solid rgba(14,151,224,0.25)',
                    }}
                  >
                    ✍️ {q.author ? `Muallif: ${q.author}` : `Manba: ${q.source}`}
                  </span>
                </div>
              )}

              {/* Savol rasmi yoki sxemasi */}
              <QuestionMedia question={q} />
              {/* Savol matni */}
              {q.isHtml ? (
                <SafeHtml html={q.q} style={{ fontSize: 'var(--fs-question)', fontWeight: 'var(--fw-regular)', lineHeight: 'var(--lh-snug)', marginBottom: 24, color: 'var(--text)' }} />
              ) : (
                <div style={{ fontSize: 'var(--fs-question)', fontWeight: 'var(--fw-medium)', lineHeight: 'var(--lh-snug)', marginBottom: 24, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                  {q.q}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.opts.map((opt, i) => {
                  const isSelected = answered === i;
                  const isCorrectOpt = q.correct === i;
                  const isWrongOpt = isSelected && !isCorrectOpt;
                  
                  let optBorder = isSelected ? '2px solid var(--blue)' : '1.5px solid var(--border)';
                  let optBg = isSelected ? 'var(--blue-bg)' : 'var(--bg2)';
                  let indicatorBg = isSelected ? 'var(--blue)' : 'var(--bg3)';
                  let indicatorColor = isSelected ? 'white' : 'var(--text3)';
                  
                  if (reviewMode) {
                    if (isCorrectOpt) {
                      optBorder = '2px solid var(--green)';
                      optBg = 'var(--green-bg)';
                      indicatorBg = 'var(--green)';
                      indicatorColor = 'white';
                    } else if (isWrongOpt) {
                      optBorder = '2px solid var(--red)';
                      optBg = 'var(--red-bg)';
                      indicatorBg = 'var(--red)';
                      indicatorColor = 'white';
                    } else {
                      optBorder = '1.5px solid var(--border)';
                      optBg = 'var(--bg2)';
                      indicatorBg = 'var(--bg3)';
                      indicatorColor = 'var(--text3)';
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !reviewMode && handleSelect(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 12, textAlign: 'left',
                        border: optBorder,
                        background: optBg,
                        cursor: reviewMode ? 'default' : 'pointer',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                        fontSize: 'var(--fs-option)', fontWeight: 'var(--fw-regular)', color: 'var(--text)',
                        lineHeight: 'var(--lh-snug)',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: indicatorBg,
                        color: indicatorColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 'var(--fs-base)'
                      }}>
                        {['A', 'B', 'C', 'D'][i]}
                      </div>
                      {opt.replace(/^[A-D]\)\s*/, '')}
                    </button>
                  );
                })}
              </div>

              {reviewMode && (
                <div style={{
                  marginTop: 24,
                  padding: 20,
                  borderRadius: 16,
                  background: 'var(--blue-bg)',
                  border: '1.5px solid var(--blue)',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 'var(--fs-2xl)' }}>📖</span>
                    <strong style={{ fontSize: 'var(--fs-base)', color: 'var(--text)', fontWeight: 800 }}>{t('exam.explanation')}</strong>
                  </div>
                  <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text2)', lineHeight: 1.6 }}>
                    {q.explanation ? (
                      q.explanation.startsWith('<') ? (
                        <SafeHtml html={q.explanation} />
                      ) : (
                        q.explanation
                      )
                    ) : (
                      t('exam.noExplanation')
                    )}
                  </div>

                  {q.source && (
                    <div className="q-source">{t('test.source', { source: q.source })}</div>
                  )}
                </div>
              )}

              {/* Navigatsiya */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button
                  className="btn btn-outline"
                  disabled={currentQ === 0}
                  onClick={() => handleQuestionSwitch(currentQ - 1)}
                >
                  <ChevronLeft size={18} /> {t('common.back')}
                </button>
                <button
                  className="btn btn-primary"
                  disabled={currentQ === questions.length - 1}
                  onClick={() => handleQuestionSwitch(currentQ + 1)}
                >
                  {t('test.next')} <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* O'NG PANEL — Savollar Navigator */}
        <div className="exam-navigator glass-panel">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('exam.questions')}
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--blue)' }}>
                {answeredCount} / {questions.length}
              </div>
            </div>

            {/* Rang izohlari */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 'var(--fs-xs)', color: 'var(--text2)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--blue)' }} />
                <span>{t('exam.legendAnswered')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--amber)' }} />
                <span>{t('exam.legendFlagged')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)' }} />
                <span>{t('exam.legendSkipped')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'transparent', border: '2px solid var(--text)' }} />
                <span>{t('exam.legendCurrent')}</span>
              </div>
            </div>

            {navSections.map((section) => (
              <div key={section.key} className="exam-q-section">
                <div className="exam-q-section-title">
                  <span>{section.label}</span>
                  <span className="exam-q-section-range">
                    {section.indices[0] + 1}–{section.indices[section.indices.length - 1] + 1}
                  </span>
                </div>
                <div className="exam-q-grid">
                  {section.indices.map((i) => {
                    const isCurrent = i === currentQ;
                    const isAns = answers[i] !== undefined;
                    const isFlagged = flagged[i];

                    let btnBg = 'var(--bg3)';
                    let btnColor = 'var(--text)';
                    let btnBorder = isCurrent ? '2px solid var(--text)' : '1px solid var(--border)';

                    if (isAns) {
                      btnBg = 'var(--blue)';
                      btnColor = 'white';
                      btnBorder = isCurrent ? '2px solid var(--text)' : 'none';
                    }
                    if (isFlagged) {
                      btnBg = 'var(--amber)';
                      btnColor = 'white';
                      btnBorder = isCurrent ? '2px solid var(--text)' : 'none';
                    }
                    if (isCurrent && !isAns && !isFlagged) {
                      btnBg = 'var(--bg2)';
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleQuestionSwitch(i)}
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 4,
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontWeight: 700, fontSize: 'var(--fs-2xs)', cursor: 'pointer',
                          transition: 'all 0.15s', padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative'
                        }}
                      >
                        {i + 1}
                        {isFlagged && (
                          <span style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: 'white'
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {reviewMode ? (
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: 'var(--blue)', borderColor: 'var(--blue)', fontWeight: 700 }}
              onClick={() => {
                setFinished(true);
                setReviewMode(false);
              }}
            >
              {t('exam.backToResults')}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: 'var(--red)', borderColor: 'var(--red)' }}
              onClick={() => setShowConfirmModal(true)}
            >
              <Flag size={16} /> {t('exam.finishCount', { answered: answeredCount, total: questions.length })}
            </button>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 24, maxWidth: 320, width: '90%', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--fs-10xl)', marginBottom: 12 }}>🚩</div>
            <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{t('exam.confirmTitle')}</h3>
            <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: 24 }}>{t('exam.confirmText')}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setShowConfirmModal(false)}>{t('exam.no')}</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} onClick={() => { setShowConfirmModal(false); handleFinish(true); }}>{t('exam.yesFinish')}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* E'TIROZ MODALI */}
      <ObjectionModal
        isOpen={showObjectionModal}
        onClose={() => setShowObjectionModal(false)}
        questionText={questions[currentQ]?.q}
        onSubmit={handleObjectionSubmit}
      />
    </div>
  );
};

export default ExamPage;
