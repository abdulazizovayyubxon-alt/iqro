import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from './ModalShell';
import { SUBJECTS } from '../../data/mockData';

/** O'qituvchi malaka toifalari (attestatsiya) — value bilan tarjima kaliti */
export const TOIFALAR = [
  { value: 'mutaxassis', label: 'Mutaxassis' },
  { value: 'ikkinchi', label: 'Ikkinchi toifa' },
  { value: 'birinchi', label: 'Birinchi toifa' },
  { value: 'oliy', label: 'Oliy toifa' },
];

const NOW_YEAR = new Date().getFullYear();
// Tug'ilgan yil: ~16–90 yosh oralig'i
const BIRTH_YEARS = Array.from({ length: 75 }, (_, i) => NOW_YEAR - 16 - i);
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

/** Profilni tahrirlash — ism, familiya, yosh, jins, sana, fan, toifa */
export default function EditProfileModal({ form, setForm, saving, onSave, onClose }) {
  const { t } = useTranslation();
  const UZ_MONTHS = t('modals.months', { returnObjects: true });
  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // Tug'ilgan sana "YYYY-MM-DD" ni 3 dropdown'ga ajratamiz — native date input
  // brauzer lokalida "дд.мм.гггг" (ruscha) ko'rsatardi; bu lokaldan mustaqil.
  const [by = '', bm = '', bd = ''] = (form.birthDate || '').split('-');
  const setBirthPart = (idx) => (e) => {
    const parts = (form.birthDate || '').split('-');
    while (parts.length < 3) parts.push('');
    parts[idx] = e.target.value;
    // Hamma qism tanlanmaguncha to'liq bo'lmagan sanani saqlamaymiz
    const next = parts.every(Boolean) ? parts.join('-') : '';
    setForm(p => ({ ...p, _birthParts: parts, birthDate: next }));
  };
  // Qisman tanlovni ko'rsatish uchun (saqlanmagan, faqat UI)
  const parts = form._birthParts || [by, bm, bd];
  const [py = '', pm = '', pd = ''] = parts;

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

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>{t('modals.age')}</label>
          <input type="number" min="0" max="120" value={form.age} onChange={upd('age')} placeholder={t('modals.age')} />
        </div>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>{t('modals.gender')}</label>
          <select value={form.gender} onChange={upd('gender')}>
            <option value="">{t('modals.choose')}</option>
            <option value="male">{t('modals.male')}</option>
            <option value="female">{t('modals.female')}</option>
          </select>
        </div>
      </div>

      <div className="pp-field">
        <label>{t('modals.birthDate')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ flex: 1 }} value={pd} onChange={setBirthPart(2)}>
            <option value="">{t('modals.day')}</option>
            {DAYS.map(d => <option key={d} value={d}>{Number(d)}</option>)}
          </select>
          <select style={{ flex: 1.4 }} value={pm} onChange={setBirthPart(1)}>
            <option value="">{t('modals.month')}</option>
            {UZ_MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>
          <select style={{ flex: 1.2 }} value={py} onChange={setBirthPart(0)}>
            <option value="">{t('modals.year')}</option>
            {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
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
