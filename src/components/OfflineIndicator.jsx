/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     OfflineIndicator.jsx — IQRO Platformasi                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Internet ulanishi holatini kuzatadi va foydalanuvchiga      ║
 * ║  qulay xabarlar ko'rsatadi. PWA ServiceWorker bilan          ║
 * ║  to'liq integratsiya qilingan.                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';

// ── USLUBLAR ──────────────────────────────────────────────────────────────────

const baseCard = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 16px',
  borderRadius: '14px',
  fontSize: '13px',
  fontWeight: 600,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  fontFamily: "'IBM Plex Mono', 'Roboto Mono', monospace",
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  animation: 'oi_slideIn 0.28s cubic-bezier(0.34,1.56,0.64,1)',
  pointerEvents: 'auto',
};

const STYLES = {
  // Ekran pastki o'ng burchagi — barcha bannerlar shu yerda
  wrapper: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
    pointerEvents: 'none',
  },

  // Offline — qizil
  offline: {
    ...baseCard,
    background: 'rgba(239, 68, 68, 0.92)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
  },

  // Qayta ulandi — yashil
  online: {
    ...baseCard,
    background: 'rgba(34, 197, 94, 0.92)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
  },

  // Yangi versiya — binafsha
  update: {
    ...baseCard,
    background: 'rgba(99, 102, 241, 0.95)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    maxWidth: '290px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '8px',
  },

  updateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    borderRadius: '8px',
    background: '#fff',
    color: '#6366F1',
    border: 'none',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.15s, opacity 0.15s',
  },

  dismissBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '6px',
    flexShrink: 0,
    transition: 'color 0.15s',
    pointerEvents: 'auto',
    marginLeft: 'auto',
  },

  // Jonli nuqta — offline paytda miltillaydi
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#fff',
    flexShrink: 0,
    animation: 'oi_pulse 1.6s ease-in-out infinite',
  },
};

// ── CSS ANIMATSIYALARI ─────────────────────────────────────────────────────────

const CSS = `
@keyframes oi_slideIn {
  from { opacity: 0; transform: translateX(24px) scale(0.95); }
  to   { opacity: 1; transform: translateX(0)    scale(1);    }
}
@keyframes oi_slideOut {
  from { opacity: 1; transform: translateX(0)    scale(1);    }
  to   { opacity: 0; transform: translateX(24px) scale(0.95); }
}
@keyframes oi_pulse {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.4; transform: scale(0.85); }
}
`;

// ── ASOSIY KOMPONENT ──────────────────────────────────────────────────────────

export default function OfflineIndicator() {
  const [isOnline,      setIsOnline     ] = useState(navigator.onLine);
  const [showOnlineMsg, setShowOnlineMsg] = useState(false);
  const [swWorker,      setSwWorker     ] = useState(null);
  const [showUpdate,    setShowUpdate   ] = useState(false);

  const onlineTimer = useRef(null);

  // ── Internet holati ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineMsg(true);

      // Oldingi taymerni o'chirish
      if (onlineTimer.current) clearTimeout(onlineTimer.current);

      // 3 soniyadan keyin "Qayta ulandi" xabarini yashirish
      onlineTimer.current = setTimeout(() => setShowOnlineMsg(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineMsg(false);
      if (onlineTimer.current) clearTimeout(onlineTimer.current);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (onlineTimer.current) clearTimeout(onlineTimer.current);
    };
  }, []);

  // ── ServiceWorker yangilanishi ───────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // Yangi SW o'rnatildi + eski SW mavjud = yangilanish bor
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setSwWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });
    });

    // SW almashinuvidan keyin sahifani yangilash
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  // ── Yangilash tugmasi ────────────────────────────────────────
  const handleUpdate = useCallback(() => {
    if (swWorker) {
      swWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
    setShowUpdate(false);
  }, [swWorker]);

  // Hech narsa ko'rsatilmasa — render qilmaymiz
  if (!showUpdate && isOnline && !showOnlineMsg) return null;

  return (
    <>
      <style>{CSS}</style>

      <div style={STYLES.wrapper}>

        {/* ── Yangi versiya banneri ── */}
        {showUpdate && (
          <div style={STYLES.update}>
            <span style={{ flex: 1, lineHeight: 1.5 }}>
              🆕 Yangi versiya tayyor!
            </span>

            {/* Yopish tugmasi */}
            <button
              style={STYLES.dismissBtn}
              onClick={() => setShowUpdate(false)}
              title="Keyinroq"
              onMouseOver={e => e.currentTarget.style.color = '#fff'}
              onMouseOut={e  => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >
              <X size={14} />
            </button>

            {/* Yangilash tugmasi */}
            <button
              style={STYLES.updateBtn}
              onClick={handleUpdate}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.opacity   = '0.92';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity   = '1';
              }}
            >
              <RefreshCw size={12} />
              Yangilash
            </button>
          </div>
        )}

        {/* ── Offline banneri ── */}
        {!isOnline && (
          <div style={STYLES.offline}>
            <WifiOff size={15} />
            <span>Internet yo'q — offline rejim</span>
            <div style={STYLES.dot} />
          </div>
        )}

        {/* ── Qayta ulandi xabari ── */}
        {isOnline && showOnlineMsg && (
          <div style={STYLES.online}>
            <Wifi size={15} />
            <span>Internet qayta ulandi ✓</span>
          </div>
        )}

      </div>
    </>
  );
}
