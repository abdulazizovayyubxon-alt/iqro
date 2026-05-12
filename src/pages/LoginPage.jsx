import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, LogIn, Lock, Eye, EyeOff, UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  const { signInWithPhone, resetPassword, authError, setAuthError } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setAuthError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e) => {
    setAuthError('');
    let val = e.target.value.replace(/[^\d+]/g, '');
    if (!val.startsWith('+')) val = '+' + val.replace(/\+/g, '');
    setForm(prev => ({ ...prev, phone: val }));
  };

  const switchMode = () => {
    setAuthError('');
    setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    // Ro'yxatdan o'tishda ism validatsiyasi
    if (mode === 'register') {
      if (!form.name.trim() || form.name.length < 3) {
        setAuthError("Iltimos, to'liq ism-familiyangizni kiriting (kamida 3 belgi).");
        return;
      }
    }

    // Telefon validatsiyasi
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setAuthError("Telefon raqami to'liq emas (masalan: +998901234567).");
      return;
    }

    // Parol validatsiyasi
    if (!form.password || form.password.length < 6) {
      setAuthError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    // Ro'yxatdan o'tishda parol tasdiqlash
    if (mode === 'register' && form.password !== form.confirmPassword) {
      setAuthError("Parollar mos kelmaydi.");
      return;
    }

    setLoading(true);
    // Kirish rejimida ism sifatida telefon raqamning o'zini beramiz (mavjud bo'lsa, serverdan olinadi)
    const displayName = mode === 'register' ? form.name : (form.name || cleanPhone);
    await signInWithPhone(displayName, form.phone, form.password);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!form.phone || form.phone.replace(/\D/g, '').length < 9) {
      setAuthError("Avval telefon raqamingizni kiriting.");
      return;
    }
    await resetPassword(form.phone);
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-bg-circle login-bg-circle-2" />
      <div className="login-bg-circle login-bg-circle-3" />

      <motion.div
        className="login-card glass-panel"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <div className="login-logo-title">IQRO</div>
          <div className="login-logo-sub">Kasbiy Sertifikatlash Platformasi</div>
        </div>

        {/* Rejim almashtirish indikatori */}
        <div style={{
          display: 'flex',
          background: 'var(--bg3)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setAuthError(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: mode === 'login' ? 'var(--accent)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text3)',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0,122,255,0.3)' : 'none',
            }}
          >
            <LogIn size={16} /> Kirish
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setAuthError(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: mode === 'register' ? 'var(--accent)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text3)',
              boxShadow: mode === 'register' ? '0 2px 8px rgba(0,122,255,0.3)' : 'none',
            }}
          >
            <UserPlus size={16} /> Ro'yxatdan o'tish
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <AnimatePresence mode="wait">
            {/* Ism maydoni — faqat ro'yxatdan o'tishda ko'rsatiladi */}
            {mode === 'register' && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="login-field"
              >
                <label className="login-label"><User size={14} /> Ism va Familiya</label>
                <input
                  className="login-input"
                  type="text"
                  name="name"
                  placeholder="Masalan: Abdullayev Jasur"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="login-field">
            <label className="login-label"><Phone size={14} /> Telefon raqam</label>
            <input
              className="login-input"
              type="tel"
              name="phone"
              placeholder="+998 90 123 45 67"
              value={form.phone}
              onChange={handlePhoneChange}
              required
              autoComplete="tel"
              autoFocus
            />
          </div>

          {/* Parol maydoni */}
          <div className="login-field">
            <label className="login-label"><Lock size={14} /> Parol</label>
            <div style={{ position: 'relative' }}>
              <input
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={mode === 'register' ? "Kamida 6 ta belgi" : "Parolingizni kiriting"}
                value={form.password}
                onChange={handleChange}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                style={{ paddingRight: '44px' }}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                tabIndex={-1}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Parolni tasdiqlash — faqat ro'yxatdan o'tishda */}
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="confirm-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="login-field"
              >
                <label className="login-label"><ShieldCheck size={14} /> Parolni tasdiqlang</label>
                <input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Parolni qaytadan kiriting"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                />
                {/* Parol kuchi indikatori */}
                {form.password.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      height: '4px',
                      borderRadius: '2px',
                      background: 'var(--bg3)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        borderRadius: '2px',
                        transition: 'all 0.3s ease',
                        width: form.password.length >= 12 ? '100%' :
                               form.password.length >= 8 ? '66%' :
                               form.password.length >= 6 ? '33%' : '10%',
                        background: form.password.length >= 12 ? 'var(--green)' :
                                    form.password.length >= 8 ? 'var(--amber)' :
                                    form.password.length >= 6 ? 'var(--blue)' : 'var(--red)',
                      }} />
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text3)',
                      marginTop: '4px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>
                        {form.password.length >= 12 ? '🟢 Kuchli parol' :
                         form.password.length >= 8 ? '🟡 O\'rtacha parol' :
                         form.password.length >= 6 ? '🔵 Qabul qilinadigan' :
                         '🔴 Juda qisqa'}
                      </span>
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <span style={{ color: 'var(--red)' }}>⚠ Mos kelmaydi</span>
                      )}
                      {form.confirmPassword && form.password === form.confirmPassword && (
                        <span style={{ color: 'var(--green)' }}>✓ Mos keladi</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Xatolik xabari */}
          {authError && (
            <motion.div
              className="login-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ⚠️ {authError}
            </motion.div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={loading}
            style={{ marginTop: 10 }}
          >
            {loading ? '⏳ Kuting...' : (
              mode === 'register' 
                ? <><UserPlus size={18} /> Ro'yxatdan O'tish</>
                : <><LogIn size={18} /> Tizimga Kirish</>
            )}
          </button>

          {/* Parolni unutdim — faqat kirish rejimida */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                marginTop: '12px',
                fontFamily: 'inherit',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                opacity: 0.8
              }}
            >
              Parolni unutdingizmi?
            </button>
          )}
        </form>

        <p className="login-footer-note" style={{ marginTop: 28 }}>
          🔒 Parolingiz xavfsiz tarzda shifrlangan holda saqlanadi. Telefon raqamingiz akkauntingizni aniqlash uchun ishlatiladi.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
