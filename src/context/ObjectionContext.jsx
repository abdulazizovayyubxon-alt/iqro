import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import { TOPICS } from '../data/mockData';
import { AnalyticsEvents } from '../services/analytics';
import {
  collection,
  addDoc, deleteDoc, updateDoc, doc
} from "firebase/firestore";

export const ObjectionContext = createContext();

export const useObjections = () => useContext(ObjectionContext);

export const ObjectionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [objections, setObjections] = useState([]);

  const uid = user?.uid || null;

  useEffect(() => {
    if (!uid) {
      setObjections([]);
    }
  }, [uid]);

  const addObjection = async (topicId, category, questionObj, note, reason = 'other') => {
    if (!user) return false;

    const topic = TOPICS.find(t => t.id === topicId);
    const newObjection = {
      id: Date.now(),
      uid: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || '',
      topic: topic ? topic.name : "Aralash",
      topicId,
      category: category,
      questionId: questionObj?.id ?? null,
      question: questionObj.q || questionObj,
      options: questionObj.opts || [],
      correct: questionObj.opts ? questionObj.opts[questionObj.correct] : null,
      image: questionObj?.image || questionObj?.imageUrl || null,
      note,
      reason,
      status: 'new',
      date: new Date().toLocaleString(),
      solved: false,
      timestamp: new Date()
    };

    try {
      await addDoc(collection(db, "objections"), { ...newObjection, timestamp: new Date() });
      AnalyticsEvents.objectionSubmit(newObjection.topic);
      return true;
    } catch (err) {
      console.error("Firebase write error:", err);
      showToast?.("E'tiroz yuborilmadi. Internet aloqasini tekshiring.", 'error');
      return false;
    }
  };

  const clearObjections = async () => {
    setObjections([]);
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
