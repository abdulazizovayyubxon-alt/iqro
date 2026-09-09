import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

/**
 * ConfirmDialog — window.confirm o'rnini bosuvchi yagona tasdiq oynasi.
 * Faqat UI-qatlam: qaror callbacklarga (onConfirm/onCancel) qaytariladi,
 * biznes mantiq chaqiruvchi tomonda qoladi. Uslub — TestPage/ExamPage'dagi
 * mavjud chiqish-tasdig'i modallari bilan bir xil.
 *
 * ⚠️ 2026-09-09 — uchta IXTIYORIY imkoniyat qo'shildi (barchasi orqaga mos,
 * mavjud 8 ta chaqiruv o'zgarishsiz ishlaydi):
 *   · `children` — matn ostiga qo'shimcha maydon (masalan, sabab tanlagichi);
 *   · `busy`     — server javobini kutish holati: tugmalar bloklanadi,
 *                  tasdiq tugmasida aylanma ko'rsatkich chiqadi;
 *   · `maxWidth` — uzunroq ogohlantirish matni sig'ishi uchun.
 *
 * `busy` NEGA KERAK: bu oyna QAYTARILMAS amallarni tasdiqlaydi. Kutish
 * holatisiz hamkor tugmani ikki marta bosardi — ikkinchi so'rov serverdagi
 * `already_removed` ga urilib, muvaffaqiyatli amaldan keyin QIZIL xato
 * ko'rsatardi.
 */
export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  maxWidth = 340,
  children = null,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  // Escape bilan yopish + fokus tutqichi + fokusni qaytarish (T-10).
  // Escape "bekor qilish" bilan bir xil — bu tasdiq oynasi uchun xavfsiz standart.
  //
  // `busy` paytida yopilish TO'SILADI: server javobi yo'lda turganda oynani
  // yopsak, hamkor amal bekor qilindi deb o'ylardi — holbuki u bajarilgan
  // bo'lardi (yozuv allaqachon ketgan).
  const guardedCancel = useCallback(() => {
    if (busy) return;
    onCancel?.();
  }, [busy, onCancel]);

  const dialogRef = useModalA11y(open, guardedCancel);
  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={guardedCancel}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || t('common.yes')}
        aria-busy={busy || undefined}
        tabIndex={-1}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel"
        style={{ padding: 24, maxWidth, width: '90%', borderRadius: 20, textAlign: 'center', background: 'var(--bg2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, marginBottom: text ? 8 : 20, color: 'var(--text)', lineHeight: 1.4 }}>{title}</h3>
        {text && <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: children ? 16 : 20, lineHeight: 1.5 }}>{text}</p>}
        {children && <div style={{ marginBottom: 20, textAlign: 'left' }}>{children}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1, padding: '12px', opacity: busy ? 0.5 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
            onClick={guardedCancel}
            disabled={busy}
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            className="btn"
            style={{
              flex: 1, padding: '12px', background: danger ? 'var(--red)' : 'var(--cta)',
              color: '#fff', border: 'none', fontWeight: 700,
              opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <RefreshCw size={15} className="spin" aria-hidden="true" />}
            {confirmLabel || t('common.yes')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
