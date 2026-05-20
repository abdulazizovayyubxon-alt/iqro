import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, LogOut, ChevronDown, Camera, Medal, Palette, Bell, Calendar, CheckCircle2, AlertCircle, Info, Trash2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { EXAM_DATE } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const { state, updateState } = useContext(AppContext);
  const { toast, showToast } = useContext(ToastContext);
  const { user, logout } = useAuth();
  const [daysLeft, setDaysLeft] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  // Firestore'dan jonli bildirishnomalarni yuklash
  useEffect(() => {
    const fetchFirestoreNotifications = async () => {
      try {
        const notifSnap = await getDocs(collection(db, 'notifications'));
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
    };

    fetchFirestoreNotifications();
    const interval = setInterval(fetchFirestoreNotifications, 180000);
    return () => clearInterval(interval);
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
          <div 
            className="hstat hide-mobile" 
            onClick={() => {
              setTempDays(daysLeft);
              setShowExamModal(true);
            }} 
            style={{ cursor: 'pointer' }}
            title="Imtihon sanasini o'zgartirish"
          >
            <div className="hstat-val" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {daysLeft} <Calendar size={14} style={{ color: 'var(--blue)', opacity: 0.8 }} />
            </div>
            <div className="hstat-lbl">Kun qoldi</div>
          </div>

          {/* Bildirishnomalar menyusi (Qo'ng'iroqcha) */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button 
              className="user-avatar-btn" 
              style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              title="Bildirishnomalar"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', top: '-2px', right: '-2px', background: 'var(--red)', color: 'white', 
                  fontSize: '10px', fontWeight: '800', padding: '1px 5px', borderRadius: '10px', 
                  animation: 'pulse 2s infinite', border: '2px solid var(--bg)' 
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

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

          {/* Foydalanuvchi Avatar Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="user-avatar-btn"
              onClick={() => navigate('/profile')}
              title={displayName}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div className="user-avatar-initials">
                  {getInitials(displayName)}
                </div>
              )}
              <span className="hide-mobile" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)' }}>
                {displayName}
              </span>
            </button>
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
      {toast && (
        <div className={`toast toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' && '✓ '}
          {toast.type === 'error' && '✗ '}
          {toast.type === 'info' && 'ℹ '}
          {toast.message}
        </div>
      )}
    </>
  );
};

export default Header;
