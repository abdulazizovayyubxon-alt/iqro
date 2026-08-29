import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import SettingsSheet from '../shared/SettingsSheet';

/**
 * Maxfiylik siyosati (statik matn).
 *
 * ⚠️ 2026-08-29: matn ilgari `maxHeight: 320px` QOTIB QOLGAN qutida turardi —
 * telefon ekrani qanchalik katta bo'lsa ham siyosat kichkina darchada surilardi,
 * oynaning qolgan qismi esa bo'sh qolardi ("chala ochiladi"). Endi matn
 * qobiqning tanasida: oyna ekran imkoni qadar (88vh) ochiladi va surish
 * YAGONA joyda — `.ss-body` da bo'ladi.
 */
export default function PrivacyModal({ onClose }) {
  const { t } = useTranslation();
  const p2List = t('modals.privacyP2List', { returnObjects: true });
  const p3List = t('modals.privacyP3List', { returnObjects: true });

  return (
    <SettingsSheet
      icon={<Shield size={20} />}
      title={t('modals.privacyTitle')}
      sublabel={t('modals.privacySub')}
      onClose={onClose}
      footer={
        <>
          <a className="ss-btn" href="/privacy" target="_blank" rel="noopener noreferrer">
            {t('modals.privacyFullLink')}
          </a>
          <button type="button" className="ss-btn is-cta" onClick={onClose}>
            {t('common.close')}
          </button>
        </>
      }
    >
      <div className="ss-h">{t('modals.privacyP1Title')}</div>
      <p className="ss-p">{t('modals.privacyP1Body')}</p>

      <div className="ss-h">{t('modals.privacyP2Title')}</div>
      <p className="ss-p">{t('modals.privacyP2Body')}</p>
      <ul className="ss-ul">
        {p2List.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <div className="ss-h">{t('modals.privacyP3Title')}</div>
      <p className="ss-p">{t('modals.privacyP3Body')}</p>
      <ul className="ss-ul">
        {p3List.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <div className="ss-h">{t('modals.privacyP4Title')}</div>
      <p className="ss-p">{t('modals.privacyP4Body')}</p>

      <div className="ss-h">{t('modals.privacyP5Title')}</div>
      <p className="ss-p">{t('modals.privacyP5Body')}</p>
    </SettingsSheet>
  );
}
