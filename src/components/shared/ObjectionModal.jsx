import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

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
  const [text, setText] = useState('');

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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">⚠️ E'tiroz bildirish</div>
        <div className="modal-text" style={{ fontSize: 13, lineHeight: 1.5 }}>
          <strong>Savol:</strong> {questionText}
        </div>
        <textarea
          className="modal-input"
          placeholder="Muammo yoki xatolikni tushuntiring..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Bekor</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Yuborish</button>
        </div>
      </div>
    </div>
  );
};

export default ObjectionModal;
