import React from 'react';
import { useTranslation } from 'react-i18next';
import RadarChart from './RadarChart';

// Legend uchun kichik romb
const Diamond = ({ filled }) => (
  <span
    style={{
      width: 6,
      height: 6,
      transform: 'rotate(45deg)',
      background: filled ? 'var(--accent)' : 'transparent',
      border: filled ? '1px solid var(--accent)' : '1px solid var(--border)',
      borderRadius: 1,
      display: 'inline-block'
    }}
  />
);

/**
 * AmiCard — Akademik Mahorat Indeksi: katta raqam + pasport unvoni + 6 o'qli radar + daraja legendasi.
 * props:
 *   ami: 0-100
 *   unvonTier: 1|2|3 — pasport darajasidagi yagona unvon (tracks.unvonTierFromAmi)
 *   axes: [{ label, value 0..1 }] — RadarChart uchun
 */
const AmiCard = ({ ami = 0, unvonTier = 1, axes = [] }) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        padding: '18px 16px 8px',
        marginBottom: 16,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        textAlign: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 34, fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: '-1px' }}>
          {ami}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>/100</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', margin: '6px 0 2px' }}>
        {t('tracks.amiLabel')}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          margin: '4px 0 6px',
          padding: '4px 14px',
          borderRadius: 20,
          background: 'var(--blue-bg)',
          color: 'var(--accent2)',
          fontSize: 13,
          fontWeight: 700
        }}
      >
        {t(`tracks.tier${unvonTier}`)}
      </div>

      <RadarChart axes={axes} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '8px 0 6px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text3)'
        }}
      >
        {[1, 2, 3].map(lv => (
          <span key={lv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <Diamond filled={lv >= 1} />
              <Diamond filled={lv >= 2} />
              <Diamond filled={lv >= 3} />
            </span>
            {t(`tracks.tier${lv}`)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AmiCard;
