import React from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ModalShell from './ModalShell';

/** Kundalik eslatma (Telegram bot) sozlamasi */
export default function TelegramReminderModal({ user, enabled, updateState, showToast, onClose }) {
  const { t } = useTranslation();
  const telegramCode = `IQRO-${user.uid.substring(0, 8).toUpperCase()}`;

  const handleToggle = async () => {
    const newState = !enabled;
    updateState({ telegramEnabled: newState });
    try {
      await setDoc(doc(db, 'users', user.uid), {
        telegramEnabled: newState,
        telegramCode
      }, { merge: true });
      showToast(newState ? t('modals.tgEnabledToast') : t('modals.tgDisabledToast'), "success");
    } catch (e) {
      showToast(t('modals.tgSyncError'), "error");
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={440} style={{ padding: '24px' }}>
      <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
        <Send size={22} style={{ color: 'var(--accent)' }} /> {t('modals.tgTitle')}
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('modals.tgDaily')}</span>
          <button
            onClick={handleToggle}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', position: 'relative', cursor: 'pointer',
              background: enabled ? 'var(--green)' : 'var(--border)', transition: '0.3s'
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
              left: enabled ? 24 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
          {t('modals.tgHintP1')} <a href="tg://resolve?domain=IQRO_testbot" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>@IQRO_testbot</a> {t('modals.tgHintP2')} <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: 4 }}>{telegramCode}</code> {t('modals.tgHintP3')}
        </div>
      </div>

      <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>
        {t('modals.close')}
      </button>
    </ModalShell>
  );
}
