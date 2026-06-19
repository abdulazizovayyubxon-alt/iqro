import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { TOIFA_SALARY } from '../config';

const fmtSum = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/,/g, ' ') + ' ' + i18n.t('roi.currency');

/**
 * Toifa ROI kalkulyatori — obuna narxini toifa oshganda keladigan
 * oylik qo'shimcha daromad bilan solishtiradi.
 *
 * props:
 *  - price: solishtiriladigan obuna narxi (so'm)
 *  - planName: plan nomi (masalan "12 Oylik")
 *  - targetToifa: 'oliy' | '1-toifa' | '2-toifa' (default '1-toifa')
 *  - variant: 'light' (PremiumModal oq kartasi ichida) | 'theme' (tema ranglarida)
 */
export default function RoiBlock({ price, planName, targetToifa = '1-toifa', variant = 'light' }) {
  const { t } = useTranslation();
  const delta = TOIFA_SALARY.deltas[targetToifa];
  if (!delta || !price) return null;

  const monthlyGain = TOIFA_SALARY.base * delta;
  const paybackDays = Math.max(1, Math.ceil(price / (monthlyGain / 30)));
  const labelMap = { oliy: t('roi.labelOliy'), '1-toifa': t('roi.label1'), '2-toifa': t('roi.label2') };
  const label = labelMap[targetToifa] || TOIFA_SALARY.labels[targetToifa] || targetToifa;

  const isLight = variant === 'light';
  const colors = isLight
    ? { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', title: '#047857', text: '#334155', strong: '#10B981' }
    : { bg: 'var(--green-bg)', border: 'var(--border)', title: 'var(--green)', text: 'var(--text2)', strong: 'var(--green)' };

  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 14, padding: '12px 14px', marginBottom: 14,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>📈</span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: colors.title, marginBottom: 3 }}>
          {t('roi.gainLine', { label, amount: fmtSum(monthlyGain) })}
        </div>
        <div style={{ fontSize: 11.5, color: colors.text, lineHeight: 1.5 }}>
          {t('roi.paybackP1', { sub: planName ? t('roi.subscription', { plan: planName }) : t('roi.subscriptionGeneric'), price: fmtSum(price) })}{' '}
          <strong style={{ color: colors.strong }}>{t('roi.days', { days: paybackDays })}</strong>{t('roi.paybackP2')}
        </div>
      </div>
    </div>
  );
}
