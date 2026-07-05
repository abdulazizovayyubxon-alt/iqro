import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { TOPICS } from '../data/mockData';
import RadialChart from './shared/RadialChart';
import { TrendingUp, Target, AlertCircle, X } from 'lucide-react';
import { useModalBackButton } from './profile/useModalBackButton';

// ── Sokin/jiddiy uslub — ProfileDrawer bilan bir xil tokenlar ──
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 2px 8px rgba(15,27,45,0.04)' };
const sectionHeader = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--text3)', margin: '0 0 12px' };
const statRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

/**
 * StatsDrawer — o'ngdan suriladigan batafsil statistika paneli.
 * ProfileDrawer (chapdan) bilan juftlik; sokin/jiddiy uslub.
 * Ma'lumotni AppContext'dan o'zi hisoblaydi; topicTotals (async kesh) propdan keladi.
 */
const StatsDrawer = ({ open, onClose, topicTotals = {} }) => {
  const { t } = useTranslation();
  const { state } = useContext(AppContext);

  // Close on back button
  useModalBackButton(open, onClose);

  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, maxStreak: 0, mistakes: [] };
  const total = catStats.totalAnswered;
  const correct = catStats.totalCorrect;
  const wrong = total - correct;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  const filteredTopics = TOPICS.filter(tp =>
    Array.isArray(tp.category) ? tp.category.includes(cat) : tp.category === cat
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,30,0.45)', backdropFilter: 'blur(2px)', zIndex: 1100 }}
          />
          {/* Drawer — o'ngdan */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(92vw, 440px)',
              background: 'var(--bg2)', zIndex: 1101, display: 'flex', flexDirection: 'column',
              boxShadow: '0 0 60px rgba(0,0,0,0.30)', borderRadius: '24px 0 0 24px',
              overflowY: 'auto',
            }}
          >
            {/* Sarlavha */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 18px 10px', position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{t('achievements.statsDrawerTitle')}</div>
              <button
                onClick={onClose}
                aria-label={t('common.close', 'Yopish')}
                style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '6px 16px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* ── Umumiy ko'rsatkichlar ── */}
              <div>
                <div style={sectionHeader}><TrendingUp size={16} style={{ color: 'var(--accent)' }} /> {t('achievements.overallMetrics')}</div>
                <div style={{ ...card, padding: '22px 18px', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around' }}>
                  <RadialChart pct={acc} size={120} stroke={11} color={acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)'} label={t('achievements.accuracy')} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 150 }}>
                    <div style={statRow}>
                      <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{t('achievements.correctLabel')}</span>
                      <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--green)' }}>{correct}</span>
                    </div>
                    <div style={statRow}>
                      <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{t('achievements.wrongLabel')}</span>
                      <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--red)' }}>{wrong}</span>
                    </div>
                    <div style={statRow}>
                      <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{t('achievements.totalLabel')}</span>
                      <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>{total}</span>
                    </div>
                    <div style={statRow}>
                      <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{t('achievements.maxStreak')}</span>
                      <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--amber)' }}>{catStats.maxStreak}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Mavzu bo'yicha ── */}
              <div>
                <div style={sectionHeader}><Target size={16} style={{ color: 'var(--accent)' }} /> {t('achievements.byTopic')}</div>
                <div style={{ ...card, padding: '18px 16px' }}>
                  {filteredTopics.map((tp, idx) => {
                    const s = state.topicStats[tp.id];
                    const topicTotal = topicTotals[tp.id] || 0;
                    const answered = s?.answered || 0;
                    const topicCorrect = s?.correct || 0;
                    const pct = answered > 0 ? Math.round((topicCorrect / answered) * 100) : 0;
                    const coveragePct = topicTotal > 0 ? Math.min(100, Math.round((answered / topicTotal) * 100)) : 0;
                    const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : pct > 0 ? 'var(--red)' : 'var(--accent)';

                    return (
                      <motion.div
                        key={tp.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="stats-topic-row"
                      >
                        <div style={{ minWidth: 110, maxWidth: 170, fontSize: 14, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {tp.icon} {tp.name}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, delay: idx * 0.04 }}
                                style={{ height: '100%', borderRadius: 4, background: barColor }}
                              />
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: 'right', color: barColor }}>
                              {pct > 0 ? `${pct}%` : '—'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${coveragePct}%`, height: '100%', borderRadius: 2, background: 'var(--blue)', opacity: 0.5 }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 60, textAlign: 'right' }}>
                              {answered}/{topicTotal}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── Oxirgi xatolar ── */}
              <div>
                <div style={sectionHeader}><AlertCircle size={16} style={{ color: 'var(--red)' }} /> {t('achievements.recentMistakes')}</div>
                {catStats.mistakes.length === 0 ? (
                  <div style={{ ...card, padding: '16px', color: 'var(--text3)', fontSize: 13 }}>{t('achievements.noMistakes')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...catStats.mistakes].reverse().slice(0, 5).map((m, i) => (
                      <div key={i} style={{ ...card, borderLeft: '3px solid var(--red)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>{m.topic}</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{m.question}</div>
                        <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>{t('achievements.mistakeCorrect', { correct: m.correct })}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StatsDrawer;
