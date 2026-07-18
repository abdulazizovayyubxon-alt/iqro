import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

/**
 * NextMilestoneLine — kompakt «keyingi bosqich» qatori (natija ekranlari,
 * bosh sahifa): ikon + nom/daraja + qolgan-shart + mikro progress chiziq.
 * props:
 *   milestone — nextMilestones() elementi
 *   onClick   — ixtiyoriy; berilsa qator bosiladigan bo'ladi (chevron bilan)
 */
const NextMilestoneLine = ({ milestone, onClick }) => {
  const { t } = useTranslation();
  if (!milestone) return null;

  const Icon = milestone.icon;
  const pct = Math.round(milestone.progress * 100);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--blue-bg)', color: 'var(--accent2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {Icon && <Icon size={15} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('tracks.nextUp')}: «{t(`tracks.${milestone.trackId}.name`)}» — {t(`tracks.tier${milestone.nextTier}`)}
        </div>
        {milestone.hint && (
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t(milestone.hint.key, milestone.hint.params)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 1.5, background: 'var(--bg3)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 1.5, background: 'var(--accent)', transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)', flexShrink: 0 }}>{pct}%</span>
        </div>
      </div>
      {onClick && <ChevronRight size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
    </div>
  );
};

export default NextMilestoneLine;
