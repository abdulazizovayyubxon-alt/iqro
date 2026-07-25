/**
 * FreeMonthBanner.jsx
 * src/components/FreeMonthBanner.jsx
 *
 * Ikki turdagi foydalanuvchiga eslatma ko'rsatadi:
 * 1. Referral orqali kelgan → bepul oy tugashiga 7 kun qolganda
 * 2. Oddiy bepul user → 7 kunlik trial tugashiga 2 kun qolganda
 *
 * Qo'llash: TestPage, ExamPage boshida:
 *   <FreeMonthBanner onPayClick={() => setShowPremiumModal(true)} />
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { isPlayBuild } from '../config';

export default function FreeMonthBanner({ onPayClick }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { daysLeft: trialDaysLeft, isTrialExpired } = useTrialExpiry();
  const [dismissed, setDismissed] = useState(false);
  // Play build'da to'lovga chorlovchi matn ishlatilmaydi — PremiumModal.jsx izohiga qarang
  const isAndroidApp = isPlayBuild();

  if (dismissed || user?.isPremium) return null;

  let daysLeft = null;

  if (isTrialExpired) {
    daysLeft = 0;
  } else if (trialDaysLeft !== null && trialDaysLeft <= 2) {
    daysLeft = trialDaysLeft;
  }

  if (daysLeft === null) return null;

  const isExpired = daysLeft === 0;
  const color = isExpired ? '#ef4444' : daysLeft <= 1 ? '#f97316' : '#eab308';
  const bg = isExpired ? 'rgba(239,68,68,0.1)' : daysLeft <= 1 ? 'rgba(249,115,22,0.1)' : 'rgba(234,179,8,0.1)';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: bg, border: `1px solid ${color}30`,
          borderRadius: 16, padding: '12px 16px', marginBottom: 16,
          boxShadow: '0 4px 15px rgba(0,0,0,0.01)',
        }}
      >
        <Clock size={16} style={{ color, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
          {isExpired ? (
            <strong style={{ color }}>
              {isAndroidApp ? t('banner.expiredPlay') : t('banner.expired')}
            </strong>
          ) : (
            <>
              {t('banner.daysP1')}{' '}
              <strong style={{ color }}>{t('banner.days', { count: daysLeft })}</strong> {isAndroidApp ? t('banner.daysP2Play') : t('banner.daysP2')}
            </>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPayClick}
          style={{
            background: color, color: '#fff', border: 'none',
            borderRadius: 10, padding: '6px 14px', fontSize: 12,
            fontWeight: 800, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          <Zap size={12} /> {isAndroidApp ? t('banner.payPlay') : t('banner.pay')}
        </motion.button>
        <button onClick={() => setDismissed(true)} aria-label={t('common.close')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
