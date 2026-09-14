/**
 * PedAudienceToggle — «Pedagogik mahorat va kasb standarti» fanida yo'nalish
 * tanlagichi: maktab o'qituvchisi yoki MTT pedagogi.
 *
 * Fan ikkala guruh uchun umumiy, lekin attestatsiyadagi mazmun farq qiladi
 * (maktabda o'qituvchi kasb standarti va didaktika, MTT'da «Ilk qadam» va
 * MTT pedagogi standarti). Bo'limlar ro'yxati, 15 talik imtihon va tayyorlik
 * shu tanlovga qarab olinadi — data/pedAudience. Boshqa fanlarda chizilmaydi.
 *
 * props:
 *   category — faol fan id'si
 *   compact  — true: sarlavha va izohsiz (fan/bo'lim oynasi ichida)
 *   onChange — yo'nalish haqiqatan almashganda (masalan, tanlangan bo'limni tozalash uchun)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Baby } from 'lucide-react';
import { PED_CATEGORY, usePedAudience, setPedAudience } from '../data/pedAudience';

export default function PedAudienceToggle({ category, compact = false, onChange }) {
  const { t } = useTranslation();
  const audience = usePedAudience();
  if (category !== PED_CATEGORY) return null;

  const options = [
    { id: 'school', Icon: GraduationCap, label: t('pedAudience.school') },
    { id: 'mtt', Icon: Baby, label: t('pedAudience.mtt') },
  ];

  return (
    <div style={{ marginTop: compact ? 0 : 10 }}>
      {!compact && (
        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--text3)', margin: '0 0 6px 2px' }}>
          {t('pedAudience.label')}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={t('pedAudience.label')}
        style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}
      >
        {options.map(({ id, Icon, label }) => {
          const active = audience === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { if (!active) { setPedAudience(id); onChange?.(id); } }}
              style={{
                flex: 1, minWidth: 0, minHeight: 40, padding: '8px 10px', borderRadius: 11,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: active ? '1px solid var(--accent)' : '1px solid transparent',
                background: active ? 'var(--blue-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'inherit', fontSize: 'var(--fs-sm)', fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <Icon size={16} strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
            </button>
          );
        })}
      </div>
      {!compact && (
        <p style={{ margin: '6px 2px 0', fontSize: 'var(--fs-xs)', color: 'var(--text3)', lineHeight: 1.45 }}>
          {t('pedAudience.hint')}
        </p>
      )}
    </div>
  );
}
