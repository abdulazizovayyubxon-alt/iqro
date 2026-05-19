import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

// ── Google SVG ──
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.7 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.7 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5 0 9.5-1.7 13.1-4.4l-6-5.2C28.8 36.1 26.5 36.8 24 36.8c-5.4 0-9.9-3.4-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.2l6 5.2C36.6 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
  </svg>
);

// ── Telegram SVG ──
const TelegramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#29B6F6">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.013 4.53 13.1c-.658-.204-.671-.658.136-.975l10.895-4.201c.548-.198 1.027.12.001.975l-.001-.001z"/>
  </svg>
);

const STEPS = {
  PHONE: 'phone',
  PASSWORD: 'password',
  REGISTER_NAME: 'register_name',
  REGISTER_PASS: 'register_pass',
};

export default function LoginPage() {
  const {
    signInWithPhone, signInWithGoogle, resetPassword,
    authError, setAuthError, calculatePasswordStrength, checkLockout
  } = useAuth();

  const [step, setStep] = useState(STEPS.PHONE);
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const s = checkLockout();
      setLockoutTimer(s.locked ? Math.ceil(s.remainingMs / 1000) : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkLockout]);

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return calculatePasswordStrength(password, phone.replace(/\D/g, ''));
  }, [password, phone, calculatePasswordStrength]);

  const handlePhoneChange = (e) => {
    setAuthError('');
    let v = e.target.value.replace(/[^\d+]/g, '');
    if (!v.startsWith('+998')) {
      if (v.startsWith('998')) v = '+' + v;
      else if (v.startsWith('+')) v = '+998';
      else v = '+998' + v;
    }
    if (v.length > 13) v = v.slice(0, 13);
    setPhone(v);
  };

  const isPhoneValid = () => {
    const c = phone.replace(/\D/g, '');
    return c.startsWith('998') && c.length === 12;
  };

  const handleContinue = async () => {
    setAuthError('');
    if (!isPhoneValid()) {
      setAuthError("To'g'ri telefon raqam kiriting");
      return;
    }
    if (step === STEPS.PHONE) {
      setStep(isRegister ? STEPS.REGISTER_NAME : STEPS.PASSWORD);
      return;
    }
    if (step === STEPS.REGISTER_NAME) {
      if (!name.trim() || name.length < 3) {
        setAuthError("Ism-familiyangizni to'liq kiriting");
        return;
      }
      setStep(STEPS.REGISTER_PASS);
      return;
    }
    if (step === STEPS.PASSWORD || step === STEPS.REGISTER_PASS) {
      if (!password) { setAuthError("Parolni kiriting"); return; }
      if (isRegister) {
        if (password.length < 10) { setAuthError("Parol kamida 10 belgi bo'lishi kerak"); return; }
        if (password !== confirmPassword) { setAuthError("Parollar mos kelmaydi"); return; }
      }
      setLoading(true);
      await signInWithPhone(isRegister ? name : (phone), phone, password, isRegister);
      setLoading(false);
    }
  };

  const handleBack = () => {
    setAuthError('');
    if (step === STEPS.PASSWORD || step === STEPS.REGISTER_NAME) setStep(STEPS.PHONE);
    else if (step === STEPS.REGISTER_PASS) setStep(STEPS.REGISTER_NAME);
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!isPhoneValid()) { setAuthError("Avval telefon raqamni kiriting"); return; }
    await resetPassword(phone);
  };

  // ── Progress ──
  const progressMap = {
    [STEPS.PHONE]: 0.25,
    [STEPS.REGISTER_NAME]: 0.5,
    [STEPS.PASSWORD]: 0.75,
    [STEPS.REGISTER_PASS]: 0.75,
  };
  const progress = progressMap[step] || 0.25;

  const getStrengthColor = (lvl) => {
    if (lvl === 'strong') return '#10B981';
    if (lvl === 'medium') return '#F59E0B';
    if (lvl === 'weak') return '#F97316';
    return '#EF4444';
  };

  return (
    <div style={s.pageOuter}>
    <div style={s.page}>
      {/* Progress bar */}
      <div style={s.progressTrack}>
        <motion.div
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={s.progressFill}
        />
      </div>

      {/* Header */}
      <div style={s.header}>
        {step !== STEPS.PHONE ? (
          <button style={s.backBtn} onClick={handleBack}>
            <ArrowLeft size={22} />
          </button>
        ) : <div style={{ width: 36 }} />}
        {/* Tab toggler — faqat birinchi qadamda */}
        {step === STEPS.PHONE && (
          <div style={s.tabRow}>
            <button
              style={{ ...s.tab, ...(isRegister ? {} : s.tabActive) }}
              onClick={() => { setIsRegister(false); setAuthError(''); }}
            >Kirish</button>
            <button
              style={{ ...s.tab, ...(isRegister ? s.tabActive : {}) }}
              onClick={() => { setIsRegister(true); setAuthError(''); }}
            >Ro'yxatdan o'tish</button>
          </div>
        )}
        <div style={{ width: 36 }} />
      </div>

      {/* Content */}
      <div style={s.content}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            {/* ── STEP: PHONE ── */}
            {step === STEPS.PHONE && (
              <>
                <p style={s.logo}>📚 IQRO</p>
                <h1 style={s.title}>Xush kelibsiz!</h1>
                <p style={s.subtitle}>
                  {isRegister
                    ? "Akkaunt yarating va tayyorlanishni boshlang"
                    : "Raqamingizdan foydalanib, o'quv jarayoningizni saqlang va istalgan qurilmada davom ettiring."}
                </p>
                <div style={s.phoneWrap}>
                  <input
                    id="login-phone-input"
                    style={s.phoneInput}
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 00 000 00 00"
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* ── STEP: REGISTER NAME ── */}
            {step === STEPS.REGISTER_NAME && (
              <>
                <h1 style={s.title}>Hisobingizni yarating</h1>
                <p style={s.subtitle}>Ismingizni kiriting, bu sizning profilingizda ko'rinadi.</p>
                <input
                  id="register-name-input"
                  style={s.input}
                  type="text"
                  placeholder="Ism va familiyangizni kiriting"
                  value={name}
                  onChange={e => { setAuthError(''); setName(e.target.value); }}
                  autoFocus
                />
              </>
            )}

            {/* ── STEP: PASSWORD (login) ── */}
            {step === STEPS.PASSWORD && (
              <>
                <h1 style={s.title}>Parolingizni kiriting</h1>
                <p style={s.subtitle}>{phone}</p>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password-input"
                    style={s.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Maxfiy parol"
                    value={password}
                    onChange={e => { setAuthError(''); setPassword(e.target.value); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={s.eyeBtn}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button style={s.forgotBtn} onClick={handleForgotPassword}>
                  Parolni unutdingizmi?
                </button>
              </>
            )}

            {/* ── STEP: REGISTER PASS ── */}
            {step === STEPS.REGISTER_PASS && (
              <>
                <h1 style={s.title}>Parol o'rnating</h1>
                <p style={s.subtitle}>Kamida 10 ta belgi, katta va kichik harflar bilan.</p>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    id="register-password-input"
                    style={s.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Yangi parol"
                    value={password}
                    onChange={e => { setAuthError(''); setPassword(e.target.value); }}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn} tabIndex={-1}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength bar */}
                {passwordStrength && password.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={s.strengthTrack}>
                      <motion.div
                        animate={{ width: `${passwordStrength.score}%` }}
                        style={{ ...s.strengthFill, background: getStrengthColor(passwordStrength.level) }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {[
                        { key: 'length', label: '10+ belgi' },
                        { key: 'uppercase', label: 'Katta harf' },
                        { key: 'digit', label: 'Raqam' },
                      ].map(({ key, label }) => (
                        <span key={key} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, color: passwordStrength.checks[key] ? '#10B981' : '#94A3B8'
                        }}>
                          {passwordStrength.checks[key] ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  id="register-confirm-password-input"
                  style={s.input}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Parolni tasdiqlang"
                  value={confirmPassword}
                  onChange={e => { setAuthError(''); setConfirmPassword(e.target.value); }}
                />
                {confirmPassword && (
                  <p style={{ fontSize: 13, marginTop: 6, color: password === confirmPassword ? '#10B981' : '#EF4444' }}>
                    {password === confirmPassword ? '✓ Parollar mos' : '✗ Parollar mos kelmaydi'}
                  </p>
                )}
              </>
            )}

            {/* Error */}
            {authError && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                style={s.errorText}
              >
                {authError}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={s.footer}>
        {/* Main CTA */}
        <button
          id="login-submit-btn"
          style={{
            ...s.primaryBtn,
            opacity: loading || lockoutTimer ? 0.6 : 1,
          }}
          onClick={handleContinue}
          disabled={loading || !!lockoutTimer}
        >
          {loading ? 'Iltimos, kuting...' : lockoutTimer ? `Kuting (${lockoutTimer}s)` : 'Davom etish'}
        </button>

        {/* Google & Telegram — faqat 1-qadamda */}
        {step === STEPS.PHONE && (
          <>
            <div style={s.orRow}>
              <div style={s.orLine} />
              <span style={s.orText}>yoki</span>
              <div style={s.orLine} />
            </div>
            <button id="google-login-btn" style={s.outlineBtn} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> Google orqali kirish
            </button>
          </>
        )}
      </div>
    </div>
    </div>
  );
}

// ── Styles ──
const PRIMARY = '#29B6F6';
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 768;

const s = {
  // Desktop: bg + centered card. Mobile: full white screen
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
  progressTrack: {
    height: 4, background: '#E2E8F0', flexShrink: 0,
  },
  progressFill: {
    height: '100%', background: PRIMARY, borderRadius: '0 2px 2px 0',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px 0',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#0F172A', padding: 6, display: 'flex', alignItems: 'center',
    borderRadius: 8,
  },
  tabRow: {
    display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 3,
  },
  tab: {
    padding: '7px 16px', borderRadius: 8, border: 'none',
    background: 'transparent', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'inherit',
    transition: 'all 0.18s',
  },
  tabActive: {
    background: '#fff', color: '#0F172A',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  content: {
    flex: 1, padding: '28px 24px 16px',
    overflowY: 'auto',
  },
  logo: {
    fontSize: 22, marginBottom: 8, fontWeight: 800, color: PRIMARY,
  },
  title: {
    fontSize: 28, fontWeight: 800, lineHeight: 1.2,
    marginBottom: 10, color: '#0F172A',
  },
  subtitle: {
    fontSize: 15, color: '#64748B', lineHeight: 1.6, marginBottom: 28,
  },
  phoneWrap: { marginBottom: 8 },
  phoneInput: {
    width: '100%', fontSize: 28, fontWeight: 700,
    color: '#0F172A', border: 'none', outline: 'none',
    background: 'transparent', fontFamily: 'inherit',
    caretColor: PRIMARY, letterSpacing: 1,
    paddingBottom: 8, borderBottom: `2px solid ${PRIMARY}`,
  },
  input: {
    width: '100%', padding: '15px 16px', fontSize: 16,
    border: '1.5px solid #E2E8F0', borderRadius: 14,
    background: '#F8FAFC', color: '#0F172A', fontFamily: 'inherit',
    outline: 'none', marginBottom: 12,
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-60%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
  },
  forgotBtn: {
    background: 'none', border: 'none', color: PRIMARY,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 4, padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  strengthTrack: {
    height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden',
  },
  strengthFill: {
    height: '100%', borderRadius: 3, transition: 'width 0.4s, background 0.3s',
  },
  errorText: {
    marginTop: 10, fontSize: 13, color: '#EF4444', fontWeight: 500,
  },
  footer: {
    padding: '16px 24px calc(24px + env(safe-area-inset-bottom))',
    borderTop: '1px solid #F1F5F9',
    background: '#fff',
  },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 14,
    background: PRIMARY, color: '#fff',
    border: 'none', fontWeight: 700, fontSize: 16,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'opacity 0.2s',
    marginBottom: 12,
  },
  orRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  orLine: { flex: 1, height: 1, background: '#E2E8F0' },
  orText: { fontSize: 13, color: '#94A3B8', fontWeight: 500 },
  outlineBtn: {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    border: '1.5px solid #E2E8F0', background: '#fff',
    color: '#0F172A', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 10, transition: 'background 0.15s',
  },
};
