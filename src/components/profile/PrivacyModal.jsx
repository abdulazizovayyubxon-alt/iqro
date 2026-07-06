import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import ModalShell from './ModalShell';

/** Maxfiylik siyosati (statik matn) */
export default function PrivacyModal({ onClose }) {
  const { t } = useTranslation();
  const p2List = t('modals.privacyP2List', { returnObjects: true });
  const p3List = t('modals.privacyP3List', { returnObjects: true });
  return (
    <ModalShell onClose={onClose} maxWidth={500} style={{ padding: '24px' }}>
      <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={22} style={{ color: 'var(--blue)' }} /> {t('modals.privacyTitle')}
      </div>
      <div style={{
        maxHeight: '320px',
        overflowY: 'auto',
        fontSize: '13px',
        lineHeight: '1.6',
        color: 'var(--text2)',
        margin: '16px 0',
        paddingRight: '8px',
        borderBottom: '1px solid var(--border)'
      }} className="pp-policy-scroll">
        <p style={{ marginBottom: '12px' }}><strong>{t('modals.privacyP1Title')}</strong><br />
          {t('modals.privacyP1Body')}</p>

        <p style={{ marginBottom: '12px' }}><strong>{t('modals.privacyP2Title')}</strong><br />
          {t('modals.privacyP2Body')}
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          {p2List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <p style={{ marginBottom: '12px' }}><strong>{t('modals.privacyP3Title')}</strong><br />
          {t('modals.privacyP3Body')}
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          {p3List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <p style={{ marginBottom: '12px' }}><strong>{t('modals.privacyP4Title')}</strong><br />
          {t('modals.privacyP4Body')}</p>

        <p style={{ marginBottom: '12px' }}><strong>{t('modals.privacyP5Title')}</strong><br />
          {t('modals.privacyP5Body')}</p>

        <p style={{ marginBottom: '12px' }}>
          <a href="/privacy" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
            {t('modals.privacyFullLink')}
          </a>
        </p>
      </div>
      <button
        onClick={onClose}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          background: 'var(--blue)',
          color: '#fff',
          border: 'none',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'opacity 0.2s'
        }}
      >
        {t('modals.understood')}
      </button>
    </ModalShell>
  );
}
