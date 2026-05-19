import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.7 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.7 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5 0 9.5-1.7 13.1-4.4l-6-5.2C28.8 36.1 26.5 36.8 24 36.8c-5.4 0-9.9-3.4-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.2l6 5.2C36.6 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
  </svg>
);

const STEPS = {
  PHONE: 'phone',
  CHECKING: 'checking',
  PASSWORD: 'password',
  REGISTER_NAME: 'register_name',
};

const PRIMARY = '#29B6F6';
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 768;

export default function LoginPage() {
  const {
    signInWithPhone, signInWithGoogle, resetPassword,
    authError, setAuthError, checkLockout
  } = useAuth();

  const [step, setStep] = useState(STEPS.PHONE);
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
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

  const handlePhoneNext = async () => {
    setAuthError('');
    if (!isPhoneValid()) {
      setAuthError("To'g'ri telefon raqam kiriting");
      return;
    }
    setStep(STEPS.CHECKING);
    setLoading(true);
    try {
      const res = await signInWithPhone('', phone, '', false);
      if (res.success) {
        // Parolsiz to'g'ridan-to'g'ri muvaffaqiyatli kirdi
        return;
      }

      if (res.notRegistered) {
        setIsRegister(true);
        setStep(STEPS.REGISTER_NAME);
      } else if (res.hasCustomPassword) {
        // Eski profilingizda maxsus parol saqlangan
        setIsRegister(false);
        setStep(STEPS.PASSWORD);
      }
    } catch {
      setStep(STEPS.PHONE);
      setAuthError("Xatolik yuz berdi, qayta urining.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setAuthError('');

    if (step === STEPS.PHONE) {
      await handlePhoneNext();
      return;
    }

    if (step === STEPS.REGISTER_NAME) {
      if (!name.trim() || name.length < 3) {
        setAuthError("Ism-familiyangizni to'liq kiriting (kamida 3 belgi)");
        return;
      }
      setLoading(true);
      const res = await signInWithPhone(name, phone, '', true);
      setLoading(false);
      if (res && !res.success) {
        setStep(STEPS.PHONE);
      }
      return;
    }

    if (step === STEPS.PASSWORD) {
      if (!password) { setAuthError("Parolni kiriting"); return; }
      setLoading(true);
      await signInWithPhone('', phone, password, false);
      setLoading(false);
    }
  };

  const handleBack = () => {
    setAuthError('');
    if (step === STEPS.PASSWORD || step === STEPS.REGISTER_NAME) setStep(STEPS.PHONE);
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

  const progressMap = {
    [STEPS.PHONE]: 0.33,
    [STEPS.CHECKING]: 0.66,
    [STEPS.REGISTER_NAME]: 0.85,
    [STEPS.PASSWORD]: 0.85,
  };
  const progress = progressMap[step] || 0.33;

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

        {/* Header — faqat orqaga qaytish tugmasi */}
        <div style={s.header}>
          {step !== STEPS.PHONE && step !== STEPS.CHECKING ? (
            <button style={s.backBtn} onClick={handleBack}>
              <ArrowLeft size={22} />
            </button>
          ) : <div style={{ width: 36 }} />}
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
                  <h1 style={s.title}>Telefon raqamingiz</h1>
                  <p style={s.subtitle}>
                    Raqamingizni kiriting va parol so'ralmasdan profilingizga tezkor kiring.
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
                      onKeyDown={e => e.key === 'Enter' && handlePhoneNext()}
                    />
                  </div>
                </>
              )}

              {/* ── STEP: CHECKING ── */}
              {step === STEPS.CHECKING && (
                <>
                  <h1 style={s.title}>Tekshirilmoqda...</h1>
                  <p style={s.subtitle}>{phone}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: 40, height: 40, border: `3px solid #E2E8F0`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </>
              )}

              {/* ── STEP: REGISTER NAME ── */}
              {step === STEPS.REGISTER_NAME && (
                <>
                  <h1 style={s.title}>Ismingizni kiriting</h1>
                  <p style={s.subtitle}>
                    Profil yaratish uchun ism-familiyangizni kiriting.
                  </p>
                  <input
                    id="register-name-input"
                    style={s.input}
                    type="text"
                    placeholder="Ism va familiyangiz"
                    value={name}
                    onChange={e => { setAuthError(''); setName(e.target.value); }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleContinue()}
                  />
                </>
              )}

              {/* ── STEP: PASSWORD (kirish) ── */}
              {step === STEPS.PASSWORD && (
                <>
                  <h1 style={s.title}>Parolni kiriting</h1>
                  <p style={s.subtitle}>
                    Profilingizda eski maxsus parol o'rnatilgan. Uni kiriting:
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password-input"
                      style={s.input}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Eski parolingiz"
                      value={password}
                      onChange={e => { setAuthError(''); setPassword(e.target.value); }}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleContinue()}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn} tabIndex={-1}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button style={s.forgotBtn} onClick={handleForgotPassword}>
                    Parolni tiklash
                  </button>
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
          {step !== STEPS.CHECKING && (
            <button
              id="login-submit-btn"
              style={{ ...s.primaryBtn, opacity: loading || lockoutTimer ? 0.6 : 1 }}
              onClick={handleContinue}
              disabled={loading || !!lockoutTimer}
            >
              {loading ? 'Iltimos, kuting...'
                : lockoutTimer ? `Kuting (${lockoutTimer}s)`
                : step === STEPS.PASSWORD ? 'Kirish' : 'Davom etish'}
            </button>
          )}

          {/* Google — faqat 1-qadamda */}
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
const s = {
  pageOuter: {
    minHeight: '100vh',
    background: IS_MOBILE ? 'var(--bg)' : 'linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%)',
    display: IS_MOBILE ? 'block' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: IS_MOBILE ? 0 : '40px 20px',
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    color: 'var(--text)',
  },
  page: {
    width: '100%',
    maxWidth: 460,
    minHeight: IS_MOBILE ? '100vh' : 'auto',
    background: 'var(--bg2)',
    borderRadius: IS_MOBILE ? 0 : 24,
    boxShadow: IS_MOBILE ? 'none' : '0 20px 60px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  progressTrack: { height: 4, background: 'var(--border)', flexShrink: 0 },
  progressFill: { height: '100%', background: PRIMARY, borderRadius: '0 2px 2px 0' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px 0',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text)', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 8,
  },
  content: { flex: 1, padding: '28px 24px 16px', overflowY: 'auto' },
  title: { fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 10, color: 'var(--text)' },
  subtitle: { fontSize: 15, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28 },
  phoneWrap: { marginBottom: 8 },
  phoneInput: {
    width: '100%', fontSize: 28, fontWeight: 700,
    color: 'var(--text)', border: 'none', outline: 'none',
    background: 'transparent', fontFamily: 'inherit',
    caretColor: PRIMARY, letterSpacing: 1,
    paddingBottom: 8, borderBottom: `2px solid ${PRIMARY}`,
  },
  input: {
    width: '100%', padding: '15px 16px', fontSize: 16,
    border: '1.5px solid var(--border)', borderRadius: 14,
    background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'inherit',
    outline: 'none', marginBottom: 12, transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-60%)',
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
  },
  forgotBtn: {
    background: 'none', border: 'none', color: PRIMARY,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 4, padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  errorText: { marginTop: 10, fontSize: 13, color: '#EF4444', fontWeight: 500 },
  footer: { padding: '16px 24px calc(24px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg2)' },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 14,
    background: PRIMARY, color: '#fff', border: 'none',
    fontWeight: 700, fontSize: 16, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'opacity 0.2s', marginBottom: 12,
  },
  orRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  orLine: { flex: 1, height: 1, background: 'var(--border)' },
  orText: { fontSize: 13, color: 'var(--text3)', fontWeight: 500 },
  outlineBtn: {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text)', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 10, transition: 'background 0.15s',
  },
};
