import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Send, ShieldCheck } from 'lucide-react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase';
import { useIsMobile } from '../hooks/useIsMobile';
import BrandLogo from '../components/shared/BrandLogo';

const STEPS = {
  PHONE: 'phone',
  CHECKING: 'checking',  // Fonda raqam ro'yxatdan o'tganmi tekshiriladi
  AUTH: 'auth',          // Parol kiritish + (kerak bo'lsa) ro'yxatdan o'tish — bitta moslashuvchan ekran
};

const PRIMARY = '#0E97E0';

export default function LoginPage() {
  const { t } = useTranslation();
  const {
    signInWithPhone,
    authError, setAuthError, checkLockout, checkUserExists
  } = useAuth();

  const isMobile = useIsMobile();
  const s = getStyles(isMobile);

  const [step, setStep] = useState(STEPS.PHONE);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(null);
  const [featureIdx, setFeatureIdx] = useState(0);
  const [tgPolling, setTgPolling] = useState(false);

  useEffect(() => {
    if (step === STEPS.PHONE) {
      const int = setInterval(() => {
        setFeatureIdx(prev => (prev + 1) % 3);
      }, 3000);
      return () => clearInterval(int);
    }
  }, [step]);

  const FEATURES = [
    { icon: '🚀', title: t('login.f1Title'), desc: t('login.f1Desc') },
    { icon: '🧠', title: t('login.f2Title'), desc: t('login.f2Desc') },
    { icon: '📵', title: t('login.f3Title'), desc: t('login.f3Desc') }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const s = checkLockout();
      setLockoutTimer(s.locked ? Math.ceil(s.remainingMs / 1000) : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkLockout]);

  // Komponent yo'q qilinganda Telegram polling va focus/visibility listenerlarini
  // tozalaymiz (xotira oqishi va "yetim" so'rovlarning oldini olish uchun).
  useEffect(() => () => {
    window.tgActive = false;
    if (window.tgTimer) clearTimeout(window.tgTimer);
    if (window.tgVisHandler) {
      document.removeEventListener('visibilitychange', window.tgVisHandler);
      window.removeEventListener('focus', window.tgVisHandler);
      window.tgVisHandler = null;
    }
  }, []);

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
  // "Yangimisiz?" deb so'ramaymiz — fonda /api/check-user orqali raqam
  // ro'yxatdan o'tganmi tekshiramiz va to'g'ri ekranga olib o'tamiz:
  //   mavjud → login (parol), yangi → register (ism + parol).
  // Havolalar qo'lda zaxira sifatida qoladi; ro'yxat/kirish o'zaro ham
  // avtomatik tuzatiladi (band raqam → kirish, yangi raqam → ro'yxat).
  const handlePhoneNext = async () => {
    setAuthError('');
    if (!isPhoneValid()) {
      setAuthError(t('login.errPhone'));
      return;
    }
    setStep(STEPS.CHECKING);
    try {
      const exists = await checkUserExists(phone);
      setAuthMode(exists ? 'login' : 'register');
    } catch (e) {
      console.warn('Raqamni tekshirishda xatolik:', e);
      setAuthMode('login'); // zaxira: parol ekrani (havoladan ro'yxatga o'tsa bo'ladi)
    } finally {
      setStep(STEPS.AUTH);
    }
  };

  // Login ↔ Register rejimini almashtirish (AUTH ekranidagi havola)
  const switchAuthMode = (mode) => {
    setAuthError('');
    setAuthMode(mode);
  };

  // ── DAVOM ETISH / KIRISH / RO'YXATDAN O'TISH TUGMASI ──
  const handleContinue = async () => {
    setAuthError('');

    if (step === STEPS.PHONE) {
      await handlePhoneNext();
      return;
    }

    // ── AUTH ekrani ──
    if (authMode === 'register') {
      if (!name.trim() || name.length < 3) {
        setAuthError(t('login.errName'));
        return;
      }
      if (!password || password.length < 6) {
        setAuthError(t('login.errPassword'));
        return;
      }
      setLoading(true);
      try {
        const res = await signInWithPhone(name, phone, password, true, '', '');
        if (res && !res.success && res.hasCustomPassword) {
          // Bu raqam allaqachon ro'yxatdan o'tgan — kirish rejimiga o'tamiz
          setAuthMode('login');
          setAuthError(t('login.errAlreadyReg'));
        }
      } catch (e) {
        console.error("Register xatosi:", e);
        if (!authError) setAuthError(t('login.errRegisterFail'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // authMode === 'login'
    if (!password) { setAuthError(t('login.errEnterPass')); return; }
    setLoading(true);
    try {
      const res = await signInWithPhone('', phone, password, false);
      if (res && !res.success && res.notRegistered) {
        // Bu raqam hali ro'yxatdan o'tmagan — ro'yxat rejimiga o'tamiz
        setAuthMode('register');
        setAuthError(t('login.errNotReg'));
      }
    } catch (e) {
      console.error("Login xatosi:", e);
      if (!authError) setAuthError(t('login.errLoginFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setAuthError('');
    if (step === STEPS.AUTH) {
      setStep(STEPS.PHONE);
      setAuthMode('login');
    }
  };

  const handleForgotPassword = async () => {
    if (!isPhoneValid()) { setAuthError(t('login.errEnterPhone')); return; }
    // Telefon hisoblarining emaili soxta (@iqro.uz) — email orqali tiklash ishlamaydi.
    // Yagona ishonchli tiklash kanali: Telegram orqali parolsiz kirib, so'ng Profil →
    // "Parolni o'zgartirish" orqali yangi parol o'rnatiladi. Avval bu tugma faqat matnli
    // ko'rsatma berardi; endi tiklash oqimini (Telegram) to'g'ridan-to'g'ri ishga tushiradi.
    await handleTelegramLogin();
  };

  // Telegram kuzatuvini to'liq to'xtatish: polling timer + focus/visibility listenerlar.
  const stopTgWatch = () => {
    window.tgActive = false;
    if (window.tgTimer) clearTimeout(window.tgTimer);
    if (window.tgVisHandler) {
      document.removeEventListener('visibilitychange', window.tgVisHandler);
      window.removeEventListener('focus', window.tgVisHandler);
      window.tgVisHandler = null;
    }
  };

  const handleTelegramLogin = async () => {
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    window.location.href = `tg://resolve?domain=IQRO_testbot&start=login_${sessionId}`;
    setLoading(true);
    setTgPolling(true);
    setAuthError(t('login.tgWaiting'));

    // Avvalgi kuzatuv (timer + listenerlar) bo'lsa tozalaymiz, keyin yangisini boshlaymiz.
    stopTgWatch();
    window.tgActive = true;
    const deadline = Date.now() + 120000; // 2 daqiqa
    let delay = 2500;

    // Sekin-asta orqaga chekinuvchi polling (2.5s → 6s) — setInterval o'rniga rekursiv
    // setTimeout. So'rovlar sonini ~yarmiga kamaytiradi (server yuki + batareya tejaladi).
    const poll = async () => {
      if (!window.tgActive) return;
      if (Date.now() > deadline) {
        stopTgWatch();
        setLoading(false);
        setTgPolling(false);
        setAuthError(t('login.tgTimeout'));
        return;
      }
      try {
        const res = await fetch(`/api/telegram-auth?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.token) {
          stopTgWatch();
          setTgPolling(false);
          setAuthError('');
          setLoading(false);
          await signInWithCustomToken(auth, data.token);
          return; // onAuthStateChanged o'zi user ni set qiladi
        }
      } catch (e) {
        console.error(e);
      }
      if (!window.tgActive) return;
      delay = Math.min(delay + 500, 6000); // backoff
      window.tgTimer = setTimeout(poll, delay);
    };

    // Foydalanuvchi Telegram'dan ilovaga QAYTGAN payti — odatda aynan shunda tasdiq
    // tayyor bo'ladi. Qaytishi bilan kutishni to'xtatib darhol tekshiramiz va keyingi
    // urinishlarni tezlashtiramiz (6s backoff o'rniga 1.5s). Bu kutish vaqtini
    // keskin qisqartiradi va aniq "Tekshirilmoqda..." statusini ko'rsatadi.
    const onReturn = () => {
      if (!window.tgActive || document.visibilityState === 'hidden') return;
      setAuthError(t('login.tgChecking'));
      delay = 1500;
      if (window.tgTimer) clearTimeout(window.tgTimer);
      poll();
    };
    window.tgVisHandler = onReturn;
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);

    window.tgTimer = setTimeout(poll, delay);
  };

  const cancelTelegramLogin = () => {
    stopTgWatch();
    setLoading(false);
    setTgPolling(false);
    setAuthError('');
  };

  const progressMap = {
    [STEPS.PHONE]: 0.45,
    [STEPS.CHECKING]: 0.7,
    [STEPS.AUTH]: 1,
  };
  const progress = progressMap[step] || 0.4;

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
          {step === STEPS.AUTH ? (
            <motion.button whileTap={{ scale: 0.9 }} style={s.backBtn} onClick={handleBack}>
              <ArrowLeft size={22} />
            </motion.button>
          ) : <div style={{ width: 36 }} />}
          <BrandLogo size={22} />
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
                  <div style={{ marginBottom: 32, minHeight: 80, display: 'flex', alignItems: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={featureIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 16 }}
                      >
                        <div style={{ fontSize: 48, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
                          {FEATURES[featureIdx].icon}
                        </div>
                        <div>
                          <h1 style={{ ...s.title, marginBottom: 6, fontSize: 24, lineHeight: 1.1 }}>{FEATURES[featureIdx].title}</h1>
                          <p style={{ ...s.subtitle, marginBottom: 0, fontSize: 13, lineHeight: 1.4 }}>{FEATURES[featureIdx].desc}</p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div style={s.phoneWrap}>
                    <input
                      id="login-phone-input"
                      style={s.phoneInput}
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+998 00 000 00 00"
                      onKeyDown={e => e.key === 'Enter' && handlePhoneNext()}
                    />
                  </div>
                </>
              )}

              {/* ── STEP: CHECKING — fonda raqam tekshirilmoqda ── */}
              {step === STEPS.CHECKING && (
                <>
                  <h1 style={s.title}>{t('login.checking')}</h1>
                  <p style={s.subtitle}>
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{phone}</strong>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <div style={{ width: 44, height: 44, border: `3px solid var(--border)`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                </>
              )}

              {/* ── STEP: AUTH — kirish yoki ro'yxatdan o'tish (bitta ekran) ── */}
              {step === STEPS.AUTH && authMode === 'login' && (
                <>
                  <h1 style={s.title}>{t('login.loginTitle')}</h1>
                  <p style={s.subtitle}>
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{phone}</strong> {t('login.loginSubtitleSuffix')}
                  </p>

                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password-input"
                      style={s.input}
                      type={showPass ? 'text' : 'password'}
                      placeholder={t('login.passwordPlaceholder')}
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
                    {t('login.forgot')}
                  </button>

                  {/* Yangi foydalanuvchi uchun havola */}
                  <div style={s.switchRow}>
                    <span style={{ color: 'var(--text3)' }}>{t('login.noAccount')}</span>
                    <button type="button" style={s.switchLink} onClick={() => switchAuthMode('register')}>
                      {t('login.createAccount')}
                    </button>
                  </div>
                </>
              )}

              {step === STEPS.AUTH && authMode === 'register' && (
                <>
                  <h1 style={s.title}>{t('login.registerTitle')}</h1>
                  <p style={s.subtitle}>
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{phone}</strong> {t('login.registerSubtitleSuffix')}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '6px' }}>
                    <div>
                      <label style={s.fieldLabel}>{t('login.nameLabel')}</label>
                      <input
                        id="register-name-input"
                        style={s.input}
                        type="text"
                        placeholder={t('login.namePlaceholder')}
                        value={name}
                        onChange={e => { setAuthError(''); setName(e.target.value); }}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label style={s.fieldLabel}>{t('login.passwordLabel')}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          style={s.input}
                          type={showPass ? 'text' : 'password'}
                          placeholder={t('login.passwordCreatePlaceholder')}
                          value={password}
                          onChange={e => { setAuthError(''); setPassword(e.target.value); }}
                          onKeyDown={e => e.key === 'Enter' && handleContinue()}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn} tabIndex={-1}>
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mavjud foydalanuvchi uchun havola */}
                  <div style={s.switchRow}>
                    <span style={{ color: 'var(--text3)' }}>{t('login.haveAccount')}</span>
                    <button type="button" style={s.switchLink} onClick={() => switchAuthMode('login')}>
                      {t('login.signIn')}
                    </button>
                  </div>
                </>
              )}

              {/* Error */}
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
                >
                  <p style={s.errorText}>
                    {authError}
                  </p>
                  {tgPolling && (
                    <button
                      onClick={cancelTelegramLogin}
                      style={{ background: 'transparent', border: '1px solid #FF3B30', color: '#FF3B30', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {t('common.cancel')}
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          {/* ── PHONE qadami: telefon ASOSIY, Telegram ikkinchi darajali (lekin sezilarli) ── */}
          {step === STEPS.PHONE ? (
            <>
              {/* Telefon — ASOSIY */}
              <motion.button
                id="login-submit-btn"
                style={{ ...s.primaryBtn, opacity: loading || lockoutTimer ? 0.6 : 1, marginBottom: 12 }}
                onClick={handleContinue}
                disabled={loading || !!lockoutTimer}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? t('login.pleaseWait')
                  : lockoutTimer ? t('login.wait', { sec: lockoutTimer })
                  : t('login.continuePhone')}
              </motion.button>

              <div style={s.orRow}>
                <div style={s.orLine} />
                <span style={s.orText}>{t('login.orTelegram')}</span>
                <div style={s.orLine} />
              </div>

              {/* Telegram — IKKINCHI DARAJALI, lekin sezilarli (azure rangli) */}
              <motion.button
                style={s.telegramBtn}
                onClick={handleTelegramLogin}
                disabled={loading}
                whileTap={{ scale: 0.98 }}
              >
                <Send size={20} color="var(--accent)" /> {t('login.telegramLogin')}
              </motion.button>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                {t('login.telegramHint')}
              </div>
            </>
          ) : step === STEPS.AUTH && (
            <motion.button
              id="login-submit-btn"
              style={{ ...s.primaryBtn, opacity: loading || lockoutTimer ? 0.6 : 1 }}
              onClick={handleContinue}
              disabled={loading || !!lockoutTimer}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? t('login.pleaseWait')
                : lockoutTimer ? t('login.wait', { sec: lockoutTimer })
                : authMode === 'register' ? t('login.createAccountBtn') : t('login.signIn')}
            </motion.button>
          )}

          {/* Trust Badges & Policies */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              {t('login.policyP1')} <a href="/privacy" style={{color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600}}>{t('login.privacyLink')}</a> {t('login.policyMid')} <a href="/terms" style={{color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600}}>{t('login.termsLink')}</a>{t('login.policyP2')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.6 }}>
              <ShieldCheck size={16} color="var(--text)" />
              <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{t('login.dataSecure')}</span>
            </div>
          </div>
        </div>
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
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #0E97E0, #0B79B8)', borderRadius: '0 2px 2px 0' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: isMobile ? '16px 16px 0' : '20px 20px 0',
  },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text)', width: '48px', height: '48px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
    transition: 'background 0.2s',
  },
  content: { flex: 1, padding: isMobile ? '16px 20px 8px' : '28px 24px 16px', overflowY: 'auto' },
  title: { fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, color: 'var(--text)' },
  subtitle: { fontSize: 15, color: 'var(--text3)', lineHeight: 1.6, marginBottom: isMobile ? 16 : 28 },
  phoneWrap: { marginBottom: 8 },
  phoneInput: {
    width: '100%', fontSize: 32, fontWeight: 800,
    color: 'var(--text)', border: 'none', outline: 'none',
    background: 'transparent', fontFamily: 'inherit',
    caretColor: PRIMARY, letterSpacing: 1,
    paddingBottom: 8, borderBottom: `2.5px solid ${PRIMARY}`,
  },
  input: {
    width: '100%', padding: '16px 18px', fontSize: 15,
    border: '1.5px solid var(--border)', borderRadius: 16,
    background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'inherit',
    outline: 'none', marginBottom: 12, transition: 'all 0.25s ease',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)',
  },
  eyeBtn: {
    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
    width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  forgotBtn: {
    background: 'none', border: 'none', color: 'var(--accent2)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', marginTop: '6px', padding: '12px 0px',
    textDecoration: 'underline', textUnderlineOffset: 3,
    display: 'inline-block', minHeight: '44px',
  },
  errorText: { marginTop: 10, fontSize: 13, color: '#EF4444', fontWeight: 500 },
  footer: { 
    padding: isMobile 
      ? '12px 20px calc(12px + env(safe-area-inset-bottom))' 
      : '16px 24px calc(24px + env(safe-area-inset-bottom))', 
    borderTop: '1px solid var(--border)', 
    background: isMobile ? 'var(--bg2)' : 'transparent' 
  },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    background: 'var(--grad-primary)', color: '#fff', border: 'none',
    fontWeight: 700, fontSize: 16, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s', marginBottom: isMobile ? 8 : 12,
    boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)',
  },
  orRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 8 : 12 },
  orLine: { flex: 1, height: 1, background: 'var(--border)' },
  orText: { fontSize: 13, color: 'var(--text3)', fontWeight: 500 },
  outlineBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text)', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: isMobile ? 0 : 10, transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  // Telegram — ikkinchi darajali, lekin azure rangi bilan sezilarli
  telegramBtn: {
    width: '100%', padding: '15px', borderRadius: 16,
    border: '1.5px solid var(--accent)', background: 'var(--blue-bg)',
    color: 'var(--accent2)', fontWeight: 700, fontSize: 15,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'all 0.2s',
  },
  // ── AUTH step styles ──
  fieldLabel: {
    fontSize: '13px', fontWeight: 600, color: 'var(--text2)',
    marginBottom: '6px', display: 'block',
  },
  switchRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 18, fontSize: 14, flexWrap: 'wrap',
  },
  switchLink: {
    background: 'none', border: 'none', color: 'var(--accent2)',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', padding: '4px 2px',
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
});
