import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { TOPICS } from '../data/mockData';
import { BADGES, getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { motion } from 'framer-motion';
import { Trophy, Zap, Target, TrendingUp } from 'lucide-react';
import RadialChart from '../components/shared/RadialChart';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PremiumModal from '../components/PremiumModal';

const Stats = () => {
  const navigate = useNavigate();
  const goBack = () => navigate('/');
  const { user } = useAuth();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { state } = useContext(AppContext);

  const isFreeLimitReached = !user?.isPremium && (state.totalAnswered || 0) >= 100;

  if (isFreeLimitReached) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
        <div className="glass-panel" style={{ maxWidth: 500, margin: '60px auto', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Bepul Limit Tugadi</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
            Siz bepul limitni (100 ta savol) muvaffaqiyatli yakunladingiz! O'z statistikangizni ko'rish va cheksiz savollar bazasiga kirish uchun Premium rejimni faollashtiring.
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowPremiumModal(true)}>
            ⭐ Premium Rejimni Faollashtirish
          </button>
          <button className="btn btn-outline" onClick={goBack}>← Bosh sahifaga</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }
  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, streak: 0, maxStreak: 0, mistakes: [] };

  const filteredTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  const total = catStats.totalAnswered;
  const correct = catStats.totalCorrect;
  const wrong = total - correct;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Badge'lar
  const earnedBadges = getEarnedBadges(state.stats);
  const totalXP = getTotalXP(state.stats);
  const levelInfo = getLevel(totalXP);
  const nextLevelXP = levelInfo.level === 1 ? 75 : levelInfo.level === 2 ? 200 : levelInfo.level === 3 ? 500 : levelInfo.level === 4 ? 1000 : 9999;
  const levelPct = Math.min(100, Math.round((totalXP / nextLevelXP) * 100));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page">
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', color: 'var(--accent2)', marginBottom: '20px' }}>
        Statistika {state.activeCategory === 'art' ? "(San'at)" : "(CHQBT)"}
      </div>

      {/* XP va Daraja */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', background: `linear-gradient(135deg, ${levelInfo.color}15, transparent)`, border: `1px solid ${levelInfo.color}40` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}90)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: `0 8px 20px ${levelInfo.color}40` }}>
              <Trophy size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text)' }}>
                {levelInfo.name} <span style={{ color: levelInfo.color }}>Lv.{levelInfo.level}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>
                <Zap size={12} style={{ display: 'inline', marginRight: '4px', color: '#FBBF24' }} />
                {totalXP} XP • {earnedBadges.length}/{BADGES.length} badge
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text3)' }}>
              <span>Keyingi daraja</span>
              <span style={{ fontWeight: '700', color: levelInfo.color }}>{totalXP} / {nextLevelXP} XP</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${levelPct}%`, height: '100%', background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}cc)`, borderRadius: '4px', transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>
      </div>

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
                {/* Aniqlik bar */}
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
                {/* Qamrov (coverage) bar */}
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

      {/* ===== BADGE TIZIMI ===== */}
      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trophy size={20} style={{ color: 'var(--amber)' }} /> Yutuqlar ({earnedBadges.length}/{BADGES.length})
      </div>
      <div className="badges-grid" style={{ marginBottom: '32px' }}>
        {BADGES.map((badge) => {
          const earned = earnedBadges.some(b => b.id === badge.id);
          return (
            <motion.div
              key={badge.id}
              className={`badge-card glass-panel ${earned ? 'earned' : 'locked'}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.04 }}
              style={{
                border: earned ? `1px solid ${badge.color}50` : '1px solid var(--border)',
                background: earned ? `${badge.color}10` : 'var(--bg2)',
                opacity: earned ? 1 : 0.45,
              }}
            >
              <div className="badge-icon" style={{ fontSize: '32px', filter: earned ? 'none' : 'grayscale(1)' }}>
                {earned ? badge.icon : '🔒'}
              </div>
              <div className="badge-name" style={{ color: earned ? 'var(--text)' : 'var(--text3)' }}>{badge.name}</div>
              <div className="badge-desc">{badge.desc}</div>
              <div className="badge-xp" style={{ color: earned ? badge.color : 'var(--text3)' }}>
                +{badge.xp} XP
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="divider" />

      {/* Oxirgi Xatolar */}
      <div className="section-header" style={{ marginBottom: '12px' }}>Oxirgi Xatolar (Top 5)</div>
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
  );
};

export default Stats;
