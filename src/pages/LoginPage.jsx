import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

import { useIsMobile } from '../hooks/useIsMobile';
import BrandLogo from '../components/shared/BrandLogo';

const STEPS = {
  PHONE: 'phone',
  OTP: 'otp',    // SMS kodni kiritish (+ yangi bo'lsa ism) — parol o'rniga
};

const PRIMARY = '#0E97E0';

// Cynox qamrovidagi operator kodlari (998'dan keyingi 2 xona). Boshqasiga SMS yuborilmaydi.
const SUPPORTED_OPERATOR_CODES = new Set([
  '97', '88', '87', '93', '94', '50', '33', '98', '80',
  '90', '91', '92', '99', '77', '70', '95', '20',
]);

export default function LoginPage() {
  const { t } = useTranslation();
  const {
    sendOtp, verifyOtp,
    authError, setAuthError, checkLockout
  } = useAuth();

  const isMobile = useIsMobile();
  const s = getStyles(isMobile);

  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [otpIsNew, setOtpIsNew] = useState(false); // OTP ekranida ism so'ralsinmi
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);     // Qayta yuborishgacha soniya
  const [lockoutTimer, setLockoutTimer] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const st = checkLockout();
      setLockoutTimer(st.locked ? Math.ceil(st.remainingMs / 1000) : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkLockout]);

  // Qayta yuborish (resend) countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Ko'rsatish uchun guruhlab formatlash: +998 90 123 45 67
  const formatPhoneDisplay = (digits) => {
    const rest = digits.slice(3);
    let out = '+998';
    if (rest.length > 0) out += ' ' + rest.slice(0, 2);
    if (rest.length > 2) out += ' ' + rest.slice(2, 5);
    if (rest.length > 5) out += ' ' + rest.slice(5, 7);
    if (rest.length > 7) out += ' ' + rest.slice(7, 9);
    return out;
  };

  // Qayta yuborish hisoblagichi: 120 → "2:00", 45 → "0:45"
  const formatCountdown = (sec) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const handlePhoneChange = (e) => {
    setAuthError('');
    let digits = e.target.value.replace(/\D/g, '');
    if (!digits.startsWith('998')) digits = '998' + digits;
    digits = digits.slice(0, 12); // 998 + 9 xonali raqam
    setPhone(formatPhoneDisplay(digits));
  };

  const isPhoneValid = () => {
    const c = phone.replace(/\D/g, '');
    return c.startsWith('998') && c.length === 12;
  };

  // Xato kodini foydalanuvchi matniga aylantirish
  const otpErrorText = (err, remaining) => {
    switch (err) {
      case 'invalid': return remaining > 0
        ? t('login.otpErrInvalidLeft', { n: remaining })
        : t('login.otpErrInvalid');
      case 'expired': return t('login.otpErrExpired');
      case 'too_many': return t('login.otpErrTooMany');
      case 'cooldown': return t('login.otpErrCooldown');
      case 'too_many_sends': return t('login.otpErrTooManySends');
      case 'sms_failed': return t('login.otpErrSmsFailed');
      case 'rate_limited': return t('login.otpErrTooManySends');
      case 'unsupported_operator': return t('login.errOperator');
      case 'invalid_phone': return t('login.errPhone');
      default: return t('login.otpErrSend');
    }
  };

  // ── TELEFON RAQAM → KOD YUBORISH ──
  const handleSendCode = async () => {
    setAuthError('');
    if (!isPhoneValid()) {
      setAuthError(t('login.errPhone'));
      return;
    }
    // Faqat Cynox qo'llab-quvvatlaydigan operatorlarga SMS yuboramiz (tejamkorlik)
    if (!SUPPORTED_OPERATOR_CODES.has(phone.replace(/\D/g, '').slice(3, 5))) {
      setAuthError(t('login.errOperator'));
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(phone);
      if (res && res.success) {
        setOtpIsNew(!!res.isNew);
        setCode('');
        setResendIn(res.cooldown || 120);
        setStep(STEPS.OTP);
        if (res.devCode) {
          // Faqat DEV/Cynox ulanmagan holat — kodni ko'rsatib turamiz
          setAuthError(t('login.otpDevCode', { code: res.devCode }));
        }
      } else {
        if (!authError) setAuthError(otpErrorText(res && res.error, res && res.retryAfter));
        if (res && res.retryAfter) setResendIn(res.retryAfter);
      }
    } catch (e) {
      console.error('Kod yuborish xatosi:', e);
      setAuthError(t('login.otpErrSend'));
    } finally {
      setLoading(false);
    }
  };

  // ── KODNI TASDIQLASH ──
  const handleVerify = async () => {
    setAuthError('');
    if (code.replace(/\D/g, '').length !== 6) {
      setAuthError(t('login.otpErrLen'));
      return;
    }
    if (otpIsNew && (!name.trim() || name.trim().length < 3)) {
      setAuthError(t('login.errName'));
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp(phone, code.replace(/\D/g, ''), name.trim());
      if (res && res.success) {
        if (res.dev) {
          // DEV rejim — backendsiz haqiqiy kirish bo'lmaydi
          setAuthError(t('login.otpDevNotice'));
        }
        // Aks holda onAuthStateChanged foydalanuvchini kiritadi (App qayta render)
      } else {
        setAuthError(otpErrorText(res && res.error, res && res.remaining));
      }
    } catch (e) {
      console.error('Tasdiqlash xatosi:', e);
      setAuthError(t('login.otpErrSend'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    await handleSendCode();
  };

  // ── DAVOM ETISH TUGMASI (PHONE/OTP) ──
  const handleContinue = async () => {
    setAuthError('');
    if (step === STEPS.PHONE) {
      await handleSendCode();
      return;
    }
    if (step === STEPS.OTP) {
      await handleVerify();
      return;
    }
  };

  const handleBack = () => {
    setAuthError('');
    if (step === STEPS.OTP) {
      setStep(STEPS.PHONE);
      setCode('');
      setOtpIsNew(false);
    }
  };

  const progressMap = {
    [STEPS.PHONE]: 0.5,
    [STEPS.OTP]: 1,
  };
  const progress = progressMap[step] || 0.4;

  return (
    <div style={s.pageOuter}>
      <div style={{ ...s.page, zIndex: 1 }}>

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
          {step === STEPS.OTP ? (
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
                  {/* Sokin, statik sarlavha — aylanuvchi emoji karuseli o'rniga.
                      Diqqat raqam kiritishga qaratiladi (bank/jiddiy uslub). */}
                  <div style={{ marginBottom: 28 }}>
                    <h1 style={{ ...s.title, marginBottom: 8 }}>{t('login.phoneTitle')}</h1>
                    <p style={{ ...s.subtitle, marginBottom: 0 }}>{t('login.phoneSubtitle')}</p>
                  </div>
                  <div style={s.phoneWrap}>
                    <input
                      id="login-phone-input"
                      style={s.phoneInput}
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+998 00 000 00 00"
                      onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                    />
                  </div>
                </>
              )}

              {/* ── STEP: OTP — SMS kod (+ yangi bo'lsa ism). Parol o'rniga. ── */}
              {step === STEPS.OTP && (
                <>
                  <h1 style={s.title}>{t('login.otpTitle')}</h1>
                  <p style={s.subtitle}>
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{phone}</strong> {t('login.otpSubtitleSuffix')}
                  </p>

                  {/* Yangi foydalanuvchi — ismni shu yerda so'raymiz */}
                  {otpIsNew && (
                    <div style={{ marginBottom: 14 }}>
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
                  )}

                  <label style={s.fieldLabel}>{t('login.otpCodeLabel')}</label>
                  <input
                    id="login-otp-input"
                    style={s.otpInput}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="— — — — — —"
                    value={code}
                    onChange={e => { setAuthError(''); setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
                    autoFocus={!otpIsNew}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  />

                  {/* Qayta yuborish */}
                  <div style={s.switchRow}>
                    {resendIn > 0 ? (
                      <span style={{ color: 'var(--text3)' }}>{t('login.otpResendIn', { time: formatCountdown(resendIn) })}</span>
                    ) : (
                      <button type="button" style={s.switchLink} onClick={handleResend} disabled={loading}>
                        {t('login.otpResend')}
                      </button>
                    )}
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
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <motion.button
            id="login-submit-btn"
            style={{
              ...s.primaryBtn,
              opacity: loading || lockoutTimer ? 0.6 : 1
            }}
            onClick={handleContinue}
            disabled={loading || !!lockoutTimer}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? t('login.pleaseWait')
              : lockoutTimer ? t('login.wait', { sec: lockoutTimer })
              : step === STEPS.PHONE ? t('login.otpGetCode')
              : t('login.otpVerify')}
          </motion.button>


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
  // OTP kod maydoni — katta, markazlashgan, keng oraliqli (jiddiy uslub)
  otpInput: {
    width: '100%', padding: '16px 18px', fontSize: 30, fontWeight: 800,
    textAlign: 'center', letterSpacing: 10,
    border: '1.5px solid var(--border)', borderRadius: 16,
    background: 'var(--bg3)', color: 'var(--text)', fontFamily: 'inherit',
    caretColor: PRIMARY, outline: 'none', marginBottom: 4,
    boxSizing: 'border-box', transition: 'all 0.25s ease',
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
