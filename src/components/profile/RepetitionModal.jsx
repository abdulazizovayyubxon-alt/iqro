import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import ModalShell from './ModalShell';

/** Aqlli takrorlash chastotasi (0/10/30/50%) */
export default function RepetitionModal({ value, onChange, onClose }) {
  const { t } = useTranslation();
  return (
    <ModalShell onClose={onClose} maxWidth={420} style={{ padding: '28px 24px' }}>
      <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Brain size={22} style={{ color: 'var(--accent)' }} /> {t('modals.repTitle')}
      </div>
      <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20 }}>
        {t('modals.repDesc')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {[
          { label: t('modals.repOff'), value: 0 },
          { label: t('modals.repLow'), value: 10 },
          { label: t('modals.repMid'), value: 30 },
          { label: t('modals.repHigh'), value: 50 }
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
                fontSize: 'var(--fs-xs)', fontWeight: isSelected ? '800' : '500',
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
      <small style={{ display: 'block', marginTop: '10px', color: 'var(--text3)', fontSize: 'var(--fs-xs)', lineHeight: '1.4' }}>
        {t('modals.repRecommend')}
      </small>

      <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '20px', cursor: 'pointer', fontFamily: 'inherit' }}>
        {t('modals.close')}
      </button>
    </ModalShell>
  );
}
