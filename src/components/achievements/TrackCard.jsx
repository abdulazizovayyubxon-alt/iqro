import React from 'react';
import { useTranslation } from 'react-i18next';
import TierMarks from './TierMarks';

const NEW_BADGE_MS = 7 * 86400000; // daraja olinganidan keyin «Yangi» chipi ko'rinadigan muddat

/**
 * TrackCard — bitta yo'nalish kartasi: ikonka, nom, daraja muhrlari,
 * keyingi darajaga progress va aniq shart-tavsiya.
 * props: track (TRACKS elementi), tier (0-3), progress (0..1),
 *        earnedAt ({ [tier]: timestamp } — daraja olingan sanalar)
 */
const TrackCard = ({ track, tier, progress, earnedAt }) => {
  const { t, i18n } = useTranslation();
  const Icon = track.icon;
  const started = tier > 0;
  const done = tier >= 3;
  const pct = Math.round(Math.min(1, progress) * 100);

  // Joriy daraja sanasi (arxiv hissi) + 7 kunlik sokin «Yangi» belgisi
  const earnedTs = started ? earnedAt?.[tier] : null;
  const isNew = earnedTs && Date.now() - earnedTs < NEW_BADGE_MS;
  const earnedDate = earnedTs
    ? new Date(earnedTs).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

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
        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text)', flex: 1, letterSpacing: '-0.2px' }}>
          {t(`tracks.${track.id}.name`)}
        </div>
        <TierMarks tier={tier} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 18 }}>
        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: started ? 'var(--accent2)' : 'var(--text3)' }}>
          {started ? t(`tracks.tier${tier}`) : t('tracks.tierNone')}
        </span>
        {isNew && (
          <span
            style={{
              fontSize: 'var(--fs-3xs)', fontWeight: 700, color: 'var(--accent2)',
              border: '1px solid rgba(14,151,224,0.35)', borderRadius: 8,
              padding: '1px 6px', letterSpacing: '0.3px'
            }}
          >
            {t('tracks.newBadge')}
          </span>
        )}
        {earnedDate && (
          <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 500, color: 'var(--text3)', marginLeft: 'auto' }}>
            {earnedDate}
          </span>
        )}
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

      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', lineHeight: 1.4, fontWeight: 500 }}>
        {done ? t('tracks.maxReached') : t(`tracks.${track.id}.hint${tier + 1}`)}
      </div>
    </div>
  );
};

export default TrackCard;
