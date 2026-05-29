import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, LogOut, ChevronDown, Camera, Medal, Palette, Bell, Calendar, CheckCircle2, AlertCircle, Info, Trash2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { EXAM_DATE } from '../config';
import { getReferralStats } from '../services/referral';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 768;

const Header = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const { state, updateState } = useContext(AppContext);
  const { toast, showToast } = useContext(ToastContext);
  const { user, logout } = useAuth();
  const [daysLeft, setDaysLeft] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
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

  // --- Yangi: Bildirishnomalar holati ---
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('IQRO_NOTIFICATIONS');
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    return [
      { id: '1', title: '🎉 IQRO Platformasiga xush kelibsiz!', message: "CHQBT va San'at bo'limlarida bilimingizni oshiring. Barcha testlar tayyor!", date: new Date().toISOString(), read: false, type: 'success' },
      { id: '2', title: '🔥 Kunlik maqsadni unutmang', message: 'Har kuni kamida 20 ta savol yechib, olovli streak zanjirini davom ettiring!', date: new Date(Date.now() - 3600000).toISOString(), read: false, type: 'info' },
      { id: '3', title: '💡 Takrorlash tavsiya etiladi', message: "Takrorlash bo'limida sizni xato qilingan savollar kutmoqda. Bilimingizni mustahkamlang!", date: new Date(Date.now() - 86400000).toISOString(), read: true, type: 'warning' }
    ];
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const calcDays = () => {
    const customSaved = localStorage.getItem('CUSTOM_EXAM_DATE');
    const target = customSaved ? new Date(customSaved) : EXAM_DATE;
    const diff = target - new Date();
    if (diff <= 0) {
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

  // Firestore'dan jonli bildirishnomalarni yuklash (onSnapshot orqali)
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(collection(db, 'notifications'), (notifSnap) => {
      try {
        const firestoreNotifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const relevantNotifs = firestoreNotifs.filter(n =>
          !n.targetUser && !n.userId
            ? true                                        // Umumiy bildirishnoma
            : n.targetUser === user?.uid                  // targetUser orqali
              || n.targetUser === 'all'
              || n.userId === user?.uid                   // referral bonus userId orqali
        );
        
        setNotifications(prev => {
          const localMap = new Map(prev.map(item => [item.id, item]));
          
          relevantNotifs.forEach(fn => {
            if (localMap.has(fn.id)) {
              const existing = localMap.get(fn.id);
              localMap.set(fn.id, { ...fn, read: existing.read });
            } else {
              localMap.set(fn.id, { ...fn, read: false });
            }
          });
          
          const merged = Array.from(localMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date));
          localStorage.setItem('IQRO_NOTIFICATIONS', JSON.stringify(merged));
          return merged;
        });
      } catch(e) {
        console.error("Bildirishnomalarni yuklashda xatolik:", e);
      }
    }, (err) => {
      console.error("Notification snapshot xatosi:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    if (showUserMenu || showNotifMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showNotifMenu]);

  // Foydalanuvchi ismining qisqartmasi (avatar uchun)
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Foydalanuvchi';

  return (
    <>
      <div className="header">
        <div className="logo" onClick={() => navigate('/')}>
          <div className="logo-box">IQ</div>
          <span className="logo-text">RO</span>
        </div>

        <div className="header-stats">
          {/* Kun Countdown */}
          <motion.div 
            className="hide-mobile" 
            onClick={() => {
              setTempDays(daysLeft);
              setShowExamModal(true);
            }} 
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', 
              padding: '6px 12px', borderRadius: '99px', cursor: 'pointer' 
            }}
            title="Imtihon sanasini o'zgartirish"
          >
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text)' }}>{daysLeft} kun qoldi</span>
            <Calendar size={13} style={{ color: 'var(--blue)', opacity: 0.8 }} />
          </motion.div>

          {/* Bildirishnomalar menyusi (Qo'ng'iroqcha) */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <motion.button 
              className="user-avatar-btn" 
              whileTap={{ scale: 0.95 }}
              style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer' }}
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              title="Bildirishnomalar"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', top: '-4px', right: '-4px', background: 'var(--red)', color: 'white', 
                  fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '99px', 
                  animation: 'pulse 2s infinite', border: '1.5px solid var(--bg2)' 
                }}>
                  {unreadCount}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifMenu && (
                <motion.div
                  className="user-dropdown glass-panel"
                  style={{ width: '320px', right: 0 }}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="user-dropdown-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text)' }}>Bildirishnomalar</div>
                    {unreadCount > 0 && (
                      <button 
                        className="btn btn-sm" 
                        style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: '12px', padding: 0, fontWeight: '600' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = notifications.map(n => ({ ...n, read: true }));
                          setNotifications(updated);
                          localStorage.setItem('IQRO_NOTIFICATIONS', JSON.stringify(updated));
                        }}
                      >
                        Barchasini o'qildi qilish
                      </button>
                    )}
                  </div>

                  <div className="user-dropdown-divider" style={{ margin: 0 }} />

                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                        Bildirishnomalar yo'q
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            const updated = notifications.map(item => item.id === n.id ? { ...item, read: true } : item);
                            setNotifications(updated);
                            localStorage.setItem('IQRO_NOTIFICATIONS', JSON.stringify(updated));
                          }}
                          style={{ 
                            padding: '14px 16px', 
                            borderBottom: '0.5px solid var(--border)', 
                            background: n.read ? 'transparent' : 'var(--blue-bg)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ 
                            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                            background: n.type === 'success' ? 'var(--green-bg)' : n.type === 'warning' ? 'var(--amber-bg)' : 'var(--blue-bg)',
                            color: n.type === 'success' ? 'var(--green)' : n.type === 'warning' ? 'var(--amber)' : 'var(--blue)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {n.type === 'success' ? <CheckCircle2 size={18} /> : n.type === 'warning' ? <AlertCircle size={18} /> : <Info size={18} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <div style={{ fontWeight: n.read ? '600' : '700', fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {n.title}
                              </div>
                              {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />}
                            </div>
                            <div style={{ fontSize: '12px', color: n.read ? 'var(--text3)' : 'var(--text2)', lineHeight: '1.4', marginBottom: '6px' }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: '500' }}>
                              {new Date(n.date).toLocaleDateString()} • {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <>
                      <div className="user-dropdown-divider" style={{ margin: 0 }} />
                      <button 
                        className="user-dropdown-item" 
                        style={{ justifyContent: 'center', width: '100%', padding: '12px', color: 'var(--red)', fontSize: '13px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifications([]);
                          localStorage.removeItem('IQRO_NOTIFICATIONS');
                        }}
                      >
                        <Trash2 size={16} style={{ marginRight: '8px' }} /> Barcha bildirishnomalarni o'chirish
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Taklif (Gift) Menu - Mavsumiy va jonli */}
          <div style={{ position: 'relative' }}>
            <motion.button
              className="user-avatar-btn"
              onClick={() => navigate('/referral')}
              title="Do'stlarni taklif qiling"
              initial={{ rotate: 0 }}
              animate={
                (!localStorage.getItem('iqro_gift_wiggled') && user && !isAmbassador) ? {
                  rotate: [0, -15, 15, -15, 15, 0],
                  scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
                } : {}
              }
              transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1], repeat: 2 }}
              onAnimationComplete={() => localStorage.setItem('iqro_gift_wiggled', 'true')}
              whileTap={{ scale: 0.9 }}
              style={{
                width: '38px', height: '38px', borderRadius: '12px',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative'
              }}
            >
              {(() => {
                const month = new Date().getMonth() + 1;
                let iconStr = '🎁';
                let glowColor = 'rgba(245, 158, 11, 0.4)';
                if (month >= 3 && month <= 5) {
                  iconStr = '🌸'; glowColor = 'rgba(236, 72, 153, 0.4)';
                } else if (month >= 6 && month <= 8) {
                  iconStr = '☀️'; glowColor = 'rgba(239, 68, 68, 0.4)';
                } else if (month >= 9 && month <= 11) {
                  iconStr = '🍂'; glowColor = 'rgba(217, 119, 6, 0.4)';
                } else {
                  iconStr = '❄️'; glowColor = 'rgba(56, 189, 248, 0.4)';
                }

                return (
                  <>
                    <span style={{ fontSize: '20px', zIndex: 2 }}>{iconStr}</span>
                    <div style={{
                      position: 'absolute', inset: -4, borderRadius: '14px',
                      background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                      zIndex: 1, pointerEvents: 'none'
                    }} />
                  </>
                );
              })()}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Imtihon sanasini sozlash modali */}
      {showExamModal && (
        <div className="modal-overlay" onClick={() => setShowExamModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={22} style={{ color: 'var(--blue)' }} /> Imtihon sanasini sozlash
            </div>
            <div className="modal-text" style={{ marginBottom: '20px' }}>
              Imtihonga necha kun qolganini o'zingiz belgilang. Tizim har kuni avtomatik ravishda teskari sanoqni hisoblab boradi.
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '6px', display: 'block' }}>Qolgan kunlar sonini kiriting:</label>
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
              
              <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', fontWeight: '600' }}>YOKI</div>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)', marginBottom: '6px', display: 'block' }}>Aniq sanani tanlang:</label>
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
              bottom: IS_MOBILE ? '90px' : '32px',
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
            style={{ zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
              className="modal-content glass-panel"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))', border: '1px solid rgba(245, 158, 11, 0.3)' }}
            >
              <div style={{ fontSize: '60px', marginBottom: '10px' }}>🌟</div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginBottom: '12px' }}>
                Katta Rahmat!
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '20px' }}>
                Sizning yordamingiz bilan 5 ta yangi do'stimiz loyihaga qo'shildi! Platformamiz rivojiga qo'shgan ushbu ulkan hissangiz uchun sizdan juda minnatdormiz.
              </p>
              <div style={{ background: 'var(--amber-bg)', color: 'var(--amber)', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '24px' }}>
                Siz uchun maxsus: yana 2 ta do'stingizni taklif qilib chegirmalar olish imkoniyatini taqdim etamiz! (Limit +2)
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#fff', fontSize: '16px' }}
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
    </>
  );
};

export default Header;
