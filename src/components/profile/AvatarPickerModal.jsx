import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import ModalShell from './ModalShell';
import { AVATARS } from '../../data/avatars';

/**
 * Avatar tanlash — tayyor avatarlar reyestridan (src/data/avatars.js).
 * Grid avtomatik to'ladi; o'chirish/qo'shish faqat fayl darajasida.
 *
 * props: current (tanlangan avatarId), onSelect(id|null), onClose, displayName
 */
export default function AvatarPickerModal({ current, onSelect, onClose, displayName = '' }) {
  const { t } = useTranslation();
  const initials = (displayName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ModalShell onClose={onClose} maxWidth={460} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
      <div className="pp-modal-title">{t('modals.avatarTitle')}</div>
      <p style={{ fontSize: 'var(--fs-md)', color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 }}>
        {t('modals.avatarDesc')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {/* Harf (avatarsiz) varianti */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          title={t('modals.avatarInitial')}
          style={avatarBtnStyle(!current)}
        >
          <div style={{
            width: '100%', aspectRatio: '1', borderRadius: '50%',
            background: 'linear-gradient(135deg, #94A3B8, #64748B)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--fs-4xl)', fontWeight: 800,
          }}>
            {initials}
          </div>
          {!current && <SelectedCheck />}
        </button>

        {AVATARS.map(av => {
          const isSel = current === av.id;
          return (
            <button
              key={av.id}
              type="button"
              onClick={() => onSelect(av.id)}
              title={av.id}
              style={avatarBtnStyle(isSel)}
            >
              <img
                src={av.url}
                alt={av.id}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
              {isSel && <SelectedCheck />}
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

function avatarBtnStyle(selected) {
  return {
    position: 'relative', padding: 0, border: 'none', background: 'none',
    cursor: 'pointer', borderRadius: '50%',
    outline: selected ? '3px solid #2563EB' : '3px solid transparent',
    outlineOffset: 2,
    transition: 'transform 0.12s, outline-color 0.12s',
  };
}

function SelectedCheck() {
  return (
    <div style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 22, height: 22, borderRadius: '50%',
      background: '#10B981', border: '2.5px solid #fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Check size={12} color="#fff" strokeWidth={3} />
    </div>
  );
}
