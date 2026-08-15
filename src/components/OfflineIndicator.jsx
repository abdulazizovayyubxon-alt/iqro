/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     OfflineIndicator.jsx — Zehin Platformasi            ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Internet ulanishi holatini kuzatadi va foydalanuvchiga      ║
 * ║  qulay xabar ko'rsatadi.                                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Ilgari bu komponent ServiceWorker yangilanishini ham boshqarardi. Yangilanish
 * endi InterruptHost navbatidan chiqadi (oyna + jim tabletka) — shu sababli bu
 * yerda faqat o'z vazifasi qoldi.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

// ── USLUBLAR ──────────────────────────────────────────────────────────────────

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px 20px',
    borderRadius: '99px',
    fontSize: 'var(--fs-md)',
    fontWeight: 600,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    animation: 'oi_slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    pointerEvents: 'auto',
    maxWidth: '90vw',
    textAlign: 'center',
    background: 'rgba(239, 68, 68, 0.95)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
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
@keyframes oi_pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.3); opacity: 0.5; }
}
`;

// ── ASOSIY KOMPONENT ──────────────────────────────────────────────────────────

export default function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <>
      <style>{CSS}</style>

      <div style={STYLES.wrapper}>
        <div style={STYLES.offline}>
          <WifiOff size={15} />
          <span>{t('offline.offlineMode')}</span>
          <div style={STYLES.dot} />
        </div>
      </div>
    </>
  );
}
