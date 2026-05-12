import React, { createContext, useState, useEffect, useContext } from 'react';
import { TOPICS } from '../data/mockData';
import { MAX_MISTAKES_SAVED } from '../config';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  writeBatch,
  getDocs,
  updateDoc,
  setDoc,
  getDoc
} from "firebase/firestore";

export const AppContext = createContext();

const buildDefaultCatStats = () => ({
  totalAnswered: 0,
  totalCorrect: 0,
  streak: 0,
  maxStreak: 0,
  mistakes: []
});

const buildDefaultState = () => ({
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
  spacedCards: []
});

export const AppProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [state, setState] = useState(buildDefaultState);
  const [cloudSynced, setCloudSynced] = useState(false);

  // ─── 1. Foydalanuvchi kirishi/chiqishida statistikani yuklash ───
  useEffect(() => {
    if (!user) {
      // Tizimdan chiqqanda default state
      setState(buildDefaultState());
      setCloudSynced(false);
      return;
    }

    // Foydalanuvchi statistikasini Firestore'dan yuklash
    const loadUserStats = async () => {
      const statRef = doc(db, 'userStats', user.uid);
      const snap = await getDoc(statRef);
      if (snap.exists()) {
        const data = snap.data();
        setState(prev => ({
          ...buildDefaultState(),
          ...data,
          stats: data.stats || { chqbt: buildDefaultCatStats(), art: buildDefaultCatStats() },
          topicStats: data.topicStats || {}
        }));
      } else {
        // Yangi foydalanuvchi — localStorage'dagi eski ma'lumotni Firestore'ga ko'chiramiz (migration)
        const oldSaved = localStorage.getItem('iqro_state') || localStorage.getItem('chqbt_state');
        if (oldSaved) {
          try {
            const parsed = JSON.parse(oldSaved);
            const migratedState = {
              ...buildDefaultState(),
              ...parsed,
              stats: parsed.stats || { chqbt: buildDefaultCatStats(), art: buildDefaultCatStats() }
            };
            setState(migratedState);
            await setDoc(statRef, migratedState);
            showToast("Eski ma'lumotlar bulutga ko'chirildi ☁️", 'info');
          } catch (e) {}
        }
      }
      setCloudSynced(true);
    };

    loadUserStats();
  }, [user]);

  // ─── 2. Statistika o'zgarganda Firestore'ga saqlash (DEBOUNCED) ───
  // Har o'zgarishda emas, 3 soniya kutib, oxirgi holatni bir marta yozadi.
  // Bu test paytida ~50 ta write o'rniga 2-3 ta write qiladi.
  const saveTimerRef = React.useRef(null);

  useEffect(() => {
    if (!user || !cloudSynced) return;

    // localStorage ga darhol saqlash (offline backup — bu bepul)
    localStorage.setItem('iqro_state', JSON.stringify(state));

    // Firestore ga debounced yozish — 3 soniya kutib
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const statRef = doc(db, 'userStats', user.uid);
      const statsToSave = { ...state };
      // Leaderboard uchun foydalanuvchi ma'lumotlarini ham saqlash
      const currentName = user.displayName || state.displayName || '';
      statsToSave.displayName = currentName;
      statsToSave.userName = currentName;
      statsToSave.photoURL = user.photoURL || state.photoURL || null;
      // topicId va testMode ni saqlamaymiz (navigatsiya uchun vaqtinchalik)
      delete statsToSave.topicId;
      delete statsToSave.testMode;

      setDoc(statRef, statsToSave, { merge: true }).catch(console.error);
    }, 3000);

    return () => clearTimeout(saveTimerRef.current);
  }, [state, user, cloudSynced]);

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

      // Kunlik streak
      let dailyStreak = prev.dailyStreak || 0;
      let lastGoalDate = prev.lastGoalDate;
      if (dg.completed && lastGoalDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastGoalDate === yesterday.toDateString()) {
          dailyStreak += 1;
        } else if (lastGoalDate !== today) {
          dailyStreak = 1;
        }
        lastGoalDate = today;
      }

      return {
        ...prev,
        totalScore: (prev.totalScore || 0) + points,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + 1,
        topicStats: newTopicStats,
        dailyGoal: dg,
        dailyStreak,
        lastGoalDate,
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

      let dailyStreak = prev.dailyStreak || 0;
      let lastGoalDate = prev.lastGoalDate;
      if (dg.completed && lastGoalDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastGoalDate === yesterday.toDateString()) dailyStreak += 1;
        else if (lastGoalDate !== today) dailyStreak = 1;
        lastGoalDate = today;
      }

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
      let dailyStreak = prev.dailyStreak || 0;
      let lastGoalDate = prev.lastGoalDate;
      if (dg.completed && lastGoalDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastGoalDate === yesterday.toDateString()) dailyStreak += 1;
        else if (lastGoalDate !== today) dailyStreak = 1;
        lastGoalDate = today;
      }

      // Streak
      const newStreak = results.wrongCount > 0 ? 0 : catStats.streak + results.correctCount;
      const newMaxStreak = Math.max(catStats.maxStreak, newStreak);

      return {
        ...prev,
        totalScore: (prev.totalScore || 0) + results.correctCount * 2,
        totalAnswered: prev.totalAnswered + results.totalAnswered,
        totalCorrect: prev.totalCorrect + results.correctCount,
        topicStats: newTopicStats,
        dailyGoal: dg,
        dailyStreak,
        lastGoalDate,
        spacedCards: results.updatedSpacedCards || prev.spacedCards,
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
    });
  };

  // ─── Statistikani reset qilish ───
  const resetStats = async () => {
    const fresh = buildDefaultState();
    setState(fresh);
    if (user) {
      await setDoc(doc(db, 'userStats', user.uid), fresh, { merge: false });
    }
    showToast("Statistika tozalandi", 'info');
  };

  return (
    <AppContext.Provider value={{
      state,
      updateState,
      addScore,
      addMistake,
      batchCommitResults,
      resetStats,
      cloudSynced
    }}>
      {children}
    </AppContext.Provider>
  );
};
