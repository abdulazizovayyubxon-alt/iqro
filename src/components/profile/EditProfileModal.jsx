import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from './ModalShell';
import DateInput from '../shared/DateInput';
import { SUBJECTS } from '../../data/mockData';
import { ageFromBirthDate } from '../../utils/age';
import { targetScoreFor, targetQuestions } from '../../services/studyContract';
import { BATCH_SIZE } from '../../config';

/**
 * O'qituvchi malaka toifalari (attestatsiya) — value bilan tarjima kaliti.
 * Onboardingdagi maqsad tanlovi shu lug'atga o'giriladi (ONBOARDING_TOIFA),
 * shuning uchun ro'yxat `sertifikat` variantini ham o'z ichiga oladi.
 * Har bir toifa maqsad foizini belgilaydi — services/studyContract.js.
 */
export const TOIFALAR = [
  { value: 'mutaxassis', label: 'Mutaxassis' },
  { value: 'ikkinchi', label: 'Ikkinchi toifa' },
  { value: 'birinchi', label: 'Birinchi toifa' },
  { value: 'oliy', label: 'Oliy toifa' },
  { value: 'sertifikat', label: 'Kasbiy sertifikat' },
];

const NOW_YEAR = new Date().getFullYear();
// Tug'ilgan yil: ~16–90 yosh oralig'i
const MIN_BIRTH_YEAR = NOW_YEAR - 90;
const MAX_BIRTH_YEAR = NOW_YEAR - 16;

/** Profilni tahrirlash — ism, familiya, jins, tug'ilgan sana, fan, toifa */
export default function EditProfileModal({ form, setForm, saving, onSave, onClose }) {
  const { t } = useTranslation();
  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Yosh alohida so'ralmaydi — tug'ilgan sanadan hisoblanadi (utils/age.js)
  const age = ageFromBirthDate(form.birthDate);

  return (
    <ModalShell onClose={onClose} maxWidth={440} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
      <div className="pp-modal-title">{t('modals.editTitle')}</div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>{t('modals.firstName')}</label>
          <input value={form.firstName} onChange={upd('firstName')} placeholder={t('modals.firstName')} />
        </div>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>{t('modals.lastName')}</label>
          <input value={form.lastName} onChange={upd('lastName')} placeholder={t('modals.lastName')} />
        </div>
      </div>

      <div className="pp-field">
        <label>{t('modals.gender')}</label>
        <select value={form.gender} onChange={upd('gender')}>
          <option value="">{t('modals.choose')}</option>
          <option value="male">{t('modals.male')}</option>
          <option value="female">{t('modals.female')}</option>
        </select>
      </div>

      <div className="pp-field">
        <label>
          {t('modals.birthDate')}
          {age !== null && (
            <span style={{ float: 'right', textTransform: 'none', letterSpacing: 0, color: 'var(--text3)', fontWeight: 600 }}>
              {t('modals.ageComputed', { count: age })}
            </span>
          )}
        </label>
        <DateInput
          value={form.birthDate}
          minYear={MIN_BIRTH_YEAR}
          maxYear={MAX_BIRTH_YEAR}
          onChange={(iso) => setForm(p => ({ ...p, birthDate: iso }))}
        />
      </div>

      <div className="pp-field">
        <label>{t('modals.subjectLabel')}</label>
        <select value={form.subject} onChange={upd('subject')}>
          <option value="">{t('modals.choose')}</option>
          {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="pp-field">
        <label>{t('modals.toifaLabel')}</label>
        <select value={form.teacherCategory} onChange={upd('teacherCategory')}>
          <option value="">{t('modals.choose')}</option>
          {TOIFALAR.map(toi => <option key={toi.value} value={toi.value}>{t(`modals.toifa.${toi.value}`)}</option>)}
        </select>
        {/* Toifa maqsad foizini belgilaydi — «nega maqsad 70?» degan savol
            tug'ilmasligi uchun bog'liqlik shu yerda ochiq aytiladi */}
        {form.teacherCategory && (
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 7, lineHeight: 1.45 }}>
            {t('onboarding.goalTarget', {
              count: targetQuestions(targetScoreFor(form.teacherCategory)),
              total: BATCH_SIZE,
            })}
          </div>
        )}
      </div>

      <div className="pp-modal-actions" style={{ marginTop: '20px' }}>
        <button className="pp-btn-cancel" onClick={onClose}>{t('modals.cancel')}</button>
        <button className="pp-btn-save" onClick={onSave} disabled={saving}>
          {saving ? t('modals.editSaving') : t('modals.editSave')}
        </button>
      </div>
    </ModalShell>
  );
}
