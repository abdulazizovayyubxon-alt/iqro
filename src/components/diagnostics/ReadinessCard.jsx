import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, ChevronRight, Info } from 'lucide-react';

// Tayyorlik darajasi rangi — sokin palitra (azure → amber → red), gradientsiz
export const bandColor = (band) => ({
  low: 'var(--red)',
  mid: 'var(--amber)',
  good: 'var(--accent)',
  high: 'var(--green)',
}[band] || 'var(--accent)');

/**
 * ReadinessCard — «Tayyorlik darajasi» bloki.
 * Dashboard'da (compact) va Tahlil sahifasida (to'liq) ishlatiladi.
 *
 * props:
 *   diag     — computeDiagnostics(...) natijasi
 *   compact  — Dashboard varianti (kamroq tafsilot + CTA)
 *   onOpen   — CTA bosilganda (compact rejimda)
 *   onTopic  — yo'qotish chipiga bosilganda (topicId)
 */
const ReadinessCard = ({ diag, compact = false, onOpen, onTopic }) => {
  const { t } = useTranslation();
  if (!diag) return null;

  const color = bandColor(diag.band);
  const lowConfidence = diag.confidence < 0.4;
  // Ma'lumot yo'q bo'lsa barcha bo'lim bir xil "yo'qotish" beradi — bu ro'yxat
  // hech narsani ko'rsatmaydi, shuning uchun umuman chiqarilmaydi.
  const topLosses = diag.hasData ? diag.losses.slice(0, compact ? 2 : 3) : [];

  return (
    <div className="glass-panel" style={{ padding: compact ? '14px 16px' : '18px 18px 16px' }}>
      {/* Sarlavha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Activity size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: 0.4,
          textTransform: 'uppercase', color: 'var(--text3)',
        }}>
          {t('analysis.readinessTitle')}
        </span>
      </div>

      {/* Katta raqam + kutilayotgan natija */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1.5px' }}>
            {diag.hasData ? diag.readiness : '—'}
          </span>
          {diag.hasData && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text3)' }}>%</span>}
        </div>
        {diag.hasData && (
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45, flex: 1, minWidth: 160 }}>
            {t('analysis.predicted', {
              total: diag.predicted.total,
              correct: diag.predicted.correct,
            })}
          </div>
        )}
      </div>

      {/* Shkala + maqsad belgisi */}
      <div style={{ marginTop: 12 }}>
        {/* Maqsad chizig'i FAQAT shkala balandligida bo'lishi uchun relative
            konteyner shu yerda — pastdagi izoh qatorini kesib o'tmasin */}
        <div style={{ position: 'relative', height: 8 }}>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden' }}>
            <div style={{
              width: `${diag.hasData ? diag.readiness : 0}%`, height: '100%',
              borderRadius: 4, background: color, transition: 'width 0.6s ease',
            }} />
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute', top: -3, height: 14,
              left: `${diag.goalScore}%`, width: 2,
              background: 'var(--text)', opacity: 0.35, borderRadius: 1,
            }}
          />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 6,
        }}>
          <span>{t(`analysis.band.${diag.band}`)}</span>
          <span>{t('analysis.goalMark', { score: diag.goalScore })}</span>
        </div>
      </div>

      {/* Maqsadgacha qolgan farq */}
      {diag.hasData && !diag.meetsGoal && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10, fontWeight: 600 }}>
          {t('analysis.gapToGoal', { count: diag.gapToGoal, goal: diag.goalScore })}
        </div>
      )}
      {diag.hasData && diag.meetsGoal && (
        <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 10, fontWeight: 700 }}>
          {t('analysis.goalReached', { goal: diag.goalScore })}
        </div>
      )}

      {/* Ishonch ogohlantirishi — baho qanchalik mustahkam */}
      {(!diag.hasData || lowConfidence) && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-start',
          marginTop: 10, padding: '8px 10px', borderRadius: 10,
          background: 'var(--bg3)', fontSize: 11, color: 'var(--text2)', lineHeight: 1.45,
        }}>
          <Info size={13} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 1 }} />
          <span>
            {diag.hasData
              ? t('analysis.lowConfidence', { pct: Math.round(diag.confidence * 100) })
              : t('analysis.noData')}
          </span>
        </div>
      )}

      {/* Eng katta yo'qotish manbalari */}
      {topLosses.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>
            {t('analysis.biggestLoss')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topLosses.map(tp => (
              <button
                key={tp.id}
                onClick={() => onTopic?.(tp.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  cursor: onTopic ? 'pointer' : 'default', textAlign: 'left',
                  fontFamily: 'inherit', width: '100%',
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{tp.icon}</span>
                <span style={{
                  flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {tp.name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>
                  {tp.acc !== null ? `${tp.acc}%` : t('analysis.notStarted')}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--red)', flexShrink: 0 }}>
                  −{tp.expectedLoss.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
            {t('analysis.lossHint', { total: diag.predicted.total })}
          </div>
        </div>
      )}

      {/* CTA — batafsil tahlil */}
      {compact && (
        <button
          onClick={onOpen}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', marginTop: 14, padding: '10px 12px', borderRadius: 12,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--accent)', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {t('analysis.openFull')} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
};

export default ReadinessCard;
