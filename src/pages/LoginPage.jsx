import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, LogIn, Lock, Eye, EyeOff, UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  const { signInWithPhone, signInWithGoogle, resetPassword, authError, setAuthError } = useAuth();
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

        {/* Ajratuvchi */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          margin: '20px 0', color: 'var(--text3)', fontSize: '13px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          yoki
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Google orqali kirish */}
        <button
          type="button"
          onClick={async () => { setLoading(true); await signInWithGoogle(); setLoading(false); }}
          disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: '12px',
            border: '1.5px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--text)', fontSize: '15px', fontWeight: '600',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '12px', transition: 'all 0.2s',
            fontFamily: 'inherit', marginBottom: '10px'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.7 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.7 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5 0 9.5-1.7 13.1-4.4l-6-5.2C28.8 36.1 26.5 36.8 24 36.8c-5.4 0-9.9-3.4-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.2l6 5.2C36.6 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
          </svg>
          Google orqali kirish
        </button>

        {/* Telegram orqali kirish */}
        <button
          type="button"
          onClick={() => window.open('https://t.me/xonnoma', '_blank')}
          style={{
            width: '100%', padding: '13px', borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #0088cc, #0099e6)',
            color: '#fff', fontSize: '15px', fontWeight: '600',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px', transition: 'all 0.2s',
            fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(0,136,204,0.3)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.6 4.59-1.88 5.1-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .37z"/>
          </svg>
          Telegram orqali murojaat
        </button>

        <p className="login-footer-note" style={{ marginTop: 20 }}>
          🔒 Parolingiz xavfsiz tarzda shifrlangan holda saqlanadi. Telefon raqamingiz akkauntingizni aniqlash uchun ishlatiladi.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
