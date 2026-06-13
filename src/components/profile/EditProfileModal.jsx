import React from 'react';
import ModalShell from './ModalShell';
import { SUBJECTS } from '../../data/mockData';

/** O'qituvchi malaka toifalari (attestatsiya) */
export const TOIFALAR = [
  { value: 'mutaxassis', label: 'Mutaxassis' },
  { value: 'ikkinchi', label: 'Ikkinchi toifa' },
  { value: 'birinchi', label: 'Birinchi toifa' },
  { value: 'oliy', label: 'Oliy toifa' },
];

/** Profilni tahrirlash — ism, familiya, yosh, jins, sana, fan, toifa */
export default function EditProfileModal({ form, setForm, saving, onSave, onClose }) {
  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell onClose={onClose} maxWidth={440} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
      <div className="pp-modal-title">✏️ Profilni tahrirlash</div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>Ism</label>
          <input value={form.firstName} onChange={upd('firstName')} placeholder="Ism" />
        </div>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>Familiya</label>
          <input value={form.lastName} onChange={upd('lastName')} placeholder="Familiya" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>Yosh</label>
          <input type="number" min="0" max="120" value={form.age} onChange={upd('age')} placeholder="Yosh" />
        </div>
        <div className="pp-field" style={{ flex: 1 }}>
          <label>Jins</label>
          <select value={form.gender} onChange={upd('gender')}>
            <option value="">Tanlang</option>
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>
      </div>

      <div className="pp-field">
        <label>Tug'ilgan sana</label>
        <input type="date" value={form.birthDate} onChange={upd('birthDate')} />
      </div>

      <div className="pp-field">
        <label>Qaysi fan o'qituvchisi</label>
        <select value={form.subject} onChange={upd('subject')}>
          <option value="">Tanlang</option>
          {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="pp-field">
        <label>Toifa</label>
        <select value={form.teacherCategory} onChange={upd('teacherCategory')}>
          <option value="">Tanlang</option>
          {TOIFALAR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="pp-modal-actions" style={{ marginTop: '20px' }}>
        <button className="pp-btn-cancel" onClick={onClose}>Bekor</button>
        <button className="pp-btn-save" onClick={onSave} disabled={saving}>
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </ModalShell>
  );
}
