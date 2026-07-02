import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Target, BarChart2, BrainCircuit, Trophy } from 'lucide-react';

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
  const [featureIdx, setFeatureIdx] = useState(0);

  const WELCOME_SLIDES = [
    { 
      id: 1, 
      icon: () => (
        <svg viewBox="0 0 100 100" width="130" height="130" style={{ filter: 'drop-shadow(0 10px 20px rgba(14,151,224,0.3))' }}>
          <defs>
            <linearGradient id="gradTarget" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#0ea5e9" />
              <stop offset="100%" stop-color="#0284c7" />
            </linearGradient>
            <radialGradient id="glowTarget" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="url(#glowTarget)"/>
          <circle cx="50" cy="50" r="36" fill="none" stroke="url(#gradTarget)" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
          <circle cx="50" cy="50" r="28" fill="none" stroke="url(#gradTarget)" stroke-width="3" opacity="0.8"/>
          <circle cx="50" cy="50" r="20" fill="none" stroke="#ffffff" stroke-width="4.5" filter="drop-shadow(0 0 8px #38bdf8)"/>
          <circle cx="50" cy="50" r="11" fill="url(#gradTarget)"/>
          <circle cx="50" cy="50" r="4.5" fill="#ffffff"/>
        </svg>
      ),
      color: '#0ea5e9', 
      title: t('login.welcome.s1Title'), 
      desc: t('login.welcome.s1Desc') 
    },
    { 
      id: 2, 
      icon: () => (
        <svg viewBox="0 0 100 100" width="130" height="130" style={{ filter: 'drop-shadow(0 10px 20px rgba(16,185,129,0.3))' }}>
          <defs>
            <linearGradient id="chartGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#059669" />
              <stop offset="100%" stop-color="#34d399" />
            </linearGradient>
            <linearGradient id="chartGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#047857" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
            <radialGradient id="glowChart" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#34d399" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="#34d399" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="url(#glowChart)"/>
          <line x1="20" y1="80" x2="80" y2="80" stroke="rgba(255,255,255,0.15)" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="20" y1="60" x2="80" y2="60" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <line x1="20" y1="40" x2="80" y2="40" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <rect x="26" y="52" width="11" height="28" rx="4" fill="url(#chartGrad2)" />
          <rect x="44.5" y="32" width="11" height="48" rx="4" fill="url(#chartGrad1)" filter="drop-shadow(0 0 10px rgba(52,211,153,0.5))"/>
          <rect x="63" y="44" width="11" height="36" rx="4" fill="url(#chartGrad2)" />
          <path d="M31.5 46 L50 26 L68.5 38" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 2px 6px rgba(255,255,255,0.4))"/>
          <circle cx="68.5" cy="38" r="4.5" fill="#ffffff" filter="drop-shadow(0 0 4px #ffffff)"/>
        </svg>
      ),
      color: '#10b981', 
      title: t('login.welcome.s2Title'), 
      desc: t('login.welcome.s2Desc') 
    },
    { 
      id: 3, 
      icon: () => (
        <svg viewBox="0 0 100 100" width="135" height="135" style={{ filter: 'drop-shadow(0 10px 25px rgba(139,92,246,0.3))' }}>
          <defs>
            <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c084fc" />
              <stop offset="50%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#ec4899" />
            </linearGradient>
            <radialGradient id="glowBrain" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="url(#glowBrain)"/>
          <path d="M50 24 C38 24 30 30 30 41 C30 45 32 48 35 50 C33 53 33 58 36 61 C36 66 41 70 47 70 C49 70 50 69 51 69 C52 69 53 70 55 70 C61 70 65 66 65 61 C68 58 68 53 66 50 C69 48 71 45 71 41 C71 30 63 24 51 24 Z" fill="none" stroke="url(#brainGrad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" filter="drop-shadow(0 0 12px rgba(139,92,246,0.4))"/>
          <path d="M50 24 L50 69" stroke="url(#brainGrad)" stroke-width="2.5" stroke-dasharray="2 3" opacity="0.6"/>
          <path d="M40 36 C43 39 47 41 50 41 M60 36 C57 39 53 41 50 41" fill="none" stroke="url(#brainGrad)" stroke-width="2" stroke-linecap="round"/>
          <path d="M38 50 C42 50 46 50 50 54 M62 50 C58 50 54 50 50 54" fill="none" stroke="url(#brainGrad)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="40" cy="36" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #c084fc)"/>
          <circle cx="60" cy="36" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #c084fc)"/>
          <circle cx="38" cy="50" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #ec4899)"/>
          <circle cx="62" cy="50" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #ec4899)"/>
        </svg>
      ),
      color: '#8b5cf6', 
      title: t('login.welcome.s3Title'),
      desc: t('login.welcome.s3Desc')
    },
    { 
      id: 4, 
      icon: () => (
        <svg viewBox="0 0 100 100" width="135" height="135" style={{ filter: 'drop-shadow(0 10px 25px rgba(245,158,11,0.35))' }}>
          <defs>
            <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="30%" stop-color="#fef08a" />
              <stop offset="70%" stop-color="#eab308" />
              <stop offset="100%" stop-color="#ca8a04" />
            </linearGradient>
            <linearGradient id="gold2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="100%" stop-color="#a16207" />
            </linearGradient>
            <linearGradient id="podiumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#4b5563" />
              <stop offset="100%" stop-color="#1f2937" />
            </linearGradient>
            <radialGradient id="glowTrophy" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="45" r="35" fill="url(#glowTrophy)"/>
          <rect x="32" y="70" width="36" height="11" rx="3" fill="url(#podiumGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
          <path d="M41 64 L59 64 L56 70 L44 70 Z" fill="url(#gold2)"/>
          <rect x="46.5" y="56" width="7" height="9" fill="url(#gold1)"/>
          <path d="M31 35 C27 35 27 46 34 48 M69 35 C73 35 73 46 66 48" fill="none" stroke="url(#gold1)" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M34 28 L66 28 C66 47 59 57 50 57 C41 57 34 47 34 28 Z" fill="url(#gold1)"/>
          <ellipse cx="50" cy="28" rx="16" ry="3.5" fill="url(#gold2)"/>
          <path d="M28 20 L29.5 23 L33 23.5 L30.5 26 L31 29.5 L28 27.5 L25 29.5 L25.5 26 L23 23.5 L26.5 23 Z" fill="#ffffff" filter="drop-shadow(0 0 5px #ffffff)"/>
          <path d="M70 48 L71 50 L73 50 L71.5 51.5 L72 53.5 L70 52.5 L68 53.5 L68.5 51.5 L67 50 L69 50 Z" fill="#ffffff" filter="drop-shadow(0 0 3px #ffffff)"/>
        </svg>
      ),
      color: '#f59e0b', 
      title: t('login.welcome.s4Title'),
      desc: t('login.welcome.s4Desc')
    }
  ];

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
      background: step === STEPS.WELCOME ? 'radial-gradient(circle at 50% 30%, #111827 0%, #030712 100%)' : s.pageOuter.background,
      color: step === STEPS.WELCOME ? '#ffffff' : 'var(--text)',
      transition: 'background 0.5s ease, color 0.5s ease'
    }}>
      
      {/* Inject custom CSS keyframe animations natively */}
      {step === STEPS.WELCOME && (
        <style>{`
          @keyframes floatAnim {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(2deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes glowPulse {
            0% { transform: scale(1); opacity: 0.35; }
            50% { transform: scale(1.25); opacity: 0.6; }
            100% { transform: scale(1); opacity: 0.35; }
          }
          @keyframes backgroundOrb {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(40px, -60px) scale(1.2); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes backgroundOrbSecondary {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(-30px, 40px) scale(1.15); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
        `}</style>
      )}

      {/* Animated Glowing Orbs for Glassmorphism Background (Faqat Welcome uchun) */}
      {step === STEPS.WELCOME && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div
            style={{
              position: 'absolute', top: '-10%', left: '-10%', width: '70vw', height: '70vw',
              background: WELCOME_SLIDES[welcomeSlide].color,
              filter: 'blur(100px)', borderRadius: '50%', opacity: 0.25,
              animation: 'backgroundOrb 12s infinite ease-in-out'
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: '-10%', right: '-15%', width: '80vw', height: '80vw',
              background: welcomeSlide === 0 ? '#8b5cf6' : welcomeSlide === 1 ? '#0ea5e9' : welcomeSlide === 2 ? '#f43f5e' : '#10b981',
              filter: 'blur(120px)', borderRadius: '50%', opacity: 0.2,
              animation: 'backgroundOrbSecondary 15s infinite ease-in-out'
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
                  <div style={{ display: 'flex', gap: 8, marginBottom: 32, marginTop: 12, width: '100%' }}>
                    {WELCOME_SLIDES.map((_, i) => (
                      <div key={i} style={{ 
                        flex: 1, height: 5, borderRadius: 3, 
                        background: i === welcomeSlide ? '#ffffff' : 'rgba(255,255,255,0.2)', 
                        transition: 'background 0.4s ease' 
                      }} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={welcomeSlide}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -10 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                      >
                        {/* 3D Glassmorphism Card (Pure CSS, no images) */}
                        <div style={{ 
                          width: '100%', maxWidth: 280, aspectRatio: '1/1',
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 36,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden',
                          marginBottom: 40,
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                        }}>
                          {/* Card inner neon glow */}
                          <div style={{
                            position: 'absolute', width: '130px', height: '130px',
                            background: WELCOME_SLIDES[welcomeSlide].color,
                            filter: 'blur(45px)',
                            borderRadius: '50%',
                            animation: 'glowPulse 5s infinite ease-in-out',
                            zIndex: 0
                          }} />
                          
                          {/* Inner diagonal highlight reflection */}
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
                            pointerEvents: 'none'
                          }} />

                          {/* Floating Icon */}
                          <div style={{ 
                            animation: 'floatAnim 5s infinite ease-in-out', 
                            zIndex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {WELCOME_SLIDES[welcomeSlide].icon()}
                          </div>
                        </div>
                        <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <h1 style={{ ...s.title, marginBottom: 16, fontSize: 32, fontWeight: 800, lineHeight: 1.2, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                            {WELCOME_SLIDES[welcomeSlide].title}
                          </h1>
                          <p style={{ ...s.subtitle, fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 auto', maxWidth: 320 }}>
                            {WELCOME_SLIDES[welcomeSlide].desc}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

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
