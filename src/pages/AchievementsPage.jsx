import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppContext, getWeekId } from '../context/AppContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS } from '../data/mockData';
import { TRACKS, reconcileAchievements, nextMilestones } from '../data/tracks';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, TrendingUp, AlertCircle, Award, Flame, AlertTriangle, Shield } from 'lucide-react';
import RadialChart from '../components/shared/RadialChart';
import AmiCard from '../components/achievements/AmiCard';
import TrackCard from '../components/achievements/TrackCard';
import NextMilestoneCard from '../components/achievements/NextMilestoneCard';
import PremiumModal from '../components/PremiumModal';

const AchievementsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, updateState } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('achievements');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [topicTotals, setTopicTotals] = useState({});
  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;

  const handleNavigation = (topicId, mode) => {
    if (isFreeLimitReached) {
      setShowPremiumModal(true);
      return;
    }
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, streak: 0, maxStreak: 0, mistakes: [] };

  const total = catStats.totalAnswered;
  const correct = catStats.totalCorrect;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Mavzu bo'yicha umumiy savol sonini lokal keshdan yuklash (qamrov bari uchun) —
  // avval topicTotal=answered qilingani sababli qamrov doimo 100% ko'rinardi.
  useEffect(() => {
    (async () => {
      try {
        const localforage = (await import('localforage')).default;
        const rawList = await localforage.getItem(`bundle_v2_${cat}`);
        if (Array.isArray(rawList)) {
          const totals = {};
          rawList.forEach(q => { if (q.category === cat) totals[q.topicId] = (totals[q.topicId] || 0) + 1; });
          setTopicTotals(totals);
        }
      } catch { /* kesh yo'q — qamrov ko'rsatilmaydi */ }
    })();
  }, [cat]);

  // Akademik yutuqlar: saqlangan darajalar (monoton) + jonli progress (sof hisob).
  // reconcileAchievements bu yerda faqat O'QISH uchun — yozish AppContext'da bo'ladi.
  const achView = reconcileAchievements(state, state.achievements);
  const ami = achView.achievements.ami;
  const unvonTier = achView.achievements.unvonTier;

  // Keyingi bosqich nomzodlari (eng yaqini birinchi) + haftalik AMI o'sishi
  const milestones = nextMilestones(state, achView.live);
  const weeklyDelta = state.amiWeekly?.weekId === getWeekId()
    ? Math.max(0, ami - (state.amiWeekly.startAmi || 0))
    : 0;
  const radarAxes = TRACKS.map(tr => {
    const lv = achView.live[tr.id] || { tier: 0, progress: 0 };
    return {
      label: t(`tracks.${tr.id}.name`),
      value: lv.tier >= 3 ? 1 : Math.min(1, (lv.tier + lv.progress) / 3)
    };
  });

  // Umumiy (barcha fanlar bo'yicha) statistika — Lv banner ostidagi qator uchun
  const globalAnswered = Object.values(state.stats || {}).reduce((sum, c) => sum + (c.totalAnswered || 0), 0);
  const globalCorrect = Object.values(state.stats || {}).reduce((sum, c) => sum + (c.totalCorrect || 0), 0);
  const globalAcc = globalAnswered > 0 ? Math.round((globalCorrect / globalAnswered) * 100) : 0;

  const filteredTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  const wrong = total - correct;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 32px' }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>{t('achievements.title')}</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>{t('achievements.subtitle')}</p>

      {/* Akademik mahorat indeksi + radar */}
      <AmiCard ami={ami} unvonTier={unvonTier} axes={radarAxes} weeklyDelta={weeklyDelta} />

      {/* Global stats summary */}
      <div style={{
        display: 'flex', padding: '14px 12px', marginBottom: 20,
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)', borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.01)',
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{globalAnswered}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{t('achievements.questions')}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{globalAcc}%</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{t('achievements.accuracy')}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/leaderboard')}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent2)', lineHeight: 1 }}>{state.totalScore || 0}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{t('achievements.points')}</div>
        </div>
      </div>

      {/* Reorganized Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, padding: 3, gap: 3, marginBottom: 20 }}>
        {[
          { id: 'achievements', label: t('achievements.tabAchievements', 'Yutuqlar') },
          { id: 'statistics', label: t('achievements.tabStats', 'Statistika') }
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none',
              background: activeTab === tab.id ? 'var(--bg2)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Keyingi bosqich — eng yaqin daraja + aniq shart + CTA */}
            <NextMilestoneCard
              milestone={milestones[0]}
              second={milestones[1]}
              onStart={(m) => handleNavigation(m.topicId ?? -1, 'exam')}
            />

            {/* Daily Goal inside Achievements Tab */}
            {(() => {
              const today = new Date().toDateString();
              const dg = state.dailyGoal?.date === today ? state.dailyGoal : { date: today, answered: 0, target: 20, completed: false };
              const pct = Math.min(100, Math.round((dg.answered / dg.target) * 100));
              const ds = state.dailyStreak || 0;

              return (
                <div className="glass-panel" style={{
                  padding: '16px 20px', marginBottom: 20,
                  border: dg.completed ? '1.5px solid var(--green)' : '1px solid var(--glass-border)',
                  background: dg.completed ? 'rgba(16,185,129,0.03)' : 'var(--glass-bg)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {dg.completed ? <Award size={22} color="var(--green)" /> : <Target size={22} color="var(--accent)" />}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                          {dg.completed ? t('achievements.goalDoneTitle') : t('achievements.goalTitle')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                          {t('achievements.goalProgress', { answered: dg.answered, target: dg.target })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {ds > 0 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'var(--amber-bg)',
                          color: 'var(--amber)', padding: '4px 10px', borderRadius: 20,
                          fontWeight: 800, fontSize: 11,
                        }}>
                          <Flame size={12} /> {t('achievements.goalStreak', { count: ds })}
                        </div>
                      )}
                      {(state.streakFreezes ?? 0) > 0 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'var(--blue-bg)', color: 'var(--accent2)',
                          padding: '4px 10px', borderRadius: 20,
                          fontWeight: 700, fontSize: 11,
                        }}>
                          <Shield size={12} /> {t('achievements.freezeCount', { count: state.streakFreezes })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden', border: '0.5px solid var(--glass-border)' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 3,
                      background: dg.completed ? 'var(--green)' : 'var(--accent)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  {state.streakFrozenDate === today && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent2)', fontWeight: 600, marginTop: 8 }}>
                      <Shield size={12} /> {t('achievements.freezeUsed')}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Yo'nalishlar bo'yicha akademik darajalar */}
            <div className="section-header" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
              <Trophy size={18} style={{ color: 'var(--accent2)' }} /> {t('tracks.sectionTitle')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {TRACKS.map((track) => {
                const lv = achView.live[track.id] || { tier: 0, progress: 0 };
                return (
                  <TrackCard
                    key={track.id}
                    track={track}
                    tier={lv.tier}
                    progress={lv.progress}
                    earnedAt={achView.achievements.tracks[track.id]?.earnedAt}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'statistics' && (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Radial charts */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--blue)' }} /> {t('achievements.overallMetrics')}
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}>
                <RadialChart pct={acc} size={120} stroke={10} color={acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)'} label={t('achievements.accuracy')} />
                <div style={{ display: 'flex', flexName: 'stats-list', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '150px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.correctLabel')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--green)' }}>{correct}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.wrongLabel')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--red)' }}>{wrong}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.totalLabel')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>{total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.maxStreak')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--amber)' }}>{catStats.maxStreak}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Status Banner */}
            {catStats.totalAnswered > 10 && (
              <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, border: '1.2px solid rgba(59,130,246,0.12)', background: 'rgba(59,130,246,0.01)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={18} color="var(--blue)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    {acc >= 70 ? t('achievements.weekExcellent') : acc >= 50 ? t('achievements.weekGood') : t('achievements.weekKeep')}
                    {t('achievements.weekAccuracy', { acc })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {t('achievements.weekSummary', { answered: catStats.totalAnswered, correct: catStats.totalCorrect })}
                    {catStats.maxStreak > 3 && t('achievements.weekStreak', { count: catStats.maxStreak })}
                  </div>
                </div>
                {acc >= 70 && <div style={{ fontSize: 24 }}>🎯</div>}
                {acc >= 50 && acc < 70 && <div style={{ fontSize: 24 }}>📈</div>}
                {acc < 50 && <div style={{ fontSize: 24 }}>💪</div>}
              </div>
            )}

            {/* ⚠️ Zaif Nuqtalar Paneli */}
            {(() => {
              const weakTopics = TOPICS
                .filter(t => {
                  const match = Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat;
                  const ts = state.topicStats[t.id];
                  return match && ts && ts.answered > 0;
                })
                .map(t => {
                  const ts = state.topicStats[t.id];
                  const wrong = ts.answered - ts.correct;
                  const topicAcc = Math.round((ts.correct / ts.answered) * 100);
                  return { ...t, wrong, acc: topicAcc, answered: ts.answered, correct: ts.correct };
                })
                .filter(t => t.wrong > 0)
                .sort((a, b) => b.wrong - a.wrong || a.acc - b.acc)
                .slice(0, 5);

              if (weakTopics.length === 0) return null;

              return (
                <div style={{ marginBottom: 16 }}>
                  <div className="section-header" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800', marginBottom: 10 }}><AlertTriangle size={18} /> {t('achievements.weakTitle')}</div>
                  <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.1)', background: 'rgba(239,68,68,0.01)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                      {t('achievements.weakHint')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {weakTopics.map((tp) => (
                        <div
                          key={tp.id}
                          onClick={() => handleNavigation(tp.id, 'exam')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                            background: 'var(--bg2)', borderRadius: 12, cursor: 'pointer',
                            border: '0.5px solid var(--border)', transition: 'all 0.2s'
                          }}
                          className="hoverable"
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: tp.acc < 40 ? 'var(--red-bg)' : tp.acc < 70 ? 'var(--amber-bg)' : 'var(--green-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                          }}>
                            {tp.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tp.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${tp.acc}%`, height: '100%', borderRadius: 2,
                                  background: tp.acc < 40 ? 'var(--red)' : tp.acc < 70 ? 'var(--amber)' : 'var(--green)',
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: tp.acc < 40 ? 'var(--red)' : tp.acc < 70 ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }}>
                                {tp.acc}%
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingLeft: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>{tp.wrong}</div>
                            <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{t('achievements.weakError')}</div>
                          </div>
                          <button
                            className="btn btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleNavigation(tp.id, 'exam'); }}
                            style={{
                              background: 'var(--red)', color: 'white', border: 'none',
                              fontSize: 10, padding: '5px 8px', borderRadius: 8, flexShrink: 0,
                              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                            }}
                          >
                            {t('achievements.weakPractice')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bo'limlar bo'yicha grafik */}
            <div className="section-header" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
              <Target size={18} style={{ color: 'var(--blue)' }} /> {t('achievements.byTopic')}
            </div>
            <div className="glass-panel" style={{ padding: '18px', marginBottom: '20px' }}>
              {filteredTopics.map((t, idx) => {
                const s = state.topicStats[t.id];
                const topicTotal = topicTotals[t.id] || 0;
                const answered = s?.answered || 0;
                const topicCorrect = s?.correct || 0;
                const pct = answered > 0 ? Math.round((topicCorrect / answered) * 100) : 0;
                const coveragePct = topicTotal > 0 ? Math.min(100, Math.round((answered / topicTotal) * 100)) : 0;
                const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : pct > 0 ? 'var(--red)' : 'var(--accent)';

                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="stats-topic-row"
                  >
                    <div style={{ minWidth: '110px', maxWidth: '170px', fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {t.icon} {t.name}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.04 }}
                            style={{ height: '100%', borderRadius: '3px', background: barColor }}
                          />
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', minWidth: '35px', textAlign: 'right', color: barColor }}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '3px', background: 'var(--bg3)', borderRadius: '1.5px', overflow: 'hidden' }}>
                          <div style={{ width: `${coveragePct}%`, height: '100%', borderRadius: '1.5px', background: 'var(--blue)', opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', minWidth: '50px', textAlign: 'right' }}>
                          {answered}/{topicTotal}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Oxirgi Xatolar */}
            <div className="section-header" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
              <AlertCircle size={18} style={{ color: 'var(--red)' }} /> {t('achievements.recentMistakes')}
            </div>
            <div style={{ marginBottom: '20px' }}>
              {catStats.mistakes.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '12px 0' }}>{t('achievements.noMistakes')}</div>
              ) : (
                [...catStats.mistakes].reverse().slice(0, 5).map((m, i) => (
                  <div key={i} className="glass-panel" style={{ borderLeft: '3px solid var(--red)', padding: '10px 14px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--red)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '3px' }}>{m.topic}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.4' }}>{m.question}</div>
                    <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '5px' }}>{t('achievements.mistakeCorrect', { correct: m.correct })}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
    </motion.div>
  );

};

export default AchievementsPage;
