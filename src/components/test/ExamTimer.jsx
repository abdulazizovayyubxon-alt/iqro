import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { secondsUntil, formatExamTime } from '../../utils/examClock';

/**
 * ExamTimer — imtihonning asosiy (90–120 daqiqalik) taymeri.
 *
 * ⚠️ AUDIT 2026-08-17 — nega bu komponent yaratildi:
 *
 *   Avval taymer `ExamPage` ichida shunday edi:
 *       setInterval(() => setTimeLeft(prev => prev - 1), 1000)
 *   Ya'ni vaqt HODISALAR SONI bilan sanalardi, haqiqiy soat bilan emas.
 *   Ikki jiddiy oqibati bor edi:
 *
 *   1) FONDA MUZLASH. Mobil brauzer (Android Chrome, iOS Safari, TWA/WebView)
 *      ilova fonga tushganda `setInterval`ni sekinlashtiradi yoki butunlay
 *      to'xtatadi. Foydalanuvchi telefonni bloklab qo'ysa yoki qo'ng'iroqqa
 *      javob bersa, taymer o'sha joyda turardi — 90 daqiqalik imtihonni 3
 *      soatda ishlash mumkin edi. Bu ham imtihon simulyatsiyasini yaroqsiz
 *      qiladi (odam ilovada 70% olib, haqiqiy attestatsiyada 45% oladi), ham
 *      ochiq aldash vektori edi.
 *
 *   2) HAR SONIYADA BUTUN SAHIFA QAYTA RENDER. `timeLeft` sahifa darajasidagi
 *      state bo'lgani uchun har soniyada 50 tali savol panjarasi, savol matni,
 *      variantlar va `AnimatePresence` qayta hisoblanardi — 90 daqiqada 5400
 *      marta. O'rta darajali Android'da bu jank va batareya sarfi.
 *
 *   YECHIM (aynan `TimerPill.jsx` dagi naqsh): haqiqat manbasi — DEADLINE
 *   (epoch ms). Ekranga chiqadigan son har soniya `Date.now()` dan qayta
 *   hisoblanadi, `visibilitychange`/`focus` da esa DARHOL sinxronlanadi.
 *   Har soniyalik state SHU KICHIK komponentda yashaydi, shuning uchun
 *   `ExamPage` umuman qayta render bo'lmaydi.
 *
 * @param {number}   deadlineMs  Imtihon tugash vaqti (epoch ms). null = to'xtagan.
 * @param {Function} onExpire    Vaqt tugaganda BIR MARTA chaqiriladi.
 */
const ExamTimer = ({ deadlineMs, onExpire }) => {
  const { t } = useTranslation();
  const [left, setLeft] = useState(() => secondsUntil(deadlineMs));

  // `onExpire` identitisi har renderda o'zgaradi — ref orqali ushlaymiz,
  // aks holda effekt qayta ishga tushib taymer restart bo'lardi.
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!deadlineMs) return;
    firedRef.current = false;

    const tick = () => {
      const remaining = secondsUntil(deadlineMs);
      setLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick(); // darhol bir marta — fon'dan qaytgan lahzada ham to'g'ri son
    const id = setInterval(tick, 1000);

    // Fon → old plan: qo'ng'iroq, ekran qulfi, boshqa ilovaga o'tish.
    // `setInterval` muzlagan bo'lsa ham shu yerda haqiqiy vaqt tiklanadi va
    // kerak bo'lsa imtihon avtomatik yakunlanadi.
    const resync = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, [deadlineMs]);

  const isUrgent = left <= 300;   // 5 daqiqa
  const isWarning = left <= 600;  // 10 daqiqa

  return (
    <div
      className={`exam-timer ${isUrgent ? 'timer-danger' : isWarning ? 'timer-warning' : ''}`}
      role="timer"
      aria-live="off"
    >
      <Clock size={16} />
      <span>
        {t('exam.timeLeft')} <strong>{formatExamTime(left)}</strong>
      </span>
    </div>
  );
};

export default ExamTimer;

