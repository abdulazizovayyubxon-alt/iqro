/**
 * SimpleSplash.jsx — Oddiy statik splash ekran (refresh uchun)
 *
 * Foydalanuvchi sahifani yangilaganda (F5/pull-to-refresh) video splash
 * o'rniga shu qisqa va yengil splash ko'rsatiladi:
 *   - To'q navy fon (#0A2440) — video splash bilan bir xil
 *   - Zehin logotipi markazda
 *   - Yumshoq fade-in → qisqa pauza → fade-out (jami ~1 soniya)
 *
 * Video yuklamaydi, vibratsiya yo'q — tezkor va yengil.
 */
import React, { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';

const DISPLAY_MS = 600;  // Logo ko'rsatish vaqti
const FADE_MS = 400;     // Fade-out davomiyligi

export default function SimpleSplash({ onComplete }) {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);
  const done = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, FADE_MS);
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A2440',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <BrandLogo size={52} variant="azure" />
    </div>
  );
}
