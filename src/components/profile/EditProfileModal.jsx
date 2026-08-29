import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3 } from 'lucide-react';
import SettingsSheet from '../shared/SettingsSheet';
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

/**
 * Profilni tahrirlash — ism, familiya, jins, tug'ilgan sana, fan, toifa.
 *
 * ⚠️ 2026-08-29: ilgari BUTUN oyna surilardi (`maxHeight: 88vh` oynaning
 * o'zida). Ya'ni pastga surganda sarlavha ham ketardi, "Saqlash" tugmasi ham
 * matn bilan birga pastda qolib ketardi — uzun formada uni topish qiyin edi.
 * Endi surish faqat tanada; sarlavha va tugmalar qotib turadi.
 *
 * Oltita maydon ikki blokka bo'lindi (shaxsiy / kasbiy) — ilgari ketma-ket
 * turardi va qaysi maydon nimaga ta'sir qilishi ko'rinmasdi.
 */
export default function EditProfileModal({ form, setForm, saving, onSave, onClose }) {
  const { t } = useTranslation();
  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Yosh alohida so'ralmaydi — tug'ilgan sanadan hisoblanadi (utils/age.js)
  const age = ageFromBirthDate(form.birthDate);

  return (
    <SettingsSheet
      icon={<Edit3 size={20} />}
      title={t('modals.editTitle')}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button type="button" className="ss-btn" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="button" className="ss-btn is-cta" onClick={onSave} disabled={saving}>
            {saving ? t('modals.editSaving') : t('modals.editSave')}
          </button>
        </>
      }
    >
      <div className="ss-block">
        <div className="ss-block-label">{t('modals.sectionPersonal')}</div>

        <div className="pp-field-row">
          <div className="pp-field">
            <label htmlFor="sp-first">{t('modals.firstName')}</label>
            <input id="sp-first" value={form.firstName} onChange={upd('firstName')} placeholder={t('modals.firstName')} />
          </div>
          <div className="pp-field">
            <label htmlFor="sp-last">{t('modals.lastName')}</label>
            <input id="sp-last" value={form.lastName} onChange={upd('lastName')} placeholder={t('modals.lastName')} />
          </div>
        </div>

        <div className="pp-field">
          <label htmlFor="sp-gender">{t('modals.gender')}</label>
          <select id="sp-gender" value={form.gender} onChange={upd('gender')}>
            <option value="">{t('modals.choose')}</option>
            <option value="male">{t('modals.male')}</option>
            <option value="female">{t('modals.female')}</option>
          </select>
        </div>

        <div className="pp-field">
          <label>
            {t('modals.birthDate')}
            {age !== null && (
              <span className="pp-field-hint">{t('modals.ageComputed', { count: age })}</span>
            )}
          </label>
          <DateInput
            value={form.birthDate}
            minYear={MIN_BIRTH_YEAR}
            maxYear={MAX_BIRTH_YEAR}
            onChange={(iso) => setForm(p => ({ ...p, birthDate: iso }))}
          />
        </div>
      </div>

      <div className="ss-block">
        <div className="ss-block-label">{t('modals.sectionProfessional')}</div>

        <div className="pp-field">
          <label htmlFor="sp-subject">{t('modals.subjectLabel')}</label>
          <select id="sp-subject" value={form.subject} onChange={upd('subject')}>
            <option value="">{t('modals.choose')}</option>
            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="pp-field">
          <label htmlFor="sp-toifa">{t('modals.toifaLabel')}</label>
          <select id="sp-toifa" value={form.teacherCategory} onChange={upd('teacherCategory')}>
            <option value="">{t('modals.choose')}</option>
            {TOIFALAR.map(toi => <option key={toi.value} value={toi.value}>{t(`modals.toifa.${toi.value}`)}</option>)}
          </select>
          {/* Toifa maqsad foizini belgilaydi — «nega maqsad 70?» degan savol
              tug'ilmasligi uchun bog'liqlik shu yerda ochiq aytiladi */}
          {form.teacherCategory && (
            <div className="ss-note is-accent pp-field-note">
              {t('onboarding.goalTarget', {
                count: targetQuestions(targetScoreFor(form.teacherCategory)),
                total: BATCH_SIZE,
              })}
            </div>
          )}
        </div>
      </div>
    </SettingsSheet>
  );
}
