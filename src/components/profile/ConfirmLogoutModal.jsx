import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from './ModalShell';

/** Chiqishni tasdiqlash — foydalanuvchini qolishga undaydi */
export default function ConfirmLogoutModal({ onLogout, onClose }) {
  const { t } = useTranslation();
  return (
    <ModalShell onClose={onClose} maxWidth={400} style={{ textAlign: 'center', padding: '28px 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🧠</div>
      <div className="pp-modal-title" style={{ marginBottom: 10, fontSize: 18, fontWeight: 800 }}>{t('modals.logoutTitle')}</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
        {t('modals.logoutText')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            padding: '13px', borderRadius: 12, background: 'var(--blue)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'opacity 0.2s'
          }}
        >
          {t('modals.logoutStay')}
        </button>
        <button
          onClick={onLogout}
          style={{
            padding: '12px', borderRadius: 12, background: 'transparent', color: 'var(--red)',
            border: '1.5px solid var(--red)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s'
          }}
        >
          {t('modals.logoutBtn')}
        </button>
      </div>
    </ModalShell>
  );
}
