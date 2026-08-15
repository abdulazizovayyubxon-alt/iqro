import React from 'react';
import { useTranslation } from 'react-i18next';
import { MILESTONES, nearestMilestone } from '../../data/milestones';

/**
 * LevelPips — marra bosqichlari (nuqta qatori). TierMarks bilan bir oilada:
 * geometrik, rangsiz, «medal» emas — akademik muhr uslubi.
 */
const LevelPips = ({ level, total }) => (
  <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', flexShrink: 0 }}
    role="img" aria-label={`${total} bosqichdan ${level} tasi`}>
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i < level ? 'var(--accent)' : 'transparent',
          border: i < level ? '1px solid var(--accent)' : '1px solid var(--border)',
        }}
      />
    ))}
  </span>
);

/**
 * MilestoneGrid — shaxsiy marralar ro'yxati.
 * props:
 *   live — reconcileMilestones(...).live
 */
const MilestoneGrid = ({ live = {} }) => {
  const { t } = useTranslation();

  // Tartib: eng yaqin marra BIRINCHI, keyin qolgan tugallanmaganlar
  // yaqinligi bo'yicha, yakunlanganlar esa oxirida. Ilgari ro'yxat qat'iy
  // tartibda chizilardi — qaysi marra bugun yopilishi mumkinligi ko'rinmasdi
  // (`nearestMilestone` yozilgan-u, hech qayerda ishlatilmasdi).
  const nearest = nearestMilestone(live);
  const ordered = [...MILESTONES].sort((a, b) => {
    const la = live[a.id] || { progress: 0, maxed: false };
    const lb = live[b.id] || { progress: 0, maxed: false };
    if (la.maxed !== lb.maxed) return la.maxed ? 1 : -1;
    return (lb.progress || 0) - (la.progress || 0);
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
      {ordered.map(m => {
        const lv = live[m.id] || { level: 0, value: 0, next: m.levels[0], progress: 0, maxed: false, total: m.levels.length };
        const Icon = m.icon;
        const unit = t(`milestones.unit.${m.unit}`);

        return (
          <div
            key={m.id}
            className="glass-panel"
            style={{
              padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8,
              border: nearest?.id === m.id ? '1px solid rgba(14,151,224,0.28)' : undefined,
            }}
          >
            {nearest?.id === m.id && (
              <div style={{ fontSize: 'var(--fs-3xs)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--accent2)' }}>
                {t('milestones.nearest')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: lv.level > 0 ? 'var(--blue-bg)' : 'var(--bg3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} style={{ color: lv.level > 0 ? 'var(--accent)' : 'var(--text3)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t(`milestones.${m.id}.name`)}
                </div>
                <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 1 }}>
                  {t(`milestones.${m.id}.desc`)}
                </div>
              </div>
              <LevelPips level={lv.level} total={lv.total} />
            </div>

            {/* Joriy qiymat → keyingi bosqich */}
            <div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round(lv.progress * 100)}%`, height: '100%', borderRadius: 2,
                  background: lv.maxed ? 'var(--green)' : 'var(--accent)', transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 5 }}>
                {lv.maxed
                  ? t('milestones.maxed', { value: lv.value, unit })
                  : t('milestones.progress', { value: lv.value, next: lv.next, unit })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MilestoneGrid;
