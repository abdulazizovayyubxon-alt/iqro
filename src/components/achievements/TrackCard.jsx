import React from 'react';
import { useTranslation } from 'react-i18next';
import TierMarks from './TierMarks';

/**
 * TrackCard — bitta yo'nalish kartasi: ikonka, nom, daraja muhrlari,
 * keyingi darajaga progress va aniq shart-tavsiya.
 * props: track (TRACKS elementi), tier (0-3), progress (0..1)
 */
const TrackCard = ({ track, tier, progress }) => {
  const { t } = useTranslation();
  const Icon = track.icon;
  const started = tier > 0;
  const done = tier >= 3;
  const pct = Math.round(Math.min(1, progress) * 100);

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            flexShrink: 0,
            background: started ? 'var(--blue-bg)' : 'var(--bg3)',
            color: started ? 'var(--accent2)' : 'var(--text3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon size={17} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, letterSpacing: '-0.2px' }}>
          {t(`tracks.${track.id}.name`)}
        </div>
        <TierMarks tier={tier} />
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: started ? 'var(--accent2)' : 'var(--text3)' }}>
        {started ? t(`tracks.tier${tier}`) : t('tracks.tierNone')}
      </div>

      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${done ? 100 : pct}%`,
            height: '100%',
            borderRadius: 2,
            background: 'var(--accent)',
            transition: 'width 0.5s ease'
          }}
        />
      </div>

      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4, fontWeight: 500 }}>
        {done ? t('tracks.maxReached') : t(`tracks.${track.id}.hint${tier + 1}`)}
      </div>
    </div>
  );
};

export default TrackCard;
