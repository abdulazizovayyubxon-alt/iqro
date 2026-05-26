import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, XCircle, Clock, ChevronRight, ArrowLeft, Zap, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { updateSpacedCard } from '../engine/SmartQuestionEngine';
import ObjectionModal from '../components/shared/ObjectionModal';
import SafeHtml from '../components/shared/SafeHtml';
import QuestionMedia from '../components/QuestionMedia';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import PremiumModal from '../components/PremiumModal';
import { TOPICS } from '../data/mockData';

const SmartReviewPage = () => {
  const navigate = useNavigate();
  const goBack = () => navigate('/test');
  const { state, updateState, cloudSynced } = useContext(AppContext);
  const { addObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(null); // null | index
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [sessionDone, setSessionDone] = useState(false);

  // Objection state
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const { user } = useAuth();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { isTrialExpired: isFreeLimitReached } = useTrialExpiry();

  const hasLoadedRef = useRef(false);

  if (isFreeLimitReached) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{ maxWidth: 400, width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 24, padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>Bepul Limit Tugadi</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28 }}>7 kunlik sinov yakunlandi! Premium rejimni faollashtiring.</div>
          <button style={{ width: '100%', padding: '15px', background: '#29B6F6', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }} onClick={() => setShowPremiumModal(true)}>
            ⭐ Premium Rejimni Faollashtirish
          </button>
          <button style={{ width: '100%', padding: '13px', background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)', borderRadius: 14, fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }} onClick={goBack}>← Dashboard</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  useEffect(() => {
    if (!cloudSynced) return;
    if (hasLoadedRef.current) return;

    // Hozir takrorlash kerak bo'lgan savollarni filtrlash
    const now = Date.now();
    
    // Joriy fanga mos keladigan mavzularni ajratib olish
    const validTopicIds = TOPICS.filter(t => 
      Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory
    ).map(t => t.id);

    const allCards = (state.spacedCards || [])
      .filter(c => validTopicIds.includes(c.topicId)) // FAKAT o'z fanini chiqarish
      .filter(c => c.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, 20); // Bir sessiyada max 20 ta
    setCards(allCards);
    setCurrentIdx(0);
    setAnswered(null);
    setSessionDone(false);
    setSessionStats({ correct: 0, wrong: 0 });
    hasLoadedRef.current = true;
  }, [cloudSynced, state.activeCategory, state.spacedCards]);

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
    updateState({ spacedCards: updatedCards });

    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1)
    }));
  };

  const nextCard = () => {
    if (currentIdx + 1 >= cards.length) {
      setSessionDone(true);
      if (sessionStats.correct > sessionStats.wrong) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
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
    showToast("E'tiroz yuborildi!", 'success');
  };

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
    const waitMinutes = nextReview ? Math.max(0, Math.round((nextReview - Date.now()) / 60000)) : 0;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '44px 28px', textAlign: 'center', marginTop: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 52, marginBottom: 14, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.5px' }}>Hozircha takrorlash kerak emas!</div>
          {totalSpaced > 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>
              Jami <strong style={{ color: 'var(--text)' }}>{totalSpaced}</strong> ta savol kuzatilmoqda.<br />
              Keyingi takrorlash: <strong style={{ color: '#29B6F6' }}>{waitMinutes < 60 ? `${waitMinutes} daqiqa` : waitMinutes < 1440 ? `${Math.round(waitMinutes / 60)} soat` : `${Math.round(waitMinutes / 1440)} kun`}</strong> dan keyin
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>
              Testlarda xato qilganingizda savollar avtomatik ravishda bu yerga qo'shiladi.<br />
              Boshqa testlarni yechib boring!
            </div>
          )}
          <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)' }}>
            <ArrowLeft size={16} /> Bosh sahifaga
          </motion.button>
        </div>
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
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: 'var(--text)', letterSpacing: '-0.5px' }}>Takrorlash tugadi!</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ textAlign: 'center', background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.15)', borderRadius: 16, padding: '16px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#16A34A' }}>{sessionStats.correct}</div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>TO'G'RI</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', borderRadius: 16, padding: '16px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#DC2626' }}>{sessionStats.wrong}</div>
              <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, marginTop: 4 }}>XATO</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.7, fontWeight: 500 }}>
            Xato savollar <strong style={{ color: 'var(--text)' }}>10 daqiqa</strong>dan keyin qaytadan ko'rsatiladi.<br />
            To'g'ri savollar keyingi bosqichga o'tdi!
          </div>
          <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)' }}>
            <ArrowLeft size={16} /> Bosh sahifaga
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Savol ko'rsatish
  const card = cards[currentIdx];
  const isCorrect = answered !== null && answered === card.correct;
  const isWrong = answered !== null && answered !== card.correct;
  const levelNames = ['Yangi', '10 daqiqa', '1 soat', '6 soat', '1 kun', '3 kun', '1 hafta'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 700, margin: '0 auto', padding: '12px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px' }}>🧠 Aqlli Takrorlash</h1>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{currentIdx + 1} / {cards.length} savol</div>
        </div>
        <button onClick={goBack} style={{ width: 38, height: 38, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--text2)" />
        </button>
      </div>

      {/* Progress */}
      <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ width: `${((currentIdx + 1) / cards.length) * 100}%`, height: '100%', background: '#29B6F6', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

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
                  <MessageCircle size={13} /> E'tiroz
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
                  <strong style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>{isCorrect ? '✅ To\'g\'ri!' : '❌ Noto\'g\'ri!'}</strong>{' '}{card.explanation || ''}
                </div>
                <button onClick={nextCard} style={{ width: '100%', padding: '14px', background: '#29B6F6', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {currentIdx + 1 >= cards.length ? 'Yakunlash' : 'Keyingi savol'} <ChevronRight size={18} />
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <ObjectionModal isOpen={showObjectionModal} onClose={() => setShowObjectionModal(false)} questionText={cards[currentIdx]?.q} onSubmit={handleObjection} />
    </motion.div>
  );
};

export default SmartReviewPage;
