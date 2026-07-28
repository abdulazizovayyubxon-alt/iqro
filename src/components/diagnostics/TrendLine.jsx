import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * TrendLine — haftalik tayyorlik tendensiyasi (mayda sparkline + o'zgarish).
 *
 * Sokin ko'rinish: to'ldirishsiz, gradientsiz, faqat bitta chiziq.
 * Nuqta 2 tadan kam bo'lsa umuman chizilmaydi — bitta nuqtali "grafik"
 * o'sish haqida hech narsa aytmaydi.
 *
 * props:
 *   trend — readinessTrend(...) natijasi: { points, delta, weeks }
 *   width, height — sparkline o'lchami
 */
const TrendLine = ({ trend, width = 68, height = 22 }) => {
  const { t } = useTranslation();
  if (!trend || trend.delta === null || trend.points.length < 2) return null;

  const { points, delta, weeks } = trend;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  // Chiziq: chapdan o'ngga, tepa = yuqori ball
  const step = width / (points.length - 1);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');

  const up = delta > 1;
  const down = delta < -1;
  const color = up ? 'var(--green)' : down ? 'var(--amber)' : 'var(--text3)';
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden
        style={{ overflow: 'visible', flexShrink: 0 }}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle
          cx={width}
          cy={(height - ((points[points.length - 1] - min) / span) * height).toFixed(1)}
          r="2.2" fill={color}
        />
      </svg>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 'var(--fs-xs)', fontWeight: 700, color,
      }}>
        <Icon size={12} />
        {delta > 0 ? '+' : ''}{delta}
      </span>
      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)' }}>
        {t('analysis.trendWeeks', { count: weeks })}
      </span>
    </div>
  );
};

export default TrendLine;
