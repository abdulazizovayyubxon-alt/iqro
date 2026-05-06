import React from 'react';
import { SCHEDULE } from '../data/mockData';
import { motion } from 'framer-motion';

const Schedule = () => {
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
