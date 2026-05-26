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
import { RefreshCw, ArrowLeft, Home, Target, PenTool, Zap, MessageCircle, ThumbsUp, ThumbsDown, Clock, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import ObjectionModal from '../components/shared/ObjectionModal';
import PremiumModal from '../components/PremiumModal';
import FreeMonthBanner from '../components/FreeMonthBanner';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
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
  const goBack = () => navigate('/test');
  const { addObjection } = useContext(ObjectionContext);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { isTrialExpired: isFreeLimitReached } = useTrialExpiry();

  // Bepul limit tekshiruvi ({} ta savol)
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

  // Mini-darslik va ko'rilgan mavzular xotirasi
  const [showTheory, setShowTheory] = useState(false);
  const [seenTheoryTopics, setSeenTheoryTopics] = useState({});

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
  }, [topicId, mode, state.activeCategory]);

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
          // MUHIM: topicId va category ikkalasini birga filtrlaymiz
          // Bu boshqa fanning savollarini aralashtirmasligini ta'minlaydi
          const topicObj = TOPICS.find(t => t.id === topicId);
          const expectedCategory = topicObj ? topicObj.category : state.activeCategory;
          qQuery = query(qRef, where('topicId', '==', topicId), where('category', '==', expectedCategory));
        } else {
          qQuery = query(qRef, where('category', '==', state.activeCategory));
        }

        const snap = await getDocs(qQuery);
        let rawList = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // BAZADAGI XATOLIKLARNI OLDINI OLISH: Faqat joriy fan mavzularini qoldiramiz
        const validTopicIds = TOPICS.filter(t => 
          Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory
        ).map(t => t.id);
        
        rawList = rawList.filter(q => validTopicIds.includes(q.topicId));

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
    batchCommitResults(results);
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 24, padding: '32px 24px', textAlign: 'center', maxWidth: 520, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <h2 style={{ marginBottom: 8, color: '#0F172A', fontSize: 22, fontWeight: 900 }}>Qisqacha Eslatma</h2>
          <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>
            Testni boshlashdan oldin quyidagi ma'lumotlarni yodga oling:
          </p>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: '#334155', marginBottom: 28, textAlign: 'left', background: '#F8FAFC', padding: '18px 20px', borderRadius: 16, border: '1px solid #E2E8F0' }}>
            {topicObj?.theoryHint}
          </div>
          <button
            style={{ width: '100%', padding: '16px', background: '#29B6F6', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => setShowTheory(false)}
          >
            O'qib chiqdim — Testni boshlash
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 700, margin: '0 auto', padding: '12px 16px 80px' }}>
      <FreeMonthBanner onPayClick={() => setShowPremiumModal(true)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #F1F5F9', marginBottom: 12 }}>
        <button
          onClick={() => navigate('/')}
          style={{ width: 38, height: 38, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <ArrowLeft size={18} color="var(--text2)" />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topicName}</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            {questions.length} savol{mode !== 'mistakes' && selectedBatch + 1 > 0 ? ` · Blok ${selectedBatch + 1}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMode(mode === 'flash' ? 'exam' : 'flash')}
            style={{ background: mode === 'flash' ? '#29B6F6' : '#F1F5F9', border: 'none', borderRadius: 10, color: mode === 'flash' ? '#fff' : '#64748B', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
          >
            <Zap size={15} />
            <span className="hide-mobile">Flashcard</span>
          </button>
          <button
            onClick={generateQuestions}
            style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, color: '#64748B', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {/* Subject Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '12px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
        paddingLeft: '2px',
        paddingRight: '2px',
      }}>
        {SUBJECTS.map(subj => {
          const Icon = subj.icon;
          const isSelected = subj.id === state.activeCategory;
          return (
            <button
              key={subj.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '12px',
                border: '1.5px solid',
                background: isSelected ? '#29B6F6' : 'var(--bg2)',
                color: isSelected ? '#fff' : 'var(--text2)',
                borderColor: isSelected ? '#29B6F6' : 'var(--border)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                boxShadow: isSelected ? '0 4px 12px rgba(41,182,246,0.3)' : 'none',
              }}
              onClick={() => {
                updateState({ activeCategory: subj.id, topicId: -1 });
              }}
            >
              <Icon size={14} />
              <span>{subj.name}</span>
            </button>
          );
        })}
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
        <div 
          className="glass-panel" 
          style={{ 
            padding: '48px 32px', 
            textAlign: 'center', 
            maxWidth: '500px', 
            margin: '40px auto', 
            borderRadius: '24px', 
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, var(--glass-bg), rgba(255, 255, 255, 0.03))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glowing background orb */}
          <div style={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            background: mode === 'mistakes' 
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' 
              : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {mode === 'mistakes' ? (
              <>
                <div 
                  className="float-animation" 
                  style={{ 
                    fontSize: '56px', 
                    marginBottom: '20px', 
                    filter: 'drop-shadow(0 10px 15px rgba(16, 185, 129, 0.2))',
                    display: 'inline-block'
                  }}
                >
                  🏆
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>
                  Hozircha xatolar yo'q
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px', maxWidth: '340px', margin: '0 auto 28px' }}>
                  Ajoyib natija! Siz hali birorta ham xato qilmadingiz yoki barcha xatolaringizni muvaffaqiyatli tuzatdingiz.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-outline" onClick={goBack}>
                    <ArrowLeft size={16} /> Fanni almashtirish
                  </button>
                </div>
              </>
            ) : (
              <>
                <div 
                  className="float-animation" 
                  style={{ 
                    fontSize: '56px', 
                    marginBottom: '20px', 
                    filter: 'drop-shadow(0 10px 15px rgba(59, 130, 246, 0.2))',
                    display: 'inline-block'
                  }}
                >
                  ⏳
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>
                  Mavzu tayyorlanmoqda
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px', maxWidth: '340px', margin: '0 auto 28px' }}>
                  Ushbu bo'lim uchun savollar hozirda yuklanish jarayonida yoki tez orada qo'shiladi. Boshqa bo'lim yoki fanni sinab ko'ring.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  {topicId !== -1 && (
                    <button className="btn btn-primary" style={{ width: '220px' }} onClick={() => setTopicId(-1)}>
                      📚 Barcha mavzular
                    </button>
                  )}
                  <button className="btn btn-outline" style={{ width: '220px' }} onClick={goBack}>
                    <ArrowLeft size={16} /> Boshqa fanni tanlash
                  </button>
                </div>
              </>
            )}
          </div>
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
            <div style={{ height: '100%', borderRadius: '2px', background: 'var(--accent)', width: `${((currentQ + 1) / questions.length) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
          <div className="flashcard-wrap" onClick={() => setFcFlipped(!fcFlipped)}>
            <motion.div className={`flashcard ${fcFlipped ? 'flipped' : ''}`}>
              <div className="flashcard-face flashcard-front">
                <button className="objection-btn" onClick={(e) => { e.stopPropagation(); setShowObjectionModal(true); }}><MessageCircle size={14} /> E'tiroz</button>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Savol — bosing, javobni ko'ring</div>
                <QuestionMedia question={questions[currentQ]} />
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
              <motion.div key={currentQ} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '20px 16px' }}>

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

                <QuestionMedia question={questions[currentQ]} />
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
            <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{correctCount / questions.length >= 0.7 ? '🏆' : correctCount / questions.length >= 0.5 ? '📊' : '💪'}</div>
              <div style={{ fontSize: 22, color: 'var(--text)', fontWeight: 900, marginBottom: 6 }}>{correctCount / questions.length >= 0.7 ? 'Ajoyib natija!' : 'Davom eting!'}</div>
              <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>{questions.length} ta savoldan {correctCount} tasiga to'g'ri javob berdingiz.</div>
              <div style={{ background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '24px 32px', display: 'inline-block', marginBottom: 28 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Natija</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: correctCount / questions.length >= 0.7 ? '#10B981' : correctCount / questions.length >= 0.5 ? '#F59E0B' : '#EF4444', lineHeight: 1 }}>{correctCount} <span style={{ fontSize: 28, color: '#CBD5E1' }}>/ {questions.length}</span></div>
                <div style={{ fontSize: 20, marginTop: 8, color: 'var(--text2)', fontWeight: 700 }}>{Math.round((correctCount / questions.length) * 100)}%</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
                <button style={{ padding: '14px', background: '#29B6F6', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={generateQuestions}><RefreshCw size={17} /> Yana ishlash</button>
                {state.mistakes?.length > 0 && <button style={{ padding: '13px', background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setMode('mistakes')}><Target size={16} /> Xatolar ustida ishlash</button>}
                <button style={{ padding: '13px', background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => navigate('/test')}><Home size={16} /> Bosh sahifaga</button>
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
