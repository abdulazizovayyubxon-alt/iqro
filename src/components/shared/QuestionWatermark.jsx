import React, { useId } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * QuestionWatermark — Savol, variantlar va ilmiy izoh kartasi ustiga
 * tushadigan sezilar-sezilmas himoya suv belgisi (foydalanuvchi ID raqami bilan).
 *
 * Maqsad:
 *  - Savollar bazasi va izohlarni skrinshot/ekran videosi orqali
 *    noqonuniy tarqatishning oldini olish va manbani aniqlash (`shortId`).
 *  - Oddiy o'qishda ko'zni charchatmaslik uchun past shaffoflik (`opacity: 0.042`),
 *    kunduzgi, tungi va sepia rejimlarida `var(--text)` orqali avtomatik moslashadi.
 */
export default function QuestionWatermark() {
  const { user, userDoc } = useAuth() || {};
  const rawUid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const patId = `zh-wm-${rawUid}`;

  const idCode = user?.shortId
    || userDoc?.shortId
    || (user?.uid ? user.uid.slice(0, 6).toUpperCase() : '');

  const label = idCode ? `ZEHIN · ID ${idCode}` : 'ZEHIN PLATFORMASI';

  return (
    <svg
      aria-hidden="true"
      className="question-watermark"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 1,
        borderRadius: 'inherit',
        color: 'var(--text)',
        opacity: 0.042,
      }}
    >
      <defs>
        <pattern
          id={patId}
          width="240"
          height="130"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-22)"
        >
          <text
            x="16"
            y="42"
            fill="currentColor"
            fontSize="12"
            fontWeight="800"
            letterSpacing="1.2"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            {label}
          </text>
          <text
            x="136"
            y="106"
            fill="currentColor"
            fontSize="12"
            fontWeight="800"
            letterSpacing="1.2"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            {label}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patId})`} />
    </svg>
  );
}
