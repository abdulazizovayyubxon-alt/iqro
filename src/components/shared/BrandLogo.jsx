import React from 'react';

/**
 * BrandLogo — "Zehin" multiline contour-line SVG logosi.
 *
 * Parallel chiziqli (contour) geometrik uslubdagi "zehin" yozuvi.
 * CSS o'zgaruvchilari orqali kunduzgi / tonggi (sepia) / tungi rejimga
 * avtomatik moslashadi:
 *   --logo-stroke  : asosiy chiziq rangi (kunduzgi: navy, tungi: oq)
 *   --logo-accent  : ikkinchi darajali accent (azure ko'k)
 *
 * @param {number}  size      Logotip balandligi (px). Default: 32
 * @param {string}  className Tashqi CSS klasslari
 * @param {object}  style     Tashqi inline uslublar
 * @param {string}  as        Konteyner teg nomi (default: 'span')
 */
export default function BrandLogo({ size = 32, style = {}, className = '', as: Tag = 'span' }) {
  // Logotip nisbati: kenglik / balandlik = 3.2 : 1
  const h = size;
  const w = Math.round(size * 3.2);

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
      <svg
        width={w}
        height={h}
        viewBox="0 0 320 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/*
          Multiline contour-line uslub:
          Har bir harf parallel qalin chiziqlar orqali ifodalangan.
          --logo-stroke: asosiy harflar rangi
          --logo-accent: ichki accent chiziqlar (azure ko'k)
        */}

        {/* ═══ Z ═══ */}
        {/* Yuqori gorizontal */}
        <line x1="4" y1="10" x2="44" y2="10" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="6" y1="17" x2="42" y2="17" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        {/* Diagonal */}
        <line x1="44" y1="10" x2="4" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="38" y1="10" x2="10" y2="82" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="32" y1="10" x2="16" y2="74" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
        {/* Pastki gorizontal */}
        <line x1="4" y1="90" x2="44" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="6" y1="83" x2="42" y2="83" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>

        {/* ═══ E ═══ */}
        {/* Chap vertikal */}
        <line x1="56" y1="10" x2="56" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="63" y1="10" x2="63" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="69" y1="14" x2="69" y2="86" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
        {/* Yuqori gorizontal */}
        <line x1="56" y1="10" x2="96" y2="10" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="56" y1="17" x2="92" y2="17" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        {/* O'rta gorizontal */}
        <line x1="56" y1="50" x2="90" y2="50" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="56" y1="57" x2="86" y2="57" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        {/* Pastki gorizontal */}
        <line x1="56" y1="90" x2="96" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="56" y1="83" x2="92" y2="83" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>

        {/* ═══ H ═══ */}
        {/* Chap vertikal */}
        <line x1="108" y1="10" x2="108" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="115" y1="10" x2="115" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="121" y1="14" x2="121" y2="86" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
        {/* O'rta gorizontal */}
        <line x1="108" y1="50" x2="148" y2="50" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="108" y1="57" x2="148" y2="57" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="108" y1="43" x2="148" y2="43" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
        {/* O'ng vertikal */}
        <line x1="148" y1="10" x2="148" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="141" y1="10" x2="141" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="135" y1="14" x2="135" y2="86" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>

        {/* ═══ I ═══ */}
        {/* Vertikal chiziq */}
        <line x1="162" y1="10" x2="162" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="169" y1="10" x2="169" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        {/* Nuqta (doira) */}
        <circle cx="165" cy="5" r="5" fill="var(--logo-stroke)"/>
        <circle cx="165" cy="5" r="2.5" fill="var(--logo-accent)" fillOpacity="0.7"/>

        {/* ═══ N ═══ */}
        {/* Chap vertikal */}
        <line x1="183" y1="10" x2="183" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="190" y1="10" x2="190" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="196" y1="14" x2="196" y2="86" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
        {/* Diagonal */}
        <line x1="183" y1="10" x2="223" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="189" y1="10" x2="229" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="195" y1="10" x2="235" y2="90" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
        {/* O'ng vertikal */}
        <line x1="223" y1="10" x2="223" y2="90" stroke="var(--logo-stroke)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="216" y1="10" x2="216" y2="90" stroke="var(--logo-accent)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7"/>
        <line x1="210" y1="14" x2="210" y2="86" stroke="var(--logo-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
      </svg>
    </Tag>
  );
}
