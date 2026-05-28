import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Clock } from 'lucide-react';
import SafeHtml from '../shared/SafeHtml';
import QuestionMedia from '../QuestionMedia';

const QuestionBox = ({
  questions,
  currentQ,
  answers,
  topicId,
  topicName,
  mode,
  timerMode,
  setTimerMode,
  timeLeft,
  QUESTION_TIMER_SECONDS,
  accumulateTime,
  motivationText,
  comboCount,
  state,
  handleSelect,
  explanationRef,
  activeReviewTab,
  setActiveReviewTab,
  saveCustomMnemonic,
  setShowObjectionModal
}) => {
  const isUsefulMnemonic = (text) => text && !["Kalit so'zga e'tibor bering va javobni vizuallashtiring.", "Kalit so'zga e'tibor bering va javobni vizuallashtiring"].includes(text.trim());

  return (
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

        {/* ── Taymer / Sekundomer ── */}
        {mode === 'exam' && answers[currentQ] === undefined && (
          <div 
            onClick={() => {
              accumulateTime();
              if (timerMode === 'countdown') {
                setTimerMode('stopwatch');
              } else if (timerMode === 'stopwatch') {
                setTimerMode('off');
              } else {
                setTimerMode('countdown');
              }
            }}
            className={`question-timer ${timerMode === 'countdown' && timeLeft <= 10 ? 'timer-danger' : timerMode === 'countdown' && timeLeft <= 20 ? 'timer-warning' : ''}`}
            style={{ 
              cursor: 'pointer', 
              userSelect: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '6px 12px', 
              background: 'var(--bg3)', 
              borderRadius: '10px', 
              width: 'fit-content', 
              marginBottom: '12px',
              border: '1px solid var(--border)',
              transition: 'all 0.2s ease'
            }}
            title="Taymer rejimini o'zgartirish uchun bosing (Countdown -> Sekundomer -> O'chiq)"
          >
            <Clock size={14} color="var(--text2)" />
            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text2)' }}>
              {timerMode === 'countdown' && `${timeLeft}s (Taymer)`}
              {timerMode === 'stopwatch' && `${timeLeft}s (Sekundomer)`}
              {timerMode === 'off' && "Taymer: O'chiq"}
            </span>
            {timerMode === 'countdown' && (
              <div className="timer-bar-wrap" style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div className="timer-bar-fill" style={{ height: '100%', width: `${(timeLeft / QUESTION_TIMER_SECONDS) * 100}%`, background: timeLeft <= 10 ? 'var(--red)' : timeLeft <= 20 ? 'var(--amber)' : 'var(--green)' }} />
              </div>
            )}
          </div>
        )}
        {answers[currentQ] === -1 && <div style={{ color: 'var(--red)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>⏰ Vaqt tugadi!</div>}

        {/* ── Aqlli Badglar (Takrorlash & Zaif Nuqta) ── */}
        {(() => {
          const qHash = (questions[currentQ]?.q || '').substring(0, 100);
          const isSpaced = (state.spacedCards || []).some(card => card.qHash === qHash);
          const isWeak = (state.stats?.[state.activeCategory]?.mistakes || []).some(m => (m.question || '').substring(0, 100) === qHash);
          if (!isSpaced && !isWeak) return null;
          return (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {isSpaced && (
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#1E40AF', background: '#DBEAFE', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #BFDBFE' }}>
                  🔄 Takrorlash
                </span>
              )}
              {isWeak && (
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400E', background: '#FEF3C7', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #FDE68A' }}>
                  ⚠️ Zaif Nuqta
                </span>
              )}
            </div>
          );
        })()}

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
              <motion.div
                key={i}
                whileHover={!answered ? { y: -1, scale: 1.005 } : {}}
                whileTap={!answered ? { scale: 0.99 } : {}}
                className={`option ${bg} ${!answered ? 'hoverable' : ''}`}
                onClick={() => handleSelect(currentQ, i)}
                style={{ cursor: answered ? 'default' : 'pointer' }}
              >
                <div className="opt-letter">{['A', 'B', 'C', 'D'][i]}</div>
                <div className="opt-text">{opt.replace(/^[A-D]\)\s*/, '')}</div>
              </motion.div>
            );
          })}
        </div>
        
        {answers[currentQ] !== undefined && (
          <motion.div
            ref={explanationRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '16px',
              background: 'var(--bg2)',
              border: '1.5px solid var(--border)',
              borderRadius: '20px',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <button
                onClick={() => setActiveReviewTab('analysis')}
                style={{ flex: 1, padding: '12px', border: 'none', background: activeReviewTab === 'analysis' ? 'var(--bg2)' : 'transparent', color: activeReviewTab === 'analysis' ? 'var(--text)' : 'var(--text3)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeReviewTab === 'analysis' ? '2.5px solid #29B6F6' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
              >
                <span>📖 Tahlil</span>
              </button>
              <button
                onClick={() => setActiveReviewTab('notes')}
                style={{ flex: 1, padding: '12px', border: 'none', background: activeReviewTab === 'notes' ? 'var(--bg2)' : 'transparent', color: activeReviewTab === 'notes' ? 'var(--text)' : 'var(--text3)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeReviewTab === 'notes' ? '2.5px solid #29B6F6' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative', transition: 'all 0.2s' }}
              >
                <span>🧠 Eslatmalar</span>
                {(() => {
                  const qHash = (questions[currentQ]?.q || '').substring(0, 100);
                  if (state.customMnemonics?.[qHash]) {
                    return (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', position: 'absolute', top: '12px', right: '20px' }} />
                    );
                  }
                  return null;
                })()}
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px', textAlign: 'left' }}>
              {activeReviewTab === 'analysis' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', color: answers[currentQ] === questions[currentQ].correct ? 'var(--green)' : 'var(--red)', marginBottom: '12px' }}>
                    <span>{answers[currentQ] === questions[currentQ].correct ? "✓ To'g'ri" : "✗ Noto'g'ri"}</span>
                  </div>

                  {answers[currentQ] !== questions[currentQ].correct && answers[currentQ] >= 0 && (
                    <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', fontSize: '13px', lineHeight: '1.5' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text3)' }}>Siz tanladingiz:</span>{' '}
                        <span style={{ color: 'var(--red)', fontWeight: '600' }}>{questions[currentQ].opts[answers[currentQ]]?.replace(/^[A-D]\)\s*/, '')}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text3)' }}>To'g'ri javob:</span>{' '}
                        <span style={{ color: 'var(--green)', fontWeight: '600' }}>{questions[currentQ].opts[questions[currentQ].correct]?.replace(/^[A-D]\)\s*/, '')}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {questions[currentQ].explanation}
                  </div>
                </div>
              )}

              {activeReviewTab === 'notes' && (
                <div>
                  {isUsefulMnemonic(questions[currentQ].mnemonic) && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px dashed var(--amber)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', marginBottom: '14px', textAlign: 'left' }}>
                      <div style={{ fontSize: '18px' }}>💡</div>
                      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5' }}>
                        <strong>Tavsiya etilgan mnemonika:</strong><br />
                        {questions[currentQ].mnemonic}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const qHash = (questions[currentQ]?.q || '').substring(0, 100);
                    return (
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text3)', marginBottom: '6px' }}>
                          Shaxsiy eslatmangiz:
                        </label>
                        <textarea
                          placeholder="Ushbu savolni eslab qolish uchun shaxsiy assotsiatsiya yozing..."
                          value={state.customMnemonics?.[qHash] || ''}
                          onChange={(e) => saveCustomMnemonic(qHash, e.target.value)}
                          style={{ width: '100%', minHeight: '80px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s', lineHeight: '1.5' }}
                          onFocus={(e) => e.target.style.borderColor = '#29B6F6'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                            {(state.customMnemonics?.[qHash] || '').trim() ? '✓ Saqlandi' : "Eslatma keyingi safar ham ko'rsatiladi"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionBox;
