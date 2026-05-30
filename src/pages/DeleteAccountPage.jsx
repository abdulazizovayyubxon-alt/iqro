import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Send, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.startsWith('998')) {
      return '+' + cleanValue.slice(0, 12);
    }
    return cleanValue;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      setError("Iltimos, O'zbekiston telefon raqamini to'g'ri kiriting (+998XXXXXXXXX)");
      return;
    }

    if (!name.trim()) {
      setError("Iltimos, ismingizni kiriting");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'deletionRequests'), {
        name: name.trim(),
        phone: cleanPhone,
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Account deletion request error:", err);
      setError("So'rov yuborishda xatolik yuz berdi. Iltimos keyinroq qayta urining.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>Hisobni o'chirish</h1>
        <div style={{ width: 24 }} />
      </div>

      <div style={s.container}>
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div style={s.card}>
                <div style={s.iconWrap}>
                  <Trash2 size={40} color="#F44336" />
                </div>
                <h2 style={s.subtitle}>Hisobingizni o'chirish so'rovi</h2>
                <p style={s.description}>
                  Google Play qoidalariga muvofiq, IQRO platformasidagi akkauntingizni o'chirishni so'rashingiz mumkin.
                  Sizning profilingiz, test natijalaringiz, statistika va barcha shaxsiy ma'lumotlaringiz tizimdan butunlay o'chiriladi.
                </p>

                {error && <div style={s.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} style={s.form}>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Ism va Familiya</label>
                    <input
                      type="text"
                      placeholder="Ismingizni kiriting"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={s.input}
                      required
                    />
                  </div>

                  <div style={s.inputGroup}>
                    <label style={s.label}>Telefon Raqam</label>
                    <input
                      type="tel"
                      placeholder="+998 (__) ___-__-__"
                      value={phone}
                      onChange={handlePhoneChange}
                      style={s.input}
                      required
                    />
                  </div>

                  <div style={s.inputGroup}>
                    <label style={s.label}>Hisobni o'chirish sababi (ixtiyoriy)</label>
                    <textarea
                      placeholder="Nima uchun hisobingizni o'chirishni xohlaysiz?"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ ...s.input, ...s.textarea }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={loading ? { ...s.submitBtn, ...s.btnDisabled } : s.submitBtn}
                  >
                    {loading ? (
                      "Yuborilmoqda..."
                    ) : (
                      <>
                        <Send size={18} style={{ marginRight: 8 }} />
                        So'rovni Yuborish
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={s.cardSuccess}
            >
              <div style={s.iconWrapSuccess}>
                <CheckCircle size={60} color="#4CAF50" />
              </div>
              <h2 style={s.subtitle}>So'rovingiz qabul qilindi</h2>
              <p style={s.description}>
                Hisobingizni o'chirish bo'yicha so'rov muvaffaqiyatli yuborildi. 
                Shaxsingizni tasdiqlash uchun adminlarimiz 24-48 soat ichida Siz bilan bog'lanishadi yoki so'rovingiz avtomatik bajariladi.
              </p>
              <button onClick={() => navigate('/')} style={s.homeBtn}>
                Bosh sahifaga qaytish
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text)',
    paddingBottom: '80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    textAlign: 'center',
  },
  container: {
    padding: '24px 20px',
    maxWidth: 500,
    margin: '0 auto',
  },
  card: {
    background: 'var(--bg2)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    padding: '28px 24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  },
  cardSuccess: {
    background: 'var(--bg2)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    padding: '40px 24px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  },
  iconWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: 72,
    height: 72,
    background: 'rgba(244, 67, 54, 0.1)',
    borderRadius: '50%',
    margin: '0 auto 20px',
  },
  iconWrapSuccess: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    width: 96,
    height: 96,
    background: 'rgba(76, 175, 80, 0.1)',
    borderRadius: '50%',
    margin: '0 auto 24px',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 12px',
    textAlign: 'center',
    color: 'var(--text)',
  },
  description: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text2)',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text2)',
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: 15,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  submitBtn: {
    background: '#F44336',
    border: 'none',
    color: '#fff',
    padding: '14px',
    borderRadius: '10px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    marginTop: '8px',
  },
  homeBtn: {
    background: '#29B6F6',
    border: 'none',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '16px',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorBox: {
    background: 'rgba(244, 67, 54, 0.1)',
    color: '#F44336',
    borderRadius: '10px',
    padding: '12px',
    fontSize: 14,
    marginBottom: 20,
    border: '1px solid rgba(244, 67, 54, 0.2)',
  },
};
