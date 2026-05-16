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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
        <div className="glass-panel" style={{ maxWidth: 500, margin: '60px auto', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Premium Funksiya</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
            Bu bo'lim faqat Premium foydalanuvchilar uchun ochiq.
            Premium rejimni faollashtiring va barcha imkoniyatlardan foydalaning!
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowPremiumModal(true)}>
            ⭐ Premium Rejimni Faollashtirish
          </button>
          <button className="btn btn-outline" onClick={goBack}>← Bosh sahifaga</button>
        </div>
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      </motion.div>
    );
  }

  const today = new Date();
  const startDay = new Date('2026-05-02');
  const dayNum = Math.floor((today - startDay) / 86400000) + 1;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page">
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', color: 'var(--accent2)', marginBottom: '4px' }}>
          11 Kunlik O'quv Rejasi
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
          Har kun 4 soatdan: 2 soat o'qish + 2 soat test
        </div>
      </div>
      
      <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
        ⏰ Imtihon: 13 may 2026 | Har kunlik maqsad: kamida 80 savol yechish
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Kun</th>
              <th>Sana</th>
              <th>Mavzu</th>
              <th>Test soni</th>
              <th>Maqsad</th>
            </tr>
          </thead>
          <tbody>
            {SCHEDULE.map(s => {
              const isToday = dayNum === s.day;
              const isPast = dayNum > s.day;
              return (
                <tr key={s.day} className={isToday ? 'active-row' : ''}>
                  <td>
                    <span className={`day-badge ${isToday ? 'active' : isPast ? 'done' : ''}`}>
                      {s.day}
                    </span>
                  </td>
                  <td>{s.date}</td>
                  <td>{s.topic}</td>
                  <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent)' }}>
                    {s.tests} ta
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text3)' }}>{s.goal}</td>
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
