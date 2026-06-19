import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { useAdmin } from '../hooks/useAdmin';
import GiftBox from '../components/shared/GiftBox';
import PremiumModal from '../components/PremiumModal';
import { TOPICS, SUBJECTS } from '../data/mockData';
import {
  Play, Zap, Brain, GraduationCap,
  ChevronRight, Clock, Target,
  CheckCircle2, Trash2,
  MessageCircle, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { EXAM_DATE, EXAM_GOAL_SCORE, EXAM_LABEL } from '../config';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { state, updateState } = useContext(AppContext);
  const { objections, clearObjections, solveObjection, deleteObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const { isTrialExpired, daysLeft: trialDaysLeft } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;
  const questionsLeft = Math.max(0, 50 - (state.dailyGoal?.answered || 0));
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [daysLeft, setDaysLeft] = useState('');
  const [showExamBanner, setShowExamBanner] = useState(true);
  const [showReferralBanner, setShowReferralBanner] = useState(true);
  const [questionMeta, setQuestionMeta] = useState(null);

  // Fan bo'yicha savol soni (ishonch badge) — admin-publish yozadi
  useEffect(() => {
    getDoc(doc(db, 'settings', 'questionMeta'))
      .then(snap => { if (snap.exists()) setQuestionMeta(snap.data()); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setShowExamBanner(localStorage.getItem('iqro_dismissed_exam_banner') !== '1');
    setShowReferralBanner(localStorage.getItem('iqro_dismissed_ref_banner') !== '1');
  }, []);

  useEffect(() => {
    const calc = () => {
      const customSaved = localStorage.getItem('CUSTOM_EXAM_DATE');
      let target = null;
      if (customSaved) {
        target = new Date(customSaved);
        if (isNaN(target.getTime())) target = null;
      }
      if (!target) target = EXAM_DATE;

      if (!target) { setDaysLeft(t('dashboard.examNoDate')); return; }

      const diff = target - new Date();
      if (isNaN(diff) || diff <= 0) setDaysLeft(t('dashboard.examToday'));
      else setDaysLeft(t('dashboard.examCountdown', { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) }));
    };
    calc();
    window.addEventListener('storage', calc);
    const int = setInterval(calc, 60000);
    return () => {
      clearInterval(int);
      window.removeEventListener('storage', calc);
    };
  }, [t]);

  // ═══ REFERRAL WELCOME TOAST ═══
  useEffect(() => {
    const flag = localStorage.getItem('iqro_referral_welcome');
    if (flag === 'true') {
      localStorage.removeItem('iqro_referral_welcome');
      setTimeout(() => {
        showToast(t('dashboard.referralWelcome'), 'success');
      }, 1500);
    }
  }, []);

  const handleNav = (topicId, mode) => {
    if (isFreeLimitReached) { setShowPremiumModal(true); return; }
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, streak: 0, maxStreak: 0, mistakes: [] };
  const filteredMistakesCount = catStats.mistakes.length;

  const dueCards = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

  const userName = user?.displayName?.split(' ')[0] || t('common.userFallback');

  // Vaqtga bog'liq salom — global header allaqachon "Xush kelibsiz" deydi,
  // shu sababli Dashboard hero'sida takrorlamay, kun davriga mos salom beramiz.
  const greetingHi = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return t('dashboard.greetMorning');
    if (h >= 12 && h < 18) return t('dashboard.greetDay');
    if (h >= 18 && h < 23) return t('dashboard.greetEvening');
    return t('dashboard.greetNight');
  })();

  const getExamDurationMinutes = (category) => {
    switch (category) {
      case 'boshlangich':
      case 'info':
        return 120;
      case 'til':
        return 105;
      default:
        return 90;
    }
  };

  const quickActions = [
    {
      id: 'test', icon: Play, label: t('dashboard.actionTest'), desc: t('dashboard.actionTestDesc'),
      color: 'var(--blue)', bg: 'var(--blue-bg)',
      onClick: () => handleNav(-1, 'exam'),
    },
    {
      id: 'exam', icon: GraduationCap, label: t('dashboard.actionExam'), desc: t('dashboard.actionExamDesc', { count: 50, min: getExamDurationMinutes(cat) }),
      color: 'var(--purple)', bg: 'var(--purple-bg)',
      onClick: () => { if (isFreeLimitReached) { setShowPremiumModal(true); return; } navigate('/exam'); },
    },
    {
      id: 'review', icon: Brain, label: t('dashboard.actionReview'), desc: dueCards > 0 ? t('dashboard.actionReviewWaiting', { count: dueCards }) : t('dashboard.actionReviewEmpty'),
      color: 'var(--green)', bg: 'var(--green-bg)',
      badge: dueCards > 0 ? dueCards : null,
      onClick: () => navigate('/review'),
    },
    {
      id: 'mistakes', icon: Zap, label: t('dashboard.actionMistakes'), desc: t('dashboard.actionMistakesDesc', { count: filteredMistakesCount }),
      color: 'var(--amber)', bg: 'var(--amber-bg)',
      onClick: () => handleNav(-1, 'mistakes'),
    },
  ];

  const categoryTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-page">

      {/* ── GREETING ── */}
      <div className="dashboard-greeting">
        <div>
          <div className="dashboard-greet-sub">{greetingHi} 👋</div>
          <h1 className="dashboard-greet-name">{userName}</h1>
        </div>
      </div>

      {/* ── SUBJECT TABS (Dinamik) ── */}
      <div className="dashboard-subj-tabs">
        {SUBJECTS.map(subj => {
          const Icon = subj.icon;
          const isSelected = subj.id === cat;
          return (
              <motion.button
                key={subj.id}
                whileTap={{ scale: 0.95 }}
                className="dashboard-subj-tab"
                style={{
                  background: isSelected ? 'var(--blue)' : 'var(--bg3)',
                  color: isSelected ? '#fff' : 'var(--text2)',
                  border: isSelected ? '1px solid var(--blue)' : '1.5px solid var(--border)',
                  boxShadow: isSelected ? '0 4px 12px rgba(41, 182, 246, 0.25)' : 'none',
                }}
                onClick={() => updateState({ activeCategory: subj.id })}
              >
              <Icon size={16} />
              <span>{subj.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* ── SAVOL BAZASI BADGE (ishonch) ── */}
      {questionMeta?.[cat]?.count > 0 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--green-bg)', border: '1px solid var(--border)',
          borderRadius: 99, padding: '5px 14px', marginBottom: 16,
          fontSize: 12, fontWeight: 700, color: 'var(--green)',
        }}>
          📚 {t('dashboard.approvedQuestions', { count: questionMeta[cat].count.toLocaleString() })}
          {questionMeta[cat].updatedAt && (
            <span style={{ color: 'var(--text3)', fontWeight: 500 }}>
              {' · '}{t('dashboard.updatedOn', { date: new Date(questionMeta[cat].updatedAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long' }) })}
            </span>
          )}
        </div>
      )}

      {/* ── IMTIHON BANNER ── */}
      {showExamBanner && EXAM_DATE && cat !== 'art' && (
        <div className="dashboard-exam-banner">
          <button
            aria-label={t('dashboard.bannerClose')}
            style={{ position: 'absolute', top: 4, right: 4, background: 'transparent', border: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', borderRadius: '50%' }}
            onClick={(e) => { e.stopPropagation(); setShowExamBanner(false); localStorage.setItem('iqro_dismissed_exam_banner', '1'); }}
          >
            <X size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 10px' }}>
              <Clock size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{EXAM_LABEL}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{daysLeft}</div>
            </div>
          </div>
          <div className="dashboard-exam-goal">
            <Target size={14} />
            <span>{t('dashboard.goal', { score: EXAM_GOAL_SCORE })}</span>
          </div>
        </div>
      )}

      {/* ── PREMIUM TRIAL BANNER ── */}
      {!user?.isPremium && (
        <button className="dashboard-trial-banner" onClick={() => setShowPremiumModal(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>
                {isTrialExpired ? t('dashboard.trialFreeLeft', { count: questionsLeft }) : (trialDaysLeft !== null ? t('dashboard.trialDaysLeft', { days: trialDaysLeft }) : t('dashboard.trialNoData'))}
              </div>
              <div style={{ fontSize: 12, color: '#B45309' }}>{t('dashboard.trialUnlimited')}</div>
            </div>
          </div>
          <div className="dashboard-trial-btn">{t('common.activate')}</div>
        </button>
      )}

      {/* ── REFERRAL BANNER (Do'stlarni Taklif Qilish) ── */}
      {showReferralBanner && (
      <div style={{ position: 'relative', width: '100%', maxWidth: 600, margin: '0 auto' }}>
        <button
          aria-label={t('dashboard.bannerClose')}
          style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, background: 'transparent', border: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%' }}
          onClick={(e) => { e.stopPropagation(); setShowReferralBanner(false); localStorage.setItem('iqro_dismissed_ref_banner', '1'); }}
        >
          <X size={18} color="#B45309" />
        </button>
      <motion.button
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="dashboard-referral-banner"
        onClick={() => navigate('/referral')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <GiftBox size={30} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#78350F' }}>
              {t('dashboard.referralTitle')}
            </div>
            <div style={{ fontSize: 12, color: '#92400E', marginTop: 2, fontWeight: 500 }}>
              {t('dashboard.referralSubtitle')}
            </div>
          </div>
        </div>
        <div className="dashboard-referral-btn">{t('dashboard.referralBtn')}</div>
      </motion.button>
      </div>
      )}

      {/* ── TEZKOR HARAKATLAR ── */}
      <div className="dashboard-section-label">{t('dashboard.quickStart')}</div>
      <div className="dashboard-actions-grid">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="dashboard-action-card"
              style={{ 
                background: action.bg, 
                borderColor: action.id === 'test' ? 'var(--blue)' : 'var(--glass-border)',
                boxShadow: action.id === 'test' ? '0 0 0 2px var(--blue)' : '0 2px 8px rgba(0,0,0,0.01)'
              }}
              onClick={action.onClick}
              animate={action.id === 'test' ? { boxShadow: ['0 0 0 2px rgba(41,182,246,0.3)', '0 0 0 6px rgba(41,182,246,0)'], transition: { repeat: Infinity, duration: 1.5 } } : {}}
            >
              <div className="dashboard-action-icon" style={{ background: action.color }}>
                <Icon size={20} color="#fff" />
                {action.badge && (
                  <span className="dashboard-action-badge">{action.badge}</span>
                )}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{action.desc}</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            </motion.button>
          );
        })}
      </div>

      {/* ── BO'LIMLAR XARITASI ── */}
      <div className="dashboard-section-label">{t('dashboard.sectionsMap')}</div>
      <div className="dashboard-topics-grid">
        {categoryTopics.map((t) => {
          const ts = state.topicStats[t.id];
          const hasStats = ts && ts.answered > 0;
          const pct = hasStats ? Math.round((ts.correct / ts.answered) * 100) : 0;
          const color = !hasStats ? 'var(--text3)' : pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
          const r = 28, circ = 2 * Math.PI * r;

          return (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="dashboard-topic-card"
              onClick={() => handleNav(t.id, 'exam')}
            >
              {/* Donut */}
              <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 8px' }}>
                <svg width={64} height={64} viewBox="0 0 64 64">
                  <circle cx={32} cy={32} r={r} fill="none" stroke="var(--bg3)" strokeWidth={4} />
                  {hasStats && (
                    <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={4}
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
                {hasStats ? t('dashboard.topicQuestions', { count: ts.answered }) : t('dashboard.topicNotStarted')}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── ADMIN E'TIROZLAR ── */}
      {isAdmin && objections.length > 0 && (
        <div className="dashboard-admin-box">
          <div className="dashboard-admin-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--blue)' }}>
              <MessageCircle size={18} /> {t('dashboard.objections', { count: objections.length })}
            </div>
            <button className="dashboard-admin-clear"
              onClick={() => { if (confirm(t('dashboard.clearConfirm'))) clearObjections(); }}>
              <Trash2 size={14} /> {t('dashboard.clear')}
            </button>
          </div>
          {[...objections].reverse().slice(0, 5).map((obj, i) => (
            <div key={obj.fbId || i} className="dashboard-obj-card">
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{obj.topic} · {obj.date}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{obj.question}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {!obj.solved && (
                  <button className="dashboard-obj-btn" style={{ border: '1px solid #10B98120', background: '#10B98110', color: '#10B981' }} onClick={() => solveObjection(obj.fbId)}>
                    <CheckCircle2 size={12} /> {t('dashboard.fixed')}
                  </button>
                )}
                <button className="dashboard-obj-btn" style={{ border: '1px solid #EF444420', background: '#EF444410', color: '#EF4444' }} onClick={() => deleteObjection(obj.fbId)}>
                  <Trash2 size={12} /> {t('common.delete')}
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

export default Dashboard;
