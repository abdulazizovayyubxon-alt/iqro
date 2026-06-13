import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const DEFAULT_NOTIFS = () => ([
  { id: '1', title: '🎉 IQRO Platformasiga xush kelibsiz!', message: "CHQBT va San'at bo'limlarida bilimingizni oshiring. Barcha testlar tayyor!", date: new Date().toISOString(), read: false, type: 'success' },
  { id: '2', title: '🔥 Kunlik maqsadni unutmang', message: 'Har kuni kamida 20 ta savol yechib, olovli streak zanjirini davom ettiring!', date: new Date(Date.now() - 3600000).toISOString(), read: false, type: 'info' },
  { id: '3', title: '💡 Takrorlash tavsiya etiladi', message: "Takrorlash bo'limida siz xato qilgan savollar kutmoqda. Bilimingizni mustahkamlang!", date: new Date(Date.now() - 86400000).toISOString(), read: true, type: 'warning' }
]);

/**
 * Bildirishnomalar holati — localStorage + Firestore onSnapshot.
 * Header (faqat unreadCount) va ProfilePage (NotificationBell to'liq ro'yxat)
 * ikkalasi ham shu hook'dan foydalanadi. Header /profile sahifasida yashiringani
 * uchun bir vaqtda faqat bitta onSnapshot tinglovchisi ishlaydi.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('IQRO_NOTIFICATIONS');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_NOTIFS();
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'notifications'), (notifSnap) => {
      try {
        const firestoreNotifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const relevantNotifs = firestoreNotifs.filter(n =>
          !n.targetUser && !n.userId
            ? true                                        // Umumiy bildirishnoma
            : n.targetUser === user?.uid                  // targetUser orqali
              || n.targetUser === 'all'
              || n.userId === user?.uid                   // referral bonus userId orqali
        );

        setNotifications(prev => {
          const localMap = new Map(prev.map(item => [item.id, item]));

          relevantNotifs.forEach(fn => {
            if (localMap.has(fn.id)) {
              const existing = localMap.get(fn.id);
              localMap.set(fn.id, { ...fn, read: existing.read });
            } else {
              localMap.set(fn.id, { ...fn, read: false });
            }
          });

          const merged = Array.from(localMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
          localStorage.setItem('IQRO_NOTIFICATIONS', JSON.stringify(merged));
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
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('IQRO_NOTIFICATIONS', JSON.stringify(updated));
  };

  const markOneRead = (id) => {
    const updated = notifications.map(item => item.id === id ? { ...item, read: true } : item);
    setNotifications(updated);
    localStorage.setItem('IQRO_NOTIFICATIONS', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem('IQRO_NOTIFICATIONS');
  };

  return { notifications, unreadCount, markAllRead, markOneRead, clearAll };
}
