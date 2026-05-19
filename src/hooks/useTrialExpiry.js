import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { FREE_TRIAL_DAYS } from '../config';

const CACHE_KEY = 'iqro_trial_status';
const CACHE_TTL = 1000 * 60 * 60; // 1 soat — har soatda bir marta Firestore tekshiriladi

export function useTrialExpiry() {
  const { user } = useAuth();
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(FREE_TRIAL_DAYS);
  const [trialEndDate, setTrialEndDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Premium foydalanuvchi — hech qanday cheklov yo'q
    if (user.isPremium) {
      setIsTrialExpired(false);
      setDaysLeft(null); // null = cheksiz
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
        const endDate = new Date(createdAt);
        endDate.setDate(endDate.getDate() + FREE_TRIAL_DAYS);

        const now = new Date();
        const msLeft = endDate - now;
        const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        const expired = msLeft <= 0;

        setIsTrialExpired(expired);
        setDaysLeft(expired ? 0 : days);
        setTrialEndDate(endDate);

        // Cache ga saqlaymiz
        sessionStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({
          isTrialExpired: expired,
          daysLeft: expired ? 0 : days,
          trialEndDate: endDate.toISOString(),
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

  return { isTrialExpired, daysLeft, trialEndDate, loading };
}
