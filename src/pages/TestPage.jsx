import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { TOPICS } from '../data/mockData';
import { BADGES, getEarnedBadges } from '../data/badges';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft, Home, Target, PenTool, Zap, MessageCircle, ThumbsUp, ThumbsDown, Clock, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import ObjectionModal from '../components/shared/ObjectionModal';
import PremiumModal from '../components/PremiumModal';
import SafeHtml from '../components/shared/SafeHtml';
import { BATCH_SIZE, QUESTION_TIMER_SECONDS } from '../config';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { smartSort, summarizeTestResults } from '../engine/SmartQuestionEngine';

const TestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, addScore, addMistake, batchCommitResults, updateState } = useContext(AppContext);
  const mode = state.testMode || 'exam';
  const setMode = (m) => updateState({ testMode: m });
  const topicId = state.topicId ?? -1;
  const goBack = () => navigate('/');
  const { addObjection } = useContext(ObjectionContext);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Premium tekshiruvli mavzu o'zgartirish
  const setTopicId = (id) => {
    if (!user?.isPremium && id >= 2) {
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

  // Objection Modal State
  const [showObjectionModal, setShowObjectionModal] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const explanationRef = useRef(null);

  // Motivatsion so'zlar va combo
  const [comboCount, setComboCount] = useState(0);
  const [motivationText, setMotivationText] = useState('');
  const motivationTimerRef = useRef(null);

  // Mini-darslik
  const [showTheory, setShowTheory] = useState(false);

  // Flashcard state
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcKnown, setFcKnown] = useState({}); // { [index]: true/false }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQ]);

  useEffect(() => {
    if (mode !== 'exam' || showResults || questions.length === 0 || showTheory) {
      setTimerActive(false);
      clearInterval(timerRef.current);
      return;
    }
    if (answers[currentQ] !== undefined) {
      setTimerActive(false);
      clearInterval(timerRef.current);
      return;
    }
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
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, mode, showResults, questions.length]);

  const isUsefulMnemonic = (text) => text && !["Kalit so'zga e'tibor bering va javobni vizuallashtiring.", "Kalit so'zga e'tibor bering va javobni vizuallashtiring"].includes(text.trim());

  const [fullPool, setFullPool] = useState([]);

  useEffect(() => {
    generateFullPool();
  }, [topicId, mode]);

  useEffect(() => {
    if (fullPool.length > 0) {
      const start = selectedBatch * BATCH_SIZE;
      setQuestions(fullPool.slice(start, start + BATCH_SIZE));
      setCurrentQ(0);
      setFcFlipped(false);
      setAnswers({});
    }
  }, [selectedBatch, fullPool]);

  const generateFullPool = async () => {
    setIsGenerating(true);
    setShowResults(false);
    setAnswers({});
    setCurrentQ(0);
    setFcFlipped(false);
    setFcKnown({});

    try {
      let qList = [];

      if (mode === 'mistakes') {
        const filteredMistakes = state.mistakes.filter(m => {
          const topic = TOPICS.find(t => t.name === m.topic);
          if (!topic) return false;
          return Array.isArray(topic.category)
            ? topic.category.includes(state.activeCategory)
            : topic.category === state.activeCategory;
        });

        if (filteredMistakes.length > 0) {
          const shuffledMistakes = [...filteredMistakes].sort(() => 0.5 - Math.random());
          qList = shuffledMistakes.slice(0, 15).map((m) => {
            if (m.opts && m.opts.length > 0) {
              return {
                q: m.question,
                opts: m.opts,
                correct: m.opts.findIndex(o =>
                  o.replace(/^[A-D]\)\s*/, '') === m.correct.replace(/^[A-D]\)\s*/, '')
                ),
                explanation: `✓ To'g'ri javob: ${m.correct}`
              };
            }
            return {
              q: m.question,
              opts: [`A) ${m.correct}`, 'B) —', 'C) —', 'D) —'],
              correct: 0,
              explanation: `✓ To'g'ri javob: ${m.correct}`
            };
          });
        }
      } else {
        const qRef = collection(db, 'questions');
        let qQuery = query(qRef);

        if (topicId !== -1) {
          qQuery = query(qRef, where('topicId', '==', topicId));
        } else {
          qQuery = query(qRef, where('category', '==', state.activeCategory));
        }

        const snap = await getDocs(qQuery);
        const rawList = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

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

      setFullPool(qList);
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
    if (topicObj?.theoryHint && mode === 'exam' && Object.keys(answers).length === 0 && questions.length > 0) {
      setShowTheory(true);
    }
  }, [topicId, mode, selectedBatch, questions.length]);

  const handleShowResults = () => {
    setShowResults(true);
    // 🧠 SMART ENGINE: Natijalarni tahlil qilish va bir marta saqlash
    const results = summarizeTestResults(questions, answers, state.spacedCards || [], topicId);
    batchCommitResults(results);
  };

  const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;

  if (isGenerating) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="spin" size={32} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}>Savollar yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  if (showTheory) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page" style={{ padding: '20px' }}>
        <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', maxWidth: '600px', margin: '10vh auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h2 style={{ marginBottom: '12px', color: 'var(--text)' }}>Qisqacha Eslatma</h2>
          <p style={{ color: 'var(--text3)', fontSize: '14px', marginBottom: '24px' }}>
            Testni boshlashdan oldin quyidagi nazariy ma'lumotlarni yodga oling:
          </p>
          <div style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text2)', marginBottom: '32px', textAlign: 'left', background: 'var(--bg2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            {topicObj?.theoryHint}
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold', borderRadius: '12px' }}
            onClick={() => setShowTheory(false)}
          >
            O'qib chiqdim, Testni boshlash
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page" style={{ padding: '12px 16px' }}>
      <div className="test-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
        <button
          onClick={() => navigate('/')}
          className="btn-outline"
          style={{ borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
          title="Orqaga"
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="test-title" style={{ fontSize: '18px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topicName}</div>
          <div className="test-meta" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
            {questions.length} savol {mode !== 'mistakes' && selectedBatch + 1 > 0 && ` · Blok ${selectedBatch + 1}`}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMode(mode === 'flash' ? 'exam' : 'flash')}
            style={{ background: mode === 'flash' ? 'var(--blue)' : 'var(--bg3)', border: 'none', borderRadius: '10px', color: mode === 'flash' ? 'white' : 'var(--text2)', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}
          >
            <Zap size={16} />
            <span className="hide-mobile">Flashcard</span>
          </button>
          <button
            onClick={generateQuestions}
            style={{ background: 'var(--bg3)', border: 'none', borderRadius: '10px', color: 'var(--text2)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Yangi savollar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="topic-selector">
        <button className={`topic-btn ${topicId === -1 ? 'active' : ''}`} onClick={() => setTopicId(-1)}>📚 Barcha</button>
        {TOPICS.filter(t => Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory).map(t => (
          <button
            key={t.id}
            className={`topic-btn ${topicId === t.id ? 'active' : ''}`}
            onClick={() => setTopicId(t.id)}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>

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
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          {mode === 'mistakes'
            ? <><div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div><div style={{ color: 'var(--text2)' }}>Hozircha xato yo'q — ajoyib!</div></>
            : <div style={{ color: 'var(--text2)' }}>Hozircha savollar yo'q.</div>
          }
        </div>
      ) : mode === 'flash' ? (
        <div className="flash-mode-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{currentQ + 1} / {questions.length}</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
              <span style={{ color: 'var(--green)' }}>✓ {Object.values(fcKnown).filter(Boolean).length} bilaman</span>
              <span style={{ color: 'var(--red)' }}>✗ {Object.values(fcKnown).filter(v => v === false).length} bilmayman</span>
            </div>
          </div>
          <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', marginBottom: '20px' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: 'var(--accent)', width: `${((currentQ) / questions.length) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
          <div className="flashcard-wrap" onClick={() => setFcFlipped(!fcFlipped)}>
            <motion.div className={`flashcard ${fcFlipped ? 'flipped' : ''}`}>
              <div className="flashcard-face flashcard-front">
                <button className="objection-btn" onClick={(e) => { e.stopPropagation(); setShowObjectionModal(true); }}><MessageCircle size={14} /> E'tiroz</button>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Savol — bosing, javobni ko'ring</div>
                <div className="flashcard-front-text">{questions[currentQ].q}</div>
              </div>
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-back-text">
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>To'g'ri javob</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--green)', marginBottom: '12px' }}>{questions[currentQ].opts[questions[currentQ].correct]?.replace(/^[A-D]\)\s*/, '')}</div>
                  {questions[currentQ].explanation && <div style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.5' }}>{questions[currentQ].explanation}</div>}
                </div>
              </div>
            </motion.div>
          </div>
          {fcFlipped ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn" style={{ flex: 1, maxWidth: '180px', background: 'var(--red-bg)', borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => { setFcFlipped(false); handleFlashcardKnown(false); }}><ThumbsDown size={18} /> Bilmayman</button>
              <button className="btn" style={{ flex: 1, maxWidth: '180px', background: 'var(--green-bg)', borderColor: 'var(--green)', color: 'var(--green)' }} onClick={() => { setFcFlipped(false); handleFlashcardKnown(true); }}><ThumbsUp size={18} /> Bilaman</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => { if (currentQ > 0) { setCurrentQ(prev => prev - 1); setFcFlipped(false); } }} disabled={currentQ === 0}>← Oldingi</button>
              <button className="btn btn-outline" onClick={() => { if (currentQ < questions.length - 1) { setCurrentQ(prev => prev + 1); setFcFlipped(false); } }} disabled={currentQ === questions.length - 1}>Keyingi →</button>
            </div>
          )}
        </div>
      ) : (
        <div className="exam-mode-container">
          {!showResults ? (
            <AnimatePresence mode="wait">
              <motion.div key={currentQ} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }} className="question-box glass-panel" style={{ padding: '20px 16px' }}>

                {/* ── Sarlavha qatori: savol raqami + qiyinlik + mavzu + e'tiroz ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="q-num">Savol {currentQ + 1} / {questions.length}</div>
                    {questions[currentQ].difficulty !== undefined && (
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        display: 'inline-block', flexShrink: 0, opacity: 0.6,
                        background: questions[currentQ].difficulty >= 3 ? 'var(--red)' : questions[currentQ].difficulty >= 1 ? 'var(--amber)' : 'var(--green)',
                      }} title={questions[currentQ].difficulty >= 3 ? 'Qiyin' : questions[currentQ].difficulty >= 1 ? "O'rtacha" : 'Oson'} />
                    )}
                    {topicId >= 0 && <div style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: '600', background: 'var(--blue-bg)', padding: '2px 8px', borderRadius: '6px' }}>{topicName}</div>}
                  </div>
                  <button className="objection-btn" style={{ position: 'relative', top: 'auto', right: 'auto', margin: 0 }} onClick={() => setShowObjectionModal(true)}><MessageCircle size={14} /> E'tiroz</button>
                </div>

                {/* ── Progress bar ── */}
                <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'var(--bg3)', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${((Object.keys(answers).length) / questions.length) * 100}%`, height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, var(--blue), var(--accent))', transition: 'width 0.5s ease' }} />
                </div>

                {/* ── Motivatsiya matni ── */}
                {motivationText && (
                  <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', fontWeight: '800', fontSize: comboCount >= 10 ? '20px' : comboCount >= 5 ? '18px' : '16px', color: comboCount >= 10 ? '#FFD700' : comboCount >= 5 ? 'var(--amber)' : 'var(--green)', padding: '4px 0', marginBottom: '4px', textShadow: comboCount >= 10 ? '0 0 10px rgba(255,215,0,0.5)' : 'none' }}>{motivationText}</motion.div>
                )}

                {/* ── Taymer ── */}
                {mode === 'exam' && answers[currentQ] === undefined && (
                  <div className={`question-timer ${timeLeft <= 10 ? 'timer-danger' : timeLeft <= 20 ? 'timer-warning' : ''}`}>
                    <Clock size={14} />
                    <span>{timeLeft}s</span>
                    <div className="timer-bar-wrap">
                      <div className="timer-bar-fill" style={{ width: `${(timeLeft / QUESTION_TIMER_SECONDS) * 100}%`, background: timeLeft <= 10 ? 'var(--red)' : timeLeft <= 20 ? 'var(--amber)' : 'var(--green)' }} />
                    </div>
                  </div>
                )}
                {answers[currentQ] === -1 && <div style={{ color: 'var(--red)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>⏰ Vaqt tugadi!</div>}

                {questions[currentQ].image && <div style={{ margin: '0 0 16px', textAlign: 'center' }}><img src={questions[currentQ].image} alt="Savol rasmi" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid var(--border)' }} /></div>}
                {questions[currentQ].isHtml ? <SafeHtml html={questions[currentQ].q} className="q-text" /> : <div className="q-text" style={{ whiteSpace: 'pre-line' }}>{questions[currentQ].q}</div>}
                <div className="options">
                  {questions[currentQ].opts.map((opt, i) => {
                    const answered = answers[currentQ] !== undefined;
                    const correctIdx = questions[currentQ].correct;
                    const isSelected = answers[currentQ] === i;
                    let bg = '';
                    if (answered) {
                      if (i === correctIdx) bg = 'correct';
                      else if (isSelected) bg = 'wrong';
                      else bg = 'disabled';
                    }
                    return (
                      <div key={i} className={`option ${bg} ${!answered ? 'hoverable' : ''}`} onClick={() => handleSelect(currentQ, i)}>
                        <div className="opt-letter">{['A', 'B', 'C', 'D'][i]}</div>
                        <div className="opt-text">{opt.replace(/^[A-D]\)\s*/, '')}</div>
                      </div>
                    );
                  })}
                </div>
                {answers[currentQ] !== undefined && (
                  <>
                    <motion.div ref={explanationRef} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`explanation-box ${answers[currentQ] === questions[currentQ].correct ? 'correct' : 'wrong'}`}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{answers[currentQ] === questions[currentQ].correct ? '✓ To\'g\'ri' : '✗ Noto\'g\'ri'}</div>
                      {answers[currentQ] !== questions[currentQ].correct && answers[currentQ] >= 0 && (
                        <div style={{ marginBottom: '8px', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                          <span style={{ color: 'var(--red)', fontWeight: '600' }}>Siz tanladingiz:</span> {questions[currentQ].opts[answers[currentQ]]?.replace(/^[A-D]\)\s*/, '')}<br/>
                          <span style={{ color: 'var(--green)', fontWeight: '600' }}>To'g'ri javob:</span> {questions[currentQ].opts[questions[currentQ].correct]?.replace(/^[A-D]\)\s*/, '')}
                        </div>
                      )}
                      {questions[currentQ].explanation}
                    </motion.div>
                    {isUsefulMnemonic(questions[currentQ].mnemonic) && (
                      <div className="mnemonic-box">
                        <div className="mnemonic-icon">💡</div>
                        <div className="mnemonic-text"><strong>Eslab qolish uchun:</strong><br />{questions[currentQ].mnemonic}</div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="result-panel glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{correctCount / questions.length >= 0.7 ? '🏆' : correctCount / questions.length >= 0.5 ? '📊' : '💪'}</div>
              <div style={{ fontSize: '24px', color: 'var(--text)', fontWeight: '700', marginBottom: '8px' }}>{correctCount / questions.length >= 0.7 ? 'Ajoyib natija!' : 'Davom eting!'}</div>
              <div style={{ fontSize: '16px', color: 'var(--text2)', marginBottom: '24px' }}>{questions.length} ta savoldan {correctCount} tasiga to'g'ri javob berdingiz.</div>
              <div style={{ background: 'var(--bg3)', borderRadius: '16px', padding: '24px', display: 'inline-block', marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Natija</div>
                <div style={{ fontSize: '56px', fontFamily: "'Bebas Neue', sans-serif", color: correctCount / questions.length >= 0.7 ? 'var(--green)' : correctCount / questions.length >= 0.5 ? 'var(--amber)' : 'var(--red)', lineHeight: '1' }}>{correctCount} <span style={{ fontSize: '32px', color: 'var(--text3)' }}>/ {questions.length}</span></div>
                <div style={{ fontSize: '20px', marginTop: '8px', color: 'var(--text2)' }}>{Math.round((correctCount / questions.length) * 100)}%</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                <button className="btn btn-primary" onClick={generateQuestions}><RefreshCw size={18} /> Yana ishlash</button>
                {state.mistakes.length > 0 && <button className="btn btn-outline" onClick={() => setMode('mistakes')}><Target size={18} /> Xatolar ustida ishlash</button>}
                <button className="btn btn-outline" onClick={() => navigate('/')}><Home size={18} /> Boshqa bo'limga</button>
                <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Share2 size={13} /> Natijani ulashing</div>
                  <div style={{ display: 'flex', gap: '8px' }}>

                    <button className="btn btn-sm" style={{ flex: 1, background: '#2AABEE', color: 'white', border: 'none', borderRadius: '10px' }} onClick={() => { const pct = Math.round((correctCount / questions.length) * 100); const emoji = pct >= 70 ? '🏆' : pct >= 50 ? '📊' : '💪'; const text = `${emoji} IQRO platformasida test yechdim!\n📚 Mavzu: ${topicName}\n✅ Natija: ${correctCount}/${questions.length} (${pct}%)\n🎯 Imtihonga tayyorgarlik!`; window.open(`https://t.me/share/url?url=https://iqro-t41p.vercel.app&text=${encodeURIComponent(text)}`, '_blank'); }}>Telegram</button>
                    <button className="btn btn-sm btn-outline" style={{ borderRadius: '10px' }} onClick={() => { const pct = Math.round((correctCount / questions.length) * 100); const text = `IQRO platformasida test: ${correctCount}/${questions.length} (${pct}%) - ${topicName}`; navigator.clipboard?.writeText(text); showToast('Nusxalandi! 📋', 'info'); }} >📋</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!showResults && (
            <div className="q-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button disabled={currentQ === 0} className="btn btn-outline" onClick={() => setCurrentQ(prev => prev - 1)}>Orqaga</button>
              {Object.keys(answers).length === questions.length ? <button className="btn btn-primary" onClick={handleShowResults}>Natijani Ko'rish</button> : <button disabled={currentQ === questions.length - 1} className="btn btn-outline" onClick={() => setCurrentQ(prev => prev + 1)}>Keyingi</button>}
            </div>
          )}
        </div>
      )}

      {/* E'TIROZ MODALI */}
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
