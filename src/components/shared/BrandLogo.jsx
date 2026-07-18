import React from 'react';

/**
 * Zehin yakuniy (27a) belgisi va lockup'i.
 *
 * Belgi: yumaloq varaq, past-o'ng burchagi 45° buklangan (azure) — sahifa
 * aylanmoqda: o'rganish, keyingi bosqich.
 *
 * Rang variantlari (brend qoidasi):
 *  - light (oq/och fon):  doira #12305A, buklama #05A3FA (+lip #4FB4F7)
 *  - navy  (to'q fon):    doira #fff,    buklama #05A3FA (+lip)
 *  - azure (azure fon):   doira #fff,    buklama #0A2440 SOLID (shaffoflik YO'Q —
 *                         kulrang bo'lib qoladi), lip ishlatilmaydi
 * 32px dan kichik o'lchamda lip (och ichki qatlam) olib tashlanadi.
 */

const MARK_COLORS = {
  light: { circle: '#12305A', fold: '#05A3FA', lip: '#4FB4F7' },
  navy: { circle: '#FFFFFF', fold: '#05A3FA', lip: '#6FC5FB' },
  azure: { circle: '#FFFFFF', fold: '#0A2440', lip: null },
};

const FOLD_PATH = 'M45 24 A21 21 0 0 1 24 45 Q41.06 38.44 37.78 27.28 Q37.13 24 45 24 Z';
const LIP_PATH = 'M45 24 Q37.13 24 37.78 27.28 Q39.75 35.81 29.91 42.38 Q42.38 35.81 45 24 Z';

/** Yakka belgi (wordmark'siz) — masalan, kichik avatar/badge joylari uchun. */
export function ZehinMark({ size = 24, variant = 'light', className = '', style = {} }) {
  const c = MARK_COLORS[variant] || MARK_COLORS.light;
  const withLip = size >= 32 && c.lip;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={{ display: 'block', ...style }}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="21" fill={c.circle} />
      <g transform="rotate(45 24 24)">
        <path d={FOLD_PATH} fill={c.fold} />
        {withLip ? <path d={LIP_PATH} fill={c.lip} /> : null}
      </g>
    </svg>
  );
}

/**
 * BrandLogo — "Zehin" lockup'i: Plus Jakarta Sans ExtraBold wordmark,
 * "i" nuqtasi belgi bilan almashtirilgan (dotsiz "ı" + belgi-nuqta).
 *
 * @param {number} size    Lockup balandligi (px). Default: 32
 * @param {string} variant 'auto' (temaga moslashadi: och fonda navy, tungi
 *                         rejimda oq) yoki 'azure' (azure fonda: oq matn,
 *                         buklama navy solid). Ranglar index.css'dagi
 *                         .brand-lockup qoidalari bilan birga ishlaydi.
 */
export default function BrandLogo({ size = 32, variant = 'auto', style = {}, className = '', as: Tag = 'span' }) {
  // Nuqta (belgi) harf tepasidan chiqib turadi — shu overhang bilan birga umumiy
  // balandlik ≈ size bo'lishi uchun font biroz kichikroq olinadi.
  const fs = Math.round(size * 0.82);
  const azure = variant === 'azure';
  const foldColor = azure ? '#0A2440' : '#05A3FA';

  return (
    <Tag
      className={`brand-lockup${azure ? ' brand-lockup--azure' : ''}${className ? ' ' + className : ''}`}
      aria-label="Zehin"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: size,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        fontWeight: 800,
        fontSize: fs,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span aria-hidden="true">
        Zeh
        <span className="bl-i">
          {'ı'}
          {/* nuqta-belgi: doira matn rangida (currentColor), buklama variantga ko'ra */}
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="currentColor" />
            <g transform="rotate(45 24 24)">
              <path d={FOLD_PATH} fill={foldColor} />
            </g>
          </svg>
        </span>
        n
      </span>
    </Tag>
  );
}

/**
 * Canvas'ga lockup chizish (ResultShareCard kabi rasm-eksport joylari uchun).
 * DOM versiyasi bilan bir xil geometriya: dot ≈ 0.34em, "ı" ustuni markazida.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX   Lockup markazining X koordinatasi
 * @param {number} baselineY Matn bazasi (baseline) Y koordinatasi
 * @param {number} fontSize  Wordmark o'lchami (px)
 * @param {{text?: string, fold?: string}} colors
 */
export function drawZehinLockup(ctx, centerX, baselineY, fontSize, colors = {}) {
  const textColor = colors.text || '#12305A';
  const foldColor = colors.fold || '#05A3FA';
  const word = 'Zehın';

  ctx.save();
  ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', Inter, system-ui, sans-serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(-0.03 * fontSize).toFixed(2)}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = textColor;

  const total = ctx.measureText(word).width;
  const x0 = centerX - total / 2;
  ctx.fillText(word, x0, baselineY);

  // "ı" ustuni markazi — nuqta-belgi shu vertikalda
  const stemX = x0 + ctx.measureText('Zeh').width + ctx.measureText('ı').width / 2;
  const r = fontSize * 0.17; // dot ≈ 0.34em
  const cy = baselineY - fontSize * 0.77; // DOM versiyasi bilan bir xil (o'lchangan)

  // Doira (matn rangida)
  ctx.beginPath();
  ctx.arc(stemX, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Buklama — SVG'dagi path'ning canvas talqini (48-viewBox, 45° burilgan);
  // dot < 32px bo'lgani uchun lip chizilmaydi
  ctx.translate(stemX, cy);
  ctx.scale((r * 2) / 42, (r * 2) / 42); // viewBox'da doira diametri 42
  ctx.translate(-24, -24);
  ctx.translate(24, 24);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-24, -24);
  ctx.beginPath();
  ctx.moveTo(45, 24);
  ctx.arc(24, 24, 21, 0, Math.PI / 2, false);
  ctx.quadraticCurveTo(41.06, 38.44, 37.78, 27.28);
  ctx.quadraticCurveTo(37.13, 24, 45, 24);
  ctx.closePath();
  ctx.fillStyle = foldColor;
  ctx.fill();
  ctx.restore();
}
