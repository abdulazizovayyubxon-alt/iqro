import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { EXAM_DATE_KEY } from '../utils/examDate';
import { useModalBackButton } from './profile/useModalBackButton';

/**
 * ExamDateModal — foydalanuvchining shaxsiy imtihon sanasini belgilash.
 *
 * Ilgari faqat Header ichida edi, shuning uchun mobil foydalanuvchi (headerda
 * sanoq `hide-mobile`) sanasini umuman kirita olmasdi. Endi umumiy komponent:
 * Header ham, Dashboard'dagi «sanani belgilang» taklifi ham shuni ochadi.
 *
 * props:
 *   open      — ochiqmi
 *   initialDays — modal ochilganda kunlar maydonining boshlang'ich qiymati
 *   onClose   — yopish
 *   onSaved   — saqlangach (sanoqni yangilash uchun)
 */
const ExamDateModal = ({ open, initialDays = '', onClose, onSaved }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [days, setDays] = useState(initialDays === null ? '' : String(initialDays ?? ''));
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useModalBackButton(open, onClose);

  if (!open) return null;

  const handleSave = async () => {
    let target = null;
    if (date) {
      target = new Date(date);
    } else if (days !== '') {
      const n = parseInt(days, 10);
      if (!isNaN(n) && n >= 0) target = new Date(Date.now() + n * 86400000);
    }
    if (!target || isNaN(target.getTime())) { onClose(); return; }

    setSaving(true);
    try {
      localStorage.setItem(EXAM_DATE_KEY, target.toISOString());
      // yyyy-mm-dd — profil formasi shu ko'rinishni o'qiydi
      const dateStr = target.toISOString().split('T')[0];
      localStorage.setItem('iqro_exam_date', dateStr);
      // Qurilmalar orasida sinxron bo'lishi uchun Firestore'ga ham
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), { examDate: dateStr }, { merge: true });
        } catch (e) {
          console.warn('Exam date Firestore saqlash xatosi:', e);
        }
      }
      onSaved?.();
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-title">
          <Calendar size={22} style={{ color: 'var(--blue)' }} /> {t('header.examModal.title')}
        </div>
        <div className="modal-text">{t('header.examModal.text')}</div>

        <div className="flex-col-gap-16" style={{ marginBottom: '24px' }}>
          <div>
            <label className="input-label-sm">{t('header.examModal.daysLabel')}</label>
            <input
              type="number"
              className="modal-input"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder={t('header.examModal.daysPlaceholder')}
              min="1"
              max="1000"
            />
          </div>

          <div className="text-center-or">{t('header.examModal.or')}</div>

          <div>
            <label className="input-label-sm">{t('header.examModal.dateLabel')}</label>
            <input
              type="date"
              className="modal-input"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (e.target.value) {
                  const diff = new Date(e.target.value) - new Date();
                  setDays(String(Math.max(0, Math.floor(diff / 86400000))));
                }
              }}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamDateModal;
