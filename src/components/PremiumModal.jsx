/**
 * PremiumModal.jsx — To'lov tizimi (Telegram orqali — operator tasdiqlaydi)
 * Oqim: tariflar → to'lov usuli (promokod + Telegram to'lov → operator DM, config.SUPPORT_URL)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, X, Shield, Send, BadgePercent, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { purchasePlan } from '../services/playBilling';
import { redeemPromo, PROMO_ERRORS } from '../services/promo';
import { generateClickUrl } from '../services/payment';
import { AnalyticsEvents } from '../services/analytics';
import { isPlayBuild, SUPPORT_URL } from '../config';
import RoiBlock from './RoiBlock';
import BrandLogo from './shared/BrandLogo';

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
    color: '#0E97E0',
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
  'premium.feat1',
  'premium.feat2',
  'premium.feat3',
  'premium.feat4',
  'premium.feat5',
  'premium.feat6',
];

const PremiumModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, updateUserData } = useAuth();
  const planNameMap = { monthly: t('premium.planMonthly'), quarterly: t('premium.planQuarterly'), yearly: t('premium.planYearly') };
  const badgeMap = { 'ENG OMMABOP': t('premium.badgePopular'), 'TEJAMKOR': t('premium.badgeSaver') };
  const planLabel = (p) => p ? (planNameMap[p.id] || p.name) : '';
  const [step, setStep] = useState('plans'); // 'plans' | 'method'
  const [payMethod, setPayMethod] = useState('click'); // 'click' | 'telegram'
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  // Default — yillik plan (eng arzon kunlik narx, ROI eng kuchli)
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLANS[2]);
  const [referralBonus, setReferralBonus] = useState(0);
  const [userData, setUserData] = useState(null);

  // Promo-kod holati
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null); // { type: 'ok'|'err', text }

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
  // Play Store build'i — faqat Google Play Billing ko'rsatiladi
  const isAndroidApp = isPlayBuild();

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
        // days/team — premium serverda darhol faollashtirildi.
        // Reload kutmasdan, profil muddatini shu zahoti yangilaymiz (server mantig'i:
        // max(hozir, joriy muddat) + kunlar).
        const base = user?.premiumExpire && new Date(user.premiumExpire) > new Date()
          ? new Date(user.premiumExpire) : new Date();
        const newExpire = new Date(base.getTime() + Number(res.value) * 86400000).toISOString();
        updateUserData({ isPremium: true, isTruePremium: true, premiumExpire: newExpire, trialStatus: 'premium' });
        setPromoMsg({ type: 'ok', text: t('premium.promoPremiumOk', { value: res.value }) });
      }
      setPromoCode('');
    } else {
      setPromoMsg({ type: 'err', text: PROMO_ERRORS[res.error] || t('exam.toastError') });
    }
  };

  // 1-qadam CTA: Android — Google Play xarid; Web — to'lov usuli qadamiga o'tish
  const handleContinue = async () => {
    if (!user || !selectedPlan) return;

    if (isAndroidApp) {
      AnalyticsEvents.premiumClick('play_billing');
      setProcessing(true);
      const res = await purchasePlan(selectedPlan.id, user.uid);
      setProcessing(false);
      if (!res.success) {
        alert(res.message);
      } else {
        AnalyticsEvents.purchase(selectedPlan.id, 'play_billing', finalPrice);
        alert(res.message);
        onClose();
      }
      return;
    }

    setStep('method');
  };

  // 2-qadam CTA: tanlangan usul bo'yicha to'lov
  const handlePay = () => {
    if (!user || !selectedPlan) return;
    
    if (payMethod === 'click') {
      const amount = Math.round(finalPrice);
      // Bonus/chegirma summani to'liq qoplasa (0 so'm) — Click 0 ni qabul qilmaydi.
      // Bunday holatda operator orqali qo'lda faollashtiramiz (Telegram).
      if (amount <= 0) {
        AnalyticsEvents.premiumClick('telegram');
        window.open(SUPPORT_URL, '_blank');
        return;
      }
      AnalyticsEvents.premiumClick('click');
      const clickUrl = generateClickUrl(user.uid, user.phoneNumber || user.phone || '', amount, selectedPlan.id);
      if (clickUrl) {
        window.open(clickUrl, '_blank');
      } else {
        alert('Click sozlamalari topilmadi (.env).');
      }
    } else {
      AnalyticsEvents.premiumClick('telegram');
      window.open(SUPPORT_URL, '_blank');
    }
  };

  // Promokod kartasi — method qadamida (webda) va plans qadamida (Android'da,
  // chunki Play build'da method qadami yo'q)
  const promoCard = (
    <div style={{
      background: '#ffffff', border: '1px solid rgba(2,132,199,0.25)',
      borderRadius: 16, padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(14,151,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BadgePercent size={20} color="#0284C7" />
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('premium.promoTitle')}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{t('premium.promoSub')}</div>
        </div>
      </div>
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
            background: '#0284C7', color: '#fff',
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
  );

  // Chegirma / do'st bonusi banneri
  const bonusBanner = hasBonus && (
    <div style={{
      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: 12, padding: '10px 14px', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
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
    </div>
  );

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

          <AnimatePresence mode="wait">
            {/* ══════ 1-QADAM: TARIFLAR ══════ */}
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
                  {/* Karta doim och fonda — rang qattiq beriladi (tungi temada oq bo'lib ketmasin) */}
                  <h2 style={{ margin: '0 0 4px' }}><BrandLogo size={26} style={{ color: '#12305A' }} /></h2>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{t('premium.subtitle')}</p>
                </div>

                {/* Toifa ROI — obuna o'zini qachon oqlaydi */}
                <RoiBlock price={selectedPlan?.price} variant="light" />

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
                            ? `rgba(${plan.id === 'monthly' ? '59,130,246' : plan.id === 'quarterly' ? '14,151,224' : '16,185,129'}, 0.08)`
                            : '#ffffff',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                          transition: 'all 0.2s',
                          transform: isPopular ? 'scale(1.02)' : 'none',
                        }}
                      >
                        {plan.badge && (
                          <div style={{
                            position: 'absolute', top: 0, right: 14,
                            background: isPopular ? '#0284C7' : '#059669',
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

                {/* Features */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 14, padding: '14px', marginBottom: 18,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('premium.whatIncluded')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {FEATURES.map((key, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(14,151,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} color="#0284C7" strokeWidth={3} />
                        </span>
                        <span style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.3, fontWeight: 600 }}>{t(key)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Android: Google Play ma'lumoti + promokod */}
                {isAndroidApp && (
                  <>
                    <div style={{ padding: '16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>{t('premium.googlePlayTitle')}</div>
                      <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.4 }}>
                        {t('premium.googlePlayDesc', { plan: planLabel(selectedPlan) })}
                      </div>
                    </div>
                    {promoCard}
                    {bonusBanner}
                  </>
                )}

                {/* Asosiy tugma */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={processing}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16,
                    background: '#0284C7',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    border: 'none', cursor: processing ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 20px rgba(14,151,224,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: processing ? 0.7 : 1,
                    marginBottom: 12,
                  }}
                >
                  {isAndroidApp
                    ? <><Crown size={18} /> {t('premium.payGooglePlay', { price: fmt(finalPrice) })}</>
                    : <>{t('premium.continueBtn')}</>}
                </motion.button>

                {isAndroidApp && (
                  <div style={{ fontSize: '10px', color: 'var(--text3)', textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 1.4 }}>
                    {t('premium.termsAccept1')}<a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600 }}>{t('premium.termsLinkText')}</a>{t('premium.termsAccept2')}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
                  <Shield size={14} color="#10B981" />
                  {t('premium.securePay')}
                </div>
              </motion.div>
            )}

            {/* ══════ 2-QADAM: TO'LOV USULI (faqat web) ══════ */}
            {step === 'method' && !isAndroidApp && (
              <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <h2 style={{ fontSize: 19, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>{t('premium.choosePayMethod')}</h2>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Zehin — {planLabel(selectedPlan)}</p>
                </div>

                {/* Promokod — ko'zga tashlanadigan joyda */}
                {promoCard}

                {bonusBanner}

                {/* To'lov usullari */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {/* Click usuli */}
                  <div 
                    onClick={() => setPayMethod('click')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      border: payMethod === 'click' ? '2px solid #00a2ff' : '1.5px solid rgba(0,0,0,0.06)',
                      background: payMethod === 'click' ? 'rgba(0,162,255,0.06)' : '#fff',
                    }}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,162,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#00a2ff', letterSpacing: 0.5 }}>C</span>
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('premium.payClickTitle', 'Click orqali')}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{t('premium.payClickSub', 'Karta yoki Click ilovasi orqali')}</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: payMethod === 'click' ? '6px solid #00a2ff' : '2px solid #cbd5e1', flexShrink: 0 }} />
                  </div>

                  {/* Telegram usuli */}
                  <div 
                    onClick={() => setPayMethod('telegram')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      border: payMethod === 'telegram' ? '2px solid #0284C7' : '1.5px solid rgba(0,0,0,0.06)',
                      background: payMethod === 'telegram' ? 'rgba(14,151,224,0.06)' : '#fff',
                    }}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(14,151,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Send size={19} color="#0284C7" />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('premium.payTgTitle')}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{t('premium.payTgSub')}</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: payMethod === 'telegram' ? '6px solid #0284C7' : '2px solid #cbd5e1', flexShrink: 0 }} />
                  </div>
                </div>

                {/* Jami summa */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{t('premium.toPay')}</span>
                  <span>
                    {hasBonus && <s style={{ color: '#94a3b8', fontWeight: 600, fontSize: 13, marginRight: 8 }}>{fmt(selectedPlan?.price)}</s>}
                    <strong style={{ fontSize: 18, fontWeight: 900, color: '#0284C7' }}>{fmt(finalPrice)}</strong>
                  </span>
                </div>

                {/* To'lash */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePay}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16,
                    background: '#0284C7',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 20px rgba(14,151,224,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <Send size={18} /> {t('premium.payNow')}
                </motion.button>

                <div style={{ fontSize: '10px', color: 'var(--text3)', textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 1.4 }}>
                  {t('premium.termsAccept1')}<a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600 }}>{t('premium.termsLinkText')}</a>{t('premium.termsAccept2')}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
                  <Shield size={14} color="#10B981" />
                  {t('premium.paymentProtected')}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumModal;
