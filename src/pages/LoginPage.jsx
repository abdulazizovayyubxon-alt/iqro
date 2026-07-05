import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';

import { useIsMobile } from '../hooks/useIsMobile';
import BrandLogo from '../components/shared/BrandLogo';

const STEPS = {
  WELCOME: 'welcome',
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

  const [step, setStep] = useState(() => {
    return localStorage.getItem('toifa_welcome_seen') ? STEPS.PHONE : STEPS.WELCOME;
  });
  const [welcomeSlide, setWelcomeSlide] = useState(0);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('+998');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(null);

  // Sokin, jiddiy, ishonchli — barcha slaydlarda YAGONA brend azure rangi.
  // Oldin har slayd o'z rangida (ko'k/yashil/binafsha/sariq) edi va fon
  // "rang-barang" bo'lib ketardi. Endi fon doim azure — bank/Click uslubi.
  const WELCOME_SLIDES = [
    { id: 1, title: t('login.welcome.s1Title'), desc: t('login.welcome.s1Desc') },
    { id: 2, title: t('login.welcome.s2Title'), desc: t('login.welcome.s2Desc') },
    { id: 3, title: t('login.welcome.s3Title'), desc: t('login.welcome.s3Desc') },
    { id: 4, title: t('login.welcome.s4Title'), desc: t('login.welcome.s4Desc') },
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
    setAuthMode(mode);
  };

  // ── DAVOM ETISH / KIRISH / RO'YXATDAN O'TISH TUGMASI ──
  const handleContinue = async () => {
    setAuthError('');

    if (step === STEPS.WELCOME) {
      if (welcomeSlide < WELCOME_SLIDES.length - 1) {
        setWelcomeSlide(prev => prev + 1);
      } else {
        localStorage.setItem('toifa_welcome_seen', 'true');
        setStep(STEPS.PHONE);
      }
      return;
    }

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

  const handleForgotPassword = () => {
    setAuthError(t('login.forgotPasswordHint') || 'Parolni tiklash uchun administrator bilan bog\'laning.');
  };

  const progressMap = {
    [STEPS.PHONE]: 0.45,
    [STEPS.CHECKING]: 0.7,
    [STEPS.AUTH]: 1,
  };
  const progress = progressMap[step] || 0.4;

  return (
    <div style={{
      ...s.pageOuter,
      background: step === STEPS.WELCOME ? 'radial-gradient(circle at 50% 25%, #0F1B2D 0%, #070B16 100%)' : s.pageOuter.background,
      color: step === STEPS.WELCOME ? '#ffffff' : 'var(--text)',
      transition: 'background 0.5s ease, color 0.5s ease'
    }}>
      
      {/* Inject custom CSS keyframe animations natively */}
      {step === STEPS.WELCOME && (
        <style>{`
          @keyframes floatAnim {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes backgroundOrb {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(30px, -45px) scale(1.15); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes backgroundOrbSecondary {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(-20px, 30px) scale(1.1); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
        `}</style>
      )}

      {/* Sokin fon nurlanishi — YAGONA azure tus (rang almashmaydi). Jiddiy va
          ishonchli ko'rinish uchun past shaffoflik, faqat chuqurlik beradi. */}
      {step === STEPS.WELCOME && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div
            style={{
              position: 'absolute', top: '-12%', left: '-10%', width: '70vw', height: '70vw',
              background: '#0E97E0',
              filter: 'blur(120px)', borderRadius: '50%', opacity: 0.14,
              animation: 'backgroundOrb 16s infinite ease-in-out'
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: '-12%', right: '-15%', width: '75vw', height: '75vw',
              background: '#0B79B8',
              filter: 'blur(140px)', borderRadius: '50%', opacity: 0.10,
              animation: 'backgroundOrbSecondary 20s infinite ease-in-out'
            }}
          />
        </div>
      )}

      <div style={{
        ...s.page,
        background: step === STEPS.WELCOME ? 'transparent' : s.page.background,
        border: step === STEPS.WELCOME ? 'none' : s.page.border,
        boxShadow: step === STEPS.WELCOME ? 'none' : s.page.boxShadow,
        zIndex: 1
      }}>

        {/* Progress bar */}
        {step !== STEPS.WELCOME && (
          <div style={s.progressTrack}>
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={s.progressFill}
            />
          </div>
        )}

        {/* Header — faqat orqaga qaytish tugmasi */}
        {step !== STEPS.WELCOME && (
          <div style={s.header}>
            {step === STEPS.AUTH ? (
              <motion.button whileTap={{ scale: 0.9 }} style={s.backBtn} onClick={handleBack}>
                <ArrowLeft size={22} />
              </motion.button>
            ) : <div style={{ width: 36 }} />}
            <BrandLogo size={22} />
            <div style={{ width: 36 }} />
          </div>
        )}

        {/* Content */}
        <div style={{
          ...s.content,
          padding: step === STEPS.WELCOME ? (isMobile ? '16px 20px 0' : '28px 24px 0') : s.content.padding
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              style={step === STEPS.WELCOME ? { display: 'flex', flexDirection: 'column', height: '100%' } : {}}
            >

              {/* ── STEP: WELCOME ── */}
              {step === STEPS.WELCOME && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Glassmorphism Progress Bars */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, marginTop: 12, width: '100%' }}>
                    {WELCOME_SLIDES.map((_, i) => (
                      <div key={i} style={{ 
                        flex: 1, height: 4, borderRadius: 2, 
                        background: i === welcomeSlide ? '#ffffff' : 'rgba(255,255,255,0.15)', 
                        transition: 'background 0.4s ease' 
                      }} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={welcomeSlide}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.04, y: -8 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                      >
                        {/* 1. Title and Description (Moved UP) */}
                        <div style={{ 
                          padding: isMobile ? '0 8px 16px' : '0 12px 24px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          textAlign: 'center'
                        }}>
                          <h1 style={{ 
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                            fontSize: isMobile ? 26 : 32, 
                            fontWeight: 800, 
                            lineHeight: 1.25, 
                            color: '#ffffff', 
                            marginBottom: 8,
                            letterSpacing: '-0.5px'
                          }}>
                            {WELCOME_SLIDES[welcomeSlide].title}
                          </h1>
                          <p style={{ 
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                            fontSize: 16, 
                            lineHeight: 1.6, 
                            color: 'rgba(255,255,255,0.65)', 
                            margin: '0 auto', 
                            maxWidth: 350 
                          }}>
                            {WELCOME_SLIDES[welcomeSlide].desc}
                          </p>
                        </div>

                        {/* 2. Flat Front-facing Glassmorphism Illustration Area (Moved DOWN & Made Larger) */}
                        <div style={{ 
                          width: '100%', 
                          height: isMobile ? 240 : 275, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                          marginBottom: isMobile ? 8 : 12
                        }}>
                          {/* Render Flat Front-Facing glass cards natively in code */}
                          <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            whileHover={{
                              scale: 1.02,
                              y: -4,
                              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
                            }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            style={{
                              width: '92%',
                              maxWidth: '315px',
                              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '24px',
                              padding: '20px',
                              backdropFilter: 'blur(20px)',
                              WebkitBackdropFilter: 'blur(20px)',
                              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255,255,255,0.15)',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            {welcomeSlide === 0 && (
                              <>
                                <div style={{
                                  display: 'inline-block',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  borderRadius: '8px',
                                  background: 'rgba(14, 151, 224, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(14, 151, 224, 0.25)',
                                  marginBottom: '12px',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase'
                                }}>
                                  Keng qamrovli testlar
                                </div>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, lineHeight: 1.45, marginBottom: '14px', color: '#fff' }}>
                                  Konstitutsiyaning nechanchi moddasida o'qituvchilar sha'ni himoya qilinishi belgilangan?
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '11px 14px',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: '#34d399',
                                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.1)',
                                  marginBottom: '8px',
                                  fontSize: '12.5px',
                                  fontWeight: 600
                                }}>
                                  <span style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: '1.5px solid #10b981',
                                    background: '#10b981',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 800
                                  }}>✓</span>
                                  <span>52-modda</span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '11px 14px',
                                  borderRadius: '12px',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: 'rgba(255,255,255,0.8)'
                                }}>
                                  <span style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: '1.5px solid rgba(255,255,255,0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }} />
                                  <span>41-modda</span>
                                </div>
                              </>
                            )}

                            {welcomeSlide === 1 && (
                              <>
                                <div style={{
                                  display: 'inline-block',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  borderRadius: '8px',
                                  background: 'rgba(14, 151, 224, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(14, 151, 224, 0.25)',
                                  marginBottom: '12px',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase'
                                }}>
                                  📖 Izohli va tushunarli
                                </div>
                                <div style={{ fontSize: '12px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
                                  52-modda: O'zbekiston Respublikasida o'qituvchining mehnati jamiyat va davlatni rivojlantirish asosi deb e'tirof etiladi.
                                </div>
                                <div style={{
                                  display: 'flex',
                                  gap: '10px',
                                  padding: '12px',
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  border: '1px dashed rgba(245, 158, 11, 0.3)',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  lineHeight: 1.45,
                                  color: '#fbbf24',
                                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)'
                                }}>
                                  <span style={{ flexShrink: 0 }}>💡</span>
                                  <span>Mnemonika: 52 - "5 harfli U-S-T-O-Z va uning 2 ta vazifasi (Ta'lim va Tarbiya)!"</span>
                                </div>
                              </>
                            )}

                            {welcomeSlide === 2 && (
                              <>
                                <div style={{
                                  display: 'inline-block',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  borderRadius: '8px',
                                  background: 'rgba(14, 151, 224, 0.12)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(14, 151, 224, 0.25)',
                                  marginBottom: '12px',
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase'
                                }}>
                                  Aqlli takrorlash
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  position: 'relative',
                                  padding: '28px 0 16px'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '15px',
                                    right: '15px',
                                    height: '2px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    zIndex: 1,
                                    transform: 'translateY(-50%)'
                                  }} />
                                  
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                                    border: '1.5px solid rgba(255,255,255,0.25)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2,
                                    position: 'relative',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#fff',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.25)'
                                  }}>
                                    <span>10m</span>
                                    <span style={{ position: 'absolute', bottom: '-24px', fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>O'rganildi</span>
                                  </div>

                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    border: '1.5px solid #38bdf8',
                                    background: 'radial-gradient(circle at 30% 30%, #5EC2F5 0%, #0E97E0 60%, #0B5E90 100%)',
                                    color: '#fff',
                                    boxShadow: '0 0 20px rgba(14, 151, 224, 0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2,
                                    position: 'relative',
                                    fontSize: '11px',
                                    fontWeight: 800
                                  }}>
                                    <span>1 kun</span>
                                    <span style={{ position: 'absolute', bottom: '-24px', fontSize: '9.5px', fontWeight: 700, color: '#5EC2F5', textShadow: '0 0 8px rgba(14, 151, 224, 0.4)' }}>Qaytarish</span>
                                  </div>

                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1.5px solid rgba(255,255,255,0.12)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2,
                                    position: 'relative',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: 'rgba(255, 255, 255, 0.65)',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.25)'
                                  }}>
                                    <span>7 kun</span>
                                    <span style={{ position: 'absolute', bottom: '-24px', fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>Yodda qoldi</span>
                                  </div>
                                </div>
                              </>
                            )}

                            {welcomeSlide === 3 && (
                              <>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '16px',
                                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                                  paddingBottom: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      background: 'rgba(255,255,255,0.08)',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '15px',
                                      border: '1px solid rgba(255,255,255,0.15)'
                                    }}>👨‍🏫</div>
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#fff' }}>Tayyorgarlik pasporti</span>
                                  </div>
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 900,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #ffe066 0%, #f59e0b 50%, #b45309 100%)',
                                    color: '#000',
                                    boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                                    letterSpacing: '0.5px'
                                  }}>PRO</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  <div style={{
                                    position: 'relative',
                                    width: '64px',
                                    height: '64px',
                                    filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.2))'
                                  }}>
                                    <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                                      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.04)" strokeWidth="5" fill="transparent" />
                                      <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="5" fill="transparent"
                                        strokeDasharray="175.93" strokeDashoffset="26.39" strokeLinecap="round" />
                                    </svg>
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      fontSize: '12px',
                                      fontWeight: 900,
                                      color: '#34d399'
                                    }}>85%</div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginBottom: '3px', fontWeight: 600 }}>Toifa Prognozi</div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#34d399' }}>Oliy Toifa</div>
                                  </div>
                                </div>
                              </>
                            )}
                          </motion.div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

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
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          ...s.footer,
          background: step === STEPS.WELCOME ? 'transparent' : s.footer.background,
          borderTop: step === STEPS.WELCOME ? '1px solid rgba(255,255,255,0.05)' : s.footer.borderTop
        }}>
          <motion.button
            id="login-submit-btn"
            style={{ 
              ...s.primaryBtn, 
              opacity: loading || lockoutTimer ? 0.6 : 1,
              background: step === STEPS.WELCOME ? '#ffffff' : s.primaryBtn.background,
              color: step === STEPS.WELCOME ? '#09090b' : '#fff',
              boxShadow: step === STEPS.WELCOME ? '0 8px 24px rgba(255,255,255,0.2)' : s.primaryBtn.boxShadow
            }}
            onClick={handleContinue}
            disabled={loading || !!lockoutTimer}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? t('login.pleaseWait')
              : lockoutTimer ? t('login.wait', { sec: lockoutTimer })
              : step === STEPS.WELCOME ? (welcomeSlide === WELCOME_SLIDES.length - 1 ? t('login.welcome.start') : t('login.welcome.next'))
              : step === STEPS.PHONE ? t('login.continuePhone')
              : authMode === 'register' ? t('login.createAccountBtn') : t('login.signIn')}
          </motion.button>


          {/* Trust Badges & Policies */}
          {step === STEPS.WELCOME && welcomeSlide === WELCOME_SLIDES.length - 1 ? (
             <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '24px', lineHeight: 1.5 }}>
               {t('login.welcome.terms1')}<a href="/terms" style={{color: '#ffffff', textDecoration: 'none', fontWeight: 600}}>{t('login.welcome.terms2')}</a>{t('login.welcome.terms3')}<a href="/privacy" style={{color: '#ffffff', textDecoration: 'none', fontWeight: 600}}>{t('login.welcome.terms4')}</a>{t('login.welcome.terms5')}
             </div>
          ) : step !== STEPS.WELCOME ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
                {t('login.policyP1')} <a href="/privacy" style={{color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600}}>{t('login.privacyLink')}</a> {t('login.policyMid')} <a href="/terms" style={{color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600}}>{t('login.termsLink')}</a>{t('login.policyP2')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.6 }}>
                <ShieldCheck size={16} color="var(--text)" />
                <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{t('login.dataSecure')}</span>
              </div>
            </div>
          ) : null}
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
