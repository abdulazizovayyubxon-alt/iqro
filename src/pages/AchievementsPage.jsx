import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS } from '../data/mockData';
import { BADGES, getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Zap, Target, TrendingUp, BarChart3, Star, AlertCircle, Award, Flame, AlertTriangle } from 'lucide-react';
import RadialChart from '../components/shared/RadialChart';
import PremiumModal from '../components/PremiumModal';

const AchievementsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('achievements');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { isTrialExpired: isFreeLimitReached } = useTrialExpiry();

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


  const earnedBadges = getEarnedBadges(state.stats);
  const totalXP = getTotalXP(state.stats);
  const levelInfo = getLevel(totalXP);

  const nextLevelXP = levelInfo.level === 1 ? 75 : levelInfo.level === 2 ? 200 : levelInfo.level === 3 ? 500 : levelInfo.level === 4 ? 1000 : 9999;
  const levelPct = Math.min(100, Math.round((totalXP / nextLevelXP) * 100));

  const filteredTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  const total = catStats.totalAnswered;
  const correct = catStats.totalCorrect;
  const wrong = total - correct;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 32px' }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>🏅 Yutuqlar</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Statistika va natijalaringiz</p>

      {/* Level Header */}
      <div style={{
        padding: '20px', marginBottom: 20,
        background: `${levelInfo.color}10`,
        border: `1.5px solid ${levelInfo.color}30`,
        borderRadius: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: levelInfo.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
                {levelInfo.name} <span style={{ color: levelInfo.color }}>Lv.{levelInfo.level}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                ⚡ {totalXP} XP · {earnedBadges.length}/{BADGES.length} badge
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text3)' }}>
              <span>Keyingi daraja</span>
              <span style={{ fontWeight: 700, color: levelInfo.color }}>{totalXP}/{nextLevelXP} XP</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${levelPct}%`, height: '100%', background: levelInfo.color, borderRadius: 4, transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* G'OYA-6: Haftalik taqqoslash */}
      {catStats.totalAnswered > 10 && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={20} color="var(--blue)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {acc >= 70 ? "Ajoyib natija! " : acc >= 50 ? "Yaxshi yo'ldasiz! " : "Davom eting! "}
              {acc}% aniqlik
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {catStats.totalAnswered} ta savoldan {catStats.totalCorrect} tasiga to'g'ri javob berdingiz
              {catStats.maxStreak > 3 && ` • Eng uzun seriya: ${catStats.maxStreak} ta ketma-ket`}
            </div>
          </div>
          {acc >= 70 && <div style={{ fontSize: 28 }}>🎯</div>}
          {acc >= 50 && acc < 70 && <div style={{ fontSize: 28 }}>📈</div>}
          {acc < 50 && <div style={{ fontSize: 28 }}>💪</div>}
        </div>
      )}

      {/* 📌 Kunlik Maqsad */}
      {(() => {
        const today = new Date().toDateString();
        const dg = state.dailyGoal?.date === today ? state.dailyGoal : { date: today, answered: 0, target: 20, completed: false };
        const pct = Math.min(100, Math.round((dg.answered / dg.target) * 100));
        const ds = state.dailyStreak || 0;

        return (
          <div className="glass-panel" style={{
            padding: '20px 24px', marginBottom: 24,
            border: dg.completed ? '1.5px solid var(--green)' : '0.5px solid var(--border)',
            background: dg.completed ? 'rgba(16,185,129,0.05)' : 'var(--bg2)',
            transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {dg.completed ? <Award size={24} color="var(--green)" /> : <Target size={24} color="var(--accent)" />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {dg.completed ? 'Bugungi maqsad bajarildi!' : 'Bugungi maqsad'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {dg.answered} / {dg.target} savol yechildi
                  </div>
                </div>
              </div>
              {ds > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: 'white', padding: '5px 14px', borderRadius: 20,
                  fontWeight: 700, fontSize: 13
                }}>
                  <Flame size={14} /> {ds} kun streak
                </div>
              )}
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--bg3)', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 5,
                background: dg.completed
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : pct > 50 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
              <span>{pct}% bajarildi</span>
              <span>{Math.max(0, dg.target - dg.answered)} ta qoldi</span>
            </div>
          </div>
        );
      })()}

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
          <div style={{ marginBottom: 24 }}>
            <div className="section-header" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} /> Zaif Nuqtalaringiz</div>
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                Eng ko'p xato qilingan mavzular — bu yerga ko'proq e'tibor bering!
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {weakTopics.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => handleNavigation(t.id, 'exam')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                      background: 'var(--bg2)', borderRadius: 12, cursor: 'pointer',
                      border: '0.5px solid var(--border)', transition: 'all 0.2s'
                    }}
                    className="hoverable"
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: t.acc < 40 ? 'var(--red-bg)' : t.acc < 70 ? 'var(--amber-bg)' : 'var(--green-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                    }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${t.acc}%`, height: '100%', borderRadius: 3,
                            background: t.acc < 40 ? 'var(--red)' : t.acc < 70 ? 'var(--amber)' : 'var(--green)',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.acc < 40 ? 'var(--red)' : t.acc < 70 ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }}>
                          {t.acc}%
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{t.wrong}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>XATO</div>
                    </div>
                    <button 
                      className="btn btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleNavigation(t.id, 'exam'); }}
                      style={{ 
                        background: 'var(--red)', color: 'white', border: 'none', 
                        fontSize: 11, padding: '6px 10px', borderRadius: 8, flexShrink: 0,
                        fontWeight: 700
                      }}
                    >
                      Mashq qil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, padding: 3, gap: 3, marginBottom: 24 }}>
        {[{ id: 'achievements', label: '🏅 Yutuqlar' }, { id: 'statistics', label: '📊 Statistika' }].map(tab => (
          <button
            key={tab.id}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: activeTab === tab.id ? 'var(--bg2)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.18s',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'achievements' ? (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} style={{ color: 'var(--amber)' }} /> Kolleksiya
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {BADGES.map((badge) => {
                const earned = earnedBadges.some(b => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    style={{
                      padding: '16px 12px', borderRadius: 16, textAlign: 'center',
                      border: earned ? `1.5px solid ${badge.color}40` : '1.5px solid var(--border)',
                      background: earned ? `${badge.color}0F` : 'var(--bg3)',
                      opacity: earned ? 1 : 0.55,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 36, filter: earned ? 'none' : 'grayscale(1)' }}>
                      {earned ? badge.icon : '🔒'}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{badge.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{badge.desc}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: earned ? badge.color : 'var(--text3)' }}>+{badge.xp} XP</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Radial grafiklar */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--blue)' }} /> Umumiy Ko'rsatkichlar
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}>
                <RadialChart pct={acc} size={130} stroke={12} color={acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)'} label="Aniqlik" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: '160px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>✅ To'g'ri</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--green)' }}>{correct}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>❌ Xato</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--red)' }}>{wrong}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>📝 Jami</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)' }}>{total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>⚡ Max Streak</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--amber)' }}>{catStats.maxStreak}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bo'limlar bo'yicha grafik */}
            <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} style={{ color: 'var(--blue)' }} /> Bo'limlar bo'yicha natijalar
            </div>
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
              {filteredTopics.map((t, idx) => {
                const s = state.topicStats[t.id];
                const topicTotal = s?.answered || 0;
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
                    transition={{ delay: idx * 0.05 }}
                    className="stats-topic-row"
                  >
                    <div style={{ minWidth: '180px', fontSize: '14px', fontWeight: '500', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t.icon} {t.name}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.05 }}
                            style={{ height: '100%', borderRadius: '4px', background: barColor }}
                          />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', minWidth: '40px', textAlign: 'right', color: barColor }}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${coveragePct}%`, height: '100%', borderRadius: '2px', background: 'var(--blue)', opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', minWidth: '60px', textAlign: 'right' }}>
                          {answered}/{topicTotal}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Oxirgi Xatolar */}
            <div className="section-header" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: 'var(--red)' }} /> Oxirgi Xatolar (Top 5)
            </div>
            <div style={{ marginBottom: '24px' }}>
              {catStats.mistakes.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '12px 0' }}>Hali xato yo'q — ajoyib!</div>
              ) : (
                [...catStats.mistakes].reverse().slice(0, 5).map((m, i) => (
                  <div key={i} className="glass-panel" style={{ borderLeft: '3px solid var(--red)', padding: '12px 16px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--red)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '4px' }}>{m.topic}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>{m.question}</div>
                    <div style={{ fontSize: '12px', color: 'var(--green)', marginTop: '6px' }}>✓ To'g'ri: {m.correct}</div>
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
