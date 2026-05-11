import React from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Shield, ChevronRight, X } from 'lucide-react';

const PremiumModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px', padding: '30px',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.1)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '150px', height: '150px', background: 'rgba(251, 191, 36, 0.2)',
          filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none'
        }} />

        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '15px', right: '15px',
            background: 'none', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', padding: '5px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(251, 191, 36, 0.1)', border: '2px solid rgba(251, 191, 36, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'var(--amber)'
          }}>
            <Crown size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            Premium Rejim
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.5' }}>
            Ushbu bo'lim faqat Premium foydalanuvchilar uchun ochiq. Barcha imkoniyatlardan foydalanish uchun Premium xarid qiling!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
          {[
            "Barcha mavzular ochiq bo'ladi",
            "Imtihon simulyatsiyasi",
            "Reklamasiz va to'siqlarsiz o'qish",
            "Cheklanmagan Aqlli takrorlash"
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text)' }}>
              <CheckCircle size={18} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>{text}</span>
            </div>
          ))}
        </div>

        <button 
          className="btn"
          onClick={() => window.open('https://t.me/admin_username_here', '_blank')}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px',
            background: 'linear-gradient(to right, #0088cc, #0099e6)',
            color: '#fff', fontWeight: 'bold', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 136, 204, 0.3)'
          }}
        >
          <Zap size={20} />
          Telegram orqali ulanish (Admin)
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text3)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Shield size={14} /> Xavfsiz to'lov tizimi orqali
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumModal;
