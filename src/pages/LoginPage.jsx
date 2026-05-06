import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Phone, LogIn } from 'lucide-react';

const LoginPage = () => {
  const { signInWithPhoneSimple, authError, setAuthError } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.length < 3) {
      setAuthError("Iltimos, to'liq ism-familiyangizni kiriting.");
      return;
    }
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setAuthError("Telefon raqami to'liq emas (masalan: +998901234567).");
      return;
    }

    setLoading(true);
    await signInWithPhoneSimple(form.name, form.phone);
    setLoading(false);
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

        <div style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text2)', fontSize: 14 }}>
          Tizimga kirish uchun o'z ma'lumotlaringizni kiriting.
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label"><User size={14} /> Ism va Familiya</label>
            <input
              className="login-input"
              type="text"
              name="name"
              placeholder="Masalan: Abdullayev Jasur"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

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
            />
          </div>

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
            {loading ? '⏳ Kuting...' : <><LogIn size={18} /> Tizimga Kirish</>}
          </button>
        </form>

        <p className="login-footer-note" style={{ marginTop: 32 }}>
          🔒 Raqamingiz akkauntingizni tiklash va yutuqlaringizni saqlash uchun ishlatiladi.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
