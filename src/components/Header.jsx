import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, BookOpen, Calendar } from 'lucide-react';
import GiftBox from './shared/GiftBox';
import ProfileDrawer from './ProfileDrawer';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { EXAM_DATE_KEY } from '../utils/examDate';
import { useExamCountdown } from '../hooks/useExamDaysLeft';
import ExamDateModal from './ExamDateModal';
import { resolveAvatar } from '../data/avatars';
import { getReferralStats } from '../services/referral';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../utils/motion';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotifications } from '../hooks/useNotifications';

const Header = ({ theme, toggleTheme }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast, showToast } = useContext(ToastContext);
  const { user } = useAuth();

  const exam = useExamCountdown();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [, setIsOnline] = useState(navigator.onLine);
  const { unreadCount } = useNotifications();

  // ── Salomlashish: kuniga BIRINCHI marta kirganda "Xush kelibsiz",
  //    keyingi kirishlarda kun vaqtiga qarab "Xayrli tong/kun/kech/tun" ──
  // Qaror mount paytida bir marta olinadi (oxirgi salomlashish sanasini solishtirib).
  // StrictMode double-render'da barqaror bo'lishi uchun localStorage'ga YOZISH alohida
  // effektda — initializer faqat o'qiydi, shuning uchun ikkala render ham bir xil qaror beradi.
  const [greetKey] = useState(() => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (lokal)
    if (localStorage.getItem('iqro_last_greet_date') !== today) return 'header.greeting';
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'dashboard.greetMorning';
    if (h >= 11 && h < 17) return 'dashboard.greetDay';
    if (h >= 17 && h < 22) return 'dashboard.greetEvening';
    return 'dashboard.greetNight';
  });
  useEffect(() => {
    localStorage.setItem('iqro_last_greet_date', new Date().toLocaleDateString('en-CA'));
  }, []);

  // O'ng tomon ikonka tugmalari o'lchami — a11y teginish zonasi min 44px (WCAG 2.5.5)
  const btnSize = 44;
  
  // Ambassador Modal va Stats
  const [ambassadorModal, setAmbassadorModal] = useState(false);
  const [isAmbassador, setIsAmbassador] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkReferrals = async () => {
      try {
        const stats = await getReferralStats(user.uid);
        const forceTest = localStorage.getItem('force_ambassador') === '1';
        if (stats.paid >= 5 || forceTest) {
          setIsAmbassador(true);
          // Agar oldin ko'rsatilmagan bo'lsa, modalni chiqaramiz
          if (!localStorage.getItem('iqro_ambassador_thanks')) {
            setAmbassadorModal(true);
            if (!prefersReducedMotion()) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            if (forceTest) {
              localStorage.removeItem('force_ambassador');
            }
          }
        }
      } catch (e) {
        console.warn('Referral check error', e);
      }
    };
    checkReferrals();
  }, [user]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Imtihon sanasi modali (umumiy komponent: Dashboard ham shuni ochadi) ---
  const [showExamModal, setShowExamModal] = useState(false);

  // Shaxsiy sanani Firestore'dan localStorage'ga sinxronlash (qurilmalar arasi).
  // Sanoqning o'zi useExamCountdown ichida hisoblanadi.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
        if (cancelled || !snap.exists() || !snap.data().examDate) return;
        const firestoreDate = snap.data().examDate;
        localStorage.setItem('iqro_exam_date', firestoreDate);
        localStorage.setItem(EXAM_DATE_KEY, new Date(firestoreDate).toISOString());
        exam.refresh();
      })
      .catch(e => console.warn('Exam date yuklashda xato:', e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Foydalanuvchi ismining qisqartmasi (avatar uchun)
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || t('common.userFallback');
  // Faqat ism (familiyasiz) — header tor, "..." bilan kesilmasligi uchun
  const firstName = displayName.trim().split(/\s+/)[0];

  return (
    <>
      <div className="header">
        <div className="header-greeting" onClick={() => setShowProfileDrawer(true)} title={t('header.profile')}>
          <div className="header-avatar-wrap">
            <div className="header-avatar">
              {resolveAvatar(user)
                ? <img src={resolveAvatar(user)} alt={displayName} />
                : <span>{getInitials(displayName)}</span>}
            </div>
            {unreadCount > 0 && (
              <span className="header-avatar-badge" title={t('header.newNotifications', { count: unreadCount })}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="header-greeting-text">
            <span className="header-greet-hi">{t(greetKey)}</span>
            <span className="header-greet-name">{firstName}</span>
          </div>
        </div>

        <div className="header-stats">
          {/* Kun Countdown — sana ishonchli bo'lgandagina raqam ko'rsatiladi.
              Sana yo'q bo'lsa «0 kun» emas, uni belgilash taklifi chiqadi. */}
          {exam.enabled && (
            <motion.div
              className="header-exam-countdown hide-mobile"
              onClick={() => setShowExamModal(true)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              title={t('header.examDateChange')}
              style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box' }}
            >
              <span
                className="header-exam-countdown-text"
                style={exam.tone === 'soon' ? { color: 'var(--amber)' } : undefined}
              >
                {!exam.hasDate
                  ? t('exam.setDateShort')
                  : exam.isToday
                    ? t('exam.today')
                    : t('header.daysLeft', { count: exam.daysLeft })}
              </span>
              <Calendar size={13} style={{ color: 'var(--blue)', opacity: 0.8 }} />
            </motion.div>
          )}

          {/* Tema almashtirish: Kunduzgi → Sepia (o'qish) → Tungi */}
          <motion.button
            className="user-avatar-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleTheme()}
            title={theme === 'light' ? t('header.themeNextSepia') : theme === 'sepia' ? t('header.themeNextDark') : t('header.themeNextLight')}
            aria-label={theme === 'light' ? t('header.themeAriaSepia') : theme === 'sepia' ? t('header.themeAriaDark') : t('header.themeAriaLight')}
            style={{ width: btnSize, height: btnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', padding: 0, background: 'var(--bg2)' }}
          >
            {theme === 'dark' ? <Moon size={18} /> : theme === 'sepia' ? <BookOpen size={18} /> : <Sun size={18} />}
          </motion.button>

          {/* Taklif (Gift) tugmasi — sodda, neytral ikonka */}
          <motion.button
            className="user-avatar-btn"
            onClick={() => navigate('/referral')}
            title={t('header.inviteFriends')}
            aria-label={t('header.inviteFriendsAria')}
            initial={{ rotate: 0 }}
            animate={
              (!sessionStorage.getItem('iqro_gift_wiggled') && user && !isAmbassador) ? {
                rotate: [0, -15, 15, -15, 15, 0],
                scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
              } : {}
            }
            transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1], repeat: 2 }}
            onAnimationComplete={() => sessionStorage.setItem('iqro_gift_wiggled', 'true')}
            whileTap={{ scale: 0.9 }}
            style={{ width: btnSize, height: btnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', padding: 0, background: 'var(--bg2)' }}
          >
            <GiftBox size={22} />
          </motion.button>
        </div>
      </div>

      {/* Imtihon sanasini sozlash modali — umumiy komponent */}
      <ExamDateModal
        open={showExamModal}
        initialDays={exam.hasDate ? exam.daysLeft : ''}
        onClose={() => setShowExamModal(false)}
        onSaved={() => {
          exam.refresh();
          showToast(t('header.examModal.saved'), 'success');
        }}
      />

      {/* Toast xabar tizimi */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`toast-capsule toast-capsule-${toast.type}`}
            key={toast.id}
            style={{
              position: 'fixed',
              bottom: isMobile ? '90px' : '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: isMobile ? '12px 18px' : '12px 24px',
              borderRadius: isMobile ? '16px' : '99px',
              fontSize: '14px',
              fontWeight: 700,
              zIndex: 10000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.92)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.92)' : 'rgba(11, 121, 184, 0.95)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              pointerEvents: 'none',
              whiteSpace: 'normal',
              width: 'fit-content',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 800, flexShrink: 0 }}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✗'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span style={{ textAlign: 'left' }}>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambassador Minnatdorchilik Modali */}
      <AnimatePresence>
        {ambassadorModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              setAmbassadorModal(false);
              localStorage.setItem('iqro_ambassador_thanks', 'true');
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
              className="modal-content glass-panel ambassador-modal-inner"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="ambassador-emoji">🌟</div>
              <h2 className="ambassador-title">
                {t('header.ambassador.title')}
              </h2>
              <p className="ambassador-text">
                {t('header.ambassador.text')}
              </p>
              <div className="ambassador-highlight">
                {t('header.ambassador.highlight')}
              </div>
              <button
                className="btn btn-primary ambassador-btn"
                onClick={() => {
                  setAmbassadorModal(false);
                  localStorage.setItem('iqro_ambassador_thanks', 'true');
                }}
              >
                {t('header.ambassador.cta')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profil drawer — avatarni bosganda chapdan chiqadi */}
      <ProfileDrawer
        open={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
      />

    </>
  );
};

export default Header;
