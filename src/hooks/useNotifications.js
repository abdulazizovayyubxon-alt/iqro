import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'IQRO_NOTIFICATIONS';
const DELETED_KEY = 'IQRO_NOTIFICATIONS_DELETED';

const DEFAULT_NOTIFS = () => ([
  { id: '1', title: '🎉 Toifa Pro platformasiga xush kelibsiz!', message: "CHQBT va San'at bo'limlarida bilimingizni oshiring. Barcha testlar tayyor!", date: new Date().toISOString(), read: false, type: 'success' },
  { id: '2', title: '🔥 Kunlik maqsadni unutmang', message: 'Har kuni kamida 20 ta savol yechib, olovli streak zanjirini davom ettiring!', date: new Date(Date.now() - 3600000).toISOString(), read: false, type: 'info' },
  { id: '3', title: '💡 Takrorlash tavsiya etiladi', message: "Takrorlash bo'limida siz xato qilgan savollar kutmoqda. Bilimingizni mustahkamlang!", date: new Date(Date.now() - 86400000).toISOString(), read: true, type: 'warning' }
]);

// O'chirilgan bildirishnoma ID'lari — Firestore ularni qayta tiklamasligi va
// standart bildirishnomalar qayta paydo bo'lmasligi uchun saqlanadi.
const loadDeleted = () => {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const saveDeleted = (set) => {
  localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
};

/**
 * Bildirishnomalar holati — localStorage + Firestore onSnapshot.
 * Header (faqat unreadCount) va ProfilePage (NotificationBell to'liq ro'yxat)
 * ikkalasi ham shu hook'dan foydalanadi. Header /profile sahifasida yashiringani
 * uchun bir vaqtda faqat bitta onSnapshot tinglovchisi ishlaydi.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    const deleted = loadDeleted();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).filter(n => !deleted.has(n.id)); }
      catch { /* buzilgan ma'lumot — standartdan foydalanamiz */ }
    }
    return DEFAULT_NOTIFS().filter(n => !deleted.has(n.id));
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const persist = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'notifications'), (notifSnap) => {
      try {
        const deleted = loadDeleted();
        const firestoreNotifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const relevantNotifs = firestoreNotifs.filter(n =>
          !n.targetUser && !n.userId
            ? true                                        // Umumiy bildirishnoma
            : n.targetUser === user?.uid                  // targetUser orqali
              || n.targetUser === 'all'
              || n.userId === user?.uid                   // referral bonus userId orqali
        ).filter(n => !deleted.has(n.id));                // o'chirilganlarni qayta tiklamaymiz

        setNotifications(prev => {
          const localMap = new Map(prev.map(item => [item.id, item]));

          relevantNotifs.forEach(fn => {
            const existing = localMap.get(fn.id);
            localMap.set(fn.id, { ...fn, read: existing ? existing.read : false });
          });

          const merged = Array.from(localMap.values())
            .filter(n => !deleted.has(n.id))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          persist(merged);
          return merged;
        });
      } catch (e) {
        console.error("Bildirishnomalarni yuklashda xatolik:", e);
      }
    }, (err) => {
      console.error("Notification snapshot xatosi:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
  };

  const markOneRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, read: true } : item);
      persist(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications(prev => {
      // Joriy ID'larni "o'chirilgan" ro'yxatiga qo'shamiz — shunda Firestore ham,
      // standart bildirishnomalar ham qayta paydo bo'lmaydi.
      const deleted = loadDeleted();
      prev.forEach(n => deleted.add(n.id));
      saveDeleted(deleted);
      persist([]);
      return [];
    });
  };

  return { notifications, unreadCount, markAllRead, markOneRead, clearAll };
}
