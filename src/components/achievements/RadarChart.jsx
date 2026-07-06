import React from 'react';

/**
 * RadarChart — 6 o'qli mahorat radar grafigi (sof SVG, gradientsiz).
 * props:
 *   axes: [{ label: string, value: 0..1 }] — aynan 6 ta o'q
 *   width: piksel (ixtiyoriy, default 280)
 *   ringColor/gridColor/dataColor/labelColor: ixtiyoriy — to'q fonli (masalan,
 *   navy pasport karta) kontekstda mavzu o'zgaruvchilariga bog'liq bo'lmagan
 *   qattiq ranglar berish uchun (standart holatda ilova mavzusiga moslashadi)
 */
const RadarChart = ({
  axes = [],
  width = 280,
  ringColor = 'var(--border)',
  gridColor = 'var(--bg3)',
  dataColor = 'var(--accent)',
  labelColor = 'var(--text3)'
}) => {
  const W = 280, H = 200;
  const cx = 148, cy = 105, R = 62;

  // k-o'qning burchagi: tepadan boshlab soat yo'nalishida har 60°
  const point = (r, k) => {
    const a = ((-90 + k * 60) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = (r) => Array.from({ length: 6 }, (_, k) => point(r, k).map(v => v.toFixed(1)).join(',')).join(' ');

  const dataPoints = axes.map((ax, k) => point(Math.max(0.04, Math.min(1, ax.value)) * R, k));
  const dataPoly = dataPoints.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');

  // Yorliq joylashuvi: 0-tepa, 1-2 o'ng, 3-past, 4-5 chap
  const labelPos = [
    { x: cx, y: 32, anchor: 'middle' },
    { x: 208, y: 72, anchor: 'start' },
    { x: 208, y: 142, anchor: 'start' },
    { x: cx, y: 185, anchor: 'middle' },
    { x: 88, y: 142, anchor: 'end' },
    { x: 88, y: 72, anchor: 'end' }
  ];

  return (
    <svg
      width={width}
      height={(width / W) * H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={axes.map(a => `${a.label}: ${Math.round(a.value * 100)}%`).join(', ')}
      style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
    >
      {[1, 2 / 3, 1 / 3].map((f, i) => (
        <polygon key={i} points={ring(R * f)} fill="none" stroke={i === 0 ? ringColor : gridColor} strokeWidth="1" />
      ))}
      {Array.from({ length: 6 }, (_, k) => {
        const [x, y] = point(R, k);
        return <line key={k} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke={gridColor} strokeWidth="1" />;
      })}
      <polygon points={dataPoly} fill={dataColor} fillOpacity="0.16" stroke={dataColor} strokeWidth="1.5" strokeLinejoin="round" />
      {dataPoints.map(([x, y], k) => (
        <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill={dataColor} />
      ))}
      {axes.map((ax, k) => (
        <text
          key={k}
          x={labelPos[k].x}
          y={labelPos[k].y}
          textAnchor={labelPos[k].anchor}
          fontSize="11"
          fontWeight="600"
          fill={labelColor}
        >
          {ax.label}
        </text>
      ))}
    </svg>
  );
};

export default RadarChart;
