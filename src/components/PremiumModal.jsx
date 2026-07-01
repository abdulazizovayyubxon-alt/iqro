/**
 * PremiumModal.jsx — To'lov tizimi (Telegram orqali — karta, operator tasdiqlaydi)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, X, Shield, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { purchasePlan } from '../services/playBilling';
import { redeemPromo, PROMO_ERRORS } from '../services/promo';
import { AnalyticsEvents } from '../services/analytics';
import { isPlayBuild } from '../config';
import RoiBlock from './RoiBlock';

// Default tariflar (Firestore dan yuklanmasa)
const DEFAULT_PLANS = [
  {
    id: 'monthly',
    name: '1 Oylik',
    price: 30000,
    durationMonths: 1,
    perDay: 1000,
    badge: null,
    color: '#3B82F6',
  },
  {
    id: 'quarterly',
    name: '3 Oylik',
    price: 75000,
    durationMonths: 3,
    perDay: 833,
    badge: 'ENG OMMABOP',
    color: '#8B5CF6',
    savings: '17%',
  },
  {
    id: 'yearly',
    name: '12 Oylik',
    price: 240000,
    durationMonths: 12,
    perDay: 667,
    badge: 'TEJAMKOR',
    color: '#10B981',
    savings: '33%',
  },
];

const FEATURES = [
  { icon: '📚', key: 'premium.feat1' },
  { icon: '🎯', key: 'premium.feat2' },
  { icon: '🧠', key: 'premium.feat3' },
  { icon: '📊', key: 'premium.feat4' },
  { icon: '🏆', key: 'premium.feat5' },
  { icon: '⚡', key: 'premium.feat6' },
];

const PremiumModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const planNameMap = { monthly: t('premium.planMonthly'), quarterly: t('premium.planQuarterly'), yearly: t('premium.planYearly') };
  const badgeMap = { 'ENG OMMABOP': t('premium.badgePopular'), 'TEJAMKOR': t('premium.badgeSaver') };
  const planLabel = (p) => p ? (planNameMap[p.id] || p.name) : '';
  const [step, setStep] = useState('plans'); // 'plans' | 'method' | 'telegram_guide'
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  // Default — yillik plan (eng arzon kunlik narx, ROI eng kuchli)
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLANS[2]);
  const [referralBonus, setReferralBonus] = useState(0);
  const [userData, setUserData] = useState(null);

  // Promo-kod holati
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null); // { type: 'ok'|'err', text }
  const [payMethod, setPayMethod] = useState('telegram'); // 'telegram' | 'payme' | 'click'

  // onClose'ni ref orqali ushlaymiz — ota komponent har soniyada qayta render
  // bo'lganda (masalan ProfilePage urgency timer) popstate effekti qayta
  // ishlab modalni o'z-o'zidan yopib qo'ymasligi uchun.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen || !user) return;
    setStep('plans');
    setProcessing(false);

    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'premium'));
        if (docSnap.exists() && docSnap.data().plans?.length > 0) {
          const dbPlans = docSnap.data().plans;
          setPlans(dbPlans);
          // Default — yillik (eng uzun) plan
          setSelectedPlan(dbPlans.find(p => p.id === 'yearly') || dbPlans[dbPlans.length - 1] || dbPlans[0]);
        }
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const d = userSnap.data();
          setReferralBonus(d.referralBonus || 0);
          setUserData(d);
        }
      } catch (e) { console.error('PremiumModal fetch error:', e); }
    };
    fetchData();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ premiumModalOpen: true }, '');
    const handlePopState = () => onCloseRef.current();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.premiumModalOpen) window.history.back();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(',', ' ') + ' ' + i18n.t('premium.currency');
  
  // Chegirmalar STACK qilinmaydi — referral va promo'dan eng kattasi qo'llanadi
  const referralPercent = userData?.referralDiscount || 0;
  const promoPercent = userData?.promoDiscount?.percent || 0;
  const discountPercent = Math.max(referralPercent, promoPercent);
  const hasReferralDiscount = discountPercent > 0;
  const discountSource = promoPercent > referralPercent ? 'promo' : 'referral';

  let finalPrice = selectedPlan ? selectedPlan.price : 0;
  if (hasReferralDiscount) {
    finalPrice = Math.max(0, finalPrice * (100 - discountPercent) / 100);
  }
  finalPrice = Math.max(0, finalPrice - referralBonus);

  const hasBonus = (referralBonus > 0 || hasReferralDiscount) && selectedPlan;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  // Play Store build'i — faqat Google Play Billing ko'rsatiladi (Click/Payme/Telegram yashiriladi)
  const isAndroidApp = isPlayBuild();
  const CHANNEL_USERNAME = 'Toifapro';

  const handleRedeem = async () => {
    const code = promoCode.trim();
    if (!code || promoLoading) return;
    setPromoLoading(true);
    setPromoMsg(null);
    const res = await redeemPromo(code);
    setPromoLoading(false);
    if (res.ok) {
      if (res.type === 'percent') {
        setUserData(prev => ({ ...(prev || {}), promoDiscount: { code: code.toUpperCase(), percent: res.value } }));
        setPromoMsg({ type: 'ok', text: t('premium.promoRedeemOk', { value: res.value }) });
      } else {
        // days/team — premium serverda darhol faollashtirildi
        setPromoMsg({ type: 'ok', text: t('premium.promoPremiumOk', { value: res.value }) });
      }
      setPromoCode('');
    } else {
      setPromoMsg({ type: 'err', text: PROMO_ERRORS[res.error] || t('exam.toastError') });
    }
  };

  const handlePay = async () => {
    if (!user || !selectedPlan) return;

    // Analitika: to'lov niyati (yuqori-niyat signali — voronka konversiyasi uchun)
    AnalyticsEvents.premiumClick(isAndroidApp ? 'play_billing' : 'telegram');

    if (isAndroidApp) {
      setProcessing(true);
      const res = await purchasePlan(selectedPlan.id, user.uid);
      setProcessing(false);
      if (!res.success) {
        alert(res.message);
      } else {
        // Analitika: xarid yakunlandi (Play Billing — mijoz tomonida tasdiqlanadigan oqim)
        AnalyticsEvents.purchase(selectedPlan.id, 'play_billing', finalPrice);
        alert(res.message);
        onClose();
      }
      return;
    }

    // Web — yagona to'lov usuli: Telegram (karta orqali, operator tasdiqlaydi)
    if (payMethod === 'telegram') {
      const tgUrl = `https://t.me/${CHANNEL_USERNAME}?direct`;
      window.open(tgUrl, '_blank');
      setStep('telegram_guide');
    } else {
      // Payme / Click kelajakda qo'shiladi
      alert("Bu to'lov usuli tez kunda ishga tushadi! Hozircha Telegram orqali to'lov qiling.");
      setPayMethod('telegram');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '20px',
      }}
    >
      <motion.div
        initial={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.92, opacity: 0 }}
        animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 35 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: '#ffffff',
          borderRadius: isMobile ? '24px 24px 0 0' : '24px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 24px 50px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          maxHeight: '94vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 300, height: 150, pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(41,182,246,0.12) 0%, transparent 70%)',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step !== 'plans' && (
              <button
                onClick={() => setStep('plans')}
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8, padding: '0 16px', minHeight: 48, cursor: 'pointer', color: '#64748B', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' }}
              >
                ← {t('common.back')}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 12, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 32px' }}>

          {/* ══════ STEP 1: TARIFLAR VA TO'LOV USULI ══════ */}
          <AnimatePresence mode="wait">
            {step === 'plans' && (
              <motion.div key="plans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    style={{ fontSize: 48, marginBottom: 8 }}
                  >
                    👑
                  </motion.div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Toifa Pro</h2>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('premium.subtitle')}</p>
                </div>

                {/* Xavfsizlik belgisi */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20, fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                  <Shield size={14} />
                  <span>{t('premium.securePay')}</span>
                </div>

                {/* Toifa ROI — obuna o'zini qachon oqlaydi */}
                <RoiBlock price={selectedPlan?.price} planName={planLabel(selectedPlan)} variant="light" />

                {/* Tariflar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {plans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    const isPopular = plan.badge === 'ENG OMMABOP';
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        style={{
                          position: 'relative', padding: '14px 16px', borderRadius: 14,
                          cursor: 'pointer',
                          border: isSelected ? `2px solid ${plan.color}` : '1.5px solid rgba(0,0,0,0.06)',
                          background: isSelected
                            ? `rgba(${plan.id === 'monthly' ? '59,130,246' : plan.id === 'quarterly' ? '139,92,246' : '16,185,129'}, 0.08)`
                            : '#ffffff',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                          transition: 'all 0.2s',
                          transform: isPopular ? 'scale(1.02)' : 'none',
                        }}
                      >
                        {plan.badge && (
                          <div style={{
                            position: 'absolute', top: 0, right: 14,
                            background: isPopular ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'linear-gradient(135deg, #10B981, #059669)',
                            color: '#fff', fontSize: 9, fontWeight: 900,
                            padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: 0.8,
                          }}>
                            {badgeMap[plan.badge] || plan.badge}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{planLabel(plan)}</span>
                              {plan.savings && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 6px', borderRadius: 5 }}>
                                  -{plan.savings}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 500 }}>
                              {plan.perDay ? t('premium.perDay', { amount: plan.perDay.toLocaleString() }) : t('premium.months', { count: plan.durationMonths })}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: plan.color || '#0f172a' }}>
                              {fmt(plan.price)}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '50%', left: -1, transform: 'translateY(-50%)', width: 3, height: '60%', background: plan.color, borderRadius: '0 3px 3px 0' }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Referral bonus / chegirma */}
                <AnimatePresence>
                  {hasBonus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>🎁</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                          {hasReferralDiscount && t('premium.discountLine', { label: discountSource === 'promo' ? t('premium.discountPromo') : t('premium.discountReferral'), percent: discountPercent })}
                          {hasReferralDiscount && referralBonus > 0 && ' | '}
                          {referralBonus > 0 && t('premium.friendBonus', { amount: fmt(referralBonus) })}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569' }}>
                          {t('premium.total')} <s style={{ opacity: 0.5 }}>{fmt(selectedPlan?.price)}</s> → <strong style={{ color: '#10B981' }}>{fmt(finalPrice)}</strong>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Promo-kod */}
                <div style={{ marginBottom: 14 }}>
                  {!promoOpen ? (
                    <button
                      onClick={() => setPromoOpen(true)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
                        fontSize: 12, fontWeight: 700, color: '#0284C7', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {t('premium.havePromo')}
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={promoCode}
                          onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(null); }}
                          onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                          placeholder={t('premium.promoPlaceholder')}
                          maxLength={32}
                          style={{
                            flex: 1, padding: '11px 14px', borderRadius: 12, fontSize: 14,
                            border: '1.5px solid rgba(0,0,0,0.1)', background: '#f8fafc',
                            color: '#0f172a', fontFamily: 'inherit', fontWeight: 700,
                            letterSpacing: 1, outline: 'none', textTransform: 'uppercase',
                            boxSizing: 'border-box', minWidth: 0,
                          }}
                        />
                        <button
                          onClick={handleRedeem}
                          disabled={promoLoading || !promoCode.trim()}
                          style={{
                            padding: '11px 18px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #0E97E0, #0284C7)', color: '#fff',
                            fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                            cursor: promoLoading ? 'wait' : 'pointer',
                            opacity: promoLoading || !promoCode.trim() ? 0.6 : 1, flexShrink: 0,
                          }}
                        >
                          {promoLoading ? '...' : t('premium.apply')}
                        </button>
                      </div>
                      {promoMsg && (
                        <div style={{
                          marginTop: 8, fontSize: 12, fontWeight: 600,
                          color: promoMsg.type === 'ok' ? '#10B981' : '#EF4444',
                        }}>
                          {promoMsg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* To'lov usullari */}
                <div style={{ marginBottom: 16 }}>
                  {isAndroidApp ? (
                    <div style={{ padding: '16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>{t('premium.googlePlayTitle')}</div>
                      <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.4 }}>
                        {t('premium.googlePlayDesc', { plan: planLabel(selectedPlan) })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {t('premium.payMethodTitle', "To'lov usuli")}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Telegram */}
                        <div
                          onClick={() => setPayMethod('telegram')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                            padding: '14px 16px', borderRadius: 14,
                            border: payMethod === 'telegram' ? '2px solid #0E97E0' : '1px solid rgba(0,0,0,0.08)',
                            background: payMethod === 'telegram' ? 'rgba(14,151,224,0.08)' : '#fff',
                            transition: 'all 0.2s',
                          }}>
                          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(14,151,224,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Send size={18} color="#0E97E0" />
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('premium.payTelegram')}</div>
                          </div>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: payMethod === 'telegram' ? '6px solid #0E97E0' : '2px solid #cbd5e1' }} />
                        </div>

                        {/* Payme & Click (Coming soon) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div
                            onClick={() => setPayMethod('payme')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                              padding: '10px 12px', borderRadius: 12,
                              border: payMethod === 'payme' ? '2px solid #31c48d' : '1px solid rgba(0,0,0,0.08)',
                              background: payMethod === 'payme' ? 'rgba(49,196,141,0.08)' : '#fff',
                            }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#31c48d', flex: 1 }}>Payme</span>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: payMethod === 'payme' ? '5px solid #31c48d' : '2px solid #cbd5e1' }} />
                          </div>
                          <div
                            onClick={() => setPayMethod('click')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                              padding: '10px 12px', borderRadius: 12,
                              border: payMethod === 'click' ? '2px solid #00a2ff' : '1px solid rgba(0,0,0,0.08)',
                              background: payMethod === 'click' ? 'rgba(0,162,255,0.08)' : '#fff',
                            }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#00a2ff', flex: 1 }}>Click</span>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: payMethod === 'click' ? '5px solid #00a2ff' : '2px solid #cbd5e1' }} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Ishonch belgilari (Trust Badges) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>✓</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>Muntazam yangilanib boruvchi baza</div>
                      <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>Eng so'nggi standartlar asosida</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(59,130,246,0.08)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>✓</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A' }}>Keng qamrovli izohlar</div>
                      <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 2 }}>Har bir savol uchun tushunarli yechimlar</div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 14, padding: '14px', marginBottom: 18,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('premium.whatIncluded')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {FEATURES.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{f.icon}</span>
                        <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.3, fontWeight: 600 }}>{t(f.key)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asosiy tugma */}
                {isAndroidApp ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePay}
                    disabled={processing}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 16,
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: '#fff', fontWeight: 800, fontSize: 16,
                      border: 'none', cursor: processing ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      opacity: processing ? 0.7 : 1,
                      marginBottom: 12,
                    }}
                  >
                    <><Crown size={18} /> {t('premium.payGooglePlay', { price: fmt(finalPrice) })}</>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePay}
                    disabled={processing}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 16,
                      background: 'linear-gradient(135deg, #0E97E0, #0284C7)',
                      color: '#fff', fontWeight: 800, fontSize: 16,
                      border: 'none', cursor: processing ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: '0 4px 20px rgba(14,151,224,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      opacity: processing ? 0.7 : 1,
                      marginBottom: 12,
                    }}
                  >
                    <Send size={18} /> {t('premium.payViaTelegram', { price: fmt(finalPrice) })}
                  </motion.button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
                  <Shield size={14} color="#10B981" />
                  {t('premium.paymentProtected')}
                </div>
              </motion.div>
            )}

            {/* ══════ TELEGRAM YO'RIQNOMA (faqat web — Play build'da yashiriladi) ══════ */}
            {step === 'telegram_guide' && !isAndroidApp && (
              <motion.div key="telegram_guide" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>📱</div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>{t('premium.tgGuideTitle')}</h2>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                    {t('premium.tgGuideDesc')}
                  </p>
                </div>

                {/* Qadamlar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {[
                    { step: '1', icon: '💳', text: t('premium.tgStep1') },
                    { step: '2', icon: '📸', text: t('premium.tgStep2') },
                    { step: '3', icon: '💬', text: t('premium.tgStep3') },
                    { step: '4', icon: '⚡', text: t('premium.tgStep4') },
                  ].map((item) => (
                    <div
                      key={item.step}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 14,
                        background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #0E97E0, #0284C7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: '#fff',
                      }}>
                        {item.step}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.4, fontWeight: 600 }}>{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Karta raqami */}
                <div style={{
                  background: 'rgba(41,182,246,0.1)', border: '1px solid rgba(41,182,246,0.3)',
                  borderRadius: 14, padding: '14px 16px', marginBottom: 20,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6, fontWeight: 700 }}>{t('premium.payCard')}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0E97E0', letterSpacing: 3, fontFamily: 'monospace' }}>
                    9860 3501 4333 3655
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4, fontWeight: 600 }}>Ayyubxon Abdulazizov</div>
                </div>

                {/* Kanalga o'tish */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => window.open(`https://t.me/${CHANNEL_USERNAME}?direct`, '_blank')}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 16,
                    background: 'linear-gradient(135deg, #0E97E0, #0284C7)',
                    color: '#fff', fontWeight: 800, fontSize: 15,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Send size={18} />
                  Kanalga o'tish
                </motion.button>

                <button
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 14, background: 'transparent',
                    color: '#64748B', border: '1px solid rgba(0,0,0,0.1)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {t('premium.closeAfterReceipt')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumModal;
