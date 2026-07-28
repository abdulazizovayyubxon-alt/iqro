import React, { useState, useEffect, useRef } from 'react';

/**
 * PerfOverlay — HAQIQIY qurilmada silliqlikni o'lchash uchun.
 *
 * Nega kerak: jank deyarli hamisha telefonda ko'rinadi, ishlab chiqish
 * mashinasida esa umuman takrorlanmaydi (desktop GPU/CPU juda kuchli).
 * Taxmin qilib optimallashtirish o'rniga — aynan o'sha qurilmadan raqam olamiz.
 *
 * Ochish: manzil oxiriga `#perf` qo'shing (ScrollDebugOverlay'dagi `#sdebug`
 * bilan bir xil uslub). Ishlab chiqarishda ham ishlaydi, lekin faqat hash
 * berilganda — oddiy foydalanuvchi hech qachon ko'rmaydi.
 *
 * Ko'rsatkichlar:
 *   FPS       — joriy kadr chastotasi
 *   JANK      — 50ms dan uzun kadr tanaffuslari soni (sezilarli qotish)
 *   P95       — kadrlar orasidagi tanaffusning 95-protsentili
 *   LONG      — 50ms+ davom etgan asosiy oqim vazifalari (PerformanceLongTask)
 *   MEM       — JS uyum hajmi (agar brauzer bersa)
 */
const PerfOverlay = () => {
  const [m, setM] = useState({ fps: 0, jank: 0, p95: 0, long: 0, longMax: 0, mem: 0 });
  const gaps = useRef([]);
  const jank = useRef(0);
  const long = useRef({ count: 0, max: 0 });

  useEffect(() => {
    let raf, last = performance.now(), frames = 0, windowStart = last;

    const tick = (now) => {
      const gap = now - last;
      last = now;
      frames += 1;
      gaps.current.push(gap);
      if (gap > 50) jank.current += 1;
      if (gaps.current.length > 600) gaps.current.shift();

      // Sekundiga bir marta yangilaymiz — overlay o'zi jank qilmasin
      if (now - windowStart >= 1000) {
        const sorted = [...gaps.current].sort((a, b) => a - b);
        setM({
          fps: Math.round((frames * 1000) / (now - windowStart)),
          jank: jank.current,
          p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] || 0),
          long: long.current.count,
          longMax: Math.round(long.current.max),
          mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
        });
        frames = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let po;
    try {
      po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          long.current.count += 1;
          if (e.duration > long.current.max) long.current.max = e.duration;
        }
      });
      po.observe({ entryTypes: ['longtask'] });
    } catch { /* Safari qo'llab-quvvatlamaydi — qolgan raqamlar baribir ishlaydi */ }

    return () => { cancelAnimationFrame(raf); po?.disconnect(); };
  }, []);

  const reset = () => { gaps.current = []; jank.current = 0; long.current = { count: 0, max: 0 }; };

  const bad = m.fps > 0 && m.fps < 50;
  return (
    <div
      onClick={reset}
      style={{
        position: 'fixed', top: 'calc(6px + env(safe-area-inset-top))', left: 6, zIndex: 2147483647,
        background: 'rgba(6,14,26,0.86)', color: bad ? '#FF8A80' : '#9FE7A6',
        font: "600 10px/1.45 'IBM Plex Mono', monospace", padding: '6px 8px',
        borderRadius: 8, pointerEvents: 'auto', letterSpacing: 0.2,
        border: `1px solid ${bad ? 'rgba(255,138,128,0.4)' : 'rgba(159,231,166,0.3)'}`,
      }}
    >
      <div>FPS {m.fps} · P95 {m.p95}ms</div>
      <div>JANK {m.jank} · LONG {m.long}/{m.longMax}ms</div>
      {m.mem > 0 && <div>MEM {m.mem}MB</div>}
      <div style={{ opacity: 0.5, fontSize: 9 }}>bosing = nolla</div>
    </div>
  );
};

export default PerfOverlay;
