import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';

import { useIsMobile } from '../hooks/useIsMobile';
import BrandLogo from '../components/shared/BrandLogo';
import { SUPPORT_URL } from '../config';

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
    setForgotOpen(false);
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
          // Bu raqam allaqachon ro'yxatdan o'tgan — kirish rejimiga o'tamiz.
          //
          // ⚠️ Bu yerga RO'YXATDAN O'TMOQCHI bo'lgan odam tushadi, ya'ni u
          // o'zini yangi deb biladi. Unga quruq «parolingizni kiriting» desak,
          // u nima qilishni bilmay direktga «Parol» deb yozadi — muammoning
          // o'zi shundan boshlangan. Shuning uchun tiklash yo'li DARHOL,
          // qo'shimcha bosishsiz ochiladi: parolini bilsa yuqoridan kiritadi,
          // bilmasa pastdagi ko'rsatma bo'yicha tiklaydi.
          setAuthMode('login');
          setForgotOpen(true);
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
        setForgotOpen(false);
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
    setForgotOpen(false);
    if (step === STEPS.AUTH) {
      setStep(STEPS.PHONE);
      setAuthMode('login');
    }
  };

  // ── Parolni unutdim → @zehinuz direkt chati ──
  // Foydalanuvchi parolini O'ZI tiklay olmaydi: Firebase Auth emaili soxta
  // (`<telefon>@iqro.uz` — AuthContext.jsx `phoneToEmail`), demak tiklash xati
  // boradigan pochta qutisi yo'q. Yagona yo'l — admin vaqtinchalik parol beradi
  // (admin paneli → foydalanuvchi ⋮ → «Parolni tiklash»).
  //
  // ⚠️ 2026-08-29 — NEGA IKKI QADAM:
  // Ilgari bu bitta `<a>` edi: bosilishi bilan Telegram OCHILARDI, ko'rsatma
  // esa ilova ekranida qolib ketardi. Odam Telegramda bo'sh chat oldida turib,
  // nima yozishni bilmay, tugmada o'qigan yagona so'zni yozardi — «Parol».
  // Direktga aynan shunday xabarlar oqimi shundan edi.
  //
  // Endi birinchi bosishda EKRANDA ko'rsatma va o'z raqami chiqadi, Telegram
  // esa ikkinchi, ataylab bosiladigan qadam. Chat matnini oldindan to'ldirib
  // bo'lmaydi — `t.me` da DM uchun bunday parametr yo'q (`?text=` faqat
  // `t.me/share/url` bilan ishlaydi va u chat TANLAGICHINI ochadi).
  //
  // Telegramga o'tish tugma emas, HAQIQIY `<a href>`: Play ilovasi (TWA)
  // ichida `window.open` ba'zan jimgina bloklanadi.
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleForgotPassword = () => {
    setAuthError('');
    setForgotOpen(true);
  };

  const progressMap = {
    [STEPS.PHONE]: 0.45,
    [STEPS.CHECKING]: 0.7,
    [STEPS.AUTH]: 1,
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
            {step === STEPS.AUTH ? (
              <motion.button whileTap={{ scale: 0.9 }} style={s.backBtn} onClick={handleBack}>
                <ArrowLeft size={22} />
              </motion.button>
            ) : <div style={{ width: 36 }} />}
            <BrandLogo size={22} />
            <div style={{ width: 36 }} />
          </div>

        {/* ── Content ──
            ⚠️ 2026-08-29 — BU YERDA `AnimatePresence mode="wait"` BO'LMASIN.
            Bosqichlar (PHONE → CHECKING → AUTH) shu qobiq bilan almashardi,
            `mode="wait"` esa YANGI bolani faqat ESKISINING chiqish animatsiyasi
            TUGAGACH ulaydi. Animatsiya `requestAnimationFrame`ga tayanadi:
            brauzer tabi fonga o'tsa yoki telefon sekin bo'lsa, rAF to'xtaydi —
            chiqish hech qachon tugamaydi va ekran RAQAM bosqichida QOTIB
            qoladi, pastdagi tugma esa allaqachon «Kirish»/«Hisob yaratish»
            deb turadi va hech narsa qilmaydi. Sinovda 100% takrorlandi.
            Endi bosqichlar oddiy shart bilan almashadi — animatsiyasiz, lekin
            HAR DOIM ishlaydi. */}
        <div style={s.content}>
          <div>

              {/* ── STEP: PHONE ── */}
              {step === STEPS.PHONE && (
                <>
                  <div style={{ marginBottom: 24, minHeight: 80, display: 'flex', alignItems: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={featureIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 16 }}
                      >
                        <div style={{ fontSize: 'var(--fs-12xl)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
                          {FEATURES[featureIdx].icon}
                        </div>
                        <div>
                          <h1 style={{ ...s.title, marginBottom: 6, fontSize: 'var(--fs-5xl)', lineHeight: 1.1 }}>{FEATURES[featureIdx].title}</h1>
                          <p style={{ ...s.subtitle, marginBottom: 0, fontSize: 'var(--fs-md)', lineHeight: 1.4 }}>{FEATURES[featureIdx].desc}</p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {/* Ko'rsatma — ilgari bu ekranda UMUMAN matn yo'q edi: faqat
                      aylanuvchi reklama va yalang'och `+998`. Yangi odam nima
                      bo'layotganini (hisob YARATILISHINI va parolni O'ZI o'ylab
                      topishini) bilmasdi. */}
                  <label htmlFor="login-phone-input" style={s.fieldLabel}>{t('login.phoneTitle')}</label>
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
                  <p style={s.phoneHelp}>{t('login.phoneSubtitle')}</p>
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

                  {!forgotOpen ? (
                    <button type="button" style={s.forgotBtn} onClick={handleForgotPassword}>
                      {t('login.forgot')}
                    </button>
                  ) : (
                    <div style={s.forgotPanel}>
                      <p style={s.forgotHint}>{t('login.forgotStep1')}</p>
                      {/* Raqam KO'RINIB turadi: odam Telegramda aynan shuni
                          yuborishi kerak, yodlab olishi shart emas. */}
                      <div style={s.forgotPhone}>{phone}</div>
                      <a
                        href={SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={s.telegramBtn}
                      >
                        {t('login.forgotOpenTelegram')}
                      </a>
                      <p style={s.forgotNote}>{t('login.forgotStep2')}</p>
                    </div>
                  )}

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
                      {/* Ogohlantirish, chunki parolni TIKLASH avtomatik emas:
                          email soxta, SMS yo'q — unutilsa faqat admin qo'lda
                          beradi. Odam buni parol o'ylab topayotgan PAYTIDA
                          bilishi kerak, unutgandan keyin emas. */}
                      <p style={s.passwordNote}>{t('login.passwordRemember')}</p>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <p style={s.errorText}>
                    {authError}
                  </p>
                </div>
              )}
          </div>
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
              : step === STEPS.PHONE ? t('login.continuePhone')
              : authMode === 'register' ? t('login.createAccountBtn') : t('login.signIn')}
          </motion.button>


          {/* Trust Badges & Policies */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              {t('login.policyP1')} <a href="/privacy" style={{color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600}}>{t('login.privacyLink')}</a> {t('login.policyMid')} <a href="/terms" style={{color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600}}>{t('login.termsLink')}</a>{t('login.policyP2')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.6 }}>
              <ShieldCheck size={16} color="var(--text)" />
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', fontWeight: 500 }}>{t('login.dataSecure')}</span>
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
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: '0 2px 2px 0' },
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
  title: { fontSize: 'var(--fs-8xl)', fontWeight: 800, lineHeight: 1.2, marginBottom: 8, color: 'var(--text)' },
  subtitle: { fontSize: 'var(--fs-lg)', color: 'var(--text3)', lineHeight: 1.6, marginBottom: isMobile ? 16 : 28 },
  phoneWrap: { marginBottom: 8 },
  phoneInput: {
    width: '100%', fontSize: 'var(--fs-8xl)', fontWeight: 800,
    color: 'var(--text)', border: 'none', outline: 'none',
    background: 'transparent', fontFamily: 'inherit',
    caretColor: PRIMARY, letterSpacing: 1,
    paddingBottom: 8, borderBottom: `2.5px solid ${PRIMARY}`,
  },
  input: {
    width: '100%', padding: '16px 18px', fontSize: 'var(--fs-lg)',
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
    fontSize: 'var(--fs-base)', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', marginTop: '6px', padding: '12px 0px',
    textDecoration: 'underline', textUnderlineOffset: 3,
    display: 'inline-block', minHeight: '44px',
  },
  // Ko'rsatma — XATO EMAS, shuning uchun qizil `errorText` ishlatilmaydi:
  // yordam so'ragan odamga qizil matn "nimadir buzildi" deb ko'rinadi.
  forgotHint: {
    marginTop: 0, marginBottom: 10, fontSize: 'var(--fs-md)',
    color: 'var(--text2)', lineHeight: 1.5, fontWeight: 500,
  },
  // Tiklash paneli — Telegramga o'tishdan OLDIN ko'rinadigan qadam.
  forgotPanel: {
    marginTop: 10, padding: '14px 16px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 16,
  },
  // Foydalanuvchi Telegramga aynan shu raqamni yuborishi kerak — shuning
  // uchun u ko'chirib olsa bo'ladigan darajada yirik va ajratilgan.
  forgotPhone: {
    fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--text)',
    letterSpacing: 0.5, marginBottom: 12, userSelect: 'all',
  },
  forgotNote: {
    marginTop: 10, marginBottom: 0, fontSize: 'var(--fs-sm)',
    color: 'var(--text3)', lineHeight: 1.5,
  },
  // Raqam maydoni ostidagi tushuntirish — yangi odam uchun asosiy ko'rsatma.
  phoneHelp: {
    marginTop: 10, marginBottom: 0, fontSize: 'var(--fs-md)',
    color: 'var(--text3)', lineHeight: 1.5,
  },
  passwordNote: {
    marginTop: 8, marginBottom: 0, fontSize: 'var(--fs-sm)',
    color: 'var(--text3)', lineHeight: 1.45,
  },
  errorText: { marginTop: 10, fontSize: 'var(--fs-md)', color: 'var(--red)', fontWeight: 500 },
  footer: { 
    padding: isMobile 
      ? '12px 20px calc(12px + env(safe-area-inset-bottom))' 
      : '16px 24px calc(24px + env(safe-area-inset-bottom))', 
    borderTop: '1px solid var(--border)', 
    background: isMobile ? 'var(--bg2)' : 'transparent' 
  },
  primaryBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    /* a11y: accent (~3.2:1) o'rniga --cta — oq matn bilan har temada ≥4.5:1 */
    background: 'var(--cta)', color: '#fff', border: 'none',
    fontWeight: 700, fontSize: 'var(--fs-xl)', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s', marginBottom: isMobile ? 8 : 12,
    boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)',
  },
  orRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 8 : 12 },
  orLine: { flex: 1, height: 1, background: 'var(--border)' },
  orText: { fontSize: 'var(--fs-md)', color: 'var(--text3)', fontWeight: 500 },
  outlineBtn: {
    width: '100%', padding: '16px', borderRadius: 16,
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text)', fontWeight: 600, fontSize: 'var(--fs-lg)',
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: isMobile ? 0 : 10, transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  // Telegram — ikkinchi darajali, lekin azure rangi bilan sezilarli.
  // `<a>` sifatida ishlatiladi (TWA'da `window.open` bloklanishi mumkin),
  // shuning uchun havola tagchizig'i o'chiriladi.
  telegramBtn: {
    width: '100%', padding: '15px', borderRadius: 16,
    border: '1.5px solid var(--accent)', background: 'var(--blue-bg)',
    color: 'var(--accent2)', fontWeight: 700, fontSize: 'var(--fs-lg)',
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'all 0.2s', boxSizing: 'border-box',
  },
  // ── AUTH step styles ──
  fieldLabel: {
    fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text2)',
    marginBottom: '6px', display: 'block',
  },
  switchRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 18, fontSize: 'var(--fs-base)', flexWrap: 'wrap',
  },
  switchLink: {
    background: 'none', border: 'none', color: 'var(--accent2)',
    fontSize: 'var(--fs-base)', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', padding: '4px 2px',
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
});
