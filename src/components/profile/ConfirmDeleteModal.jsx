import React from 'react';
import ModalShell from './ModalShell';

/** Hisobni o'chirishni tasdiqlash */
export default function ConfirmDeleteModal({ deleting, onConfirm, onClose }) {
  return (
    <ModalShell onClose={onClose} maxWidth={400} style={{ textAlign: 'center', padding: '28px 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
      <div className="pp-modal-title" style={{ marginBottom: 10, fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>Hisobni o'chirish</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
        Rostdan ham hisobingizni o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi. Barcha ballaringiz, obunangiz va statistikangiz butunlay o'chib ketadi.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onConfirm}
          disabled={deleting}
          style={{
            padding: '13px', borderRadius: 12, background: 'var(--red)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'opacity 0.2s', opacity: deleting ? 0.7 : 1
          }}
        >
          {deleting ? "O'chirilmoqda..." : "Ha, hisobimni o'chirish"}
        </button>
        <button
          onClick={onClose}
          disabled={deleting}
          style={{
            padding: '12px', borderRadius: 12, background: 'transparent', color: 'var(--text)',
            border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s'
          }}
        >
          Bekor qilish
        </button>
      </div>
    </ModalShell>
  );
}
