import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

/**
 * NextMilestoneCard — «Keyingi bosqich» kartasi: eng yaqin daraja, aniq
 * qolgan-shart matni, progress chiziq va bitta sokin CTA.
 * props:
 *   milestone — nextMilestones() ning birinchi elementi
 *   second    — ixtiyoriy ikkinchi nomzod (bir qatorlik muted matn)
 *   onStart(milestone) — CTA bosilganda (sahifa marshrutni hal qiladi)
 */
const NextMilestoneCard = ({ milestone, second, onStart }) => {
  const { t } = useTranslation();
  if (!milestone) return null;

  const Icon = milestone.icon;
  const pct = Math.round(milestone.progress * 100);
  const title = `«${t(`tracks.${milestone.trackId}.name`)}» — ${t(`tracks.tier${milestone.nextTier}`)}`;

  return (
    <div
      className="glass-panel"
      style={{ padding: '16px 20px', marginBottom: 12, border: '1px solid rgba(14,151,224,0.18)', background: 'rgba(14,151,224,0.02)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'var(--blue-bg)', color: 'var(--accent2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {Icon && <Icon size={19} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent2)', marginBottom: 2 }}>
            {t('tracks.nextUp')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.2px' }}>{title}</div>
        </div>
        <button
          onClick={() => onStart?.(milestone)}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--cta)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '8px 13px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          {t('tracks.startCta')} <ArrowRight size={13} />
        </button>
      </div>

      {milestone.hint && (
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45, margin: '10px 0 8px', fontWeight: 500 }}>
          {t(milestone.hint.key, milestone.hint.params)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: milestone.hint ? 0 : 10 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: 'var(--accent)', transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', flexShrink: 0 }}>{pct}%</span>
      </div>

      {second && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
          <span
            style={{
              width: 5, height: 5, transform: 'rotate(45deg)', flexShrink: 0,
              border: '1px solid var(--border)', borderRadius: 1, display: 'inline-block'
            }}
          />
          {t('tracks.thenNext', {
            title: `«${t(`tracks.${second.trackId}.name`)}» — ${t(`tracks.tier${second.nextTier}`)}`,
            pct: Math.round(second.progress * 100)
          })}
        </div>
      )}
    </div>
  );
};

export default NextMilestoneCard;
