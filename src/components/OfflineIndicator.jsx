/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     OfflineIndicator.jsx — Toifa Pro Platformasi            ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Internet ulanishi holatini kuzatadi va foydalanuvchiga      ║
 * ║  qulay xabarlar ko'rsatadi. PWA ServiceWorker bilan          ║
 * ║  to'liq integratsiya qilingan.                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw } from 'lucide-react';

// ── USLUBLAR ──────────────────────────────────────────────────────────────────

const baseCard = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '10px 20px',
  borderRadius: '99px',
  fontSize: '13px',
  fontWeight: 600,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  animation: 'oi_slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
  pointerEvents: 'auto',
  maxWidth: '90vw',
  textAlign: 'center',
};

const STYLES = {
  wrapper: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    pointerEvents: 'none',
    width: '100%',
  },

  offline: {
    ...baseCard,
    background: 'rgba(239, 68, 68, 0.95)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
  },

  online: {
    ...baseCard,
    background: 'rgba(16, 185, 129, 0.95)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
  },

  update: {
    ...baseCard,
    background: 'rgba(14, 151, 224, 0.97)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    padding: '12px 24px',
    flexWrap: 'nowrap',
    gap: '12px',
  },

  updateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 14px',
    borderRadius: '99px',
    background: '#fff',
    color: '#0B79B8',
    border: 'none',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },

  dismissBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.15s',
    pointerEvents: 'auto',
  },

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#EF4444',
    border: '2px solid #fff',
    flexShrink: 0,
    animation: 'oi_pulse 1s ease-in-out infinite',
  },
};

// ── CSS ANIMATSIYALARI ─────────────────────────────────────────────────────────

const CSS = `
@keyframes oi_slideIn {
  from { opacity: 0; transform: translateY(-40px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes oi_slideOut {
  from { opacity: 1; transform: translateY(0)    scale(1);    }
  to   { opacity: 0; transform: translateY(-40px) scale(0.95); }
}
@keyframes oi_pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.3); opacity: 0.5; }
}
`;

// ── ASOSIY KOMPONENT ──────────────────────────────────────────────────────────

export default function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOnline,      setIsOnline     ] = useState(navigator.onLine);
  const [swWorker,      setSwWorker     ] = useState(null);
  const [showUpdate,    setShowUpdate   ] = useState(false);

  // ── Internet holati ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
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
  if (!showUpdate && isOnline) return null;

  return (
    <>
      <style>{CSS}</style>

      <div style={STYLES.wrapper}>

        {/* ── Yangi versiya banneri ── */}
        {showUpdate && (
          <div style={STYLES.update}>
            <span style={{ flex: 1, lineHeight: 1.5 }}>
              {t('offline.updateReady')}
            </span>

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
              {t('offline.update')}
            </button>
          </div>
        )}

        {/* ── Offline banneri (faqatgina offline bo'lsa ko'rsatamiz) ── */}
        {!isOnline && (
          <div style={STYLES.offline}>
            <WifiOff size={15} />
            <span>{t('offline.offlineMode')}</span>
            <div style={STYLES.dot} />
          </div>
        )}
      </div>
    </>
  );
}
