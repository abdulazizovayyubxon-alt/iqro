/**
 * PremiumModal.jsx — Yangilangan premium modal
 * 3 ta tarif, o'rtadagi "ENG OMMABOP" badge, psixologik narxlash
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, CheckCircle, X, CreditCard, Smartphone,
  Gift, Zap, Star, Clock, Shield, TrendingUp
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
  { icon: '⚡', text: 'Yangi savollar har hafta qo\'shiladi' },
];

const PremiumModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLANS[1]); // O'rtadagi (ommabop)
  const [referralBonus, setReferralBonus] = useState(0);
  const [payMethod, setPayMethod] = useState(null); // 'click' | 'payme' | null

  useEffect(() => {
    if (!isOpen || !user) return;
    setPayMethod(null);
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
          setReferralBonus(userSnap.data().referralBonus || 0);
        }
      } catch (e) { console.error('PremiumModal fetch error:', e); }
    };
    fetchData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
  const finalPrice = selectedPlan ? Math.max(0, selectedPlan.price - referralBonus) : 0;
  const hasBonus = referralBonus > 0 && selectedPlan;

  const handlePay = (method) => {
    if (!user || !selectedPlan) return;
    setProcessing(true);
    setPayMethod(method);
    const url = method === 'click'
      ? generateClickUrl(user.uid, user.phone || '', finalPrice, selectedPlan.id)
      : generatePaymeUrl(user.uid, finalPrice, selectedPlan.id);
    if (url) window.open(url, '_blank');
    setTimeout(() => { setProcessing(false); }, 2000);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
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
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1e 100%)',
          borderRadius: isMobile ? '24px 24px 0 0' : '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Glow top */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 100,
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Handle + Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 32px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{ fontSize: 52, marginBottom: 10 }}
            >
              👑
            </motion.div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
              IQRO Premium
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Cheksiz imkoniyatlar bilan tayyorlan
            </p>
          </div>

          {/* Social proof */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} style={{ color: '#10B981' }} />
              <span>2,000+ foydalanuvchi</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={14} style={{ color: '#F59E0B' }} />
              <span>89% muvaffaqiyat</span>
            </div>
          </div>

          {/* Tariflar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {plans.map((plan, idx) => {
              const isSelected = selectedPlan?.id === plan.id;
              const isPopular = plan.badge === 'ENG OMMABOP';
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    position: 'relative',
                    padding: isPopular ? '16px 16px 16px 16px' : '14px 16px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    border: isSelected
                      ? `2px solid ${plan.color || '#8B5CF6'}`
                      : '1.5px solid rgba(255,255,255,0.08)',
                    background: isSelected
                      ? `rgba(${plan.id === 'monthly' ? '59,130,246' : plan.id === 'quarterly' ? '139,92,246' : '16,185,129'}, 0.12)`
                      : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                  }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div style={{
                      position: 'absolute', top: 0, right: 16,
                      background: isPopular ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#fff', fontSize: 9, fontWeight: 900,
                      padding: '3px 10px', borderRadius: '0 0 8px 8px',
                      letterSpacing: 0.8,
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{plan.name}</span>
                        {plan.savings && (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            background: 'rgba(16,185,129,0.2)', color: '#10B981',
                            padding: '2px 7px', borderRadius: 6,
                          }}>
                            -{plan.savings}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {plan.perDay ? `Kuniga ${plan.perDay.toLocaleString()} so'm` : `${plan.durationMonths === 999 ? 'Cheksiz' : plan.durationMonths + ' oy'}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: plan.color || '#fff' }}>
                        {fmt(plan.price)}
                      </div>
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '50%', left: -1,
                      transform: 'translateY(-50%)',
                      width: 3, height: '60%',
                      background: plan.color || '#8B5CF6',
                      borderRadius: '0 3px 3px 0',
                    }} />
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
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 12, padding: '12px 14px',
                  marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <Gift size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>
                    Do'st bonusi: −{fmt(referralBonus)}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    Jami: <s style={{ opacity: 0.5 }}>{fmt(selectedPlan?.price)}</s> → <strong style={{ color: '#10B981' }}>{fmt(finalPrice)}</strong>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features (collapsible) */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '14px 16px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Nimalar kiradi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.3 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* To'lov tugmalari */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => handlePay('click')}
              disabled={processing}
              style={{
                width: '100%', padding: '15px', borderRadius: 14,
                background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                color: '#fff', fontWeight: 800, fontSize: 16,
                border: 'none', cursor: processing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(14,165,233,0.35)',
                opacity: processing && payMethod === 'click' ? 0.7 : 1,
              }}
            >
              <CreditCard size={20} />
              Click — {fmt(finalPrice)}
            </button>

            <button
              onClick={() => handlePay('payme')}
              disabled={processing}
              style={{
                width: '100%', padding: '15px', borderRadius: 14,
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                color: '#fff', fontWeight: 800, fontSize: 16,
                border: 'none', cursor: processing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(20,184,166,0.35)',
                opacity: processing && payMethod === 'payme' ? 0.7 : 1,
              }}
            >
              <Smartphone size={20} />
              Payme — {fmt(finalPrice)}
            </button>
          </div>

          {/* Telegram */}
          <button
            onClick={() => window.open('https://t.me/xonnoma', '_blank')}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Zap size={14} /> Telegram orqali Admin bilan bog'lanish
          </button>

          {/* Ishonch belgisi */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            <Shield size={13} />
            Xavfsiz to'lov • Click & Payme sertifikatlangan
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumModal;
