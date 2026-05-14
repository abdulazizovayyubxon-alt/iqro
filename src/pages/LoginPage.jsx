import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, LogIn, Lock, Eye, EyeOff, UserPlus, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';

const LoginPage = () => {
  const {
    signInWithPhone, signInWithGoogle, resetPassword,
    authError, setAuthError,
    calculatePasswordStrength, checkLockout
  } = useAuth();

  const [form, setForm] = useState({ name: '', phone: '+998', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(null);

  // Brute-force lockout taymerini tekshirish
  useEffect(() => {
    const checkLock = () => {
      const status = checkLockout();
      if (status.locked) {
        setLockoutTimer(Math.ceil(status.remainingMs / 1000));
      } else {
        setLockoutTimer(null);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, [checkLockout]);

  // Parol kuchi — real vaqtda hisoblash
  const passwordStrength = useMemo(() => {
    if (mode !== 'register' || !form.password) return null;
    const cleanPhone = form.phone.replace(/\D/g, '');
    return calculatePasswordStrength(form.password, cleanPhone);
  }, [form.password, form.phone, mode, calculatePasswordStrength]);

  const handleChange = (e) => {
    setAuthError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e) => {
    setAuthError('');
    let val = e.target.value.replace(/[^\d+]/g, '');
    
    // Faqat O'zbekiston kodi qolishini ta'minlash
    if (!val.startsWith('+998')) {
      if (val.startsWith('998')) val = '+' + val;
      else if (val.startsWith('+')) val = '+998';
      else val = '+998' + val;
    }
    
    // Raqamlar soni 13 tadan oshmasligi kerak (+998 va 9 ta raqam)
    if (val.length > 13) {
      val = val.slice(0, 13);
    }
    
    setForm(prev => ({ ...prev, phone: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    // Lockout tekshiruvi
    if (lockoutTimer) {
      setAuthError(`Xavfsizlik sababli akkaunt bloklangan. ${Math.ceil(lockoutTimer / 60)} daqiqa kuting.`);
      return;
    }

    // Ro'yxatdan o'tishda ism validatsiyasi
    if (mode === 'register') {
      if (!form.name.trim() || form.name.length < 3) {
        setAuthError("Iltimos, to'liq ism-familiyangizni kiriting (kamida 3 belgi).");
        return;
      }
    }

    // Telefon validatsiyasi (Faqat O'zbekiston kodi)
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      setAuthError("Iltimos, O'zbekiston telefon raqamini to'g'ri kiriting (masalan: +998901234567).");
      return;
    }

    // Ro'yxatdan o'tishda parol tekshiruvi
    if (mode === 'register') {
      if (!form.password || form.password.length < 10) {
        setAuthError("Parol kamida 10 ta belgidan iborat bo'lishi kerak.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setAuthError("Parollar mos kelmaydi. Iltimos, qaytadan tekshiring.");
        return;
      }
    } else {
      if (!form.password) {
        setAuthError("Maxfiy parolni kiritish shart.");
        return;
      }
    }

    setLoading(true);
    const displayName = mode === 'register' ? form.name : (form.name || cleanPhone);
    await signInWithPhone(displayName, form.phone, form.password, mode === 'register');
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      setAuthError("Parolni tiklash uchun avval telefon raqamingizni to'liq kiriting.");
      return;
    }
    await resetPassword(form.phone);
  };

  // Parol kuchi rangi va foizi
  const getStrengthColor = (level) => {
    switch (level) {
      case 'strong': return 'var(--green)';
      case 'medium': return 'var(--amber)';
      case 'weak': return '#F97316';
      case 'danger': return 'var(--red)';
      default: return 'var(--bg3)';
    }
  };

  const getStrengthEmoji = (level) => {
    switch (level) {
      case 'strong': return '🟢';
      case 'medium': return '🟡';
      case 'weak': return '🟠';
      case 'danger': return '🔴';
      default: return '';
    }
  };

  // Lockout formatlanishi
  const formatLockout = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isLocked = lockoutTimer !== null && lockoutTimer > 0;

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
          <div className="login-logo-icon">
            <Shield size={48} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 4px 12px rgba(59,130,246,0.3))' }} />
          </div>
          <div className="login-logo-title">IQRO</div>
          <div className="login-logo-sub">Tizimga xavfsiz kirish</div>
        </div>

        {/* Lockout ogohlantirishi */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'var(--red-bg)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <AlertTriangle size={24} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--red)', marginBottom: '2px' }}>
                  Akkaunt vaqtinchalik bloklangan
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                  Xavfsizlik sababli {formatLockout(lockoutTimer)} vaqt kuting
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            id="login-tab-btn"
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
            id="register-tab-btn"
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
                <label className="login-label"><User size={14} /> Ism va familiya</label>
                <input
                  id="register-name-input"
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
              id="login-phone-input"
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
            <label className="login-label"><Lock size={14} /> Maxfiy parol</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password-input"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Maxfiy parol"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                id="toggle-password-btn"
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

          {/* Parolni tasdiqlash va kuch indikatori — faqat ro'yxatdan o'tishda */}
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="register-extra-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Parol kuchi indikatori — rangli progress-bar */}
                {form.password.length > 0 && passwordStrength && (
                  <div style={{ marginBottom: '16px' }}>
                    {/* Progress bar */}
                    <div style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--bg3)',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordStrength.score}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          borderRadius: '3px',
                          background: getStrengthColor(passwordStrength.level),
                        }}
                      />
                    </div>

                    {/* Kuch darajasi matni */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: getStrengthColor(passwordStrength.level)
                      }}>
                        {getStrengthEmoji(passwordStrength.level)} {passwordStrength.label}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                        {passwordStrength.score}/100 ball
                      </span>
                    </div>

                    {/* Batafsil tekshiruvlar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '4px',
                      fontSize: '11px'
                    }}>
                      {[
                        { key: 'length', label: '10+ belgi uzunlik' },
                        { key: 'uppercase', label: 'Katta harf (A-Z)' },
                        { key: 'lowercase', label: 'Kichik harf (a-z)' },
                        { key: 'digit', label: 'Raqam (0-9)' },
                        { key: 'noSequential', label: "Ketma-ket yo'q" },
                        { key: 'noRepeated', label: "Takror yo'q" },
                      ].map(({ key, label }) => (
                        <div key={key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: passwordStrength.checks[key] ? 'var(--green)' : 'var(--text3)',
                          padding: '3px 0'
                        }}>
                          {passwordStrength.checks[key]
                            ? <CheckCircle size={12} />
                            : <XCircle size={12} style={{ opacity: 0.5 }} />
                          }
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parolni tasdiqlash maydoni */}
                <div className="login-field">
                  <label className="login-label"><ShieldCheck size={14} /> Parolni tasdiqlang</label>
                  <input
                    id="register-confirm-password-input"
                    className="login-input"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Parolni qaytadan kiriting"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  {/* Parol mos kelish indikatori */}
                  {form.confirmPassword && (
                    <div style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {form.password === form.confirmPassword ? (
                        <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Parollar mos keladi
                        </span>
                      ) : (
                        <span style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={14} /> Parollar mos kelmaydi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Xatolik xabari */}
          <AnimatePresence>
            {authError && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{authError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn btn-primary login-submit-btn"
            disabled={loading || isLocked}
            style={{ marginTop: 10 }}
          >
            {loading ? '⏳ Iltimos, kuting...' : (
              isLocked ? (
                <><AlertTriangle size={18} /> Bloklangan ({formatLockout(lockoutTimer)})</>
              ) : mode === 'register'
                ? <><UserPlus size={18} /> Ro'yxatdan o'tish</>
                : <><LogIn size={18} /> Tizimga kirish</>
            )}
          </button>

          {/* Parolni unutdim — faqat kirish rejimida */}
          {mode === 'login' && (
            <button
              type="button"
              id="forgot-password-btn"
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
          id="google-login-btn"
          onClick={async () => { setLoading(true); await signInWithGoogle(); setLoading(false); }}
          disabled={loading || isLocked}
          style={{
            width: '100%', padding: '13px', borderRadius: '12px',
            border: '1.5px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--text)', fontSize: '15px', fontWeight: '600',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '12px', transition: 'all 0.2s',
            fontFamily: 'inherit', marginBottom: '10px',
            opacity: isLocked ? 0.5 : 1
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

        <p className="login-footer-note" style={{ marginTop: 20 }}>
          <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Sizning parolingiz xavfsiz tarzda shifrlangan holda saqlanadi. Telefon raqamingiz faqat akkauntingizni aniqlash uchun ishlatiladi.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
