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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function FreeMonthBanner({ onPayClick }) {
  const { user } = useAuth();
  const { daysLeft: trialDaysLeft, isTrialExpired } = useTrialExpiry();
  const [referralDaysLeft, setReferralDaysLeft] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Referral bepul oy tugashini tekshirish
  useEffect(() => {
    if (!user || user.isPremium) return;
    const check = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return;
        const data = snap.data();
        if (!data.referredBy || !data.freeMonthExpire) return;
        if (data.premiumPlan && data.premiumPlan !== 'referral_free') return;

        const expire = new Date(data.freeMonthExpire);
        const diff = Math.ceil((expire - new Date()) / (1000 * 60 * 60 * 24));
        if (diff <= 7) setReferralDaysLeft(Math.max(0, diff));
      } catch (e) { /* jimgina o'tamiz */ }
    };
    check();
  }, [user]);

  if (dismissed || user?.isPremium) return null;

  // Qaysi banner ko'rsatilishini aniqlaymiz
  let daysLeft = null;
  let isReferral = false;

  if (referralDaysLeft !== null) {
    daysLeft = referralDaysLeft;
    isReferral = true;
  } else if (isTrialExpired) {
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
          background: bg, border: `1.5px solid ${color}40`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
        }}
      >
        <Clock size={16} style={{ color, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
          {isExpired ? (
            <strong style={{ color }}>
              {isReferral ? 'Bepul oyingiz tugadi.' : '7 kunlik sinov muddatingiz tugadi.'} Davom etish uchun to\'lang.
            </strong>
          ) : (
            <>
              {isReferral ? 'Bepul oyingizga' : 'Bepul sinov muddatingizga'}{' '}
              <strong style={{ color }}>{daysLeft} kun</strong> qoldi. To'lovni unutmang!
            </>
          )}
        </div>
        <button onClick={onPayClick} style={{
          background: color, color: '#fff', border: 'none',
          borderRadius: 8, padding: '5px 12px', fontSize: 12,
          fontWeight: 800, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4
        }}>
          <Zap size={12} /> To'lash
        </button>
        <button onClick={() => setDismissed(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', padding: 4, flexShrink: 0
        }}>
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
