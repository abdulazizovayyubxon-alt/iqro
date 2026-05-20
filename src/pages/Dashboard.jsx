import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { useAdmin } from '../hooks/useAdmin';
import PremiumModal from '../components/PremiumModal';
import { TOPICS } from '../data/mockData';
import {
  Play, Zap, Brain, GraduationCap, Trophy,
  ChevronRight, Clock, Target, TrendingUp,
  Medal, Palette, CheckCircle2, Trash2,
  MessageCircle, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { EXAM_DATE, EXAM_GOAL_SCORE, EXAM_LABEL } from '../config';

const PRIMARY = '#29B6F6';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { state, updateState } = useContext(AppContext);
  const { objections, clearObjections, solveObjection, deleteObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const { isTrialExpired: isFreeLimitReached, daysLeft: trialDaysLeft } = useTrialExpiry();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [daysLeft, setDaysLeft] = useState('');

  useEffect(() => {
    if (!EXAM_DATE) { setDaysLeft('Bilimingizni oshirishda davom eting!'); return; }
    const calc = () => {
      const diff = EXAM_DATE - new Date();
      if (diff <= 0) setDaysLeft('Imtihon kuni!');
      else setDaysLeft(`${Math.floor(diff / 86400000)} kun ${Math.floor((diff % 86400000) / 3600000)} soat`);
    };
    calc();
    const int = setInterval(calc, 60000);
    return () => clearInterval(int);
  }, []);

  const handleNav = (topicId, mode) => {
    if (isFreeLimitReached) { setShowPremiumModal(true); return; }
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, streak: 0, maxStreak: 0, mistakes: [] };
  const totalAcc = catStats.totalAnswered > 0
    ? Math.round((catStats.totalCorrect / catStats.totalAnswered) * 100) : 0;
  const filteredMistakesCount = catStats.mistakes.length;

  const dueCards = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

  const userName = user?.displayName?.split(' ')[0] || 'Foydalanuvchi';

  const quickActions = [
    {
      id: 'test', icon: Play, label: 'Dars Testi', desc: 'Barcha mavzular',
      color: 'var(--blue)', bg: 'var(--blue-bg)',
      onClick: () => handleNav(-1, 'exam'),
    },
    {
      id: 'exam', icon: GraduationCap, label: 'Imtihon', desc: '50 savol · 60 daqiqa',
      color: 'var(--purple)', bg: 'var(--purple-bg)',
      onClick: () => { if (isFreeLimitReached) { setShowPremiumModal(true); return; } navigate('/exam'); },
    },
    {
      id: 'review', icon: Brain, label: 'Takrorlash', desc: dueCards > 0 ? `${dueCards} savol kutmoqda` : 'Hozircha yo\'q',
      color: 'var(--green)', bg: 'var(--green-bg)',
      badge: dueCards > 0 ? dueCards : null,
      onClick: () => navigate('/review'),
    },
    {
      id: 'mistakes', icon: Zap, label: 'Xatolar', desc: `${filteredMistakesCount} ta xato`,
      color: 'var(--amber)', bg: 'var(--amber-bg)',
      onClick: () => handleNav(-1, 'mistakes'),
    },
  ];

  const categoryTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.page}>

      {/* ── GREETING ── */}
      <div style={s.greeting}>
        <div>
          <div style={s.greetSub}>Xush kelibsiz 👋</div>
          <h1 style={s.greetName}>{userName}</h1>
        </div>
        {/* Fan almashtirish */}
        <button
          style={s.catSwitch}
          onClick={() => updateState({ activeCategory: cat === 'chqbt' ? 'art' : 'chqbt' })}
        >
          {cat === 'chqbt' ? <><Medal size={14} /> CHQBT</> : <><Palette size={14} /> San'at</>}
        </button>
      </div>

      {/* ── IMTIHON BANNER ── */}
      {EXAM_DATE && cat !== 'art' && (
        <div style={s.examBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 10px' }}>
              <Clock size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{EXAM_LABEL}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{daysLeft}</div>
            </div>
          </div>
          <div style={s.examGoal}>
            <Target size={14} />
            <span>Maqsad: {EXAM_GOAL_SCORE} ball</span>
          </div>
        </div>
      )}

      {/* ── PREMIUM TRIAL BANNER ── */}
      {!user?.isPremium && (
        <button style={s.trialBanner} onClick={() => setShowPremiumModal(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>
                Bepul sinov: {trialDaysLeft !== null ? `${trialDaysLeft} kun qoldi` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#B45309' }}>Premium ga o'tib cheksiz ishlang</div>
            </div>
          </div>
          <div style={s.trialBtn}>Faollashtirish</div>
        </button>
      )}



      {/* ── TEZKOR HARAKATLAR ── */}
      <div style={s.sectionLabel}>Tezkor boshlash</div>
      <div style={s.actionsGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.id} style={{ ...s.actionCard, background: action.bg, borderColor: 'var(--border)' }} onClick={action.onClick}>
              <div style={{ ...s.actionIcon, background: action.color }}>
                <Icon size={20} color="#fff" />
                {action.badge && (
                  <span style={s.actionBadge}>{action.badge}</span>
                )}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{action.desc}</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {/* ── BO'LIMLAR XARITASI ── */}
      <div style={s.sectionLabel}>Bo'limlar xaritasi</div>
      <div style={s.topicsGrid}>
        {categoryTopics.map((t) => {
          const ts = state.topicStats[t.id];
          const hasStats = ts && ts.answered > 0;
          const pct = hasStats ? Math.round((ts.correct / ts.answered) * 100) : 0;
          const color = !hasStats ? 'var(--text3)' : pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
          const r = 28, circ = 2 * Math.PI * r;

          return (
            <button
              key={t.id}
              style={s.topicCard}
              onClick={() => handleNav(t.id, 'exam')}
            >
              {/* Donut */}
              <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 8px' }}>
                <svg width={64} height={64} viewBox="0 0 64 64">
                  <circle cx={32} cy={32} r={r} fill="none" stroke="var(--bg3)" strokeWidth={5} />
                  {hasStats && (
                    <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={5}
                      strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                      strokeLinecap="round" transform="rotate(-90 32 32)" />
                  )}
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: hasStats ? 13 : 18, fontWeight: 800, color,
                }}>
                  {hasStats ? `${pct}%` : t.icon}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                {hasStats ? `${ts.answered} savol` : 'Boshlanmagan'}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── ADMIN E'TIROZLAR ── */}
      {isAdmin && objections.length > 0 && (
        <div style={s.adminBox}>
          <div style={s.adminBoxHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--blue)' }}>
              <MessageCircle size={18} /> E'tirozlar ({objections.length})
            </div>
            <button style={s.adminClearBtn}
              onClick={() => { if (confirm('Barchasini o\'chirasizmi?')) clearObjections(); }}>
              <Trash2 size={14} /> Tozalash
            </button>
          </div>
          {[...objections].reverse().slice(0, 5).map((obj, i) => (
            <div key={obj.fbId || i} style={s.objCard}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{obj.topic} · {obj.date}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{obj.question}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {!obj.solved && (
                  <button style={s.objBtn('#10B981')} onClick={() => solveObjection(obj.fbId)}>
                    <CheckCircle2 size={12} /> Tuzatildi
                  </button>
                )}
                <button style={s.objBtn('#EF4444')} onClick={() => deleteObjection(obj.fbId)}>
                  <Trash2 size={12} /> O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </motion.div>
  );
};

// ── Styles ──
const s = {
  page: { padding: '20px 16px 32px', maxWidth: 720, margin: '0 auto' },
  greeting: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 20,
  },
  greetSub: { fontSize: 14, color: 'var(--text3)', fontWeight: 500, marginBottom: 2 },
  greetName: { fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 },
  catSwitch: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 12,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    fontSize: 13, fontWeight: 700, color: 'var(--text2)',
    cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  examBanner: {
    background: 'linear-gradient(135deg, #29B6F6, #0284C7)',
    borderRadius: 18, padding: '18px 20px',
    marginBottom: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  examGoal: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 12px',
    fontSize: 13, fontWeight: 600, color: '#fff',
  },
  trialBanner: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--amber-bg)', border: '1.5px solid var(--border)', borderRadius: 16,
    padding: '14px 16px', marginBottom: 20, cursor: 'pointer', fontFamily: 'inherit',
  },
  trialBtn: {
    background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13,
    padding: '8px 14px', borderRadius: 10, flexShrink: 0,
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10, marginBottom: 24,
  },
  statCard: {
    background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16,
    padding: '16px 12px', textAlign: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  statLbl: { fontSize: 11, color: 'var(--text3)', marginTop: 4, fontWeight: 500 },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginTop: 4,
  },
  actionsGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  actionCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 16,
    border: '1.5px solid var(--border)', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left',
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative',
  },
  actionBadge: {
    position: 'absolute', top: -6, right: -6,
    background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800,
    borderRadius: 6, padding: '1px 4px', minWidth: 14, textAlign: 'center',
  },
  topicsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 10, marginBottom: 24,
  },
  topicCard: {
    padding: '14px 10px', borderRadius: 16,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
    alignItems: 'center',
  },
  adminBox: {
    border: '1.5px solid var(--border)', borderRadius: 16,
    background: 'var(--blue-bg)', padding: '16px', marginBottom: 16,
  },
  adminBoxHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  adminClearBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg2)', color: '#EF4444', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  objCard: {
    background: 'var(--bg2)', borderRadius: 12, padding: '12px 14px',
    marginBottom: 8, border: '1px solid var(--border)',
  },
  objBtn: (color) => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 8,
    border: `1px solid ${color}20`, background: `${color}10`,
    color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }),
};

export default Dashboard;
