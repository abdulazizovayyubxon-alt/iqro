import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import ModalShell from './ModalShell';

/** Parolni o'zgartirish — barcha forma holati shu komponent ichida */
export default function PasswordModal({ changePassword, showToast, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPassError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== newPassword2) {
      setPassError("Parollar mos kelmadi");
      return;
    }
    setChangingPass(true);
    setPassError('');
    const result = await changePassword(newPassword);
    setChangingPass(false);

    if (result.success) {
      showToast('Parol muvaffaqiyatli o\'zgartirildi! ✅', 'success');
      onClose();
    } else {
      switch (result.error) {
        case 'weak_password':
          setPassError("Parol juda zaif. Kamida 6 ta belgi kiriting.");
          break;
        case 'requires_recent_login':
          setPassError("Xavfsizlik uchun qaytadan kiring (Telegram orqali), keyin parolni o'zgartiring.");
          break;
        default:
          setPassError("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      }
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={420} style={{ padding: '28px 24px' }}>
      <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <KeyRound size={22} style={{ color: 'var(--purple)' }} /> Parolni o'zgartirish
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20 }}>
        Yangi parolingizni kiriting. Keyingi safar telefon raqam orqali kirganda shu paroldan foydalanasiz.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
            YANGI PAROL
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNewPass ? 'text' : 'password'}
              value={newPassword}
              onChange={e => { setPassError(''); setNewPassword(e.target.value); }}
              placeholder="Kamida 6 ta belgi"
              style={{
                width: '100%', padding: '13px 48px 13px 16px', fontSize: 15, borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowNewPass(p => !p)}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
            PAROLNI TAKRORLANG
          </label>
          <input
            type={showNewPass ? 'text' : 'password'}
            value={newPassword2}
            onChange={e => { setPassError(''); setNewPassword2(e.target.value); }}
            placeholder="Yana bir bor kiriting"
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            style={{
              width: '100%', padding: '13px 16px', fontSize: 15, borderRadius: 12,
              border: '1.5px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {passError && (
          <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500, margin: 0 }}>{passError}</p>
        )}
      </div>

      <div className="pp-modal-actions" style={{ marginTop: 20 }}>
        <button className="pp-btn-cancel" onClick={onClose}>Bekor</button>
        <button
          onClick={handleChangePassword}
          disabled={changingPass}
          style={{
            padding: '12px 20px', borderRadius: 12, background: 'var(--purple)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 14, cursor: changingPass ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: changingPass ? 0.7 : 1, minWidth: 140,
          }}
        >
          {changingPass ? 'Saqlanmoqda...' : 'Saqlash ✅'}
        </button>
      </div>
    </ModalShell>
  );
}
