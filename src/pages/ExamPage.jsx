import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import ObjectionModal from '../components/shared/ObjectionModal';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import PremiumModal from '../components/PremiumModal';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { summarizeTestResults } from '../engine/SmartQuestionEngine';
import localforage from 'localforage';

const EXAM_TOTAL = 50;

const SUBJECT_BLUEPRINTS = {
  chqbt: { 0: 8, 1: 8, 2: 7, 3: 4, 4: 4, 5: 4, 6: 15 },
  art: { 7: 10, 8: 3, 9: 4, 10: 3, 11: 7, 12: 4, 13: 4, 14: 15 },
  tarix: { 15: 5, 16: 4, 17: 3, 18: 6, 19: 5, 20: 7, 21: 5, 22: 15 },
  sport: { 23: 2, 24: 3, 25: 5, 26: 6, 27: 1, 28: 2, 29: 26, 30: 5 },
  boshlangich: { 31: 4, 32: 3, 33: 9, 34: 5, 35: 4, 36: 5, 37: 5, 38: 15 },
  info: { 39: 3, 40: 7, 41: 5, 42: 3, 43: 3, 44: 5, 45: 4, 46: 20 },
  mtt: { 47: 5, 48: 5, 49: 5, 50: 5, 51: 5, 52: 5, 53: 5, 54: 15 },
  til: { 55: 5, 56: 8, 57: 7, 58: 5, 59: 8, 60: 2, 61: 0, 62: 15 },
  mtt_rahbar: { 63: 5, 64: 5, 65: 5, 66: 5, 67: 5, 68: 5, 69: 5, 70: 15 }
};

const getExamDuration = (category) => {
  switch (category) {
    case 'boshlangich':
    case 'info':
      return 120 * 60;
    case 'til':
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
  const [startTime] = useState(new Date());
  const [endTime, setEndTime] = useState(null);
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  
  const [examStarted, setExamStarted] = useState(false);
  const [examType, setExamType] = useState('standard');
  const [loading, setLoading] = useState(false);
  
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [cheatDisqualified, setCheatDisqualified] = useState(false);
  const timerRef = useRef(null);

  const questionStartTimeRef = useRef(Date.now());
  const questionTimesRef = useRef({});

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

    setTimeLeft(getExamDuration(cat));
    setFinished(false);
    setReviewMode(false);
    setAnswers({});
    setFlagged({});
    setPacing(null);
    setWeakTopicsSorted([]);
    setCurrentQ(0);
    setCheatWarnings(0);
    setCheatDisqualified(false);
    questionTimesRef.current = {};
    questionStartTimeRef.current = Date.now();

    const loadExamQuestions = async () => {
      setLoading(true);
      try {
        // 🔥 AQLLI KESHLASH (JSON BUNDLING) 🔥
        const versionDocRef = doc(db, 'settings', 'version');
        const versionSnap = await getDoc(versionDocRef);
        
        let remoteVersion = 0;
        let storageUrls = {};
        if (versionSnap.exists()) {
          const vData = versionSnap.data();
          remoteVersion = vData.dbVersion || 0;
          storageUrls = vData.urls || {};
        }

        const cacheKey = `bundle_${cat}`;
        const versionKey = `version_${cat}`;
        
        const localCategoryVersion = await localforage.getItem(versionKey);
        let allQ = await localforage.getItem(cacheKey);

        if (!allQ || localCategoryVersion !== remoteVersion) {
          const downloadUrl = storageUrls[cat];
          if (downloadUrl) {
            try {
              const res = await fetch(downloadUrl);
              allQ = await res.json();
              await localforage.setItem(cacheKey, allQ);
              await localforage.setItem(versionKey, remoteVersion);
            } catch (err) {
              console.error("Bundle yuklashda xatolik:", err);
              allQ = [];
            }
          } else {
            // Fallback to getDocs
            try {
              const { query, where, getDocs, collection } = await import('firebase/firestore');
              const qRef = collection(db, 'questions');
              const qQuery = query(qRef, where('category', '==', cat));
              const snap = await getDocs(qQuery);
              allQ = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              await localforage.setItem(cacheKey, allQ);
              await localforage.setItem(versionKey, remoteVersion);
            } catch (fallbackErr) {
              console.error("Fallback yuklashda xatolik:", fallbackErr);
              allQ = [];
            }
          }
        }

        allQ = allQ.filter(q => q.category === cat);
        allQ = processQuestionsOnTheFly(allQ);

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
        const blueprint = SUBJECT_BLUEPRINTS[cat];
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
          // Fallback
          const pedTopic = filteredTopics.find(t => t.name === "Pedagogik mahorat");
          const pedTopicId = pedTopic ? pedTopic.id : (cat === 'art' ? 14 : 6);
          const pedAll = allQ.filter(q => q.topicId === pedTopicId);
          const otherAll = allQ.filter(q => q.topicId !== pedTopicId);
          const pedCount = Math.min(pedAll.length, 10);
          const pedSelected = shuffleArray(pedAll).slice(0, pedCount);
          const otherCount = EXAM_TOTAL - pedSelected.length;
          const otherSelected = shuffleArray(otherAll).slice(0, otherCount);
          finalQuestions = [...pedSelected, ...otherSelected];
        }

        const final = shuffleArray(finalQuestions);
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
        showToast("Xatolik yuz berdi", 'error');
      } finally {
        setLoading(false);
      }
    };

    loadExamQuestions();
  }, [cat, examStarted, examType]);

  // Taymer
  useEffect(() => {
    if (finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinish(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finished]);

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
    accumulateTime();
    clearInterval(timerRef.current);
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
    const results = summarizeTestResults(questions, answers, state.spacedCards || [], -1);
    results.topicId = -1;
    results.sessionTime = Math.round((Date.now() - startTime) / 1000); // optional if startTime is available
    batchCommitResults(results);

    const correct = results.correctCount;
    const pct = results.accuracy;
    if (pct >= 60) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }

    // Send result to Telegram
    fetch('/api/send-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user?.uid,
        correct,
        wrong: questions.length - correct,
        total: questions.length,
        time: formatTime(Object.values(times).reduce((a, b) => a + b, 0)),
        mode: 'Standart Attestatsiya Imtihoni',
        title: 'Barcha bo\'limlar'
      })
    }).catch(e => console.error(e));
  };

  // Anti-Cheat: Tab switch detection (Play Market safe)
  useEffect(() => {
    if (loading || finished || questions.length === 0 || cheatDisqualified) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            setCheatDisqualified(true);
            showToast("Boshqa sahifaga o'tish qoidalari 3 marta buzilganligi sababli imtihon yakunlandi!", 'error');
            handleFinish(true);
          } else {
            showToast(`Diqqat! Imtihondan chalg'imang. Ogohlantirish: ${next}/3`, 'warning');
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, finished, questions.length, answers, cheatDisqualified]);

  const handleObjectionSubmit = (text) => {
    const q = questions[currentQ];
    addObjection(q.topicId, cat, q, text);
    setShowObjectionModal(false);
    showToast("E'tiroz yuborildi!", 'success');
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = finished ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const wrongCount = finished ? questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.correct).length : 0;
  const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const isUrgent = timeLeft <= 300; // 5 daqiqa
  const isWarning = timeLeft <= 600; // 10 daqiqa

  if (!examStarted) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page" style={{ maxWidth: 600, margin: '40px auto', padding: '20px 16px' }}>
        <div className="glass-panel" style={{ padding: '36px 24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏆</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.5px' }}>Imtihon Simulyatori</h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28, fontWeight: 500 }}>
            Attestatsiya malaka sinovi standartlariga mos ravishda 50 ta savoldan iborat real imtihon simulyatsiyasi.
          </p>

          {/* Exam Type Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' }}>
            {/* Standard option */}
            <div 
              onClick={() => setExamType('standard')}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                border: '2px solid',
                borderColor: examType === 'standard' ? 'var(--blue)' : 'var(--border)',
                background: examType === 'standard' ? 'var(--blue-bg)' : 'var(--bg2)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 15, color: 'var(--text)' }}>📋 Standart Attestatsiya Imtihoni</strong>
                <input type="radio" checked={examType === 'standard'} readOnly />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                Haqiqiy malaka sinovi formati. Barcha bo'limlardan aralash savollar va 10 ta pedagogik mahorat savollari.
              </div>
            </div>

            {/* Weak option */}
            <div 
              onClick={() => setExamType('weak')}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                border: '2px solid',
                borderColor: examType === 'weak' ? 'var(--blue)' : 'var(--border)',
                background: examType === 'weak' ? 'var(--blue-bg)' : 'var(--bg2)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 15, color: 'var(--text)' }}>🔥 Zaif mavzular bo'yicha moslashtirilgan</strong>
                <input type="radio" checked={examType === 'weak'} readOnly />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                Platformadagi shaxsiy statistikangizga asoslangan imtihon. Siz eng ko'p xato qilgan yoki aniqligi past mavzularga ko'proq urg'u beradi.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button 
              whileHover={{ scale: 1.01, y: -1 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={() => { setExamStarted(true); }}
              style={{ padding: '16px', background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)' }}
            >
              Imtihonni boshlash
            </motion.button>
            <button className="btn btn-outline" style={{ padding: '14px', borderRadius: 16 }} onClick={goBack}>
              Bosh sahifaga qaytish
            </button>
          </div>
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
          <div className="limit-title">Kunlik Bepul Limit Tugadi</div>
          <div className="limit-text">
            Siz bugungi 50 ta bepul savol limitiga yetdingiz! Barcha savollar va mavzularga cheksiz kirish uchun Premium rejimni faollashtiring.
          </div>
          <button className="limit-btn-primary" onClick={() => setShowPremiumModal(true)}>
            ⭐ Premium Rejimni Faollashtirish
          </button>
          <button className="limit-btn-secondary" onClick={() => navigate('/')}>← Bosh sahifaga</button>
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
          {cheatDisqualified && (
            <div style={{
              background: 'var(--red-bg)',
              border: '1px solid var(--red)',
              borderRadius: 14,
              padding: '12px 16px',
              color: 'var(--red)',
              fontSize: 13,
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 20
            }}>
              ⚠️ Imtihon boshqa sahifaga o'tish qoidalari buzilganligi sababli (3 marta chalg'ish) avtomatik yakunlandi!
            </div>
          )}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              {cheatDisqualified ? '❌ Imtihondan chetlashtirildingiz' : (pct >= 70 ? '🎉 Tabriklaymiz!' : pct >= 50 ? '📊 Yaxshi harakat!' : '💪 Davom eting!')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{cheatDisqualified ? 'Qoidabuzarlik aniqlandi' : 'Imtihon yakunlandi'}</div>
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
                  fontSize={11} fill="var(--text3)">Bajarildi</text>
              </svg>
            </div>

            {/* Statistika */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>{correctCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>TO'G'RI</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)' }}>{wrongCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>XATO</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>{questions.length - answeredCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>QOLDIRILDI</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
                <div>📅 Sanasi: <strong>{startTime.toLocaleDateString()}</strong></div>
                <div>▶ Boshlandi: <strong>{startTime.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong></div>
                <div>⏹ Yakunlandi: <strong>{endTime?.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong></div>
              </div>
            </div>
          </div>

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
                <strong style={{ fontSize: 14, color: 'var(--text)', fontWeight: 800 }}>Vaqt va Tezlik Tahlili</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>Oson (Y1)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{pacing.avgY1} soniya</div>
                </div>
                <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>Oʻrta (Y2)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{pacing.avgY2} soniya</div>
                </div>
                <div style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>Qiyin (Y3)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{pacing.avgY3} soniya</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10, lineHeight: 1.4 }}>
                {pacing.avgY3 > 60 
                  ? "💡 Maslahat: Murakkab (Y3) keys savollariga koʻp vaqt (60 soniyadan ortiq) yoʻqotyapsiz. Haqiqiy imtihonda ulgurish uchun tezroq fikrlashga harakat qiling." 
                  : "⚡ Barakalla! Vaqtni har bir qiyinchilik darajasida juda toʻgʻri taqsimladingiz."}
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
                <span style={{ fontSize: 18 }}>💡</span>
                <strong style={{ fontSize: 14, color: 'var(--text)', fontWeight: 800 }}>Siz uchun Shaxsiy Tavsiya</strong>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                Imtihon natijalariga koʻra, sizda <strong>{weakTopicsSorted[0].name}</strong> boʻlimidan bilim koʻrsatkichi pastroq boʻldi ({weakTopicsSorted[0].correct} ta to'g'ri, {weakTopicsSorted[0].total} ta savoldan). Ushbu boʻlimdagi boʻshliqlarni toʻldirish uchun mavzuli testlarni bajarishni tavsiya qilamiz.
              </p>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => {
                  updateState({ topicId: weakTopicsSorted[0].topicId });
                  navigate('/test');
                }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}
              >
                🎯 Mavzuni Qayta Mashq Qilish
              </button>
            </div>
          )}

          {/* Izoh */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--green-bg)', border: '2px solid var(--green)' }} />
              <span>To'g'ri javoblar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--red-bg)', border: '2px dashed var(--red)' }} />
              <span>Noto'g'ri javoblar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg3)', border: '1.5px solid var(--border2)' }} />
              <span>Qoldirilgan</span>
            </div>
          </div>

          {/* Mavzular bo'yicha grid */}
          {topicGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>
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
                        fontWeight: 700, fontSize: 14, cursor: 'pointer'
                      }}
                    >
                      {qi + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(0)}>
              Qaytadan urinish
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/test')}>
              Bosh sahifaga
            </button>
          </div>
        </div>
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
        <button className="btn btn-sm btn-outline" onClick={goBack} style={{ padding: '6px 12px' }}>
          <ChevronLeft size={16} /> Chiqish
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          {SUBJECTS.find(s => s.id === cat)?.name || "CHQBT"} — Imtihon Simulyatsiyasi
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
              📊 Natijaga Qaytish
            </button>
          ) : (
            <>
              {cheatWarnings > 0 && (
                <div style={{
                  background: 'var(--red-bg)',
                  border: '1px solid var(--red)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>⚠️ Ogohlantirish: {cheatWarnings}/3</span>
                </div>
              )}
              <div className={`exam-timer ${isUrgent ? 'timer-danger' : isWarning ? 'timer-warning' : ''}`}>
                <Clock size={16} />
                <span>Qolgan vaqt: <strong>{formatTime(timeLeft)}</strong></span>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red)', color: 'white', border: 'none' }}
                onClick={() => handleFinish(false)}
              >
                <Flag size={14} /> Yakunlash
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
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Savol {currentQ + 1} / {questions.length}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    className="objection-btn"
                    style={{ position: 'static', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--border)' }}
                    onClick={() => setShowObjectionModal(true)}
                  >
                    <AlertCircle size={13} /> E'tiroz
                  </button>
                  <button
                    onClick={() => setFlagged(prev => ({ ...prev, [currentQ]: !prev[currentQ] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: flagged[currentQ] ? 'var(--amber-bg)' : 'transparent',
                      border: flagged[currentQ] ? '1px solid var(--amber)' : '1px solid var(--border)',
                      color: flagged[currentQ] ? 'var(--amber)' : 'var(--text3)',
                      padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Flag size={13} fill={flagged[currentQ] ? 'var(--amber)' : 'none'} />
                    {flagged[currentQ] ? 'Belgilangan' : 'Belgilash'}
                  </button>
                </div>
              </div>

              {/* Savol rasmi yoki sxemasi */}
              <QuestionMedia question={q} />
              {/* Savol matni */}
              {q.isHtml ? (
                <SafeHtml html={q.q} style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.6, marginBottom: 24, color: 'var(--text)' }} />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5, marginBottom: 24, color: 'var(--text)', whiteSpace: 'pre-line' }}>
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
                        fontSize: 15, fontWeight: 500, color: 'var(--text)',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: indicatorBg,
                        color: indicatorColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14
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
                    <span style={{ fontSize: 18 }}>📖</span>
                    <strong style={{ fontSize: 14, color: 'var(--text)', fontWeight: 800 }}>Tushuntirish:</strong>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
                    {q.explanation ? (
                      q.explanation.startsWith('<') ? (
                        <SafeHtml html={q.explanation} />
                      ) : (
                        q.explanation
                      )
                    ) : (
                      "Ushbu savol uchun tushuntirish kiritilmagan."
                    )}
                  </div>
                </div>
              )}

              {/* Navigatsiya */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button
                  className="btn btn-outline"
                  disabled={currentQ === 0}
                  onClick={() => handleQuestionSwitch(currentQ - 1)}
                >
                  <ChevronLeft size={18} /> Orqaga
                </button>
                <button
                  className="btn btn-primary"
                  disabled={currentQ === questions.length - 1}
                  onClick={() => handleQuestionSwitch(currentQ + 1)}
                >
                  Keyingi <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* O'NG PANEL — Savollar Navigator */}
        <div className="exam-navigator glass-panel">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Savollar
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>
                {answeredCount} / {questions.length}
              </div>
            </div>

            {/* Rang izohlari */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text2)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--blue)' }} />
                <span>Javob berilgan</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--amber)' }} />
                <span>Belgilangan 🚩</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)' }} />
                <span>Qoldirilgan</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'transparent', border: '2px solid var(--text)' }} />
                <span>Joriy</span>
              </div>
            </div>

            <div className="exam-q-grid">
              {questions.map((_, i) => {
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
                      fontWeight: 700, fontSize: 10, cursor: 'pointer',
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

          {reviewMode ? (
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: 'var(--blue)', borderColor: 'var(--blue)', fontWeight: 700 }}
              onClick={() => {
                setFinished(true);
                setReviewMode(false);
              }}
            >
              📊 Natijaga Qaytish
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: 'var(--red)', borderColor: 'var(--red)' }}
              onClick={() => setShowConfirmModal(true)}
            >
              <Flag size={16} /> Yakunlash ({answeredCount}/{questions.length})
            </button>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 24, maxWidth: 320, width: '90%', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚩</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Imtihonni yakunlash</h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Rostdan ham imtihonni yakunlamoqchimisiz? Barcha belgilangan javoblar saqlanadi.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setShowConfirmModal(false)}>Yo'q</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} onClick={() => { setShowConfirmModal(false); handleFinish(true); }}>Ha, yakunlash</button>
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
