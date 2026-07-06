import React from 'react';

/**
 * TierMarks — 3 ta geometrik romb ("akademik muhr"): olingan darajalar to'ldiriladi.
 * props: tier (0-3), size (px, default 7)
 */
const TierMarks = ({ tier = 0, size = 7 }) => (
  <span
    style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexShrink: 0 }}
    role="img"
    aria-label={`3 darajadan ${tier} tasi olingan`}
  >
    {[1, 2, 3].map(lv => (
      <span
        key={lv}
        style={{
          width: size,
          height: size,
          transform: 'rotate(45deg)',
          background: lv <= tier ? 'var(--accent)' : 'transparent',
          border: lv <= tier ? '1px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 1
        }}
      />
    ))}
  </span>
);

export default TierMarks;
