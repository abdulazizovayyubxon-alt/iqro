import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { BADGES, getEarnedBadges } from '../data/badges';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft, Home, Target, PenTool, Zap, MessageCircle, ThumbsUp, ThumbsDown, Clock, Share2, ChevronDown, X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import ObjectionModal from '../components/shared/ObjectionModal';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import PremiumModal from '../components/PremiumModal';
import FreeMonthBanner from '../components/FreeMonthBanner';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
import { BATCH_SIZE, QUESTION_TIMER_SECONDS } from '../config';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { smartSort, summarizeTestResults } from '../engine/SmartQuestionEngine';
import localforage from 'localforage';

import TestHeader from '../components/test/TestHeader';
import SmartBottomSheet from '../components/test/SmartBottomSheet';
import QuestionBox from '../components/test/QuestionBox';
import FlashcardView from '../components/test/FlashcardView';
import TestResults from '../components/test/TestResults';

const TestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, addScore, addMistake, batchCommitResults, updateState, saveCustomMnemonic } = useContext(AppContext);
  const mode = state.testMode || 'exam';
  const setMode = (m) => updateState({ testMode: m });
  const topicId = state.topicId ?? -1;
  const goBack = () => navigate('/test');
  const { addObjection } = useContext(ObjectionContext);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { isTrialExpired: isFreeLimitReached } = useTrialExpiry();
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
  const [selectedBatch, setSelectedBatch] = useState(0);

  // New States: Difficulty Filter and Timer Mode
  const [diffFilter, setDiffFilter] = useState('ALL'); // 'ALL', 'Y1', 'Y2', 'Y3'
  const [timerMode, setTimerMode] = useState('countdown'); // 'countdown', 'stopwatch', 'off'

  // Bottom Sheet State
  const [showSelectorDrawer, setShowSelectorDrawer] = useState(false);

  // Objection Modal State
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState('analysis');

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const explanationRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const questionTimesRef = useRef({});

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveReviewTab('analysis');
  }, [currentQ]);

  useEffect(() => {
    // Reset start time whenever currentQ changes and is not answered yet
    questionStartTimeRef.current = Date.now();

    if (mode !== 'exam' || showResults || questions.length === 0 || showTheory || timerMode === 'off') {
      setTimerActive(false);
      clearInterval(timerRef.current);
      return;
    }
    if (answers[currentQ] !== undefined) {
      setTimerActive(false);
      clearInterval(timerRef.current);
      return;
    }

    if (timerMode === 'countdown') {
      setTimeLeft(QUESTION_TIMER_SECONDS);
      setTimerActive(true);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            const q = questions[currentQ];
            if (q && answers[currentQ] === undefined) {
              setAnswers(prev2 => ({ ...prev2, [currentQ]: -1 })); // -1 = vaqt tugadi
              questionTimesRef.current[currentQ] = QUESTION_TIMER_SECONDS;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerMode === 'stopwatch') {
      setTimeLeft(0);
      setTimerActive(true);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [currentQ, mode, showResults, questions.length, timerMode]);

  const isUsefulMnemonic = (text) => text && !["Kalit so'zga e'tibor bering va javobni vizuallashtiring.", "Kalit so'zga e'tibor bering va javobni vizuallashtiring"].includes(text.trim());

  const [fullPool, setFullPool] = useState([]);

  useEffect(() => {
    generateFullPool();
  }, [topicId, mode, state.activeCategory, diffFilter]);

  useEffect(() => {
    if (fullPool.length > 0) {
      const start = selectedBatch * BATCH_SIZE;
      setQuestions(fullPool.slice(start, start + BATCH_SIZE));
      setCurrentQ(0);
      setFcFlipped(false);
      setAnswers({});
      questionTimesRef.current = {};
    } else {
      setQuestions([]);
      setCurrentQ(0);
      setAnswers({});
    }
  }, [selectedBatch, fullPool]);

  const generateFullPool = async () => {
    setIsGenerating(true);
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
          if (!topic) return false;
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
                explanation: `✓ To'g'ri javob: ${m.correct}`
              };
            }
            return {
              q: cleanQ,
              opts: [`A) ${m.correct}`, 'B) —', 'C) —', 'D) —'],
              correct: 0,
              explanation: `✓ To'g'ri javob: ${m.correct}`
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

        const cacheKey = `bundle_${state.activeCategory}`;
        const versionKey = `version_${state.activeCategory}`;
        
        // 2. Telefon xotirasidan izlaymiz
        const localCategoryVersion = await localforage.getItem(versionKey);
        let rawList = await localforage.getItem(cacheKey);

        // 3. Agar telefonda savollar yo'q bo'lsa yoki versiya eskirgan bo'lsa (yangi savol qo'shilgan)
        if (!rawList || localCategoryVersion !== remoteVersion) {
          const downloadUrl = storageUrls[state.activeCategory];
          if (downloadUrl) {
            try {
              const res = await fetch(downloadUrl);
              rawList = await res.json();
              // Telefon xotirasini yangilaymiz
              await localforage.setItem(cacheKey, rawList);
              await localforage.setItem(versionKey, remoteVersion);
            } catch (err) {
              console.error("Bundle yuklashda xatolik:", err);
              rawList = [];
            }
          } else {
            // Agar storageUrls da bu fanga oid fayl bo'lmasa (Admin hali Publish bosmagan bo'lsa),
            // eskirgan usulda to'g'ridan-to'g'ri bazadan yuklashga urinib ko'ramiz (Fallback)
            try {
              const { query, where, getDocs, collection } = await import('firebase/firestore');
              const qRef = collection(db, 'questions');
              const qQuery = query(qRef, where('category', '==', state.activeCategory));
              const snap = await getDocs(qQuery);
              rawList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              // Buni ham telefon xotirasiga yozib qo'yamiz, toki qayta kirsangiz yana limit yemasligi uchun
              await localforage.setItem(cacheKey, rawList);
              // versionKey ni ham saqlaymiz, aks holda har gal qayta-qayta baza so'rayveradi (infinite loop bug fix)
              await localforage.setItem(versionKey, remoteVersion);
            } catch (fallbackErr) {
              console.error("Fallback yuklashda xatolik:", fallbackErr);
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

        // 🧠 SMART SORT — aqlli savol tanlash
        // Zaif mavzulardagi savollarni ko'proq ko'rsatadi,
        // spaced repetition muddati kelgan savollarni ustivor qiladi
        qList = smartSort(rawList, {
          topicStats: state.topicStats,
          spacedCards: state.spacedCards || [],
          mistakes: (state.stats?.[state.activeCategory]?.mistakes) || [],
          activeCategory: state.activeCategory,
          batchSize: rawList.length,
          topicId
        });
      }

      let finalPool = qList;
      if (diffFilter !== 'ALL') {
        finalPool = qList.filter(q => q.difficulty === diffFilter);
      }
      setFullPool(finalPool);
    } catch (error) {
      console.error("Firestore Error:", error);
      showToast("Savollarni yuklashda xatolik yuz berdi", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQuestions = () => {
    generateFullPool();
  };

  const handleSelect = (qIndex, optIdx) => {
    if (answers[qIndex] !== undefined) return;
    clearInterval(timerRef.current);
    setTimerActive(false);

    const elapsed = Math.min(QUESTION_TIMER_SECONDS, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
    questionTimesRef.current[qIndex] = (questionTimesRef.current[qIndex] || 0) + elapsed;

    setAnswers(prev => ({ ...prev, [qIndex]: optIdx }));
    const q = questions[qIndex];

    if (q.correct === optIdx) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);

      const MOTIVATIONS = [
        { min: 1, words: ["To'g'ri! ✓", "Yaxshi! 👍", "Ha! ✅"] },
        { min: 3, words: ["Zo'r! 🔥", "Ajoyib! ⚡", "Davom eting! 💪"] },
        { min: 5, words: ["Daho! 🧠", "Mukammal! 🌟", "Qoyil! 🏆"] },
        { min: 10, words: ["LEGENDA! 👑", "CHEMPION! 🥇", "FENOMENAL! 🚀"] },
      ];
      const tier = [...MOTIVATIONS].reverse().find(m => newCombo >= m.min);
      const word = tier ? tier.words[Math.floor(Math.random() * tier.words.length)] : "To'g'ri!";
      setMotivationText(newCombo >= 3 ? `${word} (${newCombo}x combo!)` : word);
      clearTimeout(motivationTimerRef.current);
      motivationTimerRef.current = setTimeout(() => setMotivationText(''), 2000);

      confetti({
        particleCount: newCombo >= 10 ? 200 : newCombo >= 5 ? 120 : 80,
        spread: newCombo >= 5 ? 90 : 60,
        origin: { y: 0.7 },
        colors: newCombo >= 10 ? ['#FFD700', '#FFA500', '#FF4500'] : ['#34D399', '#10B981', '#ffffff']
      });
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
    showToast("E'tiroz qabul qilindi. Rahmat!", 'success');
  };

  const handleFlashcardKnown = (known) => {
    setFcKnown(prev => ({ ...prev, [currentQ]: known }));
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setFcFlipped(false);
    } else {
      const knownCount = Object.values({ ...fcKnown, [currentQ]: known }).filter(Boolean).length;
      showToast(`Flashcard yakunlandi! ${knownCount}/${questions.length} ta bilasiz 🎉`, 'info');
    }
  };

  useEffect(() => {
    setSelectedBatch(0);
  }, [topicId, mode]);

  const topicObj = TOPICS.find(t => t.id === topicId);
  const topicName = topicId === -1 ? "Barcha bo'limlar" : (topicObj?.name || "Barcha bo'limlar");

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
    setShowResults(true);
    // 🧠 SMART ENGINE: Natijalarni tahlil qilish va bir marta saqlash
    const results = summarizeTestResults(questions, answers, state.spacedCards || [], topicId);
    
    // Add total session time to results
    const totalSessionTime = Object.values(questionTimesRef.current).reduce((a, b) => a + b, 0);
    results.sessionTime = totalSessionTime;

    batchCommitResults(results);

    // Send result to Telegram
    const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;
    const wrongCount = Object.keys(answers).length - correctCount;
    fetch('/api/send-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user?.uid,
        correct: correctCount,
        wrong: wrongCount,
        total: questions.length,
        time: Math.round(totalSessionTime / 60) + ' daqiqa',
        mode: mode === 'exam' ? 'Imtihon rejim' : 'O\'rganish rejim',
        title: topicName
      })
    }).catch(e => console.error(e));
  };

  const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #E2E8F0', borderTopColor: '#29B6F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: '#64748B', fontSize: 14, fontWeight: 500 }}>Savollar yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  if (showTheory) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '32px 24px', textAlign: 'center', maxWidth: 520, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>📚</div>
          <h2 style={{ marginBottom: 8, color: 'var(--text)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Qisqacha Eslatma</h2>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 20, fontWeight: 500 }}>
            Testni boshlashdan oldin quyidagi ma'lumotlarni yodga oling:
          </p>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text2)', marginBottom: 28, textAlign: 'left', background: 'var(--bg3)', padding: '16px 20px', borderRadius: 16, borderLeft: '4px solid var(--accent)' }}>
            {topicObj?.theoryHint}
          </div>
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)' }}
            onClick={() => setShowTheory(false)}
          >
            O'qib chiqdim — Testni boshlash
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Bepul limit tekshiruvi (hooks ishga tushgandan so'ng)
  if (isFreeLimitReached) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{ maxWidth: 400, width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 24, padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>Bepul Limit Tugadi</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28 }}>
            7 kunlik sinov yakunlandi! Barcha savollar va mavzularga kirish uchun Premium rejimni faollashtiring.
          </div>
          <button style={{ width: '100%', padding: '15px', background: '#29B6F6', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }} onClick={() => setShowPremiumModal(true)}>
            ⭐ Premium Rejimni Faollashtirish
          </button>
          <button style={{ width: '100%', padding: '13px', background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)', borderRadius: 14, fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goBack}>← Bosh sahifaga</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 700, margin: '0 auto', padding: '12px 16px 80px' }}>
      {questions.length === 0 && <FreeMonthBanner onPayClick={() => setShowPremiumModal(true)} />}

      {/* Header */}
      <TestHeader 
        topicName={topicName}
        questionsCount={questions.length}
        mode={mode}
        setMode={setMode}
        selectedBatch={selectedBatch}
        generateQuestions={generateQuestions}
      />

      {/* Smart Bottom Sheet */}
      <SmartBottomSheet 
        showSelectorDrawer={showSelectorDrawer}
        setShowSelectorDrawer={setShowSelectorDrawer}
        state={state}
        updateState={updateState}
        topicId={topicId}
        setTopicId={setTopicId}
        SUBJECTS={SUBJECTS}
        TOPICS={TOPICS}
      />

      {/* Batch Selector */}
      {mode !== 'mistakes' && (
        <div className="batch-selector" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {Array.from({ length: Math.ceil(fullPool.length / BATCH_SIZE) }).map((_, i) => {
            const start = i * BATCH_SIZE + 1;
            const end = Math.min((i + 1) * BATCH_SIZE, fullPool.length);
            return (
              <button
                key={i}
                className={`btn btn-sm ${selectedBatch === i ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedBatch(i)}
                style={{ flexShrink: 0, fontSize: '12px' }}
              >
                {start}–{end}
              </button>
            );
          })}
        </div>
      )}

      {questions.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '48px 32px', textAlign: 'center', maxWidth: '500px', margin: '40px auto', 
            borderRadius: '24px', border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, var(--glass-bg), rgba(255, 255, 255, 0.03))',
            position: 'relative', overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute', width: '180px', height: '180px',
            background: mode === 'mistakes' ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {mode === 'mistakes' ? (
              <>
                <div className="float-animation" style={{ fontSize: '56px', marginBottom: '20px', filter: 'drop-shadow(0 10px 15px rgba(16, 185, 129, 0.2))', display: 'inline-block' }}>🏆</div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>Hozircha xatolar yo'q</h3>
                <p style={{ color: 'var(--text3)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px', maxWidth: '340px', margin: '0 auto 28px' }}>
                  Ajoyib natija! Siz hali birorta ham xato qilmadingiz yoki barcha xatolaringizni muvaffaqiyatli tuzatdingiz.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-outline" onClick={goBack}><ArrowLeft size={16} /> Fanni almashtirish</button>
                </div>
              </>
            ) : (
              <>
                <div className="float-animation" style={{ fontSize: '56px', marginBottom: '20px', filter: 'drop-shadow(0 10px 15px rgba(59, 130, 246, 0.2))', display: 'inline-block' }}>⏳</div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>Mavzu tayyorlanmoqda</h3>
                <p style={{ color: 'var(--text3)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px', maxWidth: '340px', margin: '0 auto 28px' }}>
                  Ushbu bo'lim uchun savollar hozirda yuklanish jarayonida yoki tez orada qo'shiladi. Boshqa bo'lim yoki fanni sinab ko'ring.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  {topicId !== -1 && (
                    <button className="btn btn-primary" style={{ width: '220px' }} onClick={() => setTopicId(-1)}>📚 Barcha mavzular</button>
                  )}
                  <button className="btn btn-outline" style={{ width: '220px' }} onClick={goBack}><ArrowLeft size={16} /> Boshqa fanni tanlash</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : mode === 'flash' ? (
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
              <QuestionBox 
                questions={questions}
                currentQ={currentQ}
                answers={answers}
                topicId={topicId}
                topicName={topicName}
                mode={mode}
                timerMode={timerMode}
                setTimerMode={setTimerMode}
                timeLeft={timeLeft}
                QUESTION_TIMER_SECONDS={QUESTION_TIMER_SECONDS}
                accumulateTime={accumulateTime}
                motivationText={motivationText}
                comboCount={comboCount}
                state={state}
                handleSelect={handleSelect}
                explanationRef={explanationRef}
                activeReviewTab={activeReviewTab}
                setActiveReviewTab={setActiveReviewTab}
                saveCustomMnemonic={saveCustomMnemonic}
                setShowObjectionModal={setShowObjectionModal}
              />
              <div className="q-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button disabled={currentQ === 0} className="btn btn-outline" onClick={() => { accumulateTime(); setCurrentQ(prev => prev - 1); }}>Orqaga</button>
                {Object.keys(answers).length === questions.length ? (
                  <button className="btn btn-primary" onClick={handleShowResults}>Natijani Ko'rish</button>
                ) : (
                  <button disabled={currentQ === questions.length - 1} className="btn btn-outline" onClick={() => { accumulateTime(); setCurrentQ(prev => prev + 1); }}>Keyingi</button>
                )}
              </div>
            </>
          ) : (
            <TestResults 
              correctCount={correctCount}
              questionsLength={questions.length}
              topicName={topicName}
              state={state}
              setMode={setMode}
              generateQuestions={generateQuestions}
              navigate={navigate}
              showToast={showToast}
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
    </motion.div>
  );
};

export default TestPage;
