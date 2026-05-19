/**
 * OnboardingPage.jsx
 * Faqat yangi ro'yxatdan o'tgan foydalanuvchilarga ko'rsatiladi.
 * 4 ta qadam: Maqsad → Fan → Vaqt rejalash → Tabrik
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const GOALS = [
  { id: 'attestation', emoji: '🏆', title: 'Attestatsiyadan o\'tish', desc: 'Malaka oshirish va tasdiqlash' },
  { id: 'exam',        emoji: '📝', title: 'Imtihonga tayyorlanish', desc: 'IQRO sertifikatlash imtihoni' },
  { id: 'knowledge',   emoji: '🧠', title: 'Bilimni oshirish',       desc: 'Kasbiy rivojlanish' },
  { id: 'practice',    emoji: '🎯', title: 'Mashq qilish',           desc: 'Muntazam test yechish' },
];

const SUBJECTS = [
  { id: 'chqbt',  emoji: '🏛️', title: 'CHQBT',              desc: 'O\'zbekiston tarixi va huquq' },
  { id: 'ped',    emoji: '📚', title: 'Pedagogik Mahorat',   desc: 'Ta\'lim metodologiyasi' },
  { id: 'art',    emoji: '🎨', title: 'Tasviriy San\'at',    desc: 'Badiiy ta\'lim' },
  { id: 'multi',  emoji: '📖', title: 'Bir nechta fan',      desc: 'Barcha fanlar bo\'yicha' },
];

const TIMES = [
  { id: '10', emoji: '⚡', title: '10 daqiqa',  desc: 'Tez-tez, oz-ozdan' },
  { id: '20', emoji: '🎯', title: '20 daqiqa',  desc: 'Optimal balansi' },
  { id: '30', emoji: '💪', title: '30 daqiqa',  desc: 'Chuqur o\'rganish' },
  { id: '60', emoji: '🏅', title: '1 soat +',   desc: 'Jiddiy tayyorlanish' },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingPage({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0=maqsad, 1=fan, 2=vaqt, 3=loading, 4=tabrik
  const [dir, setDir] = useState(1);
  const [goal, setGoal]       = useState(null);
  const [subject, setSubject] = useState(null);
  const [time, setTime]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const goNext = () => { setDir(1); setStep(s => s + 1); };
  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const handleFinish = async () => {
    setSaving(true);
    setStep(3); // loading
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingDone: true,
          onboardingGoal: goal,
          onboardingSubject: subject,
          onboardingDailyMinutes: time,
        });
      }
    } catch (e) {
      console.error('Onboarding save error:', e);
    }
    setTimeout(() => { setStep(4); setSaving(false); }, 1200);
  };

  // ── Step renderlari ──
  const steps = [
    // 0 — Maqsad
    <ChoiceStep
      key="goal"
      dir={dir}
      title="Maqsadingiz nima?"
      subtitle="O'zingizga mos yo'nalishni tanlang"
      items={GOALS}
      selected={goal}
      onSelect={setGoal}
      onNext={goNext}
      step={0}
      total={3}
    />,
    // 1 — Fan
    <ChoiceStep
      key="subject"
      dir={dir}
      title="Qaysi fanda tayyorlanasiz?"
      subtitle="Eng ko'p vaqt sarflaydigan fan"
      items={SUBJECTS}
      selected={subject}
      onSelect={setSubject}
      onNext={goNext}
      onBack={goBack}
      step={1}
      total={3}
    />,
    // 2 — Kunlik vaqt
    <ChoiceStep
      key="time"
      dir={dir}
      title="Kunlik o'qish vaqti?"
      subtitle="Har kuni qancha vaqt ajrata olasiz?"
      items={TIMES}
      selected={time}
      onSelect={setTime}
      onNext={handleFinish}
      onBack={goBack}
      step={2}
      total={3}
      nextLabel="Boshlash 🚀"
      nextDisabled={saving}
    />,
    // 3 — Loading
    <LoadingStep key="loading" />,
    // 4 — Tabrik
    <WelcomeStep key="welcome" goal={goal} time={time} onDone={onComplete} />,
  ];

  return (
    <div style={styles.page}>
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />
      <div style={styles.card}>
        <AnimatePresence custom={dir} mode="wait">
          {steps[step]}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Qadam: Tanlov ──
function ChoiceStep({ dir, title, subtitle, items, selected, onSelect, onNext, onBack, step, total, nextLabel, nextDisabled }) {
  return (
    <motion.div
      custom={dir}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.28, ease: 'easeInOut' }}
      style={{ width: '100%' }}
    >
      {/* Progress dots */}
      <div style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ ...styles.dot, background: i === step ? 'var(--accent)' : 'var(--border)', width: i === step ? 24 : 8 }} />
        ))}
      </div>

      <div style={styles.emoji}>🎯</div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.subtitle}>{subtitle}</p>

      <div style={styles.grid}>
        {items.map(item => (
          <button
            key={item.id}
            style={{
              ...styles.choice,
              ...(selected === item.id ? styles.choiceActive : {}),
            }}
            onClick={() => onSelect(item.id)}
          >
            <span style={styles.choiceEmoji}>{item.emoji}</span>
            <span style={styles.choiceTitle}>{item.title}</span>
            <span style={styles.choiceDesc}>{item.desc}</span>
          </button>
        ))}
      </div>

      <div style={styles.btnRow}>
        {onBack && (
          <button style={styles.btnBack} onClick={onBack}>← Orqaga</button>
        )}
        <button
          style={{ ...styles.btnNext, opacity: (!selected || nextDisabled) ? 0.4 : 1, flex: 1 }}
          disabled={!selected || nextDisabled}
          onClick={onNext}
        >
          {nextLabel || 'Davom etish →'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Loading ──
function LoadingStep() {
  const messages = [
    'Profilingiz yaratilmoqda...',
    'Maqsadlaringiz sozlanmoqda...',
    'Siz uchun tayyorlanmoqda...',
  ];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={styles.spinner} />
      <p style={{ color: 'var(--text3)', marginTop: 24, fontSize: 15 }}>{messages[idx]}</p>
    </motion.div>
  );
}

// ── Tabrik ──
function WelcomeStep({ goal, time, onDone }) {
  const goalObj = GOALS.find(g => g.id === goal);
  const timeObj = TIMES.find(t => t.id === time);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ textAlign: 'center' }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ ...styles.title, fontSize: 24 }}>Hammasi tayyor!</h2>
      <p style={styles.subtitle}>IQRO platformasiga xush kelibsiz</p>

      {/* Stats box */}
      <div style={styles.statsBox}>
        {goalObj && (
          <div style={styles.statRow}>
            <span style={styles.statEmoji}>{goalObj.emoji}</span>
            <span style={styles.statText}>{goalObj.title}</span>
          </div>
        )}
        {timeObj && (
          <div style={styles.statRow}>
            <span style={styles.statEmoji}>{timeObj.emoji}</span>
            <span style={styles.statText}>Kunlik: {timeObj.title}</span>
          </div>
        )}
        <div style={styles.statRow}>
          <span style={styles.statEmoji}>⭐</span>
          <span style={styles.statText}>7 kunlik bepul sinov</span>
        </div>
      </div>

      {/* Social proof */}
      <div style={styles.proof}>
        🏆 Foydalanuvchilarning <strong>89%</strong> si maqsadiga erisha oldi
      </div>

      <button style={{ ...styles.btnNext, width: '100%', fontSize: 17, padding: '16px' }} onClick={onDone}>
        Platformani boshlash 🚀
      </button>
    </motion.div>
  );
}

// ── Styles ──
const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg)',
    padding: '20px', position: 'relative', overflow: 'hidden',
  },
  bgCircle1: {
    position: 'fixed', top: -120, right: -80,
    width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'fixed', bottom: -100, left: -80,
    width: 280, height: 280, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'var(--bg2)', borderRadius: 24,
    border: '1px solid var(--border)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
    padding: '36px 28px', width: '100%', maxWidth: 460,
    position: 'relative', zIndex: 1,
  },
  dots: {
    display: 'flex', alignItems: 'center', gap: 6,
    justifyContent: 'center', marginBottom: 28,
  },
  dot: {
    height: 8, borderRadius: 4, transition: 'all 0.3s',
  },
  emoji: { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  title: {
    fontSize: 21, fontWeight: 800, color: 'var(--text)',
    textAlign: 'center', margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 14, color: 'var(--text3)', textAlign: 'center',
    marginBottom: 24, lineHeight: 1.5,
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 10, marginBottom: 24,
  },
  choice: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit',
    gap: 4,
  },
  choiceActive: {
    border: '2px solid var(--accent)',
    background: 'rgba(59,130,246,0.07)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.12)',
  },
  choiceEmoji: { fontSize: 22 },
  choiceTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  choiceDesc:  { fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 },
  btnRow: { display: 'flex', gap: 10 },
  btnBack: {
    padding: '13px 18px', borderRadius: 12, border: '1.5px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text3)', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
  },
  btnNext: {
    padding: '13px 0', borderRadius: 12, border: 'none',
    background: 'var(--accent)', color: '#fff', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
    transition: 'opacity 0.2s',
  },
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  statsBox: {
    background: 'var(--bg3)', borderRadius: 16, padding: '16px 20px',
    marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
  },
  statRow: { display: 'flex', alignItems: 'center', gap: 12 },
  statEmoji: { fontSize: 20 },
  statText: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  proof: {
    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--text2)',
    marginBottom: 20, lineHeight: 1.5,
  },
};
