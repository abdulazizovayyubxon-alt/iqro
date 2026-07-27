import React, { useContext, useEffect, useState, useMemo } from 'react';
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
import { reconcileAchievements, nextMilestones } from '../data/tracks';
import NextMilestoneLine from '../components/achievements/NextMilestoneLine';
import ReadinessCard from '../components/diagnostics/ReadinessCard';
import ExamDateModal from '../components/ExamDateModal';
import { computeDiagnostics, buildPace } from '../engine/DiagnosticsEngine';
import { useTopicTotals } from '../hooks/useTopicTotals';
import { useExamCountdown } from '../hooks/useExamDaysLeft';
import {
  Play, Brain, GraduationCap,
  ChevronRight, Clock, Target,
  CheckCircle2, Trash2,
  MessageCircle, X, Zap, History
} from 'lucide-react';
import SubjectTopicChips, { BlockRow } from '../components/SubjectTopicChips';
import { motion } from 'framer-motion';
import localforage from 'localforage';
import { EXAM_GOAL_SCORE, EXAM_LABEL, BATCH_SIZE, EXAM_SESSION_KEY, isPlayBuild } from '../config';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Kunlik narx = to'liq narx / (oy × 30). Firestore settings/premium'dagi tariflardan
// eng arzon kunlik qiymat olinadi; hujjat bo'lmasa 12-oylik default (240 000/360 ≈ 667).
const DEFAULT_PRICE_FROM = Math.round(240000 / (12 * 30));
const perDayOf = (p) => (p?.price > 0 && p?.durationMonths > 0)
  ? Math.round(p.price / (p.durationMonths * 30)) : null;
// MM:SS yoki HH:MM:SS — ExamPage formatTime bilan bir xil ko'rinish
const fmtClock = (secs) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

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
  const exam = useExamCountdown();
  const [showExamModal, setShowExamModal] = useState(false);
  // Sanoq banneri «abadiy yopish» emas, 7 kunga uxlatiladi — muddat yaqinlashsa
  // yana ko'rinadi. Oxirgi 14 kunda umuman yopilmaydi (ENG kerakli payt).
  const [examSnoozedUntil, setExamSnoozedUntil] = useState(
    () => Number(localStorage.getItem('iqro_exam_banner_snooze') || 0)
  );
  const [showReferralBanner, setShowReferralBanner] = useState(true);
  const [questionMeta, setQuestionMeta] = useState(null);
  const [priceFrom, setPriceFrom] = useState(DEFAULT_PRICE_FROM);
  const [resumeSession, setResumeSession] = useState(null);

  // Tayyorlik darajasi — sof diagnostika (DiagnosticsEngine); bazadagi savol
  // soni og'irlik uchun ishlatiladi, kesh bo'lmasa bo'limlar teng hisoblanadi.
  const topicTotals = useTopicTotals(state.activeCategory);
  const diag = useMemo(
    () => computeDiagnostics(state, {
      topicTotals,
      goalScore: EXAM_GOAL_SCORE,
      examQuestions: BATCH_SIZE,
    }),
    [state, topicTotals]
  );

  // Keyingi bosqich — yutuqlar bo'limiga sokin kirish nuqtasi (sof hisob)
  const nextMs = useMemo(() => {
    const { live } = reconcileAchievements(state, state.achievements);
    return nextMilestones(state, live)[0] || null;
  }, [state]);

  // Fan bo'yicha savol soni (ishonch badge) — admin-publish yozadi
  useEffect(() => {
    getDoc(doc(db, 'settings', 'questionMeta'))
      .then(snap => { if (snap.exists()) setQuestionMeta(snap.data()); })
      .catch(() => {});
  }, []);

  // Obuna bannerida ko'rsatiladigan "kuniga … so'm dan" — eng arzon kunlik tarif.
  // Firestore'da hujjat/tariflar bo'lmasa default (DEFAULT_PRICE_FROM) qoladi;
  // PremiumModal ham xuddi shu hujjatni o'qigani uchun banner va modal mos bo'ladi.
  useEffect(() => {
    getDoc(doc(db, 'settings', 'premium'))
      .then(snap => {
        const plans = snap.exists() ? snap.data().plans : null;
        if (!Array.isArray(plans) || plans.length === 0) return;
        const perDays = plans.map(perDayOf).filter(v => v != null);
        if (perDays.length) setPriceFrom(Math.min(...perDays));
      })
      .catch(() => {});
  }, []);

  // Tugallanmagan imtihon (ExamPage localforage'ga yozadi) — "Davom etish" kartasi.
  // Faqat shu foydalanuvchiniki, savollari bor va vaqti tugamagan sessiya ko'rsatiladi.
  useEffect(() => {
    let cancelled = false;
    localforage.getItem(EXAM_SESSION_KEY)
      .then(s => {
        if (cancelled) return;
        const valid = s && Array.isArray(s.questions) && s.questions.length > 0
          && s.timeLeft > 0 && (!s.uid || s.uid === user?.uid);
        setResumeSession(valid ? s : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    setShowReferralBanner(localStorage.getItem('iqro_dismissed_ref_banner') !== '1');
  }, []);

  // Kunlik sur'at — «N kun · kuniga ~M savol». buildPace sana yo'q bo'lsa yoki
  // natija bo'lmasa ataylab null qaytaradi (taxminiy raqam yolg'on bo'lardi).
  const pace = useMemo(
    () => buildPace(diag, state, { daysLeft: exam.daysLeft }),
    [diag, state, exam.daysLeft]
  );

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

  // Saqlangan imtihonni davom ettirish — ExamPage /exam ochilganda sessiyani avtomatik
  // tiklaydi (faqat s.cat joriy faol fanga teng bo'lsa). Sessiya boshqa fanники bo'lsa,
  // avval o'sha fanga o'tkazamiz, aks holda /exam yangi imtihon boshlab yuborardi.
  const handleResume = () => {
    if (resumeSession?.cat && resumeSession.cat !== cat) {
      updateState({ activeCategory: resumeSession.cat });
    }
    navigate('/exam');
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
          belowRow={(() => {
            // Bloklar soni faqat test sahifasida aniq bo'ladi; Dashboard'da
            // questionMeta'dagi fan savol sonidan taxminlaymiz. Bosilganda testga
            // o'tib, blok tanlagichni ochadi (test 1-blokdan boshlanadi → "1-blok").
            const metaCount = questionMeta?.[cat]?.count;
            if (!metaCount) return null;
            const blockCount = Math.ceil(metaCount / BATCH_SIZE);
            const hint = t('test.totalAvailable', { count: metaCount });
            // Bitta blok bo'lsa — bosilmaydigan axborot qatori
            if (blockCount <= 1) return <BlockRow hint={hint} />;
            return (
              <BlockRow
                label={t('selector.blockOf', { n: 1, total: blockCount })}
                hint={hint}
                ariaLabel={t('test.selectBlock')}
                onClick={() => {
                  if (isFreeLimitReached) { setShowPremiumModal(true); return; }
                  updateState({ testMode: 'exam' });
                  navigate('/test', { state: { openBlocks: true } });
                }}
              />
            );
          })()}
        />
      </div>



      {/* ── TUGALLANMAGAN IMTIHONNI DAVOM ETTIRISH ── */}
      {resumeSession && (
        <motion.button
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="dashboard-resume-banner"
          onClick={handleResume}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ background: 'var(--blue-bg)', borderRadius: 10, padding: '8px 10px', flexShrink: 0, display: 'flex' }}>
              <History size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{t('exam.resumeTitle')}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t('exam.resumeInfo', {
                  answered: Object.keys(resumeSession.answers || {}).length,
                  total: resumeSession.questions.length,
                  time: fmtClock(resumeSession.timeLeft)
                })}
              </div>
            </div>
          </div>
          <div className="dashboard-resume-btn">{t('exam.resume')}</div>
        </motion.button>
      )}

      {/* ── IMTIHON SANOQI ──
          Ilgari bu banner faqat config'dagi qattiq sanaga bog'liq edi va o'sha
          sana o'tib ketgach hech kimga ko'rinmay qolgan. Endi sana ishonchli
          bo'lgandagina raqam chiqadi; sana yo'q bo'lsa uni belgilash taklif
          qilinadi. Yopish — abadiy emas, 7 kunga. */}
      {(() => {
        if (!exam.enabled) return null;
        // Umumiy (rasmiy) sana tasviriy san'at o'qituvchisiga to'g'ri kelmaydi —
        // shaxsiy sana kiritilgan bo'lsa esa har fanda ko'rsatiladi.
        if (exam.hasDate && !exam.isPersonal && cat === 'art') return null;

        const canDismiss = !exam.hasDate || exam.daysLeft > 14;
        if (canDismiss && Date.now() < examSnoozedUntil) return null;

        const snooze = (e) => {
          e.stopPropagation();
          const until = Date.now() + 7 * 86400000;
          localStorage.setItem('iqro_exam_banner_snooze', String(until));
          setExamSnoozedUntil(until);
        };

        // ── Sana yo'q: sokin taklif (raqam o'ylab topilmaydi) ──
        if (!exam.hasDate) {
          return (
            <div className="glass-panel" style={{ position: 'relative', padding: '14px 16px', marginBottom: 16 }}>
              <button
                aria-label={t('dashboard.bannerClose')}
                style={{ position: 'absolute', top: 2, right: 2, background: 'transparent', border: 'none', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', cursor: 'pointer', borderRadius: '50%' }}
                onClick={snooze}
              >
                <X size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingRight: 34 }}>
                <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={19} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{t('exam.setDateTitle')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, lineHeight: 1.45 }}>{t('exam.setDateDesc')}</div>
                </div>
              </div>
              <button
                onClick={() => setShowExamModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--accent)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t('exam.setDateCta')} <ChevronRight size={15} />
              </button>
            </div>
          );
        }

        // ── Sana bor: sanoq ──
        const soon = exam.tone !== 'calm';
        return (
          <div className="dashboard-exam-banner" style={{ cursor: 'pointer' }} onClick={() => setShowExamModal(true)}>
            {canDismiss && (
              <button
                aria-label={t('dashboard.bannerClose')}
                style={{ position: 'absolute', top: 4, right: 4, background: 'transparent', border: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', borderRadius: '50%' }}
                onClick={snooze}
              >
                <X size={18} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 10px' }}>
                <Clock size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  {exam.isPersonal ? t('exam.yourDate') : (exam.label || EXAM_LABEL)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {exam.isToday ? t('exam.today') : t('exam.daysLeft', { count: exam.daysLeft })}
                </div>
              </div>
            </div>
            <div className="dashboard-exam-goal">
              <Target size={14} />
              <span>
                {soon && pace?.perDay
                  ? t('pace.perDay', { count: pace.perDay })
                  : t('dashboard.goal', { score: EXAM_GOAL_SCORE })}
              </span>
            </div>
          </div>
        );
      })()}

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
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {/* Play build'da narx ko'rsatilmaydi — PremiumModal.jsx izohiga qarang */}
                {t('dashboard.trialUnlimited')}{priceFrom && !isPlayBuild() ? ` · ${t('dashboard.trialPriceFrom', { amount: new Intl.NumberFormat('fr-FR').format(priceFrom) })}` : ''}
              </div>
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

      {/* ── TAYYORLIK DARAJASI — diagnostika (Tahlil sahifasiga kirish nuqtasi) ── */}
      <div style={{ marginTop: 14 }}>
        <ReadinessCard
          diag={diag}
          compact
          pace={pace}
          onOpen={() => navigate('/analysis')}
          onTopic={(topicId) => handleNav(topicId, 'exam')}
        />
      </div>

      {/* ── KEYINGI BOSQICH — yutuqlar bo'limiga kirish nuqtasi ── */}
      {nextMs && (
        <div className="glass-panel" style={{ padding: '12px 14px', marginTop: 14 }}>
          <NextMilestoneLine milestone={nextMs} onClick={() => navigate('/achievements')} />
        </div>
      )}

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

      <ExamDateModal
        open={showExamModal}
        initialDays={exam.hasDate ? exam.daysLeft : ''}
        onClose={() => setShowExamModal(false)}
        onSaved={() => {
          exam.refresh();
          showToast(t('header.examModal.saved'), 'success');
        }}
      />

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
