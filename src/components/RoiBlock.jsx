import React from 'react';
import { TOIFA_SALARY } from '../config';

const fmtSum = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/,/g, ' ') + " so'm";

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
  const delta = TOIFA_SALARY.deltas[targetToifa];
  if (!delta || !price) return null;

  const monthlyGain = TOIFA_SALARY.base * delta;
  const paybackDays = Math.max(1, Math.ceil(price / (monthlyGain / 30)));
  const label = TOIFA_SALARY.labels[targetToifa] || targetToifa;

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
          {label} = oyligingizga +{fmtSum(monthlyGain)}
        </div>
        <div style={{ fontSize: 11.5, color: colors.text, lineHeight: 1.5 }}>
          {planName ? `${planName} obuna` : 'Obuna'} ({fmtSum(price)}) toifa olganingizda o'zini{' '}
          <strong style={{ color: colors.strong }}>~{paybackDays} kunda</strong> oqlaydi.
        </div>
      </div>
    </div>
  );
}
