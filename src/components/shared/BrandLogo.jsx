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
  return (
    <Tag
      className={className}
      aria-label="toifa pro"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: size,
        letterSpacing: '-0.045em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        display: 'inline-flex',
        alignItems: 'baseline',
        ...style,
      }}
    >
      <span style={{ fontWeight: 700, color: 'var(--text)' }}>toifa</span>
      <span style={{ fontWeight: 500, color: 'var(--accent)', marginLeft: '0.09em' }}>pro</span>
    </Tag>
  );
}
