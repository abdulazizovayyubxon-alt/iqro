// Shaxsiy marralar — «Men nimani qildim» qatlami.
//
// tracks.js dan FARQI: yo'nalishlar (tracks) SIFATNI o'lchaydi va Akademik
// Mahorat Indeksiga (AMI) kiradi. Marralar esa ODATNI o'lchaydi — uzluksizlik,
// hajm, zanjir. Ular AMI'ga TA'SIR QILMAYDI: aks holda ko'p savol yechish
// bilan akademik unvon "sotib olish" mumkin bo'lardi.
//
// Barcha value() funksiyalari SOF: faqat state'dan o'qiydi.
// Darajalar MONOTON — reconcileMilestones saqlangan darajadan pastga tushirmaydi.
import { CalendarCheck, Link2, Layers3, CalendarDays, BadgeCheck, GraduationCap } from 'lucide-react';
import { MASTERY_MIN_ANSWERED, MASTERY_MIN_ACC } from './tracks';

const totalAnsweredOf = (state) =>
  Object.values(state.stats || {}).reduce((s, c) => s + (c?.totalAnswered || 0), 0);

const masteredCountOf = (state) =>
  Object.values(state.topicStats || {}).filter(ts => {
    const n = ts?.answered || 0;
    return n >= MASTERY_MIN_ANSWERED && (ts.correct / n) * 100 >= MASTERY_MIN_ACC;
  }).length;

/**
 * Har bir marra: id, ikonka, bosqichlar (o'suvchi) va joriy qiymat funksiyasi.
 * `unit` — i18n'da bosqichni to'g'ri ifodalash uchun (kun / savol / test / bo'lim).
 */
export const MILESTONES = [
  {
    id: 'kunlik',
    icon: CalendarCheck,
    unit: 'day',
    levels: [3, 7, 14, 30, 60, 100],
    value: (s) => s.dailyStreak || 0,
  },
  {
    id: 'zanjir',
    icon: Link2,
    unit: 'q',
    levels: [10, 25, 50, 100],
    value: (s) => s.maxCorrectRun || 0,
  },
  {
    id: 'hajm',
    icon: Layers3,
    unit: 'q',
    levels: [100, 500, 1000, 5000],
    value: totalAnsweredOf,
  },
  {
    id: 'kunlar',
    icon: CalendarDays,
    unit: 'day',
    levels: [10, 30, 100, 250],
    value: (s) => s.goalDaysTotal || 0,
  },
  {
    id: 'benuqson',
    icon: BadgeCheck,
    unit: 'test',
    levels: [1, 5, 15, 40],
    value: (s) => s.perfectExamsCount || 0,
  },
  {
    id: 'ozlashtirish',
    icon: GraduationCap,
    unit: 'topic',
    levels: [1, 3, 6, 12],
    value: masteredCountOf,
  },
];

// { [id]: unit } — bildirishnoma matnida bosqichni to'g'ri ifodalash uchun
export const MILESTONE_UNITS = Object.fromEntries(MILESTONES.map(m => [m.id, m.unit]));

const levelFromValue = (value, levels) => {
  let level = 0;
  levels.forEach((thr, i) => { if (value >= thr) level = i + 1; });
  return level;
};

/**
 * Saqlangan marralarni joriy holat bilan solishtiradi.
 *
 * @param {object} state  AppContext holati
 * @param {object} stored state.milestones ({ [id]: { level, earnedAt } })
 * @returns {{ milestones: object, gained: Array, live: object }}
 *   gained — shu chaqiruvda YANGI olingan bosqichlar (faqat Bell bildirishnomasi)
 *   live   — UI uchun: { [id]: { level, value, next, progress, maxed } }
 */
export function reconcileMilestones(state, stored) {
  const prev = stored || {};
  const out = {};
  const live = {};
  const gained = [];

  for (const m of MILESTONES) {
    let value = 0;
    try { value = m.value(state) || 0; } catch { value = 0; }

    const computed = levelFromValue(value, m.levels);
    const prevLevel = prev[m.id]?.level || 0;
    const earnedAt = { ...(prev[m.id]?.earnedAt || {}) };
    const mergedLevel = Math.max(computed, prevLevel);

    if (computed > prevLevel) {
      for (let lv = prevLevel + 1; lv <= computed; lv++) {
        if (!earnedAt[lv]) earnedAt[lv] = Date.now();
        gained.push({ milestoneId: m.id, level: lv, target: m.levels[lv - 1] });
      }
    }

    out[m.id] = { level: mergedLevel, earnedAt };

    const maxed = mergedLevel >= m.levels.length;
    const next = maxed ? null : m.levels[mergedLevel];
    const base = mergedLevel === 0 ? 0 : m.levels[mergedLevel - 1];
    const progress = maxed ? 1 : Math.max(0, Math.min(1, (value - base) / (next - base)));

    live[m.id] = { level: mergedLevel, value, next, base, progress, maxed, total: m.levels.length };
  }

  return { milestones: out, gained, live };
}

/**
 * Eng yaqin marra — Dashboard/Yutuqlar uchun bitta sokin ko'rsatkich.
 * Tugallanmaganlar ichidan progress bo'yicha eng yuqorisi.
 */
export function nearestMilestone(live) {
  let best = null;
  for (const m of MILESTONES) {
    const lv = live?.[m.id];
    if (!lv || lv.maxed) continue;
    if (!best || lv.progress > best.progress) {
      best = { id: m.id, icon: m.icon, unit: m.unit, ...lv };
    }
  }
  return best;
}
