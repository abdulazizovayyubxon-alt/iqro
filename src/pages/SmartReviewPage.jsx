import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext, getWeekId, getMonthId, POINTS_DUE_REVIEW } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ChevronRight, ArrowLeft, Zap, MessageCircle, Brain, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../utils/motion';
import { updateSpacedCard } from '../engine/SmartQuestionEngine';
import ObjectionModal from '../components/shared/ObjectionModal';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import PremiumModal from '../components/PremiumModal';
import { TOPICS, SUBJECTS } from '../data/mockData';
import FlashcardView from '../components/test/FlashcardView';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import { auth } from '../firebase';
import localforage from 'localforage';

const SmartReviewPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const goBack = () => navigate('/test');
  const { state, updateState, cloudSynced, saveCustomMnemonic } = useContext(AppContext);
  const { addObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(null); // null | index
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const nextButtonRef = useRef(null);

  // Flashcard rejimi (takror navbati kartalari uchun)
  const [studyMode, setStudyMode] = useState('mcq'); // 'mcq' | 'flashcard'
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcKnown, setFcKnown] = useState({});

  // Fan savollari — mustaqil (standalone) flashcard
  const [subjectFlashActive, setSubjectFlashActive] = useState(false);
  const [subjectFlashLoading, setSubjectFlashLoading] = useState(false);
  const [subjectQuestions, setSubjectQuestions] = useState([]);
  const [sfIdx, setSfIdx] = useState(0);
  const [sfFlipped, setSfFlipped] = useState(false);
  const [sfKnown, setSfKnown] = useState({});

  // Objection state
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Takror navbatini yuklash — sahifa ochilganda yoki fan almashganda qayta quriladi.
  // state.spacedCards qasddan dependency emas: har bir javobdan keyin ro'yxat sessiya
  // o'rtasida qayta tiklanib ketmasligi uchun (navbat sessiya davomida barqaror qoladi).
  useEffect(() => {
    if (!cloudSynced) return;
    // Joriy fanga mos keladigan mavzularni ajratib olish
    const validTopicIds = TOPICS.filter(t =>
      Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory
    ).map(t => t.id);

    const dueCards = (state.spacedCards || [])
      .filter(c => validTopicIds.includes(c.topicId)) // FAKAT o'z fanini chiqarish
      .filter(c => c.nextReview <= Date.now())
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, 20); // Bir sessiyada max 20 ta
    setCards(dueCards);
    setCurrentIdx(0);
    setAnswered(null);
    setSessionDone(false);
    setSessionStats({ correct: 0, wrong: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSynced, state.activeCategory]);

  // Mustaqil flashcard ochiq bo'lganda global yuqori menyu (header) yashiriladi —
  // alohida, fokuslangan ko'rinish. Chiqishda avtomatik tiklanadi.
  useEffect(() => {
    document.body.classList.toggle('flashcard-fullscreen', subjectFlashActive);
    return () => document.body.classList.remove('flashcard-fullscreen');
  }, [subjectFlashActive]);

  // Bepul limit tekshiruvi — BARCHA hooklardan keyin chaqiriladi (React Rules of Hooks)
  if (isFreeLimitReached) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{ maxWidth: 400, width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 24, padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>{t('test.limitTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28 }}>
            {t('test.limitText')}
          </div>
          <button style={{ width: '100%', padding: '15px', background: '#0E97E0', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }} onClick={() => setShowPremiumModal(true)}>
            {t('test.limitActivate')}
          </button>
          <button style={{ width: '100%', padding: '13px', background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)', borderRadius: 14, fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => navigate('/')}>{t('test.backHomeArrow')}</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  const handleAnswer = (optIdx) => {
    if (answered !== null) return;
    setAnswered(optIdx);

    const card = cards[currentIdx];
    const isCorrect = optIdx === card.correct;

    // spacedCards ni yangilash
    const updatedCards = [...(state.spacedCards || [])];
    const cardIdx = updatedCards.findIndex(c => c.qHash === card.qHash);
    if (cardIdx >= 0) {
      updatedCards[cardIdx] = updateSpacedCard(updatedCards[cardIdx], isCorrect);
    }

    // Vaqti kelgan takrorga to'g'ri javob — 1 ball (bu navbatda faqat due kartalar bor).
    // Flashcard "Bilaman/Bilmayman" rejimi ball bermaydi — o'z-o'zini baholash farmga ochiq.
    const weekId = getWeekId();
    const monthId = getMonthId();
    updateState({
      spacedCards: updatedCards,
      totalAnswered: (state.totalAnswered || 0) + 1,
      ...(isCorrect ? {
        totalScore: (state.totalScore || 0) + POINTS_DUE_REVIEW,
        [`weekly_${weekId}`]: (state[`weekly_${weekId}`] || 0) + POINTS_DUE_REVIEW,
        [`monthly_${monthId}`]: (state[`monthly_${monthId}`] || 0) + POINTS_DUE_REVIEW,
        totalCorrect: (state.totalCorrect || 0) + 1
      } : {})
    });

    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1)
    }));

    setTimeout(() => {
      nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  };

  const nextCard = () => {
    if (currentIdx + 1 >= cards.length) {
      setSessionDone(true);
      // Konfetti faqat kuchli sessiyaga (kamida 5 ta to'g'ri va ≥80% aniqlik)
      const acc = sessionStats.correct / Math.max(1, sessionStats.correct + sessionStats.wrong);
      if (sessionStats.correct >= 5 && acc >= 0.8 && !prefersReducedMotion()) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      return;
    }
    setCurrentIdx(prev => prev + 1);
    setAnswered(null);
  };

  const handleObjection = (text) => {
    const card = cards[currentIdx];
    addObjection(card.topicId, state.activeCategory, card, text);
    setShowObjectionModal(false);
    showToast(t('exam.toastObjectionSent'), 'success');
  };

  // Takror navbati kartalarini flashcard sifatida o'rganish — "Bilaman/Bilmayman"
  // bo'yicha spaced-repetition darajasi yangilanadi
  const handleFlashKnown = (known) => {
    const card = cards[currentIdx];
    if (!card) return;
    const updated = [...(state.spacedCards || [])];
    const idx = updated.findIndex(c => c.qHash === card.qHash);
    if (idx >= 0) {
      updated[idx] = updateSpacedCard(updated[idx], known);
      updateState({ spacedCards: updated });
    }
    setFcKnown(prev => ({ ...prev, [currentIdx]: known }));
    const newCorrect = sessionStats.correct + (known ? 1 : 0);
    const newWrong = sessionStats.wrong + (known ? 0 : 1);
    setSessionStats({ correct: newCorrect, wrong: newWrong });
    if (currentIdx + 1 >= cards.length) {
      setSessionDone(true);
      const acc = newCorrect / Math.max(1, newCorrect + newWrong);
      if (newCorrect >= 5 && acc >= 0.8 && !prefersReducedMotion()) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setCurrentIdx(prev => prev + 1);
      setFcFlipped(false);
    }
  };

  // Tanlangan fan savollarini MUSTAQIL flashcard ko'rinishida ochish (test oynasiga kirmasdan).
  // Savollar avval lokal keshdan, bo'lmasa API'dan yuklanadi.
  const startSubjectFlashcards = async () => {
    setSubjectFlashActive(true);
    setSubjectFlashLoading(true);
    setSubjectQuestions([]);
    setSfIdx(0); setSfFlipped(false); setSfKnown({});
    try {
      let raw = await localforage.getItem(`bundle_v2_${state.activeCategory}`);
      if (!raw || raw.length === 0) {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/get-questions?category=${state.activeCategory}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) raw = await res.json();
      }
      raw = Array.isArray(raw) ? raw : [];
      const validTopicIds = TOPICS
        .filter(t => Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory)
        .map(t => t.id);
      raw = raw.filter(q => q.category === state.activeCategory && validTopicIds.includes(q.topicId));
      raw = processQuestionsOnTheFly(raw);
      raw = [...raw].sort(() => 0.5 - Math.random()).slice(0, 30);
      setSubjectQuestions(raw);
    } catch (e) {
      console.error('Fan savollari flashcard yuklashda xatolik:', e);
      showToast(t('review.toastLoadError'), 'error');
    } finally {
      setSubjectFlashLoading(false);
    }
  };

  // Fan savollari flashcardida "Bilaman/Bilmayman" — keyingisiga o'tadi, oxirida yakunlaydi
  const handleSubjectFlashKnown = (known) => {
    setSfKnown(prev => ({ ...prev, [sfIdx]: known }));
    if (sfIdx < subjectQuestions.length - 1) {
      setSfIdx(prev => prev + 1);
      setSfFlipped(false);
    } else {
      const knownCount = Object.values({ ...sfKnown, [sfIdx]: known }).filter(Boolean).length;
      showToast(t('test.toastFlashcardDone', { known: knownCount, total: subjectQuestions.length }), 'info');
      setSubjectFlashActive(false);
    }
  };

  // Fan savollari — MUSTAQIL flashcard ko'rinishi (test oynasidan tashqarida, Takror ichida)
  if (subjectFlashActive) {
    const subjName = SUBJECTS.find(s => s.id === state.activeCategory)?.name || t('review.subjectQuestions');
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 700, margin: '0 auto', padding: '12px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px' }}>{t('review.flashcard')}</h1>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{subjName}</div>
          </div>
          <button onClick={() => setSubjectFlashActive(false)} style={{ width: 38, height: 38, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="var(--text2)" />
          </button>
        </div>
        {subjectFlashLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>{t('review.loadingQuestions')}</div>
          </div>
        ) : subjectQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t('review.noQuestionsForSubject')}</div>
            <div style={{ fontSize: 13 }}>{t('review.noQuestionsHint')}</div>
          </div>
        ) : (
          <FlashcardView
            questions={subjectQuestions}
            currentQ={sfIdx}
            setCurrentQ={setSfIdx}
            fcFlipped={sfFlipped}
            setFcFlipped={setSfFlipped}
            fcKnown={sfKnown}
            handleFlashcardKnown={handleSubjectFlashKnown}
            setShowObjectionModal={setShowObjectionModal}
          />
        )}
        <ObjectionModal
          isOpen={showObjectionModal}
          onClose={() => setShowObjectionModal(false)}
          questionText={subjectQuestions[sfIdx]?.q}
          onSubmit={(text) => {
            const q = subjectQuestions[sfIdx];
            if (q) addObjection(q.topicId, state.activeCategory, q, text);
            setShowObjectionModal(false);
            showToast(t('exam.toastObjectionSent'), 'success');
          }}
        />
      </motion.div>
    );
  }

  // Hech savol yo'q
  if (cards.length === 0 && !sessionDone) {
    const validTopicIds = TOPICS.filter(t => 
      Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory
    ).map(t => t.id);

    const categorySpacedCards = (state.spacedCards || []).filter(c => validTopicIds.includes(c.topicId));
    
    const totalSpaced = categorySpacedCards.length;
    const nextReview = totalSpaced > 0
      ? Math.min(...categorySpacedCards.map(c => c.nextReview))
      : null;
    const waitMinutes = nextReview ? Math.max(0, Math.round((nextReview - now) / 60000)) : 0;

    // Forecast Calculation
    const todayEnd = new Date().setHours(23, 59, 59, 999);
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const forecast = [
      { label: t('review.fToday'), count: 0 },
      { label: t('review.fTomorrow'), count: 0 },
      { label: t('review.fDay3'), count: 0 },
      { label: t('review.fDays47'), count: 0 },
      { label: t('review.fLater'), count: 0 },
    ];

    for (const card of categorySpacedCards) {
      const due = card.nextReview;
      if (due <= todayEnd) {
        forecast[0].count++;
      } else if (due <= todayEnd + oneDayMs) {
        forecast[1].count++;
      } else if (due <= todayEnd + 2 * oneDayMs) {
        forecast[2].count++;
      } else if (due <= todayEnd + 7 * oneDayMs) {
        forecast[3].count++;
      } else {
        forecast[4].count++;
      }
    }

    const maxCount = Math.max(...forecast.map(f => f.count), 1);

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(14,151,224,0.07) 0%, rgba(14,151,224,0.07) 100%), var(--bg2)', border: '1.5px solid rgba(14, 151, 224, 0.22)', borderRadius: 24, padding: '36px 24px', textAlign: 'center', marginTop: 24, boxShadow: '0 16px 40px rgba(14, 151, 224, 0.10)' }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0E97E0, #0B79B8)', boxShadow: '0 10px 24px rgba(14, 151, 224, 0.32)' }}>
            <Brain size={36} color="#fff" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.5px' }}>{t('review.noReviewTitle')}</div>
          {totalSpaced > 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28, fontWeight: 500 }}>
              {t('review.trackingCount', { count: totalSpaced })}<br />
              {t('review.nextReview', { wait: waitMinutes < 60 ? t('review.waitMinutes', { n: waitMinutes }) : waitMinutes < 1440 ? t('review.waitHours', { n: Math.round(waitMinutes / 60) }) : t('review.waitDays', { n: Math.round(waitMinutes / 1440) }) })}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28, fontWeight: 500 }}>
              {t('review.emptyHint1')}<br />
              {t('review.emptyHint2')}
            </div>
          )}

          {/* 📊 Visual Forecast Widget */}
          {totalSpaced > 0 && (
            <div style={{ 
              background: 'var(--bg3)', 
              borderRadius: 20, 
              padding: '20px 16px', 
              marginBottom: 32, 
              border: '1.5px solid var(--border)',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{t('review.forecastTitle')}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>{t('review.forecastSubtitle')}</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end', minHeight: 80, paddingBottom: 6 }}>
                {forecast.map((day, i) => {
                  const pct = (day.count / maxCount) * 100;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: day.count > 0 ? '#0E97E0' : 'var(--text3)' }}>
                        {day.count}
                      </span>
                      {/* Vertical progress bar */}
                      <div style={{ 
                        width: '100%', 
                        maxWidth: 24, 
                        height: 50, 
                        background: 'var(--bg2)', 
                        borderRadius: 6, 
                        overflow: 'hidden', 
                        display: 'flex', 
                        alignItems: 'end' 
                      }}>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                          style={{ 
                            width: '100%', 
                            background: day.count > 0 ? 'linear-gradient(0deg, #0E97E0 0%, #0B79B8 100%)' : 'var(--border)', 
                            borderRadius: '0 0 6px 6px' 
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text3)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto', boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}>
            <Play size={16} fill="currentColor" /> {t('review.doTest')}
          </motion.button>
        </div>

        {/* ═══ ALOHIDA BANNER: Fan savollarini flashcard qilish ═══ */}
        <motion.button
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={startSubjectFlashcards}
          style={{
            width: '100%', marginTop: 16,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            padding: '16px 18px', borderRadius: 20,
            border: '1.5px solid rgba(14, 151, 224, 0.25)',
            background: 'linear-gradient(135deg, rgba(14,151,224,0.10) 0%, rgba(14,151,224,0.10) 100%)',
            cursor: 'pointer', fontFamily: 'inherit',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(14, 151, 224, 0.10)'
          }}
        >
          <motion.div
            animate={{ x: ['-120%', '220%'] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear', repeatDelay: 1.5 }}
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '35%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', transform: 'skewX(-20deg)' }}
          />
          <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0E97E0, #0B79B8)', boxShadow: '0 4px 12px rgba(14, 151, 224, 0.3)', position: 'relative', zIndex: 1 }}>
            <Zap size={22} color="#fff" />
          </div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>{t('review.subjectFlashTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, lineHeight: 1.4 }}>{t('review.subjectFlashDesc')}</div>
          </div>
          <ChevronRight size={20} color="var(--accent)" style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
        </motion.button>
      </motion.div>
    );
  }

  // Sessiya yakunlandi
  if (sessionDone) {
    const total = sessionStats.correct + sessionStats.wrong;
    const pct = Math.round((sessionStats.correct / total) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '40px 28px', textAlign: 'center', marginTop: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 52, marginBottom: 12, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>{pct >= 70 ? '🎉' : '💪'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: 'var(--text)', letterSpacing: '-0.5px' }}>{t('review.sessionDone')}</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ textAlign: 'center', background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.15)', borderRadius: 16, padding: '16px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#16A34A' }}>{sessionStats.correct}</div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>{t('exam.statCorrect')}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', borderRadius: 16, padding: '16px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#DC2626' }}>{sessionStats.wrong}</div>
              <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, marginTop: 4 }}>{t('exam.statWrong')}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.7, fontWeight: 500 }}>
            {t('review.doneHint')}
          </div>
          <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto', boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}>
            <Play size={16} fill="currentColor" /> {t('review.doTest')}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Savol ko'rsatish
  const card = cards[currentIdx];
  const isCorrect = answered !== null && answered === card.correct;
  const levelNames = t('review.levels', { returnObjects: true });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 700, margin: '0 auto', padding: '12px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px' }}>{t('review.title')}</h1>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t('review.cardCount', { current: currentIdx + 1, total: cards.length })}</div>
        </div>
        <button onClick={goBack} style={{ width: 38, height: 38, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text2)" />
        </button>
      </div>

      {/* O'rganish rejimi: Test / Flashcard + Fan savollari decki */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, padding: 3, gap: 2 }}>
          {[['mcq', t('review.modeTest')], ['flashcard', t('review.modeFlashcard')]].map(([m, label]) => (
            <button key={m} onClick={() => { setStudyMode(m); setFcFlipped(false); setAnswered(null); }}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                background: studyMode === m ? 'var(--bg)' : 'transparent',
                color: studyMode === m ? 'var(--text)' : 'var(--text3)',
                boxShadow: studyMode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={startSubjectFlashcards}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
          <Zap size={14} color="var(--accent)" /> {t('review.subjectQuestionsBtn')}
        </button>
      </div>

      {/* Progress (faqat test rejimida — flashcardning o'z progressi bor) */}
      {studyMode === 'mcq' && (
        <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ width: `${((currentIdx + 1) / cards.length) * 100}%`, height: '100%', background: '#0E97E0', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      )}

      {studyMode === 'flashcard' ? (
        <FlashcardView
          questions={cards}
          currentQ={currentIdx}
          setCurrentQ={setCurrentIdx}
          fcFlipped={fcFlipped}
          setFcFlipped={setFcFlipped}
          fcKnown={fcKnown}
          handleFlashcardKnown={handleFlashKnown}
          setShowObjectionModal={setShowObjectionModal}
        />
      ) : (
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.15 }}>
          <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '24px 20px', maxWidth: 700, margin: '0 auto' }}>

            {/* Header: Daraja + Stats + Objection */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                <Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                {levelNames[card.level || 0]}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>✅ {sessionStats.correct}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>❌ {sessionStats.wrong}</span>
                <button onClick={() => setShowObjectionModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', fontSize: 11, fontWeight: 600, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <MessageCircle size={13} /> {t('test.objection')}
                </button>
              </div>
            </div>

            <QuestionMedia question={card} />
            {card.isHtml ? (
              <SafeHtml html={card.q} style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.6, marginBottom: 20, color: 'var(--text)' }} />
            ) : (
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.6, marginBottom: 20, color: 'var(--text)', whiteSpace: 'pre-line' }}>{card.q}</div>
            )}

            {/* Variantlar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.opts.map((opt, i) => {
                let bg = 'var(--bg3)', border = '1.5px solid var(--border)', color = 'var(--text2)';
                if (answered !== null) {
                  if (i === card.correct) { bg = 'rgba(22, 163, 74, 0.12)'; border = '1.5px solid var(--green)'; color = 'var(--text)'; }
                  else if (i === answered && i !== card.correct) { bg = 'rgba(220, 38, 38, 0.12)'; border = '1.5px solid var(--red)'; color = 'var(--text)'; }
                  else { bg = 'var(--bg3)'; color = 'var(--text3)'; border = '1px solid var(--glass-border)'; }
                } else {
                  border = '1px solid var(--glass-border)';
                  bg = 'var(--glass-bg)';
                }
                return (
                  <motion.button
                    key={i}
                    whileHover={answered === null ? { y: -1, scale: 1.005 } : {}}
                    whileTap={answered === null ? { scale: 0.99 } : {}}
                    onClick={() => handleAnswer(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, textAlign: 'left', border, background: bg, cursor: answered !== null ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color, transition: 'background 0.2s, border-color 0.2s' }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: answered !== null && i === card.correct ? '#16A34A' : answered === i && i !== card.correct ? '#DC2626' : 'var(--bg3)', color: answered !== null && (i === card.correct || i === answered) ? '#fff' : 'var(--text3)' }}>
                      {answered !== null && i === card.correct ? <CheckCircle size={15} /> : answered === i && i !== card.correct ? <XCircle size={15} /> : ['A','B','C','D'][i]}
                    </div>
                    {opt.replace(/^[A-D]\)\s*/, '')}
                  </motion.button>
                );
              })}
            </div>

            {/* Tushuntirish */}
            {answered !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16 }}>
                <div style={{ padding: '14px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.6, background: isCorrect ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)', border: `1px solid ${isCorrect ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.25)'}`, color: 'var(--text2)', marginBottom: 14 }}>
                  <strong style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>{isCorrect ? t('review.correctMark') : t('review.wrongMark')}</strong>{' '}{card.explanation || ''}
                </div>

                {(() => {
                  const qHash = (card.q || '').substring(0, 100);
                  return (
                    <div style={{ marginBottom: 16 }}>
                      {state.customMnemonics?.[qHash] && (
                        <div style={{ borderColor: 'var(--amber)', background: 'rgba(245, 158, 11, 0.05)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 18 }}>🧠</div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}><strong>{t('review.yourNote')}</strong><br />{state.customMnemonics[qHash]}</div>
                        </div>
                      )}
                      <div className="custom-mnemonic-box" style={{
                        background: 'var(--glass-bg)',
                        border: '1.5px dashed var(--border)',
                        borderRadius: '16px',
                        padding: '14px',
                        textAlign: 'left',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text2)' }}>
                          <span>{t('review.personalMnemonic')}</span>
                        </div>
                        <textarea
                          placeholder={t('review.notePlaceholder')}
                          value={state.customMnemonics?.[qHash] || ''}
                          onChange={(e) => saveCustomMnemonic(qHash, e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            background: 'var(--bg3)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            color: 'var(--text)',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#0E97E0'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                            {(state.customMnemonics?.[qHash] || '').trim() ? t('test.noteSaved') : t('review.noteHint')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <button ref={nextButtonRef} onClick={nextCard} style={{ width: '100%', padding: '14px', background: '#0E97E0', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {currentIdx + 1 >= cards.length ? t('review.finish') : t('review.nextCard')} <ChevronRight size={18} />
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      )}

      <ObjectionModal isOpen={showObjectionModal} onClose={() => setShowObjectionModal(false)} questionText={cards[currentIdx]?.q} onSubmit={handleObjection} />
    </motion.div>
  );
};

export default SmartReviewPage;
