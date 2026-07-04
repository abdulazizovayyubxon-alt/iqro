import React from 'react';

/**
 * BrandLogo — "toifa pro" so'z-logosi (yagona brend belgisi).
 *
 * Variant C (lowercase, zamonaviy): "toifa" qora (--text), "pro" azure (--accent).
 * Faqat matn — alohida rasm/asset kerak emas, shuning uchun favikondan splash va
 * ulashish kartasigacha hamma joyda bir xil ko'rinadi. Rang temaga (kunduzgi/sepia/
 * tungi) avtomatik moslashadi, chunki CSS o'zgaruvchilaridan foydalanadi.
 *
 * @param {number} size  font-size (px). Boshqa hammasi shunga nisbatan (em) o'lchanadi.
 * @param {object} style tashqi uslublar (margin, vh. k.)
 * @param {string} as    qaysi teg sifatida render qilinsin (default: 'span')
 */
export default function BrandLogo({ size = 28, style = {}, className = '', as: Tag = 'span' }) {
  const squircleSize = size;
  const borderRadius = Math.round(squircleSize * 0.25);
  const tpFontSize = Math.round(squircleSize * 0.52);
  const gapSize = Math.round(squircleSize * 0.28);
  const textFontSize = Math.round(squircleSize * 0.64);
  const marginTopOffset = -Math.round(squircleSize * 0.07);

  return (
    <Tag
      className={className}
      aria-label="ToifaPro"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${gapSize}px`,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Squircle "tp" Mark */}
      <span
        style={{
          width: `${squircleSize}px`,
          height: `${squircleSize}px`,
          borderRadius: `${borderRadius}px`,
          background: '#0E97E0', // Always brand blue
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: `${tpFontSize}px`,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            marginTop: `${marginTopOffset}px`,
          }}
        >
          tp
        </span>
      </span>

      {/* "ToifaPro" Wordmark */}
      <span
        style={{
          fontSize: `${textFontSize}px`,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          display: 'inline-flex',
        }}
      >
        <span style={{ color: 'var(--logo-toifa)' }}>Toifa</span>
        <span style={{ color: 'var(--logo-pro)' }}>Pro</span>
      </span>
    </Tag>
  );
}
