import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { TrendingUp } from 'lucide-react';
import { TOIFA_SALARY } from '../config';

const fmtSum = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/,/g, ' ') + ' ' + i18n.t('roi.currency');

/**
 * Toifa ROI — qisqa qiymat kartasi: katta raqam (oylik maosh farqi) +
 * "~N kunda oqlanadi" chipi. Uzun tushuntirish o'rniga raqam-birinchi,
 * ikki qatorli format — tez o'qiladi, ishonchli ko'rinadi.
 *
 * props:
 *  - price: solishtiriladigan obuna narxi (so'm)
 *  - targetToifa: 'oliy' | '1-toifa' | '2-toifa' (default '1-toifa')
 *  - variant: 'light' (PremiumModal oq kartasi ichida) | 'theme' (tema ranglarida)
 */
export default function RoiBlock({ price, targetToifa = '1-toifa', variant = 'light' }) {
  const { t } = useTranslation();
  const monthlyGain = TOIFA_SALARY.gains[targetToifa];
  if (!monthlyGain || !price) return null;

  const paybackDays = Math.max(1, Math.ceil(price / (monthlyGain / 30)));
  const labelMap = { oliy: t('roi.labelOliy'), '1-toifa': t('roi.label1'), '2-toifa': t('roi.label2') };
  const label = labelMap[targetToifa] || TOIFA_SALARY.labels[targetToifa] || targetToifa;

  const isLight = variant === 'light';
  const c = isLight
    ? {
        bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.25)',
        num: '#047857', cap: '#64748B',
        iconBg: 'rgba(16,185,129,0.12)', icon: '#10B981',
        chipBg: 'rgba(14,151,224,0.1)', chip: '#0284C7',
      }
    : {
        bg: 'var(--green-bg)', border: 'var(--border)',
        num: 'var(--green)', cap: 'var(--text3)',
        iconBg: 'var(--bg3)', icon: 'var(--green)',
        chipBg: 'var(--blue-bg)', chip: 'var(--accent2)',
      };

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 14, padding: '11px 14px', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <TrendingUp size={17} color={c.icon} />
      </span>
      <div style={{ flex: 1, minWidth: 130 }}>
        <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: c.num, letterSpacing: -0.2, whiteSpace: 'nowrap' }}>
          {t('roi.gainValue', { amount: fmtSum(monthlyGain) })}
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: c.cap, fontWeight: 600, marginTop: 1 }}>
          {t('roi.gainCaption', { label })}
        </div>
      </div>
      <div style={{ background: c.chipBg, color: c.chip, fontSize: 'var(--fs-xs)', fontWeight: 800, padding: '6px 10px', borderRadius: 9, whiteSpace: 'nowrap' }}>
        {t('roi.payback', { days: paybackDays })}
      </div>
    </div>
  );
}
