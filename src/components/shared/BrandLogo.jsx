import React from 'react';
import logoUrl from '../../assets/brand/zehin_logo.png';

/**
 * BrandLogo — "Zehin" rasmiy logotipi (qatlamli kitob-varaq uslubidagi wordmark).
 *
 * Shaffof fonli PNG; kunduzgi/tonggi rejimda asl ranglar (navy/kumush/oltin),
 * tungi rejimda CSS filter orqali oq siluetga o'tadi (index.css'dagi
 * `body.dark-theme .brand-logo-img` qoidasi).
 *
 * @param {number}  size      Logotip balandligi (px). Default: 32
 * @param {string}  className Tashqi CSS klasslari
 * @param {object}  style     Tashqi inline uslublar
 * @param {string}  as        Konteyner teg nomi (default: 'span')
 */
export default function BrandLogo({ size = 32, style = {}, className = '', as: Tag = 'span' }) {
  // Logotip nisbati: kenglik / balandlik = 996 : 306 ≈ 3.255
  const h = size;
  const w = Math.round(size * 3.255);

  return (
    <Tag
      className={className}
      aria-label="Zehin"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        lineHeight: 0,
        ...style,
      }}
    >
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="brand-logo-img"
        width={w}
        height={h}
        draggable={false}
        style={{ display: 'block', width: w, height: h, objectFit: 'contain' }}
      />
    </Tag>
  );
}
