import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import SettingsSheet from '../shared/SettingsSheet';

/**
 * Aqlli takrorlash chastotasi (0/10/30/50%).
 *
 * ⚠️ 2026-08-29: ilgari to'rtta kvadrat tugma O'Z uslubida chizilardi va
 * ro'yxatdagi "Til / Rejim / Shrift" tanlovlariga umuman o'xshamasdi, holbuki
 * vazifasi bir xil. Endi AYNI `pp-segment-container` ishlatiladi.
 *
 * Yana bir o'zgarish: tanlov ostida JONLI izoh. Ilgari "30%" nimani
 * anglatishini foydalanuvchi o'zi topishi kerak edi; endi raqam savolga
 * o'giriladi — motorda `blockMaxRep = blockNeeded * (limit / 100)`,
 * blok esa 50 savol (engine/SmartQuestionEngine.js).
 */

/** Motordagi BLOCK_SIZE bilan bir xil — izohdagi son shundan hisoblanadi */
const BLOCK = 50;

export default function RepetitionModal({ value, onChange, onClose }) {
  const { t } = useTranslation();

  const options = [
    { id: 0, label: t('modals.repOff') },
    { id: 10, label: t('modals.repLow') },
    { id: 30, label: t('modals.repMid') },
    { id: 50, label: t('modals.repHigh') },
  ];

  const picked = value ?? 0;
  const perBlock = Math.round(BLOCK * (picked / 100));

  return (
    <SettingsSheet
      icon={<Brain size={20} />}
      title={t('modals.repTitle')}
      sublabel={t('modals.repSub')}
      onClose={onClose}
      footer={
        <button type="button" className="ss-btn is-cta" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <p className="ss-p">{t('modals.repDesc')}</p>

      <div className="pp-segment-container" role="group" aria-label={t('modals.repTitle')}>
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={picked === opt.id}
            className={`pp-segment-btn ${picked === opt.id ? 'active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Jonli izoh — tanlov o'zgarishi bilan darhol yangilanadi */}
      <div className="ss-block">
        <p className="ss-p">
          {picked === 0
            ? t('modals.repEffectOff')
            : t('modals.repEffectOn', { count: perBlock, total: BLOCK })}
        </p>
        <div className="ss-note">{t('modals.repRecommend')}</div>
      </div>
    </SettingsSheet>
  );
}
