import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, LogOut, ChevronDown, Camera, Medal, Palette } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { EXAM_DATE } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const { state, updateState } = useContext(AppContext);
  const { toast, showToast } = useContext(ToastContext);
  const { user, logout } = useAuth();
  const [daysLeft, setDaysLeft] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const calcDays = () => {
      const diff = EXAM_DATE - new Date();
      if (diff <= 0) {
        setDaysLeft(0);
      } else {
        setDaysLeft(Math.floor(diff / 86400000));
      }
    };
    calcDays();
    const interval = setInterval(calcDays, 60000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="logo" onClick={() => navigate('/')}>
          <div className="logo-box">IQ</div>
          <span className="logo-text">RO</span>
        </div>

        <div className="header-stats">
          {/* Kun Countdown faqat shu yerda qoldi */}
          <div className="hstat hide-mobile">
            <div className="hstat-val">{daysLeft}</div>
            <div className="hstat-lbl">Kun qoldi</div>
          </div>

          {/* Foydalanuvchi Avatar Menu */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={displayName}
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
              <ChevronDown size={14} className="hide-mobile" style={{ color: 'var(--text3)' }} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  className="user-dropdown glass-panel"
                  style={{ width: '260px' }}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="user-dropdown-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={displayName}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div className="user-avatar-initials" style={{ width: '48px', height: '48px', fontSize: '18px', flexShrink: 0 }}>
                        {getInitials(displayName)}
                      </div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{displayName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email || 'Foydalanuvchi'}</div>
                    </div>
                  </div>



                  <div className="user-dropdown-divider" />
                  
                  {/* Stats in Dropdown */}
                  <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)' }}>Umumiy ball:</span>
                    <span style={{ fontWeight: '800', color: 'var(--blue)', fontSize: '16px' }}>{state.totalScore || 0}</span>
                  </div>
                  <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)' }}>Joriy Streak:</span>
                    <span style={{ fontWeight: '800', color: 'var(--amber)', fontSize: '16px' }}>{(state.stats?.[state.activeCategory]?.streak) || 0} 🔥</span>
                  </div>

                  <div className="user-dropdown-divider" />
                  
                  {/* Category Switcher */}
                  <div style={{ padding: '8px 16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Bo'limni tanlang</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn btn-sm ${state.activeCategory === 'chqbt' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => { updateState({ activeCategory: 'chqbt' }); navigate('/'); setShowUserMenu(false); }}
                        style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                      >
                        <Medal size={16} style={{ marginRight: '6px' }} /> CHQBT
                      </button>
                      <button
                        className={`btn btn-sm ${state.activeCategory === 'art' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => { updateState({ activeCategory: 'art' }); navigate('/'); setShowUserMenu(false); }}
                        style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                      >
                        <Palette size={16} style={{ marginRight: '6px' }} /> San'at
                      </button>
                    </div>
                  </div>

                  <div className="user-dropdown-divider" />
                  
                  {/* Theme Toggle */}
                  <button 
                    className="user-dropdown-item" 
                    onClick={(e) => { e.stopPropagation(); toggleTheme(); }} 
                    style={{ justifyContent: 'space-between', width: '100%', padding: '12px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
                      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                      <span style={{ marginLeft: '12px', fontWeight: '500' }}>{theme === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}</span>
                    </div>
                  </button>

                  <div className="user-dropdown-divider" />

                  <button
                    className="user-dropdown-item"
                    style={{ padding: '12px 16px', color: 'var(--red)' }}
                    onClick={() => { logout(); setShowUserMenu(false); }}
                  >
                    <LogOut size={18} style={{ marginRight: '12px' }} />
                    <span style={{ fontWeight: '500' }}>Tizimdan chiqish</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

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
