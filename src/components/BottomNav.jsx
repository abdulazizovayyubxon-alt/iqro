/**
 * BottomNav.jsx — Mobil qurilmalar uchun pastki navigatsiya paneli
 * Faqat kichik ekranlarda (< 768px) ko'rinadi
 */
import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import {
  Home, PenTool, Brain, Trophy, GraduationCap
} from 'lucide-react';

const TABS = [
  { id: 'home',        path: '/dashboard',    icon: Home,          label: 'Bosh' },
  { id: 'test',        path: '/test',         icon: PenTool,       label: 'Test' },
  { id: 'exam',        path: '/exam',         icon: GraduationCap, label: 'Imtihon' },
  { id: 'review',      path: '/review',       icon: Brain,         label: 'Takror' },
  { id: 'leaderboard', path: '/leaderboard',  icon: Trophy,        label: 'Reyting' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { state, updateState } = useContext(AppContext);

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
              <Icon
                size={25}
                strokeWidth={2.4}
                style={{
                  position: 'relative', zIndex: 1,
                  color: isActive ? '#fff' : 'var(--text2)',
                  transition: 'color 0.2s',
                }}
              />
              {badge && (
                <span style={styles.badge}>{badge}</span>
              )}
            </div>
            <span style={{
              fontSize: 'var(--fs-xs)', fontWeight: isActive ? 800 : 600,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              marginTop: 4, transition: 'color 0.2s',
            }}>
              {t(`nav.${tab.id}`)}
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
    // Solid (opaque) fon — yarim shaffof glass o'rniga ko'zga ko'rinarliroq;
    // mobil backdrop-filter ishlamasligi muammosi ham bartaraf bo'ladi
    background: 'var(--bg2)',
    borderTop: '1px solid var(--glass-border)',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    gridTemplateColumns: 'repeat(5, 1fr)',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2, padding: '4px 0',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', minHeight: 52,
  },
  activePill: {
    position: 'absolute',
    top: -8, left: -8,
    width: 41, height: 41, borderRadius: 13,
    background: 'var(--grad-primary)',
    zIndex: 0,
    boxShadow: '0 4px 14px rgba(14, 151, 224, 0.32)',
  },
  badge: {
    position: 'absolute', top: -6, right: -8,
    background: 'var(--red)', color: '#fff',
    fontSize: 'var(--fs-2xs)', fontWeight: 800,
    borderRadius: 6, padding: '1px 4px',
    minWidth: 14, textAlign: 'center',
    zIndex: 2,
  },
};
