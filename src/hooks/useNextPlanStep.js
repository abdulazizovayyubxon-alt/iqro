import { useContext, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTopicTotals } from './useTopicTotals';
import { useStudyContract } from './useStudyContract';
import { useDailyPlan } from './useDailyPlan';
import { computeDiagnostics, buildTrajectory } from '../engine/DiagnosticsEngine';
import { BATCH_SIZE } from '../config';

/** Mahalliy kalendar kuni 'YYYY-MM-DD' (O'zbekistonda = Toshkent kuni) */
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Sessiya davomida oxirgi e'lon qilingan sarlavha — takroriy yozuvlarni kesadi
const lastPublished = new Map();

/**
 * runStep — reja qadamini ishga tushirish. Tahlil sahifasi va test natijasi
 * ekrani AYNAN shu funksiyani chaqiradi, aks holda ikkita nusxa vaqt o'tib
 * bir-biridan uzoqlashardi.
 *
 * topicSubset HAR SAFAR aniq beriladi (aralash qadamdan tashqari null) —
 * aks holda oldingi aralash mashqning filtri keyingi testda ham qolib ketardi.
 */
export const runStep = (step, { updateState, navigate }) => {
  if (!step) return;
  if (step.type === 'mixed') {
    updateState({ topicId: -1, testMode: 'exam', topicSubset: step.topicIds });
    navigate('/test');
    return;
  }
  if (step.type === 'practice' || step.type === 'coverage' || step.type === 'refresh') {
    updateState({ topicId: step.topicId ?? -1, testMode: 'exam', topicSubset: null });
    navigate('/test');
    return;
  }
  navigate(step.route);
};

/**
 * useNextPlanStep — «hozir nima qilishim kerak?» degan savolning YAGONA javobi.
 *
 * Ilgari bu bilim faqat Tahlil > Reja sahifasida yashardi: test tugagach
 * foydalanuvchi «Keyingi blok» tugmasini ko'rardi va rejadan uzilib qolardi.
 * Endi natija ekrani ham, Reja sahifasi ham shu bitta hisobdan foydalanadi —
 * qadam hamma joyda bir xil nomlanadi (engine/stepText.js).
 *
 * Muhrlangan kunlik rejadan (useDailyPlan) bajarilmagan BIRINCHI qadamni
 * qaytaradi — ya'ni natija ekranidagi taklif reja ro'yxatining tepasi bilan
 * aynan bir xil bo'ladi.
 *
 * `startStep` — qadamni ISHGA TUSHIRISH mantig'i ham shu yerda. Ilgari u
 * AnalysisPage ichida edi; natija ekrani uni takrorlaganda ikkitasi vaqt o'tib
 * bir-biridan uzoqlashardi. Bepul limit tekshiruvi ATAYIN bu yerda emas — u
 * sahifaga xos qaror, chaqiruvchi o'zi qiladi.
 *
 * @returns {{ step: object|null, remaining: number, total: number,
 *             doneCount: number, totalMinutes: number, category: string,
 *             startStep: Function }}
 */
export const useNextPlanStep = () => {
  const { state, updateState } = useContext(AppContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const cat = state.activeCategory;
  const topicTotals = useTopicTotals(cat);
  const { targetScore, dailyMinutes } = useStudyContract();

  const diag = useMemo(
    () => computeDiagnostics(state, {
      topicTotals,
      goalScore: targetScore,
      examQuestions: BATCH_SIZE,
    }),
    [state, topicTotals, targetScore]
  );

  const steps = useMemo(
    () => buildTrajectory(diag, state, { maxMinutes: dailyMinutes }),
    [diag, state, dailyMinutes]
  );

  const plan = useDailyPlan(steps, cat, dailyMinutes);
  const pending = plan.steps.filter(s => !s.done);
  const next = pending[0] || null;

  // ── Bugungi qadamni push uchun e'lon qilish ──
  // Reja mijozda hisoblanadi, cron esa serverda ishlaydi — 19:00 eslatmasi
  // qadam nomini bilishi uchun uni `userStats` ga yozib qo'yamiz (cron o'sha
  // hujjatni allaqachon o'qiydi, qo'shimcha o'qish yo'q). Matn EMAS, qadam
  // TURI yuboriladi: xabar tili serverdagi `pushLang` bo'yicha tanlanadi.
  const uid = user?.uid;
  useEffect(() => {
    if (!uid || !next) return;
    const headline = {
      date: localDay(),
      type: next.type,
      topic: next.topicName || null,
      count: next.count ?? next.batch ?? null,
      minutes: plan.totalMinutes,
      remaining: pending.length,
      total: plan.total,
    };
    // Bir xil qiymatni kun davomida qayta-qayta yozmaymiz (Firestore byudjeti)
    const sig = JSON.stringify(headline);
    if (lastPublished.get(uid) === sig) return;
    lastPublished.set(uid, sig);
    setDoc(doc(db, 'userStats', uid), { todayPlan: headline }, { merge: true })
      .catch(e => console.warn('Reja sarlavhasini e\'lon qilish xatosi:', e));
  }, [uid, next, plan.totalMinutes, plan.total, pending.length]);

  const startStep = useCallback(
    (step) => runStep(step, { updateState, navigate }),
    [updateState, navigate]
  );

  return {
    startStep,
    step: next,
    remaining: pending.length,
    total: plan.total,
    doneCount: plan.doneCount,
    totalMinutes: plan.totalMinutes,
    category: cat,
  };
};

export default useNextPlanStep;
