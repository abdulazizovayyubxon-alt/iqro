import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, BookOpen, Calendar, Crown } from 'lucide-react';
import GiftBox from './shared/GiftBox';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EXAM_DATE } from '../config';
import { getReferralStats } from '../services/referral';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useIsMobile } from '../hooks/useIsMobile';
import PremiumModal from './PremiumModal';
import { useModalBackButton } from './profile/useModalBackButton';
import { useNotifications } from '../hooks/useNotifications';

const Header = ({ theme, toggleTheme }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast, showToast } = useContext(ToastContext);
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [, setIsOnline] = useState(navigator.onLine);
  const [showPremium, setShowPremium] = useState(false);
  const isPremium = user?.isPremium || false;
  const { unreadCount } = useNotifications();
  useModalBackButton(showPremium, () => setShowPremium(false));
  // O'ng tomon ikonka tugmalari o'lchami — mobil ekranda joy tig'iz bo'lgani uchun kichikroq
  const btnSize = isMobile ? 38 : 44;
  
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
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
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

  // --- Yangi: Imtihon sanasi modal holatlari ---
  const [showExamModal, setShowExamModal] = useState(false);
  const [tempDays, setTempDays] = useState('');
  const [tempDate, setTempDate] = useState('');

  const calcDays = () => {
    const customSaved = localStorage.getItem('CUSTOM_EXAM_DATE');
    let target = null;
    if (customSaved) {
      target = new Date(customSaved);
      if (isNaN(target.getTime())) target = null;
    }
    if (!target) target = EXAM_DATE;

    if (!target) {
      setDaysLeft(0);
      return;
    }

    const diff = target - new Date();
    if (isNaN(diff) || diff <= 0) {
      setDaysLeft(0);
    } else {
      setDaysLeft(Math.floor(diff / 86400000));
    }
  };

  useEffect(() => {
    // Firestore dan imtihon sanasini yuklash (qurilmalar arasi sinxron)
    const loadExamDate = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().examDate) {
          const firestoreDate = snap.data().examDate;
          // Firestore dagi sana localStorage ga kesh qilamiz
          localStorage.setItem('iqro_exam_date', firestoreDate);
          localStorage.setItem('CUSTOM_EXAM_DATE', new Date(firestoreDate).toISOString());
        }
      } catch (e) {
        console.warn('Exam date yuklashda xato:', e);
      }
      calcDays();
    };
    loadExamDate();
    window.addEventListener('storage', calcDays);
    const interval = setInterval(calcDays, 60000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', calcDays);
    };
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

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Foydalanuvchi';

  return (
    <>
      <div className="header">
        <div className="header-greeting" onClick={() => navigate('/profile')} title="Profil">
          <div className="header-avatar-wrap">
            <div className="header-avatar">
              {user?.photoURL
                ? <img src={user.photoURL} alt={displayName} />
                : <span>{getInitials(displayName)}</span>}
            </div>
            {unreadCount > 0 && (
              <span className="header-avatar-badge" title={`${unreadCount} ta yangi bildirishnoma`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="header-greeting-text">
            <span className="header-greet-hi">Xush kelibsiz 👋</span>
            <span className="header-greet-name">{displayName}</span>
          </div>
        </div>

        <div className="header-stats">
          {/* Premium tugmasi (Wisdom uslubidagi pill) */}
          <motion.button
            className="header-premium-pill"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPremium(true)}
            title={isPremium ? 'Premium faol' : 'Premium sotib olish'}
          >
            <motion.span
              className="header-premium-gem"
              style={{ display: 'block', transformStyle: 'preserve-3d' }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 360 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              <Crown size={16} strokeWidth={2.4} />
            </motion.span>
            <span className="header-premium-label">Premium</span>
          </motion.button>

          {/* Kun Countdown */}
          <motion.div 
            className="header-exam-countdown hide-mobile" 
            onClick={() => {
              setTempDays(daysLeft);
              setShowExamModal(true);
            }} 
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            title="Imtihon sanasini o'zgartirish"
            style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box' }}
          >
            <span className="header-exam-countdown-text">{daysLeft} kun qoldi</span>
            <Calendar size={13} style={{ color: 'var(--blue)', opacity: 0.8 }} />
          </motion.div>

          {/* Tema almashtirish: Kunduzgi → Sepia (o'qish) → Tungi */}
          <motion.button
            className="user-avatar-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleTheme()}
            title={theme === 'light' ? "Sepia (o'qish) rejimi" : theme === 'sepia' ? 'Tungi rejim' : 'Kunduzgi rejim'}
            style={{ width: btnSize, height: btnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', padding: 0 }}
          >
            {theme === 'dark' ? <Moon size={18} /> : theme === 'sepia' ? <BookOpen size={18} /> : <Sun size={18} />}
          </motion.button>

          {/* Taklif (Gift) tugmasi — sodda, neytral ikonka */}
          <motion.button
            className="user-avatar-btn"
            onClick={() => navigate('/referral')}
            title="Do'stlarni taklif qiling"
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
            style={{ width: btnSize, height: btnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', padding: 0 }}
          >
            <GiftBox size={22} />
          </motion.button>
        </div>
      </div>

      {/* Imtihon sanasini sozlash modali */}
      {showExamModal && (
        <div className="modal-overlay" onClick={() => setShowExamModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-title">
              <Calendar size={22} style={{ color: 'var(--blue)' }} /> Imtihon sanasini sozlash
            </div>
            <div className="modal-text">
              Imtihonga necha kun qolganini o'zingiz belgilang. Tizim har kuni avtomatik ravishda teskari sanoqni hisoblab boradi.
            </div>
            
            <div className="flex-col-gap-16" style={{ marginBottom: '24px' }}>
              <div>
                <label className="input-label-sm">Qolgan kunlar sonini kiriting:</label>
                <input 
                  type="number" 
                  className="modal-input" 
                  value={tempDays} 
                  onChange={(e) => setTempDays(e.target.value)}
                  placeholder="Masalan: 30"
                  min="1"
                  max="1000"
                />
              </div>
              
              <div className="text-center-or">YOKI</div>
              
              <div>
                <label className="input-label-sm">Aniq sanani tanlang:</label>
                <input 
                  type="date" 
                  className="modal-input" 
                  value={tempDate} 
                  onChange={(e) => {
                    setTempDate(e.target.value);
                    if (e.target.value) {
                      const diff = new Date(e.target.value) - new Date();
                      setTempDays(Math.max(0, Math.floor(diff / 86400000)));
                    }
                  }}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowExamModal(false)}>
                Bekor qilish
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={async () => {
                  let target = null;
                  if (tempDate) {
                    target = new Date(tempDate);
                  } else if (tempDays !== '') {
                    target = new Date(Date.now() + parseInt(tempDays) * 86400000);
                  }
                  if (target) {
                    // localStorage ga kesh sifatida saqlaymiz
                    localStorage.setItem('CUSTOM_EXAM_DATE', target.toISOString());
                    // yyyy-mm-dd formatda ham saqlaymiz (ProfilePage uchun)
                    const dateStr = target.toISOString().split('T')[0];
                    localStorage.setItem('iqro_exam_date', dateStr);
                    // ═══ FIRESTORE GA SAQLAYMIZ (qurilmalar arasi sinxron) ═══
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid), { examDate: dateStr }, { merge: true });
                      } catch (e) {
                        console.warn('Exam date Firestore saqlash xatosi:', e);
                      }
                    }
                    calcDays();
                    showToast("Imtihon sanasi muvaffaqiyatli saqlandi!", 'success');
                  }
                  setShowExamModal(false);
                }}
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

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
              padding: '12px 24px',
              borderRadius: '99px',
              fontSize: '14px',
              fontWeight: 700,
              zIndex: 10000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.92)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.92)' : 'rgba(37, 99, 235, 0.92)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 800 }}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✗'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span>{toast.message}</span>
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
                Katta Rahmat!
              </h2>
              <p className="ambassador-text">
                Sizning yordamingiz bilan 5 ta yangi do'stimiz loyihaga qo'shildi! Platformamiz rivojiga qo'shgan ushbu ulkan hissangiz uchun sizdan juda minnatdormiz.
              </p>
              <div className="ambassador-highlight">
                Siz uchun maxsus: yana 2 ta do'stingizni taklif qilib chegirmalar olish imkoniyatini taqdim etamiz! (Limit +2)
              </div>
              <button
                className="btn btn-primary ambassador-btn"
                onClick={() => {
                  setAmbassadorModal(false);
                  localStorage.setItem('iqro_ambassador_thanks', 'true');
                }}
              >
                Ajoyib!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium sotib olish oynasi (header'dagi Premium tugmasi ochadi) */}
      {showPremium && <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />}
    </>
  );
};

export default Header;
