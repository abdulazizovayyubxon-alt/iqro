import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

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
  CHOOSE: 'choose',         // Yangi: foydalanuvchi tanlaydi
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
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [birthDate, setBirthDate] = useState('');
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

  // ── TELEFON RAQAM KIRITILGANDA ──
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
      if (!res) {
        // signInWithPhone undefined qaytardi — kutilmagan holat
        setStep(STEPS.PHONE);
        setAuthError("Xatolik yuz berdi, qaytadan urinib ko'ring.");
        return;
      }

      if (res.success) {
        // Parolsiz to'g'ridan-to'g'ri muvaffaqiyatli kirdi
        return;
      }

      if (res.notRegistered) {
        // Yangi foydalanuvchi — avtomatik ro'yxatdan o'tish sahifasiga
        setStep(STEPS.REGISTER_NAME);
      } else if (res.needsChoice) {
        // Probe ishlamadi — foydalanuvchiga tanlov beramiz (fallback)
        setStep(STEPS.CHOOSE);
      } else if (res.hasCustomPassword) {
        // Foydalanuvchi mavjud, parol kiritish kerak
        setStep(STEPS.PASSWORD);
      } else {
        // Boshqa xato
        setStep(STEPS.PHONE);
      }
    } catch (e) {
      console.error("handlePhoneNext xatosi:", e);
      setStep(STEPS.PHONE);
      if (!authError) {
        setAuthError("Xatolik yuz berdi, qaytadan urinib ko'ring.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── FOYDALANUVCHI TANLOVI: YANGI HISOB ──
  const handleChooseRegister = () => {
    setAuthError('');
    setStep(STEPS.REGISTER_NAME);
  };

  // ── FOYDALANUVCHI TANLOVI: MAVJUD HISOB ──
  const handleChooseLogin = () => {
    setAuthError('');
    setStep(STEPS.PASSWORD);
  };

  // ── DAVOM ETISH TUGMASI ──
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
      try {
        const res = await signInWithPhone(name, phone, '', true, gender, birthDate);
        if (res && !res.success) {
          if (res.hasCustomPassword) {
            // Bu raqam oldindan mavjud — parol so'rash kerak
            setStep(STEPS.PASSWORD);
          } else {
            setStep(STEPS.PHONE);
          }
        }
      } catch (e) {
        console.error("Register xatosi:", e);
        setStep(STEPS.PHONE);
        if (!authError) setAuthError("Ro'yxatdan o'tishda xatolik.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === STEPS.PASSWORD) {
      if (!password) { setAuthError("Parolni kiriting"); return; }
      setLoading(true);
      try {
        await signInWithPhone('', phone, password, false);
      } catch (e) {
        console.error("Password login xatosi:", e);
        if (!authError) setAuthError("Kirishda xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    setAuthError('');
    if (step === STEPS.PASSWORD || step === STEPS.REGISTER_NAME || step === STEPS.CHOOSE) {
      setStep(STEPS.PHONE);
    }
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
    [STEPS.PHONE]: 0.25,
    [STEPS.CHECKING]: 0.50,
    [STEPS.CHOOSE]: 0.50,
    [STEPS.REGISTER_NAME]: 0.75,
    [STEPS.PASSWORD]: 0.75,
  };
  const progress = progressMap[step] || 0.25;

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
            <motion.button whileTap={{ scale: 0.9 }} style={s.backBtn} onClick={handleBack}>
              <ArrowLeft size={22} />
            </motion.button>
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
                  <h1 style={s.title}>Xush kelibsiz</h1>
                  <p style={s.subtitle}>
                    Telefon raqamingizni kiriting — tizimga tezkor kiring.
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
                    <div style={{ width: 40, height: 40, border: `3px solid var(--border)`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </>
              )}

              {/* ── STEP: CHOOSE — foydalanuvchi o'zi tanlaydi ── */}
              {step === STEPS.CHOOSE && (
                <>
                  <h1 style={s.title}>Raqam topildi</h1>
                  <p style={s.subtitle}>
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{phone}</strong> — bu raqam bilan nima qilmoqchisiz?
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    {/* Yangi hisob */}
                    <motion.button
                      id="choose-register-btn"
                      style={s.choiceBtn}
                      onClick={handleChooseRegister}
                      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={s.choiceIcon}>
                        <UserPlus size={22} color={PRIMARY} />
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={s.choiceTitle}>Yangi hisob yaratish</div>
                        <div style={s.choiceDesc}>Birinchi marta kiryapsizmi? Ro'yxatdan o'ting</div>
                      </div>
                    </motion.button>

                    {/* Mavjud hisob */}
                    <motion.button
                      id="choose-login-btn"
                      style={s.choiceBtn}
                      onClick={handleChooseLogin}
                      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={s.choiceIcon}>
                        <LogIn size={22} color="#10B981" />
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={s.choiceTitle}>Parol bilan kirish</div>
                        <div style={s.choiceDesc}>Avval ro'yxatdan o'tgansiz va parolingiz bor</div>
                      </div>
                    </motion.button>
                  </div>
                </>
              )}

              {/* ── STEP: REGISTER NAME ── */}
              {step === STEPS.REGISTER_NAME && (
                <>
                  <h1 style={s.title}>Hisobingizni yarating</h1>
                  <p style={s.subtitle}>
                    Bilimingizni sinab ko'ring, testlarda qatnashing va malakangizni oshiring.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '6px', display: 'block' }}>Ism va familiya</label>
                      <input
                        id="register-name-input"
                        style={s.input}
                        type="text"
                        placeholder="Ism va familiyangizni kiriting"
                        value={name}
                        onChange={e => { setAuthError(''); setName(e.target.value); }}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '6px', display: 'block' }}>Jinsingiz</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <motion.button
                          type="button"
                          onClick={() => setGender('male')}
                          whileTap={{ scale: 0.96 }}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '14px',
                            border: gender === 'male' ? `2px solid ${PRIMARY}` : '1.5px solid var(--border)',
                            background: gender === 'male' ? 'var(--blue-bg)' : 'var(--bg2)',
                            color: gender === 'male' ? PRIMARY : 'var(--text2)',
                            fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.15s',
                            boxShadow: gender === 'male' ? '0 4px 12px rgba(41, 182, 246, 0.12)' : 'none',
                          }}
                        >
                          Erkak
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => setGender('female')}
                          whileTap={{ scale: 0.96 }}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '14px',
                            border: gender === 'female' ? `2px solid ${PRIMARY}` : '1.5px solid var(--border)',
                            background: gender === 'female' ? 'var(--blue-bg)' : 'var(--bg2)',
                            color: gender === 'female' ? PRIMARY : 'var(--text2)',
                            fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.15s',
                            boxShadow: gender === 'female' ? '0 4px 12px rgba(41, 182, 246, 0.12)' : 'none',
                          }}
                        >
                          Ayol
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP: PASSWORD (kirish) ── */}
              {step === STEPS.PASSWORD && (
                <>
                  <h1 style={s.title}>Parolni kiriting</h1>
                  <p style={s.subtitle}>
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{phone}</strong> uchun parolingizni kiriting:
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password-input"
                      style={s.input}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Parolingiz"
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
          {step !== STEPS.CHECKING && step !== STEPS.CHOOSE && (
            <motion.button
              id="login-submit-btn"
              style={{ ...s.primaryBtn, opacity: loading || lockoutTimer ? 0.6 : 1 }}
              onClick={handleContinue}
              disabled={loading || !!lockoutTimer}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Iltimos, kuting...'
                : lockoutTimer ? `Kuting (${lockoutTimer}s)`
                : step === STEPS.PASSWORD ? 'Kirish' : 'Davom etish'}
            </motion.button>
          )}

          {/* Google — faqat 1-qadamda */}
          {step === STEPS.PHONE && (
            <>
              <div style={s.orRow}>
                <div style={s.orLine} />
                <span style={s.orText}>yoki</span>
                <div style={s.orLine} />
              </div>
              <motion.button 
                id="google-login-btn" 
                style={s.outlineBtn} 
                onClick={handleGoogle} 
                disabled={loading}
                whileTap={{ scale: 0.98 }}
              >
                <GoogleIcon /> Google orqali kirish
              </motion.button>
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
    padding: IS_MOBILE ? '16px 16px 0' : '20px 20px 0',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text)', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 8,
  },
  content: { flex: 1, padding: IS_MOBILE ? '16px 20px 8px' : '28px 24px 16px', overflowY: 'auto' },
  title: { fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, color: 'var(--text)' },
  subtitle: { fontSize: 15, color: 'var(--text3)', lineHeight: 1.6, marginBottom: IS_MOBILE ? 16 : 28 },
  phoneWrap: { marginBottom: 8 },
  phoneInput: {
    width: '100%', fontSize: 32, fontWeight: 800,
    color: 'var(--text)', border: 'none', outline: 'none',
    background: 'transparent', fontFamily: 'inherit',
    caretColor: PRIMARY, letterSpacing: 1,
    paddingBottom: 8, borderBottom: `2.5px solid ${PRIMARY}`,
  },
  input: {
    width: '100%', padding: '15px 18px', fontSize: 15,
    border: '1.5px solid var(--border)', borderRadius: 16,
    background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'inherit',
    outline: 'none', marginBottom: 12, transition: 'all 0.25s ease',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)',
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-60%)',
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
  },
  forgotBtn: {
    background: 'none', border: 'none', color: '#29B6F6',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 4, padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  errorText: { marginTop: 10, fontSize: 13, color: '#EF4444', fontWeight: 500 },
  footer: { 
    padding: IS_MOBILE 
      ? '12px 20px calc(12px + env(safe-area-inset-bottom))' 
      : '16px 24px calc(24px + env(safe-area-inset-bottom))', 
    borderTop: '1px solid var(--border)', 
    background: IS_MOBILE ? 'var(--bg2)' : 'transparent' 
  },
  primaryBtn: {
    width: '100%', padding: IS_MOBILE ? '14px' : '16px', borderRadius: 16,
    background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none',
    fontWeight: 700, fontSize: 16, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s', marginBottom: IS_MOBILE ? 8 : 12,
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)',
  },
  orRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: IS_MOBILE ? 8 : 12 },
  orLine: { flex: 1, height: 1, background: 'var(--border)' },
  orText: { fontSize: 13, color: 'var(--text3)', fontWeight: 500 },
  outlineBtn: {
    width: '100%', padding: IS_MOBILE ? '14px 16px' : '15px 16px', borderRadius: 16,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text)', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: IS_MOBILE ? 0 : 10, transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  // ── CHOOSE step styles ──
  choiceBtn: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '16px 18px', borderRadius: 20,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    width: '100%', textAlign: 'left',
  },
  choiceIcon: {
    width: 48, height: 48, borderRadius: 14,
    background: 'var(--bg3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid var(--border)',
  },
  choiceTitle: {
    fontSize: 16, fontWeight: 700, color: 'var(--text)',
    marginBottom: 2,
  },
  choiceDesc: {
    fontSize: 13, color: 'var(--text3)', lineHeight: 1.4,
  },
};
