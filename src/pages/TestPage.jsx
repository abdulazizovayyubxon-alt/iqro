import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { TOPICS, getFallbackQuestions, getTopicQuestionCount, getTopicBatchCount } from '../data/mockData';
import { BADGES, getEarnedBadges } from '../data/badges';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft, Home, Target, PenTool, Zap, MessageCircle, ThumbsUp, ThumbsDown, Clock, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BATCH_SIZE, QUESTION_TIMER_SECONDS } from '../config';

const TestPage = ({ mode, setMode, topicId, setTopicId, goBack }) => {
  const { state, addScore, addMistake, addObjection, showToast } = useContext(AppContext);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(0);

  // Objection Modal State
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [objectionText, setObjectionText] = useState('');

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const explanationRef = useRef(null);


  // Flashcard state
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcKnown, setFcKnown] = useState({}); // { [index]: true/false }

  // FIX: Scroll-to-top when question changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQ]);

  // Timer: har yangi savolda reset
  useEffect(() => {
    if (mode !== 'exam' || showResults || questions.length === 0) {
      setTimerActive(false);
      clearInterval(timerRef.current);
      return;
    }
    // Javob berilgan bo'lsa timerni to'xtatamiz
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
          // Vaqt tugadi — noto'g'ri deb belgilaymiz
          const q = questions[currentQ];
          if (q && answers[currentQ] === undefined) {
            addMistake(topicId, q.q, q.opts[q.correct], q.opts);
            setAnswers(prev2 => ({ ...prev2, [currentQ]: -1 })); // -1 = vaqt tugadi
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, mode, showResults, questions.length]);

  // Takroriy (generic) mnemonikni aniqlash va filtrlash
  const GENERIC_MNEMONICS = [
    "Kalit so'zga e'tibor bering va javobni vizuallashtiring.",
    "Kalit so'zga e'tibor bering va javobni vizuallashtiring"
  ];
  const isUsefulMnemonic = (text) => text && !GENERIC_MNEMONICS.includes(text.trim());

  const [fullPool, setFullPool] = useState([]);

  useEffect(() => {
    // Faqat mavzu yoki rejim o'zgarganda to'liq ro'yxatni shakllantiramiz
    generateFullPool();
  }, [topicId, mode]);

  useEffect(() => {
    // Blok o'zgarganda faqat kerakli qismni olamiz
    if (fullPool.length > 0) {
      const start = selectedBatch * BATCH_SIZE;
      setQuestions(fullPool.slice(start, start + BATCH_SIZE));
      setCurrentQ(0);
      setFcFlipped(false);
      setAnswers({});
    }
  }, [selectedBatch, fullPool]);

  const generateFullPool = () => {
    setIsGenerating(true);
    setShowResults(false);
    setAnswers({});
    setCurrentQ(0);
    setFcFlipped(false);
    setFcKnown({});

    setTimeout(() => {
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
          // Xatolarni tasodifiy aralashtirib, faqat 15 tasini (Tezkor Takrorlash) olamiz
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
        qList = getFallbackQuestions(topicId, state.activeCategory);
      }

      setFullPool(qList);
      setIsGenerating(false);
    }, 400);
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
      addScore(2, topicId);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#34D399', '#10B981', '#ffffff']
      });
    } else {
      addMistake(topicId, q.q, q.opts[q.correct], q.opts);
    }

    // Auto-scroll to explanation with a better delay and alignment
    setTimeout(() => {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  };



  const handleObjection = () => {
    if (objectionText.trim()) {
      const qObj = questions[currentQ];
      addObjection(topicId, qObj, objectionText);
      setObjectionText('');
      setShowObjectionModal(false);
      showToast("E'tiroz qabul qilindi. Rahmat!", 'success');
    }
  };

  // Flashcard uchun "bilaman/bilmayman" tugmalari
  const handleFlashcardKnown = (known) => {
    setFcKnown(prev => ({ ...prev, [currentQ]: known }));
    // Keyingi savol
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setFcFlipped(false);
    } else {
      // Yakunlandi
      const knownCount = Object.values({ ...fcKnown, [currentQ]: known }).filter(Boolean).length;
      showToast(`Flashcard yakunlandi! ${knownCount}/${questions.length} ta bilasiz 🎉`, 'info');
    }
  };

  useEffect(() => {
    setSelectedBatch(0);
  }, [topicId, mode]);

  const topicObj = TOPICS.find(t => t.id === topicId);
  const topicName = topicId < 0 ? "Barcha bo'limlar" : topicObj?.name;

  // FIX: haqiqiy savol soni (kategoriya bo'yicha)
  const totalQuestionsCount = getTopicQuestionCount(topicId, state.activeCategory);
  const batchCount = getTopicBatchCount(topicId, state.activeCategory);

  // Natija hisoblash
  const correctCount = Object.keys(answers).filter(k => answers[k] === questions[parseInt(k)]?.correct).length;

  if (isGenerating) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="spin" size={32} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>Savollar tayyorlanmoqda...</div>
        </div>
      </div>
    );
  }

  const filteredMistakesCount = state.mistakes.filter(m => {
    const topic = TOPICS.find(t => t.name === m.topic);
    if (!topic) return false;
    return Array.isArray(topic.category) 
      ? topic.category.includes(state.activeCategory) 
      : topic.category === state.activeCategory;
  }).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page" style={{ padding: '12px 16px' }}>
      {/* Header */}
      <div className="test-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
        <button 
          onClick={goBack} 
          className="btn-outline"
          style={{ 
            borderRadius: '12px', 
            width: '36px', 
            height: '36px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 0,
            flexShrink: 0
          }}
          title="Orqaga"
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="test-title" style={{ fontSize: '18px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topicName}</div>
          <div className="test-meta" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
            {questions.length} savol {mode !== 'mistakes' && batchCount > 1 && ` · Blok ${selectedBatch + 1}`}
          </div>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setMode(mode === 'flash' ? 'exam' : 'flash')} 
            style={{ 
              background: mode === 'flash' ? 'var(--blue)' : 'var(--bg3)', 
              border: 'none', 
              borderRadius: '10px',
              color: mode === 'flash' ? 'white' : 'var(--text2)',
              cursor: 'pointer',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <Zap size={16} />
            <span className="hide-mobile">Flashcard</span>
          </button>

          <button 
            onClick={generateQuestions} 
            style={{ 
              background: 'var(--bg3)', 
              border: 'none', 
              borderRadius: '10px',
              color: 'var(--text2)',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Yangi savollar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Mavzu tanlash */}
      <div className="topic-selector">
        <button className={`topic-btn ${topicId === -1 ? 'active' : ''}`} onClick={() => setTopicId(-1)}>📚 Barcha</button>
        {TOPICS.filter(t => 
          Array.isArray(t.category) 
            ? t.category.includes(state.activeCategory) 
            : t.category === state.activeCategory
        ).map(t => (
          <button
            key={t.id}
            className={`topic-btn ${topicId === t.id ? 'active' : ''}`}
            onClick={() => setTopicId(t.id)}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      {/* Blok tanlash — faqat haqiqiy songa asoslangan */}
      {mode !== 'mistakes' && batchCount > 1 && (
        <div className="batch-selector">
          {Array.from({ length: batchCount }).map((_, i) => {
            const start = i * BATCH_SIZE + 1;
            const end = Math.min((i + 1) * BATCH_SIZE, totalQuestionsCount);
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

      {/* ============ Bo'sh holat ============ */}
      {questions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          {mode === 'mistakes'
            ? <><div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div><div style={{ color: 'var(--text2)' }}>Hozircha xato yo'q — ajoyib!</div></>
            : <div style={{ color: 'var(--text2)' }}>Hozircha savollar yo'q.</div>
          }
        </div>

      /* ============ Flashcard rejimi ============ */
      ) : mode === 'flash' ? (
        <div className="flash-mode-container">
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
              {currentQ + 1} / {questions.length}
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
              <span style={{ color: 'var(--green)' }}>
                ✓ {Object.values(fcKnown).filter(Boolean).length} bilaman
              </span>
              <span style={{ color: 'var(--red)' }}>
                ✗ {Object.values(fcKnown).filter(v => v === false).length} bilmayman
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', marginBottom: '20px' }}>
            <div style={{
              height: '100%', borderRadius: '2px', background: 'var(--accent)',
              width: `${((currentQ) / questions.length) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>

          <div className="flashcard-wrap" onClick={() => setFcFlipped(!fcFlipped)}>
            <motion.div className={`flashcard ${fcFlipped ? 'flipped' : ''}`}>
              <div className="flashcard-face flashcard-front">
                <button
                  className="objection-btn"
                  onClick={(e) => { e.stopPropagation(); setShowObjectionModal(true); }}
                >
                  <MessageCircle size={14} /> E'tiroz
                </button>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Savol — bosing, javobni ko'ring
                </div>
                <div className="flashcard-front-text">{questions[currentQ].q}</div>
              </div>
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-back-text">
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    To'g'ri javob
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--green)', marginBottom: '12px' }}>
                    {questions[currentQ].opts[questions[currentQ].correct]?.replace(/^[A-D]\)\s*/, '')}
                  </div>
                  {questions[currentQ].explanation && (
                    <div style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.5' }}>
                      {questions[currentQ].explanation}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* FIX: Bilaman / Bilmayman tugmalari */}
          {fcFlipped ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                className="btn"
                style={{ flex: 1, maxWidth: '180px', background: 'var(--red-bg)', borderColor: 'var(--red)', color: 'var(--red)' }}
                onClick={() => { setFcFlipped(false); handleFlashcardKnown(false); }}
              >
                <ThumbsDown size={18} /> Bilmayman
              </button>
              <button
                className="btn"
                style={{ flex: 1, maxWidth: '180px', background: 'var(--green-bg)', borderColor: 'var(--green)', color: 'var(--green)' }}
                onClick={() => { setFcFlipped(false); handleFlashcardKnown(true); }}
              >
                <ThumbsUp size={18} /> Bilaman
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => { if (currentQ > 0) { setCurrentQ(prev => prev - 1); setFcFlipped(false); } }} disabled={currentQ === 0}>
                ← Oldingi
              </button>
              <button className="btn btn-outline" onClick={() => { if (currentQ < questions.length - 1) { setCurrentQ(prev => prev + 1); setFcFlipped(false); } }} disabled={currentQ === questions.length - 1}>
                Keyingi →
              </button>
            </div>
          )}
        </div>

      /* ============ Imtihon / Xatolar rejimi ============ */
      ) : (
        <div className="exam-mode-container">
          {!showResults ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="question-box glass-panel"
                style={{ position: 'relative', padding: '24px 16px' }}
              >
                <button
                  className="objection-btn"
                  onClick={() => setShowObjectionModal(true)}
                >
                  <MessageCircle size={14} /> E'tiroz
                </button>
                <div className="q-num">Savol {currentQ + 1} / {questions.length}</div>
                
                {/* Timer */}
                {mode === 'exam' && answers[currentQ] === undefined && (
                  <div className={`question-timer ${timeLeft <= 10 ? 'timer-danger' : timeLeft <= 20 ? 'timer-warning' : ''}`}>
                    <Clock size={14} />
                    <span>{timeLeft}s</span>
                    <div className="timer-bar-wrap">
                      <div
                        className="timer-bar-fill"
                        style={{
                          width: `${(timeLeft / QUESTION_TIMER_SECONDS) * 100}%`,
                          background: timeLeft <= 10 ? 'var(--red)' : timeLeft <= 20 ? 'var(--amber)' : 'var(--green)'
                        }}
                      />
                    </div>
                  </div>
                )}
                {answers[currentQ] === -1 && (
                  <div style={{ color: 'var(--red)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⏰ Vaqt tugadi!
                  </div>
                )}
                {/* Savol rasmi */}
                {questions[currentQ].image && (
                  <div style={{ margin: '0 0 16px', textAlign: 'center' }}>
                    <img
                      src={questions[currentQ].image}
                      alt="Savol rasmi"
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}
                {/* Savol matni */}
                {questions[currentQ].isHtml ? (
                  <div className="q-text" dangerouslySetInnerHTML={{ __html: questions[currentQ].q }} />
                ) : (
                  <div className="q-text" style={{ whiteSpace: 'pre-line' }}>{questions[currentQ].q}</div>
                )}
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
                      <div
                        key={i}
                        className={`option ${bg} ${!answered ? 'hoverable' : ''}`}
                        onClick={() => handleSelect(currentQ, i)}
                      >
                        <div className="opt-letter">{['A', 'B', 'C', 'D'][i]}</div>
                        <div className="opt-text">{opt.replace(/^[A-D]\)\s*/, '')}</div>
                      </div>
                    );
                  })}
                </div>

                {answers[currentQ] !== undefined && (
                  <>
                    <motion.div
                      ref={explanationRef}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`explanation-box ${answers[currentQ] === questions[currentQ].correct ? 'correct' : 'wrong'}`}
                    >

                      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                        {answers[currentQ] === questions[currentQ].correct ? '✓ To\'g\'ri' : '✗ Noto\'g\'ri'}
                      </div>
                      {questions[currentQ].explanation}
                    </motion.div>

                    {isUsefulMnemonic(questions[currentQ].mnemonic) && (
                      <div className="mnemonic-box">
                        <div className="mnemonic-icon">💡</div>
                        <div className="mnemonic-text">
                          <strong>Eslab qolish uchun:</strong><br />
                          {questions[currentQ].mnemonic}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            /* ===== Natija paneli ===== */
            <div className="result-panel glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {correctCount / questions.length >= 0.7 ? '🏆' : correctCount / questions.length >= 0.5 ? '📊' : '💪'}
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text)', fontWeight: '700', marginBottom: '8px' }}>
                {correctCount / questions.length >= 0.7 ? 'Ajoyib natija!' : 'Davom eting!'}
              </div>
              <div style={{ fontSize: '16px', color: 'var(--text2)', marginBottom: '24px' }}>
                {questions.length} ta savoldan {correctCount} tasiga to'g'ri javob berdingiz.
              </div>

              <div style={{ background: 'var(--bg3)', borderRadius: '16px', padding: '24px', display: 'inline-block', marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Natija
                </div>
                <div style={{
                  fontSize: '56px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  color: correctCount / questions.length >= 0.7 ? 'var(--green)' : correctCount / questions.length >= 0.5 ? 'var(--amber)' : 'var(--red)',
                  lineHeight: '1'
                }}>
                  {correctCount} <span style={{ fontSize: '32px', color: 'var(--text3)' }}>/ {questions.length}</span>
                </div>
                <div style={{ fontSize: '20px', marginTop: '8px', color: 'var(--text2)' }}>
                  {Math.round((correctCount / questions.length) * 100)}%
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                <button className="btn btn-primary" onClick={generateQuestions}>
                  <RefreshCw size={18} /> Yana ishlash
                </button>
                {state.mistakes.length > 0 && (
                  <button className="btn btn-outline" onClick={() => setMode('mistakes')}>
                    <Target size={18} /> Xatolar ustida ishlash
                  </button>
                )}
                <button className="btn btn-outline" onClick={goBack}>
                  <Home size={18} /> Boshqa bo'limga
                </button>

                {/* Ulashish tugmalari */}
                <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <Share2 size={13} /> Natijani ulashing
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, background: '#25D366', color: 'white', border: 'none', borderRadius: '10px' }}
                      onClick={() => {
                        const pct = Math.round((correctCount / questions.length) * 100);
                        const emoji = pct >= 70 ? '🏆' : pct >= 50 ? '📊' : '💪';
                        const text = `${emoji} IQRO platformasida test yechdim!\n📚 Mavzu: ${topicName}\n✅ Natija: ${correctCount}/${questions.length} (${pct}%)\n🎯 Imtihonga tayyorgarlik davom etmoqda!\n\niqro-platforma.firebaseapp.com`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, background: '#2AABEE', color: 'white', border: 'none', borderRadius: '10px' }}
                      onClick={() => {
                        const pct = Math.round((correctCount / questions.length) * 100);
                        const emoji = pct >= 70 ? '🏆' : pct >= 50 ? '📊' : '💪';
                        const text = `${emoji} IQRO platformasida test yechdim!\n📚 Mavzu: ${topicName}\n✅ Natija: ${correctCount}/${questions.length} (${pct}%)\n🎯 Imtihonga tayyorgarlik!`;
                        window.open(`https://t.me/share/url?url=https://iqro-platforma.firebaseapp.com&text=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ borderRadius: '10px' }}
                      onClick={() => {
                        const pct = Math.round((correctCount / questions.length) * 100);
                        const text = `IQRO platformasida test: ${correctCount}/${questions.length} (${pct}%) - ${topicName}`;
                        navigator.clipboard?.writeText(text);
                        showToast('Nusxalandi! 📋', 'info');
                      }}
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showResults && (
            <div className="q-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button
                disabled={currentQ === 0}
                className="btn btn-outline"
                onClick={() => setCurrentQ(prev => prev - 1)}
              >
                Orqaga
              </button>
              {Object.keys(answers).length === questions.length ? (
                <button className="btn btn-primary" onClick={() => setShowResults(true)}>
                  Natijani Ko'rish
                </button>
              ) : (
                <button
                  disabled={currentQ === questions.length - 1}
                  className="btn btn-outline"
                  onClick={() => setCurrentQ(prev => prev + 1)}
                >
                  Keyingi
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* E'tiroz Modal */}
      {showObjectionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Savol bo'yicha e'tiroz</div>
            <div className="modal-text">
              Ushbu savoldagi xatolik yoki kamchilikni yozib qoldiring. Bu platformani yaxshilashga yordam beradi.
            </div>
            <textarea
              className="modal-input"
              placeholder="Masalan: To'g'ri javob noto'g'ri ko'rsatilgan, yoki savolda imlo xatosi bor..."
              value={objectionText}
              onChange={(e) => setObjectionText(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => { setShowObjectionModal(false); setObjectionText(''); }}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleObjection}
                disabled={!objectionText.trim()}
              >
                Yuborish
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TestPage;
