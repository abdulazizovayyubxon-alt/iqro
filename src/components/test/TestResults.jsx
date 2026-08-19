import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Target, Share2, ArrowRight, FileText, BadgeCheck, ListChecks, ChevronRight } from 'lucide-react';
import { topicBreakdown } from '../../engine/SmartQuestionEngine';
import { activeMistakes } from '../../engine/mistakeQueue';
import { useTranslation } from 'react-i18next';
import ResultShareCard from '../shared/ResultShareCard';
import { reconcileAchievements, nextMilestones } from '../../data/tracks';
import NextMilestoneLine from '../achievements/NextMilestoneLine';
import { useNextPlanStep } from '../../hooks/useNextPlanStep';
import { useMilestoneAction } from '../../hooks/useMilestoneAction';
import { stepText } from '../../engine/stepText';

const TestResults = ({
  correctCount,
  amiDelta,
  gained = [],
  reward = { points: 0, freezes: 0 },
  questionsLength,
  topicName,
  state,
  setMode,
  generateQuestions,
  showToast,
  nextBatchLabel,
  onNextBatch,
  // T-7: shu blokning savollari va javoblari — bo'limlar kesimi uchun
  questions = [],
  answers = {},
  onPracticeTopic,
}) => {
  const { t } = useTranslation();
  const [showShareCard, setShowShareCard] = useState(false);
  const pct = Math.round((correctCount / questionsLength) * 100);

  // ⚠️ AUDIT 2026-08-19, T-1 BAND — bu yerda `state.mistakes?.length > 0` edi.
  //
  //   Xatolar esa `state.stats[cat].mistakes` da saqlanadi (AppContext.jsx).
  //   Yuqori darajadagi `state.mistakes` faqat `buildDefaultState()` da `[]`
  //   deb yaratilardi va HECH QACHON yozilmasdi — ya'ni shart HAR DOIM `false`,
  //   «Xatolar ustida ishlash» tugmasi esa HECH QACHON ko'rinmasdi.
  //
  //   Oqibati: xatolar ustida ishlashga eng yuqori niyatli kirish nuqtasi —
  //   test tugagan lahza, natija ko'z oldida turganda — o'lik edi. Butun
  //   «qayta ishlash silsilasi»ning kirish eshigi yopiq edi.
  const openMistakes = activeMistakes(state?.stats?.[state?.activeCategory]?.mistakes || []);

  // Bo'limlar kesimi — `topicDeltas` allaqachon hisoblanardi, lekin ekranga
  // chiqmasdi (T-7). Faqat aralash/ko'p bo'limli blokda ma'noga ega.
  const breakdown = useMemo(
    () => (questions.length > 0 ? topicBreakdown(questions, answers) : []),
    [questions, answers]
  );
  const showBreakdown = breakdown.length > 1;
  const weakest = breakdown.find(r => r.enough && r.accuracy !== null && r.accuracy < 100) || null;

  const {
    step: nextStep, doneCount: planDone, total: planTotal, startStep,
  } = useNextPlanStep();

  // Keyingi bosqich — commit'dan keyingi yangilangan holatdan sof hisob
  const achView = reconcileAchievements(state, state.achievements);
  const milestone = nextMilestones(state, achView.live)[0] || null;
  // Qator endi BOSILADI va yo'nalishga mos harakatni ochadi (mashq/imtihon/xatolar)
  const startMilestone = useMilestoneAction();

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '28px 24px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: 'var(--border2)', borderRadius: '0 0 3px 3px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <FileText size={14} style={{ color: 'var(--text3)' }} />
        <span style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.6px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>{t('results.reportEyebrow')}</span>
      </div>

      <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{t('results.reportTitle')}</div>
      <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', marginBottom: 22, lineHeight: 1.5 }}>{t('results.summary', { total: questionsLength, correct: correctCount })}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 'var(--fs-10xl)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px' }}>{correctCount}</span>
        <span style={{ fontSize: 'var(--fs-xl)', color: 'var(--text3)' }}>/ {questionsLength}</span>
        <span style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text2)', marginLeft: 'auto' }}>{pct}%</span>
      </div>

      <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.25,1,0.5,1)' }} />
      </div>

      {/* ── BO'LIMLAR KESIMI (T-7) ──
          Natija ekranining asosiy vazifasi — «34/50» ni harakatga aylantirish.
          Ranglar YAKKA signal emas: har qatorda kasr ham, foiz ham bor
          (daltonizm va past kontrastli ekranlar uchun). */}
      {showBreakdown && (
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 16, marginBottom: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 'var(--fs-2xs)', letterSpacing: '0.6px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
            {t('results.breakdownTitle')}
          </div>
          {weakest && (
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>
              {t('results.breakdownLead', { topic: weakest.name })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {breakdown.map((row, idx) => {
              const color = !row.enough ? 'var(--text3)'
                : row.accuracy >= 80 ? 'var(--green)'
                : row.accuracy >= 60 ? 'var(--amber)'
                : 'var(--red)';
              // Harakat tugmasi faqat eng zaif ikkitasida — aks holda 10 ta
              // bo'limli blokda ekran tugmalar devoriga aylanadi.
              const actionable = onPracticeTopic && row.enough && idx < 2 && row.accuracy !== null && row.accuracy < 80;
              return (
                <div key={row.topicId}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name || t('test.allSections')}
                    </span>
                    <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.correct}/{row.answered}
                    </span>
                    <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color, minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.enough ? `${row.accuracy}%` : '—'}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${row.enough ? row.accuracy : 0}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                  {!row.enough && (
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 4 }}>
                      {t('results.notEnoughData')}
                    </div>
                  )}
                  {actionable && (
                    <button
                      onClick={() => onPracticeTopic(row.topicId)}
                      style={{
                        marginTop: 7, padding: '6px 12px', borderRadius: 9,
                        border: '1px solid var(--border2)', background: 'var(--bg2)',
                        color: 'var(--text2)', fontSize: 'var(--fs-sm)', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <Target size={13} /> {t('results.practiceThisTopic')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sessiyada olingan darajalar — sokin muhr-qatorlar */}
      {gained.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {gained.map(g => (
            <div
              key={`${g.trackId}_${g.tier}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                borderRadius: 12, background: 'var(--blue-bg)', color: 'var(--accent2)',
                fontSize: 'var(--fs-sm)', fontWeight: 700
              }}
            >
              <BadgeCheck size={15} style={{ flexShrink: 0 }} />
              {t('results.gainedTier', { track: t(`tracks.${g.trackId}.name`), tier: t(`tracks.tier${g.tier}`) })}
            </div>
          ))}

          {/* Daraja uchun berilgan mukofot — yutuq endi aniq foyda keltiradi */}
          {(reward.points > 0 || reward.freezes > 0) && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 600, paddingLeft: 2 }}>
              {reward.freezes > 0
                ? t('results.rewardBoth', { points: reward.points, count: reward.freezes })
                : t('results.rewardPoints', { points: reward.points })}
            </div>
          )}
        </div>
      )}

      {(amiDelta ?? 0) > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 14, marginBottom: 14 }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>{t('tracks.amiLabel')}</span>
          <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text2)', background: 'var(--bg3)', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
            {t('results.amiAdded', { delta: amiDelta })}
          </span>
        </div>
      )}

      {/* Keyingi bosqich — davom etish uchun aniq sabab */}
      {milestone && (
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 14, marginBottom: 22, textAlign: 'left' }}>
          <NextMilestoneLine milestone={milestone} onClick={() => startMilestone(milestone)} />
        </div>
      )}

      {/* ── Rejadagi keyingi qadam ──
          Test tugagach foydalanuvchi rejadan uzilib qolmasligi kerak: bu blok
          Tahlil > Reja ro'yxatining eng tepasidagi AYNAN o'sha qadamni
          ko'rsatadi (useNextPlanStep + engine/stepText — yagona manba). */}
      {nextStep && (
        <button
          onClick={() => startStep(nextStep)}
          style={{
            width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11,
            borderTop: '1px solid var(--glass-border)', paddingTop: 14, marginBottom: 18,
            background: 'none', border: 'none', borderTopStyle: 'solid', cursor: 'pointer',
            fontFamily: 'inherit', padding: '14px 0 0',
          }}
        >
          <span style={{
            flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: 'var(--blue-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ListChecks size={17} style={{ color: 'var(--accent)' }} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--text3)' }}>
              {t('results.planNext', { done: planDone, total: planTotal })}
            </span>
            <span style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text)', marginTop: 2, lineHeight: 1.35 }}>
              {stepText(nextStep, t).title}
            </span>
          </span>
          <ChevronRight size={17} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, margin: '0 auto' }}>
        {/* Xatolar ustida ishlash — BIRINCHI DARAJALI harakat va «Keyingi blok»
            dan YUQORIDA. Yangi materialga o'tishdan oldin xatoni yopish
            retrieval practice'ning asosiy qoidasi; ilgari bu ikkinchi darajali
            kulrang havola edi va (T-1 tufayli) umuman ko'rinmasdi. */}
        {openMistakes.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('mistakes')}
            style={{ padding: '14px', background: 'var(--cta)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 'var(--fs-lg)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
          >
            <Target size={17} /> {t('results.workOnMistakesCount', { count: openMistakes.length })}
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={openMistakes.length > 0
            ? { padding: '13px', background: 'var(--bg2)', color: 'var(--text2)', border: '1.5px solid var(--border)', borderRadius: 16, fontWeight: 700, fontSize: 'var(--fs-md)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
            : { padding: '14px', background: 'var(--cta)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 'var(--fs-lg)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(14, 151, 224, 0.2)' }}
          onClick={onNextBatch || generateQuestions}
        >
          {onNextBatch ? (
            <>{t('results.nextBlock')} {nextBatchLabel ? `(${nextBatchLabel})` : ''} <ArrowRight size={17} /></>
          ) : (
            <><RefreshCw size={17} /> {t('results.retry')}</>
          )}
        </motion.button>

        <button
          onClick={() => setShowShareCard(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 'var(--fs-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontFamily: 'inherit' }}
        >
          <Share2 size={14} /> {t('results.shareResult')}
        </button>
      </div>

      <ResultShareCard
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        score={correctCount}
        total={questionsLength}
        title={topicName}
        mode="test"
        showToast={showToast}
      />
    </div>
  );
};

export default TestResults;
