import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Target, Home, Share2, ArrowRight, Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResultShareCard from '../shared/ResultShareCard';

const TestResults = ({
  correctCount,
  earnedPoints,
  questionsLength,
  topicName,
  state,
  setMode,
  generateQuestions,
  navigate,
  showToast,
  nextBatchLabel,
  onNextBatch
}) => {
  const { t } = useTranslation();
  const [showShareCard, setShowShareCard] = useState(false);
  const pct = Math.round((correctCount / questionsLength) * 100);
  const isExcellent = correctCount / questionsLength >= 0.7;
  const isGood = correctCount / questionsLength >= 0.5;

  const handleTelegramShare = () => {
    const emoji = pct >= 70 ? '🏆' : pct >= 50 ? '📊' : '💪';
    const text = t('results.shareTgText', { emoji, topic: topicName, correct: correctCount, total: questionsLength, pct });
    window.open(`https://t.me/share/url?url=https://toifapro-t41p.vercel.app&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyShare = () => {
    const text = t('results.shareCopyText', { correct: correctCount, total: questionsLength, pct, topic: topicName });
    navigator.clipboard?.writeText(text);
    showToast(t('results.copied'), 'info');
  };

  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '36px 24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 52, marginBottom: 12, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>
        {isExcellent ? '🏆' : isGood ? '📊' : '💪'}
      </div>
      <div style={{ fontSize: 22, color: 'var(--text)', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.5px' }}>
        {isExcellent ? t('results.excellent') : t('results.keepGoing')}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24, fontWeight: 500 }}>
        {t('results.summary', { total: questionsLength, correct: correctCount })}
      </div>
      
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: '24px 32px', display: 'inline-block', marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>{t('results.resultLabel')}</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: isExcellent ? '#10B981' : isGood ? '#F59E0B' : '#EF4444', lineHeight: 1 }}>
          {correctCount} <span style={{ fontSize: 28, color: 'var(--text3)' }}>/ {questionsLength}</span>
        </div>
        <div style={{ fontSize: 20, marginTop: 8, color: 'var(--text2)', fontWeight: 800 }}>{pct}%</div>
        {(earnedPoints ?? 0) > 0 && (
          <div style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 700, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {t('results.ratingAdded', { points: earnedPoints })}
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
        {onNextBatch && (
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{ padding: '14px', background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
            onClick={onNextBatch}
          >
            {t('results.nextSection')} {nextBatchLabel ? `(${nextBatchLabel})` : ''} <ArrowRight size={17} />
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={onNextBatch
            ? { padding: '13px', background: 'var(--glass-bg)', color: 'var(--text2)', border: '1px solid var(--glass-border)', borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
            : { padding: '14px', background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
          onClick={generateQuestions}
        >
          <RefreshCw size={17} /> {t('results.retry')}
        </motion.button>
        
        {state.mistakes?.length > 0 && (
          <motion.button 
            whileHover={{ scale: 1.01, y: -1 }} 
            whileTap={{ scale: 0.98 }} 
            style={{ padding: '13px', background: 'var(--glass-bg)', color: 'var(--text2)', border: '1px solid var(--glass-border)', borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
            onClick={() => setMode('mistakes')}
          >
            <Target size={16} /> {t('results.workOnMistakes')}
          </motion.button>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.01, y: -1 }} 
          whileTap={{ scale: 0.98 }} 
          style={{ padding: '13px', background: 'var(--glass-bg)', color: 'var(--text2)', border: '1px solid var(--glass-border)', borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
          onClick={() => navigate('/test')}
        >
          <Home size={16} /> {t('results.toHome')}
        </motion.button>
        
        <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <Share2 size={13} /> {t('results.shareResult')}
          </div>
          {/* Asosiy: vizual ulashish kartasi (canvas rasm) */}
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}
            onClick={() => setShowShareCard(true)}
          >
            <Image size={16} /> {t('results.shareImage')}
          </motion.button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-sm"
              style={{ flex: 1, background: 'var(--accent2)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px' }}
              onClick={handleTelegramShare}
            >
              Telegram
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-sm btn-outline"
              style={{ borderRadius: '12px', padding: '10px', border: '1px solid var(--glass-border)' }}
              onClick={handleCopyShare}
            >
              📋
            </motion.button>
          </div>
        </div>
      </div>

      <ResultShareCard
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        score={correctCount}
        total={questionsLength}
        title={topicName}
        mode="test"
        showToast={showToast}
      />
    </div>
  );
};

export default TestResults;
