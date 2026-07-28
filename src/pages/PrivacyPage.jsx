import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const p2List = t('privacyPage.p2List', { returnObjects: true });
  const p3List = t('privacyPage.p3List', { returnObjects: true });
  const p4List = t('privacyPage.p4List', { returnObjects: true });
  const p8List = t('privacyPage.p8List', { returnObjects: true });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>{t('privacyPage.title')}</h1>
        <div style={{ width: 24 }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.content}
      >
        <div style={s.iconWrap}>
          <Shield size={48} color="#0E97E0" />
        </div>
        <p style={s.updated}>{t('privacyPage.updated')}</p>

        <h2 style={s.heading}>{t('privacyPage.h1')}</h2>
        <p style={s.text}>{t('privacyPage.p1')}</p>

        <h2 style={s.heading}>{t('privacyPage.h2')}</h2>
        <p style={s.text}>{t('privacyPage.p2')}</p>
        <ul style={s.list}>
          {p2List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 style={s.heading}>{t('privacyPage.h3')}</h2>
        <p style={s.text}>{t('privacyPage.p3')}</p>
        <ul style={s.list}>
          {p3List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 style={s.heading}>{t('privacyPage.h4')}</h2>
        <p style={s.text}>{t('privacyPage.p4')}</p>
        <ul style={s.list}>
          {p4List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 style={s.heading}>{t('privacyPage.h5')}</h2>
        <p style={s.text}>{t('privacyPage.p5')}</p>

        <h2 style={s.heading}>{t('privacyPage.h6')}</h2>
        <p style={s.text}>
          {t('privacyPage.p6a')}<b>{t('privacyPage.p6Profile')}</b>{t('privacyPage.p6b')}<Link to="/delete-account" style={{ color: 'var(--accent2)', textDecoration: 'underline' }}>{t('privacyPage.p6Link')}</Link>{t('privacyPage.p6c')}
        </p>

        <h2 style={s.heading}>{t('privacyPage.h7')}</h2>
        <p style={s.text}>{t('privacyPage.p7')}</p>

        <h2 style={s.heading}>{t('privacyPage.h8')}</h2>
        <p style={s.text}>{t('privacyPage.p8')}</p>
        <ul style={s.list}>
          {p8List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 style={s.heading}>{t('privacyPage.h9')}</h2>
        <p style={s.text}>{t('privacyPage.p9')}</p>
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
    position: 'sticky', top: 0, zIndex: 10
  },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--text)',
    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center'
  },
  title: {
    fontSize: 'var(--fs-2xl)', fontWeight: 700, margin: 0, textAlign: 'center'
  },
  content: {
    padding: '24px 20px',
    maxWidth: 600, margin: '0 auto',
    lineHeight: 1.6,
  },
  iconWrap: {
    display: 'flex', justifyContent: 'center', marginBottom: 24,
    padding: 20, background: 'var(--bg2)', borderRadius: '50%', width: 88, height: 88, margin: '0 auto 24px'
  },
  updated: {
    fontSize: 'var(--fs-md)', color: 'var(--text3)', textAlign: 'center', marginBottom: 8
  },
  heading: {
    fontSize: 'var(--fs-2xl)', fontWeight: 700, marginTop: 24, marginBottom: 12, color: 'var(--text)'
  },
  text: {
    fontSize: 'var(--fs-lg)', color: 'var(--text2)', marginBottom: 16
  },
  list: {
    fontSize: 'var(--fs-lg)', color: 'var(--text2)', paddingLeft: 20, marginBottom: 16
  }
};
