import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';

/**
 * WeekGrid — oxirgi 7 kunlik faollik panjarasi.
 *
 * Uch holat: maqsad bajarilgan (to'la) · mashq bor, maqsad yo'q (yarim) ·
 * bo'sh kun. Rang jazolamaydi — bo'sh kun qizil emas, shunchaki so'nik:
 * kalendar ayblov emas, eslatma bo'lishi kerak.
 *
 * props:
 *   days   — state.activeDays: [{ d: toDateString, a: javoblar, g: maqsad }]
 *   streak — state.dailyStreak
 */
const WeekGrid = ({ days = [], streak = 0 }) => {
  const { t } = useTranslation();

  const cells = useMemo(() => {
    const byDate = new Map((days || []).map(x => [x.d, x]));
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - i);
      const key = dt.toDateString();
      const rec = byDate.get(key);
      out.push({
        key,
        // Intl ISHLATILMAYDI: Chrome `uz` lokalini taniydi, lekin hafta kunlari
        // uchun inglizcha nom qaytaradi (M/T/W...). Shuning uchun tarjima
        // kalitlari — pace.wd0 (yakshanba) … pace.wd6.
        label: t(`pace.wd${dt.getDay()}`),
        answered: rec?.a || 0,
        goal: !!rec?.g,
        isToday: i === 0,
      });
    }
    return out;
  }, [days, t]);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 7,
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: 0.3,
        }}>
          {t('pace.weekTitle')}
        </span>
        {streak > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 800, color: 'var(--amber)',
          }}>
            <Flame size={12} />
            {t('pace.streak', { count: streak })}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        {cells.map(c => {
          const bg = c.goal
            ? 'var(--accent)'
            : c.answered > 0 ? 'var(--blue-bg)' : 'var(--bg3)';
          const fg = c.goal
            ? '#fff'
            : c.answered > 0 ? 'var(--accent)' : 'var(--text3)';
          return (
            <div
              key={c.key}
              title={`${c.key} — ${c.answered}`}
              style={{
                flex: 1, minWidth: 0, height: 30, borderRadius: 9,
                background: bg, color: fg,
                border: c.isToday ? '1.5px solid var(--accent2)' : '1.5px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
              }}
            >
              {c.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekGrid;
