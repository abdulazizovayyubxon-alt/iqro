import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { BADGES, getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { motion } from 'framer-motion';
import { Trophy, Medal, Zap } from 'lucide-react';

const AchievementsPage = () => {
  const { state } = useContext(AppContext);

  const earnedBadges = getEarnedBadges(state.stats);
  const totalXP = getTotalXP(state.stats);
  const levelInfo = getLevel(totalXP);

  const nextLevelXP = levelInfo.level === 1 ? 75 : levelInfo.level === 2 ? 200 : levelInfo.level === 3 ? 500 : levelInfo.level === 4 ? 1000 : 9999;
  const levelPct = Math.min(100, Math.round((totalXP / nextLevelXP) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="page"
      style={{ padding: '12px 16px' }}
    >
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '28px',
        letterSpacing: '2px',
        color: 'var(--accent2)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Medal size={32} /> Yutuqlar Galereyasi
      </div>

      {/* User Progress Header */}
      <div className="glass-panel" style={{
        padding: '24px',
        marginBottom: '24px',
        background: `linear-gradient(135deg, ${levelInfo.color}15, transparent)`,
        border: `1px solid ${levelInfo.color}40`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}90)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: `0 8px 20px ${levelInfo.color}40`
            }}>
              <Trophy size={32} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text)' }}>
                {levelInfo.name} <span style={{ color: levelInfo.color }}>Lv.{levelInfo.level}</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} style={{ color: '#FBBF24' }} />
                {totalXP} XP • {earnedBadges.length}/{BADGES.length} badge yig'ilgan
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text3)' }}>
              <span>Keyingi daraja</span>
              <span style={{ fontWeight: '700', color: levelInfo.color }}>{totalXP} / {nextLevelXP} XP</span>
            </div>
            <div style={{ height: '10px', background: 'var(--bg3)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                width: `${levelPct}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
                borderRadius: '5px',
                transition: 'width 1s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trophy size={20} style={{ color: 'var(--amber)' }} /> Kolleksiya
      </div>
      <div className="badges-grid">
        {BADGES.map((badge) => {
          const earned = earnedBadges.some(b => b.id === badge.id);
          return (
            <motion.div
              key={badge.id}
              className={`badge-card glass-panel ${earned ? 'earned' : 'locked'}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              style={{
                border: earned ? `1px solid ${badge.color}50` : '1px solid var(--border)',
                background: earned ? `${badge.color}10` : 'var(--bg2)',
                opacity: earned ? 1 : 0.5,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div className="badge-icon" style={{
                fontSize: '40px',
                filter: earned ? 'none' : 'grayscale(1)',
                transition: 'all 0.3s ease'
              }}>
                {earned ? badge.icon : '🔒'}
              </div>
              <div className="badge-name" style={{
                color: earned ? 'var(--text)' : 'var(--text3)',
                fontWeight: '700'
              }}>{badge.name}</div>
              <div className="badge-desc" style={{
                fontSize: '12px',
                color: earned ? 'var(--text2)' : 'var(--text3)',
                opacity: earned ? 1 : 0.7
              }}>{badge.desc}</div>
              <div className="badge-xp" style={{
                color: earned ? badge.color : 'var(--text3)',
                fontWeight: '600',
                fontSize: '12px'
              }}>
                +{badge.xp} XP
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AchievementsPage;
