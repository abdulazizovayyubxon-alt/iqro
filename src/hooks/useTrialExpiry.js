import { useAuth } from '../context/AuthContext';
import { FREE_TRIAL_DAYS } from '../services/referral';

/**
 * useTrialExpiry — trial holatini O'QIYDI (qayta hisoblamaydi).
 *
 * YAGONA HAQIQAT MANBASI: AuthContext.computeTrialStatus natijani `user` obyektiga
 * yozadi (trialStatus / trialDaysLeft / urgencyMs / isTruePremium). Avval bu hook
 * mustaqil ravishda Firestore'dan o'qib qayta hisoblardi — bu AuthContext bilan
 * ziddiyatga (turli javob, ikki kesh) olib kelardi. Endi bitta manba bor.
 *
 * Qaytaradi: { isTrialExpired, daysLeft, trialEndDate, loading, isUrgency, urgencyMs }
 */
export function useTrialExpiry() {
  const { user } = useAuth();

  if (!user) {
    return {
      isTrialExpired: false,
      daysLeft: FREE_TRIAL_DAYS,
      trialEndDate: null,
      loading: false,
      isUrgency: false,
      urgencyMs: 0,
    };
  }

  const status = user.trialStatus || 'expired';

  // Haqiqiy yoki trial/urgency premium — hech qanday cheklov yo'q
  if (status === 'premium' || user.isTruePremium) {
    return {
      isTrialExpired: false,
      daysLeft: null, // null = cheksiz
      trialEndDate: null,
      loading: false,
      isUrgency: false,
      urgencyMs: 0,
    };
  }

  // status: 'trial' | 'urgency' | 'expired'
  return {
    isTrialExpired: status === 'expired',
    daysLeft: status === 'trial' ? (user.trialDaysLeft ?? 0) : 0,
    trialEndDate: null,
    loading: false,
    isUrgency: status === 'urgency',
    urgencyMs: user.urgencyMs || 0,
  };
}
