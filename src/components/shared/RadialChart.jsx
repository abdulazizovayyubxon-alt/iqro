import React from 'react';

/**
 * RadialChart — Donut shaklida foiz ko'rsatuvchi grafik
 * Ishlatiladi: Stats, AchievementsPage, Dashboard
 */
const RadialChart = ({ pct, size = 120, stroke = 10, color = 'var(--green)', label }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.25, 1, 0.5, 1)' }}
        />
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="middle"
          fill="var(--text)"
          fontSize={size * 0.18}
          fontWeight="800"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
        >
          {pct}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', fontWeight: '600', textAlign: 'center' }}>{label}</div>}
    </div>
  );
};

export default RadialChart;
