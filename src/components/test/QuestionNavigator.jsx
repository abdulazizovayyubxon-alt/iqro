import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, ChevronUp } from 'lucide-react';
import { TIMED_OUT } from '../../engine/SmartQuestionEngine';

/**
 * QuestionNavigator — mashq rejimidagi savollar panjarasi.
 *
 * ⚠️ AUDIT 2026-08-19, T-11 BAND — NAVIGATSIYA ASSIMETRIYASI.
 *
 *   `ExamPage` da to'liq navigator bor edi: 50 katakli grid va izoh (legend).
 *   `TestPage` da esa yagona navigatsiya `[Orqaga] [Keyingi]` edi.
 *
 *   Foydalanuvchi vaqtining ~90%i aynan TestPage'da o'tadi. Ya'ni 50 savollik
 *   blokda 37-savolga qaytish uchun 13 marta «Orqaga» bosish kerak edi.
 *
 *   BAYROQ («belgilash») bu yerda YO'Q — u faqat imtihonda ma'noli. Mashqda
 *   javob darhol tekshiriladi, ya'ni katak allaqachon ✓/✕/⏱ ni ko'rsatib
 *   turibdi; bayroq esa shu ustiga ikkinchi, hech narsa qo'shmaydigan belgi
 *   bo'lardi.
 *
 * NEGA ALOHIDA KOMPONENT VA NEGA EXAMPAGE'NIKI QAYTA ISHLATILMADI:
 *   ExamPage navigatori imtihon maketiga bog'langan (`.exam-q-section`,
 *   `.exam-q-grid` CSS sinflari, yon panel, ≤900px da alohida `.exam-mobile-bar`).
 *   Uni ajratib olish ishlaydigan imtihon interfeysini qayta yozishni talab
 *   qilardi — foyda emas, xavf. Bu komponent esa mashq uchun MOBIL-BIRINCHI:
 *   yig'ilgan holatda bitta qator, ochilganda panjara.
 *
 * MASHQ IMTIHONDAN FARQI: bu yerda darhol fikr-mulohaza bor, demak natija
 * ALLAQACHON ma'lum — kataklar to'g'ri/xato/vaqt tugadi holatini ko'rsatadi.
 * Rang YAKKA signal emas: to'g'rida ✓, xatoda ✕ belgisi ham bor (daltonizm).
 */
const QuestionNavigator = ({
  questions = [],
  answers = {},
  currentQ = 0,
  open = false,
  onToggle,
  onJump,
}) => {
  const { t } = useTranslation();
  const total = questions.length;
  if (total <= 1) return null;

  const answeredCount = Object.keys(answers).length;

  const stateOf = (i) => {
    const a = answers[i];
    if (a === undefined) return 'blank';
    if (a === TIMED_OUT) return 'timeout';
    return a === questions[i]?.correct ? 'correct' : 'wrong';
  };

  const CELL = {
    correct: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green)', mark: '✓' },
    wrong: { bg: 'var(--red-bg)', color: 'var(--red)', border: 'var(--red)', mark: '✕' },
    timeout: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber)', mark: '⏱' },
    blank: { bg: 'var(--bg3)', color: 'var(--text3)', border: 'var(--border2)', mark: null },
  };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Yig'ilgan qator — doim ko'rinadi, bitta teginish bilan ochiladi */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--bg2)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {open ? <ChevronUp size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              : <LayoutGrid size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)' }}>
          {t('test.navAnswered', { answered: answeredCount, total })}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 8, padding: 12, borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--bg2)',
            }}>
              <div style={{
                display: 'grid',
                // Mobil ekranda 40px lik katak barmoq uchun qulay minimum
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                gap: 6,
              }}>
                {questions.map((_, i) => {
                  const s = CELL[stateOf(i)];
                  const isCurrent = i === currentQ;
                  return (
                    <button
                      key={i}
                      onClick={() => onJump?.(i)}
                      aria-current={isCurrent ? 'true' : undefined}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 9,
                        border: isCurrent ? '2px solid var(--text)' : `1.5px solid ${s.border}`,
                        background: s.bg,
                        color: s.color,
                        fontWeight: 700,
                        fontSize: 'var(--fs-sm)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span>{i + 1}</span>
                      {s.mark && <span style={{ fontSize: '0.65em', marginTop: 1 }}>{s.mark}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Izoh — rang nimani bildirishini aytmasdan panjara jumboq bo'lardi */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 'var(--fs-2xs)', color: 'var(--text3)' }}>
                {[
                  { key: 'correct', label: t('exam.legendCorrect') },
                  { key: 'wrong', label: t('exam.legendWrong') },
                  { key: 'blank', label: t('exam.legendSkipped') },
                ].map(({ key, label }) => (
                  <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 12, height: 12, borderRadius: 4,
                      background: CELL[key].bg, border: `1.5px solid ${CELL[key].border}`,
                    }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionNavigator;
