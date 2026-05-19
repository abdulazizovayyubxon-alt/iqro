/**
 * BottomNav.jsx — Mobil qurilmalar uchun pastki navigatsiya paneli
 * Faqat kichik ekranlarda (< 768px) ko'rinadi
 */
import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import { useAdmin } from '../hooks/useAdmin';
import { TOPICS } from '../data/mockData';
import {
  PenTool, Brain, Trophy, GraduationCap, Users
} from 'lucide-react';

const TABS = [
  { id: 'test',        path: '/test',         icon: PenTool,       label: 'Test' },
  { id: 'exam',        path: '/exam',         icon: GraduationCap, label: 'Imtihon' },
  { id: 'review',      path: '/review',       icon: Brain,         label: 'Takrorlash' },
  { id: 'leaderboard', path: '/leaderboard',  icon: Trophy,        label: 'Reyting' },
  { id: 'referral',    path: '/referral',     icon: Users,         label: 'Taklif qilish' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
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
                size={22}
                style={{
                  position: 'relative', zIndex: 1,
                  color: isActive ? '#fff' : 'var(--text3)',
                  transition: 'color 0.2s',
                }}
              />
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
    display: 'none', // CSS media query orqali mobilda ko'rinadi
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
    background: 'var(--bg2)', borderTop: '1px solid var(--border)',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    gridTemplateColumns: 'repeat(5, 1fr)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2, padding: '4px 0',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', minHeight: 52,
  },
  activePill: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 40, height: 40, borderRadius: 12,
    background: 'var(--accent)',
    zIndex: 0,
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
