import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Lightbulb, X } from 'lucide-react';
import { useModalBackButton } from '../profile/useModalBackButton';

/**
 * ExamRulesModal — imtihon shartnomasi va taktikasi, talab bo'yicha ochiladigan.
 *
 * ⚠️ NEGA MODAL, AVVAL EKRANDA TURGAN BO'LSA HAM.
 *   Bu matn (tavsif + 6 qoida) kirish ekranida ochiq turardi va ~350px joy
 *   egallardi. Natijada rejim kartalari va «Boshlash» tugmasi telefon
 *   ekranidan pastga tushib ketgandi: foydalanuvchi ASOSIY harakatni ko'rish
 *   uchun skroll qilishi kerak edi. Ma'lumotning o'zi qimmatli, lekin u HAR
 *   SAFAR emas, BIRINCHI safar kerak — shuning uchun bir teginish narisiga
 *   ko'chirildi. Naqsh mashq rejimidan tanish (QuestionBox → TheoryModal).
 *
 * VAQT FANGA QARAB. Sarlavhada fan nomi va O'SHA fanning vaqti turadi:
 * kimyoda 120 daqiqa, ona tilida 105, qolganida 90 (`config.examDurationMin`).
 * Umumiy «90 daqiqa» deb yozib qo'yish foydalanuvchining vaqt rejasini
 * buzardi — u eng katta stress manbai.
 *
 * QOIDA va TAKTIKA ATAYIN AJRATILGAN. Yuqoridagilar — tizim haqidagi FAKT
 * (ball qanday hisoblanadi, vaqt tugasa nima bo'ladi). Pastdagilar — MASLAHAT.
 * Aralashtirilsa, faktlar ham «maslahat» kabi o'qiladi va ishonch yo'qoladi.
 *
 * props:
 *   open, onClose
 *   subjectName — fan nomi (bo'sh bo'lishi mumkin)
 *   durationMin — shu fan uchun jami daqiqa
 *   perQMin, perQSec — savol boshiga vaqt byudjeti
 */
const ExamRulesModal = ({ open, onClose, subjectName, durationMin, perQMin, perQSec }) => {
  const { t } = useTranslation();
  useModalBackButton(open, onClose);

  // AnimatePresence ATAYIN yo'q — TheoryModal'dagi bilan bir xil sabab:
  // `exit` animatsiyasi tugamay qolsa, modal `open=false` bo'lgandan keyin ham
  // DOM'da osilib turadi va butun ekranni bosib qo'yadi.
  if (!open) return null;

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

  // Qoidalar oldida ✓, taktika oldida nuqta: bo'lim ikonkasini har qatorda
  // takrorlash (5 ta lampochka) sarlavhani ham, matnni ham shovqinga aylantiradi.
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
          // Pastdagi tizim paneli (gesture bar) matnni kesib qo'ymasin
          padding: '18px 16px calc(24px + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
              {t('exam.rulesTitle')}
            </div>
            {/* Fan va uning O'Z vaqti — bu ikkisi har fanda boshqacha */}
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

        <div style={{ fontSize: 'var(--fs-explain)', color: 'var(--text2)', lineHeight: 'var(--lh-relaxed)', marginTop: 12 }}>
          {t('exam.simulatorDesc')}
        </div>

        <Section icon={Check} color="var(--accent)" title={t('exam.rulesSectionRules')} items={rules} />
        <Section icon={Lightbulb} color="var(--amber)" title={t('exam.rulesSectionTactics')} items={tactics} numbered />
      </motion.div>
    </motion.div>
  );
};

export default ExamRulesModal;
