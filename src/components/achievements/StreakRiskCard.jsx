import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Shield, ArrowRight } from 'lucide-react';

/**
 * StreakRiskCard — «zanjir bugun uziladi» ogohlantirishi.
 *
 * Ohang ATAYIN sokin: ayblov yo'q, undov yo'q — faqat raqam va bitta harakat.
 * Kun oxiriga yaqin (risk.urgent) faqat RANG kuchayadi, matn emas.
 *
 * props:
 *   risk    — streakRisk(state) natijasi (null bo'lsa hech narsa chizilmaydi)
 *   onStart — CTA bosilganda
 *   compact — bosh sahifa uchun bir qatorlik ko'rinish
 */
const StreakRiskCard = ({ risk, onStart, compact = false }) => {
  const { t } = useTranslation();
  if (!risk) return null;

  const tone = risk.urgent ? 'var(--amber)' : 'var(--text2)';
  const body = risk.usesFreeze
    ? t('achievements.riskFreezeBody', { count: risk.remaining })
    : t('achievements.riskBody', { count: risk.remaining, hours: risk.hoursLeft });

  return (
    <div
      className="glass-panel"
      style={{
        padding: compact ? '12px 14px' : '14px 18px',
        marginBottom: compact ? 0 : 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: `1px solid ${risk.urgent ? 'rgba(245,158,11,0.30)' : 'var(--glass-border)'}`,
        background: risk.urgent ? 'rgba(245,158,11,0.03)' : 'var(--glass-bg)',
      }}
    >
      <div
        style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'var(--amber-bg)', color: 'var(--amber)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {risk.usesFreeze ? <Shield size={17} /> : <Flame size={17} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' }}>
          {t('achievements.riskTitle', { count: risk.streak })}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: tone, fontWeight: 500, marginTop: 2, lineHeight: 1.4 }}>
          {body}
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--cta)', color: '#fff', border: 'none',
          borderRadius: 10, padding: '8px 13px', fontSize: 'var(--fs-sm)', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {t('achievements.riskCta')} <ArrowRight size={13} />
      </button>
    </div>
  );
};

export default StreakRiskCard;
