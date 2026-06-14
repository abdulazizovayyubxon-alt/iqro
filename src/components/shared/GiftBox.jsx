import React from 'react';

/**
 * GiftBox — ilovaning yagona "sovg'a" ikonkasi.
 * Ko'k nuqtali quti + qizil tasma va bant. Emoji o'rniga SVG —
 * shunda barcha qurilmalarda (Android/iOS/Windows) bir xil ko'rinadi.
 */
export default function GiftBox({ size = 28, style, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={style}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Quti tanasi */}
      <rect x="9" y="22" width="30" height="20" rx="3" fill="#4F8EF7" />
      {/* Tana soyasi (pastki yarmi biroz to'qroq) */}
      <path d="M9 33h30v6a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3v-6z" fill="#3E7BE0" opacity="0.55" />
      {/* Qopqoq */}
      <rect x="6.5" y="16.5" width="35" height="8.5" rx="2.5" fill="#5C9CFF" />

      {/* Oq nuqtalar */}
      <g fill="#FFFFFF" opacity="0.92">
        <circle cx="14" cy="29.5" r="1.5" />
        <circle cx="19.5" cy="34.5" r="1.5" />
        <circle cx="14.5" cy="39" r="1.5" />
        <circle cx="34" cy="29.5" r="1.5" />
        <circle cx="28.5" cy="34.5" r="1.5" />
        <circle cx="33.5" cy="39" r="1.5" />
        <circle cx="11" cy="20.7" r="1.2" />
        <circle cx="37" cy="20.7" r="1.2" />
      </g>

      {/* Vertikal tasma */}
      <rect x="20.5" y="16.5" width="7" height="25.5" fill="#F0492F" />
      <rect x="20.5" y="16.5" width="2.4" height="25.5" fill="#FF6B4F" opacity="0.7" />

      {/* Bant */}
      <ellipse cx="17.5" cy="12.5" rx="5.4" ry="4.2" fill="#F0492F" />
      <ellipse cx="30.5" cy="12.5" rx="5.4" ry="4.2" fill="#F0492F" />
      <ellipse cx="17.5" cy="12.5" rx="2.4" ry="1.8" fill="#D8341E" />
      <ellipse cx="30.5" cy="12.5" rx="2.4" ry="1.8" fill="#D8341E" />
      {/* Bant tuguni */}
      <rect x="21" y="9.5" width="6" height="7" rx="2" fill="#FF6B4F" />
      <rect x="21" y="9.5" width="6" height="7" rx="2" fill="#F0492F" opacity="0.4" />
    </svg>
  );
}
