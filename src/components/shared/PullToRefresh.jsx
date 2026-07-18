import React, { useEffect, useRef, useState } from 'react';
import { ZehinMark } from './BrandLogo';

/**
 * Brend-kitob §7 «Yangilash indikatori (pull-to-refresh)»:
 * oq doira ichida belgi, atrofida azure (#05A3FA) progress halqa —
 * yangilanish paytida 1.2s tezlikda aylanadi. Belgi 32px dan kichik
 * bo'lgani uchun bitta buklama (ZehinMark buni o'zi hal qiladi).
 */
export function RefreshRing({ size = 54, spinning = true, progress = 1, style = {} }) {
  const p = Math.min(Math.max(progress, 0), 1);
  const arcStyle = spinning
    ? undefined
    : {
        transformOrigin: '50% 50%',
        transform: `rotate(${p * 270}deg)`,
        opacity: 0.35 + p * 0.65,
      };
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 6px 18px rgba(18,48,90,0.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 54 54"
        className={spinning ? 'zh-ring-rot' : ''}
        style={{ position: 'absolute', left: 0, top: 0 }}
        aria-hidden="true"
      >
        <circle cx="27" cy="27" r="24" fill="none" stroke="#E4F3FC" strokeWidth="3" />
        <path
          d="M27 3 A24 24 0 0 1 51 27"
          fill="none"
          stroke="#05A3FA"
          strokeWidth="3"
          strokeLinecap="round"
          style={arcStyle}
        />
      </svg>
      <ZehinMark size={Math.round(size * 0.48)} variant="light" />
    </div>
  );
}

const THRESHOLD = 64; // shu masofada qo'yib yuborilsa — yangilanadi
const MAX_PULL = 108;

/**
 * Ekranni tepadan pastga tortib yangilash. Faqat touch qurilmalarda,
 * .main-content scroll'i eng tepada turganda ishlaydi; ichki scroll'ga
 * ega elementlar (ro'yxat, modal) ustida aralashmaydi.
 */
export default function PullToRefresh({ disabled = false }) {
  const [dist, setDist] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const touch = useRef(null);
  const distRef = useRef(0);

  useEffect(() => {
    if (disabled || refreshing) return undefined;
    const scroller = document.querySelector('.main-content');
    if (!scroller) return undefined;

    const setD = (v) => {
      distRef.current = v;
      setDist(v);
    };

    // Target va .main-content orasida o'z scroll'iga ega element bo'lsa —
    // unga tegmaymiz (bottom-sheet, modal, gorizontal bo'lmagan ro'yxatlar).
    const innerScrollable = (el) => {
      let n = el;
      while (n && n !== scroller && n !== document.body) {
        if (n.scrollHeight > n.clientHeight + 1) {
          const oy = getComputedStyle(n).overflowY;
          if (oy === 'auto' || oy === 'scroll') return true;
        }
        n = n.parentElement;
      }
      return false;
    };

    const onStart = (e) => {
      if (e.touches.length !== 1) return;
      if (scroller.scrollTop > 0) return;
      if (innerScrollable(e.target)) return;
      touch.current = { y: e.touches[0].clientY, active: true };
    };

    const onMove = (e) => {
      const t = touch.current;
      if (!t || !t.active) return;
      const dy = e.touches[0].clientY - t.y;
      if (dy <= 0 || scroller.scrollTop > 0) {
        if (dy < -4) t.active = false; // yuqoriga scroll boshlandi — bekor
        setPulling(false);
        setD(0);
        return;
      }
      e.preventDefault(); // scroller tepada — tortishni biz boshqaramiz
      setPulling(true);
      setD(Math.min(dy * 0.45, MAX_PULL));
    };

    const onEnd = () => {
      const t = touch.current;
      touch.current = null;
      setPulling(false);
      if (t && t.active && distRef.current >= THRESHOLD) {
        setRefreshing(true);
        setD(THRESHOLD);
        // Halqa aylanishi ko'rinishga ulgursin, keyin qayta yuklash
        setTimeout(() => window.location.reload(), 600);
      } else {
        setD(0);
      }
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd, { passive: true });
    scroller.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onEnd);
    };
  }, [disabled, refreshing]);

  const shown = refreshing ? THRESHOLD : dist;
  if (shown <= 0 && !refreshing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: 0,
        zIndex: 1200,
        pointerEvents: 'none',
        transform: `translate(-50%, ${shown - 66}px)`,
        transition: pulling ? 'none' : 'transform 0.25s ease',
      }}
    >
      <RefreshRing spinning={refreshing} progress={dist / THRESHOLD} />
    </div>
  );
}
