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
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { TOPICS, SUBJECTS } from '../data/mockData';
import {
  Play, Brain, GraduationCap,
  ChevronRight, Clock, Target,
  CheckCircle2, Trash2,
  MessageCircle, X, Zap
} from 'lucide-react';
import SubjectTopicChips, { Chip } from '../components/SubjectTopicChips';
import { motion } from 'framer-motion';
import { EXAM_DATE, EXAM_GOAL_SCORE, EXAM_LABEL, BATCH_SIZE } from '../config';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { state, updateState } = useContext(AppContext);
  const { objections, clearObjections, solveObjection, deleteObjection } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const { isTrialExpired, daysLeft: trialDaysLeft } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;
  const questionsLeft = Math.max(0, 50 - (state.dailyGoal?.answered || 0));
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false); // e'tirozlarni tozalash tasdig'i
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
  // Joriy mavzu ("Dars Testi" tezkor harakati uchun) — -1 = barcha mavzular
  const activeTopicId = state.topicId ?? -1;
  const activeTopic = TOPICS.find(tp => tp.id === activeTopicId);


  const dueCards = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

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
      id: 'test', icon: Play, label: t('dashboard.actionTest'),
      desc: (activeTopicId !== -1 && activeTopic) ? activeTopic.name : t('dashboard.actionTestDesc'),
      color: 'var(--blue)', bg: 'var(--blue-bg)',
      onClick: () => handleNav(activeTopicId, 'exam'),
    },
    {
      id: 'exam', icon: GraduationCap, label: t('dashboard.actionExam'), desc: t('dashboard.actionExamDesc', { count: 50, min: getExamDurationMinutes(cat) }),
      color: 'var(--accent3)', bg: 'var(--blue-bg)',
      onClick: () => { if (isFreeLimitReached) { setShowPremiumModal(true); return; } navigate('/exam'); },
    },
    {
      id: 'review', icon: Brain, label: t('dashboard.actionReview'), desc: dueCards > 0 ? t('dashboard.actionReviewWaiting', { count: dueCards }) : t('dashboard.actionReviewEmpty'),
      color: 'var(--green)', bg: 'var(--green-bg)',
      badge: dueCards > 0 ? dueCards : null,
      onClick: () => navigate('/review'),
    },
    // {
    //   id: 'mistakes', icon: Zap, label: t('dashboard.actionMistakes'), desc: t('dashboard.actionMistakesDesc', { count: filteredMistakesCount }),
    //   color: 'var(--amber)', bg: 'var(--amber-bg)',
    //   onClick: () => handleNav(-1, 'mistakes'),
    // },
  ];

  const categoryTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-page">

      {/* ── FAN + MAVZU + BLOK CHIPLARI (test sahifasi bilan bir xil) ── */}
      <div style={{ marginBottom: 16 }}>
        <SubjectTopicChips
          state={state}
          updateState={updateState}
          SUBJECTS={SUBJECTS}
          TOPICS={TOPICS}
          extraChip={(() => {
            // Bloklar soni faqat test sahifasida aniq bo'ladi; Dashboard'da
            // questionMeta'dagi fan savol sonidan taxminlaymiz. Faqat 1 tadan
            // ko'p blok bo'lganda ko'rsatamiz. Bosilganda testga o'tib, blok
            // tanlagichni ochadi (test 1-blokdan boshlanadi → "1-blok").
            const metaCount = questionMeta?.[cat]?.count;
            const blockCount = metaCount ? Math.ceil(metaCount / BATCH_SIZE) : null;
            if (blockCount !== null && blockCount <= 1) return null;
            return (
              <Chip
                label={t('test.blockChip', { n: 1 })}
                ariaLabel={t('test.selectBlock')}
                onClick={() => {
                  if (isFreeLimitReached) { setShowPremiumModal(true); return; }
                  updateState({ testMode: 'exam' });
                  navigate('/test', { state: { openBlocks: true } });
                }}
                noShrink
              />
            );
          })()}
        />
      </div>



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

      {/* ── REFERRAL BANNER (Do'stlarni Taklif Qilish) ── */}
      {showReferralBanner && (
      <div style={{ position: 'relative', width: '100%', maxWidth: 600, margin: '0 auto' }}>
        <button
          aria-label={t('dashboard.bannerClose')}
          style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, background: 'transparent', border: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%' }}
          onClick={(e) => { e.stopPropagation(); setShowReferralBanner(false); localStorage.setItem('iqro_dismissed_ref_banner', '1'); }}
        >
          <X size={18} color="var(--amber)" />
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
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              {t('dashboard.referralTitle')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, fontWeight: 500 }}>
              {t('dashboard.referralSubtitle')}
            </div>
          </div>
        </div>
        <div className="dashboard-referral-btn">{t('dashboard.referralBtn')}</div>
      </motion.button>
      </div>
      )}

      {/* ── OBUNA (PREMIUM) BANNER — asosiy harakat tugmalari ustida ── */}
      {!user?.isPremium && (
        <motion.button
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="dashboard-trial-banner"
          onClick={() => setShowPremiumModal(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 10px', flexShrink: 0, display: 'flex' }}>
              <Zap size={20} color="#fff" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                {isTrialExpired ? t('dashboard.trialFreeLeft', { count: questionsLeft }) : (trialDaysLeft !== null ? t('dashboard.trialDaysLeft', { days: trialDaysLeft }) : t('dashboard.trialNoData'))}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{t('dashboard.trialUnlimited')}</div>
            </div>
          </div>
          <div className="dashboard-trial-btn">{t('common.activate')}</div>
        </motion.button>
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
              animate={action.id === 'test' ? { boxShadow: ['0 0 0 2px rgba(14,151,224,0.3)', '0 0 0 6px rgba(14,151,224,0)'], transition: { repeat: Infinity, duration: 1.5 } } : {}}
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
        {categoryTopics.map((topic) => {
          const ts = state.topicStats[topic.id];
          const hasStats = ts && ts.answered > 0;
          const pct = hasStats ? Math.round((ts.correct / ts.answered) * 100) : 0;
          const color = !hasStats ? 'var(--text3)' : pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
          const r = 28, circ = 2 * Math.PI * r;

          return (
            <motion.button
              key={topic.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="dashboard-topic-card"
              onClick={() => handleNav(topic.id, 'exam')}
            >
              {/* Donut */}
              <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 8px' }}>
                <svg width={64} height={64} viewBox="0 0 64 64">
                  <circle cx={32} cy={32} r={r} fill="none" stroke="var(--bg3)" strokeWidth={4} />
                  {hasStats && (
                    <circle cx={32} cy={32} r={r} fill="none" style={{ stroke: color }} strokeWidth={4}
                      strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                      strokeLinecap="round" transform="rotate(-90 32 32)" />
                  )}
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: hasStats ? 13 : 18, fontWeight: 800, color,
                }}>
                  {hasStats ? `${pct}%` : topic.icon}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3 }}>
                {topic.name}
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
              onClick={() => setShowClearConfirm(true)}>
              <Trash2 size={14} /> {t('dashboard.clear')}
            </button>
          </div>
          {[...objections].reverse().slice(0, 5).map((obj, i) => (
            <div key={obj.fbId || i} className="dashboard-obj-card">
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{obj.topic} · {obj.date}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{obj.question}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {!obj.solved && (
                  <button className="dashboard-obj-btn" style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'var(--green-bg)', color: 'var(--green)' }} onClick={() => solveObjection(obj.fbId)}>
                    <CheckCircle2 size={12} /> {t('dashboard.fixed')}
                  </button>
                )}
                <button className="dashboard-obj-btn" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'var(--red-bg)', color: 'var(--red)' }} onClick={() => deleteObjection(obj.fbId)}>
                  <Trash2 size={12} /> {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      {/* E'tirozlarni tozalash tasdig'i (window.confirm o'rniga) */}
      <ConfirmDialog
        open={showClearConfirm}
        danger
        title={t('dashboard.clearConfirm')}
        confirmLabel={t('dashboard.clear')}
        onConfirm={() => { setShowClearConfirm(false); clearObjections(); }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </motion.div>
  );
};

export default Dashboard;
