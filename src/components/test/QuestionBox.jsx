import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Crown, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SafeHtml from '../shared/SafeHtml';
import QuestionMedia from '../QuestionMedia';
import TimerPill from './TimerPill';
import { questionKey } from '../../engine/SmartQuestionEngine';
import { useAuth } from '../../context/AuthContext';

/**
 * PersonalNote — savol ostidagi shaxsiy izoh maydoni.
 *
 * ⚠️ AUDIT 2026-08-17 — nega alohida komponent:
 *   Avval `textarea` to'g'ridan-to'g'ri global holatga yozardi:
 *       onChange={(e) => saveCustomMnemonic(qHash, e.target.value)}
 *   `saveCustomMnemonic` esa `AppContext` state'ini o'zgartiradi va context
 *   qiymati `state` ga bog'liq — ya'ni HAR BOSILGAN HARFDA butun ilova daraxti
 *   (Header, BottomNav, Sidebar, TestPage, QuestionBox...) qayta render
 *   bo'lardi. Uzun izoh yozganda klaviatura kechikar, harflar tushib qolardi.
 *   Ustiga-ustak bulutga yozish debounce'i (3 s) har harfda qayta siljib,
 *   yozuv oxirigacha kechikardi.
 *
 *   Endi matn MAHALLIY state'da yashaydi, global holatga esa fokus ketganda
 *   (`onBlur`) yoki 800 ms tinchlikdan keyin bir marta yoziladi.
 */
function PersonalNote({ qHash, saved, onSave }) {
  const { t } = useTranslation();
  const stored = saved?.[qHash] || '';
  const [draft, setDraft] = useState(stored);
  const timerRef = useRef(null);

  // Savol almashganda qoralamani yangi savolning saqlangan izohiga tiklaymiz.
  // `qHash` — yagona bog'liqlik: `stored` ni ham qo'shsak, global yozuv
  // qaytib kelganda maydon kursor bilan birga qayta o'rnatilardi.
  useEffect(() => {
    setDraft(saved?.[qHash] || '');
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qHash]);

  const commit = (value) => {
    clearTimeout(timerRef.current);
    if (value !== (saved?.[qHash] || '')) onSave(qHash, value);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setDraft(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(value), 800);
  };

  return (
    <div style={{ textAlign: 'left' }}>
      <label htmlFor={`note-${qHash.length}`} style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: '700', color: 'var(--text3)', marginBottom: '6px' }}>
        {t('test.personalNote')}
      </label>
      <textarea
        id={`note-${qHash.length}`}
        placeholder={t('test.personalNotePlaceholder')}
        value={draft}
        onChange={handleChange}
        style={{ width: '100%', minHeight: '80px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px', color: 'var(--text)', fontSize: 'var(--fs-input)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s', lineHeight: '1.5', boxSizing: 'border-box' }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; commit(draft); }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
          {draft.trim() ? t('test.noteSaved') : t('test.noteHint')}
        </span>
      </div>
    </div>
  );
}

const QuestionBox = ({
  questions,
  currentQ,
  answers,
  topicId,
  topicName,
  mode,
  timerMode,
  setTimerMode,
  QUESTION_TIMER_SECONDS,
  accumulateTime,
  onTimeExpire,
  motivationText,
  comboCount,
  state,
  handleSelect,
  explanationRef,
  activeReviewTab,
  setActiveReviewTab,
  saveCustomMnemonic,
  setShowObjectionModal,
  onPremiumClick,
  // Xato javob uchun topilgan nazariy band (null = mos band yo'q)
  theoryMatch = null,
  onOpenTheory = null
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isPremium = user?.isPremium || false;
  const isUsefulMnemonic = (text) => text && !["Kalit so'zga e'tibor bering va javobni vizuallashtiring.", "Kalit so'zga e'tibor bering va javobni vizuallashtiring"].includes(text.trim());

  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentQ} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '20px 16px' }}>

        {/* ── Sarlavha qatori: savol raqami + qiyinlik + mavzu + e'tiroz ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="q-num">{t('test.questionNum', { current: currentQ + 1, total: questions.length })}</div>
            {questions[currentQ].difficulty !== undefined && (
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                display: 'inline-block', flexShrink: 0, opacity: 0.6,
                background: questions[currentQ].difficulty >= 3 ? 'var(--red)' : questions[currentQ].difficulty >= 1 ? 'var(--amber)' : 'var(--green)',
              }} title={questions[currentQ].difficulty >= 3 ? t('test.difficultyHard') : questions[currentQ].difficulty >= 1 ? t('test.difficultyMedium') : t('test.difficultyEasy')} />
            )}
            {topicId >= 0 && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: '600', background: 'var(--blue-bg)', padding: '2px 8px', borderRadius: '6px' }}>{topicName}</div>}
          </div>
          <button className="objection-btn" style={{ position: 'relative', top: 'auto', right: 'auto', margin: 0 }} onClick={() => setShowObjectionModal(true)}><MessageCircle size={14} /> {t('test.objection')}</button>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'var(--bg3)', marginBottom: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${((Object.keys(answers).length) / questions.length) * 100}%`, height: '100%', borderRadius: '2px', background: 'var(--accent)', transition: 'width 0.5s ease' }} />
        </div>

        {/* ── Motivatsiya matni ── */}
        {motivationText && (
          <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', fontWeight: '800', fontSize: comboCount >= 10 ? 'var(--fs-3xl)' : comboCount >= 5 ? 'var(--fs-2xl)' : 'var(--fs-xl)', color: comboCount >= 5 ? 'var(--amber)' : 'var(--green)', padding: '4px 0', marginBottom: '4px' }}>{motivationText}</motion.div>
        )}

        {/* ── Taymer / Sekundomer (wall-clock, TimerPill) ── */}
        {mode === 'exam' && answers[currentQ] === undefined && (
          <TimerPill
            timerMode={timerMode}
            duration={QUESTION_TIMER_SECONDS}
            onExpire={onTimeExpire}
            onToggle={() => {
              accumulateTime();
              setTimerMode(
                timerMode === 'countdown' ? 'stopwatch'
                : timerMode === 'stopwatch' ? 'off'
                : 'countdown'
              );
            }}
          />
        )}
        {answers[currentQ] === -1 && <div style={{ color: 'var(--red)', fontSize: 'var(--fs-md)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>{t('test.timeUp')}</div>}

        {/* ── Aqlli Badglar (Takrorlash & Zaif Nuqta) ── */}
        {(() => {
          // T-7: identifikator to'liq matn xeshi. Kartaning kaliti ham matndan
          // qayta hisoblanadi — eski yozuvlar bilan ham to'g'ri ishlaydi.
          const qKey = questionKey(questions[currentQ]);
          const isSpaced = (state.spacedCards || []).some(card => (card.q ? questionKey(card) : card.qHash) === qKey);
          const isWeak = (state.stats?.[state.activeCategory]?.mistakes || []).some(m => questionKey({ q: m.question }) === qKey);
          if (!isSpaced && !isWeak) return null;
          return (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {isSpaced && (
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: '800', color: 'var(--accent2)', background: 'var(--blue-bg)', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--accent)' }}>
                  {t('test.badgeReview')}
                </span>
              )}
              {isWeak && (
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: '800', color: 'var(--text2)', background: 'var(--amber-bg)', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--amber)' }}>
                  {t('test.badgeWeak')}
                </span>
              )}
            </div>
          );
        })()}

        {/* ── Mualliflik / Manba Badgisi ── */}
        {(questions[currentQ].author || questions[currentQ].source) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span
              style={{
                fontSize: 'var(--fs-2xs)',
                fontWeight: 800,
                color: 'var(--accent)',
                background: 'var(--blue-bg)',
                padding: '3px 9px',
                borderRadius: 7,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                border: '1px solid rgba(14,151,224,0.25)',
              }}
            >
              ✍️ {questions[currentQ].author ? `Muallif: ${questions[currentQ].author}` : `Manba: ${questions[currentQ].source}`}
            </span>
          </div>
        )}

        <QuestionMedia question={questions[currentQ]} />
        {questions[currentQ].isHtml ? <SafeHtml html={questions[currentQ].q} className="q-text" /> : <div className="q-text" style={{ whiteSpace: 'pre-line' }}>{questions[currentQ].q}</div>}
        {/* ⚠️ AUDIT 2026-08-17 — variantlar `<div onClick>` edi.
            Oqibati: klaviatura bilan javob berish mumkin emas (Tab/Enter
            ishlamaydi), skrinriderda bosiladigan element deb o'qilmaydi va
            tanlangan variant yordamchi texnologiyaga bildirilmaydi. Google Play
            Pre-launch report'ning "Accessibility" bo'limi ham shu ni belgilaydi.
            `ExamPage` da bu allaqachon to'g'ri (`<button>`), bu fayl qolib ketgan.
            Endi radio-guruh semantikasi: vizual ko'rinish O'ZGARMAYDI. */}
        <div
          className="options"
          role="radiogroup"
          aria-label={t('test.questionNum', { current: currentQ + 1, total: questions.length })}
        >
          {questions[currentQ].opts.map((opt, i) => {
            const answered = answers[currentQ] !== undefined;
            const correctIdx = questions[currentQ].correct;
            const isSelected = answers[currentQ] === i;
            let bg = '';
            if (answered) {
              if (i === correctIdx) bg = 'correct';
              else if (isSelected) bg = 'wrong';
              else bg = 'disabled';
            }
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={isSelected}
                // `disabled` ATAYLAB ishlatilmaydi: javob berilgandan keyin ham
                // foydalanuvchi variantlar ustida klaviatura bilan yurib, to'g'ri
                // javobni o'qiy olishi kerak. Bosish esa `handleSelect` ichida
                // baribir e'tiborsiz qoladi (javob qulflangan).
                aria-disabled={answered}
                className={`option ${bg} ${!answered ? 'hoverable' : ''}`}
                onClick={() => handleSelect(currentQ, i)}
                style={{ cursor: answered ? 'default' : 'pointer' }}
              >
                <span className="opt-letter" aria-hidden="true">{['A', 'B', 'C', 'D'][i]}</span>
                <span className="opt-text">{opt.replace(/^[A-D]\)\s*/, '')}</span>
              </button>
            );
          })}
        </div>
        
        {answers[currentQ] !== undefined && (
          <motion.div
            ref={explanationRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '16px',
              background: 'var(--bg2)',
              border: '1.5px solid var(--border)',
              borderRadius: '20px',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <button
                onClick={() => setActiveReviewTab('analysis')}
                style={{ flex: 1, padding: '12px', border: 'none', background: activeReviewTab === 'analysis' ? 'var(--bg2)' : 'transparent', color: activeReviewTab === 'analysis' ? 'var(--text)' : 'var(--text3)', fontSize: 'var(--fs-md)', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeReviewTab === 'analysis' ? '2.5px solid var(--accent)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
              >
                <span>{t('test.tabAnalysis')}</span>
              </button>
              <button
                onClick={() => setActiveReviewTab('notes')}
                style={{ flex: 1, padding: '12px', border: 'none', background: activeReviewTab === 'notes' ? 'var(--bg2)' : 'transparent', color: activeReviewTab === 'notes' ? 'var(--text)' : 'var(--text3)', fontSize: 'var(--fs-md)', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeReviewTab === 'notes' ? '2.5px solid var(--accent)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative', transition: 'all 0.2s' }}
              >
                <span>{t('test.tabNotes')}</span>
                {(() => {
                  const qHash = (questions[currentQ]?.q || '').substring(0, 100);
                  if (state.customMnemonics?.[qHash]) {
                    return (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', position: 'absolute', top: '12px', right: '20px' }} />
                    );
                  }
                  return null;
                })()}
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px', textAlign: 'left', position: 'relative', minHeight: !isPremium ? '240px' : 'auto' }}>
              
              {/* Blur Container */}
              <div style={{
                filter: !isPremium ? 'blur(6px)' : 'none',
                opacity: !isPremium ? 0.3 : 1,
                pointerEvents: !isPremium ? 'none' : 'auto',
                userSelect: !isPremium ? 'none' : 'auto',
                transition: 'all 0.3s ease'
              }}>
                {activeReviewTab === 'analysis' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: 'var(--fs-base)', color: answers[currentQ] === questions[currentQ].correct ? 'var(--green)' : 'var(--red)', marginBottom: '12px' }}>
                      <span>{answers[currentQ] === questions[currentQ].correct ? t('test.correct') : t('test.wrong')}</span>
                    </div>

                    {answers[currentQ] !== questions[currentQ].correct && answers[currentQ] >= 0 && (
                      <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', fontSize: 'var(--fs-md)', lineHeight: '1.5' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text3)' }}>{t('test.youChose')}</span>{' '}
                          <span style={{ color: 'var(--red)', fontWeight: '600' }}>{questions[currentQ].opts[answers[currentQ]]?.replace(/^[A-D]\)\s*/, '')}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text3)' }}>{t('test.correctAnswer')}</span>{' '}
                          <span style={{ color: 'var(--green)', fontWeight: '600' }}>{questions[currentQ].opts[questions[currentQ].correct]?.replace(/^[A-D]\)\s*/, '')}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ color: 'var(--text2)', fontSize: 'var(--fs-explain)', lineHeight: 'var(--lh-relaxed)', whiteSpace: 'pre-line' }}>
                      {questions[currentQ].explanation}
                    </div>

                    {/* Nazariyaga o'tish — faqat MOS band topilganda. Mos band
                        bo'lmasa tugma umuman chiqmaydi: noto'g'ri joyga olib
                        borgan «o'qing» tugmasi foydadan ko'ra ziyon qiladi. */}
                    {onOpenTheory && theoryMatch && (
                      <button
                        onClick={onOpenTheory}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          marginTop: 12, padding: '8px 13px', borderRadius: 11,
                          border: '1px solid var(--border)', background: 'var(--bg2)',
                          color: 'var(--accent)', fontSize: 'var(--fs-sm)', fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <BookOpen size={14} />
                        {t('theory.readThis')}
                      </button>
                    )}

                    {questions[currentQ].source && (
                      <div className="q-source">{t('test.source', { source: questions[currentQ].source })}</div>
                    )}
                  </div>
                )}

                {activeReviewTab === 'notes' && (
                  <div>
                    {isUsefulMnemonic(questions[currentQ].mnemonic) && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px dashed var(--amber)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', marginBottom: '14px', textAlign: 'left' }}>
                        <div style={{ fontSize: 'var(--fs-2xl)' }}>💡</div>
                        <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: '1.5' }}>
                          <strong>{t('test.recommendedMnemonic')}</strong><br />
                          {questions[currentQ].mnemonic}
                        </div>
                      </div>
                    )}

                    <PersonalNote
                      qHash={(questions[currentQ]?.q || '').substring(0, 100)}
                      saved={state.customMnemonics}
                      onSave={saveCustomMnemonic}
                    />
                  </div>
                )}
              </div>

              {/* Paywall Overlay */}
              {!isPremium && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(3px)',
                  textAlign: 'center',
                  borderRadius: '12px',
                  zIndex: 2,
                }}>
                  <div style={{
                    background: 'var(--bg2)',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    padding: '24px 20px',
                    borderRadius: '20px',
                    maxWidth: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'var(--amber)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    }}>
                      <Crown size={22} color="#fff" />
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>
                      {t('test.paywallTitle')}
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: 'var(--fs-sm)', color: 'var(--text3)', lineHeight: '1.5' }}>
                      {t('test.paywallText')}
                    </p>
                    <button
                      onClick={onPremiumClick}
                      style={{
                        background: 'var(--cta)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontSize: 'var(--fs-md)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(14, 151, 224, 0.25)',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span>{t('test.paywallCta')}</span>
                      <Crown size={12} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionBox;
