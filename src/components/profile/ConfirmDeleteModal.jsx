import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Lock, Trash2, LogOut, LifeBuoy } from 'lucide-react';
import ModalShell from './ModalShell';

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
 */
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

  const btnPrimary = {
    padding: '13px', borderRadius: 12, border: 'none', fontWeight: 700,
    fontSize: 'var(--fs-base)', cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  };
  const btnGhost = {
    padding: '12px', borderRadius: 12, background: 'transparent', color: 'var(--text)',
    border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 'var(--fs-md)',
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  };

  return (
    <ModalShell
      onClose={deleting ? () => {} : onClose}
      maxWidth={440}
      label={t('modals.deleteTitle')}
      style={{ padding: '26px 24px' }}
    >
      {/* Bosqich ko'rsatkichi — foydalanuvchi qayerdaligini bilsin */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'var(--red)' : 'var(--border)',
            transition: 'background 0.25s',
          }} />
        ))}
      </div>

      {/* ─── 1-BOSQICH: nima yo'qoladi ─── */}
      {step === 1 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={26} style={{ color: 'var(--red)', flexShrink: 0 }} />
            <div className="pp-modal-title" style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--red)', margin: 0 }}>
              {t('modals.deleteTitle')}
            </div>
          </div>

          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
            {t('modals.deleteIntro')}
          </p>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {t('modals.deleteLossTitle')}
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {losses.map((line, i) => (
                <li key={i} style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5 }}>{line}</li>
              ))}
            </ul>
          </div>

          {/* Faol obuna ogohlantirishi — pul yo'qolishi eng og'ir oqibat */}
          {isPremium && (
            <div style={{
              background: 'color-mix(in srgb, var(--red) 10%, transparent)',
              border: '1px solid var(--red)', borderRadius: 12, padding: '12px 14px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 'var(--fs-md)', color: 'var(--red)', fontWeight: 700, lineHeight: 1.5 }}>
                {premiumExpire
                  ? t('modals.deletePremiumWarnDate', { date: new Date(premiumExpire).toLocaleDateString('uz-UZ') })
                  : t('modals.deletePremiumWarn')}
              </div>
            </div>
          )}

          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', lineHeight: 1.55, marginBottom: 18 }}>
            {t('modals.deleteAlternatives')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ ...btnPrimary, background: 'transparent', color: 'var(--red)', border: '1.5px solid var(--red)' }}>
              <Trash2 size={15} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
              {t('modals.deleteStep1Continue')}
            </button>
            <button onClick={onClose} style={{ ...btnPrimary, background: 'var(--cta)', color: '#fff' }}>
              {t('modals.deleteKeepAccount')}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onClose('logout')} style={{ ...btnGhost, fontSize: 'var(--fs-sm)' }}>
                <LogOut size={14} style={{ verticalAlign: '-2px', marginInlineEnd: 5 }} />
                {t('modals.deleteLogoutInstead')}
              </button>
              <button onClick={() => onClose('support')} style={{ ...btnGhost, fontSize: 'var(--fs-sm)' }}>
                <LifeBuoy size={14} style={{ verticalAlign: '-2px', marginInlineEnd: 5 }} />
                {t('modals.deleteContactSupport')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── 2-BOSQICH: parolni qayta kiritish ─── */}
      {step === 2 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Lock size={24} style={{ color: 'var(--text2)', flexShrink: 0 }} />
            <div className="pp-modal-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, margin: 0 }}>
              {t('modals.deleteStep2Title')}
            </div>
          </div>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', lineHeight: 1.6, marginBottom: 16 }}>
            {t('modals.deleteStep2Text')}
          </p>

          <input
            type="password"
            className="modal-input"
            autoComplete="current-password"
            placeholder={t('modals.deletePasswordPlaceholder')}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={{ width: '100%', marginBottom: error ? 8 : 18 }}
          />
          {error && (
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              disabled={password.length < 6}
              onClick={() => setStep(3)}
              style={{
                ...btnPrimary,
                background: password.length < 6 ? 'var(--border)' : 'var(--red)',
                color: password.length < 6 ? 'var(--text3)' : '#fff',
                cursor: password.length < 6 ? 'not-allowed' : 'pointer',
              }}
            >
              {t('modals.deleteStep2Continue')}
            </button>
            <button onClick={() => setStep(1)} style={btnGhost}>{t('modals.deleteBack')}</button>
          </div>
        </>
      )}

      {/* ─── 3-BOSQICH: tasdiq so'zini yozish ─── */}
      {step === 3 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={24} style={{ color: 'var(--red)', flexShrink: 0 }} />
            <div className="pp-modal-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--red)', margin: 0 }}>
              {t('modals.deleteStep3Title')}
            </div>
          </div>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
            {t('modals.deleteStep3Text')}
          </p>

          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '10px 14px', marginBottom: 10, textAlign: 'center',
            fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text)', fontSize: 'var(--fs-lg)',
            userSelect: 'none',
          }}>
            {CONFIRM_WORD}
          </div>

          <input
            type="text"
            className="modal-input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t('modals.deleteTypePlaceholder')}
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setError(''); }}
            style={{ width: '100%', marginBottom: error ? 8 : 18, textAlign: 'center', letterSpacing: '0.08em', fontWeight: 700 }}
          />
          {error && (
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              disabled={!typedOk || deleting}
              onClick={handleFinal}
              style={{
                ...btnPrimary,
                background: !typedOk || deleting ? 'var(--border)' : 'var(--red)',
                color: !typedOk || deleting ? 'var(--text3)' : '#fff',
                cursor: !typedOk || deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? t('modals.deleting') : t('modals.deleteConfirm')}
            </button>
            <button onClick={() => setStep(2)} disabled={deleting} style={btnGhost}>{t('modals.deleteBack')}</button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
