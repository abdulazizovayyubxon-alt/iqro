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
  PenTool, Brain, Trophy, User, BookOpen,
  Medal, Palette, GraduationCap, Shield, Users, X
} from 'lucide-react';

const TABS = [
  { id: 'test',        path: '/test',         icon: PenTool,       label: 'Test' },
  { id: 'exam',        path: '/exam',         icon: GraduationCap, label: 'Imtihon' },
  { id: 'review',      path: '/review',       icon: Brain,         label: 'Takrorlash' },
  { id: 'leaderboard', path: '/leaderboard',  icon: Trophy,        label: 'Reyting' },
  { id: 'more',        path: null,            icon: BookOpen,      label: 'Ko\'proq' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useContext(AppContext);
  const { isAdmin } = useAdmin();
  const [showMore, setShowMore] = useState(false);

  const dueCount = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

  const activeTab = TABS.find(t => t.path && location.pathname === t.path)?.id || '';

  const handleTab = (tab) => {
    if (tab.id === 'more') { setShowMore(true); return; }
    if (tab.id === 'test') { updateState({ topicId: -1, testMode: 'exam' }); }
    navigate(tab.path);
  };

  return (
    <>
      {/* Bottom Nav Bar */}
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

      {/* "Ko'proq" drawer */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={styles.overlay}
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              style={styles.drawer}
            >
              {/* Handle */}
              <div style={styles.handle} />

              {/* Fan tanlash */}
              <div style={styles.drawerSection}>
                <p style={styles.drawerLabel}>Fan tanlash</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { id: 'chqbt', icon: Medal, label: 'CHQBT' },
                    { id: 'art',   icon: Palette, label: "San'at" },
                    { id: 'ped',   icon: BookOpen, label: 'Pedagogik' },
                  ].map(cat => {
                    const CatIcon = cat.icon;
                    const isActive = state.activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        style={{ ...styles.catBtn, ...(isActive ? styles.catBtnActive : {}) }}
                        onClick={() => { updateState({ activeCategory: cat.id }); navigate('/test'); setShowMore(false); }}
                      >
                        <CatIcon size={18} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Qo'shimcha sahifalar */}
              <div style={styles.drawerSection}>
                <p style={styles.drawerLabel}>Sahifalar</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { path: '/profile',      icon: User,   label: '👤 Mening profilim' },
                    { path: '/achievements', icon: Medal,  label: '🏅 Yutuqlar' },
                    { path: '/referral',     icon: Users,  label: '🤝 Do\'stlarni taklif qilish' },
                    { path: '/stats',        icon: Trophy, label: '📊 Statistika' },
                    ...(isAdmin ? [{ path: '/admin', icon: Shield, label: '🛡️ Admin Panel' }] : []),
                  ].map(item => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.path}
                        style={styles.drawerItem}
                        onClick={() => { navigate(item.path); setShowMore(false); }}
                      >
                        <ItemIcon size={18} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button style={styles.closeBtn} onClick={() => setShowMore(false)}>
                <X size={18} /> Yopish
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
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
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    zIndex: 1001, backdropFilter: 'blur(4px)',
  },
  drawer: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
    border: '1px solid var(--border)', borderBottom: 'none',
    padding: '12px 20px calc(24px + env(safe-area-inset-bottom))',
    zIndex: 1002,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    background: 'var(--border)', margin: '0 auto 20px',
  },
  drawerSection: { marginBottom: 20 },
  drawerLabel: {
    fontSize: 11, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  catBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, padding: '12px 8px', borderRadius: 14,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text3)',
    transition: 'all 0.18s',
  },
  catBtnActive: {
    border: '2px solid var(--accent)',
    background: 'rgba(59,130,246,0.08)',
    color: 'var(--accent)',
  },
  drawerItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 12,
    border: 'none', background: 'transparent',
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
    transition: 'background 0.15s',
  },
  closeBtn: {
    width: '100%', padding: '13px', borderRadius: 14,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text3)', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
  },
};
