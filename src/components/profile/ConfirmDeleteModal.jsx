import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Lock, Trash2, LogOut, LifeBuoy } from 'lucide-react';
import SettingsSheet from '../shared/SettingsSheet';

/**
 * Hisobni o'chirishni tasdiqlash — UCH BOSQICHLI oqim.
 *
 * NEGA shunday: hisobni o'chirish QAYTARILMAS amal. Ilgari bu bitta qizil tugma
 * edi — tasodifan bosilsa yoki telefon boshqa odam qo'lida ochiq qolsa, butun
 * statistika, obuna va natijalar bir bosishda yo'q bo'lardi.
 *
 * Yirik platformalar (Google, Apple, Meta) qo'llaydigan naqsh:
 *   1-bosqich  Nima yo'qolishini ANIQ ko'rsatish + xavfsizroq muqobillar
 *              (chiqish, yordamga murojaat) taklif qilish;
 *   2-bosqich  Shaxsni qayta tasdiqlash — parolni QAYTA kiritish;
 *   3-bosqich  Tasdiq so'zini QO'LDA yozish (tasodifiy bosishni imkonsiz qiladi).
 *
 * Google Play talabi buzilmaydi: o'chirish yo'li avvalgi joyida, ochiq va
 * to'siqsiz turibdi — faqat tasodifiy bajarilishdan himoyalangan.
 *
 * ⚠️ 2026-08-29: MANTIQQA TEGILMADI — bosqichlar, parol so'rash, tasdiq so'zi
 * va serverdagi tozalash avvalgidek. Faqat qobiq almashdi: fayl ilgari o'z
 * tugma uslublarini o'zi yasardi (ikkita lokal uslub obyekti) va 40 ta inline
 * uslub bor edi. Endi umumiy `ss-*` klasslari, bosqich ko'rsatkichi esa
 * sarlavha ostida ("1-bosqich · 3 tadan").
 */
const TOTAL_STEPS = 3;

export default function ConfirmDeleteModal({ deleting, onConfirm, onClose, isPremium, premiumExpire }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  // Tasdiq so'zi tarjima qilinadi — foydalanuvchi o'z tilida yozadi
  const CONFIRM_WORD = t('modals.deleteConfirmWord');
  const typedOk = typed.trim().toLocaleUpperCase() === CONFIRM_WORD.toLocaleUpperCase();

  const losses = [
    t('modals.deleteLoss1'),
    t('modals.deleteLoss2'),
    t('modals.deleteLoss3'),
    t('modals.deleteLoss4'),
  ];

  const handleFinal = async () => {
    setError('');
    const res = await onConfirm(password);
    // onConfirm xato kodini qaytaradi (parol noto'g'ri / qayta kirish kerak)
    if (res?.error === 'wrong_password') {
      setError(t('modals.deleteWrongPassword'));
      setStep(2);
    } else if (res?.error) {
      setError(t('modals.deleteFailed'));
    }
  };

  const stepTitle = step === 1
    ? t('modals.deleteTitle')
    : step === 2
      ? t('modals.deleteStep2Title')
      : t('modals.deleteStep3Title');

  const stepIcon = step === 2 ? <Lock size={20} /> : step === 3 ? <AlertTriangle size={20} /> : <Trash2 size={20} />;

  const footer = step === 1 ? (
    <>
      <button type="button" className="ss-btn is-cta" onClick={() => onClose()}>
        {t('modals.deleteKeepAccount')}
      </button>
      <button type="button" className="ss-btn is-danger" onClick={() => setStep(2)}>
        <Trash2 size={15} />
        {t('modals.deleteStep1Continue')}
      </button>
    </>
  ) : step === 2 ? (
    <>
      <button type="button" className="ss-btn" onClick={() => setStep(1)}>
        {t('modals.deleteBack')}
      </button>
      <button
        type="button"
        className="ss-btn is-danger-solid"
        disabled={password.length < 6}
        onClick={() => setStep(3)}
      >
        {t('modals.deleteStep2Continue')}
      </button>
    </>
  ) : (
    <>
      <button type="button" className="ss-btn" onClick={() => setStep(2)} disabled={deleting}>
        {t('modals.deleteBack')}
      </button>
      <button
        type="button"
        className="ss-btn is-danger-solid"
        disabled={!typedOk || deleting}
        onClick={handleFinal}
      >
        {deleting ? t('modals.deleting') : t('modals.deleteConfirm')}
      </button>
    </>
  );

  return (
    <SettingsSheet
      icon={stepIcon}
      tone={step === 1 ? 'muted' : 'red'}
      title={stepTitle}
      sublabel={t('modals.stepOf', { step, total: TOTAL_STEPS })}
      label={t('modals.deleteTitle')}
      // `busy` o'chirish jarayonida yopishni bloklaydi — natijani ko'rmay
      // qolmasin. Qobiq `onClose` ni argumentsiz chaqiradi, ya'ni `intent`
      // bo'lmaydi va sahifa shunchaki oynani yopadi.
      onClose={onClose}
      busy={deleting}
      footer={footer}
    >
      {/* Bosqich ko'rsatkichi — foydalanuvchi qayerdaligini bilsin */}
      <div className="ss-steps" aria-hidden="true">
        {[1, 2, 3].map(i => <i key={i} className={i <= step ? 'is-on' : ''} />)}
      </div>

      {/* ─── 1-BOSQICH: nima yo'qoladi ─── */}
      {step === 1 && (
        <>
          <p className="ss-p">{t('modals.deleteIntro')}</p>

          <div className="ss-block">
            <div className="ss-block-label">{t('modals.deleteLossTitle')}</div>
            <ul className="ss-ul">
              {losses.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>

          {/* Faol obuna ogohlantirishi — pul yo'qolishi eng og'ir oqibat */}
          {isPremium && (
            <div className="ss-warn">
              {premiumExpire
                ? t('modals.deletePremiumWarnDate', { date: new Date(premiumExpire).toLocaleDateString('uz-UZ') })
                : t('modals.deletePremiumWarn')}
            </div>
          )}

          <p className="ss-p ss-p--spaced">{t('modals.deleteAlternatives')}</p>

          {/* Xavfsizroq muqobillar — ATAYLAB tanada, pastki tugmalarda emas:
              pastda faqat ikkita asosiy yo'nalish turishi kerak. */}
          <div className="ss-alt-row">
            <button type="button" className="ss-btn ss-btn--sm" onClick={() => onClose('logout')}>
              <LogOut size={14} />
              {t('modals.deleteLogoutInstead')}
            </button>
            <button type="button" className="ss-btn ss-btn--sm" onClick={() => onClose('support')}>
              <LifeBuoy size={14} />
              {t('modals.deleteContactSupport')}
            </button>
          </div>
        </>
      )}

      {/* ─── 2-BOSQICH: parolni qayta kiritish ─── */}
      {step === 2 && (
        <>
          <p className="ss-p">{t('modals.deleteStep2Text')}</p>
          <div className="ss-block">
            <div className="pp-field">
              <label htmlFor="sp-del-pass">{t('modals.deletePasswordPlaceholder')}</label>
              <input
                id="sp-del-pass"
                type="password"
                autoComplete="current-password"
                placeholder={t('modals.deletePasswordPlaceholder')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
              />
            </div>
            {error && <div className="ss-note is-error" role="alert">{error}</div>}
          </div>
        </>
      )}

      {/* ─── 3-BOSQICH: tasdiq so'zini yozish ─── */}
      {step === 3 && (
        <>
          <p className="ss-p">{t('modals.deleteStep3Text')}</p>
          <div className="ss-block">
            <div className="ss-word">{CONFIRM_WORD}</div>
            <div className="pp-field">
              <input
                type="text"
                className="ss-input-center"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label={CONFIRM_WORD}
                placeholder={t('modals.deleteTypePlaceholder')}
                value={typed}
                onChange={(e) => { setTyped(e.target.value); setError(''); }}
              />
            </div>
            {error && <div className="ss-note is-error" role="alert">{error}</div>}
          </div>
        </>
      )}
    </SettingsSheet>
  );
}
