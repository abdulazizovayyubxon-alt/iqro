import React from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import SettingsSheet from '../shared/SettingsSheet';

/**
 * Chiqishni tasdiqlash — foydalanuvchini qolishga undaydi.
 *
 * ⚠️ 2026-08-29: ilgari 44px o'lchamdagi 🧠 emoji bilan ochilardi. Boshqa
 * birorta oynada emoji yo'q, shuning uchun bu bittasi butunlay boshqa
 * ilovadan kelgandek ko'rinardi. Endi ikonka plitkasi — ActionSheet bilan
 * bir xil til.
 *
 * Tugmalar tartibi ATAYLAB shunday: "Qolaman" to'ldirilgan (asosiy),
 * "Chiqish" esa faqat chegarali — bexosdan chiqib ketish qiyinlashadi.
 */
export default function ConfirmLogoutModal({ onLogout, onClose }) {
  const { t } = useTranslation();
  return (
    <SettingsSheet
      icon={<LogOut size={20} />}
      tone="muted"
      title={t('settings.logout')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ss-btn is-cta" onClick={onClose}>
            {t('modals.logoutStay')}
          </button>
          <button type="button" className="ss-btn is-danger" onClick={onLogout}>
            {t('modals.logoutBtn')}
          </button>
        </>
      }
    >
      <div className="ss-hero">
        <div className="ss-hero-icon is-muted">
          <LogOut size={30} />
        </div>
        <div className="ss-hero-title">{t('modals.logoutTitle')}</div>
        <p className="ss-hero-text">{t('modals.logoutText')}</p>
      </div>
    </SettingsSheet>
  );
}
