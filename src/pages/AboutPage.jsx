import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, ShieldCheck, BookOpen, Users, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_URL } from '../config';

const SUPPORT_HANDLE = 'Toifapro';
const CARD_ICONS = [BookOpen, ShieldCheck, Users];

export default function AboutPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cards = t('aboutPage.cards', { returnObjects: true });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>{t('aboutPage.title')}</h1>
        <div style={{ width: 24 }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.content}
      >
        <div style={s.iconWrap}>
          <Sparkles size={44} color="#0E97E0" />
        </div>

        <h2 style={s.lead}>{t('aboutPage.lead', { app: APP_NAME })}</h2>
        <p style={s.text}>{t('aboutPage.intro', { app: APP_NAME })}</p>

        {/* Nima uchun ishonsa bo'ladi */}
        <h3 style={s.heading}>{t('aboutPage.whyTrust')}</h3>
        <div style={s.cards}>
          {cards.map((c, i) => {
            const Icon = CARD_ICONS[i];
            return (
              <div key={i} style={s.card}>
                <div style={s.cardIcon}><Icon size={20} color="#0E97E0" /></div>
                <div>
                  <div style={s.cardTitle}>{c.t}</div>
                  <div style={s.cardDesc}>{c.d}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Aloqa */}
        <h3 style={s.heading}>{t('aboutPage.contactTitle')}</h3>
        <p style={s.text}>{t('aboutPage.contactText')}</p>

        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" style={s.contactBtn}>
          <Send size={18} /> {t('aboutPage.telegramBtn', { handle: SUPPORT_HANDLE })}
        </a>

        <div style={s.footerNote}>
          {t('aboutPage.footer', { app: APP_NAME, year: new Date().getFullYear() })}
        </div>
      </motion.div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: 'var(--text)',
    paddingBottom: '80px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px', background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--text)',
    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0, textAlign: 'center' },
  content: { padding: '24px 20px', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 },
  iconWrap: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    background: 'var(--bg2)', borderRadius: '50%', width: 88, height: 88, margin: '0 auto 24px',
  },
  lead: { fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 12px', color: 'var(--text)' },
  heading: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 14, color: 'var(--text)' },
  text: { fontSize: 15, color: 'var(--text2)', marginBottom: 16 },
  cards: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '16px',
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 },
  contactBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', boxSizing: 'border-box', marginTop: 12,
    padding: '14px', borderRadius: 14, textDecoration: 'none',
    background: 'linear-gradient(135deg, #0E97E0, #0284C7)', color: '#fff',
    fontWeight: 700, fontSize: 15,
  },
  contactBtnOutline: {
    background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)',
  },
  footerNote: { textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 28 },
};
