import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { FREE_TRIAL_DAYS, URGENCY_DAYS } from '../services/referral';

const CACHE_KEY = 'iqro_trial_status';
const CACHE_TTL = 1000 * 60 * 60; // 1 soat — har soatda bir marta Firestore tekshiriladi

export function useTrialExpiry() {
  const { user } = useAuth();
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(FREE_TRIAL_DAYS);
  const [trialEndDate, setTrialEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  // Urgency davri uchun
  const [isUrgency, setIsUrgency] = useState(false);
  const [urgencyMs, setUrgencyMs] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Premium foydalanuvchi — hech qanday cheklov yo'q
    if (user.isPremium) {
      setIsTrialExpired(false);
      setDaysLeft(null); // null = cheksiz
      setIsUrgency(false);
      setUrgencyMs(0);
      setLoading(false);
      return;
    }

    // Cache tekshiruvi — har safar Firestore'ga murojaat qilmaslik uchun
    const cacheRaw = sessionStorage.getItem(`${CACHE_KEY}_${user.uid}`);
    if (cacheRaw) {
      try {
        const cache = JSON.parse(cacheRaw);
        if (Date.now() - cache.savedAt < CACHE_TTL) {
          setIsTrialExpired(cache.isTrialExpired);
          setDaysLeft(cache.daysLeft);
          setTrialEndDate(cache.trialEndDate ? new Date(cache.trialEndDate) : null);
          setIsUrgency(cache.isUrgency || false);
          setUrgencyMs(cache.urgencyMs || 0);
          setLoading(false);
          return;
        }
      } catch { /* cache buzilgan — Firestore dan qayta yuklaymiz */ }
    }

    const checkTrial = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();

        // Referral orqali kelgan va bepul oyi tugamagan → cheklov yo'q
        if (data.referredBy && data.freeMonthExpire) {
          const freeEnd = new Date(data.freeMonthExpire);
          if (freeEnd > new Date()) {
            setIsTrialExpired(false);
            setDaysLeft(null);
            setIsUrgency(false);
            setUrgencyMs(0);
            setLoading(false);
            return;
          }
        }

        // createdAt ni aniqlash
        let createdAt = null;

        if (data.createdAt) {
          // Firestore Timestamp yoki ISO string
          createdAt = data.createdAt.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt);
        } else {
          // createdAt yo'q — hozirgi sanani yozib qo'yamiz (birinchi kirishda)
          createdAt = new Date();
          await updateDoc(userRef, { createdAt: createdAt.toISOString() });
        }

        // Trial tugash sanasi
        const trialEnd = new Date(createdAt);
        trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);

        // Urgency tugash sanasi (trial + 3 kun)
        const urgencyEnd = new Date(createdAt);
        urgencyEnd.setDate(urgencyEnd.getDate() + FREE_TRIAL_DAYS + URGENCY_DAYS);

        const now = new Date();
        const msToTrialEnd = trialEnd - now;
        const msToUrgencyEnd = urgencyEnd - now;
        const days = Math.ceil(msToTrialEnd / 86400000);

        if (msToTrialEnd > 0) {
          // Hali trial davom etmoqda
          setIsTrialExpired(false);
          setDaysLeft(days);
          setIsUrgency(false);
          setUrgencyMs(0);
        } else if (msToUrgencyEnd > 0) {
          // Trial tugagan, urgency davri
          setIsTrialExpired(false); // Urgency davomida hali bloklangan emas
          setDaysLeft(0);
          setIsUrgency(true);
          setUrgencyMs(msToUrgencyEnd);
        } else {
          // Hamma muddat tugagan — to'liq blok
          setIsTrialExpired(true);
          setDaysLeft(0);
          setIsUrgency(false);
          setUrgencyMs(0);

          // ═══ DISCOUNT EXPIRY: chegirma muddati tugadi — Firestore da ham bekor qilish ═══
          if (data.referralDiscount && data.referralDiscount > 0) {
            await updateDoc(userRef, {
              referralDiscount: 0,
              discountExpired: true,
              discountExpiredAt: new Date().toISOString(),
            }).catch(e => console.warn('Discount expire update xatosi:', e));
          }
        }

        setTrialEndDate(trialEnd);

        // Cache ga saqlaymiz
        sessionStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({
          isTrialExpired: msToUrgencyEnd <= 0,
          daysLeft: msToTrialEnd > 0 ? days : 0,
          trialEndDate: trialEnd.toISOString(),
          isUrgency: msToTrialEnd <= 0 && msToUrgencyEnd > 0,
          urgencyMs: msToTrialEnd <= 0 && msToUrgencyEnd > 0 ? msToUrgencyEnd : 0,
          savedAt: Date.now(),
        }));

      } catch (err) {
        console.error('useTrialExpiry xatosi:', err);
        // Xatolik bo'lsa — cheklamaymiz (foydalanuvchini nohaq bloklamamaslik uchun)
        setIsTrialExpired(false);
      }

      setLoading(false);
    };

    checkTrial();
  }, [user]);

  return { isTrialExpired, daysLeft, trialEndDate, loading, isUrgency, urgencyMs };
}

