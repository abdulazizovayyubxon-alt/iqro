import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from './ModalShell';

/** Hisobni o'chirishni tasdiqlash */
export default function ConfirmDeleteModal({ deleting, onConfirm, onClose }) {
  const { t } = useTranslation();
  return (
    <ModalShell onClose={onClose} maxWidth={400} style={{ textAlign: 'center', padding: '28px 24px' }}>
      <div style={{ fontSize: 'var(--fs-11xl)', marginBottom: 12 }}>🗑️</div>
      <div className="pp-modal-title" style={{ marginBottom: 10, fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--red)' }}>{t('modals.deleteTitle')}</div>
      <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
        {t('modals.deleteText')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onConfirm}
          disabled={deleting}
          style={{
            padding: '13px', borderRadius: 12, background: 'var(--red)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 'var(--fs-base)', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'opacity 0.2s', opacity: deleting ? 0.7 : 1
          }}
        >
          {deleting ? t('modals.deleting') : t('modals.deleteConfirm')}
        </button>
        <button
          onClick={onClose}
          disabled={deleting}
          style={{
            padding: '12px', borderRadius: 12, background: 'transparent', color: 'var(--text)',
            border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 'var(--fs-md)', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s'
          }}
        >
          {t('modals.cancel')}
        </button>
      </div>
    </ModalShell>
  );
}
