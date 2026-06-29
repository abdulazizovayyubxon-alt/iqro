import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const p2List = t('termsPage.p2List', { returnObjects: true });
  const p3List = t('termsPage.p3List', { returnObjects: true });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>{t('termsPage.title')}</h1>
        <div style={{ width: 24 }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.content}
      >
        <div style={s.iconWrap}>
          <FileText size={48} color="#0E97E0" />
        </div>

        <h2 style={s.heading}>{t('termsPage.h1')}</h2>
        <p style={s.text}>{t('termsPage.p1')}</p>

        <h2 style={s.heading}>{t('termsPage.h2')}</h2>
        <p style={s.text}>{t('termsPage.p2')}</p>
        <ul style={s.list}>
          {p2List.map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 style={s.heading}>{t('termsPage.h3')}</h2>
        <p style={s.text}>{t('termsPage.p3')}</p>
        <ul style={s.list}>
          {p3List.map((item, i) => <li key={i}><b>{item.b}</b>{item.d}</li>)}
        </ul>

        <h2 style={s.heading}>{t('termsPage.h4')}</h2>
        <p style={s.text}>{t('termsPage.p4')}</p>

        <h2 style={s.heading}>{t('termsPage.h5')}</h2>
        <p style={s.text}>{t('termsPage.p5')}</p>

        <h2 style={s.heading}>{t('termsPage.h6')}</h2>
        <p style={s.text}>{t('termsPage.p6')}</p>
      </motion.div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    fontFamily: "'Inter', sans-serif",
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
    fontSize: 18, fontWeight: 700, margin: 0, textAlign: 'center'
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
  heading: {
    fontSize: 18, fontWeight: 700, marginTop: 24, marginBottom: 12, color: 'var(--text)'
  },
  text: {
    fontSize: 15, color: 'var(--text2)', marginBottom: 16
  },
  list: {
    fontSize: 15, color: 'var(--text2)', paddingLeft: 20, marginBottom: 16
  }
};
