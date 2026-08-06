import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalA11y } from '../../hooks/useModalA11y';

/**
 * ObjectionModal — Savolga e'tiroz bildirish modali
 * Ishlatiladi: TestPage, ExamPage, SmartReviewPage
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - questionText: string
 *  - onSubmit: (text: string) => void
 */
const ObjectionModal = ({ isOpen, onClose, questionText, onSubmit }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const dialogRef = useModalA11y(isOpen, onClose); // T-10

  React.useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ objectionModalOpen: true }, '');
    
    // Store the latest onClose in a ref to avoid stale closures without needing it in deps
    const handlePopState = () => {
      onCloseRef.current();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.objectionModalOpen) {
        window.history.back();
      }
    };
  }, [isOpen]); // Removed onClose to prevent effect re-running on parent render

  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* T-10: Escape, fokus tutqichi va screen reader e'loni */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('objection.title')}
        tabIndex={-1}
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title">{t('objection.title')}</div>
        <div className="modal-text" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.5 }}>
          <strong>{t('objection.questionLabel')}</strong> {questionText}
        </div>
        <textarea
          className="modal-input"
          placeholder={t('objection.placeholder')}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>{t('objection.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{t('objection.submit')}</button>
        </div>
      </div>
    </div>
  );
};

export default ObjectionModal;
