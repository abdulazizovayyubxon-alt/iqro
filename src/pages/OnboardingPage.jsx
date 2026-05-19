/**
 * OnboardingPage.jsx — Namuna uslubida qayta yozilgan
 * Oq fon, katta sarlavha, vertikal kartochkalar, pastda yopishgan tugma
 * Desktop: markazlashgan karta | Mobil: to'liq ekran
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const PRIMARY = '#29B6F6';
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 768;

const GOALS = [
  { id: 'second_category', badge: '🥈', title: 'Ikkinchi toifa', desc: 'Navbatdagi malaka toifasini olish' },
  { id: 'first_category',  badge: '🥇', title: 'Birinchi toifa',  desc: 'Malaka toifasini oshirish' },
  { id: 'highest_category',badge: '🏆', title: 'Oliy toifa',      desc: 'Eng yuqori toifaga erishish' },
  { id: 'professional',    badge: '🎯', title: 'Kasbiy sertifikat uchun', desc: 'Milliy va kasbiy sertifikat imtihoni' },
];

const SUBJECTS = [
  { id: 'chqbt', badge: 'Q', title: 'CHQBT', desc: 'O\'zbekiston tarixi, huquqi, Konstitutsiya' },
  { id: 'ped',   badge: 'P', title: 'Pedagogik Mahorat', desc: 'Ta\'lim metodologiyasi va psixologiya' },
  { id: 'art',   badge: 'S', title: 'Tasviriy San\'at', desc: 'Badiiy ta\'lim va san\'at nazariyasi' },
  { id: 'multi', badge: '✦', title: 'Bir nechta fan', desc: 'Barcha fanlar bo\'yicha kompleks' },
];

const TIMES = [
  { id: '10', badge: '10', title: '10 daqiqa',  desc: 'Tez va ixcham — har kuni ozgina' },
  { id: '20', badge: '20', title: '20 daqiqa',  desc: 'Maqbul — ko\'pchilik shu tanlaydi' },
  { id: '30', badge: '30', title: '30 daqiqa',  desc: 'Yaxshi natija uchun' },
  { id: '60', badge: '60', title: '1 soat +',   desc: 'Jiddiy va chuqur tayyorlanish' },
];

const LOADING_STEPS = [
  'Profilingiz yaratilmoqda...',
  'Maqsadlaringiz sozlanmoqda...',
  'Kunlik reja tayyorlanmoqda...',
];

// ── Qadam komponentlari ──
function ListStep({ title, subtitle, items, selected, onSelect }) {
  return (
    <>
      <h1 style={ss.title}>{title}</h1>
      {subtitle && <p style={ss.subtitle}>{subtitle}</p>}
      <div style={ss.list}>
        {items.map(item => {
          const isActive = selected === item.id;
          return (
            <button
              key={item.id}
              style={{
                ...ss.listItem,
                border: isActive ? `2px solid ${PRIMARY}` : '1.5px solid #E2E8F0',
                background: isActive ? '#F0F9FF' : '#fff',
              }}
              onClick={() => onSelect(item.id)}
            >
              <div style={{
                ...ss.badge,
                background: isActive ? PRIMARY : '#F1F5F9',
                color: isActive ? '#fff' : '#64748B',
              }}>
                {item.badge}
              </div>
              <div style={ss.listItemText}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{item.title}</span>
                <span style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>{item.desc}</span>
              </div>
              {isActive && <CheckCircle size={20} style={{ color: PRIMARY, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function LoadingStep() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const prog = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 40);
    const step = setInterval(() => setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 800);
    return () => { clearInterval(prog); clearInterval(step); };
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      {/* Animated icon */}
      <div style={ss.loaderCircle}>
        <div style={ss.loaderInner}>
          <span style={{ fontSize: 28 }}>✦</span>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '24px 0 8px' }}>
        Optimizing daily goals...
      </h2>
      <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 28 }}>
        Rejangiz tayyorlanmoqda, bir necha soniya kuting
      </p>

      {/* Progress bar */}
      <div style={{ background: '#E2E8F0', borderRadius: 4, height: 6, marginBottom: 6, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          style={{ height: '100%', background: PRIMARY, borderRadius: 4 }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'right', marginBottom: 24 }}>{progress}%</p>

      {/* Checklist */}
      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LOADING_STEPS.map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {i < stepIdx ? (
              <CheckCircle size={20} style={{ color: PRIMARY, flexShrink: 0 }} />
            ) : i === stepIdx ? (
              <div style={ss.spinnerSmall} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E2E8F0', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 14, color: i <= stepIdx ? PRIMARY : '#94A3B8', fontWeight: i === stepIdx ? 600 : 400 }}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeStep({ goal, time, onDone }) {
  const goalObj = GOALS.find(g => g.id === goal);
  const timeObj = TIMES.find(t => t.id === time);

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h1 style={{ ...ss.title, textAlign: 'center' }}>Hammasi tayyor!</h1>
      <p style={{ ...ss.subtitle, textAlign: 'center' }}>IQRO platformasiga xush kelibsiz</p>

      <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
        {goalObj && (
          <div style={ss.summaryRow}>
            <span style={{ fontSize: 18 }}>{goalObj.badge}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{goalObj.title}</span>
          </div>
        )}
        {timeObj && (
          <div style={ss.summaryRow}>
            <span style={{ fontSize: 18 }}>⏱</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Kunlik: {timeObj.title}</span>
          </div>
        )}
        <div style={ss.summaryRow}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>7 kunlik bepul sinov</span>
        </div>
      </div>

      <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#0369A1', marginBottom: 24 }}>
        🏆 Foydalanuvchilarning <strong>89%</strong> si maqsadiga erisha oldi
      </div>
    </div>
  );
}

// ── Asosiy komponent ──
export default function OnboardingPage({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0=maqsad 1=fan 2=vaqt 3=loading 4=tabrik
  const [dir, setDir] = useState(1);
  const [goal, setGoal]     = useState(null);
  const [subject, setSubject] = useState(null);
  const [time, setTime]     = useState(null);
  const [saving, setSaving] = useState(false);

  const TOTAL_STEPS = 3; // 0,1,2
  const progress = step >= 3 ? 1 : (step + 1) / (TOTAL_STEPS + 1);

  const goNext = () => { setDir(1); setStep(s => s + 1); };
  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const handleFinish = async () => {
    setSaving(true);
    setStep(3);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingDone: true,
          onboardingGoal: goal,
          onboardingSubject: subject,
          onboardingDailyMinutes: time,
        });
      }
    } catch (e) { console.error(e); }
    setTimeout(() => { setStep(4); setSaving(false); }, 2800);
  };

  const currentSelected = [goal, subject, time][step] ?? null;
  const canProceed = step < 3 && currentSelected !== null;

  const stepData = [
    { title: 'Maqsadingiz nima?', subtitle: null, items: GOALS, val: goal, set: setGoal },
    { title: 'Qaysi fanda tayyorlanasiz?', subtitle: null, items: SUBJECTS, val: subject, set: setSubject },
    { title: 'Kunlik o\'qish vaqti?', subtitle: null, items: TIMES, val: time, set: setTime },
  ];

  return (
    <div style={ss.pageOuter}>
      <div style={ss.page}>
        {/* Progress bar */}
        <div style={ss.progressTrack}>
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={ss.progressFill}
          />
        </div>

        {/* Header */}
        {step < 3 && (
          <div style={ss.header}>
            {step > 0 ? (
              <button style={ss.backBtn} onClick={goBack}>
                <ArrowLeft size={22} />
              </button>
            ) : <div style={{ width: 36 }} />}
            <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>
              {step + 1} / {TOTAL_STEPS}
            </span>
            <div style={{ width: 36 }} />
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
              transition={{ duration: 0.22 }}
            >
              {step < 3 && (
                <ListStep
                  title={stepData[step].title}
                  subtitle={stepData[step].subtitle}
                  items={stepData[step].items}
                  selected={stepData[step].val}
                  onSelect={stepData[step].set}
                />
              )}
              {step === 3 && <LoadingStep />}
              {step === 4 && <WelcomeStep goal={goal} time={time} onDone={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div style={ss.footer}>
            <button
              style={{
                ...ss.primaryBtn,
                opacity: step < 3 && !canProceed ? 0.5 : 1,
              }}
              disabled={(step < 3 && !canProceed) || saving}
              onClick={step === 4 ? onComplete : step === 2 ? handleFinish : goNext}
            >
              {step === 4 ? 'Platformani boshlash 🚀' : 'Keyingi'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ──
const ss = {
  pageOuter: {
    minHeight: '100vh',
    background: IS_MOBILE ? '#fff' : 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    display: IS_MOBILE ? 'block' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: IS_MOBILE ? 0 : '40px 20px',
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    color: '#0F172A',
  },
  page: {
    width: '100%',
    maxWidth: 460,
    minHeight: IS_MOBILE ? '100vh' : 'auto',
    background: '#fff',
    borderRadius: IS_MOBILE ? 0 : 24,
    boxShadow: IS_MOBILE ? 'none' : '0 20px 60px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  progressTrack: { height: 4, background: '#E2E8F0', flexShrink: 0 },
  progressFill: { height: '100%', background: PRIMARY, borderRadius: '0 2px 2px 0' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px 0',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#0F172A', padding: 6, display: 'flex', alignItems: 'center',
    borderRadius: 8,
  },
  content: { flex: 1, padding: '24px 20px 16px', overflowY: 'auto' },
  title: { fontSize: 26, fontWeight: 800, lineHeight: 1.25, marginBottom: 8, color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 20, lineHeight: 1.5 },
  list: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 },
  listItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 14,
    cursor: 'pointer', textAlign: 'left', width: '100%',
    fontFamily: 'inherit', transition: 'all 0.18s',
  },
  badge: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, transition: 'all 0.18s',
  },
  listItemText: { flex: 1, display: 'flex', flexDirection: 'column' },
  footer: {
    padding: '12px 20px calc(16px + env(safe-area-inset-bottom))',
    borderTop: '1px solid #F1F5F9', background: '#fff',
  },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 14,
    background: PRIMARY, color: '#fff',
    border: 'none', fontWeight: 700, fontSize: 16,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s',
  },
  loaderCircle: {
    width: 100, height: 100, borderRadius: '50%',
    border: `3px solid ${PRIMARY}20`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
    boxShadow: `0 0 0 12px ${PRIMARY}10`,
    animation: 'pulse 2s ease infinite',
  },
  loaderInner: {
    width: 64, height: 64, borderRadius: '50%',
    background: PRIMARY,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff',
  },
  spinnerSmall: {
    width: 20, height: 20, borderRadius: '50%',
    border: `2px solid ${PRIMARY}40`,
    borderTopColor: PRIMARY,
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  summaryRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 0', borderBottom: '1px solid #F1F5F9',
  },
};
