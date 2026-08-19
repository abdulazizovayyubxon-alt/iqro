import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { useAdmin } from '../hooks/useAdmin';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertCircle, Share2, GraduationCap, FileText, BookOpen, ClipboardList, Crosshair, Check, BadgeCheck, CalendarDays, Lock } from 'lucide-react';
import { reconcileAchievements, nextMilestones } from '../data/tracks';
import NextMilestoneLine from '../components/achievements/NextMilestoneLine';
import { useMilestoneAction } from '../hooks/useMilestoneAction';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../utils/motion';
import ObjectionModal from '../components/shared/ObjectionModal';
import ResultShareCard from '../components/shared/ResultShareCard';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import PremiumModal from '../components/PremiumModal';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
import ExamTimer from '../components/test/ExamTimer';
import {
  deadlineFromSession, sessionHasTime, shouldFinalizeExpired,
} from '../utils/examClock';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { summarizeTestResults } from '../engine/SmartQuestionEngine';
import { examAtMs } from '../utils/examDate';
import { useStudyContract } from '../hooks/useStudyContract';
import { AnalyticsEvents } from '../services/analytics';
import localforage from 'localforage';
import { EXAM_SESSION_KEY, examPoolKey, examSessionKey } from '../config';
import { PED_BLOCK_TOTAL, isPedBlockTopic, EXAM_BLUEPRINT, hasBlueprint } from '../data/examBlueprint';
import { useExitGuard } from '../hooks/useExitGuard';
import { useModalBackButton } from '../components/profile/useModalBackButton';
import { fetchPartnerSets, fetchSetQuestions, qulfHolatini, PARTNER_SET_ERRORS } from '../services/partnerSets';

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
  const { isAdmin } = useAdmin();
  const { state, batchCommitResults, updateState } = useContext(AppContext);
  const { addObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const cat = state.activeCategory;
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;
  // «Zaif bo'lim» chegarasi foydalanuvchining O'Z maqsadidan olinadi (T-8):
  // 90% ni maqsad qilgan odam uchun 82% zaif, 60% ni maqsad qilgani uchun emas.
  const { targetScore } = useStudyContract();



  const [questions, setQuestions] = useState([]);
  const [topicGroups, setTopicGroups] = useState([]); // [{name, icon, start, end}]
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [pacing, setPacing] = useState(null);
  const [weakTopicsSorted, setWeakTopicsSorted] = useState([]);
  // Zaif bo'limlar ro'yxati 3 tadan uzun bo'lsa yig'ilgan holda ochiladi (T-8)
  const [showAllWeak, setShowAllWeak] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  // ⚠️ AUDIT 2026-08-17 — vaqt endi DEADLINE (epoch ms) bilan boshqariladi.
  // Avval har soniya kamayadigan `timeLeft` state'i turardi; u mobil fonda
  // muzlab qolar (aldash vektori + noto'g'ri simulyatsiya) va har soniyada
  // BUTUN sahifani qayta render qilardi. Sabab va yechim to'liq izohi:
  // `components/test/ExamTimer.jsx` fayl sarlavhasida.
  //
  // `null` = taymer to'xtagan (kirish oynasi, natija, ko'rib chiqish).
  const [deadlineMs, setDeadlineMs] = useState(null);
  const [finished, setFinished] = useState(false);
  const [startTimeMs, setStartTimeMs] = useState(Date.now());
  const [endTime, setEndTime] = useState(null);
  const [examEarnedPoints, setExamEarnedPoints] = useState(0); // haqiqiy yig'ilgan reyting balli
  const [examGained, setExamGained] = useState([]); // shu imtihonda olingan track darajalari (muhr-qator)
  const [examReward, setExamReward] = useState({ points: 0, freezes: 0 }); // daraja uchun ball/zaxira

  // Natija ekrani uchun keyingi bosqich — sof hisob; memo, chunki taymer
  // har soniya re-render qiladi (context state o'zgarmaguncha qayta hisoblanmaydi)
  const nextMs = useMemo(() => {
    const { live } = reconcileAchievements(state, state.achievements);
    return nextMilestones(state, live)[0] || null;
  }, [state]);
  // «Keyingi bosqich» qatori bosilganda yo'nalishga mos harakat ochiladi
  const startMilestone = useMilestoneAction();
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  // ⚠️ AUDIT 2026-08-19, T-14 BAND — «XATOLARIM» OQIMI.
  //
  //   Ko'rib chiqish — o'rganishning eng ko'p qiymat beradigan bosqichi — eng
  //   ko'p ishqalanishga ega bosqich edi: izoh faqat `reviewMode` da, BITTA
  //   SAVOLGA BITTA EKRAN tarzida ko'rinardi. 17 ta xatoni ko'rish uchun
  //   katakka bos → o'qi → orqaga → keyingi katakka bos… × 17.
  //   Amalda ko'pchilik 2–3 ta xatoni ko'rib tashlab ketardi.
  //
  //   `reviewQueue` — ko'rib chiqiladigan savollar indekslari. Bo'sh bo'lsa
  //   ko'rish erkin (eski xatti-harakat, katakka bosib kirilganda). To'lgan
  //   bo'lsa «Orqaga/Keyingi» AYNAN shu ro'yxat bo'ylab yuradi va yuqorida
  //   `4/17` hisoblagichi turadi.
  const [reviewQueue, setReviewQueue] = useState([]);
  const [showShareCard, setShowShareCard] = useState(false);
  
  const [examStarted, setExamStarted] = useState(false);
  const [examType, setExamType] = useState('standard');
  const [loading, setLoading] = useState(false);

  // ── Haftalik diagnostika (hamkor ustozning yopiq to'plamlari) ──
  // Ro'yxat faqat guruh a'zosiga yuklanadi; qulf holati `qulfHolatini` da
  // hisoblanadi (ketma-ketlik + ochilish sanasi).
  const [weeklySets, setWeeklySets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState(null);
  // Hamkor ustozning O'ZI odatda o'z kodini ham ishlatgan bo'ladi (shunda
  // `groupCode` to'ladi). Bo'lmasa ham `partnerCode` bilan urinib ko'ramiz —
  // ustoz guruhiga bergan to'plamni ko'ra olishi tabiiy.
  const groupCode = user?.groupCode || user?.partnerCode || null;

  useEffect(() => {
    if ((!groupCode && !isAdmin) || examStarted) return;
    let cancelled = false;
    (async () => {
      const res = await fetchPartnerSets(groupCode, cat, { isAdmin });
      if (cancelled) return;
      // Xato bo'lsa JIM o'tamiz: haftalik to'plam qo'shimcha imkoniyat, uning
      // yuklanmagani imtihon sahifasini ishdan chiqarmasligi kerak.
      setWeeklySets(res.ok ? res.sets : []);
    })();
    return () => { cancelled = true; };
  }, [groupCode, cat, examStarted, isAdmin]);

  // Qulf holati har renderda emas, ro'yxat yoki natijalar o'zgarganda hisoblanadi
  // `|| {}` memo ICHIDA: tashqarida bo'lsa har renderda yangi obyekt yasalib,
  // memo hech qachon keshdan foydalanmasdi.
  const weeklyList = useMemo(
    () => qulfHolatini(weeklySets, state.partnerSets || {}),
    [weeklySets, state.partnerSets],
  );

  // Tanlangan hafta — ochiq bo'lganlaridan birinchisi (foydalanuvchi o'zgartira oladi)
  const selectedSet = weeklyList.find(s => s.id === selectedSetId) || null;

  const handleWeeklyPick = (s) => {
    if (s.locked) {
      // Aynan siz so'ragan pastdan chiqadigan bildirishnoma
      showToast(s.lockMessage, 'error');
      return;
    }
    setSelectedSetId(s.id);
  };

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

  // Vaqt tugaganda avto-yakun eski (bo'sh answers'li) closure'ni ushlab qolmasligi
  // uchun ref orqali chaqiriladi. Ref har renderda yangilanadi — shuning uchun
  // avto-yakun HAR DOIM eng so'nggi javoblar bilan hisoblanadi.
  const handleFinishRef = useRef(null);

  const questionStartTimeRef = useRef(Date.now());
  const questionTimesRef = useRef({});
  // Shu imtihon uchun rejalashtirilgan davomiylik (soniya). Standart rejimda
  // fanga qarab, haftalik rejimda savol soniga mutanosib. Deadline shu qiymatdan
  // savollar TAYYOR bo'lgan lahzada hisoblanadi.
  const plannedDurationRef = useRef(getExamDuration(cat));
  const committedRef = useRef(false);   // natija ikki marta yozilishidan himoya
  const resumingRef = useRef(false);    // resume'da savollar qayta yuklanmasligi uchun
  const sessionCheckedRef = useRef(false);
  // Muddati o'tgan sessiya tiklandi — holat commit bo'lishi bilan yakunlanadi (X-4)
  const finalizeOnRestoreRef = useRef(false);

  // ── Sessiyani saqlash — IKKI KALITLI sxema (X-7) ────────────────────────
  //
  // Nega ajratilgan: to'liq izoh `config.js` da (`examPoolKey`). Qisqasi —
  // savollar massivi har javobda qayta yozilardi (~5 MB/imtihon), va bu
  // aynan `firebase.js` da hujjatlashtirilgan IndexedDB nosozliklarini
  // keltirib chiqargan qatlamga bosim edi.
  //
  // ── Hovuz: BIR MARTA, savollar tayyor bo'lganda ──
  // `poolStamp` — hovuzning kimligi. Progress yozuvi shu shtampni eslab
  // qoladi; hovuz almashsa (yangi imtihon, boshqa hafta) shtamp o'zgaradi va
  // eski progress yaroqsiz bo'ladi — javoblar boshqa savollarga yopishmaydi.
  const poolStampRef = useRef(null);
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || questions.length === 0 || finished) return;
    // Resume'da hovuz allaqachon diskda — qayta yozmaymiz.
    if (poolStampRef.current) return;
    const stamp = `${cat}:${examType}:${selectedSetId || '-'}:${Date.now()}`;
    poolStampRef.current = stamp;
    localforage.setItem(examPoolKey(uid), {
      stamp,
      // topicIcon/icon — React elementlari, IndexedDB ularni qabul qilmaydi
      // (DataCloneError, butun yozuv rad etiladi). Saqlashdan oldin olib
      // tashlaymiz, resume'da TOPICS'dan qayta biriktiriladi.
      questions: questions.map(({ topicIcon, ...q }) => q),
      topicGroups: topicGroups.map(({ icon, ...g }) => g),
    }).catch(err => console.error('Imtihon hovuzini saqlashda xato:', err));
  }, [user?.uid, questions, topicGroups, cat, examType, selectedSetId, finished]);

  // ── Progress: har javobda, ~3 KB ──
  const persistRef = useRef(null);
  persistRef.current = () => {
    const uid = user?.uid;
    if (!uid || !examStarted || finished || reviewMode || loading) return;
    if (questions.length === 0 || !poolStampRef.current) return;
    localforage.setItem(examSessionKey(uid), {
      uid,
      cat,
      examType,
      // Haftalik rejimda to'plam ID'si ham saqlanadi: usiz yarim qolgan
      // imtihon davom ettirilib yakunlanganda natija HECH QAYERGA yozilmasdi
      // va keyingi hafta ochilmay qolardi.
      selectedSetId,
      poolStamp: poolStampRef.current,
      // Savollar soni — Dashboard "Davom etish" kartasi uchun. Massivning
      // o'zi bu yerda YO'Q (yuqoridagi izoh), lekin kartaga faqat son kerak.
      total: questions.length,
      answers,
      flagged,
      currentQ,
      // ⚠️ `timeLeft` (qoldiq soniya) O'RNIGA `deadlineMs` saqlanadi.
      // Avvalgi sxemada qoldiq soniya yozilardi va u faqat javob bosilganda
      // yoki har 30 soniyada yangilanardi — ya'ni ilova yopilib qayta
      // ochilganda oxirgi yozuvdan keyin o'tgan BUTUN vaqt foydalanuvchiga
      // qaytarilardi (har uzilishda 30 soniyagacha sovg'a). Deadline esa
      // mutlaq nuqta: uzilish qancha davom etsa, o'shancha vaqt haqiqatan
      // yo'qoladi — xuddi haqiqiy imtihonda bo'lgani kabi.
      deadlineMs,
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
    const uid = user?.uid;
    if (!uid) return;   // hisob hali yuklanmagan — keyingi renderda qayta uriniladi
    sessionCheckedRef.current = true;

    (async () => {
      // ── Progress + hovuz ──
      // Progress yozuvida savollar YO'Q (X-7), ular hovuzdan olinadi.
      let s = await localforage.getItem(examSessionKey(uid));
      let pool = s ? await localforage.getItem(examPoolKey(uid)) : null;

      // ── Migratsiya: eski YAGONA kalit ──
      // Yangilanish aynan imtihon o'rtasida yetib kelsa, eski formatdagi
      // yozuv yo'qolmasligi kerak — ichida savollar ham bor.
      if (!s) {
        const legacy = await localforage.getItem(EXAM_SESSION_KEY);
        if (legacy && Array.isArray(legacy.questions) && legacy.questions.length > 0
            && legacy.uid && legacy.uid === uid) {
          const stamp = `legacy:${legacy.savedAt || 0}`;
          s = { ...legacy, total: legacy.questions.length, poolStamp: stamp };
          pool = { stamp, questions: legacy.questions, topicGroups: legacy.topicGroups || [] };
          // Yangi kalitlarga KO'CHIRAMIZ, aks holda keyingi javobdan so'ng
          // progress yangi kalitga yozilib, hovuz esa hech qayerda bo'lmasdi
          // va imtihon keyingi ochilishda yo'qolardi.
          await Promise.all([
            localforage.setItem(examPoolKey(uid), pool),
            localforage.setItem(examSessionKey(uid), s),
          ]).catch(() => {});
          localforage.removeItem(EXAM_SESSION_KEY).catch(() => {});
        }
      }

      // ⚠️ AUDIT 2026-08-06, T-21 BAND — avval shart `(!s.uid || s.uid === user?.uid)`
      // edi: `uid` YO'Q sessiya (masalan, `user` bir lahza null bo'lganda saqlangani)
      // ISTALGAN hisob tomonidan tiklanardi. Umumiy qurilmada bir o'qituvchi
      // boshqasining tugallanmagan imtihonini — javoblari bilan — ochib olardi.
      // Endi egalik QAT'IY: uid bo'lmasa yoki mos kelmasa, sessiya tiklanmaydi.
      // Egalik va yaxlitlik — VAQTDAN MUSTAQIL tekshiriladi.
      const owned = s && s.cat === cat && !!s.uid && s.uid === uid
        && pool && Array.isArray(pool.questions) && pool.questions.length > 0
        // Shtamp mos kelmasa progress boshqa hovuzniki — javoblar begona
        // savollarga yopishib qolmasligi uchun tiklamaymiz.
        && pool.stamp === s.poolStamp;
      if (!owned) return;

      // ⚠️ AUDIT 2026-08-17, X-4 BAND — avval shart oxirida `sessionHasTime(s)`
      // turardi va `else` shoxi YO'Q edi: muddati o'tgan sessiya jimgina
      // tashlanardi, ya'ni 45 ta javob izsiz yo'qolardi (to'liq izoh:
      // `utils/examClock.js` → `shouldFinalizeExpired`).
      // Endi uch yo'l bor: davom ettirish → yakunlash → o'chirish.
      const expired = !sessionHasTime(s);
      if (expired && !shouldFinalizeExpired(s)) {
        // Javobsiz yoki juda eski — saqlaydigan narsa yo'q, tozalaymiz.
        clearSavedSession();
        return;
      }

      // Saqlashda olib tashlangan ikonkalarni TOPICS'dan qayta biriktiramiz
      // (React elementlari IndexedDB'ga sig'maydi — yuqoridagi `persist` izohi).
      // ⚠️ Bu avval FAQAT o'lik `resumeExam()` da bor edi: avto-tiklash yo'lida
      // yo'qligi sababli sessiya tiklanganda bo'lim sarlavhalari ikonkasiz
      // qolardi (`group.icon` — pastdagi render).
      const catTopics = TOPICS.filter(tp =>
        Array.isArray(tp.category) ? tp.category.includes(s.cat) : tp.category === s.cat
      );
      setQuestions(pool.questions.map(q => {
        const topic = catTopics.find(tp => tp.id === q.topicId);
        return { ...q, topicIcon: topic ? topic.icon : null };
      }));
      setTopicGroups((pool.topicGroups || []).map(g => {
        const topic = catTopics.find(tp => tp.name === g.name);
        return { ...g, icon: topic ? topic.icon : null };
      }));
      setAnswers(s.answers || {});
      setFlagged(s.flagged || {});
      setCurrentQ(s.currentQ || 0);
      setDeadlineMs(deadlineFromSession(s));
      setExamType(s.examType || 'standard');
      setSelectedSetId(s.selectedSetId || null);
      setStartTimeMs(s.startTimeMs || Date.now());
      questionTimesRef.current = s.questionTimes || {};
      questionStartTimeRef.current = Date.now();
      committedRef.current = false;
      resumingRef.current = true;
      // Hovuz allaqachon diskda — yuqoridagi effekt uni qayta yozmasligi uchun.
      poolStampRef.current = s.poolStamp;
      // Yakunlash SHU YERDA chaqirilmaydi: `handleFinish` render paytidagi
      // `questions`/`answers` ustida ishlaydi, ular esa hali commit bo'lmagan.
      // Bayroq qo'yamiz, pastdagi effekt tiklanish TUGAGACH ishga tushiradi.
      finalizeOnRestoreRef.current = expired;
      setExamStarted(true);
    })().catch(e => console.error("Error restoring exam session:", e));
  }, [cat, user?.uid, examStarted]);

  // ── Muddati o'tgan sessiyani avto-yakunlash (X-4) ──
  // Tiklangan holat commit bo'lgandan KEYIN ishlaydi, shuning uchun
  // `handleFinish` to'g'ri javoblar ustida hisoblaydi.
  //
  // Eslatma: `ExamTimer` ham o'tib ketgan deadline'ni ko'rib `onExpire`
  // chaqiradi — ya'ni ikkita yo'l bor. Bu ATAYLAB: `committedRef` ikki marta
  // yozishdan himoya qiladi, va data-butunligi UI komponentining
  // render bo'lishiga bog'lanib qolmaydi.
  useEffect(() => {
    if (!finalizeOnRestoreRef.current) return;
    if (!examStarted || finished || questions.length === 0) return;
    finalizeOnRestoreRef.current = false;
    showToast(t('exam.toastAutoFinished'), 'info');
    handleFinishRef.current?.(true);
  }, [examStarted, finished, questions.length, showToast, t]);

  // Imtihon yakunlandi / tashlandi — ikkala kalit ham tozalanadi.
  // Hovuz ham o'chiriladi: aks holda ~80 KB yozuv hech kimga kerak bo'lmagan
  // holda IndexedDB'da yotib qolardi (TestPage.jsx dagi bilan bir xil qoida).
  const clearSavedSession = () => {
    const uid = user?.uid;
    poolStampRef.current = null;
    if (uid) {
      localforage.removeItem(examSessionKey(uid)).catch(() => {});
      localforage.removeItem(examPoolKey(uid)).catch(() => {});
    }
    localforage.removeItem(EXAM_SESSION_KEY).catch(() => {});
  };

  // ⚠️ AUDIT 2026-08-17, X-4 BAND — bu yerda `resumeExam()` va u bilan
  // bog'liq «Davom ettirish» kartochkasi turardi. Ikkalasi ham O'LIK KOD edi:
  // `setSavedSession` faqat `null` bilan chaqirilardi, ya'ni `savedSession`
  // hech qachon to'lmasdi va kartochka hech qachon ko'rinmasdi. Uning
  // vazifasini yuqoridagi avtomatik tiklash effekti bajaradi (kartochkasiz,
  // bir bosishsiz — foydalanuvchi to'g'ridan-to'g'ri imtihoniga qaytadi).
  //
  // Faqat bitta foydali qism bor edi — ikonkalarni TOPICS'dan qayta
  // biriktirish — u avto-tiklash yo'liga ko'chirildi.

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

  // Yangi savolga o'tilganda ko'rinish savol BOSHIGA qaytadi — TestPage'dagi
  // bilan bir xil xatti-harakat. Avval skroll joyida qolardi: uzun savolning
  // oxirida «Keyingi» bosilgach, keyingi savolning MATNI ekrandan yuqorida
  // qolib, foydalanuvchi to'g'ridan-to'g'ri variantlarga tushib qolardi va
  // har safar qo'lda tepaga surishi kerak edi.
  //
  // Skroll idishi ekran eniga qarab boshqacha (CSS bilan mos): ≤768px da
  // `.exam-content` yoki sahifaning o'zi, kengroq ekranda esa
  // `.exam-question-area`. Shuning uchun uchalasi ham nolga qaytariladi —
  // JS'da breakpoint'ni takrorlash CSS bilan ikkinchi haqiqat manbaini
  // yaratardi (bir joyi o'zgarsa, ikkinchisi jim qolib ketardi).
  useEffect(() => {
    if (!examStarted || finished) return;
    document.querySelector('.exam-question-area')?.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('.exam-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQ, examStarted, finished]);

  // Savollarni yuklash (Firestore dan)
  useEffect(() => {
    if (!examStarted) return;
    // Resume orqali kirilgan bo'lsa — savollar allaqachon tiklangan, qayta yuklamaymiz
    if (resumingRef.current) {
      resumingRef.current = false;
      return;
    }

    // Deadline SHU YERDA o'rnatilMAYDI — savollar hali yuklanmoqda. U pastdagi
    // alohida effektda, savollar TAYYOR bo'lgach qo'yiladi. Aks holda sekin
    // tarmoqda yuklashga ketgan 5–10 soniya imtihon vaqtidan yeyilardi
    // (eski sxemada taymer `loading` bayrog'i bilan to'xtatilardi, deadline
    // modelida esa "to'xtatish" tushunchasi yo'q — boshlanish nuqtasi aniq
    // bo'lishi shart).
    setDeadlineMs(null);
    // Standart/zaif rejim uchun davomiylik — fanga qarab. Haftalik rejim uni
    // savol soniga mutanosib ravishda qayta yozadi (`loadWeeklyQuestions`).
    plannedDurationRef.current = getExamDuration(cat);
    setFinished(false);
    setReviewMode(false); setReviewQueue([]);
    setAnswers({});
    setFlagged({});
    setPacing(null);
    setWeakTopicsSorted([]);
    setCurrentQ(0);
    setStartTimeMs(Date.now());
    committedRef.current = false;
    questionTimesRef.current = {};
    questionStartTimeRef.current = Date.now();

    // ── Haftalik diagnostika: savollar TAYYOR to'plamdan olinadi ──
    // Bu yerda blueprint (30-56-14 proporsiya), qiyinlik balansi va
    // aralashtirish QO'LLANMAYDI: ustoz to'plamni o'zi tuzgan, tartibi ham
    // uniki. Bizning ishimiz — uni o'zgartirmasdan ko'rsatish.
    const loadWeeklyQuestions = async () => {
      setLoading(true);
      const res = await fetchSetQuestions(selectedSetId);
      if (!res.ok) {
        showToast(PARTNER_SET_ERRORS[res.error] || t('exam.toastError'), 'error');
        setLoading(false);
        setExamStarted(false);
        return;
      }
      const list = res.questions.map((q, i) => ({
        ...q,
        difficulty: q.difficulty || 'Y2',
        topicName: selectedSet?.title || 'Haftalik diagnostika',
        topicIcon: null,
        // `topicId` ATAYIN -1: bu savollar hech qaysi mavzuga tegishli emas,
        // shuning uchun mavzu bo'yicha o'zlashtirish foizini buzmasligi kerak.
        topicId: -1,
        _weeklyIndex: i,
      }));
      setQuestions(list);
      setTopicGroups([{ name: selectedSet?.title || 'Haftalik diagnostika', icon: null, indices: list.map((_, i) => i) }]);
      // Vaqt savol soniga MUTANOSIB: standart imtihon 50 savolga mo'ljallangan,
      // 35 savollik to'plamga o'sha vaqtni bersak diagnostika ma'nosini yo'qotadi.
      // Deadline pastdagi effektda qo'yiladi (savollar tayyor bo'lgach), shuning
      // uchun bu yerda faqat KERAKLI DAVOMIYLIK yozib qo'yiladi.
      const perQuestion = getExamDuration(cat) / EXAM_TOTAL;
      plannedDurationRef.current = Math.round(perQuestion * list.length);
      setLoading(false);
    };

    if (examType === 'weekly') {
      if (!selectedSetId) { setExamStarted(false); return; }
      loadWeeklyQuestions();
      return;
    }

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
        // AUDIT 2026-08-17, X-6 BAND: server 429 qaytarsa Firestore zaxirasiga
        // TUSHMASLIK kerak. Zaxira fan boshiga ~2 900 o'qish — ya'ni limitni
        // chetlab o'tib, aynan himoya qilinayotgan resursni yeb qo'yardi.
        let throttled = false;

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
              if (res.status === 429) throttled = true;
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

          if ((!allQ || allQ.length === 0) && !paywalled && !throttled) {
            try {
              const { query, where, getDocs, collection } = await import('firebase/firestore');
              const qRef = collection(db, 'questions');
              const qQuery = query(qRef, where('category', '==', cat));
              const snap = await getDocs(qQuery);
              // Muomaladan olingan savol imtihonga ham tushmaydi
              // (TestPage.jsx dagi bilan bir xil sabab).
              allQ = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(q => q.status !== 'retired');
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

        // Limit — vaqtinchalik holat, obuna muammosi emas. «Server band»
        // matni shu holat uchun to'g'ri: foydalanuvchi keyinroq urinishi kerak.
        if (throttled) {
          setLoading(false);
          showToast(t('test.toastServerBusy'), 'error');
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
    // `selectedSetId` — haftalik rejimda qaysi to'plam yuklanishini belgilaydi.
    // Bog'liqlikka qo'shilmasa, hafta almashtirilib qayta boshlanganda eski
    // to'plam savollari qolib ketardi.
  }, [cat, examStarted, examType, selectedSetId]);

  // ── Deadline'ni o'rnatish — imtihon HAQIQATAN boshlangan lahzada ──
  // Shart eski taymer effektidagi bilan bir xil (kirish oynasi, yuklanish,
  // natija va "ko'rib chiqish" da vaqt ketmaydi), lekin bu yerda faqat
  // BOSHLANISH NUQTASI qo'yiladi. Har soniyalik sanash `ExamTimer` ichida —
  // shu sababli bu sahifa endi soniyada bir marta qayta render bo'lmaydi.
  //
  // `deadlineMs` allaqachon bor bo'lsa (resume yoki qayta render) — tegilmaydi,
  // aks holda har kichik o'zgarishda vaqt boshidan tiklanib ketardi.
  useEffect(() => {
    if (!examStarted || finished || reviewMode || loading || questions.length === 0) return;
    if (deadlineMs) return;
    setDeadlineMs(Date.now() + plannedDurationRef.current * 1000);
  }, [examStarted, finished, reviewMode, loading, questions.length, deadlineMs]);

  // Vaqt tugadi (ExamTimer wall-clock bo'yicha aniqlaydi) → avto-yakun.
  // `handleFinishRef` ishlatiladi: eng so'nggi javoblar bilan hisoblanishi uchun.
  const handleTimeExpired = () => { handleFinishRef.current?.(true); };

  // ── "Qayta urinish" — SPA ichida, sahifani qayta yuklamasdan ──
  // ⚠️ AUDIT 2026-08-17: avval `navigate(0)` edi, ya'ni to'liq
  // `location.reload()`. Ilova boshidan boot bo'lardi: splash, Firebase auth,
  // `getDoc(users/{uid})`, chunk'lar, statistika — sekin tarmoqda 3–6 soniya va
  // ortiqcha Firestore o'qishlari. SPA'da bunga ehtiyoj yo'q: holatni o'zimiz
  // tozalaymiz va kirish oynasiga qaytamiz.
  const restartExam = () => {
    clearSavedSession();
    committedRef.current = false;
    resumingRef.current = false;
    sessionCheckedRef.current = true;   // saqlangan sessiya qayta tiklanmasin
    setDeadlineMs(null);
    setFinished(false);
    setReviewMode(false); setReviewQueue([]);
    setAnswers({});
    setFlagged({});
    setCurrentQ(0);
    setPacing(null);
    setWeakTopicsSorted([]);
    setEndTime(null);
    setExamEarnedPoints(0);
    setExamGained([]);
    setExamReward({ points: 0, freezes: 0 });
    questionTimesRef.current = {};
    questionStartTimeRef.current = Date.now();
    // Kirish oynasiga qaytadi; "Boshlash" savollarni qayta yuklaydi.
    setExamStarted(false);
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
    // Taymerni to'xtatamiz: `null` deadline = ExamTimer sanashni to'xtatadi va
    // "ko'rib chiqish" rejimida vaqt ketmaydi (avval review'da vaqt tugab,
    // imtihon ikkinchi marta yakunlanib, ball ikki marta yozilardi).
    setDeadlineMs(null);
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

    // Tavsiyalarni hisoblash.
    //
    // ⚠️ AUDIT 2026-08-19, T-8 BAND — bu ro'yxat TO'LIQ hisoblanardi, lekin
    // ekranga faqat `weakTopicsSorted[0]` chiqardi: qolgan barcha zaif
    // bo'limlar hisoblanib TASHLAB YUBORILARDI. 50 savollik imtihon — eng boy
    // diagnostik hodisa, undan chiqadigan xulosa esa bitta bo'limga
    // qisqartirilardi. Endi ro'yxat butunlay ko'rsatiladi.
    const topicPerformance = topicGroups.map(group => {
      const totalInTopic = group.indices.length;
      const correctInTopic = group.indices.filter(idx => answers[idx] === questions[idx].correct).length;
      // Imtihonda tashlab ketilgan savol ham yo'qotilgan ball — shuning uchun
      // maxraj JAMI savollar (mashqdagidan farqli).
      const accuracy = totalInTopic > 0 ? (correctInTopic / totalInTopic) * 100 : 0;

      const firstQIndex = group.indices[0];
      const topicId = questions[firstQIndex]?.topicId;

      return {
        name: group.name,
        topicId: topicId,
        accuracy: Math.round(accuracy),
        total: totalInTopic,
        correct: correctInTopic,
        // 3 tadan kam savol tushgan bo'lim bo'yicha xulosa chiqarib bo'lmaydi:
        // bittasiga adashish 0% yoki 50% ko'rsatib, foydalanuvchini o'zi
        // biladigan bo'limga qaytarib yuborardi.
        enough: totalInTopic >= 3,
      };
    });

    // Chegara endi QATTIQ KODLANGAN 80 emas, foydalanuvchining O'Z maqsadi
    // (o'quv shartnomasidagi `targetScore`).
    const weakTopics = topicPerformance
      .filter(tp => tp.accuracy < targetScore)
      .sort((a, b) => {
        if (a.enough !== b.enough) return a.enough ? -1 : 1;
        return a.accuracy - b.accuracy;
      });
    setWeakTopicsSorted(weakTopics);

    // 🧠 SMART ENGINE
    // `examAtMs` — takrorlash oralig'ini imtihon sanasiga siqadi (T-5)
    const results = summarizeTestResults(
      questions, answers, state.spacedCards || [], -1, questionTimesRef.current,
      { examAtMs: examAtMs() }
    );
    results.topicId = -1;
    // Sessiya vaqti — savollarga sarflangan haqiqiy vaqt yig'indisi.
    // Wall-clock (Date.now - startTime) resume'dan keyin noto'g'ri bo'lardi
    // (ilovadan tashqarida o'tgan vaqtni ham qo'shib yuborardi).
    results.sessionTime = Object.values(questionTimesRef.current).reduce((a, b) => a + b, 0);
    const commitResult = batchCommitResults(results);
    setExamEarnedPoints(commitResult?.earnedPoints || 0);
    setExamGained(commitResult?.gained || []);
    setExamReward({ points: commitResult?.rewardPoints || 0, freezes: commitResult?.rewardFreezes || 0 });

    const correct = results.correctCount;
    const pct = results.accuracy;
    AnalyticsEvents.examComplete(correct, questions.length);

    // ── Haftalik diagnostika natijasi ──
    // BIRINCHI urinish yoziladi va keyin O'ZGARMAYDI: ustoz hisobotda guruhning
    // haqiqiy boshlang'ich darajasini ko'rishi kerak. Qayta ishlash mumkin
    // (mashq sifatida), lekin raqam qayta yozilsa diagnostika ma'nosini
    // yo'qotardi — hamma «to'g'irlab» 100% qilib qo'yardi.
    // Shu yozuv AYNI PAYTDA keyingi haftani ochadigan kalit ham (`qulfHolatini`).
    if (examType === 'weekly' && selectedSetId && !state.partnerSets?.[selectedSetId]) {
      updateState({
        partnerSets: {
          ...(state.partnerSets || {}),
          [selectedSetId]: {
            correct,
            answered: questions.length,
            doneAt: new Date().toISOString(),
          },
        },
      });
    }

    if (pct >= 60 && !prefersReducedMotion()) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }

    // ⚠️ AUDIT 2026-08-17, X-8 BAND — bu yerda `fetch('/api/send-result', ...)`
    // turardi, LEKIN `api/send-result.js` fayli mavjud emas. Bu AYNAN o'sha
    // T-14 bandi bo'lib, TestPage.jsx da 2026-08-06 da olib tashlangan —
    // ExamPage'ga qo'llanmay qolgan.
    // `fetch` 404 da reject QILMAYDI va javob o'qilmasdi, shuning uchun xato
    // hech qayerda ko'rinmasdi: «natijani Telegramga yuborish» hech qachon
    // ishlamagan, har imtihon yakunida esa bekorga so'rov ketardi — aynan eng
    // yomon lahzada (natija ekrani ochilayotganda, imtihon kuni hamma birdan).
    // Funksiya kerak bo'lsa — Vercel funksiya chegarasi sababli YANGI endpoint
    // emas, `notify-admin.js` ga `action=result` qo'shilishi kerak
    // (naqsh: `action=delete-request`).
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

  const handleObjectionSubmit = (text, reason) => {
    const q = questions[currentQ];
    addObjection(q.topicId, cat, q, text, reason);
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
  // Ko'rib chiqish oqimiga tushadigan savollar: xato VA qoldirilgan.
  // Imtihonda qoldirilgan savol ham yo'qotilgan ball — uni ko'rmasdan
  // o'tib ketish tayyorgarlikdagi eng katta bo'shliqni ko'rmaslik demak.
  const missedIndices = finished
    ? questions.reduce((acc, q, i) => (answers[i] !== q.correct ? [...acc, i] : acc), [])
    : [];
  // Joriy savolning oqimdagi o'rni (-1 = oqim faol emas)
  const queuePos = reviewMode && reviewQueue.length > 0 ? reviewQueue.indexOf(currentQ) : -1;
  const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  // `isUrgent`/`isWarning` endi bu yerda hisoblanmaydi — ular soniyaga bog'liq
  // bo'lgani uchun butun sahifani har soniya qayta render qilardi. Rang holati
  // `ExamTimer` ichida, o'z state'i bilan.

  if (!examStarted) {
    const durationMin = Math.round(getExamDuration(cat) / 60);
    const subjName = SUBJECTS.find(s => s.id === cat)?.name || '';
    // Savol boshiga vaqt byudjeti — foydalanuvchi «ulguramanmi?» hisobini
    // O'ZI qilishi shart emas, biz aytamiz (T-9).
    const perQuestionSec = Math.round(getExamDuration(cat) / EXAM_TOTAL);
    const perQMin = Math.floor(perQuestionSec / 60);
    const perQSec = perQuestionSec % 60;

    // Rejim kartalari — chiziqli professional ikonkalar (emoji emas):
    // auditoriya attestatsiyaga tayyorlanayotgan pedagoglar, muhit jiddiy bo'lishi kerak
    const modeCards = [
      { id: 'standard', Icon: ClipboardList, title: t('exam.standardTitle'), desc: t('exam.standardDesc') },
      { id: 'weak', Icon: Crosshair, title: t('exam.weakTitle'), desc: t('exam.weakDesc') }
    ];
    // Uchinchi karta FAQAT guruh a'zosiga va faqat to'plam mavjud bo'lsa
    // ko'rinadi — qolganlar bugungidek ikkita kartani ko'radi.
    if (weeklyList.length > 0) {
      modeCards.push({
        id: 'weekly',
        Icon: CalendarDays,
        title: t('exam.weeklyTitle'),
        desc: t('exam.weeklyDesc'),
      });
    }

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            <span style={chipStyle}><FileText size={14} style={chipIconStyle} /> {t('exam.chipQuestions', { n: EXAM_TOTAL })}</span>
            <span style={chipStyle}><Clock size={14} style={chipIconStyle} /> {t('exam.chipMinutes', { n: durationMin })}</span>
            {subjName && <span style={chipStyle}><BookOpen size={14} style={chipIconStyle} /> {subjName}</span>}
          </div>

          {/* ── IMTIHON SHARTNOMASI (T-9) ──────────────────────────────────
              ⚠️ AUDIT 2026-08-19 — bu ekran «afisha» edi: uchta chip va
              «Boshlash» tugmasi. Foydalanuvchi o'tish bo'sag'asini, ball
              hisoblash qoidasini, vaqt tugaganda nima bo'lishini va savolga
              qaytish mumkinligini BILMASDAN imtihonga kirardi.

              Oqibati: birinchi imtihonda kognitiv yuk savolga emas,
              interfeysni ochishga sarflanardi. Pedagog «ulguramanmi?» degan
              hisobni qila olmasdi — 90 daq / 50 savol = 1 daq 48 son degan
              raqam hech qayerda ko'rsatilmasdi. Bu — testdan oldingi eng
              katta stress manbai.

              Ustiga-ustak `exam.simulatorDesc` matni uz/ru/en uchtala
              tarjimada YOZILGAN, lekin hech qayerda render qilinmasdi. */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 18, textAlign: 'left',
          }}>
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>
              {t('exam.simulatorDesc')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                t('exam.rulePace', { min: perQMin, sec: perQSec }),
                t('exam.ruleNoMinus'),
                t('exam.ruleSkipped'),
                t('exam.ruleAutoFinish'),
                t('exam.ruleNavigate'),
                t('exam.ruleResume'),
              ].map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Check size={14} strokeWidth={3} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text2)', lineHeight: 1.45 }}>{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rejim tanlash */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, textAlign: 'left' }}>
            {modeCards.map(m => {
              const active = examType === m.id;
              return (
                <React.Fragment key={m.id}>
                <div
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

                {/* ── Haftalar ro'yxati — faqat shu karta tanlanganda ──
                    Qulflangan hafta ro'yxatdan YO'QOLMAYDI: ustoz «2-hafta
                    qani?» degan savolga tushmasligi uchun u ko'rinib turadi,
                    bosilganda esa sababi aytiladi. */}
                {m.id === 'weekly' && active && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0 6px 8px' }}>
                    {weeklyList.map(s => {
                      const picked = selectedSetId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleWeeklyPick(s)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 13px', borderRadius: 12,
                            border: picked ? '1.5px solid var(--blue)' : '1.5px solid var(--border)',
                            background: s.locked ? 'var(--bg3)' : picked ? 'var(--blue-bg)' : 'var(--bg2)',
                            cursor: 'pointer',
                            opacity: s.locked ? 0.7 : 1,
                          }}
                        >
                          {s.locked
                            ? <Lock size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                            : <CalendarDays size={15} style={{ color: picked ? 'var(--blue)' : 'var(--text3)', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text)' }}>
                              {s.title}
                              {/* Admin barcha hamkorlarning to'plamini ko'radi —
                                  qaysi biri kimniki ekani ko'rinib tursin */}
                              {isAdmin && s.partnerCode && (
                                <span style={{ marginLeft: 6, fontSize: 'var(--fs-body-sm)', fontWeight: 600, color: 'var(--text3)' }}>
                                  · {s.partnerCode}
                                </span>
                              )}
                            </div>
                            {(s.locked || s.result) && (
                              <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text3)', marginTop: 2 }}>
                                {s.locked
                                  ? s.lockMessage
                                  : t('exam.weeklyDone', { correct: s.result.correct, total: s.result.answered })}
                              </div>
                            )}
                          </div>
                          {picked && !s.locked && <Check size={15} strokeWidth={3} style={{ color: 'var(--blue)', flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>

          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Haftalik rejimda hafta tanlanmagan bo'lsa — imtihon boshlanmaydi.
              // Aks holda savolsiz bo'sh ekran ochilib qolardi.
              if (examType === 'weekly' && !selectedSet) {
                showToast(t('exam.weeklyPickFirst'), 'error');
                return;
              }
              // Yangi imtihon boshlansa, eski tugallanmagan sessiya bekor qilinadi
              clearSavedSession();
              setExamStarted(true);
              AnalyticsEvents.examStart();
            }}
            style={{ width: '100%', padding: '15px', background: 'var(--cta)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 'var(--fs-xl)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
          >
            {t('exam.start')}
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
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} source="exam-limit" />
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
              {(examReward.points > 0 || examReward.freezes > 0) && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 600 }}>
                  {examReward.freezes > 0
                    ? t('results.rewardBoth', { points: examReward.points, count: examReward.freezes })
                    : t('results.rewardPoints', { points: examReward.points })}
                </div>
              )}
              {nextMs && <NextMilestoneLine milestone={nextMs} onClick={() => startMilestone(nextMs)} />}
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

          {/* ── XATOLARNI KO'RIB CHIQISH OQIMI (T-14) ──
              Natija ekranidagi eng muhim harakat: bitta teginish bilan
              faqat xato/qoldirilgan savollar, izohi ochiq holda, ketma-ket
              ochiladi. Ilgari buni faqat 17 marta katakka bosib qilish
              mumkin edi. */}
          {missedIndices.length > 0 && (
            <button
              onClick={() => {
                setReviewQueue(missedIndices);
                setReviewMode(true);
                setFinished(false);
                setCurrentQ(missedIndices[0]);
              }}
              style={{
                width: '100%', marginTop: 16, padding: '14px',
                background: 'var(--cta)', color: '#fff', border: 'none',
                borderRadius: 16, fontWeight: 700, fontSize: 'var(--fs-lg)',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)',
              }}
            >
              <BookOpen size={17} /> {t('exam.reviewMissed', { count: missedIndices.length })}
            </button>
          )}

          {/* 💡 ZAIF BO'LIMLAR — TO'LIQ RO'YXAT (T-8) */}
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
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                {t('exam.adviceP1')} <strong>{weakTopicsSorted[0].name}</strong> {t('exam.adviceP2', { correct: weakTopicsSorted[0].correct, total: weakTopicsSorted[0].total })}
              </p>

              {/* Har bo'lim uchun kasr + foiz + yo'qotilgan ball.
                  «Bu bo'lim sizga N ball turadi» foizdan kuchliroq motivator:
                  u imtihon natijasi tilida gapiradi. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {(showAllWeak ? weakTopicsSorted : weakTopicsSorted.slice(0, 3)).map(w => {
                  const lost = w.total - w.correct;
                  const color = !w.enough ? 'var(--text3)'
                    : w.accuracy >= 60 ? 'var(--amber)'
                    : 'var(--red)';
                  return (
                    <div key={w.topicId ?? w.name}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.name}
                        </span>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                          {w.correct}/{w.total}
                        </span>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color, minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {w.enough ? `${w.accuracy}%` : '—'}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${w.accuracy}%`, background: color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 4 }}>
                        {w.enough
                          ? t('exam.weakLoss', { count: lost })
                          : t('results.notEnoughData')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {weakTopicsSorted.length > 3 && !showAllWeak && (
                <button
                  onClick={() => setShowAllWeak(true)}
                  style={{ background: 'none', border: 'none', padding: '0 0 12px', color: 'var(--accent2)', fontSize: 'var(--fs-md)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {t('exam.weakShowAll', { count: weakTopicsSorted.length - 3 })}
                </button>
              )}

              <div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    // `topicSubset: null` — oldingi aralash mashqning filtri qolmasin
                    updateState({ topicId: weakTopicsSorted[0].topicId, testMode: 'exam', topicSubset: null });
                    navigate('/test');
                  }}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 'var(--fs-md)', fontWeight: 700 }}
                >
                  {t('exam.practiceTopic')}
                </button>
              </div>
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

          {/* Mavzular bo'yicha grid.
              ⚠️ T-8: sarlavhada endi kasr va foiz bor. Ilgari faqat rangli
              kataklar edi — foydalanuvchi qaysi bo'limda qanchalik oqsaganini
              bilish uchun KATAKLARNI SANASHI kerak edi. */}
          {topicGroups.map((group, gi) => {
            const gCorrect = group.indices.filter(idx => answers[idx] === questions[idx]?.correct).length;
            const gTotal = group.indices.length;
            const gPct = gTotal > 0 ? Math.round((gCorrect / gTotal) * 100) : 0;
            const gColor = gPct >= targetScore ? 'var(--green)' : gPct >= 50 ? 'var(--amber)' : 'var(--red)';
            return (
            <div key={gi} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)' }}>
                  {group.icon} {group.name}
                </span>
                <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                  {gCorrect}/{gTotal}
                </span>
                <span style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: gColor, minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {gPct}%
                </span>
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
            );
          })}

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setShowShareCard(true)}
          >
            <Share2 size={17} /> {t('exam.shareImage')}
          </button>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={restartExam}>
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
                setReviewMode(false); setReviewQueue([]);
              }}
            >
              {t('exam.backToResults')}
            </button>
          ) : (
            <>
              <ExamTimer deadlineMs={deadlineMs} totalMs={getExamDuration(cat) * 1000} answered={answeredCount} total={questions.length} onExpire={handleTimeExpired} />
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

              {/* Navigatsiya.
                  Xatolar oqimida (`reviewQueue`) tugmalar butun imtihon bo'ylab
                  emas, FAQAT xatolar bo'ylab yuradi — T-14.
                  Oddiy oqimdagi qator (`exam-inline-nav`) mobilda CSS orqali
                  yashiriladi: u yerda ayni vazifani pastdagi qotirilgan panel
                  bajaradi, ikkalasi birga esa bitta ekranda ikkita «Keyingi»
                  bo'lib chiqadi. Desktopda qator o'z joyida qoladi. */}
              {queuePos >= 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 24 }}>
                  <button
                    className="btn btn-outline"
                    disabled={queuePos === 0}
                    onClick={() => handleQuestionSwitch(reviewQueue[queuePos - 1])}
                  >
                    <ChevronLeft size={18} /> {t('common.back')}
                  </button>
                  <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                    {queuePos + 1} / {reviewQueue.length}
                  </span>
                  {queuePos === reviewQueue.length - 1 ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => { setReviewMode(false); setReviewQueue([]); setFinished(true); }}
                    >
                      {t('exam.backToResults')}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleQuestionSwitch(reviewQueue[queuePos + 1])}
                    >
                      {t('exam.nextMistake')} <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="exam-inline-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
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
              )}
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
                setReviewMode(false); setReviewQueue([]);
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

      {/* ── Mobil pastki panel (bosh barmoq zonasi) ──
          Faqat ≤900px da ko'rinadi (CSS `.exam-mobile-bar`), shuning uchun
          JS breakpoint'i takrorlanmaydi — ikkisi bir-biridan ayrilib
          ketmasligi uchun yagona manba CSS'da qoldi.
          Ko'rib chiqish rejimida ko'rsatilmaydi: u yerda navigatsiya
          natijalar ekrani orqali boradi. */}
      {!reviewMode && (
        <div className="exam-mobile-bar">
          <button
            className="emb-side"
            onClick={() => handleQuestionSwitch(currentQ - 1)}
            disabled={currentQ === 0}
            aria-label={t('common.back')}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="emb-counter"
            onClick={() => document.querySelector('.exam-navigator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label={t('exam.questions')}
          >
            {currentQ + 1} / {questions.length} · {answeredCount} ✓
          </button>
          <button
            className="emb-next"
            onClick={() => handleQuestionSwitch(currentQ + 1)}
            disabled={currentQ === questions.length - 1}
          >
            {t('test.next')} <ChevronRight size={18} />
          </button>
        </div>
      )}

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
