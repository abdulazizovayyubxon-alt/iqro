import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { EXAM_DATE_KEY } from '../utils/examDate';
import { useModalBackButton } from './profile/useModalBackButton';
import { useModalA11y } from '../hooks/useModalA11y';
import DateInput from './shared/DateInput';

const THIS_YEAR = new Date().getFullYear();

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
  const dialogRef = useModalA11y(open, onClose); // T-10

  if (!open) return null;

  const handleSave = async () => {
    let target = null;
    if (date) {
      // MAHALLIY yarim tun: `new Date('2026-09-10')` UTC deb o'qiladi va
      // Toshkent (+5) da sana bir kunga siljib ketardi
      target = new Date(`${date}T00:00:00`);
    } else if (days !== '') {
      const n = parseInt(days, 10);
      if (!isNaN(n) && n >= 0) target = new Date(Date.now() + n * 86400000);
    }
    if (!target || isNaN(target.getTime())) { onClose(); return; }

    setSaving(true);
    try {
      localStorage.setItem(EXAM_DATE_KEY, target.toISOString());
      // yyyy-mm-dd — profil formasi shu ko'rinishni o'qiydi.
      // toISOString() ISHLATILMAYDI: u UTC beradi, tunda (Toshkent 00:00–05:00)
      // sana bir kun oldingisiga siljib ketardi.
      const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
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
      {/* T-10: Escape, fokus tutqichi va screen reader e'loni */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('header.examModal.title')}
        tabIndex={-1}
        className="modal-content glass-panel"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
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
            <DateInput
              inputClassName="modal-input"
              value={date}
              minYear={THIS_YEAR}
              maxYear={THIS_YEAR + 5}
              onChange={(iso) => {
                setDate(iso);
                if (iso) {
                  const diff = new Date(`${iso}T00:00:00`) - new Date();
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
