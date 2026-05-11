import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import { TOPICS } from '../data/mockData';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, updateDoc, doc, getDocs, writeBatch
} from "firebase/firestore";

export const ObjectionContext = createContext();

export const useObjections = () => useContext(ObjectionContext);

export const ObjectionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [objections, setObjections] = useState([]);
  const [sentObjectionIds, setSentObjectionIds] = useState([]);

  useEffect(() => {
    // LocalStorage dan oldingi yuborilgan e'tirozlarni yuklash
    const saved = localStorage.getItem('sentObjectionIds');
    if (saved) {
      try { setSentObjectionIds(JSON.parse(saved)); } catch (e) {}
    }

    const q = query(collection(db, "objections"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudObjections = snapshot.docs.map(d => ({
        ...d.data(),
        fbId: d.id,
        date: d.data().timestamp?.toDate()?.toLocaleString() || d.data().date
      }));

      setObjections(prevObjections => {
        // Yangi hal qilingan e'tirozlarni topish (faqat o'zimiz yuborganlarni tekshiramiz)
        const mySentIds = JSON.parse(localStorage.getItem('sentObjectionIds') || '[]');
        const solvedMine = cloudObjections.filter(obj => 
          obj.solved && mySentIds.includes(obj.id)
        );

        if (solvedMine.length > 0) {
          showToast(`✅ Siz yuborgan ${solvedMine.length} ta xato tuzatildi!`, 'success');
          // Ko'rsatilgandan keyin olib tashlaymiz
          const solvedIds = new Set(solvedMine.map(o => o.id));
          const newSentIds = mySentIds.filter(id => !solvedIds.has(id));
          setSentObjectionIds(newSentIds);
          localStorage.setItem('sentObjectionIds', JSON.stringify(newSentIds));
        }

        return cloudObjections;
      });
    }, (error) => {
      console.warn("Firebase objections sync error:", error);
    });
    
    return () => unsubscribe();
  }, [showToast]);

  const addObjection = async (topicId, category, questionObj, note) => {
    const topic = TOPICS.find(t => t.id === topicId);
    const newObjection = {
      id: Date.now(),
      uid: user?.uid || 'anonymous',
      userEmail: user?.email || '',
      userName: user?.displayName || '',
      topic: topic ? topic.name : "Aralash",
      topicId,
      category: category,
      question: questionObj.q || questionObj,
      options: questionObj.opts || [],
      correct: questionObj.opts ? questionObj.opts[questionObj.correct] : null,
      note,
      date: new Date().toLocaleString(),
      solved: false,
      timestamp: new Date()
    };

    const newSentIds = [...sentObjectionIds, newObjection.id];
    setSentObjectionIds(newSentIds);
    localStorage.setItem('sentObjectionIds', JSON.stringify(newSentIds));

    try {
      await addDoc(collection(db, "objections"), { ...newObjection, timestamp: new Date() });
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
