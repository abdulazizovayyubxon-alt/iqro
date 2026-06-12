import React from 'react';
import ModalShell from './ModalShell';

/** Profilni tahrirlash (ism / jins / tug'ilgan sana) */
export default function EditProfileModal({ form, setForm, saving, onSave, onClose }) {
  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <div className="pp-modal-title">✏️ Profilni tahrirlash</div>
      <div className="pp-field">
        <label>Ism</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="To'liq ism" />
      </div>
      <div className="pp-field">
        <label>Jins</label>
        <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
          <option value="">Tanlang</option>
          <option value="male">Erkak</option>
          <option value="female">Ayol</option>
        </select>
      </div>
      <div className="pp-field">
        <label>Tug'ilgan sana</label>
        <input type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} />
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
