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
  { id: 'art',   badge: 'S', title: 'Tasviriy San\'at', desc: 'Badiiy ta\'lim va san\'at nazariyasi' },
  { id: 'tarix', badge: 'T', title: 'Tarix', desc: 'O\'zbekiston va Jahon tarixi, metodika' },
  { id: 'sport', badge: 'J', title: 'Jismoniy Tarbiya', desc: 'Sport nazariyasi va metodikasi' },
  { id: 'boshlangich', badge: 'B', title: 'Boshlang\'ich Ta\'lim', desc: 'Ona tili, matematika, tabiiy fanlar, metodika' },
  { id: 'info', badge: 'I', title: 'Informatika va AT', desc: 'Kompyuter tizimlari, algoritmlash va dasturlash' },
  { id: 'mtt', badge: 'M', title: 'MTT Tarbiyachilari', desc: 'Maktabgacha ta\'lim pedagogikasi va metodikasi' },
  { id: 'mtt_rahbar', badge: 'D', title: 'MTT Dir. O\'rinbosari', desc: 'Metodik rahbarlik, me\'yoriy hujjatlar va boshqaruv' },
  { id: 'til', badge: 'O', title: 'Ona Tili va Adabiyot', desc: 'Til qoidalari, adabiyot tarixi va tahlili' },
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
            <motion.button
              key={item.id}
              style={{
                ...ss.listItem,
                border: isActive ? `2.5px solid ${PRIMARY}` : '1.5px solid var(--border)',
                background: isActive ? 'var(--blue-bg)' : 'var(--bg2)',
                boxShadow: isActive ? '0 8px 24px rgba(41, 182, 246, 0.12)' : '0 2px 8px rgba(0,0,0,0.01)',
              }}
              onClick={() => onSelect(item.id)}
              whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{
                ...ss.badge,
                background: isActive ? PRIMARY : 'var(--bg3)',
                color: isActive ? '#fff' : 'var(--text3)',
                boxShadow: isActive ? '0 4px 12px rgba(41, 182, 246, 0.2)' : 'none',
              }}>
                {item.badge}
              </div>
              <div style={ss.listItemText}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{item.title}</span>
                <span style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{item.desc}</span>
              </div>
              {isActive && <CheckCircle size={20} style={{ color: PRIMARY, flexShrink: 0 }} />}
            </motion.button>
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

      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '24px 0 8px' }}>
        Optimizing daily goals...
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 28 }}>
        Rejangiz tayyorlanmoqda, bir necha soniya kuting
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

function WelcomeStep({ goal, time, onDone }) {
  const goalObj = GOALS.find(g => g.id === goal);
  const timeObj = TIMES.find(t => t.id === time);

  return (
    <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h1 style={{ ...ss.title, textAlign: 'center', fontSize: 32, fontWeight: 900, marginBottom: 6 }}>Hammasi tayyor!</h1>
      <p style={{ ...ss.subtitle, textAlign: 'center', fontSize: 15, color: 'var(--text3)', marginBottom: 24 }}>IQRO platformasiga xush kelibsiz</p>

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
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#3B82F6'
            }}>
              {goalObj.badge}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Sizning toifangiz</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{goalObj.title}</span>
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
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Kunlik reja</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{timeObj.title}</span>
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
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Sinov muddati</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>7 kunlik bepul sinov</span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
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
        <span style={{ fontSize: 16 }}>🏆</span>
        <span style={{ textAlign: 'left' }}>Foydalanuvchilarning <strong style={{ color: 'var(--blue)', fontWeight: 800 }}>89%</strong> si o'z maqsadlariga erisha olishdi!</span>
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
    setTimeout(() => { setStep(4); setSaving(false); }, 2800);
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
              <motion.button whileTap={{ scale: 0.9 }} style={ss.backBtn} onClick={goBack}>
                <ArrowLeft size={22} />
              </motion.button>
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
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {step < 3 && (
                <ListStep
                  title={stepData[step].title}
                  subtitle={stepData[step].subtitle}
                  items={stepData[step].items}
                  selected={stepData[step].val}
                  onSelect={handleSelect}
                />
              )}
              {step === 3 && <LoadingStep />}
              {step === 4 && <WelcomeStep goal={goal} time={time} onDone={onComplete} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 4 && (
          <div style={ss.footer}>
            <motion.button
              style={ss.primaryBtn}
              onClick={onComplete}
              whileTap={{ scale: 0.98 }}
            >
              Platformani boshlash 🚀
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ──
const ss = {
  pageOuter: {
    minHeight: IS_MOBILE ? '100dvh' : '100vh',
    background: IS_MOBILE ? 'var(--bg)' : 'radial-gradient(circle at top left, var(--bg) 0%, var(--bg3) 100%)',
    display: IS_MOBILE ? 'block' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: IS_MOBILE ? 0 : '40px 20px',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    color: 'var(--text)',
  },
  page: {
    width: '100%',
    maxWidth: 460,
    minHeight: IS_MOBILE ? '100dvh' : 'auto',
    background: IS_MOBILE ? 'var(--bg2)' : 'var(--glass-bg)',
    backdropFilter: IS_MOBILE ? 'none' : 'blur(20px)',
    WebkitBackdropFilter: IS_MOBILE ? 'none' : 'blur(20px)',
    border: IS_MOBILE ? 'none' : '1px solid var(--glass-border)',
    borderRadius: IS_MOBILE ? 0 : 24,
    boxShadow: IS_MOBILE ? 'none' : '0 24px 80px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  progressTrack: { height: 4, background: 'var(--border)', flexShrink: 0 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #29B6F6, #8B5CF6)', borderRadius: '0 2px 2px 0' },
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
    borderTop: '1px solid var(--border)', background: IS_MOBILE ? 'var(--bg2)' : 'transparent',
  },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff',
    border: 'none', fontWeight: 700, fontSize: 16,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)',
  },
  loaderCircle: {
    width: 90, height: 90, borderRadius: '50%',
    border: `3px solid ${PRIMARY}20`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
    boxShadow: `0 0 0 12px ${PRIMARY}10`,
    animation: 'skeletonPulse 2.5s ease infinite',
  },
  loaderInner: {
    width: 60, height: 60, borderRadius: '50%',
    background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
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
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
};
