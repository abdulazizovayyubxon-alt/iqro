import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Wall-clock asosidagi imtihon taymeri.
 *
 * NEGA ALOHIDA KOMPONENT:
 *  1) Fon/qo'ng'iroq muammosi: setInterval mobil brauzerda (Safari/WebView/TWA)
 *     ilova fonga tushganda muzlaydi yoki sekinlashadi. Shuning uchun vaqt
 *     DEADLINE (epoch ms) bo'yicha hisoblanadi va `visibilitychange`da darhol
 *     qayta sinxronlanadi — ilova qaytganda to'g'ri vaqtni ko'rsatadi va kerak
 *     bo'lsa avto-yakunlaydi. Bu "ilovani fonga tushirib taymerni to'xtatish"
 *     aldash vektorini ham yopadi.
 *  2) Unumdorlik: har soniyalik countdown state SHU komponentda yashaydi —
 *     shuning uchun har soniyada faqat shu kichik pill render bo'ladi,
 *     butun TestPage + QuestionBox emas.
 */
const TimerPill = ({ timerMode, duration, onExpire, onToggle }) => {
  const { t } = useTranslation();
  const [display, setDisplay] = useState(timerMode === 'countdown' ? duration : 0);

  const deadlineRef = useRef(0);
  const startRef = useRef(0);
  const firedRef = useRef(false);

  // onExpire identitisi har renderda o'zgaradi — ref orqali ushlab, effektni
  // qayta ishga tushishdan saqlaymiz (taymer nuqul restart bo'lmasin).
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    firedRef.current = false;
    if (timerMode === 'off') {
      setDisplay(0);
      return;
    }

    if (timerMode === 'countdown') {
      deadlineRef.current = Date.now() + duration * 1000;
      setDisplay(duration);
    } else {
      startRef.current = Date.now();
      setDisplay(0);
    }

    const tick = () => {
      if (timerMode === 'countdown') {
        const remaining = Math.round((deadlineRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          setDisplay(0);
          if (!firedRef.current) { firedRef.current = true; onExpireRef.current?.(); }
        } else {
          setDisplay(remaining);
        }
      } else {
        setDisplay(Math.round((Date.now() - startRef.current) / 1000));
      }
    };

    tick(); // darhol bir marta
    const id = setInterval(tick, 1000);

    // Fon → old planga qaytganda DARHOL qayta hisoblash (qo'ng'iroq/ekran qulfi)
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timerMode, duration]);

  const danger = timerMode === 'countdown' && display <= 10;
  const warning = timerMode === 'countdown' && display > 10 && display <= 20;

  return (
    <div
      onClick={onToggle}
      className={`question-timer ${danger ? 'timer-danger' : warning ? 'timer-warning' : ''}`}
      title={t('test.timerToggleTitle')}
    >
      <Clock size={14} />
      <span style={{ fontWeight: 700, fontSize: '12px' }}>
        {timerMode === 'countdown' && t('test.timerCountdown', { sec: display })}
        {timerMode === 'stopwatch' && t('test.timerStopwatch', { sec: display })}
        {timerMode === 'off' && t('test.timerOff')}
      </span>
      {timerMode === 'countdown' && (
        <div className="timer-bar-wrap" style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
          <div className="timer-bar-fill" style={{ height: '100%', width: `${(display / duration) * 100}%`, background: display <= 10 ? 'var(--red)' : display <= 20 ? 'var(--amber)' : 'var(--green)' }} />
        </div>
      )}
    </div>
  );
};

export default React.memo(TimerPill);
