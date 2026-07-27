import { useState, useEffect, useMemo, useCallback } from 'react';
import { TOPICS } from '../data/mockData';

/**
 * useDailyPlan — kunlik rejani «muhrlaydi».
 *
 * Muammo: buildTrajectory har renderda qaytadan hisoblanadi. Foydalanuvchi
 * bitta qadamni bajarsa statistika o'zgaradi va QOLGAN qadamlar ham qayta
 * tartiblanadi — ro'yxat sakraydi, «bugungi rejani tugatdim» hissi umuman
 * paydo bo'lmaydi.
 *
 * Yechim: kun boshida qadamlar to'plami va tartibi saqlanadi, kun oxirigacha
 * o'zgarmaydi. Bajarilganlik esa avvalgidek JONLI hisobdan olinadi —
 * ya'ni «done» hech qayerda saqlanmaydi, faqat qadamlar RO'YXATI muhrlanadi.
 *
 * Muhr bekor bo'ladi: kun almashganda, fan almashganda, byudjet o'zgarganda.
 *
 * Saqlash localStorage'da — bu qurilmaga xos kunlik ko'rinish, bulutga
 * chiqarilmaydi (state sxemasi o'zgarmaydi).
 */
const STORAGE_KEY = 'zehin_daily_plan_v1';

const todayKey = () => new Date().toDateString();

// TOPICS.icon — JSX elementi, JSON'ga sig'maydi. Muhrga faqat ma'lumot
// yoziladi, belgi yuklashda qaytadan biriktiriladi.
const stripIcon = ({ topicIcon, ...rest }) => rest;

const iconOf = (topicId) =>
  topicId == null ? null : (TOPICS.find(t => t.id === topicId)?.icon || null);

const readSeal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeSeal = (seal) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seal));
  } catch {
    // kvota to'lgan yoki private rejim — muhrsiz ham ishlayveradi
  }
};

/**
 * @param {Array}  steps    buildTrajectory natijasi (jonli)
 * @param {string} category amaldagi fan
 * @param {number|null} budget kunlik daqiqa byudjeti (muhr kalitining qismi)
 * @returns {{ steps: Array, doneCount: number, total: number, totalMinutes: number, reset: Function }}
 */
export const useDailyPlan = (steps, category, budget = null) => {
  const [seal, setSeal] = useState(() => readSeal());

  const stamp = todayKey();
  const isValid = !!seal
    && seal.date === stamp
    && seal.category === category
    && (seal.budget ?? null) === (budget ?? null);

  // Muhr yo'q/eskirgan bo'lsa — bugungi rejani belgilab qo'yamiz.
  useEffect(() => {
    if (isValid || steps.length === 0) return;
    const fresh = {
      date: stamp,
      category,
      budget: budget ?? null,
      steps: steps.map(stripIcon),
    };
    writeSeal(fresh);
    setSeal(fresh);
  }, [isValid, steps, category, budget, stamp]);

  const planSteps = useMemo(() => {
    if (!isValid) return steps;

    const live = new Map(steps.map(s => [s.id, s]));
    return seal.steps.map(sealed => {
      const fresh = live.get(sealed.id);
      // Qadam jonli ro'yxatdan chiqib ketgan bo'lsa — demak sharti bajarilgan
      // (mavzu o'zlashtirildi, xatolar tozalandi, takror navbati yopildi).
      // Uni yo'qotmaymiz: bajarilgan qilib ko'rsatamiz.
      if (!fresh) return { ...sealed, topicIcon: iconOf(sealed.topicId), done: true };
      return { ...fresh, topicIcon: fresh.topicIcon ?? iconOf(sealed.topicId) };
    });
  }, [isValid, seal, steps]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* muhim emas */ }
    setSeal(null);
  }, []);

  const doneCount = planSteps.filter(s => s.done).length;
  const totalMinutes = planSteps.reduce((sum, s) => sum + (s.done ? 0 : (s.minutes || 0)), 0);

  return { steps: planSteps, doneCount, total: planSteps.length, totalMinutes, reset };
};

export default useDailyPlan;
