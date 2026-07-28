import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Target, Share2, ArrowRight, FileText, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResultShareCard from '../shared/ResultShareCard';
import { reconcileAchievements, nextMilestones } from '../../data/tracks';
import NextMilestoneLine from '../achievements/NextMilestoneLine';

const TestResults = ({
  correctCount,
  amiDelta,
  gained = [],
  questionsLength,
  topicName,
  state,
  setMode,
  generateQuestions,
  showToast,
  nextBatchLabel,
  onNextBatch
}) => {
  const { t } = useTranslation();
  const [showShareCard, setShowShareCard] = useState(false);
  const pct = Math.round((correctCount / questionsLength) * 100);

  // Keyingi bosqich — commit'dan keyingi yangilangan holatdan sof hisob
  const achView = reconcileAchievements(state, state.achievements);
  const milestone = nextMilestones(state, achView.live)[0] || null;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '28px 24px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: 'var(--border2)', borderRadius: '0 0 3px 3px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <FileText size={14} style={{ color: 'var(--text3)' }} />
        <span style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.6px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>{t('results.reportEyebrow')}</span>
      </div>

      <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{t('results.reportTitle')}</div>
      <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', marginBottom: 22, lineHeight: 1.5 }}>{t('results.summary', { total: questionsLength, correct: correctCount })}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 'var(--fs-10xl)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px' }}>{correctCount}</span>
        <span style={{ fontSize: 'var(--fs-xl)', color: 'var(--text3)' }}>/ {questionsLength}</span>
        <span style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text2)', marginLeft: 'auto' }}>{pct}%</span>
      </div>

      <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.25,1,0.5,1)' }} />
      </div>

      {/* Sessiyada olingan darajalar — sokin muhr-qatorlar */}
      {gained.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {gained.map(g => (
            <div
              key={`${g.trackId}_${g.tier}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                borderRadius: 12, background: 'var(--blue-bg)', color: 'var(--accent2)',
                fontSize: 'var(--fs-sm)', fontWeight: 700
              }}
            >
              <BadgeCheck size={15} style={{ flexShrink: 0 }} />
              {t('results.gainedTier', { track: t(`tracks.${g.trackId}.name`), tier: t(`tracks.tier${g.tier}`) })}
            </div>
          ))}
        </div>
      )}

      {(amiDelta ?? 0) > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 14, marginBottom: 14 }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>{t('tracks.amiLabel')}</span>
          <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)', background: 'var(--bg3)', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
            {t('results.amiAdded', { delta: amiDelta })}
          </span>
        </div>
      )}

      {/* Keyingi bosqich — davom etish uchun aniq sabab */}
      {milestone && (
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 14, marginBottom: 22, textAlign: 'left' }}>
          <NextMilestoneLine milestone={milestone} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320, margin: '0 auto' }}>
        <motion.button
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={{ padding: '14px', background: 'var(--cta)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 'var(--fs-lg)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
          onClick={onNextBatch || generateQuestions}
        >
          {onNextBatch ? (
            <>{t('results.nextBlock')} {nextBatchLabel ? `(${nextBatchLabel})` : ''} <ArrowRight size={17} /></>
          ) : (
            <><RefreshCw size={17} /> {t('results.retry')}</>
          )}
        </motion.button>

        {state.mistakes?.length > 0 && (
          <button
            onClick={() => setMode('mistakes')}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 'var(--fs-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontFamily: 'inherit' }}
          >
            <Target size={14} /> {t('results.workOnMistakes')}
          </button>
        )}

        <button
          onClick={() => setShowShareCard(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 'var(--fs-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontFamily: 'inherit' }}
        >
          <Share2 size={14} /> {t('results.shareResult')}
        </button>
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
