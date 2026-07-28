import React from 'react';
import { useTranslation } from 'react-i18next';
import { stepText } from '../../engine/stepText';
import { Brain, Target, LayoutGrid, AlertCircle, GraduationCap, CheckCircle2, ChevronRight, Clock, Shuffle, History } from 'lucide-react';

const STEP_META = {
  retention: { icon: Brain, color: 'var(--green)', bg: 'var(--green-bg)' },
  practice: { icon: Target, color: 'var(--accent)', bg: 'var(--blue-bg)' },
  mixed: { icon: Shuffle, color: 'var(--accent)', bg: 'var(--blue-bg)' },
  refresh: { icon: History, color: 'var(--amber)', bg: 'var(--amber-bg)' },
  coverage: { icon: LayoutGrid, color: 'var(--accent2)', bg: 'var(--blue-bg)' },
  mistakes: { icon: AlertCircle, color: 'var(--red)', bg: 'var(--red-bg)' },
  exam: { icon: GraduationCap, color: 'var(--amber)', bg: 'var(--amber-bg)' },
};

/**
 * TrajectoryPlan — shaxsiy o'quv rejasi (tartiblangan qadamlar).
 * Qadamlar SOF hisoblanadi (DiagnosticsEngine.buildTrajectory) — bajarilgani
 * ham natijalardan kelib chiqadi, alohida saqlanmaydi.
 *
 * props:
 *   steps  — buildTrajectory(...) natijasi
 *   onStep — (step) => void, qadam CTA'si bosilganda
 */
const TrajectoryPlan = ({ steps = [], onStep }) => {
  const { t } = useTranslation();

  if (steps.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 28, textAlign: 'center' }}>
        <CheckCircle2 size={30} style={{ color: 'var(--green)', marginBottom: 10 }} />
        <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text)' }}>
          {t('trajectory.emptyTitle')}
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
          {t('trajectory.emptyDesc')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => {
        const meta = STEP_META[step.type] || STEP_META.practice;
        const Icon = meta.icon;
        const txt = stepText(step, t);

        return (
          <div
            key={step.id}
            className="glass-panel"
            style={{
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              opacity: step.done ? 0.6 : 1,
            }}
          >
            {/* Tartib raqami + belgi */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: meta.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step.done
                  ? <CheckCircle2 size={17} style={{ color: 'var(--green)' }} />
                  : <Icon size={17} style={{ color: meta.color }} />}
              </div>
              <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 800, color: 'var(--text3)' }}>{i + 1}</span>
            </div>

            {/* Matn */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3,
              }}>
                {/* TOPICS.icon — matn emas, JSX elementi (mockData.js); shu sababli
                    satrga qo'shilmaydi, alohida bola sifatida chiziladi */}
                {step.topicIcon && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text2)' }}>
                    {step.topicIcon}
                  </span>
                )}
                <span style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text)' }}>
                  {txt.title}
                </span>
                {step.gain > 0.2 && !step.done && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, background: 'var(--blue-bg)',
                    color: 'var(--accent2)', fontSize: 'var(--fs-2xs)', fontWeight: 800,
                  }}>
                    {t('trajectory.gain', { count: step.gain })}
                  </span>
                )}
                {/* Vaqt bahosi — foydalanuvchining o'z o'rtacha tezligidan */}
                {step.minutes > 0 && !step.done && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text3)',
                  }}>
                    <Clock size={11} />
                    {t('pace.minutes', { count: step.minutes })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', lineHeight: 1.5 }}>
                {txt.desc}
              </div>

              {/* «Nimaga e'tibor bering» — mavzuning mavjud nazariy yo'riqnomasi.
                  Yig'iladi/ochiladi: reja qatorlari uzun matnga cho'zilib ketmasin. */}
              {step.theoryHint && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{
                    cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: 700,
                    color: 'var(--accent)', listStyle: 'none',
                  }}>
                    {t('trajectory.focus')}
                  </summary>
                  <div style={{
                    marginTop: 6, padding: '9px 11px', borderRadius: 10,
                    background: 'var(--bg3)', fontSize: 'var(--fs-xs)',
                    color: 'var(--text2)', lineHeight: 1.6,
                  }}>
                    {step.theoryHint}
                  </div>
                </details>
              )}

              {!step.done && (
                <button
                  onClick={() => onStep?.(step)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 10, padding: '7px 12px', borderRadius: 10,
                    border: 'none', background: meta.color, color: '#fff',
                    fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {txt.cta} <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrajectoryPlan;
