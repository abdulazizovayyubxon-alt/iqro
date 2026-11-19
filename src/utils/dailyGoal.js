import { FREE_DAILY_LIMIT } from '../config';

export { FREE_DAILY_LIMIT };

/**
 * Bugungi kun ichida yechilgan savollar sonini qaytaradi.
 * `dailyGoal.date` bugungi sana (`new Date().toDateString()`) bo'lmasa 0 qaytaradi —
 * aks holda kecha 50 ta yechgan bepul foydalanuvchi ertasi kuni ham abadiy bloklanib qolardi.
 */
export function getTodayAnswered(dailyGoal, now = new Date()) {
  if (!dailyGoal || typeof dailyGoal !== 'object') return 0;
  const todayStr = (now instanceof Date ? now : new Date(now)).toDateString();
  if (dailyGoal.date !== todayStr) return 0;
  return Math.max(0, Number(dailyGoal.answered) || 0);
}

export function isFreeDailyLimitReached(isTrialExpired, dailyGoal, now = new Date()) {
  return Boolean(isTrialExpired) && getTodayAnswered(dailyGoal, now) >= FREE_DAILY_LIMIT;
}

/**
 * Firestore Timestamp, `{seconds}`, ISO satr yoki Date qiymatini xavfsiz Date ga aylantiradi.
 */
export function parseFirestoreDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw.seconds === 'number') {
    const d = new Date(raw.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw._seconds === 'number') {
    const d = new Date(raw._seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
