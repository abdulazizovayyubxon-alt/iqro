import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Award, Check, Clock, Lightbulb, X } from 'lucide-react';
import { useModalBackButton } from '../profile/useModalBackButton';
import { useEscapeClose } from '../../hooks/useEscapeClose';

/**
 * ExamRulesModal — imtihon shartnomasi va taktikasi, talab bo'yicha ochiladigan.
 *
 * props:
 *   open, onClose
 *   subjectName — fan nomi (bo'sh bo'lishi mumkin)
 *   durationMin — shu fan uchun jami daqiqa
 *   perQMin, perQSec — savol boshiga vaqt byudjeti
 *   questionCount — shu fan imtihonidagi savollar soni (config.examTotal yoki 45)
 *   isNationalCert — Milliy sertifikat rejimi tanlanganmi
 */
const ExamRulesModal = ({ open, onClose, subjectName, durationMin, perQMin, perQSec, questionCount, isNationalCert = false }) => {
  const { t } = useTranslation();
  useModalBackButton(open, onClose);
  useEscapeClose(open, onClose);

  if (!open) return null;

  const certRules = [
    t('exam.certRuleSpec', '45 ta savolning barchasi sof mutaxassislik fanidan tushadi (pedagogik mahorat bloki kirmaydi).'),
    t('exam.certRuleRasch', 'Baholash Rash modeli asosida 0–75.0 ball shkalasida: oson (Y1 = ×1.0), oʻrta (Y2 = ×1.5) va murakkab (Y3 = ×2.2) savollar turli vaznga ega.'),
    t('exam.certRuleGrades', 'Sertifikat darajalari: A+ (70+ ball), A (65–69.9), B+ (60–64.9), B (55–59.9), C+ (50–54.9), C (46–49.9).'),
    t('exam.certRuleBonus', 'Oʻqituvchilar uchun B+, A va A+ darajalar oylik maoshga +50% ustama, abituriyentlar uchun OTM kirish imtihonida imtiyoz beradi.'),
  ];

  const rules = [
    t('exam.rulePace', { min: perQMin, sec: perQSec }),
    t('exam.ruleNoMinus'),
    t('exam.ruleSkipped'),
    t('exam.ruleAutoFinish'),
    t('exam.ruleNavigate'),
    t('exam.ruleResume'),
  ];

  const tactics = [
    t('exam.tacticNoBlank'),
    t('exam.tacticTimeBox'),
    t('exam.tacticEasyFirst'),
    t('exam.tacticEliminate'),
    t('exam.tacticCalm'),
  ];

  const Section = ({ icon: Icon, color, title, items, numbered = false }) => (
    <div style={{ marginTop: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
        fontSize: 'var(--fs-xs)', fontWeight: 800, letterSpacing: 0.4,
        textTransform: 'uppercase', color: 'var(--text3)',
      }}>
        <Icon size={13} style={{ color }} />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            {numbered ? (
              <span style={{
                flexShrink: 0, marginTop: 4, width: 6, height: 6,
                borderRadius: '50%', background: color,
              }} />
            ) : (
              <Icon size={14} strokeWidth={3} style={{ color, flexShrink: 0, marginTop: 3 }} />
            )}
            <span style={{ fontSize: 'var(--fs-explain)', color: 'var(--text2)', lineHeight: 'var(--lh-relaxed)' }}>
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 700,
          maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg)',
          borderRadius: '18px 18px 0 0',
          padding: '18px 16px calc(24px + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
              {isNationalCert
                ? t('exam.certRulesTitle', 'Milliy Sertifikat qoidalari va Rash modeli')
                : t('exam.rulesTitle')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
              <Clock size={12} style={{ flexShrink: 0 }} />
              {subjectName
                ? t('exam.rulesSubtitle', { subject: subjectName, min: durationMin })
                : t('exam.chipMinutes', { n: durationMin })}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {isNationalCert && (
          <div style={{
            marginTop: 12, padding: '11px 13px', borderRadius: 12,
            background: 'var(--amber-bg)', border: '1.5px solid var(--amber)',
            display: 'flex', alignItems: 'flex-start', gap: 9,
          }}>
            <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text)', lineHeight: 1.45 }}>
              <strong>{t('exam.certBetaTitle', 'Diqqat: Bu boʻlim test (sinov) rejimida ishlamoqda.')}</strong>{' '}
              {t('exam.certBetaDesc', 'Savollar spetsifikatsiyasi va Rash modeli hisoblagichi sinov rejimida ishga tushirilgan boʻlib, doimiy takomillashtirib borilmoqda.')}
            </div>
          </div>
        )}

        <div style={{ fontSize: 'var(--fs-explain)', color: 'var(--text2)', lineHeight: 'var(--lh-relaxed)', marginTop: 12 }}>
          {isNationalCert
            ? t('exam.certSimulatorDesc', {
                n: questionCount,
                defaultValue: `Milliy sertifikat simulyatori ${questionCount} ta mutaxassislik savolidan (12 ta Y1 oson, 23 ta Y2 oʻrta, 10 ta Y3 murakkab) iborat boʻlib, Rash modeli asosida A+ dan C gacha darajangizni aniqlaydi.`,
              })
            : t('exam.simulatorDesc', { n: questionCount })}
        </div>

        {isNationalCert && (
          <Section
            icon={Award}
            color="var(--green)"
            title={t('exam.certSectionRasch', 'Rash modeli va Sertifikat darajalari')}
            items={certRules}
          />
        )}

        <Section icon={Check} color="var(--accent)" title={t('exam.rulesSectionRules')} items={rules} />
        <Section icon={Lightbulb} color="var(--amber)" title={t('exam.rulesSectionTactics')} items={tactics} numbered />
      </motion.div>
    </motion.div>
  );
};

export default ExamRulesModal;
