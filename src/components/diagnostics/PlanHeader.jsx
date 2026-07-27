import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Timer, CheckCircle2, Info } from 'lucide-react';
import WeekGrid from './WeekGrid';

const BUDGETS = [10, 20, 40, null]; // null = cheklovsiz

/**
 * PlanHeader — kunlik reja sarlavhasi: sur'at + vaqt byudjeti + bugungi holat.
 *
 * props:
 *   pace        — buildPace(...) natijasi
 *   budget      — tanlangan daqiqa byudjeti (null = cheklovsiz)
 *   onBudget    — (minutes|null) => void
 *   doneCount   — bugungi rejada bajarilgan qadamlar
 *   total       — bugungi rejadagi qadamlar soni
 *   totalMinutes— qolgan qadamlarning taxminiy vaqti
 *   activeDays  — state.activeDays (haftalik panjara)
 *   streak      — state.dailyStreak
 */
const PlanHeader = ({
  pace, budget, onBudget, doneCount = 0, total = 0, totalMinutes = 0,
  activeDays = [], streak = 0,
}) => {
  const { t } = useTranslation();
  if (!pace) return null;

  const allDone = total > 0 && doneCount >= total;
  // Bugungi norma foizi — 0 bo'lganda ham chiziq ko'rinib tursin
  const todayPct = pace.perDay
    ? Math.min(100, Math.round((pace.todayAnswered / pace.perDay) * 100))
    : 0;

  return (
    <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: 14 }}>
      {/* ── Sur'at qatori ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <CalendarDays size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{
          fontSize: 13, fontWeight: 800,
          color: pace.isExamToday ? 'var(--amber)' : 'var(--text)',
        }}>
          {pace.isExamToday
            ? t('pace.examToday')
            : pace.hasDeadline
              ? t('pace.daysLeft', { count: pace.daysLeft })
              : t('pace.noDate')}
        </span>
        {pace.hasDeadline && pace.perDay && (
          <span style={{
            padding: '3px 9px', borderRadius: 9, background: 'var(--blue-bg)',
            color: 'var(--accent2)', fontSize: 11, fontWeight: 800,
          }}>
            {t('pace.perDay', { count: pace.perDay })}
            {pace.perDayMinutes ? ` · ${t('pace.minutes', { count: pace.perDayMinutes })}` : ''}
          </span>
        )}
      </div>

      {/* ── Holat izohi ── */}
      {!pace.hasDeadline && !pace.isExamToday && (
        <div style={{
          display: 'flex', gap: 7, alignItems: 'flex-start', marginTop: 8,
          fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.5,
        }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('pace.noDateHint')}</span>
        </div>
      )}
      {pace.isExamToday && (
        <div style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5 }}>
          {t('pace.examTodayHint')}
        </div>
      )}
      {pace.needsData && (
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
          {t('pace.needsData')}
        </div>
      )}
      {!pace.needsData && pace.questionsToGoal === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 700, marginTop: 8 }}>
          {t('pace.goalReached')}
        </div>
      )}
      {!pace.needsData && pace.questionsToGoal === null && (
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
          {t('pace.unreachable')}
        </div>
      )}

      {/* ── Bugungi norma ── */}
      {pace.hasDeadline && pace.perDay > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5,
          }}>
            <span>{t('pace.today', { done: pace.todayAnswered, target: pace.perDay })}</span>
            {pace.todayDone && (
              <span style={{ color: 'var(--green)' }}>{t('pace.todayDone')}</span>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
            <div style={{
              width: `${todayPct}%`, height: '100%', borderRadius: 3,
              background: pace.todayDone ? 'var(--green)' : 'var(--accent)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Haftalik faollik ── */}
      {activeDays.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <WeekGrid days={activeDays} streak={streak} />
        </div>
      )}

      {/* ── Vaqt byudjeti ── */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 7,
        }}>
          <Timer size={12} />
          {t('pace.budgetTitle')}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {BUDGETS.map(b => {
            const active = (budget ?? null) === b;
            return (
              <button
                key={String(b)}
                onClick={() => onBudget?.(b)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: 10,
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--blue-bg)' : 'var(--bg2)',
                  color: active ? 'var(--accent)' : 'var(--text3)',
                  fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {b === null ? t('pace.budgetFree') : t('pace.budgetMin', { count: b })}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bugungi reja jamlanmasi ── */}
      {total > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
          paddingTop: 11, borderTop: '1px solid var(--border)',
          fontSize: 11.5, fontWeight: 700,
          color: allDone ? 'var(--green)' : 'var(--text2)',
        }}>
          {allDone && <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
          <span>
            {allDone
              ? t('pace.allDone')
              : `${t('pace.planSummary', { done: doneCount, total })} · ${t('pace.planMinutes', { count: totalMinutes })}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default PlanHeader;
