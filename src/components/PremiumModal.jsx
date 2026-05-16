import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Shield, X, CreditCard, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateClickUrl, generatePaymeUrl } from '../services/payment';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const PremiumModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const fetchPlans = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'premium'));
      if (docSnap.exists() && docSnap.data().plans?.length > 0) {
        setPlans(docSnap.data().plans);
        setSelectedPlan(docSnap.data().plans[0]);
      } else {
        const defaultPlan = { id: 'lifetime', name: 'Cheksiz Premium', price: 15000, durationMonths: 999 };
        setPlans([defaultPlan]);
        setSelectedPlan(defaultPlan);
      }
    };
    fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  const handleClickPay = () => {
    if (!user || !selectedPlan) return;
    setProcessing(true);
    const url = generateClickUrl(user.uid, user.phone || '', selectedPlan.price, selectedPlan.id);
    if (url) {
      window.open(url, '_blank');
    }
    setTimeout(() => setProcessing(false), 2000);
  };

  const handlePaymePay = () => {
    if (!user || !selectedPlan) return;
    setProcessing(true);
    const url = generatePaymeUrl(user.uid, selectedPlan.price, selectedPlan.id);
    if (url) {
      window.open(url, '_blank');
    }
    setTimeout(() => setProcessing(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px', padding: '30px',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.1)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '150px', height: '150px', background: 'rgba(251, 191, 36, 0.2)',
          filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none'
        }} />

        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '15px', right: '15px',
            background: 'none', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', padding: '5px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(251, 191, 36, 0.1)', border: '2px solid rgba(251, 191, 36, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'var(--amber)'
          }}>
            <Crown size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            Premium Rejim
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.5' }}>
            Barcha imkoniyatlardan cheklanmagan foydalanish
          </p>
          {/* Tariflar ro'yxati */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', marginBottom: '8px' }}>
            {plans.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPlan(p)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                  background: selectedPlan?.id === p.id ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: selectedPlan?.id === p.id ? '2px solid var(--amber)' : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: selectedPlan?.id === p.id ? 'var(--amber)' : 'white' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{p.durationMonths === 999 ? 'Cheksiz muddat' : `${p.durationMonths} oy muddat`}</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: selectedPlan?.id === p.id ? 'var(--amber)' : 'white' }}>
                  {formatPrice(p.price)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Afzalliklar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            "Barcha 15 ta mavzu ochiq bo'ladi",
            "Imtihon simulyatsiyasi (50 savol, 60 daqiqa)",
            "Aqlli takrorlash — cheklanmagan",
            "Reklamasiz o'qish"
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)' }}>
              <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* To'lov tugmalari */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {/* Click */}
          <button
            className="btn"
            onClick={handleClickPay}
            disabled={processing}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #00B4D8, #0077B6)',
              color: '#fff', fontWeight: 'bold', fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              border: 'none', cursor: processing ? 'wait' : 'pointer',
              boxShadow: '0 4px 15px rgba(0, 180, 216, 0.3)',
              opacity: processing ? 0.7 : 1
            }}
          >
            <CreditCard size={20} />
            Click orqali to'lash
          </button>

          {/* Payme */}
          <button
            className="btn"
            onClick={handlePaymePay}
            disabled={processing}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #00CCCC, #009999)',
              color: '#fff', fontWeight: 'bold', fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              border: 'none', cursor: processing ? 'wait' : 'pointer',
              boxShadow: '0 4px 15px rgba(0, 204, 204, 0.3)',
              opacity: processing ? 0.7 : 1
            }}
          >
            <Smartphone size={20} />
            Payme orqali to'lash
          </button>
        </div>

        {/* Telegram backup */}
        <button
          className="btn"
          onClick={() => window.open('https://t.me/xonnoma', '_blank')}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text2)', fontWeight: '600', fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
          }}
        >
          <Zap size={16} />
          Telegram orqali ulanish (Admin)
        </button>

        <div style={{
          textAlign: 'center', marginTop: '16px', color: 'var(--text3)',
          fontSize: '11px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '6px'
        }}>
          <Shield size={12} />
          Xavfsiz to'lov • Click & Payme sertifikatlangan
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumModal;
