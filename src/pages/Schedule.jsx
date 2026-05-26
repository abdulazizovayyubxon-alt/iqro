import React, { useState } from 'react';
import { SCHEDULE } from '../data/mockData';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PremiumModal from '../components/PremiumModal';

const Schedule = () => {
  const navigate = useNavigate();
  const goBack = () => navigate('/');
  const { user } = useAuth();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  if (!user?.isPremium) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh' }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '40px 28px', textAlign: 'center', maxWidth: 440, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>🔒</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.5px' }}>Premium Bo'lim</h2>
          <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28, fontWeight: 500 }}>
            Kunlik o'quv rejasi va batafsil jadval faqat Premium o'quvchilar uchun ochiq.
            Premiumga o'ting va tayyorgarlikni tizimli davom ettiring!
          </div>
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12, boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)' }}
            onClick={() => setShowPremiumModal(true)}
          >
            ⭐ Premium Rejimni Faollashtirish
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '13px', background: 'var(--glass-bg)', color: 'var(--text2)', border: '1px solid var(--glass-border)', borderRadius: 16, fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={goBack}
          >
            ← Bosh sahifaga
          </motion.button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  const today = new Date();
  const startDay = new Date('2026-05-02');
  const dayNum = Math.floor((today - startDay) / 86400000) + 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page" style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>
          📅 O'quv Rejasi
        </h1>
        <div style={{ fontSize: '14px', color: 'var(--text3)', fontWeight: 500 }}>
          Har kun 4 soatdan: 2 soat o'qish + 2 soat test
        </div>
      </div>
      
      <div className="alert alert-warning" style={{ marginBottom: '20px', borderRadius: 16, border: '1px solid rgba(245, 158, 11, 0.15)', background: 'rgba(245, 158, 11, 0.05)', color: '#B45309', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>⏰</span>
        <span>Imtihon: 13 may 2026 | Har kunlik maqsad: kamida 80 savol yechish</span>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: 20, border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
        <table className="schedule-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Kun</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Sana</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Mavzu</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Test soni</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Maqsad</th>
            </tr>
          </thead>
          <tbody>
            {SCHEDULE.map(s => {
              const isToday = dayNum === s.day;
              const isPast = dayNum > s.day;
              return (
                <tr key={s.day} style={{ background: isToday ? 'rgba(41, 182, 246, 0.08)' : 'transparent', borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`day-badge ${isToday ? 'active' : isPast ? 'done' : ''}`} style={{
                      display: 'inline-flex', width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                      fontWeight: 800, fontSize: 14,
                      background: isToday ? '#29B6F6' : isPast ? '#10B981' : 'var(--bg3)',
                      color: isToday || isPast ? '#fff' : 'var(--text3)',
                      boxShadow: isToday ? '0 4px 10px rgba(41, 182, 246, 0.2)' : isPast ? '0 4px 10px rgba(16, 185, 129, 0.15)' : 'none'
                    }}>
                      {s.day}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>{s.date}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.topic}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 800, color: '#29B6F6' }}>
                    {s.tests} ta
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{s.goal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Schedule;
