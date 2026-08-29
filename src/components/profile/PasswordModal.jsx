import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import SettingsSheet from '../shared/SettingsSheet';

/**
 * Parolni o'zgartirish — barcha forma holati shu komponent ichida.
 *
 * ⚠️ 2026-08-29: forma to'liq inline uslubda yozilgan edi, shuning uchun
 * maydonlar ilovaning boshqa formalaridan farq qilardi (boshqa balandlik,
 * boshqa fon) va "Saqlash" umumiy tugma klassidan foydalanmasdi. Endi
 * `pp-field` (profil formasi bilan bir xil) va `ss-btn` ishlatiladi.
 * Ko'z tugmasi ilgari faqat birinchi maydonda edi — endi ikkalasida ham.
 */
export default function PasswordModal({ changePassword, showToast, onClose }) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPassError(t('login.errPassword'));
      return;
    }
    if (newPassword !== newPassword2) {
      setPassError(t('modals.errMismatch'));
      return;
    }
    setChangingPass(true);
    setPassError('');
    const result = await changePassword(newPassword);
    setChangingPass(false);

    if (result.success) {
      showToast(t('modals.passSuccess'), 'success');
      onClose();
    } else {
      switch (result.error) {
        case 'weak_password':
          setPassError(t('modals.errWeak'));
          break;
        case 'requires_recent_login':
          setPassError(t('modals.errRecent'));
          break;
        default:
          setPassError(t('modals.errGeneric'));
      }
    }
  };

  // ATAYLAB komponent EMAS, balki JSX qaytaruvchi funksiya: render ichida
  // e'lon qilingan komponent har renderda YANGI tur bo'lib, React uni
  // qayta o'rnatadi (fokus sakraydi).
  const eyeBtn = () => (
    <button
      type="button"
      className="ss-eye"
      onClick={() => setShowNewPass(p => !p)}
      aria-label={t(showNewPass ? 'modals.passHide' : 'modals.passShow')}
    >
      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <SettingsSheet
      icon={<KeyRound size={20} />}
      title={t('modals.passTitle')}
      sublabel={t('modals.passHint')}
      onClose={onClose}
      busy={changingPass}
      footer={
        <>
          <button type="button" className="ss-btn" onClick={onClose} disabled={changingPass}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="ss-btn is-cta"
            onClick={handleChangePassword}
            disabled={changingPass}
          >
            {changingPass ? t('modals.passSaving') : t('modals.passSave')}
          </button>
        </>
      }
    >
      <p className="ss-p">{t('modals.passDesc')}</p>

      <div className="ss-block">
        <div className="pp-field">
          <label htmlFor="sp-pass-new">{t('modals.passNewLabel')}</label>
          <div className="ss-input-wrap">
            <input
              id="sp-pass-new"
              type={showNewPass ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={e => { setPassError(''); setNewPassword(e.target.value); }}
              placeholder={t('modals.passNewPh')}
            />
            {eyeBtn()}
          </div>
        </div>

        <div className="pp-field">
          <label htmlFor="sp-pass-repeat">{t('modals.passRepeatLabel')}</label>
          <div className="ss-input-wrap">
            <input
              id="sp-pass-repeat"
              type={showNewPass ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword2}
              onChange={e => { setPassError(''); setNewPassword2(e.target.value); }}
              placeholder={t('modals.passRepeatPh')}
              onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            />
            {eyeBtn()}
          </div>
        </div>

        {/* Xato maydonlar OSTIDA va o'qish dasturiga e'lon qilinadi */}
        {passError && (
          <div className="ss-note is-error" role="alert">{passError}</div>
        )}
      </div>
    </SettingsSheet>
  );
}
