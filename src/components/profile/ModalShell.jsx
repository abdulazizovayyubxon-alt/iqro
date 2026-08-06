import React from 'react';
import '../../pages/ProfilePage.css';
import { useModalA11y } from '../../hooks/useModalA11y';

/**
 * Umumiy modal qobiq: overlay bosilganda yopiladi, ichki bosish to'xtatiladi.
 *
 * ⚠️ AUDIT 2026-08-06, T-10 BAND — bu qobiqdan foydalanadigan 7 ta modal
 * (AvatarPicker, ConfirmDelete, ConfirmLogout, EditProfile, Password, Privacy,
 * Repetition) klaviatura bilan umuman boshqarilmasdi: Escape ishlamasdi, fokus
 * modal ortidagi sahifaga chiqib ketardi, screen reader oynani e'lon qilmasdi.
 * Qobiq umumiy bo'lgani uchun tuzatish shu yerda — bittada hammasi qoplanadi.
 *
 * `label` — screen reader uchun oyna nomi (aria-label). Berilmasa, oyna
 * "dialog" deb o'qiladi; iloji boricha chaqiruvchi tomondan bering.
 */
export default function ModalShell({ onClose, maxWidth = 420, style, label, children }) {
  const modalRef = useModalA11y(true, onClose);
  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="pp-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth, ...style }}
      >
        {children}
      </div>
    </div>
  );
}
