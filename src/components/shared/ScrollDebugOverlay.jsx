import React, { useEffect, useState } from 'react';

/**
 * VAQTINCHALIK diagnostika paneli (scroll muammosi uchun) — faqat URL'da
 * #sdebug bo'lganda ko'rinadi. Telefonda jonli scroll/viewport holatini
 * ko'rsatadi; muammo topilgach olib tashlanadi.
 */
export default function ScrollDebugOverlay() {
  const [s, setS] = useState({});

  useEffect(() => {
    // safe-area qiymatini o'lchash uchun probe element
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
      + 'padding-bottom:env(safe-area-inset-bottom,0px);padding-top:env(safe-area-inset-top,0px)';
    document.body.appendChild(probe);

    let touchInfo = { y0: 0, dy: 0, prevented: 0, moves: 0 };

    const read = () => {
      const se = document.scrollingElement || document.documentElement;
      const mc = document.querySelector('.main-content');
      const cs = probe ? getComputedStyle(probe) : null;
      setS({
        ua: (navigator.userAgent.match(/Chrome\/[\d.]+/) || ['?'])[0]
          + (window.matchMedia('(display-mode: standalone)').matches ? ' STANDALONE' : ' BROWSER'),
        innerH: window.innerHeight,
        vvH: window.visualViewport ? Math.round(window.visualViewport.height) : '-',
        safeTop: cs ? cs.paddingTop : '?',
        safeBot: cs ? cs.paddingBottom : '?',
        docSH: se.scrollHeight,
        docST: Math.round(se.scrollTop),
        docMax: se.scrollHeight - se.clientHeight,
        mcSH: mc ? mc.scrollHeight : '-',
        mcCH: mc ? mc.clientHeight : '-',
        mcST: mc ? Math.round(mc.scrollTop) : '-',
        bodyCls: document.body.className || '(bo‘sh)',
        t: `dy=${Math.round(touchInfo.dy)} moves=${touchInfo.moves} prev=${touchInfo.prevented}`,
      });
    };

    const onTS = (e) => { touchInfo = { y0: e.touches[0].clientY, dy: 0, prevented: 0, moves: 0 }; };
    const onTM = (e) => {
      touchInfo.dy = e.touches[0].clientY - touchInfo.y0;
      touchInfo.moves++;
      if (e.defaultPrevented) touchInfo.prevented++;
      read();
    };

    read();
    const iv = setInterval(read, 700);
    window.addEventListener('scroll', read, { passive: true, capture: true });
    // capture'da ham, bubbling oxirida ham — preventDefault holatini ko'rish uchun
    window.addEventListener('touchstart', onTS, { passive: true, capture: true });
    document.addEventListener('touchmove', onTM, { passive: true });
    window.addEventListener('touchend', read, { passive: true, capture: true });
    return () => {
      clearInterval(iv);
      window.removeEventListener('scroll', read, { capture: true });
      window.removeEventListener('touchstart', onTS, { capture: true });
      document.removeEventListener('touchmove', onTM);
      window.removeEventListener('touchend', read, { capture: true });
      probe.remove();
    };
  }, []);

  const row = (k, v) => (
    <div key={k}><b style={{ color: '#7FD4FF' }}>{k}</b> {String(v)}</div>
  );

  return (
    <div style={{
      position: 'fixed', top: 100, right: 6, zIndex: 999999,
      background: 'rgba(0,0,0,0.82)', color: '#fff', borderRadius: 8,
      font: '10px/1.5 monospace', padding: '8px 10px', pointerEvents: 'none',
      maxWidth: 210, wordBreak: 'break-all',
    }}>
      {row('ua', s.ua)}
      {row('innerH', s.innerH)}
      {row('vvH', s.vvH)}
      {row('safe T/B', `${s.safeTop} / ${s.safeBot}`)}
      {row('doc SH/ST/max', `${s.docSH} / ${s.docST} / ${s.docMax}`)}
      {row('mc SH/CH/ST', `${s.mcSH} / ${s.mcCH} / ${s.mcST}`)}
      {row('body.class', s.bodyCls)}
      {row('touch', s.t)}
    </div>
  );
}
