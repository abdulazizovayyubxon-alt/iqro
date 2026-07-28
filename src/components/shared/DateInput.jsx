import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * DateInput — qo'lda yoziladigan sana maydoni: KUN / OY / YIL.
 *
 * Native `<input type="date">` ATAYIN ishlatilmaydi:
 *   • Androidda to'liq ekranli kalendar modali ochiladi — sanani "qidirish"
 *     kerak bo'ladi (imtihon sanasi va tug'ilgan yil uchun ayniqsa noqulay);
 *   • ko'rinishi brauzer lokaliga bog'liq («дд.мм.гггг» ruscha chiqardi);
 *   • ochilgan kalendar drawer/modal ustidan qalqib, orqaga tugmasini yeb qo'yadi.
 * Qo'lda yozishda esa raqamli klaviatura bilan 8 ta bosish — kalendarsiz.
 *
 * Tanlagichlar (select) ham ishlatilmaydi: 75 ta yilni ro'yxatdan aylantirish
 * yozishdan sekinroq. EditProfileModal va ExamDateModal shu bitta komponentni
 * bo'lishadi — sana kiritish ilovaning hamma joyida bir xil ko'rinsin.
 *
 * props:
 *   value    — 'YYYY-MM-DD' yoki '' (to'liq/haqiqiy bo'lmasa hamisha '')
 *   onChange — (iso: 'YYYY-MM-DD' | '') => void
 *   minYear / maxYear — ruxsat etilgan yil oralig'i
 *   inputClassName — maydonlarga qo'shiladigan class (masalan 'modal-input')
 */
const pad2 = (n) => String(n).padStart(2, '0');

const splitIso = (iso) => {
  const [y = '', m = '', d = ''] = String(iso || '').split('-');
  return { d, m, y };
};

const DateInput = ({
  value = '',
  onChange,
  minYear,
  maxYear,
  inputClassName = '',
  autoFocus = false,
}) => {
  const { t } = useTranslation();
  const [parts, setParts] = useState(() => splitIso(value));
  const monthRef = useRef(null);
  const yearRef = useRef(null);

  // Tashqaridan to'liq sana kelsa (masalan «qolgan kunlar» maydoni sanani
  // hisoblab bersa) maydonlarni moslashtiramiz. Bo'sh qiymat qisman
  // kiritilgan raqamlarni o'chirib yubormasligi kerak.
  useEffect(() => {
    if (!value) return;
    const next = splitIso(value);
    setParts(prev =>
      (prev.d === next.d && prev.m === next.m && prev.y === next.y) ? prev : next
    );
  }, [value]);

  const emit = (next) => {
    setParts(next);
    const d = parseInt(next.d, 10);
    const m = parseInt(next.m, 10);
    const y = parseInt(next.y, 10);
    const inRange =
      next.y.length === 4 &&
      d >= 1 && d <= 31 && m >= 1 && m <= 12 &&
      (minYear == null || y >= minYear) &&
      (maxYear == null || y <= maxYear);
    if (!inRange) { onChange?.(''); return; }
    // 31-fevral kabi mavjud bo'lmagan sanalarni rad etamiz
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    const check = new Date(`${iso}T00:00:00`);
    const real = check.getMonth() + 1 === m && check.getDate() === d;
    onChange?.(real ? iso : '');
  };

  const digits = (raw, max) => raw.replace(/\D/g, '').slice(0, max);

  const handleDay = (e) => {
    const v = digits(e.target.value, 2);
    emit({ ...parts, d: v });
    // 2 xona yozilgach yoki «4»–«9» (bir xonali kun aniq) — keyingi maydonga
    if (v.length === 2 || (v.length === 1 && Number(v) > 3)) monthRef.current?.focus();
  };

  const handleMonth = (e) => {
    const v = digits(e.target.value, 2);
    emit({ ...parts, m: v });
    if (v.length === 2 || (v.length === 1 && Number(v) > 1)) yearRef.current?.focus();
  };

  const handleYear = (e) => emit({ ...parts, y: digits(e.target.value, 4) });

  // Maydondan chiqqanda bir xonali kun/oyni to'ldiramiz: «3» → «03»
  const padOnBlur = (key) => () => {
    const v = parts[key];
    if (v.length === 1 && Number(v) > 0) emit({ ...parts, [key]: pad2(v) });
  };

  const common = {
    type: 'text',
    inputMode: 'numeric',
    autoComplete: 'off',
    className: inputClassName,
    style: { textAlign: 'center', minWidth: 0 },
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        {...common}
        style={{ ...common.style, flex: 1 }}
        value={parts.d}
        onChange={handleDay}
        onBlur={padOnBlur('d')}
        placeholder={t('modals.day')}
        aria-label={t('modals.day')}
        maxLength={2}
        autoFocus={autoFocus}
      />
      <input
        {...common}
        style={{ ...common.style, flex: 1 }}
        ref={monthRef}
        value={parts.m}
        onChange={handleMonth}
        onBlur={padOnBlur('m')}
        placeholder={t('modals.month')}
        aria-label={t('modals.month')}
        maxLength={2}
      />
      <input
        {...common}
        style={{ ...common.style, flex: 1.5 }}
        ref={yearRef}
        value={parts.y}
        onChange={handleYear}
        placeholder={t('modals.year')}
        aria-label={t('modals.year')}
        maxLength={4}
      />
    </div>
  );
};

export default DateInput;
