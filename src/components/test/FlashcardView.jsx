import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import QuestionMedia from '../QuestionMedia';
import QuestionWatermark from '../shared/QuestionWatermark';
import SafeHtml from '../shared/SafeHtml';

const FlashcardView = ({
  questions,
  currentQ,
  setCurrentQ,
  fcFlipped,
  setFcFlipped,
  fcKnown,
  handleFlashcardKnown,
  setShowObjectionModal
}) => {
  const { t } = useTranslation();
  const q = questions[currentQ];
  if (!q) return null;
  const isHtmlQ = q.isHtml || (typeof q.q === 'string' && q.q.trim().startsWith('<'));
  const isHtmlExp = typeof q.explanation === 'string' && q.explanation.trim().startsWith('<');
  return (
    <div className="flash-mode-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)' }}>{currentQ + 1} / {questions.length}</div>
        <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--fs-md)' }}>
          <span style={{ color: 'var(--green)' }}>✓ {Object.values(fcKnown).filter(Boolean).length} {t('flashcard.know')}</span>
          <span style={{ color: 'var(--red)' }}>✗ {Object.values(fcKnown).filter(v => v === false).length} {t('flashcard.dontKnow')}</span>
        </div>
      </div>
      <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', marginBottom: '20px' }}>
        <div style={{ height: '100%', borderRadius: '2px', background: 'var(--accent)', width: `${((currentQ + 1) / questions.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>
      <div className="flashcard-wrap" onClick={() => setFcFlipped(!fcFlipped)}>
        <motion.div className={`flashcard ${fcFlipped ? 'flipped' : ''}`}>
          <div className="flashcard-face flashcard-front">
            <QuestionWatermark />
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{t('flashcard.frontHint')}</div>
              <button
                type="button"
                className="objection-btn"
                style={{ position: 'static', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); setShowObjectionModal(true); }}
              >
                <MessageCircle size={14} /> {t('flashcard.objection')}
              </button>
            </div>
            <div style={{ margin: 'auto 0', width: '100%' }}>
              <QuestionMedia question={q} />
              <div className="flashcard-front-text" style={{ whiteSpace: 'pre-line' }}>
                {isHtmlQ ? <SafeHtml html={q.q} /> : q.q}
              </div>
            </div>
          </div>
          <div className="flashcard-face flashcard-back">
            <QuestionWatermark />
            <div className="flashcard-back-text" style={{ margin: 'auto 0', width: '100%' }}>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('flashcard.correctAnswer')}</div>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: '700', color: 'var(--green)', marginBottom: '12px', whiteSpace: 'pre-line' }}>{q.opts?.[q.correct]?.replace(/^[A-D]\)\s*/, '')}</div>
              {q.explanation && (
                <div style={{ color: 'var(--text2)', fontSize: 'var(--fs-explain)', lineHeight: 'var(--lh-relaxed)', whiteSpace: 'pre-line' }}>
                  {isHtmlExp ? <SafeHtml html={q.explanation} /> : q.explanation}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      {fcFlipped ? (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
          <button className="btn" style={{ flex: 1, maxWidth: '180px', background: 'var(--red-bg)', borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => handleFlashcardKnown(false)}>
            <ThumbsDown size={18} /> {t('flashcard.btnDontKnow')}
          </button>
          <button className="btn" style={{ flex: 1, maxWidth: '180px', background: 'var(--green-bg)', borderColor: 'var(--green)', color: 'var(--green)' }} onClick={() => handleFlashcardKnown(true)}>
            <ThumbsUp size={18} /> {t('flashcard.btnKnow')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px' }}>
          <button className="btn btn-outline" onClick={() => { if (currentQ > 0) { setCurrentQ(prev => prev - 1); setFcFlipped(false); } }} disabled={currentQ === 0}>{t('flashcard.prev')}</button>
          <button className="btn btn-outline" onClick={() => { if (currentQ < questions.length - 1) { setCurrentQ(prev => prev + 1); setFcFlipped(false); } }} disabled={currentQ === questions.length - 1}>{t('flashcard.next')}</button>
        </div>
      )}
    </div>
  );
};

export default FlashcardView;
