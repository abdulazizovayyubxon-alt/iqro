import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { MAX_MISTAKES_SAVED } from '../config';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import { reconcileAchievements, EXAM_MIN_QUESTIONS } from '../data/tracks';
import i18n from '../i18n';
import {
  doc,
  setDoc,
  getDoc,
  deleteField,
  collection,
  addDoc
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

// ── Ball tizimi ──────────────────────────────────────────────────────────
// Yangi savol to'g'ri — 2 ball; spaced repetition bo'yicha vaqti kelgan
// takror to'g'ri — 1 ball; vaqti kelmagan takror — 0 (farmingdan himoya);
// kunlik maqsad kunida birinchi marta bajarilganda — +5 bonus.
export const POINTS_NEW_CORRECT = 2;
export const POINTS_DUE_REVIEW = 1;
export const DAILY_GOAL_BONUS = 5;

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
    repetitionLimit: 0,
    timeStats: { totalTime: 0, totalQuestions: 0 },
    nightQuestions: 0,
    earlyQuestions: 0,
    perfectExamsCount: 0,
    examStreak90: 0,                        // ketma-ket 90%+ natijali testlar (sinov yo'nalishi)
    achievements: { ami: 0, unvonTier: 1, unvonSince: null, tracks: {} }, // akademik yutuqlar: daraja + unvon (tracks.js)
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

  ['totalScore', 'totalAnswered', 'totalCorrect', 'maxStreak', 'studyMinutes', 'dailyStreak', 'nightQuestions', 'earlyQuestions', 'perfectExamsCount', 'examStreak90']
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

  // Yutuqlar: daraja monoton (max), earnedAt esa eng birinchi sana saqlanadi
  const cTracks = cloud.achievements?.tracks || {};
  const lTracks = local.achievements?.tracks || {};
  const trackIds = new Set([...Object.keys(cTracks), ...Object.keys(lTracks)]);
  const mergedTracks = {};
  trackIds.forEach(id => {
    const c = cTracks[id] || {};
    const l = lTracks[id] || {};
    const earnedAt = {};
    new Set([...Object.keys(c.earnedAt || {}), ...Object.keys(l.earnedAt || {})]).forEach(lv => {
      const cv = (c.earnedAt || {})[lv];
      const lvv = (l.earnedAt || {})[lv];
      earnedAt[lv] = cv && lvv ? Math.min(cv, lvv) : (cv || lvv);
    });
    mergedTracks[id] = { tier: Math.max(c.tier || 0, l.tier || 0), earnedAt };
  });
  const cUnvonTier = cloud.achievements?.unvonTier || 1;
  const lUnvonTier = local.achievements?.unvonTier || 1;
  merged.achievements = {
    ami: Math.max(cloud.achievements?.ami || 0, local.achievements?.ami || 0),
    unvonTier: Math.max(cUnvonTier, lUnvonTier),
    unvonSince: cUnvonTier >= lUnvonTier ? (cloud.achievements?.unvonSince || null) : (local.achievements?.unvonSince || null),
    tracks: mergedTracks
  };

  return merged;
};

// Eski foydalanuvchi uchun jim backfill: mavjud statistikadan darajalarni hisoblab
// achievements'ni to'ldiradi. gained E'TIBORSIZ qoldiriladi — migratsiya paytida
// ilgari qozonilgan yutuqlar uchun bildirishnoma yog'ilib ketmasligi kerak.
const withAchievements = (stateObj) => {
  const { achievements } = reconcileAchievements(stateObj, stateObj.achievements);
  return { ...stateObj, achievements };
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
          setState(() => withAchievements({
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
          setState(withAchievements({ ...buildDefaultState(), ...localState }));
        } else {
          // Yangi foydalanuvchi — toza holat bilan boshlash
          setState(buildDefaultState());
        }
      } catch (err) {
        console.error('Foydalanuvchi statistikasini yuklashda xatolik:', err);
        // Oflayn/xatolikda default o'rniga lokal zaxiradan tiklash
        if (backup) {
          const { savedAt, ...localState } = backup;
          setState(withAchievements({ ...buildDefaultState(), ...localState }));
        } else {
          setState(buildDefaultState());
        }
      }
      setCloudSynced(true);
    };

    loadUserStats();
    // Faqat UID o'zgarganda (kirish/chiqish) qayta yuklaymiz — onAuthStateChanged
    // token yangilanishi yoki tab fokusi tufayli bir xil user uchun YANGI obyekt
    // qaytarishi mumkin. Butun `user` obyektiga bog'lansak, bu har safar
    // Firestore'dan qayta yozib, joriy testdagi topicId/testMode'ni (ular bulutga
    // saqlanmaydi) defaultga qaytarib, test yechilayotganda 1-bo'limga otib ketardi.
  }, [user?.uid]);

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

  const updateState = (updates) => setState(prev => {
    // Fan almashtirilganda tanlangan mavzuni tiklaymiz — eski fanning mavzu IDsi
    // yangi fanda mavjud bo'lmaydi va savollar bo'sh "Mavzu tayyorlanmoqda"
    // holatiga tushib qolardi. Agar chaqiruvchi topicId ni o'zi bersa (masalan
    // SmartBottomSheet), uni buzmaymiz.
    if (
      updates.activeCategory &&
      updates.activeCategory !== prev.activeCategory &&
      updates.topicId === undefined
    ) {
      return { ...prev, ...updates, topicId: -1 };
    }
    return { ...prev, ...updates };
  });

  // ─── batchCommitResults: Test yakunida natijalarni BIR MARTA saqlash ───
  // TestPage test tugaganda har savol uchun alohida emas, shu funksiyani bir marta
  // chaqiradi. Bu Firestore write'larni drastik kamaytiradi (50 write → 1 write).
  const batchCommitResults = (results) => {
    let snapshot = null;
    let earnedOut = 0; // UI ga qaytariladi ("+N ball" ko'rsatish uchun)
    let gainedOut = []; // shu sessiyada YANGI olingan track darajalari (kichik — faqat Bell)
    let gainedUnvonOut = null; // shu sessiyada unvon oshgan bo'lsa (katta — toast + Bell)
    let amiDeltaOut = 0; // shu sessiyada AMI necha ballga o'zgargani (natija ekrani uchun)
    setState(prev => {
      const cat = prev.activeCategory;
      const catStats = prev.stats[cat] || buildDefaultCatStats();

      // Topic stats yangilash — har mavzu o'z ulushi bo'yicha (aralash test/imtihonda
      // ham har bo'lim alohida hisoblanadi, summarizeTestResults'dagi topicDeltas orqali)
      const newTopicStats = { ...prev.topicStats };
      for (const [tid, delta] of Object.entries(results.topicDeltas || {})) {
        const ts = newTopicStats[tid] || { answered: 0, correct: 0 };
        newTopicStats[tid] = {
          answered: ts.answered + delta.answered,
          correct: ts.correct + delta.correct
        };
      }

      // Xatolarni birlashtirish
      const newMistakes = [...catStats.mistakes, ...results.newMistakes];
      while (newMistakes.length > MAX_MISTAKES_SAVED) newMistakes.shift();

      // Kunlik maqsad
      const today = new Date().toDateString();
      // Bonus uchun: maqsad bugun ALLAQACHON bajarilgan bo'lsa, qayta bonus berilmaydi
      const wasCompletedToday = prev.dailyGoal?.date === today && !!prev.dailyGoal?.completed;
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

      // Ball hisoblash: yangi savol — 2, vaqti kelgan takror — 1,
      // kunlik maqsad shu sessiyada birinchi marta bajarilsa — +5 bonus
      const goalBonus = dg.completed && !wasCompletedToday ? DAILY_GOAL_BONUS : 0;
      const earnedPoints =
        (results.newCorrectCount || 0) * POINTS_NEW_CORRECT +
        (results.dueReviewCorrectCount || 0) * POINTS_DUE_REVIEW +
        goalBonus;

      // Night owl / Early bird / Perfect exam metrics
      const currentHour = new Date().getHours();
      let nightQuestionsAdded = 0;
      let earlyQuestionsAdded = 0;
      if (currentHour >= 0 && currentHour < 5) {
        nightQuestionsAdded = results.totalAnswered || 0;
      } else if (currentHour >= 5 && currentHour < 8) {
        earlyQuestionsAdded = results.totalAnswered || 0;
      }
      let perfectExamAdded = 0;
      if (results.totalAnswered >= 20 && results.wrongCount === 0 && results.correctCount === results.totalAnswered) {
        perfectExamAdded = 1;
      }

      // Sinov yo'nalishi (tracks.js): 10+ savollik sessiya "imtihon" hisoblanadi.
      // 90%+ natija zanjirni davom ettiradi, undan past natija uzadi.
      let examStreak90 = prev.examStreak90 || 0;
      if ((results.totalAnswered || 0) >= EXAM_MIN_QUESTIONS) {
        examStreak90 = results.correctCount / results.totalAnswered >= 0.9 ? examStreak90 + 1 : 0;
      }

      const newState = {
        ...prev,
        totalScore: (prev.totalScore || 0) + earnedPoints,
        [`weekly_${weekId}`]: currentWeeklyScore + earnedPoints,
        [`monthly_${monthId}`]: currentMonthlyScore + earnedPoints,
        totalAnswered: prev.totalAnswered + results.totalAnswered,
        totalCorrect: prev.totalCorrect + results.correctCount,
        nightQuestions: (prev.nightQuestions || 0) + nightQuestionsAdded,
        earlyQuestions: (prev.earlyQuestions || 0) + earlyQuestionsAdded,
        perfectExamsCount: (prev.perfectExamsCount || 0) + perfectExamAdded,
        examStreak90,
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

      // Akademik darajalarni qayta baholash — yangi metrikalar asosida (sof hisob).
      // gained faqat capture qilinadi; bildirishnoma yon ta'siri updater TASHQARISIDA.
      const prevAmi = prev.achievements?.ami || 0;
      const { achievements, gained, gainedUnvon } = reconcileAchievements(newState, prev.achievements);
      newState.achievements = achievements;
      gainedOut = gained;
      gainedUnvonOut = gainedUnvon;
      amiDeltaOut = achievements.ami - prevAmi;

      snapshot = newState; // updater toza — faqat hisoblaydi va natijani capture qiladi
      earnedOut = earnedPoints;
      return newState;
    });

    // Yon ta'sir (Firestore yozuvi) setState updater'idan TASHQARIDA bajariladi —
    // React 18 StrictMode updater'ni ikki marta chaqirganda dublikat write bo'lmaydi.
    // Natija debounce kutmasdan darhol saqlanadi (test yakunida yo'qolmasligi uchun).
    if (!snapshot) return { earnedPoints: earnedOut, amiDelta: amiDeltaOut };
    const currentUser = userRef.current;
    if (!currentUser) return earnedOut;
    const statRef = doc(db, 'userStats', currentUser.uid);
    setDoc(statRef, prepareStatsForSave(snapshot, currentUser), { merge: true }).catch(err => {
      console.error('Natijalarni saqlashda xatolik:', err);
      showToast('Natijalar vaqtincha saqlanmadi. Internet aloqasini tekshiring.', 'error');
    });

    // Ikki darajali sokin bildirishnoma (achievements-tracks-v2 dizayni):
    // KICHIK (bitta yo'nalish tier'i oshdi) — faqat Bell'ga, toast YO'Q (chalg'itmaslik uchun).
    // KATTA (pasport unvoni o'zgardi) — toast + Bell, akademik/passiv ohangda.
    // addDoc xatosi asosiy oqimga ta'sir qilmaydi (masalan, rules hali deploy qilinmagan bo'lsa).
    if (gainedOut.length > 0) {
      gainedOut.forEach(g => {
        addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
          type: 'achievement',
          trackId: g.trackId,
          tier: g.tier,
          title: i18n.t('tracks.notifTitle'),
          message: i18n.t('tracks.notifBody', {
            track: i18n.t(`tracks.${g.trackId}.name`),
            tier: i18n.t(`tracks.tier${g.tier}`)
          }),
          date: new Date().toISOString(),
          read: false
        }).catch(err => console.warn('Yutuq bildirishnomasi yozilmadi:', err?.code || err));
      });
    }
    if (gainedUnvonOut) {
      const unvonLabel = i18n.t(`tracks.tier${gainedUnvonOut.tier}`);
      showToast(i18n.t('tracks.unvonToast', { unvon: unvonLabel }), 'success');
      addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        type: 'unvon',
        tier: gainedUnvonOut.tier,
        title: i18n.t('tracks.unvonNotifTitle'),
        message: i18n.t('tracks.unvonNotifBody', { unvon: unvonLabel }),
        date: new Date().toISOString(),
        read: false
      }).catch(err => console.warn('Unvon bildirishnomasi yozilmadi:', err?.code || err));
    }
    return { earnedPoints: earnedOut, amiDelta: amiDeltaOut };
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
