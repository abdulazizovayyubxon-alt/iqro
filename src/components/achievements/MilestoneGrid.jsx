import React from 'react';
import { useTranslation } from 'react-i18next';
import { MILESTONES } from '../../data/milestones';

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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
      {MILESTONES.map(m => {
        const lv = live[m.id] || { level: 0, value: 0, next: m.levels[0], progress: 0, maxed: false, total: m.levels.length };
        const Icon = m.icon;
        const unit = t(`milestones.unit.${m.unit}`);

        return (
          <div
            key={m.id}
            className="glass-panel"
            style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
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
                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t(`milestones.${m.id}.name`)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 1 }}>
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
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', marginTop: 5 }}>
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
