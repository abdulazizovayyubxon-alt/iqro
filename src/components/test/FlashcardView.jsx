import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import QuestionMedia from '../QuestionMedia';

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
  return (
    <div className="flash-mode-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{currentQ + 1} / {questions.length}</div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
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
            <button className="objection-btn" onClick={(e) => { e.stopPropagation(); setShowObjectionModal(true); }}>
              <MessageCircle size={14} /> {t('flashcard.objection')}
            </button>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('flashcard.frontHint')}</div>
            <QuestionMedia question={questions[currentQ]} />
            <div className="flashcard-front-text">{questions[currentQ].q}</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-back-text">
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('flashcard.correctAnswer')}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--green)', marginBottom: '12px' }}>{questions[currentQ].opts[questions[currentQ].correct]?.replace(/^[A-D]\)\s*/, '')}</div>
              {questions[currentQ].explanation && <div style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.5' }}>{questions[currentQ].explanation}</div>}
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
