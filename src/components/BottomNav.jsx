/**
 * BottomNav.jsx — Mobil qurilmalar uchun pastki navigatsiya paneli
 * Faqat kichik ekranlarda (< 768px) ko'rinadi
 */
import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  PenTool, Brain, Trophy, GraduationCap, User
} from 'lucide-react';

const TABS = [
  { id: 'test',        path: '/test',         icon: PenTool,       label: 'Test' },
  { id: 'exam',        path: '/exam',         icon: GraduationCap, label: 'Imtihon' },
  { id: 'review',      path: '/review',       icon: Brain,         label: 'Takror' },
  { id: 'leaderboard', path: '/leaderboard',  icon: Trophy,        label: 'Reyting' },
  { id: 'profile',     path: '/profile',      icon: User,          label: 'Siz' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useContext(AppContext);
  const { user } = useAuth();
  
  const isPremium = user?.isPremium || false;

  const dueCount = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

  const activeTab = TABS.find(t => t.path && location.pathname === t.path)?.id || '';

  const handleTab = (tab) => {
    if (tab.id === 'test') { updateState({ topicId: -1, testMode: 'exam' }); }
    navigate(tab.path);
  };

  return (
    <nav className="bottom-nav" style={styles.nav}>
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        const badge = tab.id === 'review' && dueCount > 0 ? dueCount : null;
        const isProfile = tab.id === 'profile';

        return (
          <button
            key={tab.id}
            style={styles.tab}
            onClick={() => handleTab(tab)}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {isActive && (
                <motion.div
                  layoutId="bottomNavPill"
                  style={styles.activePill}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {isProfile ? (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isPremium ? 'linear-gradient(45deg, #F59E0B, #FBBF24)' : 'var(--glass-border)',
                  padding: isPremium ? 2 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', zIndex: 1,
                  boxShadow: isPremium ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none',
                  marginTop: -1
                }}>
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} style={{ color: isActive ? (isPremium ? '#F59E0B' : '#fff') : 'var(--text3)' }} />
                    </div>
                  )}
                </div>
              ) : (
                <Icon
                  size={22}
                  style={{
                    position: 'relative', zIndex: 1,
                    color: isActive ? '#fff' : 'var(--text3)',
                    transition: 'color 0.2s',
                  }}
                />
              )}
              {badge && (
                <span style={styles.badge}>{badge}</span>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--accent)' : 'var(--text3)',
              marginTop: 3, transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: 'grid',
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--glass-border)',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    gridTemplateColumns: 'repeat(5, 1fr)',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2, padding: '4px 0',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', minHeight: 52,
  },
  activePill: {
    position: 'absolute',
    top: -9, left: -9,
    width: 40, height: 40, borderRadius: 12,
    background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)',
    zIndex: 0,
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
  },
  badge: {
    position: 'absolute', top: -6, right: -8,
    background: 'var(--red)', color: '#fff',
    fontSize: 9, fontWeight: 800,
    borderRadius: 6, padding: '1px 4px',
    minWidth: 14, textAlign: 'center',
    zIndex: 2,
  },
};
