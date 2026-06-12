import { useEffect, useRef } from 'react';

/**
 * Test/imtihon davomida Android/brauzer "orqaga" tugmasi sahifadan
 * to'satdan chiqarib yubormasligi uchun history interception.
 *
 * Shartnoma: active bo'lganda history.pushState({ testGuard: true }).
 * Orqaga bosilganda agar hali testGuard yozuvida bo'lsak (ustidagi modal
 * yopilgan) — hech narsa qilinmaydi; testGuard'dan pastga tushilsa yozuv
 * qayta push qilinib onAttemptExit chaqiriladi (sahifada qolamiz, tasdiq
 * so'raladi). Guard o'chsa qo'shilgan yozuv history.back() bilan olinadi.
 */
export function useExitGuard(active, onAttemptExit) {
  const onAttemptExitRef = useRef(onAttemptExit);
  useEffect(() => { onAttemptExitRef.current = onAttemptExit; }, [onAttemptExit]);

  useEffect(() => {
    if (!active) return;

    window.history.pushState({ testGuard: true }, '');

    const handlePopState = () => {
      if (window.history.state?.testGuard) return; // ustidagi modal yopildi
      window.history.pushState({ testGuard: true }, '');
      onAttemptExitRef.current();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.testGuard) {
        window.history.back();
      }
    };
  }, [active]);
}
