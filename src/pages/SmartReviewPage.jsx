import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, XCircle, Clock, ChevronRight, ArrowLeft, Zap, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

// Intervallar (daqiqada): 10min, 1soat, 6soat, 1kun, 3kun, 7kun
const INTERVALS = [10, 60, 360, 1440, 4320, 10080];

const SmartReviewPage = ({ goBack }) => {
  const { state, updateState } = useContext(AppContext);
  const { addObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(null); // null | index
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [sessionDone, setSessionDone] = useState(false);

  // Objection state
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [objectionText, setObjectionText] = useState('');

  useEffect(() => {
    // Hozir takrorlash kerak bo'lgan savollarni filtrlash
    const now = Date.now();
    const allCards = (state.spacedCards || [])
      .filter(c => c.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, 20); // Bir sessiyada max 20 ta
    setCards(allCards);
    setCurrentIdx(0);
    setAnswered(null);
    setSessionDone(false);
    setSessionStats({ correct: 0, wrong: 0 });
  }, []);

  const handleAnswer = (optIdx) => {
    if (answered !== null) return;
    setAnswered(optIdx);

    const card = cards[currentIdx];
    const isCorrect = optIdx === card.correct;

    // spacedCards ni yangilash
    const updatedCards = [...(state.spacedCards || [])];
    const cardIdx = updatedCards.findIndex(c => c.qHash === card.qHash);
    if (cardIdx >= 0) {
      if (isCorrect) {
        const newLevel = Math.min((updatedCards[cardIdx].level || 0) + 1, INTERVALS.length - 1);
        updatedCards[cardIdx] = {
          ...updatedCards[cardIdx],
          level: newLevel,
          correctStreak: (updatedCards[cardIdx].correctStreak || 0) + 1,
          nextReview: Date.now() + INTERVALS[newLevel] * 60 * 1000,
          lastReview: Date.now()
        };
      } else {
        updatedCards[cardIdx] = {
          ...updatedCards[cardIdx],
          level: 0,
          correctStreak: 0,
          nextReview: Date.now() + INTERVALS[0] * 60 * 1000,
          lastReview: Date.now()
        };
      }
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

  const handleObjection = () => {
    if (objectionText.trim()) {
      const card = cards[currentIdx];
      addObjection(card.topicId, state.activeCategory, card, objectionText);
      setObjectionText('');
      setShowObjectionModal(false);
      showToast("E'tiroz yuborildi!", 'success');
    }
  };

  // Hech savol yo'q
  if (cards.length === 0 && !sessionDone) {
    const totalSpaced = (state.spacedCards || []).length;
    const nextReview = totalSpaced > 0
      ? Math.min(...(state.spacedCards || []).map(c => c.nextReview))
      : null;
    const waitMinutes = nextReview ? Math.max(0, Math.round((nextReview - Date.now()) / 60000)) : 0;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
        <div className="glass-panel" style={{ maxWidth: 550, margin: '40px auto', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>
            Hozircha takrorlash kerak emas!
          </div>
          {totalSpaced > 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              Jami <strong>{totalSpaced}</strong> ta savol kuzatilmoqda.<br />
              Keyingi takrorlash: <strong>{waitMinutes < 60 ? `${waitMinutes} daqiqa` : waitMinutes < 1440 ? `${Math.round(waitMinutes/60)} soat` : `${Math.round(waitMinutes/1440)} kun`}</strong> dan keyin
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              Testlarda xato qilganingizda savollar avtomatik ravishda bu yerga qo'shiladi.<br />
              Boshqa testlarni yechib boring!
            </div>
          )}
          <button className="btn btn-primary" onClick={goBack}>
            <ArrowLeft size={16} /> Bosh sahifaga
          </button>
        </div>
      </motion.div>
    );
  }

  // Sessiya yakunlandi
  if (sessionDone) {
    const total = sessionStats.correct + sessionStats.wrong;
    const pct = Math.round((sessionStats.correct / total) * 100);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
        <div className="glass-panel" style={{ maxWidth: 500, margin: '40px auto', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{pct >= 70 ? '🎉' : '💪'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>
            Takrorlash tugadi!
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--green)' }}>{sessionStats.correct}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>TO'G'RI</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--red)' }}>{sessionStats.wrong}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>XATO</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
            Xato savollar <strong>10 daqiqa</strong>dan keyin qaytadan ko'rsatiladi.<br />
            To'g'ri savollar keyingi bosqichga o'tdi!
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={goBack}>
              <ArrowLeft size={16} /> Bosh sahifaga
            </button>
          </div>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-outline btn-sm" onClick={goBack}>
          <ArrowLeft size={14} /> Orqaga
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} style={{ color: 'var(--blue)' }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Aqlli Takrorlash</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>
          {currentIdx + 1} / {cards.length}
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg3)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ width: `${((currentIdx + 1) / cards.length) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.15 }}
        >
          <div className="glass-panel" style={{ padding: 28, maxWidth: 700, margin: '0 auto', position: 'relative' }}>
            <button
              className="objection-btn"
              style={{ position: 'absolute', top: 12, right: 12 }}
              onClick={() => setShowObjectionModal(true)}
            >
              <MessageCircle size={14} /> E'tiroz
            </button>
            {/* Daraja badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: 'var(--blue-bg)', color: 'var(--blue)', textTransform: 'uppercase'
              }}>
                <Clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                Daraja: {levelNames[card.level || 0]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                ✅ {sessionStats.correct} &nbsp; ❌ {sessionStats.wrong}
              </div>
            </div>

            {/* Savol */}
            {card.isHtml ? (
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, marginBottom: 24, color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: card.q }} />
            ) : (
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, marginBottom: 24, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                {card.q}
              </div>
            )}

            {/* Variantlar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {card.opts.map((opt, i) => {
                let style = {
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, textAlign: 'left',
                  border: '1.5px solid var(--border)', background: 'var(--bg2)',
                  cursor: answered !== null ? 'default' : 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                  fontSize: 15, fontWeight: 500, color: 'var(--text2)',
                };

                if (answered !== null) {
                  if (i === card.correct) {
                    style.border = '2px solid var(--green)';
                    style.background = 'var(--green-bg)';
                    style.color = 'var(--text)';
                  } else if (i === answered && i !== card.correct) {
                    style.border = '2px solid var(--red)';
                    style.background = 'var(--red-bg)';
                    style.color = 'var(--text)';
                  } else {
                    style.opacity = 0.5;
                  }
                }

                return (
                  <button key={i} onClick={() => handleAnswer(i)} style={style}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: answered !== null && i === card.correct ? 'var(--green)' : answered === i ? 'var(--red)' : 'var(--bg3)',
                      color: answered !== null && (i === card.correct || i === answered) ? 'white' : 'var(--text3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13
                    }}>
                      {answered !== null && i === card.correct ? <CheckCircle size={16} /> :
                       answered === i && i !== card.correct ? <XCircle size={16} /> :
                       ['A', 'B', 'C', 'D'][i]}
                    </div>
                    {opt.replace(/^[A-D]\)\s*/, '')}
                  </button>
                );
              })}
            </div>

            {/* Tushuntirish va keyingi */}
            {answered !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
                <div style={{
                  padding: '14px 18px', borderRadius: 12, fontSize: 14, lineHeight: 1.6,
                  background: isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  color: 'var(--text2)', marginBottom: 16
                }}>
                  <strong>{isCorrect ? '✅ To\'g\'ri!' : '❌ Noto\'g\'ri!'}</strong>{' '}
                  {card.explanation || ''}
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={nextCard}>
                  {currentIdx + 1 >= cards.length ? 'Yakunlash' : 'Keyingi savol'} <ChevronRight size={18} />
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* E'TIROZ MODALI */}
      {showObjectionModal && (
        <div className="modal-overlay" onClick={() => setShowObjectionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ E'tiroz bildirish</div>
            <div className="modal-text" style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong>Savol:</strong> {card.q}
            </div>
            <textarea
              className="modal-input"
              placeholder="Muammo yoki xatolikni tushuntiring..."
              value={objectionText}
              onChange={e => setObjectionText(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowObjectionModal(false)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleObjection}>Yuborish</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SmartReviewPage;
