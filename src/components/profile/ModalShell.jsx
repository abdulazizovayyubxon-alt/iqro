import React from 'react';
import '../../pages/ProfilePage.css';

/** Umumiy modal qobiq: overlay bosilganda yopiladi, ichki bosish to'xtatiladi */
export default function ModalShell({ onClose, maxWidth = 420, style, children }) {
  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth, ...style }}>
        {children}
      </div>
    </div>
  );
}
