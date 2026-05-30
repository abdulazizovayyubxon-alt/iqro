/**
 * PremiumModal.jsx — To'lov tizimi (Telegram + Click + Payme)
 * Telegram asosiy usul, Click/Payme qo'shimcha
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, CheckCircle, X, CreditCard, Smartphone,
  Gift, Zap, Star, Clock, Shield, TrendingUp, Send, ChevronRight, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateClickUrl, generatePaymeUrl } from '../services/payment';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  { icon: '📚', text: "Barcha mavzular to'liq ochiq" },
  { icon: '🎯', text: 'Imtihon simulyatsiyasi (50 savol)' },
  { icon: '🧠', text: 'Aqlli takrorlash — cheklanmagan' },
  { icon: '📊', text: "Batafsil statistika va tahlil" },
  { icon: '🏆', text: 'Reyting va yutuqlar tizimi' },
  { icon: '⚡', text: "Yangi savollar har hafta qo'shiladi" },
];

// To'lov usullari
const PAY_METHODS = [
  {
    id: 'telegram',
    label: 'Telegram orqali',
    sublabel: 'Maxsus kod orqali → Darhol yoqish',
    icon: '📱',
    color: '#29B6F6',
    bgColor: 'rgba(41, 182, 246, 0.15)',
    borderColor: 'rgba(41, 182, 246, 0.4)',
    badge: 'ASOSIY',
  },
  {
    id: 'click',
    label: "Click",
    sublabel: "Karta yoki Click Wallet",
    icon: '💳',
    color: '#0EA5E9',
    bgColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.25)',
    badge: null,
  },
  {
    id: 'payme',
    label: "Payme",
    sublabel: "Payme ilovasi yoki karta",
    icon: '🏦',
    color: '#14B8A6',
    bgColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: 'rgba(20, 184, 166, 0.25)',
    badge: null,
  },
];

const PremiumModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('plans'); // 'plans' | 'method' | 'telegram_guide'
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLANS[1]);
  const [selectedMethod, setSelectedMethod] = useState('telegram');
  const [referralBonus, setReferralBonus] = useState(0);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setStep('plans');
    setSelectedMethod('telegram');
    setProcessing(false);

    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'premium'));
        if (docSnap.exists() && docSnap.data().plans?.length > 0) {
          const dbPlans = docSnap.data().plans;
          setPlans(dbPlans);
          setSelectedPlan(dbPlans[Math.floor(dbPlans.length / 2)] || dbPlans[0]);
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
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.premiumModalOpen) window.history.back();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(',', ' ') + " so'm";
  const finalPrice = selectedPlan ? Math.max(0, selectedPlan.price - referralBonus) : 0;
  const hasBonus = referralBonus > 0 && selectedPlan;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  const isAndroidApp = isPWA && /android/i.test(navigator.userAgent);
  const BOT_USERNAME = 'IQRO_testbot';

  const handlePay = () => {
    if (!user || !selectedPlan) return;

    if (selectedMethod === 'telegram') {
      // Telegram orqali — botga yo'naltirish (pay_planId parametri bilan)
      const tgUrl = `https://t.me/${BOT_USERNAME}?start=pay_${selectedPlan.id}`;
      window.open(tgUrl, '_blank');
      setStep('telegram_guide');
      return;
    }

    setProcessing(true);
    const url = selectedMethod === 'click'
      ? generateClickUrl(user.uid, user.phone || '', finalPrice, selectedPlan.id)
      : generatePaymeUrl(user.uid, finalPrice, selectedPlan.id);
    if (url) window.location.href = url;
    setTimeout(() => setProcessing(false), 3000);
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
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: '#64748B', fontSize: 12, fontWeight: 600 }}
              >
                ← Orqaga
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, padding: '6px', cursor: 'pointer', color: '#64748B', marginLeft: 'auto' }}
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
                  
                  {/* FOMO Countdown Banner */}
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                  >
                    <span style={{ fontSize: 16 }}>⏳</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>Maxsus taklif: 24 soat ichida xarid qilsangiz...</span>
                  </motion.div>

                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    style={{ fontSize: 48, marginBottom: 8 }}
                  >
                    👑
                  </motion.div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>IQRO Premium</h2>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Cheksiz imkoniyatlar bilan tayyorlan</p>
                </div>

                {/* Social proof */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20, fontSize: 12, color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#10B981' }}>
                    <Shield size={14} />
                    <span>100% Xavfsiz To'lov</span>
                  </div>
                  <div style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.1)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Star size={12} style={{ color: '#F59E0B' }} />
                    <span>89% muvaffaqiyat</span>
                  </div>
                </div>

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
                            {plan.badge}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{plan.name}</span>
                              {plan.savings && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 6px', borderRadius: 5 }}>
                                  -{plan.savings}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 500 }}>
                              {plan.perDay ? `Kuniga ${plan.perDay.toLocaleString()} so'm` : `${plan.durationMonths} oy`}
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

                {/* Referral bonus */}
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
                      <Gift size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                          Do'st bonusi: −{fmt(referralBonus)}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                          Jami: <s style={{ opacity: 0.5 }}>{fmt(selectedPlan?.price)}</s> → <strong style={{ color: '#10B981' }}>{fmt(finalPrice)}</strong>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* To'lov usullari */}
                <div style={{ marginBottom: 16 }}>
                  {isAndroidApp ? (
                    <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>Dastur ichida xarid vaqtincha faol emas</div>
                      <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.4 }}>
                        Iltimos, Premium xarid qilish uchun rasmiy veb-saytimizga kiring: <b>iqro.uz</b>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        To'lov usulini tanlang
                      </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PAY_METHODS.map((m) => {
                      const isActive = selectedMethod === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMethod(m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                            border: isActive ? `2px solid ${m.color}` : `1.5px solid ${m.borderColor}`,
                            background: isActive ? m.bgColor : 'rgba(255,255,255,0.03)',
                            transition: 'all 0.18s',
                            position: 'relative',
                          }}
                        >
                          {m.badge && (
                            <div style={{
                              position: 'absolute', top: -8, left: 12,
                              background: 'linear-gradient(135deg, #29B6F6, #0284C7)',
                              color: '#fff', fontSize: 8, fontWeight: 900,
                              padding: '2px 8px', borderRadius: 6, letterSpacing: 1,
                            }}>
                              {m.badge}
                            </div>
                          )}
                          <span style={{ fontSize: 22 }}>{m.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? m.color : '#334155' }}>
                              {m.label}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                              {m.sublabel}
                            </div>
                          </div>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            border: isActive ? `2px solid ${m.color}` : '2px solid rgba(0,0,0,0.1)',
                            background: isActive ? m.color : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {isActive && <Check size={11} color="#fff" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                    </>
                  )}
                </div>

                {/* Features */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 14, padding: '14px', marginBottom: 18,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Nimalar kiradi
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {FEATURES.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{f.icon}</span>
                        <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.3, fontWeight: 600 }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asosiy tugma */}
                {!isAndroidApp && (
                  <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePay}
                  disabled={processing}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 16,
                    background: selectedMethod === 'telegram'
                      ? 'linear-gradient(135deg, #29B6F6, #0284C7)'
                      : selectedMethod === 'click'
                      ? 'linear-gradient(135deg, #0EA5E9, #0284C7)'
                      : 'linear-gradient(135deg, #14B8A6, #0D9488)',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    border: 'none', cursor: processing ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 20px rgba(41,182,246,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: processing ? 0.7 : 1,
                    marginBottom: 12,
                  }}
                >
                  {selectedMethod === 'telegram' ? (
                    <><Send size={18} /> Telegram orqali to'lash — {fmt(finalPrice)}</>
                  ) : selectedMethod === 'click' ? (
                    <><CreditCard size={18} /> Click — {fmt(finalPrice)}</>
                  ) : (
                    <><Smartphone size={18} /> Payme — {fmt(finalPrice)}</>
                  )}
                </motion.button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>
                  <ShieldCheck size={14} color="#10B981" />
                  Xavfsiz to'lov • 100% kafolat
                </div>
              </motion.div>
            )}

            {/* ══════ TELEGRAM YO'RIQNOMA ══════ */}
            {step === 'telegram_guide' && (
              <motion.div key="telegram_guide" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>📱</div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>Telegram Bot ochildi!</h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                    Bot sizga to'lov yo'riqnomasini yubordi. Quyidagi qadamlarni bajaring:
                  </p>
                </div>

                {/* Qadamlar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {[
                    { step: '1', icon: '💳', text: 'Botdagi karta raqamiga kerakli summani to\'lang' },
                    { step: '2', icon: '🔑', text: 'O\'tkazma izohiga bot bergan maxsus TXN kodni yozing' },
                    { step: '3', icon: '💬', text: 'To\'lovdan so\'ng, botga o\'sha TXN kodni yuboring' },
                    { step: '4', icon: '⚡', text: 'Premium darhol avtomatik tarzda yoqiladi!' },
                  ].map((item) => (
                    <div
                      key={item.step}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #29B6F6, #0284C7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: '#fff',
                      }}>
                        {item.step}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{item.text}</span>
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
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>To'lov kartasi</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#29B6F6', letterSpacing: 3, fontFamily: 'monospace' }}>
                    9860 3501 4333 3655
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Ayyubxon Abdulazizov</div>
                </div>

                {/* Bot ga qayta o'tish */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => window.open(`https://t.me/${BOT_USERNAME}`, '_blank')}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 16,
                    background: 'linear-gradient(135deg, #29B6F6, #0284C7)',
                    color: '#fff', fontWeight: 800, fontSize: 15,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Send size={18} />
                  Botga o'tish → @IQRO_testbot
                </motion.button>

                <button
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 14, background: 'transparent',
                    color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Yopish (chek yuborgandan keyin)
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
