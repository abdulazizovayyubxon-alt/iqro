import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { secondsUntil, formatExamTime } from '../../utils/examClock';

/**
 * ExamTimer — imtihonning asosiy (90–120 daqiqalik) SUR'AT ko'rsatkichi.
 *
 * ⚠️ AUDIT 2026-08-17 — nega bu komponent yaratildi (WALL-CLOCK):
 *
 *   Avval taymer `ExamPage` ichida `setInterval(() => setTimeLeft(p => p - 1))`
 *   edi — vaqt HODISALAR SONI bilan sanalardi, haqiqiy soat bilan emas.
 *   Ikki oqibati bor edi: (1) mobil brauzer fonda `setInterval`ni to'xtatgani
 *   uchun 90 daqiqalik imtihonni 3 soatda ishlash mumkin edi (ham simulyatsiya
 *   yaroqsiz, ham ochiq aldash vektori); (2) har soniyada butun sahifa qayta
 *   render bo'lardi.
 *
 *   Yechim: haqiqat manbasi — DEADLINE (epoch ms), ekrandagi son har soniya
 *   `Date.now()` dan qayta hisoblanadi, `visibilitychange`/`focus` da esa
 *   DARHOL sinxronlanadi. Har soniyalik state SHU KICHIK komponentda yashaydi.
 *
 * ⚠️ AUDIT 2026-08-19, T-13 BAND — nega u SUR'AT ko'rsatkichiga aylantirildi:
 *
 *   Komponent to'g'ri ishlardi, lekin PSIXOLOGIK jihatdan noto'g'ri narsani
 *   ko'rsatardi: doimiy kamayuvchi raqam, 10 daqiqada sariq, 5 daqiqada qizil
 *   VA TO'XTOVSIZ PULSATSIYA. Ya'ni yagona xabari «vaqt tugayapti» edi.
 *
 *   Test tashvishi yuqori auditoriyada (attestatsiya — aynan shunday) bu ishchi
 *   xotirani band qiladi va natijani REAL BILIMDAN PAST ko'rsatadi. Ilova esa
 *   o'sha past natijaga qarab tayyorlik darajasini baholaydi — ya'ni bitta
 *   vizual qaror butun diagnostikani noto'g'ri tomonga suradi.
 *
 *   Foydalanuvchiga aslida kerak bo'lgan javob boshqa savolga: «ULGURYAPMANMI?»
 *   Endi asosiy element — shu javob:
 *     · matn holatni aytadi («4 savol oldindasiz» / «jadvalda» / «orqadasiz»);
 *     · rang VAQTNI emas, HOLATNI bildiradi (yashil = oldinda, amber = orqada);
 *     · chiziqda ikki belgi bor: to'ldirilgan qism — o'tgan vaqt, uchburchak —
 *       javoblaringiz. Uchburchak to'ldirishdan o'ngda bo'lsa — oldindasiz;
 *     · raqam ko'rinadi, lekin SOKIN — u oxirgi 5 daqiqada asosiy element
 *       bo'lib chiqadi, o'shanda haqiqatan muhim.
 *
 * @param {number}   deadlineMs  Imtihon tugash vaqti (epoch ms). null = to'xtagan.
 * @param {number}   totalMs     Imtihonning to'liq davomiyligi (ms) — sur'at uchun.
 * @param {number}   answered    Javob berilgan savollar soni.
 * @param {number}   total       Jami savollar soni.
 * @param {Function} onExpire    Vaqt tugaganda BIR MARTA chaqiriladi.
 */

// Sur'at «oldinda/orqada» deb atalishi uchun kerakli eng kichik farq.
// Bunsiz ko'rsatkich har javobda yashildan amberga sakrab, aynan o'zi
// oldini olmoqchi bo'lgan bezovtalikni yaratardi.
const PACE_TOLERANCE = 2;

const ExamTimer = ({ deadlineMs, totalMs = 0, answered = 0, total = 0, onExpire }) => {
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

  // ── Sur'at hisobi ──────────────────────────────────────────────────────
  const elapsedMs = totalMs > 0 ? Math.min(totalMs, Math.max(0, totalMs - left * 1000)) : 0;
  const timeFrac = totalMs > 0 ? elapsedMs / totalMs : 0;
  const answerFrac = total > 0 ? Math.min(1, answered / total) : 0;
  // Shu vaqtga qarab necha savol javoblangan bo'lishi kerak edi
  const expected = Math.floor(timeFrac * total);
  const delta = answered - expected;

  const hasPace = totalMs > 0 && total > 0;
  const pace = !hasPace ? 'none'
    : delta >= PACE_TOLERANCE ? 'ahead'
    : delta <= -PACE_TOLERANCE ? 'behind'
    : 'ontrack';

  const paceColor = pace === 'ahead' ? 'var(--green)'
    : pace === 'behind' ? 'var(--amber)'
    : 'var(--text2)';

  const paceText = pace === 'ahead' ? t('exam.paceAhead', { count: delta })
    : pace === 'behind' ? t('exam.paceBehind', { count: -delta })
    : t('exam.paceOnTrack');

  // Oxirgi 5 daqiqa — YAGONA holat qachonki vaqtning o'zi asosiy xabar
  // bo'ladi. 10 daqiqalik «warning» bosqichi olib tashlandi: u hech qanday
  // yangi harakatga undamas, faqat bezovtalik qo'shardi.
  const isUrgent = left <= 300;

  return (
    <div
      className={`exam-timer ${isUrgent ? 'timer-danger' : ''}`}
      role="timer"
      aria-live="off"
    >
      <Clock size={16} style={{ flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 160, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {hasPace && !isUrgent && (
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: paceColor }}>
              {paceText}
            </span>
          )}
          <span style={{
            marginLeft: 'auto',
            fontWeight: isUrgent ? 800 : 600,
            fontSize: isUrgent ? 'var(--fs-base)' : 'var(--fs-sm)',
            opacity: isUrgent ? 1 : 0.7,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {isUrgent ? `${t('exam.timeLeft')} ` : ''}{formatExamTime(left)}
          </span>
        </div>

        {/* Sur'at chizig'i: to'ldirish = o'tgan vaqt, uchburchak = javoblaringiz.
            Uchburchak to'ldirishdan o'ngda bo'lsa — jadvaldan oldindasiz. */}
        {hasPace && (
          <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'visible' }}>
            <div style={{
              height: '100%', width: `${timeFrac * 100}%`,
              borderRadius: 2, background: 'var(--border2)',
              transition: 'width 1s linear',
            }} />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', top: -3, left: `${answerFrac * 100}%`,
                width: 10, height: 10, marginLeft: -5,
                borderRadius: 3, background: paceColor,
                transition: 'left 0.4s ease',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamTimer;
