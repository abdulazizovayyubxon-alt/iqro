import React, { createContext, useState, useEffect, useContext } from 'react';
import { TOPICS } from '../data/mockData';
import { MAX_MISTAKES_SAVED } from '../config';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
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
  objections: [],
  sessionStart: Date.now(),
  studyMinutes: 0,
  activeCategory: 'chqbt',
  stats: {
    chqbt: buildDefaultCatStats(),
    art: buildDefaultCatStats()
  },
  sentObjectionIds: [],
  // Kunlik maqsad tizimi
  dailyGoal: {
    date: new Date().toDateString(),
    answered: 0,
    target: 20,
    completed: false
  },
  dailyStreak: 0,
  lastGoalDate: null,
  spacedCards: [] // Spaced Repetition uchun
});

export const AppProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [state, setState] = useState(buildDefaultState);
  const [toast, setToast] = useState(null);
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
          objections: prev.objections, // objectionlar alohida listener'da
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

  // ─── 2. Statistika o'zgarganda Firestore'ga saqlash ───
  useEffect(() => {
    if (!user || !cloudSynced) return;

    const statRef = doc(db, 'userStats', user.uid);
    const { objections, sentObjectionIds, ...statsToSave } = state;
    setDoc(statRef, statsToSave, { merge: true }).catch(console.error);

    // localStorage ga ham (offline backup)
    localStorage.setItem('iqro_state', JSON.stringify(state));
  }, [state, user, cloudSynced]);

  // ─── 3. E'tirozlar (Firebase real-time) ───
  useEffect(() => {
    const q = query(collection(db, "objections"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudObjections = snapshot.docs.map(d => ({
        ...d.data(),
        fbId: d.id,
        date: d.data().timestamp?.toDate()?.toLocaleString() || d.data().date
      }));

      setState(prev => {
        const mySentIds = prev.sentObjectionIds || [];
        const solvedMine = cloudObjections.filter(obj =>
          obj.solved && mySentIds.includes(obj.id)
        );
        if (solvedMine.length > 0) {
          showToast(`✅ Siz yuborgan ${solvedMine.length} ta xato tuzatildi!`, 'success');
          const solvedIds = new Set(solvedMine.map(o => o.id));
          return {
            ...prev,
            objections: cloudObjections,
            sentObjectionIds: mySentIds.filter(id => !solvedIds.has(id))
          };
        }
        return { ...prev, objections: cloudObjections };
      });
    }, (error) => {
      console.warn("Firebase objections sync error:", error);
    });
    return () => unsubscribe();
  }, []);

  // ─── Toast ───
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 5000);
  };

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

      // Kunlik maqsad yangilanishi (xato ham hisobga olinadi)
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

      // Spaced Repetition — xato savolni spacedCards ga qo'shish
      const qHash = (question || '').substring(0, 60);
      let spacedCards = [...(prev.spacedCards || [])];
      const existingIdx = spacedCards.findIndex(c => c.qHash === qHash);
      if (existingIdx >= 0) {
        // Mavjud — level ni 0 ga qaytarish
        spacedCards[existingIdx] = {
          ...spacedCards[existingIdx],
          level: 0,
          correctStreak: 0,
          nextReview: Date.now() + 10 * 60 * 1000, // 10 daqiqadan keyin
          lastReview: Date.now()
        };
      } else {
        // Yangi qo'shish
        spacedCards.push({
          qHash,
          q: question,
          opts: opts || [],
          correct: opts ? opts.indexOf(correctOpt) : 0,
          explanation: '',
          topicId,
          level: 0,
          correctStreak: 0,
          nextReview: Date.now() + 10 * 60 * 1000,
          lastReview: Date.now()
        });
        // Max 100 ta saqlash
        if (spacedCards.length > 100) spacedCards = spacedCards.slice(-100);
      }

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

  // ─── addObjection ───
  const addObjection = async (topicId, questionObj, note) => {
    const topic = TOPICS.find(t => t.id === topicId);
    const newObjection = {
      id: Date.now(),
      uid: user?.uid || 'anonymous',
      userEmail: user?.email || '',
      userName: user?.displayName || '',
      topic: topic ? topic.name : "Aralash",
      topicId,
      category: state.activeCategory,
      question: questionObj.q || questionObj,
      options: questionObj.opts || [],
      correct: questionObj.opts ? questionObj.opts[questionObj.correct] : null,
      note,
      date: new Date().toLocaleString(),
      solved: false,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      objections: [...prev.objections, newObjection],
      sentObjectionIds: [...(prev.sentObjectionIds || []), newObjection.id]
    }));

    try {
      await addDoc(collection(db, "objections"), { ...newObjection, timestamp: new Date() });
    } catch (err) {
      console.error("Firebase write error:", err);
    }
  };

  // ─── clearObjections ───
  const clearObjections = async () => {
    setState(prev => ({ ...prev, objections: [] }));
    try {
      const q = query(collection(db, "objections"));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) { console.error(err); }
  };

  // ─── solveObjection ───
  const solveObjection = async (fbId) => {
    if (!fbId) return;
    try {
      await updateDoc(doc(db, "objections", fbId), { solved: true });
      showToast("Savol tuzatilgan deb belgilandi! ✅");
    } catch (err) { console.error(err); }
    setState(prev => ({
      ...prev,
      objections: prev.objections.map(o => o.fbId === fbId ? { ...o, solved: true } : o)
    }));
  };

  // ─── deleteObjection ───
  const deleteObjection = async (fbId) => {
    if (!fbId) return;
    try {
      await deleteDoc(doc(db, "objections", fbId));
      showToast("E'tiroz o'chirildi", "info");
    } catch (err) { console.error(err); }
    setState(prev => ({
      ...prev,
      objections: prev.objections.filter(o => o.fbId !== fbId)
    }));
  };

  // ─── importObjections ───
  const importObjections = (newObjections) => {
    if (!Array.isArray(newObjections)) return;
    setState(prev => {
      const existingIds = new Set(prev.objections.map(o => o.id));
      const filtered = newObjections.filter(o => !existingIds.has(o.id));
      return { ...prev, objections: [...prev.objections, ...filtered] };
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
      addObjection,
      clearObjections,
      solveObjection,
      deleteObjection,
      importObjections,
      resetStats,
      toast,
      showToast,
      cloudSynced
    }}>
      {children}
    </AppContext.Provider>
  );
};
