/**
 * ActionSheet — "kechiktirsa bo'ladigan majburiy e'tibor" oynasi.
 *
 * Tizim boshlaydigan, bitta aniq harakati bor va foydalanuvchi keyinga
 * surishi mumkin bo'lgan xabarlar uchun YAGONA ko'rinish. Kim, qachon va
 * qaysi navbatda ko'rsatilishini InterruptHost hal qiladi — bu komponent
 * faqat chizadi.
 *
 * Uslub SmartBottomSheet bilan bir xil (tanish naqsh), balandligi kontentga
 * qarab ~ekranning yarmi. Yopish ✕ yuqori o'ng burchakda.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useModalA11y from '../../hooks/useModalA11y';

const CSS = `
@keyframes as_spin { to { transform: rotate(360deg); } }
`;

export default function ActionSheet({
  open,
  icon: Icon,
  title,
  body,
  primaryLabel,
  busyLabel,
  secondaryLabel,
  busy = false,
  onPrimary,
  onDismiss,
}) {
  const { t } = useTranslation();
  // Harakat bajarilayotganda Escape/tashqi bosish oynani yopmasin
  const ref = useModalA11y(open, busy ? () => {} : onDismiss);

  return (
    <>
      <style>{CSS}</style>

      {/* ⚠️ AnimatePresence bolalari TO'G'RIDAN-TO'G'RI motion elementlar bo'lishi
          va HAR BIRIDA `key` turishi SHART. Ilgari ikkalasi bitta Fragment ichida
          kalitsiz edi — chiqish animatsiyasi tugagach AnimatePresence ularni
          DOM'dan OLIB TASHLAMASDI. Natijada yopilgan oynaning overlay'i
          `opacity:0` bilan ekranda qolib, BUTUN ILOVANI bosib bo'lmay qolardi. */}
      <AnimatePresence>
        {open && (
          /* Overlay */
          <motion.div
            key="as-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onDismiss}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)', zIndex: 1000,
            }}
          />
        )}

        {open && (
          /* Oyna */
          <motion.div
            key="as-sheet"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', bottom: 0, left: '50%', width: '100%', maxWidth: '700px',
              background: 'var(--bg2)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              border: '1px solid var(--glass-border)', borderBottom: 'none',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', zIndex: 1001,
              display: 'flex', flexDirection: 'column',
              // Kontent qisqa — qat'iy 50vh bo'lsa yarmi bo'sh turadi. minHeight
              // oynaga "jiddiy" hajm beradi, kontent undan oshsa o'zi kengayadi.
              minHeight: '44vh', maxHeight: '86vh', overflowY: 'auto',
              padding: '10px 22px calc(22px + env(safe-area-inset-bottom))',
              outline: 'none',
            }}
          >
            {/* Tortish chizig'i */}
            <div style={{
              width: 40, height: 4, borderRadius: 99, background: 'var(--border)',
              margin: '0 auto 4px', flexShrink: 0,
            }} />

            {/* Yopish — yuqori o'ng burchak */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                onClick={onDismiss}
                disabled={busy}
                aria-label={t('common.close')}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text2)', cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.4 : 1,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Markaziy blok */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center', gap: 14, padding: '10px 0 26px',
            }}>
              <span style={{
                width: 64, height: 64, borderRadius: 20, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--blue-bg)', color: 'var(--accent)',
              }}>
                <Icon size={30} strokeWidth={2} />
              </span>

              <h3 style={{
                fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--text)',
                margin: 0, letterSpacing: '-0.01em',
              }}>
                {title}
              </h3>

              <p style={{
                fontSize: 'var(--fs-base)', color: 'var(--text2)', margin: 0,
                lineHeight: 1.55, maxWidth: 420,
              }}>
                {body}
              </p>
            </div>

            {/* Tugmalar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <button
                onClick={onPrimary}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  width: '100%', minHeight: 52, borderRadius: 15, border: 'none',
                  background: 'var(--cta)', color: '#fff',
                  fontFamily: 'inherit', fontSize: 'var(--fs-lg)', fontWeight: 800,
                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
                  transition: 'opacity 0.18s',
                }}
              >
                <Icon
                  size={17}
                  style={busy ? { animation: 'as_spin 0.9s linear infinite' } : undefined}
                />
                {busy ? (busyLabel || primaryLabel) : primaryLabel}
              </button>

              <button
                onClick={onDismiss}
                disabled={busy}
                style={{
                  width: '100%', minHeight: 44, borderRadius: 15,
                  background: 'none', border: 'none', color: 'var(--text3)',
                  fontFamily: 'inherit', fontSize: 'var(--fs-md)', fontWeight: 700,
                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1,
                }}
              >
                {secondaryLabel || t('interrupts.later')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
