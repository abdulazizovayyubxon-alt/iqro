/**
 * SplashVideo.jsx — Zehin logo animatsiyasi (splash ekran)
 *
 * Faqat ilova BIRINCHI ochilganda (sessiya boshlanishi) ko'rsatiladi.
 * Pull-to-refresh yoki route almashtirishda PAYDO BO'LMAYDI.
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
const SESSION_KEY = 'zehin-splash-shown';
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

  // Vibratsiya — video boshlanishida bir marta
  const triggerVibration = useCallback(() => {
    const vibrationEnabled = localStorage.getItem(VIBRATION_KEY) !== 'off';
    if (vibrationEnabled && navigator.vibrate) {
      try { navigator.vibrate(200); } catch (e) { /* brauzer qo'llab-quvvatlamasligi mumkin */ }
    }
  }, []);

  // Video o'ynay boshlaganda
  const handlePlay = useCallback(() => {
    triggerVibration();
  }, [triggerVibration]);

  // Video tugaganda — fade-out boshlash
  const handleEnded = useCallback(() => {
    if (fadeDone.current) return;
    fadeDone.current = true;
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, '1');
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
      sessionStorage.setItem(SESSION_KEY, '1');
      onComplete?.();
    }, 300);
  }, [onComplete]);

  // Video yuklanmasa — 5 soniyadan keyin avtomatik skip
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fadeDone.current) {
        handleSkip();
      }
    }, 8000); // max 8 soniya kutish (video 4.7s + buffer)
    return () => clearTimeout(timeout);
  }, [handleSkip]);

  if (!visible) return null;

  return (
    <div
      className={`splash-video-overlay ${fading ? 'splash-video-fadeout' : ''}`}
      onClick={handleSkip}
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
        onPlay={handlePlay}
        onEnded={handleEnded}
        onError={handleSkip}
      />
      {/* Skip tugma */}
      <button className="splash-video-skip" onClick={handleSkip}>
        O'tkazish
      </button>
    </div>
  );
}

/**
 * Splash ko'rsatilishi kerakmi?
 * sessionStorage'da belgi bo'lmasa — ko'rsatiladi (yangi sessiya)
 */
export function shouldShowSplash() {
  // sessionStorage tab/brauzer yopilganda tozalanadi → qayta ochganda ko'rsatiladi
  // Refresh (F5/pull-to-refresh) da esa sessiya davom etadi → ko'rsatilmaydi
  return !sessionStorage.getItem(SESSION_KEY);
}
