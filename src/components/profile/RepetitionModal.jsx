import React from 'react';
import { Brain } from 'lucide-react';
import ModalShell from './ModalShell';

/** Aqlli takrorlash chastotasi (0/10/30/50%) */
export default function RepetitionModal({ value, onChange, onClose }) {
  return (
    <ModalShell onClose={onClose} maxWidth={420} style={{ padding: '28px 24px' }}>
      <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Brain size={22} style={{ color: 'var(--accent)' }} /> Aqlli takrorlash chastotasi
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20 }}>
        Xato qilingan savollar keyingi testlarda qanchalik tez-tez qaytishini tanlang.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {[
          { label: "O'chiq\n(0%)", value: 0 },
          { label: "Kam\n(10%)", value: 10 },
          { label: "O'rtacha\n(30%)", value: 30 },
          { label: "Tez\n(50%)", value: 50 }
        ].map(opt => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: '8px 4px', borderRadius: '10px',
                border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border)',
                background: isSelected ? 'var(--blue-bg)' : 'var(--bg2)',
                color: isSelected ? 'var(--blue)' : 'var(--text)',
                fontSize: '11px', fontWeight: isSelected ? '800' : '500',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'pre-line',
                textAlign: 'center', display: 'flex', alignItems: 'center',
                justifyContent: 'center', lineHeight: '1.2', minHeight: '48px',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <small style={{ display: 'block', marginTop: '10px', color: 'var(--text3)', fontSize: '11px', lineHeight: '1.4' }}>
        Tavsiya etiladi: 10%. Tanlov darhol saqlanadi.
      </small>

      <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '20px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Yopish
      </button>
    </ModalShell>
  );
}
