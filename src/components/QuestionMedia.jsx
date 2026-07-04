/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     QuestionMedia.jsx — Toifa Pro Platformasi               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Savol uchun universal media komponenti.                     ║
 * ║  Uch xil media turini qo'llab-quvvatlaydi:                  ║
 * ║    1. image — URL yoki base64 rasm                           ║
 * ║    2. svg   — inline SVG kodi (sxema, diagramma)             ║
 * ║    3. diagram — oldindan tayyor taktik/tibbiy sxemalar       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

// ── OLDINDAN TAYYOR DIAGRAMMALAR ──────────────────────────────────────────────
// "diagram" maydoniga shu kalitlardan birini yozing — SVG avtomatik chiziladi

const DIAGRAMS = {

  // ── Tourniquet (жгут) qo'yish joylari ──────────────────────
  tourniquet: (
    <svg viewBox="0 0 320 420" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 320, height: 'auto' }}>
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#E53E3E" />
        </marker>
      </defs>

      {/* Fon */}
      <rect width="320" height="420" fill="var(--bg2,#F8FAFC)" rx="16" />

      {/* Sarlavha */}
      <text x="160" y="28" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--text,#1A202C)" fontFamily="IBM Plex Mono, monospace">
        Tourniquet qo'yish joylari
      </text>

      {/* ── Tana sxemasi ── */}
      {/* Bosh */}
      <ellipse cx="160" cy="70" rx="28" ry="32" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      {/* Bo'yin */}
      <rect x="150" y="100" width="20" height="18" rx="4" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      {/* Tana */}
      <rect x="120" y="116" width="80" height="100" rx="10" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />

      {/* Chap qo'l */}
      <rect x="78" y="118" width="44" height="18" rx="8" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      <rect x="64" y="134" width="18" height="60" rx="8" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      <rect x="58" y="192" width="16" height="50" rx="7" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />

      {/* O'ng qo'l */}
      <rect x="198" y="118" width="44" height="18" rx="8" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      <rect x="238" y="134" width="18" height="60" rx="8" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      <rect x="246" y="192" width="16" height="50" rx="7" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />

      {/* Chap oyoq */}
      <rect x="126" y="214" width="28" height="90" rx="10" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      <rect x="122" y="302" width="26" height="70" rx="8" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />

      {/* O'ng oyoq */}
      <rect x="166" y="214" width="28" height="90" rx="10" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />
      <rect x="172" y="302" width="26" height="70" rx="8" fill="#FDDCB5" stroke="#CBD5E0" strokeWidth="1.5" />

      {/* ── Tourniquet joylari (qizil chiziq + label) ── */}

      {/* Chap yelka */}
      <rect x="76" y="128" width="48" height="6" rx="3" fill="#E53E3E" opacity="0.85" />
      <line x1="50" y1="131" x2="74" y2="131" stroke="#E53E3E" strokeWidth="1.5"
        strokeDasharray="3,2" markerEnd="url(#arr)" />
      <text x="8" y="127" fontSize="9" fill="#E53E3E" fontWeight="700"
        fontFamily="IBM Plex Mono, monospace">Yelka</text>
      <text x="8" y="138" fontSize="9" fill="#E53E3E"
        fontFamily="IBM Plex Mono, monospace">yuqori</text>

      {/* Chap bilak */}
      <rect x="62" y="185" width="22" height="6" rx="3" fill="#E53E3E" opacity="0.85" />
      <line x1="36" y1="188" x2="60" y2="188" stroke="#E53E3E" strokeWidth="1.5"
        strokeDasharray="3,2" markerEnd="url(#arr)" />
      <text x="2" y="184" fontSize="9" fill="#E53E3E" fontWeight="700"
        fontFamily="IBM Plex Mono, monospace">Bilak</text>
      <text x="2" y="195" fontSize="9" fill="#E53E3E"
        fontFamily="IBM Plex Mono, monospace">yuqori</text>

      {/* O'ng yelka */}
      <rect x="196" y="128" width="48" height="6" rx="3" fill="#E53E3E" opacity="0.85" />
      <line x1="270" y1="131" x2="246" y2="131" stroke="#E53E3E" strokeWidth="1.5"
        strokeDasharray="3,2" markerEnd="url(#arr)" />
      <text x="272" y="127" fontSize="9" fill="#E53E3E" fontWeight="700"
        fontFamily="IBM Plex Mono, monospace">Yelka</text>
      <text x="272" y="138" fontSize="9" fill="#E53E3E"
        fontFamily="IBM Plex Mono, monospace">yuqori</text>

      {/* O'ng bilak */}
      <rect x="236" y="185" width="22" height="6" rx="3" fill="#E53E3E" opacity="0.85" />
      <line x1="280" y1="188" x2="260" y2="188" stroke="#E53E3E" strokeWidth="1.5"
        strokeDasharray="3,2" markerEnd="url(#arr)" />
      <text x="282" y="184" fontSize="9" fill="#E53E3E" fontWeight="700"
        fontFamily="IBM Plex Mono, monospace">Bilak</text>
      <text x="282" y="195" fontSize="9" fill="#E53E3E"
        fontFamily="IBM Plex Mono, monospace">yuqori</text>

      {/* Chap son */}
      <rect x="122" y="222" width="32" height="6" rx="3" fill="#E53E3E" opacity="0.85" />
      <line x1="90" y1="225" x2="120" y2="225" stroke="#E53E3E" strokeWidth="1.5"
        strokeDasharray="3,2" markerEnd="url(#arr)" />
      <text x="50" y="221" fontSize="9" fill="#E53E3E" fontWeight="700"
        fontFamily="IBM Plex Mono, monospace">Son</text>
      <text x="46" y="232" fontSize="9" fill="#E53E3E"
        fontFamily="IBM Plex Mono, monospace">yuqori</text>

      {/* O'ng son */}
      <rect x="166" y="222" width="32" height="6" rx="3" fill="#E53E3E" opacity="0.85" />
      <line x1="230" y1="225" x2="200" y2="225" stroke="#E53E3E" strokeWidth="1.5"
        strokeDasharray="3,2" markerEnd="url(#arr)" />
      <text x="232" y="221" fontSize="9" fill="#E53E3E" fontWeight="700"
        fontFamily="IBM Plex Mono, monospace">Son</text>
      <text x="228" y="232" fontSize="9" fill="#E53E3E"
        fontFamily="IBM Plex Mono, monospace">yuqori</text>

      {/* Izoh pastda */}
      <rect x="20" y="390" width="280" height="22" rx="6" fill="#FED7D7" />
      <text x="160" y="405" textAnchor="middle" fontSize="10" fill="#C53030"
        fontWeight="600" fontFamily="IBM Plex Mono, monospace">
        Jarohatdan 5-7 sm YUQORIDA qo'yiladi
      </text>
    </svg>
  ),

  // ── CPR bosqichlari ─────────────────────────────────────────
  cpr_steps: (
    <svg viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 340, height: 'auto' }}>
      <rect width="340" height="200" fill="var(--bg2,#F8FAFC)" rx="16" />
      <text x="170" y="24" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--text,#1A202C)" fontFamily="IBM Plex Mono, monospace">
        CPR — Reanimatsiya tartibi
      </text>

      {/* Qadamlar */}
      {[
        { n: '1', label: 'Xavfsizlik', sub: 'Maydonni tekshir', color: '#3182CE', x: 20 },
        { n: '2', label: 'Holat', sub: "Javob bor/yo'q?", color: '#805AD5', x: 90 },
        { n: '3', label: 'Yordam', sub: 'Tez yordam chaqir', color: '#D69E2E', x: 160 },
        { n: '4', label: '30:2', sub: '30 bosish, 2 nafas', color: '#E53E3E', x: 230 },
        { n: '5', label: 'AED', sub: "Defibrillyator qo'y", color: '#38A169', x: 300 },
      ].map(({ n, label, sub, color, x }, i, arr) => (
        <g key={n}>
          {/* O'q (oxirgisidan tashqari) */}
          {i < arr.length - 1 && (
            <line x1={x + 28} y1="100" x2={x + 68} y2="100"
              stroke="#CBD5E0" strokeWidth="2" strokeDasharray="4,3" />
          )}
          {/* Doira */}
          <circle cx={x + 14} cy="75" r="20" fill={color} opacity="0.15" />
          <circle cx={x + 14} cy="75" r="14" fill={color} />
          <text x={x + 14} y="80" textAnchor="middle" fontSize="13" fontWeight="800"
            fill="#fff" fontFamily="IBM Plex Mono, monospace">{n}</text>
          {/* Label */}
          <text x={x + 14} y="110" textAnchor="middle" fontSize="10" fontWeight="700"
            fill={color} fontFamily="IBM Plex Mono, monospace">{label}</text>
          <text x={x + 14} y="123" textAnchor="middle" fontSize="8.5"
            fill="var(--text2,#718096)" fontFamily="IBM Plex Mono, monospace">{sub}</text>
        </g>
      ))}

      {/* Pastki izoh */}
      <rect x="20" y="148" width="300" height="40" rx="8" fill="#FFF5F5" stroke="#FED7D7" strokeWidth="1" />
      <text x="170" y="164" textAnchor="middle" fontSize="10" fontWeight="700"
        fill="#C53030" fontFamily="IBM Plex Mono, monospace">
        30 ta ko'krak siqish → 2 ta sun'iy nafas
      </text>
      <text x="170" y="179" textAnchor="middle" fontSize="9"
        fill="#E53E3E" fontFamily="IBM Plex Mono, monospace">
        Tezlik: 100–120 marta/daqiqa | Chuqurlik: 5–6 sm
      </text>
    </svg>
  ),

  // ── Mudofaa pozitsiyasi (taktik sxema) ─────────────────────
  tactical_defense: (
    <svg viewBox="0 0 340 240" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 340, height: 'auto' }}>
      <rect width="340" height="240" fill="var(--bg2,#F8FAFC)" rx="16" />
      <text x="170" y="24" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--text,#1A202C)" fontFamily="IBM Plex Mono, monospace">
        Mudofaa pozitsiyasi sxemasi
      </text>

      {/* Yer */}
      <rect x="20" y="180" width="300" height="40" rx="6" fill="#C6F6D5" stroke="#9AE6B4" strokeWidth="1.5" />
      <text x="170" y="205" textAnchor="middle" fontSize="10" fill="#276749"
        fontFamily="IBM Plex Mono, monospace">Mudofaa chizig'i</text>

      {/* Xandaq / pozitsiya */}
      {[60, 160, 260].map((cx, i) => (
        <g key={i}>
          <ellipse cx={cx} cy="178" rx="24" ry="10"
            fill="#744210" stroke="#92400E" strokeWidth="1.5" opacity="0.7" />
          <text x={cx} y="182" textAnchor="middle" fontSize="9"
            fill="#fff" fontWeight="700" fontFamily="IBM Plex Mono, monospace">Xandaq</text>
          {/* Askar */}
          <circle cx={cx} cy="155" r="10" fill="#2D3748" />
          <line x1={cx} y1="145" x2={cx} y2="130" stroke="#2D3748" strokeWidth="8" strokeLinecap="round" />
          {/* Qurol yo'nalishi */}
          <line x1={cx + 8} y1="142" x2={cx + 35} y2="110"
            stroke="#E53E3E" strokeWidth="2" strokeDasharray="4,2"
            markerEnd="url(#arr2)" />
        </g>
      ))}

      <defs>
        <marker id="arr2" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#E53E3E" />
        </marker>
        <marker id="arr3" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#3182CE" />
        </marker>
      </defs>

      {/* Dushman yo'nalishi */}
      <text x="170" y="55" textAnchor="middle" fontSize="10" fill="#E53E3E"
        fontWeight="700" fontFamily="IBM Plex Mono, monospace">▼ Dushman hujumi</text>
      {[80, 160, 240].map((x, i) => (
        <line key={i} x1={x} y1="62" x2={x} y2="95"
          stroke="#E53E3E" strokeWidth="1.5" strokeDasharray="5,3"
          markerEnd="url(#arr2)" />
      ))}

      {/* Aloqa chizig'i */}
      <line x1="60" y1="155" x2="260" y2="155"
        stroke="#3182CE" strokeWidth="1.5" strokeDasharray="6,3" />
      <text x="170" y="148" textAnchor="middle" fontSize="9" fill="#3182CE"
        fontFamily="IBM Plex Mono, monospace">— — Aloqa chizig'i — —</text>

      {/* Zaxira */}
      <rect x="140" y="95" width="60" height="24" rx="6"
        fill="#EBF8FF" stroke="#BEE3F8" strokeWidth="1.5" />
      <text x="170" y="111" textAnchor="middle" fontSize="9" fill="#2C5282"
        fontWeight="700" fontFamily="IBM Plex Mono, monospace">Zaxira guruh</text>
    </svg>
  ),

  // ── Yong'in uchburchagi ─────────────────────────────────────
  fire_triangle: (
    <svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 300, height: 'auto' }}>
      <rect width="300" height="240" fill="var(--bg2,#F8FAFC)" rx="16" />
      <text x="150" y="24" textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--text,#1A202C)" fontFamily="IBM Plex Mono, monospace">
        Yong'in uchburchagi
      </text>

      {/* Uchburchak */}
      <polygon points="150,45 40,195 260,195"
        fill="none" stroke="#E53E3E" strokeWidth="3" strokeLinejoin="round" />

      {/* Gradyan fon */}
      <polygon points="150,55 50,185 250,185"
        fill="url(#fireGrad)" opacity="0.15" />
      <defs>
        <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FC8181" />
          <stop offset="100%" stopColor="#F6AD55" />
        </linearGradient>
      </defs>

      {/* Yong'in belgisi */}
      <text x="150" y="130" textAnchor="middle" fontSize="36">🔥</text>

      {/* Uchlar */}
      {/* Yuqori — Issiqlik */}
      <circle cx="150" cy="46" r="22" fill="#E53E3E" />
      <text x="150" y="41" textAnchor="middle" fontSize="9" fill="#fff"
        fontWeight="700" fontFamily="IBM Plex Mono, monospace">Issiqlik</text>
      <text x="150" y="54" textAnchor="middle" fontSize="8" fill="#FED7D7"
        fontFamily="IBM Plex Mono, monospace">Heat</text>

      {/* Chap — Yoqilg'i */}
      <circle cx="40" cy="195" r="22" fill="#D69E2E" />
      <text x="40" y="190" textAnchor="middle" fontSize="9" fill="#fff"
        fontWeight="700" fontFamily="IBM Plex Mono, monospace">Yoqilg'i</text>
      <text x="40" y="203" textAnchor="middle" fontSize="8" fill="#FEFCBF"
        fontFamily="IBM Plex Mono, monospace">Fuel</text>

      {/* O'ng — Kislorod */}
      <circle cx="260" cy="195" r="22" fill="#3182CE" />
      <text x="260" y="190" textAnchor="middle" fontSize="9" fill="#fff"
        fontWeight="700" fontFamily="IBM Plex Mono, monospace">Kislorod</text>
      <text x="260" y="203" textAnchor="middle" fontSize="8" fill="#BEE3F8"
        fontFamily="IBM Plex Mono, monospace">O₂</text>

      {/* Pastki izoh */}
      <text x="150" y="228" textAnchor="middle" fontSize="9" fill="var(--text2,#718096)"
        fontFamily="IBM Plex Mono, monospace">
        Birini yo'q qiling → yong'in o'chadi
      </text>
    </svg>
  ),

};

// ── ASOSIY KOMPONENT ──────────────────────────────────────────────────────────

/**
 * Props:
 *   question  — savol ob'ekti ({ image?, svg?, diagram? })
 *   style     — qo'shimcha CSS uslub (ixtiyoriy)
 */
// Emblem-tasma (6 ta belgi yonma-yon) kabi rasmni gridga aylantiradi.
// FAQAT savol `imageCols` maydoni bilan aniq belgilaganda ishlatiladi (avtomatik emas).
// CSS background-position orqali har bir katakda rasimning 1/N qismi ko'rsatiladi.
function WideImageGrid({ src, cols = 6, perRow = 3 }) {
  const cells = Array.from({ length: cols }, (_, i) => i);
  // backgroundSize: '600% auto' → rasm 6× keng, har katak 1/6 ni ko'rsatadi
  const bgSize = `${cols * 100}% auto`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${perRow}, 1fr)`, gap: '6px', marginBottom: '16px' }}>
      {cells.map(i => (
        <div
          key={i}
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: bgSize,
            backgroundPosition: `${cols === 1 ? 0 : (i / (cols - 1)) * 100}% 50%`,
            backgroundRepeat: 'no-repeat',
            height: '100px',
            borderRadius: '10px',
            border: '1px solid var(--glass-border)',
            background: `url(${src}) ${cols === 1 ? 0 : (i / (cols - 1)) * 100}% 50% / ${bgSize} no-repeat var(--bg3)`,
          }}
        />
      ))}
    </div>
  );
}

export default function QuestionMedia({ question, style }) {
  const [imgError, setImgError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (!question) return null;

  const { image, svg, diagram, imageCols } = question;

  // 1. Hech narsa yo'q — ko'rsatmaslik
  if (!image && !svg && !diagram) return null;

  const containerStyle = {
    margin: '0 0 20px',
    textAlign: 'center',
    ...style,
  };

  // 2. Oldindan tayyor diagramma
  if (diagram && DIAGRAMS[diagram]) {
    return (
      <div style={containerStyle}>
        {DIAGRAMS[diagram]}
      </div>
    );
  }

  // 3. Inline SVG
  if (svg) {
    return (
      <div
        style={containerStyle}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // 4. Rasm (URL yoki base64)
  if (image && !imgError) {
    // Grid faqat ANIQ belgilanganda (masalan emblem-tasma: `imageCols: 6`).
    // Avtomatik nisbatga qarab bo'lish YO'Q — u butun diagrammalarni kesib tashlardi.
    if (imageCols && imageCols > 1) {
      return (
        <div style={{ margin: '0 0 16px' }}>
          <WideImageGrid src={image} cols={imageCols} perRow={Math.min(imageCols, 3)} />
        </div>
      );
    }

    // Odatiy: rasm to'liq, kenglikka moslab — hech qachon kesilmaydi. Bosilsa kattalashadi.
    return (
      <>
        <div style={containerStyle}>
          <img
            src={image}
            alt="Savol rasmi"
            onClick={() => setZoomed(true)}
            onError={() => setImgError(true)}
            style={{
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              maxHeight: '340px',
              borderRadius: '16px',
              border: '1px solid var(--glass-border)',
              objectFit: 'contain',
              cursor: 'zoom-in',
            }}
          />
        </div>
        {zoomed && createPortal(
          <div
            onClick={() => setZoomed(false)}
            role="dialog"
            aria-label="Rasm"
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(0,0,0,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px', cursor: 'zoom-out',
            }}
          >
            <img
              src={image}
              alt="Savol rasmi (kattalashtirilgan)"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>,
          document.body
        )}
      </>
    );
  }

  // Rasm yuklanmadi
  if (imgError) {
    return (
      <div style={{
        ...containerStyle,
        padding: '16px',
        borderRadius: '16px',
        background: 'var(--glass-bg)',
        border: '1px dashed var(--glass-border)',
        color: 'var(--text2)',
        fontSize: '13px',
      }}>
        🖼️ Rasm yuklanmadi
      </div>
    );
  }

  return null;
}
