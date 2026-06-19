import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { TOPICS } from '../data/mockData';
import { MAX_MISTAKES_SAVED } from '../config';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import {
  doc,
  setDoc,
  getDoc,
  deleteField
} from "firebase/firestore";

export const AppContext = createContext();

// Helper to get ISO-8601 week number (YYYY_Www)
export const getWeekId = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}_W${String(weekNo).padStart(2, '0')}`;
};

// Helper to get month ID (YYYY_MM)
export const getMonthId = (date = new Date()) => {
  return `${date.getFullYear()}_M${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// ── Kunlik streak + bepul avtomatik "muzlatish" (freeze/restore) ──────────
// 1 kun o'tkazib yuborilsa, muzlatish zaxirasi streakni avtomatik saqlaydi —
// foydalanuvchi qaytib kelganda zanjir uzilmaydi (bepul, avtomatik tiklash).
export const STREAK_FREEZE_START = 2;     // boshlang'ich zaxira
export const STREAK_FREEZE_MAX = 3;       // maksimal zaxira
export const STREAK_FREEZE_MILESTONE = 7; // har 7 kunlik bosqichda +1 zaxira

// Ikki toDateString() qiymati orasidagi to'liq kun farqi
const dayDiff = (fromStr, toStr) => {
  const a = new Date(fromStr); const b = new Date(toStr);
  if (isNaN(a) || isNaN(b)) return Infinity;
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

// Maqsad bajarilganda kunlik streakni yangilaydi. Aynan 1 kun o'tkazib yuborilgan
// bo'lsa (diff === 2) va zaxira bo'lsa — muzlatishni sarflab streakni davom ettiradi.
const advanceDailyStreak = (prev, today, dgCompleted) => {
  let dailyStreak = prev.dailyStreak || 0;
  let lastGoalDate = prev.lastGoalDate;
  let streakFreezes = prev.streakFreezes ?? STREAK_FREEZE_START;
  let streakFrozenDate = prev.streakFrozenDate || null;

  if (dgCompleted && lastGoalDate !== today) {
    if (!lastGoalDate) {
      dailyStreak = 1;
    } else {
      const diff = dayDiff(lastGoalDate, today);
      if (diff === 1) {
        dailyStreak += 1;
      } else if (diff === 2 && streakFreezes > 0) {
        streakFreezes -= 1;          // aynan 1 kun o'tkazildi → muzlatish ishlaydi
        streakFrozenDate = today;
        dailyStreak += 1;
      } else {
        dailyStreak = 1;             // 2+ kun yoki zaxira yo'q → qaytadan boshlanadi
      }
    }
    lastGoalDate = today;

    // Har 7 kunlik bosqichda zaxira to'ldiriladi (cap bilan)
    if (dailyStreak > 0 && dailyStreak % STREAK_FREEZE_MILESTONE === 0) {
      streakFreezes = Math.min(STREAK_FREEZE_MAX, streakFreezes + 1);
    }
  }
  return { dailyStreak, lastGoalDate, streakFreezes, streakFrozenDate };
};

const buildDefaultCatStats = () => ({
  totalAnswered: 0,
  totalCorrect: 0,
  streak: 0,
  maxStreak: 0,
  mistakes: []
});

const buildDefaultState = () => {
  const weekId = getWeekId();
  const monthId = getMonthId();
  return {
    totalScore: 0,
    streak: 0,
    maxStreak: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    topicStats: {},
    mistakes: [],
    sessionStart: Date.now(),
    studyMinutes: 0,
    activeCategory: 'chqbt',
    topicId: -1,      // Tanlangan mavzu ID (-1 = barchasi)
    testMode: 'exam',  // Test rejimi: 'exam' | 'flashcard' | 'mistakes'
    stats: {
      chqbt: buildDefaultCatStats(),
      art: buildDefaultCatStats()
    },
    dailyGoal: {
      date: new Date().toDateString(),
      answered: 0,
      target: 20,
      completed: false
    },
    dailyStreak: 0,
    lastGoalDate: null,
    streakFreezes: STREAK_FREEZE_START,
    streakFrozenDate: null,
    spacedCards: [],
    customMnemonics: {},
    repetitionLimit: 10,
    timeStats: { totalTime: 0, totalQuestions: 0 },
    [`weekly_${weekId}`]: 0,
    [`monthly_${monthId}`]: 0
  };
};

// ────────────────────────────────────────────────────────
// XAVFSIZ localStorage kalit nomini yaratish
// Har bir foydalanuvchining ma'lumotlari alohida saqlanadi
// ────────────────────────────────────────────────────────
const getUserStateKey = (uid) => `iqro_state_${uid}`;

// Shu foydalanuvchining lokal zaxirasini o'qish (kalit UID bilan izolyatsiyalangan)
const loadLocalBackup = (uid) => {
  try {
    const raw = localStorage.getItem(getUserStateKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

// Bulut va lokal zaxirani birlashtirish — qurilma almashganda "last-write-wins"
// hisoblagichlarni o'chirib yubormasligi uchun monoton qiymatlar bo'yicha max() olinadi.
// resetAt guard: ataylab reset qilingan statistikani eski lokal nusxa "tiriltirmasligi" kerak.
const mergeCloudAndLocal = (cloud, local) => {
  if (!local) return cloud;
  if (cloud.resetAt && (local.savedAt || 0) < cloud.resetAt) return cloud;

  const merged = { ...cloud };

  ['totalScore', 'totalAnswered', 'totalCorrect', 'maxStreak', 'studyMinutes', 'dailyStreak']
    .forEach(k => { merged[k] = Math.max(cloud[k] || 0, local[k] || 0); });

  Object.keys(local).forEach(k => {
    if (k.startsWith('weekly_') || k.startsWith('monthly_')) {
      merged[k] = Math.max(cloud[k] || 0, local[k] || 0);
    }
  });

  const catIds = new Set([...Object.keys(cloud.stats || {}), ...Object.keys(local.stats || {})]);
  merged.stats = {};
  catIds.forEach(cat => {
    const c = (cloud.stats || {})[cat] || buildDefaultCatStats();
    const l = (local.stats || {})[cat] || buildDefaultCatStats();
    // Xatolar savol matni bo'yicha union qilinadi
    const seen = new Set();
    const mistakes = [...(c.mistakes || []), ...(l.mistakes || [])].filter(m => {
      const key = m?.question || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    while (mistakes.length > MAX_MISTAKES_SAVED) mistakes.shift();
    merged.stats[cat] = {
      ...c,
      totalAnswered: Math.max(c.totalAnswered || 0, l.totalAnswered || 0),
      totalCorrect: Math.max(c.totalCorrect || 0, l.totalCorrect || 0),
      maxStreak: Math.max(c.maxStreak || 0, l.maxStreak || 0),
      mistakes
    };
  });

  const topicIds = new Set([...Object.keys(cloud.topicStats || {}), ...Object.keys(local.topicStats || {})]);
  merged.topicStats = {};
  topicIds.forEach(t => {
    const c = (cloud.topicStats || {})[t] || { answered: 0, correct: 0 };
    const l = (local.topicStats || {})[t] || { answered: 0, correct: 0 };
    merged.topicStats[t] = {
      answered: Math.max(c.answered || 0, l.answered || 0),
      correct: Math.max(c.correct || 0, l.correct || 0)
    };
  });

  merged.timeStats = {
    totalTime: Math.max(cloud.timeStats?.totalTime || 0, local.timeStats?.totalTime || 0),
    totalQuestions: Math.max(cloud.timeStats?.totalQuestions || 0, local.timeStats?.totalQuestions || 0)
  };

  return merged;
};

// Firestore `undefined` qiymatni qabul qilmaydi — agar saqlanadigan obyektda
// (masalan spacedCards/mistakes ichida correct:undefined) bironta undefined bo'lsa,
// setDoc BUTUN yozuvni rad etadi va xato jim yutiladi → bulutga ball yozilmaydi,
// reyting 0 turadi. Shu sababli yozishdan oldin undefined'larni chuqur tozalaymiz.
// deleteField()/FieldValue kabi maxsus sentinel obyektlarga TEGMAYMIZ
// (faqat oddiy obyekt/massivga kiramiz — ularning constructor === Object emas).
const stripUndefined = (value) => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
};

// Firestore'ga yozishdan oldin tayyorlash: leaderboard maydonlari,
// vaqtinchalik kalitlar va eski davr (weekly_/monthly_) kalitlarini tozalash.
// Eski kalitlar deleteField() bilan hujjatdan ham o'chiriladi — aks holda doc cheksiz o'sadi.
const prepareStatsForSave = (stateObj, currentUser) => {
  const statsToSave = { ...stateObj };
  const currentName = currentUser.displayName || stateObj.displayName || currentUser.email?.split('@')[0] || '';
  statsToSave.displayName = currentName;
  statsToSave.userName = currentName;
  statsToSave.photoURL = currentUser.photoURL || stateObj.photoURL || null;
  statsToSave.avatarId = currentUser.avatarId || stateObj.avatarId || null;
  delete statsToSave.topicId;
  delete statsToSave.testMode;
  delete statsToSave.savedAt;

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const keep = new Set([
    `weekly_${getWeekId()}`,
    `weekly_${getWeekId(new Date(Date.now() - 7 * 86400000))}`,
    `monthly_${getMonthId()}`,
    `monthly_${getMonthId(prevMonth)}`
  ]);
  Object.keys(statsToSave).forEach(k => {
    if ((k.startsWith('weekly_') || k.startsWith('monthly_')) && !keep.has(k)) {
      statsToSave[k] = deleteField();
    }
  });
  // undefined'larni tozalaymiz (deleteField sentinellariga tegmaydi)
  return stripUndefined(statsToSave);
};

export const AppProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [state, setState] = useState(buildDefaultState);
  const [cloudSynced, setCloudSynced] = useState(false);
  const prevUserRef = useRef(null);
  // Har doim joriy user qiymatini saqlaymiz (stale closure muammosini hal qilish uchun)
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ─── 1. Foydalanuvchi kirishi/chiqishida statistikani yuklash ───
  useEffect(() => {
    // Foydalanuvchi o'zgarganda (yoki chiqqanda) — darhol state tozalash
    const prevUid = prevUserRef.current;
    const newUid = user?.uid || null;

    if (prevUid !== newUid) {
      // Foydalanuvchi o'zgardi — darhol default state ga o'tkazish
      setState(buildDefaultState());
      setCloudSynced(false);
      prevUserRef.current = newUid;
    }

    if (!user) {
      return;
    }

    // Foydalanuvchi statistikasini Firestore'dan yuklash
    const loadUserStats = async () => {
      // Lokal zaxira UID bilan izolyatsiyalangan — faqat SHU foydalanuvchiniki bo'lishi mumkin
      const backup = loadLocalBackup(user.uid);
      try {
        const statRef = doc(db, 'userStats', user.uid);
        const snap = await getDoc(statRef);
        if (snap.exists()) {
          // Bulut + lokal zaxira: hisoblagichlar max() bo'yicha birlashtiriladi,
          // shunda bulutga yetib bormagan oxirgi sessiya natijalari yo'qolmaydi
          const data = mergeCloudAndLocal(snap.data(), backup);
          setState(() => ({
            ...buildDefaultState(),
            ...data,
            stats: data.stats || { chqbt: buildDefaultCatStats(), art: buildDefaultCatStats() },
            topicStats: data.topicStats || {},
            customMnemonics: data.customMnemonics || {},
            timeStats: data.timeStats || { totalTime: 0, totalQuestions: 0 }
          }));
        } else if (backup) {
          // Bulutda hujjat yo'q, lekin shu UID ning lokal zaxirasi bor — undan tiklash
          const { savedAt, ...localState } = backup;
          setState({ ...buildDefaultState(), ...localState });
        } else {
          // Yangi foydalanuvchi — toza holat bilan boshlash
          setState(buildDefaultState());
        }
      } catch (err) {
        console.error('Foydalanuvchi statistikasini yuklashda xatolik:', err);
        // Oflayn/xatolikda default o'rniga lokal zaxiradan tiklash
        if (backup) {
          const { savedAt, ...localState } = backup;
          setState({ ...buildDefaultState(), ...localState });
        } else {
          setState(buildDefaultState());
        }
      }
      setCloudSynced(true);
    };

    loadUserStats();
  }, [user]);

  // ─── 2. Statistika o'zgarganda Firestore'ga saqlash (DEBOUNCED) ───
  // Har o'zgarishda emas, 3 soniya kutib, oxirgi holatni bir marta yozadi.
  // Bu test paytida ~50 ta write o'rniga 2-3 ta write qiladi.
  const saveTimerRef = useRef(null);
  const flushSaveRef = useRef(null);

  useEffect(() => {
    if (!user || !cloudSynced) return;

    // User-ga tegishli localStorage ga saqlash (offline backup)
    // XAVFSIZLIK: kalit nomi user UID bilan izolyatsiya qilingan
    // savedAt — resetAt guard uchun (mergeCloudAndLocal)
    const userKey = getUserStateKey(user.uid);
    localStorage.setItem(userKey, JSON.stringify({ ...state, savedAt: Date.now() }));

    const writeNow = () => {
      saveTimerRef.current = null;
      const statRef = doc(db, 'userStats', user.uid);
      setDoc(statRef, prepareStatsForSave(state, user), { merge: true }).catch(console.error);
    };
    flushSaveRef.current = writeNow;

    // Firestore ga debounced yozish — 3 soniya kutib
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(writeNow, 3000);

    return () => clearTimeout(saveTimerRef.current);
  }, [state, user, cloudSynced]);

  // ─── 2b. Ilova yashirilganda kutilayotgan yozuvni DARHOL bajarish ───
  // Mobil PWA foydalanuvchilari ilovani 3 soniyalik debounce tugashidan
  // oldin yopadi — oxirgi natijalar yo'qolmasligi uchun flush qilamiz.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        flushSaveRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // ─── addScore ───
  const addScore = (points, topicId) => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();
      const newStreak = catStats.streak + 1;
      const newMaxStreak = Math.max(catStats.maxStreak, newStreak);

      const newTopicStats = { ...prev.topicStats };
      if (topicId >= 0) {
        const ts = newTopicStats[topicId] || { answered: 0, correct: 0 };
        newTopicStats[topicId] = { answered: ts.answered + 1, correct: ts.correct + 1 };
      }

      // Kunlik maqsad yangilanishi
      const today = new Date().toDateString();
      const dg = prev.dailyGoal?.date === today
        ? { ...prev.dailyGoal, answered: (prev.dailyGoal.answered || 0) + 1 }
        : { date: today, answered: 1, target: prev.dailyGoal?.target || 20, completed: false };
      if (!dg.completed && dg.answered >= dg.target) dg.completed = true;

      // Kunlik streak (+ bepul avtomatik muzlatish)
      const { dailyStreak, lastGoalDate, streakFreezes, streakFrozenDate } = advanceDailyStreak(prev, today, dg.completed);

      const weekId = getWeekId();
      const monthId = getMonthId();
      const currentWeeklyScore = prev[`weekly_${weekId}`] || 0;
      const currentMonthlyScore = prev[`monthly_${monthId}`] || 0;

      return {
        ...prev,
        totalScore: (prev.totalScore || 0) + points,
        [`weekly_${weekId}`]: currentWeeklyScore + points,
        [`monthly_${monthId}`]: currentMonthlyScore + points,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + 1,
        topicStats: newTopicStats,
        dailyGoal: dg,
        dailyStreak,
        lastGoalDate,
        streakFreezes,
        streakFrozenDate,
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            totalAnswered: catStats.totalAnswered + 1,
            totalCorrect: catStats.totalCorrect + 1,
            streak: newStreak,
            maxStreak: newMaxStreak
          }
        }
      };
    });
  };

  // ─── addMistake ───
  const addMistake = (topicId, question, correctOpt, opts) => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();

      const newTopicStats = { ...prev.topicStats };
      if (topicId >= 0) {
        const ts = newTopicStats[topicId] || { answered: 0, correct: 0 };
        newTopicStats[topicId] = { ...ts, answered: ts.answered + 1 };
      }

      const newMistakes = [...catStats.mistakes, {
        topic: topicId >= 0 ? TOPICS.find(t => t.id === topicId)?.name || 'Aralash' : 'Aralash',
        question,
        correct: correctOpt,
        opts: opts || []
      }];
      if (newMistakes.length > MAX_MISTAKES_SAVED) newMistakes.shift();

      const today = new Date().toDateString();
      const dg = prev.dailyGoal?.date === today
        ? { ...prev.dailyGoal, answered: (prev.dailyGoal.answered || 0) + 1 }
        : { date: today, answered: 1, target: prev.dailyGoal?.target || 20, completed: false };
      if (!dg.completed && dg.answered >= dg.target) dg.completed = true;

      const { dailyStreak, lastGoalDate, streakFreezes, streakFrozenDate } = advanceDailyStreak(prev, today, dg.completed);

      // SMART REVIEW: Spaced Repetition Logic
      const qHash = (question || '').substring(0, 100);
      let spacedCards = [...(prev.spacedCards || [])];
      const existingIdx = spacedCards.findIndex(c => c.qHash === qHash);

      if (existingIdx >= 0) {
        // Xato qilindi -> Level 0 ga tushadi va tezroq qaytadi
        spacedCards[existingIdx] = {
          ...spacedCards[existingIdx],
          level: 0,
          correctStreak: 0,
          nextReview: Date.now() + 10 * 60 * 1000, // 10 min keyin
          lastReview: Date.now(),
          difficulty: (spacedCards[existingIdx].difficulty || 1) + 1
        };
      } else {
        // Yangi xato savol
        spacedCards.push({
          qHash,
          q: question,
          opts: opts || [],
          correct: opts ? opts.findIndex(o => o === correctOpt) : 0,
          topicId,
          level: 0,
          correctStreak: 0,
          nextReview: Date.now(),
          lastReview: Date.now(),
          difficulty: 1
        });
      }
      if (spacedCards.length > 200) spacedCards = spacedCards.slice(-200);

      return {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        topicStats: newTopicStats,
        dailyGoal: dg,
        dailyStreak,
        lastGoalDate,
        streakFreezes,
        streakFrozenDate,
        spacedCards,
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            totalAnswered: catStats.totalAnswered + 1,
            streak: 0,
            mistakes: newMistakes
          }
        }
      };
    });
  };

  // ─── batchCommitResults: Test yakunida natijalarni BIR MARTA saqlash ───
  // TestPage test tugaganda addScore/addMistake o'rniga shu funksiyani chaqiradi.
  // Bu Firestore write'larni drastik kamaytiradi (50 write → 1 write).
  const batchCommitResults = (results) => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();

      // Topic stats yangilash
      const newTopicStats = { ...prev.topicStats };
      if (results.topicId >= 0) {
        const ts = newTopicStats[results.topicId] || { answered: 0, correct: 0 };
        newTopicStats[results.topicId] = {
          answered: ts.answered + results.totalAnswered,
          correct: ts.correct + results.correctCount
        };
      }

      // Xatolarni birlashtirish
      const newMistakes = [...catStats.mistakes, ...results.newMistakes];
      while (newMistakes.length > MAX_MISTAKES_SAVED) newMistakes.shift();

      // Kunlik maqsad
      const today = new Date().toDateString();
      const dg = prev.dailyGoal?.date === today
        ? { ...prev.dailyGoal, answered: (prev.dailyGoal.answered || 0) + results.totalAnswered }
        : { date: today, answered: results.totalAnswered, target: prev.dailyGoal?.target || 20, completed: false };
      if (!dg.completed && dg.answered >= dg.target) dg.completed = true;

      // Kunlik streak
      const { dailyStreak, lastGoalDate, streakFreezes, streakFrozenDate } = advanceDailyStreak(prev, today, dg.completed);

      // Streak
      const newStreak = results.wrongCount > 0 ? 0 : catStats.streak + results.correctCount;
      const newMaxStreak = Math.max(catStats.maxStreak, newStreak);

      // Vaqt statistikasi (Time Analytics)
      const sessionTime = results.sessionTime || 0;
      const sessionQuestions = results.totalAnswered || 0;
      const currentTimeStats = prev.timeStats || { totalTime: 0, totalQuestions: 0 };

      const weekId = getWeekId();
      const monthId = getMonthId();
      const currentWeeklyScore = prev[`weekly_${weekId}`] || 0;
      const currentMonthlyScore = prev[`monthly_${monthId}`] || 0;

      const newState = {
        ...prev,
        totalScore: (prev.totalScore || 0) + results.correctCount * 2,
        [`weekly_${weekId}`]: currentWeeklyScore + results.correctCount * 2,
        [`monthly_${monthId}`]: currentMonthlyScore + results.correctCount * 2,
        totalAnswered: prev.totalAnswered + results.totalAnswered,
        totalCorrect: prev.totalCorrect + results.correctCount,
        topicStats: newTopicStats,
        dailyGoal: dg,
        dailyStreak,
        lastGoalDate,
        streakFreezes,
        streakFrozenDate,
        spacedCards: results.updatedSpacedCards || prev.spacedCards,
        timeStats: {
          totalTime: currentTimeStats.totalTime + sessionTime,
          totalQuestions: currentTimeStats.totalQuestions + sessionQuestions
        },
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            totalAnswered: catStats.totalAnswered + results.totalAnswered,
            totalCorrect: catStats.totalCorrect + results.correctCount,
            streak: newStreak,
            maxStreak: newMaxStreak,
            mistakes: newMistakes
          }
        }
      };

      // Force immediate sync to Firestore — userRef orqali stale closure muammosi hal qilinadi
      setTimeout(() => {
        const currentUser = userRef.current;
        if (!currentUser) return;
        const statRef = doc(db, 'userStats', currentUser.uid);
        setDoc(statRef, prepareStatsForSave(newState, currentUser), { merge: true }).catch(err => {
          console.error('Natijalarni saqlashda xatolik:', err);
          showToast('Natijalar vaqtincha saqlanmadi. Internet aloqasini tekshiring.', 'error');
        });
      }, 100);

      return newState;
    });
  };

  // Shaxsiy mnemonika saqlash
  const saveCustomMnemonic = (qHash, text) => {
    setState(prev => ({
      ...prev,
      customMnemonics: {
        ...(prev.customMnemonics || {}),
        [qHash]: text
      }
    }));
  };

  // ─── Statistikani reset qilish ───
  const resetStats = async () => {
    // resetAt — boshqa qurilmadagi eski lokal zaxira resetni "bekor qilmasligi" uchun guard
    const fresh = { ...buildDefaultState(), resetAt: Date.now() };
    setState(fresh);
    if (user) {
      // User-specific localStorage ni tozalash
      localStorage.removeItem(getUserStateKey(user.uid));
      await setDoc(doc(db, 'userStats', user.uid), fresh, { merge: false });
    }
    showToast("Statistika tozalandi", 'info');
  };

  // ─── Xatolarni o'chirish va tozalash ───
  const deleteMistake = (questionText) => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();
      const newMistakes = catStats.mistakes.filter(m => m.question !== questionText);
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            mistakes: newMistakes
          }
        }
      };
    });
  };

  const clearMistakes = () => {
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [cat]: {
            ...catStats,
            mistakes: []
          }
        }
      };
    });
  };

  return (
    <AppContext.Provider value={{
      state,
      updateState,
      addScore,
      addMistake,
      batchCommitResults,
      resetStats,
      deleteMistake,
      clearMistakes,
      saveCustomMnemonic,
      cloudSynced
    }}>
      {children}
    </AppContext.Provider>
  );
};
