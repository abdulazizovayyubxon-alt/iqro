import React, { useContext, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import { useTopicTotals } from '../hooks/useTopicTotals';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { useExamDaysLeft } from '../hooks/useExamDaysLeft';
import { useDailyPlan } from '../hooks/useDailyPlan';
import { computeDiagnostics, buildTrajectory, buildPace, readinessTrend } from '../engine/DiagnosticsEngine';
import ReadinessCard from '../components/diagnostics/ReadinessCard';
import TrajectoryPlan from '../components/diagnostics/TrajectoryPlan';
import PlanHeader from '../components/diagnostics/PlanHeader';
import PremiumModal from '../components/PremiumModal';
import SubjectTopicChips from '../components/SubjectTopicChips';
import { SUBJECTS, TOPICS } from '../data/mockData';
import { BATCH_SIZE } from '../config';
import { useStudyContract } from '../hooks/useStudyContract';
import { runStep } from '../hooks/useNextPlanStep';
import { ClipboardList, BookOpen } from 'lucide-react';
import TheoryModal from '../components/theory/TheoryModal';

// Kunlik vaqt byudjeti endi o'quv shartnomasida (services/studyContract.js).
// Ilgari u shu sahifaga xos localStorage kaliti edi va onboardingda berilgan
// «kuniga qancha vaqt» javobi bilan hech qanday aloqasi yo'q edi.

// Bo'lim holati ranglari — sokin palitra
const STATUS_COLOR = {
  untouched: 'var(--text3)',
  thin: 'var(--text3)',
  weak: 'var(--red)',
  medium: 'var(--amber)',
  strong: 'var(--accent)',
  mastered: 'var(--green)',
};

const AnalysisPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, updateState } = useContext(AppContext);
  // `?tab=plan` — drawerdagi «Bugungi reja» to'g'ridan-to'g'ri reja tabini ochadi
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'plan' ? 'plan' : 'diagnosis';
  const setTab = (next) => setSearchParams(next === 'plan' ? { tab: 'plan' } : {}, { replace: true });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [theoryTopic, setTheoryTopic] = useState(null); // { id, name } | null

  // Maqsad ham, kunlik byudjet ham onboardingdagi javoblardan keladi
  const { targetScore, dailyMinutes, update: updateContract } = useStudyContract();
  const budget = dailyMinutes;

  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;

  const cat = state.activeCategory;
  const topicTotals = useTopicTotals(cat);
  const daysLeft = useExamDaysLeft();

  const diag = useMemo(
    () => computeDiagnostics(state, {
      topicTotals,
      goalScore: targetScore,
      examQuestions: BATCH_SIZE,
    }),
    [state, topicTotals, targetScore]
  );

  const steps = useMemo(
    () => buildTrajectory(diag, state, { maxMinutes: budget }),
    [diag, state, budget]
  );

  // Kunlik sur'at — imtihon sanasidan; sana yo'q bo'lsa taklif ko'rsatiladi
  const pace = useMemo(() => buildPace(diag, state, { daysLeft }), [diag, state, daysLeft]);

  // Reja kun davomida muhrlanadi — ro'yxat test ishlagandan keyin sakramaydi
  const plan = useDailyPlan(steps, cat, budget);

  // Haftalik tendensiya — shu fan bo'yicha
  const trend = useMemo(
    () => readinessTrend((state.readinessHistory || {})[cat] || []),
    [state.readinessHistory, cat]
  );

  // Byudjet o'zgarishi shartnomaga yoziladi — Firestore'ga ham ketadi va
  // boshqa qurilmada ham o'sha reja ko'rinadi
  const handleBudget = (minutes) => updateContract({ dailyMinutes: minutes });

  // Bo'lim jadvalidan/ReadinessCard'dan to'g'ridan-to'g'ri mashqqa o'tish.
  // topicSubset ATAYIN null: oldingi aralash mashqning filtri qolib ketmasin.
  const goPractice = (topicId) => {
    if (isFreeLimitReached) { setShowPremiumModal(true); return; }
    updateState({ topicId: topicId ?? -1, testMode: 'exam', topicSubset: null });
    navigate('/test');
  };

  // Qadamni ishga tushirish mantig'i umumiy (hooks/useNextPlanStep.js) —
  // test natijasi ekranidagi «keyingi qadam» ham shu funksiyani chaqiradi.
  // Bepul limit tekshiruvi sahifaga xos, shuning uchun shu yerda qoladi.
  const handleStep = (step) => {
    if (isFreeLimitReached && step.route !== '/errors') { setShowPremiumModal(true); return; }
    runStep(step, { updateState, navigate });
  };

  // Batafsil jadval — yo'qotish bo'yicha tartiblangan
  const rows = useMemo(
    () => [...diag.topics].sort((a, b) => b.expectedLoss - a.expectedLoss),
    [diag]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 32px' }}
    >
      <h1 style={{ fontSize: 'var(--fs-6xl)', fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>
        {t('analysis.title')}
      </h1>
      <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: 16 }}>
        {t('analysis.subtitle')}
      </p>

      {/* Fan almashtirish — tahlil har fan uchun alohida */}
      <div style={{ marginBottom: 16 }}>
        <SubjectTopicChips
          state={state}
          updateState={updateState}
          SUBJECTS={SUBJECTS}
          TOPICS={TOPICS}
        />
      </div>

      {/* Tablar */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, padding: 3, gap: 3, marginBottom: 18 }}>
        {[
          { id: 'diagnosis', label: t('analysis.tabDiagnosis') },
          { id: 'plan', label: t('analysis.tabPlan') },
        ].map(x => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none',
              background: tab === x.id ? 'var(--bg2)' : 'transparent',
              color: tab === x.id ? 'var(--text)' : 'var(--text3)',
              fontWeight: 700, fontSize: 'var(--fs-md)', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: tab === x.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {x.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'diagnosis' && (
          <motion.div
            key="diagnosis"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            <ReadinessCard diag={diag} trend={trend} onTopic={goPractice} />

            {/* Qamrov / o'zlashtirish xulosasi */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {[
                { val: `${diag.coverage.practiced}/${diag.coverage.total}`, label: t('analysis.coverageLabel') },
                { val: diag.mastered, label: t('analysis.masteredLabel') },
                // Ishonch foizi o'rniga xatolik chegarasi — foydalanuvchi uchun
                // «±6» «ishonch 58%» dan ancha tushunarli va bir xil ma'noni beradi
                { val: `±${diag.margin}`, label: t('analysis.marginLabel') },
              ].map((b, i) => (
                <div key={i} className="glass-panel" style={{ flex: 1, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{b.val}</div>
                  <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 5 }}>{b.label}</div>
                </div>
              ))}
            </div>

            {/* Bo'limlar bo'yicha batafsil jadval */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 12px',
              fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)',
            }}>
              <ClipboardList size={17} style={{ color: 'var(--accent)' }} />
              {t('analysis.byTopicTitle')}
            </div>

            <div className="glass-panel" style={{ padding: '6px 0', overflow: 'hidden' }}>
              {rows.map((tp, i) => (
                // Qator ikki amalga bo'linadi: matn qismi mashqqa olib boradi,
                // o'ngdagi belgi konspektni ochadi. Tugma ichiga tugma
                // joylab bo'lmagani uchun tashqi o'ram — oddiy div.
                <div
                  key={tp.id}
                  style={{
                    display: 'flex', alignItems: 'stretch',
                    // oxirgi qatorda chegara yo'q — panel ichida osilib qolmasin
                    borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)',
                  }}
                >
                <button
                  onClick={() => goPractice(tp.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0,
                    padding: '11px 4px 11px 14px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 'var(--fs-lg)', flexShrink: 0, width: 20 }}>{tp.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tp.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.round(tp.pEst * 100)}%`, height: '100%', borderRadius: 2,
                          background: STATUS_COLOR[tp.status],
                        }} />
                      </div>
                      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                        {tp.answered > 0 ? `${tp.answered} ${t('analysis.qShort')}` : t('analysis.notStarted')}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 58 }}>
                    <div style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: STATUS_COLOR[tp.status] }}>
                      {tp.acc !== null ? `${tp.acc}%` : '—'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-3xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 2 }}>
                      {t(`analysis.status.${tp.status}`)}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setTheoryTopic({ id: tp.id, name: tp.name })}
                  aria-label={t('theory.open')}
                  title={t('theory.open')}
                  style={{
                    flexShrink: 0, padding: '0 14px 0 8px', background: 'transparent',
                    border: 'none', color: 'var(--text3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <BookOpen size={15} />
                </button>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', lineHeight: 1.55, marginTop: 12 }}>
              {t('analysis.methodNote')}
            </p>
          </motion.div>
        )}

        {tab === 'plan' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            <PlanHeader
              pace={pace}
              budget={budget}
              onBudget={handleBudget}
              doneCount={plan.doneCount}
              total={plan.total}
              totalMinutes={plan.totalMinutes}
              activeDays={state.activeDays || []}
              streak={state.dailyStreak || 0}
            />
            <div style={{
              padding: '12px 14px', marginBottom: 14, borderRadius: 12,
              background: 'var(--blue-bg)', fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.55,
            }}>
              {t('analysis.planIntro')}
            </div>
            <TrajectoryPlan steps={plan.steps} onStep={handleStep} />
          </motion.div>
        )}
      </AnimatePresence>

      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} source="analysis" />

      <TheoryModal
        open={!!theoryTopic}
        onClose={() => setTheoryTopic(null)}
        topicId={theoryTopic?.id}
        topicName={theoryTopic?.name}
      />
    </motion.div>
  );
};

export default AnalysisPage;
