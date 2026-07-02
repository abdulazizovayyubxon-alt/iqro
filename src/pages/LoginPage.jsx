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
        <svg viewBox="0 0 200 200" width="220" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="shieldGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(255, 255, 255, 0.15)" />
              <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)" />
            </linearGradient>
            <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="30%" stop-color="#fef08a" />
              <stop offset="70%" stop-color="#eab308" />
              <stop offset="100%" stop-color="#ca8a04" />
            </linearGradient>
            <linearGradient id="cyanBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#0ea5e9" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="75" fill="none" stroke="url(#cyanBlue)" stroke-width="1.5" stroke-dasharray="5 6" opacity="0.25"/>
          <circle cx="100" cy="100" r="62" fill="none" stroke="url(#cyanBlue)" stroke-width="2" opacity="0.4"/>
          <path d="M100 40 C125 40 145 48 145 48 C145 85 125 125 100 145 C75 125 55 85 55 48 C55 48 75 40 100 40 Z" fill="url(#shieldGlass)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.4))"/>
          <path d="M100 48 C120 48 136 55 136 55 C136 85 120 118 100 135 C80 118 64 85 64 55 C64 55 80 48 100 48 Z" fill="none" stroke="url(#cyanBlue)" stroke-width="1.5" opacity="0.6"/>
          <g transform="translate(100, 92)" filter="drop-shadow(0 8px 16px rgba(234,179,8,0.4))">
            <path d="M0 -26 L6 -8 L24 -8 L10 3 L15 21 L0 10 L-15 21 L-10 3 L-24 -8 L-6 -8 Z" fill="url(#starGold)"/>
            <path d="M0 -18 L4 -6 L16 -6 L7 2 L11 13 L0 6 L-11 13 L-7 2 L-16 -6 L-4 -6 Z" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.5"/>
            <circle cx="0" cy="0" r="5" fill="#ffffff" filter="drop-shadow(0 0 4px #ffffff)"/>
          </g>
        </svg>
      ),
      color: '#0ea5e9', 
      title: t('login.welcome.s1Title'), 
      desc: t('login.welcome.s1Desc') 
    },
    { 
      id: 2, 
      icon: () => (
        <svg viewBox="0 0 200 200" width="220" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="gradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#34d399" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
            <linearGradient id="glassSheetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(255, 255, 255, 0.12)" />
              <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)" />
            </linearGradient>
          </defs>
          <rect x="35" y="35" width="130" height="130" rx="20" fill="url(#glassSheetGrad)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.4))"/>
          <rect x="50" y="55" width="100" height="24" rx="8" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" stroke-width="1"/>
          <circle cx="65" cy="67" r="5" fill="#10b981"/>
          <path d="M62 67 L64 69 L67 65" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="80" y="65" width="55" height="4" rx="2" fill="rgba(255,255,255,0.35)"/>
          <rect x="50" y="87" width="100" height="24" rx="8" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.25)" stroke-width="1"/>
          <circle cx="65" cy="99" r="5" fill="#ef4444"/>
          <path d="M62 96 L68 102 M68 96 L62 102" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="80" y="97" width="55" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
          <g transform="translate(105, 105)" filter="drop-shadow(0 10px 20px rgba(16,185,129,0.3))">
            <rect x="0" y="0" width="70" height="50" rx="12" fill="#1f2937" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <rect x="12" y="23" width="8" height="17" rx="2" fill="url(#gradEmerald)"/>
            <rect x="25" y="13" width="8" height="27" rx="2" fill="url(#gradEmerald)"/>
            <rect x="38" y="18" width="8" height="22" rx="2" fill="url(#gradEmerald)"/>
            <rect x="51" y="8" width="8" height="32" rx="2" fill="#ffffff" filter="drop-shadow(0 0 5px rgba(255,255,255,0.5))"/>
          </g>
        </svg>
      ),
      color: '#10b981', 
      title: t('login.welcome.s2Title'), 
      desc: t('login.welcome.s2Desc') 
    },
    { 
      id: 3, 
      icon: () => (
        <svg viewBox="0 0 200 200" width="220" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c084fc" />
              <stop offset="50%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#ec4899" />
            </linearGradient>
            <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.15)" />
              <stop offset="100%" stop-color="rgba(255,255,255,0.03)" />
            </linearGradient>
          </defs>
          <g transform="translate(130, 65)" stroke="url(#gearGrad)" stroke-width="1.5" fill="none" opacity="0.6">
            <circle cx="0" cy="0" r="32" stroke-dasharray="8 6"/>
            <circle cx="0" cy="0" r="24"/>
            <circle cx="0" cy="0" r="8"/>
          </g>
          <g transform="translate(145, 115)" stroke="url(#gearGrad)" stroke-width="1.5" fill="none" opacity="0.4">
            <circle cx="0" cy="0" r="20" stroke-dasharray="6 4"/>
            <circle cx="0" cy="0" r="14"/>
          </g>
          <g transform="translate(35, 35)" filter="drop-shadow(0 15px 30px rgba(139,92,246,0.35))">
            <path d="M50 20 C36 20 28 27 28 40 C28 45 30 49 33 51 C31 54 31 60 34 63 C34 69 40 73 47 73 C49 73 50 72 51 72 C52 72 53 73 55 73 C61 73 65 69 65 63 C68 60 68 54 66 51 C69 49 71 45 71 40 C71 27 63 20 50 20 Z" fill="none" stroke="url(#brainGrad)" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
            <path d="M50 20 L50 72" stroke="url(#brainGrad)" stroke-width="3" stroke-dasharray="3 3"/>
            <path d="M62 40 L85 40 M64 50 L95 55 M60 60 L80 68" stroke="url(#brainGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 3"/>
            <circle cx="85" cy="40" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #c084fc)"/>
            <circle cx="95" cy="55" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #6366f1)"/>
            <circle cx="80" cy="68" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #c084fc)"/>
            <circle cx="42" cy="32" r="3" fill="#ffffff" opacity="0.9"/>
            <circle cx="58" cy="32" r="3" fill="#ffffff" opacity="0.9"/>
          </g>
        </svg>
      ),
      color: '#8b5cf6', 
      title: t('login.welcome.s3Title'),
      desc: t('login.welcome.s3Desc')
    },
    { 
      id: 4, 
      icon: () => (
        <svg viewBox="0 0 200 200" width="220" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffe066" />
              <stop offset="30%" stop-color="#f59e0b" />
              <stop offset="70%" stop-color="#d97706" />
              <stop offset="100%" stop-color="#b45309" />
            </linearGradient>
            <linearGradient id="goldPlate" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="50%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#ca8a04" />
            </linearGradient>
            <linearGradient id="podiumBlock" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2d3748" />
              <stop offset="100%" stop-color="#111827" />
            </linearGradient>
            <linearGradient id="glassCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(255, 255, 255, 0.08)" />
              <stop offset="100%" stop-color="rgba(255, 255, 255, 0.01)" />
            </linearGradient>
          </defs>
          <rect x="75" y="20" width="70" height="120" rx="12" fill="url(#glassCardGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.3))"/>
          <circle cx="90" cy="35" r="5" fill="rgba(255,255,255,0.2)"/>
          <rect x="102" y="33" width="30" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
          <circle cx="90" cy="55" r="5" fill="#f59e0b" opacity="0.8"/>
          <rect x="102" y="53" width="30" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
          <circle cx="90" cy="75" r="5" fill="rgba(255,255,255,0.2)"/>
          <rect x="102" y="73" width="30" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
          <circle cx="90" cy="95" r="5" fill="rgba(255,255,255,0.2)"/>
          <rect x="102" y="93" width="30" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
          <rect x="40" y="110" width="35" height="45" rx="3" fill="url(#podiumBlock)" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
          <rect x="40" y="110" width="35" height="4" fill="url(#goldPlate)"/>
          <rect x="110" y="120" width="35" height="35" rx="3" fill="url(#podiumBlock)" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
          <rect x="110" y="120" width="35" height="4" fill="url(#goldPlate)"/>
          <rect x="70" y="95" width="45" height="60" rx="4" fill="url(#podiumBlock)" stroke="rgba(255,255,255,0.08)" stroke-width="0.5" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.4))"/>
          <rect x="70" y="95" width="45" height="5" fill="url(#goldPlate)"/>
          <path d="M88 85 L97 85 L95 95 L89 95 Z" fill="url(#goldCup)"/>
          <path d="M85 94 L100 94 L97 96 L87 96 Z" fill="url(#goldCup)"/>
          <path d="M78 68 C73 68 73 78 83 80" fill="none" stroke="url(#goldCup)" stroke-width="3" stroke-linecap="round"/>
          <path d="M107 68 C112 68 112 78 102 80" fill="none" stroke="url(#goldCup)" stroke-width="3" stroke-linecap="round"/>
          <path d="M82 60 L103 60 C103 76 97 84 92.5 84 C88 84 82 76 82 60 Z" fill="url(#goldCup)" filter="drop-shadow(0 5px 10px rgba(234,179,8,0.25))"/>
          <ellipse cx="92.5" cy="60" rx="10.5" ry="2.5" fill="url(#goldPlate)"/>
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
                        {/* 3D Illustration Area (Directly floating, NO outer box container) */}
                        <div style={{ 
                          width: '100%', 
                          height: 240, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                          marginBottom: 20,
                          animation: 'floatAnim 5s infinite ease-in-out'
                        }}>
                          {WELCOME_SLIDES[welcomeSlide].icon()}
                        </div>
                        <div style={{ padding: '0 15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <h1 style={{ 
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                            fontSize: 30, 
                            fontWeight: 800, 
                            lineHeight: 1.2, 
                            color: '#ffffff', 
                            marginBottom: 12,
                            letterSpacing: '-0.5px'
                          }}>
                            {WELCOME_SLIDES[welcomeSlide].title}
                          </h1>
                          <p style={{ 
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                            fontSize: 15.5, 
                            lineHeight: 1.6, 
                            color: 'rgba(255,255,255,0.65)', 
                            margin: '0 auto', 
                            maxWidth: 340 
                          }}>
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
