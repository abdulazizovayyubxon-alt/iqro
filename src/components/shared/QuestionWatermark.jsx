import React, { useId } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Qisqa ID ni kanonik 4 xonali formatga keltiradi (masalan: "A001" -> "A0001").
 */
function normalizeShortId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().toUpperCase();
  const m = /^([A-Z]{1,2})(\d{1,4})$/.exec(trimmed);
  if (m) return `${m[1]}${m[2].padStart(4, '0')}`;
  return trimmed;
}

/**
 * QuestionWatermark — Savol, variantlar va ilmiy izoh kartasi ustiga
 * tushadigan sezilar-sezilmas himoya suv belgisi (foydalanuvchi ID raqami bilan).
 *
 * Maqsad:
 *  - Savollar bazasi va izohlarni skrinshot/ekran videosi orqali
 *    noqonuniy tarqatishning oldini olish va manbani aniqlash (`shortId`).
 *  - Oddiy o'qishda ko'zni charchatmaslik uchun past shaffoflik (`opacity: 0.045`),
 *    kunduzgi, tungi va sepia rejimlarida `var(--text)` orqali avtomatik moslashadi.
 */
export default function QuestionWatermark() {
  const { user, userDoc } = useAuth() || {};
  const rawUid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const patId = `zh-wm-${rawUid}`;

  const rawShortId = userDoc?.shortId || user?.shortId || '';
  const idCode = normalizeShortId(rawShortId)
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
        opacity: 0.045,
      }}
    >
      <defs>
        <pattern
          id={patId}
          width="260"
          height="96"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-22)"
        >
          <text
            x="130"
            y="52"
            textAnchor="middle"
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
