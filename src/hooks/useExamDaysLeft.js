import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  daysUntilExam, readExamInfo, writeGlobalExam, isGlobalStale, COUNTDOWN_EVENT,
} from '../utils/examDate';

/**
 * Umumiy imtihon sanasini Firestore'dan olib keshga yozadi.
 * Hujjat: settings/exam → { date: 'YYYY-MM-DD', label: '15-noyabr — ...' }
 * Admin uni Firebase konsolidan yangilaydi — kod qayta deploy qilinmaydi.
 * Sana bo'lmasa hech narsa buzilmaydi: shaxsiy sana va config zaxira qoladi.
 */
const fetchGlobalExam = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'exam'));
    if (snap.exists()) {
      const d = snap.data();
      writeGlobalExam({ date: d.date || null, label: d.label || null });
    } else {
      writeGlobalExam({ date: null, label: null }); // yo'qligini ham keshlaymiz
    }
  } catch (e) {
    console.warn('Umumiy imtihon sanasini yuklashda xato:', e.message);
  }
};

/**
 * useExamDaysLeft — imtihongacha qolgan kunlar (null = sana belgilanmagan).
 * Eski shartnoma saqlanadi (AnalysisPage/buildPace shu raqamni kutadi).
 */
export const useExamDaysLeft = () => {
  const [daysLeft, setDaysLeft] = useState(() => daysUntilExam());

  useEffect(() => {
    const sync = () => setDaysLeft(daysUntilExam());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    window.addEventListener(COUNTDOWN_EVENT, sync);
    const id = setInterval(sync, 60 * 60 * 1000);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener(COUNTDOWN_EVENT, sync);
      clearInterval(id);
    };
  }, []);

  return daysLeft;
};

/**
 * useExamCountdown — sanoq uchun to'liq holat:
 *   { hasDate, enabled, date, source, label, daysLeft, isToday, tone, isPersonal, refresh }
 *
 * Umumiy sanani (settings/exam) sessiyada bir marta, kesh eskirgan bo'lsa
 * yuklaydi. Sana o'zgarganda (modal saqlagach) `refresh` chaqiriladi.
 */
export const useExamCountdown = () => {
  const { user } = useAuth();
  const [info, setInfo] = useState(() => readExamInfo());

  const refresh = useCallback(() => setInfo(readExamInfo()), []);

  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener(COUNTDOWN_EVENT, refresh);
    const id = setInterval(refresh, 60 * 60 * 1000);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener(COUNTDOWN_EVENT, refresh);
      clearInterval(id);
    };
  }, [refresh]);

  // settings/* faqat tizimga kirganlar uchun o'qiladi (firestore.rules)
  useEffect(() => {
    if (!user || !isGlobalStale()) return;
    let cancelled = false;
    fetchGlobalExam().then(() => { if (!cancelled) refresh(); });
    return () => { cancelled = true; };
  }, [user, refresh]);

  return { ...info, refresh };
};

export default useExamDaysLeft;
