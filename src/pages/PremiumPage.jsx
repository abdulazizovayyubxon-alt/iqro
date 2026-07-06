/**
 * PremiumPage.jsx — Premium uchun alohida landing sahifasi (/premium).
 * Marketing/qiymat ko'rsatadi; xaridning o'zi sinovdan o'tgan PremiumModal orqali
 * davom etadi (navigatsiya xavfsiz — modal sahifa ustida ochiladi).
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Crown, Check, Shield } from 'lucide-react';
import PremiumModal from '../components/PremiumModal';
import RoiBlock from '../components/RoiBlock';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_YEARLY_PRICE } from '../config';

// Ikonkalar kodda qoladi; matnlar i18n massivlaridan indeks bo'yicha olinadi
const FEATURE_ICONS = ['📚', '🎯', '🧠', '📊', '🏆', '⚡'];
const TRUST_ICONS = ['🔒', '⚡', '📱'];

export default function PremiumPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState(null);
  const isPremium = user?.isTruePremium || false;

  const features = t('premiumPage.features', { returnObjects: true });
  const trustBadges = t('premiumPage.trustBadges', { returnObjects: true });
  const faqs = t('premiumPage.faqs', { returnObjects: true });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>{t('premiumPage.title')}</h1>
        <div style={{ width: 24 }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={s.content}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3 }}
            style={{ fontSize: 60, marginBottom: 8 }}
          >👑</motion.div>
          <h2 style={s.heroTitle}>{t('premiumPage.heroTitle')}</h2>
          <p style={s.heroSub}>{t('premiumPage.heroSub')}</p>
        </div>

        {/* ROI */}
        <RoiBlock price={DEFAULT_YEARLY_PRICE} variant="theme" />

        {/* Features */}
        <div style={s.card}>
          <div style={s.cardLabel}>{t('premiumPage.whatIncluded')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {features.map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={s.featIcon}><Check size={15} color="var(--green)" /></div>
                <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>
                  <span style={{ marginRight: 6 }}>{FEATURE_ICONS[i]}</span>{text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Narx eslatmasi */}
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', margin: '4px 0 16px' }}>
          {t('premiumPage.priceNote')}
        </div>

        {/* CTA */}
        {isPremium ? (
          <div style={{ ...s.cta, background: 'var(--green-bg)', color: 'var(--green)', border: '1.5px solid var(--green)' }}>
            <Check size={18} /> {t('premiumPage.ctaActive')}
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowModal(true)} style={s.cta}>
            <Crown size={18} /> {t('premiumPage.ctaChoose')}
          </motion.button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)', fontSize: 12, marginTop: 14, fontWeight: 600 }}>
          <Shield size={14} color="var(--green)" /> {t('premiumPage.securePay')}
        </div>

        {/* ═══ ISHONCH NISHONLARI ═══ */}
        <div style={{ ...s.card, marginTop: 24 }}>
          <div style={s.cardLabel}>{t('premiumPage.trustLabel')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            {trustBadges.map((b, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'var(--bg3)', padding: '12px 6px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>{TRUST_ICONS[i]}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{b.title}</span>
                <span style={{ fontSize: 9, color: 'var(--text3)' }}>{b.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ FAQ ═══ */}
        <div style={s.card}>
          <div style={s.cardLabel}>{t('premiumPage.faqLabel')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                      color: isOpen ? 'var(--accent2)' : 'var(--text)', minHeight: 48,
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: 14, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text3)' }}>▾</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 14px 12px 14px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {showModal && <PremiumModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </div>
  );
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 90 },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: { background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', minWidth: 48, minHeight: 48, justifyContent: 'center', display: 'flex', alignItems: 'center', margin: '-12px 0' },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  content: { padding: '24px 20px', maxWidth: 600, margin: '0 auto' },
  heroTitle: { fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' },
  heroSub: { fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, margin: 0 },
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 16px', marginBottom: 16 },
  cardLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  featIcon: {
    width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'var(--green-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cta: {
    width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 800, fontSize: 16, color: '#fff',
    background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 6px 20px rgba(41,182,246,0.28)',
  },
};
