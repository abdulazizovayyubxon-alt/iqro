/**
 * SplashVideo.jsx — Zehin logo VIDEO animatsiyasi (splash ekran)
 *
 * Faqat ilova BIRINCHI ochilganda (yangi sessiya) ko'rsatiladi.
 * Refresh (F5/pull-to-refresh) da ko'rsatilMAYDI — buning o'rniga
 * SimpleSplash (oddiy statik splash) ishlaydi.
 *
 * Xususiyatlar:
 * - Video telefon ekraniga to'liq mos (object-fit: cover)
 * - Video tugaganda fade-out animatsiya bilan yo'qoladi
 * - Vibratsiya: localStorage('iqro-vibration') yoqilgan bo'lsa, bir marta 200ms
 * - Foydalanuvchi bosib o'tkazishi (skip) mumkin
 * - sessionStorage orqali sessiyada faqat bir marta
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

const SPLASH_VIDEO_URL = '/videos/zehin-splash.mp4';
export const SPLASH_SESSION_KEY = 'zehin-splash-shown';
const VIBRATION_KEY = 'iqro-vibration';

/**
 * SplashVideo komponenti.
 * @param {Object} props
 * @param {Function} props.onComplete — video tugaganda yoki skip qilinganda chaqiriladi
 */
export default function SplashVideo({ onComplete }) {
  const videoRef = useRef(null);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);
  const fadeDone = useRef(false);
  const vibrated = useRef(false);

  // Vibratsiya — foydalanuvchi bosganida bir marta
  const triggerVibration = useCallback(() => {
    if (vibrated.current) return;
    vibrated.current = true;
    const vibrationEnabled = localStorage.getItem(VIBRATION_KEY) !== 'off';
    if (vibrationEnabled && navigator.vibrate) {
      try { navigator.vibrate(200); } catch (e) { /* ignore */ }
    }
  }, []);

  // Video tugaganda — fade-out boshlash
  const handleEnded = useCallback(() => {
    if (fadeDone.current) return;
    fadeDone.current = true;
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
      onComplete?.();
    }, 500);
  }, [onComplete]);

  // Skip (o'tkazib yuborish) — video'ni darhol to'xtatib yopish
  const handleSkip = useCallback(() => {
    if (fadeDone.current) return;
    fadeDone.current = true;
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
      onComplete?.();
    }, 300);
  }, [onComplete]);

  // Ekranga birinchi bosish — vibratsiya; ikkinchi bosish — skip
  const handleOverlayTap = useCallback(() => {
    if (!vibrated.current) {
      triggerVibration();
      return; // birinchi bosish faqat vibratsiya, skip qilmaydi
    }
    handleSkip(); // ikkinchi bosish — skip
  }, [triggerVibration, handleSkip]);

  // Video yuklanmasa — 8 soniyadan keyin avtomatik skip
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fadeDone.current) {
        handleSkip();
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [handleSkip]);

  if (!visible) return null;

  return (
    <div
      className={`splash-video-overlay ${fading ? 'splash-video-fadeout' : ''}`}
      onClick={handleOverlayTap}
      role="button"
      tabIndex={0}
      aria-label="Splash animatsiyani o'tkazib yuborish"
    >
      <video
        ref={videoRef}
        className="splash-video-player"
        src={SPLASH_VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={handleSkip}
      />
      {/* Skip tugma — doim skip qiladi (vibratsiyasiz) */}
      <button className="splash-video-skip" onClick={(e) => { e.stopPropagation(); handleSkip(); }}>
        O'tkazish
      </button>
    </div>
  );
}
