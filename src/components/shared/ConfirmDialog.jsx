import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * ConfirmDialog — window.confirm o'rnini bosuvchi yagona tasdiq oynasi.
 * Faqat UI-qatlam: qaror callbacklarga (onConfirm/onCancel) qaytariladi,
 * biznes mantiq chaqiruvchi tomonda qoladi. Uslub — TestPage/ExamPage'dagi
 * mavjud chiqish-tasdig'i modallari bilan bir xil.
 */
export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel"
        style={{ padding: 24, maxWidth: 340, width: '90%', borderRadius: 20, textAlign: 'center', background: 'var(--bg2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: text ? 8 : 20, color: 'var(--text)', lineHeight: 1.4 }}>{title}</h3>
        {text && <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>{text}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={onCancel}>
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            className="btn"
            style={{ flex: 1, padding: '12px', background: danger ? 'var(--red)' : 'var(--cta)', color: '#fff', border: 'none', fontWeight: 700 }}
            onClick={onConfirm}
          >
            {confirmLabel || t('common.yes')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
