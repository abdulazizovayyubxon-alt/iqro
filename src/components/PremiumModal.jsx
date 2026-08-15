/**
 * PremiumModal.jsx — obuna oynasi
 *
 * Web: tariflar → to'lov usuli (Click / Telegram operator) + promokod.
 * ⚠️ 2026-08-14: config.CLICK_ENABLED = false — Click varianti foydalanuvchidan
 * yashirilgan, 2-qadamda faqat Telegram operatori (Zehin direkt) qoladi.
 * Bayroq true bo'lsa tanlov avtomatik qaytadi.
 * Play build (isPlayBuild): sotuv UI'si YO'Q — narx, tarif, to'lov tugmasi va
 * tashqi havola ko'rsatilmaydi. Google Play Payments siyosati ta'lim obunasini
 * ilova ichida faqat Play Billing orqali sotishga ruxsat beradi, O'zbekiston
 * esa alternativ/tashqi to'lov dasturlariga kirmaydi. Shuning uchun Play
 * versiyasida faqat "yopiq" holat va promokod qoladi; obuna saytda
 * rasmiylashtiriladi va AuthContext kuzatuvchisi orqali avtomatik ochiladi.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, X, Shield, Send, BadgePercent, Check, Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { redeemPromo, PROMO_ERRORS } from '../services/promo';
import { generateClickUrl } from '../services/payment';
import { AnalyticsEvents } from '../services/analytics';
import { isPlayBuild, CLICK_ENABLED, PAYMENT_TG_URL } from '../config';
import { useModalA11y } from '../hooks/useModalA11y';
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
  // Click yashirilgan bo'lsa — yagona usul Telegram operatori
  const [payMethod, setPayMethod] = useState(CLICK_ENABLED ? 'click' : 'telegram'); // 'click' | 'telegram'
  const [orderCopied, setOrderCopied] = useState(false);
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
  // Escape, fokus tutqichi, fokusni qaytarish (T-10)
  const dialogRef = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (!isOpen || !user) return;
    setStep('plans');
    setOrderCopied(false);

    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'premium'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.plans?.length > 0) {
            const dbPlans = data.plans;
            setPlans(dbPlans);
            // Default — yillik (eng uzun) plan
            setSelectedPlan(dbPlans.find(p => p.id === 'yearly') || dbPlans[dbPlans.length - 1] || dbPlans[0]);
          }
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
  // Play build — sotuv UI'si ko'rsatilmaydi (yuqoridagi izohga qarang)
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

  // 1-qadam CTA: to'lov usuliga o'tish (faqat web — Play build'da bu tugma yo'q)
  const handleContinue = () => {
    if (!user || !selectedPlan) return;
    setOrderCopied(false);
    setStep('method');
  };

  // Operatorga yuboriladigan buyurtma matni — administrator qaysi foydalanuvchiga
  // qaysi tarifni yoqishini AYNAN shu ma'lumotdan biladi (ID siz tasdiqlab bo'lmaydi).
  const orderText = selectedPlan
    ? `Zehin Pro\n${t('premium.tgOrderPlan')}: ${planLabel(selectedPlan)}\n${t('premium.toPay')}: ${fmt(finalPrice)}\nID: ${user?.uid || ''}`
    : '';

  const copyOrder = () => {
    // Nusxalash muvaffaqiyatsiz bo'lsa ham muammo yo'q — matn ekranda ko'rinib turibdi
    try {
      navigator.clipboard?.writeText(orderText).then(() => setOrderCopied(true)).catch(() => {});
    } catch (_) { /* bufer bloklangan */ }
  };

  // Telegram operatori (Zehin direkt) — kartadan kartaga to'lov shu yerda rasmiylashadi.
  // Kanalning "direkt" chatida ?text= oldindan to'ldirilmaydi, shuning uchun buyurtma
  // ma'lumotini buferga ko'chiramiz. window.open sinxron chaqiriladi — aks holda
  // brauzer uni foydalanuvchi harakatidan uzilgan deb bloklaydi.
  const openTelegramOperator = () => {
    AnalyticsEvents.premiumClick('telegram');
    copyOrder();
    window.open(PAYMENT_TG_URL, '_blank', 'noopener,noreferrer');
  };

  // 2-qadam CTA: Click (agar yoqilgan bo'lsa) yoki Telegram operator to'lovi
  const handlePay = () => {
    if (!user || !selectedPlan) return;

    if (CLICK_ENABLED && payMethod === 'click') {
      const amount = Math.round(finalPrice);
      const clickUrl = generateClickUrl(user.uid, user.phoneNumber || user.phone || '', amount, selectedPlan.id);
      if (clickUrl) {
        AnalyticsEvents.premiumClick('click');
        window.open(clickUrl, '_blank');
        return;
      }
      // Click sozlanmagan — operatorga tushamiz
    }

    openTelegramOperator();
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
          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: '#0f172a' }}>{t('premium.promoTitle')}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: '#64748B' }}>{t('premium.promoSub')}</div>
        </div>
      </div>
      {/* Guruh/hamkor kodi natijalarni guruh ustoziga ochadi — kod kiritishdan
          OLDIN aytiladi (ReferralPage'dagi bilan bir xil matn). */}
      <div style={{ fontSize: 'var(--fs-2xs)', color: '#64748B', marginBottom: 10, lineHeight: 1.45 }}>
        {t('referral.promoPrivacy')}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={promoCode}
          onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(null); }}
          onKeyDown={e => e.key === 'Enter' && handleRedeem()}
          placeholder={t('premium.promoPlaceholder')}
          maxLength={32}
          style={{
            flex: 1, padding: '11px 14px', borderRadius: 12, fontSize: 'var(--fs-input)',
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
            fontSize: 'var(--fs-md)', fontWeight: 800, fontFamily: 'inherit',
            cursor: promoLoading ? 'wait' : 'pointer',
            opacity: promoLoading || !promoCode.trim() ? 0.6 : 1, flexShrink: 0,
          }}
        >
          {promoLoading ? '...' : t('premium.apply')}
        </button>
      </div>
      {promoMsg && (
        <div style={{
          marginTop: 8, fontSize: 'var(--fs-sm)', fontWeight: 600,
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
      <span style={{ fontSize: 'var(--fs-2xl)', flexShrink: 0, lineHeight: 1 }}>🎁</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#10B981' }}>
          {hasReferralDiscount && t('premium.discountLine', { label: discountSource === 'promo' ? t('premium.discountPromo') : t('premium.discountReferral'), percent: discountPercent })}
          {hasReferralDiscount && referralBonus > 0 && ' | '}
          {referralBonus > 0 && t('premium.friendBonus', { amount: fmt(referralBonus) })}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: '#475569' }}>
          {t('premium.total')} <s style={{ opacity: 0.5 }}>{fmt(selectedPlan?.price)}</s> → <strong style={{ color: '#10B981' }}>{fmt(finalPrice)}</strong>
        </div>
      </div>
    </div>
  );

  // Obunaga nimalar kirishi — ikkala rejimda ham ko'rsatiladi (narxga bog'liq emas)
  const featuresBox = (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 14, padding: '14px', marginBottom: 18,
    }}>
      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('premium.whatIncluded')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FEATURES.map((key, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(14,151,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={11} color="#0284C7" strokeWidth={3} />
            </span>
            <span style={{ fontSize: 'var(--fs-xs)', color: '#334155', lineHeight: 1.3, fontWeight: 600 }}>{t(key)}</span>
          </div>
        ))}
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('premium.title', 'Pro obuna')}
        tabIndex={-1}
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
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8, padding: '0 16px', minHeight: 48, cursor: 'pointer', color: '#64748B', fontSize: 'var(--fs-md)', fontWeight: 600, display: 'flex', alignItems: 'center' }}
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

          {/* ══════ PLAY BUILD: yopiq holat — sotuv UI'si yo'q ══════ */}
          {isAndroidApp && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{
                  width: 62, height: 62, borderRadius: 18, margin: '0 auto 12px',
                  background: 'rgba(14,151,224,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={26} color="#0284C7" strokeWidth={2.4} />
                </span>
                {/* Karta doim och fonda — rang qattiq beriladi (tungi temada oq bo'lib ketmasin) */}
                <h2 style={{ margin: '0 0 8px' }}><BrandLogo size={26} style={{ color: '#12305A' }} /></h2>
                <p style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.35 }}>
                  {t('premium.lockedTitle')}
                </p>
                <p style={{ fontSize: 'var(--fs-sm)', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  {t('premium.lockedDesc')}
                </p>
              </div>

              {featuresBox}

              {promoCard}

              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16,
                  background: 'rgba(0,0,0,0.05)', color: '#334155',
                  fontWeight: 800, fontSize: 'var(--fs-lg)', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t('common.close')}
              </button>
            </div>
          )}

          {!isAndroidApp && (
          <AnimatePresence mode="wait">
            {/* ══════ 1-QADAM: TARIFLAR ══════ */}
            {step === 'plans' && (
              <motion.div key="plans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    style={{ fontSize: 'var(--fs-12xl)', marginBottom: 8 }}
                  >
                    👑
                  </motion.div>
                  {/* Karta doim och fonda — rang qattiq beriladi (tungi temada oq bo'lib ketmasin) */}
                  <h2 style={{ margin: '0 0 4px' }}><BrandLogo size={26} style={{ color: '#12305A' }} /></h2>
                  <p style={{ fontSize: 'var(--fs-md)', color: '#64748B', margin: 0 }}>{t('premium.subtitle')}</p>
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
                            color: '#fff', fontSize: 'var(--fs-3xs)', fontWeight: 900,
                            padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: 0.8,
                          }}>
                            {badgeMap[plan.badge] || plan.badge}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: '#0f172a' }}>{planLabel(plan)}</span>
                              {plan.savings && (
                                <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 6px', borderRadius: 5 }}>
                                  -{plan.savings}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 'var(--fs-xs)', color: '#64748B', marginTop: 2, fontWeight: 500 }}>
                              {plan.perDay ? t('premium.perDay', { amount: plan.perDay.toLocaleString() }) : t('premium.months', { count: plan.durationMonths })}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 900, color: plan.color || '#0f172a' }}>
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

                {featuresBox}

                {/* Asosiy tugma */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16,
                    background: '#0284C7',
                    color: '#fff', fontWeight: 800, fontSize: 'var(--fs-xl)',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 20px rgba(14,151,224,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 12,
                  }}
                >
                  {t('premium.continueBtn')}
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                  <Shield size={14} color="#10B981" />
                  {t('premium.securePay')}
                </div>
              </motion.div>
            )}

            {/* ══════ 2-QADAM: TO'LOV USULI (faqat web) ══════ */}
            {step === 'method' && (
              <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <h2 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
                    {CLICK_ENABLED ? t('premium.choosePayMethod') : t('premium.payTgTitle')}
                  </h2>
                  <p style={{ fontSize: 'var(--fs-sm)', color: '#64748B', margin: 0 }}>Zehin — {planLabel(selectedPlan)}</p>
                </div>

                {/* Promokod — ko'zga tashlanadigan joyda */}
                {promoCard}

                {bonusBanner}

                {/* To'lov usullari.
                    CLICK_ENABLED = false — foydalanuvchiga tanlov ko'rsatilmaydi,
                    yagona yo'l Telegram operatori (Zehin direkt) sifatida tushuntiriladi. */}
                {CLICK_ENABLED ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {/* Click option */}
                    <div
                      onClick={() => setPayMethod('click')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 14,
                        cursor: 'pointer',
                        border: payMethod === 'click' ? '2px solid #00a2ff' : '1.5px solid rgba(0,0,0,0.08)',
                        background: payMethod === 'click' ? 'rgba(0,162,255,0.06)' : '#ffffff',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,162,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: '#00a2ff', letterSpacing: 0.5 }}>C</span>
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: '#0f172a' }}>{t('premium.payClickTitle')}</div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: '#64748B', marginTop: 2 }}>{t('premium.payClickSub')}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: payMethod === 'click' ? '6px solid #00a2ff' : '2px solid #cbd5e1',
                        flexShrink: 0
                      }} />
                    </div>

                    {/* Telegram Operator option */}
                    <div
                      onClick={() => setPayMethod('telegram')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', borderRadius: 14,
                        cursor: 'pointer',
                        border: payMethod === 'telegram' ? '2px solid #229ED9' : '1.5px solid rgba(0,0,0,0.08)',
                        background: payMethod === 'telegram' ? 'rgba(34,158,217,0.06)' : '#ffffff',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,158,217,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Send size={18} color="#229ED9" />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: '#0f172a' }}>{t('premium.payTelegramTitle')}</div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: '#64748B', marginTop: 2 }}>{t('premium.payTelegramSub')}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: payMethod === 'telegram' ? '6px solid #229ED9' : '2px solid #cbd5e1',
                        flexShrink: 0
                      }} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Yagona usul — operator orqali kartadan kartaga */}
                    <div style={{
                      border: '1.5px solid rgba(34,158,217,0.35)', background: 'rgba(34,158,217,0.06)',
                      borderRadius: 14, padding: '14px 16px', marginBottom: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,158,217,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Send size={18} color="#229ED9" />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: '#0f172a' }}>{t('premium.payTelegramTitle')}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: '#64748B', marginTop: 2 }}>{t('premium.payTelegramSub')}</div>
                        </div>
                      </div>
                      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {['tgStep1', 'tgStep2', 'tgStep3'].map((key, i) => (
                          <li key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%', background: '#229ED9', color: '#fff',
                              fontSize: 'var(--fs-3xs)', fontWeight: 900, flexShrink: 0, marginTop: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{i + 1}</span>
                            <span style={{ fontSize: 'var(--fs-sm)', color: '#334155', lineHeight: 1.45, fontWeight: 600 }}>
                              {t(`premium.${key}`)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Buyurtma ma'lumotlari — operatorga aynan shu yuboriladi */}
                    <div style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 14, padding: '12px 14px', marginBottom: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {t('premium.tgOrder')}
                        </span>
                        <button
                          onClick={copyOrder}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 10px', borderRadius: 9, border: '1px solid #cbd5e1',
                            background: '#ffffff', color: orderCopied ? '#10B981' : '#334155',
                            fontSize: 'var(--fs-2xs)', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
                          }}
                        >
                          {orderCopied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                          {orderCopied ? t('premium.tgCopied') : t('premium.tgCopy')}
                        </button>
                      </div>
                      <div style={{
                        fontSize: 'var(--fs-xs)', color: '#334155', fontWeight: 600,
                        lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {orderText}
                      </div>
                    </div>
                  </>
                )}

                {/* Jami summa */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
                  <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: '#0f172a' }}>{t('premium.toPay')}</span>
                  <span>
                    {hasBonus && <s style={{ color: '#94a3b8', fontWeight: 600, fontSize: 'var(--fs-md)', marginRight: 8 }}>{fmt(selectedPlan?.price)}</s>}
                    <strong style={{ fontSize: 'var(--fs-2xl)', fontWeight: 900, color: '#0284C7' }}>{fmt(finalPrice)}</strong>
                  </span>
                </div>

                {/* To'lash */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePay}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16,
                    background: payMethod === 'telegram' ? '#229ED9' : '#0284C7',
                    color: '#fff', fontWeight: 800, fontSize: 'var(--fs-xl)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: payMethod === 'telegram' ? '0 4px 20px rgba(34,158,217,0.35)' : '0 4px 20px rgba(14,151,224,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <Send size={18} /> {payMethod === 'telegram' ? t('premium.contactOperator') : t('premium.payNow')}
                </motion.button>

                <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 1.4 }}>
                  {t('premium.termsAccept1')}<a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600 }}>{t('premium.termsLinkText')}</a>{t('premium.termsAccept2')}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                  <Shield size={14} color="#10B981" />
                  {CLICK_ENABLED ? t('premium.paymentProtected') : t('premium.tgSafety')}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumModal;
