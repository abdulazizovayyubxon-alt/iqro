import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import { TOPICS } from '../data/mockData';
import { AnalyticsEvents } from '../services/analytics';
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, updateDoc, doc, getDocs, writeBatch
} from "firebase/firestore";

export const ObjectionContext = createContext();

export const useObjections = () => useContext(ObjectionContext);

// ────────────────────────────────────────────────────────
// XAVFSIZ localStorage kalit — foydalanuvchiga bog'langan
// ────────────────────────────────────────────────────────
const getSentObjectionKey = (uid) => `sentObjectionIds_${uid}`;

export const ObjectionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [objections, setObjections] = useState([]);
  const [sentObjectionIds, setSentObjectionIds] = useState([]);

  // Foydalanuvchi o'zgarganda sentObjectionIds ni yuklash
  useEffect(() => {
    if (!user) {
      // Tizimdan chiqqanda — tozalash
      setObjections([]);
      setSentObjectionIds([]);
      return;
    }

    // Foydalanuvchiga tegishli yuborilgan e'tirozlar ID larini yuklash
    const key = getSentObjectionKey(user.uid);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setSentObjectionIds(JSON.parse(saved));
      } else {
        setSentObjectionIds([]);
      }
    } catch (e) {
      setSentObjectionIds([]);
    }
  }, [user]);

  // Firestore real-time e'tirozlarni kuzatish
  useEffect(() => {
    if (!user) return;

    // Faqat O'Z e'tirozlari (firestore.rules: oddiy user boshqasinikini o'qiy olmaydi).
    // Yagona maqsad — "siz yuborgan xato tuzatildi" bildirishnomasi; tartib shart emas.
    const q = query(collection(db, "objections"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudObjections = snapshot.docs.map(d => ({
        ...d.data(),
        fbId: d.id,
        date: d.data().timestamp?.toDate()?.toLocaleString() || d.data().date
      }));

      setObjections(() => {
        // Yangi hal qilingan e'tirozlarni topish (faqat o'zimiz yuborganlarni tekshiramiz)
        const key = getSentObjectionKey(user.uid);
        let mySentIds = [];
        try { mySentIds = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* buzilgan format — e'tiborsiz */ }

        const solvedMine = cloudObjections.filter(obj =>
          obj.solved && mySentIds.includes(obj.id)
        );

        if (solvedMine.length > 0) {
          showToast(`✅ Siz yuborgan ${solvedMine.length} ta xato tuzatildi!`, 'success');
          // Ko'rsatilgandan keyin olib tashlaymiz
          const solvedIds = new Set(solvedMine.map(o => o.id));
          const newSentIds = mySentIds.filter(id => !solvedIds.has(id));
          setSentObjectionIds(newSentIds);
          localStorage.setItem(key, JSON.stringify(newSentIds));
        }

        return cloudObjections;
      });
    }, (error) => {
      console.warn("Firebase objections sync error:", error);
    });

    return () => unsubscribe();
  }, [user, showToast]);

  const addObjection = async (topicId, category, questionObj, note, reason = 'other') => {
    if (!user) return;

    const topic = TOPICS.find(t => t.id === topicId);
    const newObjection = {
      id: Date.now(),
      uid: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || '',
      topic: topic ? topic.name : "Aralash",
      topicId,
      category: category,
      // ⚠️ ADMIN UX AUDIT 2026-08-18 — ILDIZ SABAB (M-1, M-2, M-4, A-1, K-3).
      //
      // Ilgari shu yerda savolning identifikatori TASHLAB YUBORILARDI:
      // e'tirozda faqat MATN qolardi. Oqibati zanjir bo'lib tarqalardi —
      // admin e'tirozdan savolga o'ta olmasdi (buning uchun butun bazani,
      // ~47 000 o'qishni yuklash kerak edi), bitta savol haqidagi takroriy
      // shikoyatlar birlashmasdi, savol darajasidagi xato statistikasini
      // esa umuman qurib bo'lmasdi.
      //
      // Zanjirning qolgan bo'g'ini ALLAQACHON butun edi: savollar
      // { id: d.id, ...d.data() } bo'lib yuklanadi (AdminPage.jsx:1037),
      // paketga JSON.stringify bilan identifikatori bilan birga tushadi
      // (AdminPage.jsx:1930) va shu funksiyaga to'liq obyekt bo'lib keladi.
      // Ya'ni kerak bo'lgani — uni tashlamaslik.
      //
      // null qiymati — takror navbati kartasi kabi identifikatorsiz manbadan
      // kelgan holat. Admin panel bunday e'tirozni eski, matn bo'yicha
      // usulda ishlaydi (AdminPage: resolveObjectionQuestion).
      questionId: questionObj?.id ?? null,
      question: questionObj.q || questionObj,
      options: questionObj.opts || [],
      correct: questionObj.opts ? questionObj.opts[questionObj.correct] : null,
      note,
      // Triaj (M-3): admin shikoyat turini filtrlay olsin. Eski yozuvlarda
      // bu maydon yo'q — admin panel ularni 'other' deb ko'rsatadi.
      reason,
      status: 'new',
      date: new Date().toLocaleString(),
      solved: false,
      timestamp: new Date()
    };

    // Foydalanuvchiga tegishli localStorage ga saqlash
    const key = getSentObjectionKey(user.uid);
    const newSentIds = [...sentObjectionIds, newObjection.id];
    setSentObjectionIds(newSentIds);
    localStorage.setItem(key, JSON.stringify(newSentIds));

    try {
      await addDoc(collection(db, "objections"), { ...newObjection, timestamp: new Date() });
      AnalyticsEvents.objectionSubmit(newObjection.topic);
    } catch (err) {
      console.error("Firebase write error:", err);
    }
  };

  const clearObjections = async () => {
    setObjections([]);
    try {
      const q = query(collection(db, "objections"));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) { console.error(err); }
  };

  const solveObjection = async (fbId) => {
    if (!fbId) return;
    try {
      await updateDoc(doc(db, "objections", fbId), { solved: true });
      showToast("Savol tuzatilgan deb belgilandi! ✅");
    } catch (err) { console.error(err); }
  };

  const deleteObjection = async (fbId) => {
    if (!fbId) return;
    try {
      await deleteDoc(doc(db, "objections", fbId));
      showToast("E'tiroz o'chirildi", "info");
    } catch (err) { console.error(err); }
  };

  const importObjections = (newObjections) => {
    if (!Array.isArray(newObjections)) return;
    // Real-time listener handles the UI update if we just write to db. 
    // Wait, the previous importObjections just added to local state.
    // Let's keep it simple and just do what it did, or write them to db.
    // If we write to DB, it triggers onSnapshot.
    newObjections.forEach(obj => {
      addDoc(collection(db, "objections"), { ...obj, fbId: undefined, timestamp: new Date() }).catch(console.error);
    });
  };

  const updateObjectionNote = async (fbId, newNote) => {
    if (!fbId || !newNote.trim()) return;
    try {
      await updateDoc(doc(db, "objections", fbId), { note: newNote.trim() });
      showToast("E'tiroz yangilandi ✏️", 'success');
    } catch (err) { console.error(err); }
  };

  return (
    <ObjectionContext.Provider value={{
      objections,
      addObjection,
      clearObjections,
      solveObjection,
      deleteObjection,
      importObjections,
      updateObjectionNote
    }}>
      {children}
    </ObjectionContext.Provider>
  );
};
