/**
 * OnboardingPage.jsx — Namuna uslubida qayta yozilgan
 * Oq fon, katta sarlavha, vertikal kartochkalar, pastda yopishgan tugma
 * Desktop: markazlashgan karta | Mobil: to'liq ekran
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Search } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import BrandLogo from '../components/shared/BrandLogo';

// Tema-xavfsiz: tun/sepia da --accent avtomatik o'zgaradi (qattiq-kodlangan ko'k emas)
const PRIMARY = 'var(--accent)';

// MTT (maktabgacha) yo'nalishlari
const MTT_IDS = ['mtt', 'mtt_rahbar', 'mtt_logoped', 'mtt_psixolog'];

const GOALS = [
  { id: 'second_category', badge: '🥈' },
  { id: 'first_category',  badge: '🥇' },
  { id: 'highest_category',badge: '🏆' },
  { id: 'professional',    badge: '🎯' },
];

const SUBJECTS = [
  { id: 'chqbt', badge: 'Q' },
  { id: 'art',   badge: 'S' },
  { id: 'tarix', badge: 'T' },
  { id: 'sport', badge: 'J' },
  { id: 'boshlangich', badge: 'B' },
  { id: 'info', badge: 'I' },
  { id: 'mtt', badge: 'M' },
  { id: 'mtt_rahbar', badge: 'D' },
  { id: 'til', badge: 'O' },
  { id: 'biologiya', badge: 'Bi' },
  { id: 'geografiya', badge: 'Ge' },
  { id: 'mtt_logoped', badge: 'Lo' },
  { id: 'mtt_psixolog', badge: 'Ps' },
  { id: 'kimyo', badge: 'Ki' },
  { id: 'rus_tili', badge: 'Ru' },
  { id: 'ingliz', badge: 'En' },
  { id: 'multi', badge: '✦' },
];

const TIMES = [
  { id: '10', badge: '10' },
  { id: '20', badge: '20' },
  { id: '30', badge: '30' },
  { id: '60', badge: '60' },
];

// ── Qadam komponentlari ──
function renderListItem(item, selected, onSelect, ss) {
  const isActive = selected === item.id;
  return (
    <motion.button
      key={item.id}
      style={{
        ...ss.listItem,
        border: isActive ? `2px solid ${PRIMARY}` : '1px solid var(--border)',
        background: isActive ? 'var(--blue-bg)' : 'var(--bg2)',
        boxShadow: isActive ? '0 8px 22px rgba(14, 151, 224, 0.16)' : '0 2px 8px rgba(0,0,0,0.01)',
      }}
      onClick={() => onSelect(item.id)}
      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={{
        ...ss.badge,
        background: isActive ? PRIMARY : 'var(--bg3)',
        color: isActive ? '#fff' : 'var(--text3)',
        boxShadow: isActive ? '0 4px 12px rgba(14, 151, 224, 0.22)' : 'none',
      }}>
        {item.badge}
      </div>
      <div style={ss.listItemText}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{item.title}</span>
        <span style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{item.desc}</span>
        {item.meta && (
          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginTop: 3 }}>{item.meta}</span>
        )}
      </div>
      {isActive && <CheckCircle size={20} style={{ color: PRIMARY, flexShrink: 0 }} />}
    </motion.button>
  );
}

function ListStep({ title, subtitle, items, selected, onSelect, isMobile, searchable, searchPlaceholder, groups }) {
  const { t } = useTranslation();
  const ss = getStyles(isMobile);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Faqat fan bosqichida (14 ta element) qidiruv — boshqalarda ro'yxat to'liq qoladi.
  const visibleItems = searchable && q
    ? items.filter(it => `${it.title} ${it.desc || ''}`.toLowerCase().includes(q))
    : items;
  return (
    <>
      <h1 style={ss.title}>{title}</h1>
      {subtitle && <p style={ss.subtitle}>{subtitle}</p>}
      {searchable && (
        <div style={ss.searchWrap}>
          <Search size={18} style={ss.searchIcon} />
          <input
            style={ss.searchInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
        </div>
      )}
      {visibleItems.length === 0 && (
        <p style={ss.searchEmpty}>{t('onboarding.searchEmpty')}</p>
      )}
      <div style={ss.list}>
        {(groups && !q)
          ? groups.map(g => {
              const groupItems = visibleItems.filter(it => it.group === g.id);
              if (!groupItems.length) return null;
              return (
                <React.Fragment key={g.id}>
                  <div style={ss.groupHeader}>{g.label}</div>
                  {groupItems.map(item => renderListItem(item, selected, onSelect, ss))}
                </React.Fragment>
              );
            })
          : visibleItems.map(item => renderListItem(item, selected, onSelect, ss))}
      </div>
    </>
  );
}

function LoadingStep({ isMobile }) {
  const { t } = useTranslation();
  const LOADING_STEPS = t('onboarding.loading', { returnObjects: true });
  const [stepIdx, setStepIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const ss = getStyles(isMobile);

  React.useEffect(() => {
    const prog = setInterval(() => setProgress(p => Math.min(p + 4, 100)), 40);
    const step = setInterval(() => setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 450);
    return () => { clearInterval(prog); clearInterval(step); };
  }, [LOADING_STEPS.length]);

  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      {/* Animated icon */}
      <div style={ss.loaderCircle}>
        <div style={ss.loaderInner}>
          <span style={{ fontSize: 28 }}>✦</span>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '24px 0 8px' }}>
        {t('onboarding.loadingTitle')}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 28 }}>
        {t('onboarding.loadingSubtitle')}
      </p>

      {/* Progress bar */}
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, marginBottom: 6, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          style={{ height: '100%', background: PRIMARY, borderRadius: 4 }}
        />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right', marginBottom: 24 }}>{progress}%</p>

      {/* Checklist */}
      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LOADING_STEPS.map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {i < stepIdx ? (
              <CheckCircle size={20} style={{ color: PRIMARY, flexShrink: 0 }} />
            ) : i === stepIdx ? (
              <div style={ss.spinnerSmall} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 14, color: i <= stepIdx ? PRIMARY : 'var(--text3)', fontWeight: i === stepIdx ? 600 : 400 }}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeStep({ goal, time, isMobile }) {
  const { t } = useTranslation();
  const goalObj = GOALS.find(g => g.id === goal);
  const timeObj = TIMES.find(x => x.id === time);
  const ss = getStyles(isMobile);

  return (
    <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h1 style={{ ...ss.title, textAlign: 'center', fontSize: 32, fontWeight: 900, marginBottom: 6 }}>{t('onboarding.doneTitle')}</h1>
      <p style={{ ...ss.subtitle, textAlign: 'center', fontSize: 15, color: 'var(--text3)', marginBottom: 24 }}>{t('onboarding.doneSubtitle')}</p>

      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '24px 20px',
        marginBottom: 24,
        textAlign: 'left',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        {goalObj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'var(--blue-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--accent)'
            }}>
              {goalObj.badge}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{t('onboarding.yourCategory')}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t(`onboarding.goals.${goalObj.id}.title`)}</span>
            </div>
          </div>
        )}
        {timeObj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#10B981'
            }}>
              ⏱
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{t('onboarding.dailyPlan')}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t(`onboarding.times.${timeObj.id}.title`)}</span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#F59E0B'
          }}>
            ⭐
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{t('onboarding.trialPeriod')}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('onboarding.trialValue')}</span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(90deg, rgba(14, 151, 224, 0.08) 0%, rgba(14, 151, 224, 0.03) 100%)',
        border: '1px solid rgba(14, 151, 224, 0.15)',
        borderRadius: 14,
        padding: '14px 18px',
        fontSize: 13,
        color: 'var(--text2)',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        lineHeight: 1.4
      }}>
        <span style={{ fontSize: 16 }}>🎯</span>
        <span style={{ textAlign: 'left' }}>{t('onboarding.motivation')}</span>
      </div>
    </div>
  );
}

// ── Asosiy komponent ──
export default function OnboardingPage({ onComplete }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const ss = getStyles(isMobile);
  
  const [step, setStep] = useState(0); // 0=maqsad 1=fan 2=vaqt 3=loading 4=tabrik
  const [dir, setDir] = useState(1);
  const [goal, setGoal]     = useState(null);
  const [subject, setSubject] = useState(null);
  const [time, setTime]     = useState(null);
  const [, setSaving] = useState(false);

  // Fan bo'yicha savol soni (ishonch badge) — admin-publish yozadi
  const [questionMeta, setQuestionMeta] = useState(null);
  useEffect(() => {
    getDoc(doc(db, 'settings', 'questionMeta'))
      .then(snap => { if (snap.exists()) setQuestionMeta(snap.data()); })
      .catch(() => {});
  }, []);

  const goalsItems = GOALS.map(g => ({ ...g, title: t(`onboarding.goals.${g.id}.title`), desc: t(`onboarding.goals.${g.id}.desc`) }));
  const timesItems = TIMES.map(tm => ({ ...tm, title: t(`onboarding.times.${tm.id}.title`), desc: t(`onboarding.times.${tm.id}.desc`) }));
  const subjectsWithMeta = SUBJECTS.map(s => {
    const m = questionMeta?.[s.id];
    const group = s.id === 'multi' ? 'other' : (MTT_IDS.includes(s.id) ? 'mtt' : 'school');
    const base = { ...s, group, title: t(`onboarding.subjects.${s.id}.title`), desc: t(`onboarding.subjects.${s.id}.desc`) };
    return m?.count > 0 ? { ...base, meta: t('onboarding.meta', { count: m.count.toLocaleString() }) } : base;
  });

  const SUBJECT_GROUPS = [
    { id: 'school', label: t('onboarding.schoolGroup', 'Maktab fanlari') },
    { id: 'mtt', label: t('onboarding.mttGroup', "Maktabgacha · MTT") },
    { id: 'other', label: t('onboarding.otherGroup', 'Boshqa') },
  ];

  const TOTAL_STEPS = 3; // 0,1,2
  const progress = step >= 3 ? 1 : (step + 1) / (TOTAL_STEPS + 1);

  const goNext = () => { setDir(1); setStep(s => s + 1); };
  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const handleFinish = async (finalTimeVal) => {
    setSaving(true);
    setStep(3);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingDone: true,
          onboardingGoal: goal,
          onboardingSubject: subject,
          onboardingDailyMinutes: (typeof finalTimeVal === 'string' ? finalTimeVal : time),
        });
      }
    } catch (e) { console.error(e); }
    setTimeout(() => { setStep(4); setSaving(false); }, 1500);
  };

  const handleSelect = (val) => {
    stepData[step].set(val);
    setTimeout(() => {
      if (step === 2) {
        handleFinish(val);
      } else {
        goNext();
      }
    }, 350);
  };

  const stepData = [
    { title: t('onboarding.goalTitle'), subtitle: t('onboarding.goalSubtitle'), items: goalsItems, val: goal, set: setGoal },
    { title: t('onboarding.subjectTitle'), subtitle: t('onboarding.subjectSubtitle'), items: subjectsWithMeta, val: subject, set: setSubject, searchable: true, groups: SUBJECT_GROUPS },
    { title: t('onboarding.timeTitle'), subtitle: t('onboarding.timeSubtitle'), items: timesItems, val: time, set: setTime },
  ];

  return (
    <div style={ss.pageOuter}>
      <div style={ss.page}>
        {/* Header */}
        {step < 3 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 8px',
          }}>
            {step > 0 ? (
              <motion.button whileTap={{ scale: 0.9 }} style={ss.backBtn} onClick={goBack}>
                <ArrowLeft size={22} />
              </motion.button>
            ) : <div style={{ width: 36 }} />}

            {/* Centered logo lockup */}
            <BrandLogo size={22} />

            <div style={{ width: 36 }} />
          </div>
        )}

        {/* Progress bar (under the header) */}
        {step < 3 && (
          <div style={ss.progressTrack}>
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={ss.progressFill}
            />
          </div>
        )}

        {/* Content */}
        <div style={ss.content}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: d => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: d => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {step < 3 && (
                <ListStep
                  title={stepData[step].title}
                  subtitle={stepData[step].subtitle}
                  items={stepData[step].items}
                  selected={stepData[step].val}
                  onSelect={handleSelect}
                  isMobile={isMobile}
                  searchable={stepData[step].searchable}
                  searchPlaceholder={t('onboarding.searchPlaceholder')}
                  groups={stepData[step].groups}
                />
              )}
              {step === 3 && <LoadingStep isMobile={isMobile} />}
              {step === 4 && <WelcomeStep goal={goal} time={time} onDone={() => onComplete(subject)} isMobile={isMobile} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 4 && (
          <div style={ss.footer}>
            <motion.button
              style={ss.primaryBtn}
              onClick={() => onComplete(subject)}
              whileTap={{ scale: 0.98 }}
            >
              {t('onboarding.startBtn')}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ──
const getStyles = (isMobile) => ({
  pageOuter: {
    minHeight: isMobile ? '100dvh' : '100vh',
    background: isMobile ? 'var(--bg)' : 'radial-gradient(circle at top left, var(--bg) 0%, var(--bg3) 100%)',
    display: isMobile ? 'block' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? 0 : '40px 20px',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    color: 'var(--text)',
  },
  page: {
    width: '100%',
    maxWidth: 460,
    minHeight: isMobile ? '100dvh' : 'auto',
    background: isMobile ? 'var(--bg2)' : 'var(--glass-bg)',
    backdropFilter: isMobile ? 'none' : 'blur(20px)',
    WebkitBackdropFilter: isMobile ? 'none' : 'blur(20px)',
    border: isMobile ? 'none' : '1px solid var(--glass-border)',
    borderRadius: isMobile ? 0 : 24,
    boxShadow: isMobile ? 'none' : '0 24px 80px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  progressTrack: { height: 4, background: 'var(--border)', flexShrink: 0 },
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: '0 2px 2px 0' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 0',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text)', padding: 6, display: 'flex', alignItems: 'center',
    borderRadius: 8,
  },
  content: { flex: 1, padding: '24px 20px 16px', overflowY: 'auto' },
  title: { fontSize: 26, fontWeight: 800, lineHeight: 1.25, marginBottom: 8, color: 'var(--text)' },
  subtitle: { fontSize: 14, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 },
  list: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 },
  groupHeader: { fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: 'var(--text3)', textTransform: 'uppercase', margin: '14px 2px 2px' },
  searchWrap: { position: 'relative', marginTop: 4, marginBottom: 4 },
  searchIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text3)', pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', padding: '13px 16px 13px 42px', fontSize: 15,
    border: '1.5px solid var(--border)', borderRadius: 14,
    background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  },
  searchEmpty: { textAlign: 'center', color: 'var(--text3)', fontSize: 14, padding: '24px 0' },
  listItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 18px', borderRadius: 18,
    cursor: 'pointer', textAlign: 'left', width: '100%',
    fontFamily: 'inherit', transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
  },
  badge: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, transition: 'all 0.18s',
  },
  listItemText: { flex: 1, display: 'flex', flexDirection: 'column' },
  footer: {
    padding: '12px 20px calc(16px + env(safe-area-inset-bottom))',
    borderTop: '1px solid var(--border)', background: isMobile ? 'var(--bg2)' : 'transparent',
  },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    background: 'var(--grad-primary)', color: '#fff',
    border: 'none', fontWeight: 700, fontSize: 16,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
    boxShadow: '0 8px 20px rgba(14, 151, 224, 0.28)',
  },
  loaderCircle: {
    width: 90, height: 90, borderRadius: '50%',
    border: '3px solid var(--blue-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
    boxShadow: '0 0 0 12px var(--blue-bg)',
    animation: 'skeletonPulse 2.5s ease infinite',
  },
  loaderInner: {
    width: 60, height: 60, borderRadius: '50%',
    background: 'var(--grad-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(14, 151, 224, 0.25)',
  },
  spinnerSmall: {
    width: 20, height: 20, borderRadius: '50%',
    border: '2px solid var(--blue-bg)',
    borderTopColor: 'var(--accent)',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  summaryRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
});
