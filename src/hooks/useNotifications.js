import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const STORAGE_KEY = 'IQRO_NOTIFICATIONS';
const DELETED_KEY = 'IQRO_NOTIFICATIONS_DELETED';

// O'QISH BYUDJETI: har ikkala kolleksiya ham cheksiz o'sadi (admin e'lonlari
// yillar davomida, shaxsiy subkolleksiyaga esa cron-daily har kuni yozadi).
// Limitsiz onSnapshot = har foydalanuvchi ilovani ochganda BUTUN kolleksiyani
// o'qiydi → 1000 foydalanuvchi × N hujjat. Bell'da 30 tadan ortig'i baribir
// ko'rinmaydi, shuning uchun eng yangi 30 ta bilan cheklaymiz.
// Barcha yozuvchilar `date` ni ISO satr sifatida qo'yadi (AdminPage,
// AppContext, api/cron-daily, api/payment-webhook) — orderBy hujjat yo'qotmaydi.
const NOTIF_LIMIT = 30;

const DEFAULT_NOTIFS = () => ([
  { id: '1', title: '🎉 Zehin platformasiga xush kelibsiz!', message: "CHQBT va San'at bo'limlarida bilimingizni oshiring. Barcha testlar tayyor!", date: new Date().toISOString(), read: false, type: 'success' },
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

    // Ikkala manbadan kelgan bildirishnomalarni lokal holatga singdirish
    const absorb = (incoming) => {
      const deleted = loadDeleted();
      const fresh = incoming.filter(n => !deleted.has(n.id));
      setNotifications(prev => {
        const localMap = new Map(prev.map(item => [item.id, item]));
        fresh.forEach(fn => {
          const existing = localMap.get(fn.id);
          localMap.set(fn.id, { ...fn, read: existing ? existing.read : false });
        });
        const merged = Array.from(localMap.values())
          .filter(n => !deleted.has(n.id))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        persist(merged);
        return merged;
      });
    };

    // 1) Global e'lonlar (admin yozadi)
    const qGlobal = query(
      collection(db, 'notifications'),
      orderBy('date', 'desc'),
      limit(NOTIF_LIMIT)
    );
    const unsubGlobal = onSnapshot(qGlobal, (notifSnap) => {
      try {
        const firestoreNotifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        absorb(firestoreNotifs.filter(n =>
          !n.targetUser && !n.userId
            ? true                                        // Umumiy bildirishnoma
            : n.targetUser === user?.uid                  // targetUser orqali
              || n.targetUser === 'all'
              || n.userId === user?.uid                   // referral bonus userId orqali
        ));
      } catch (e) {
        console.error("Bildirishnomalarni yuklashda xatolik:", e);
      }
    }, (err) => {
      console.error("Notification snapshot xatosi:", err);
    });

    // 2) Shaxsiy bildirishnomalar (yutuqlar) — users/{uid}/notifications
    const qPersonal = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('date', 'desc'),
      limit(NOTIF_LIMIT)
    );
    const unsubPersonal = onSnapshot(qPersonal, (snap) => {
      try {
        absorb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Shaxsiy bildirishnomalarni yuklashda xatolik:", e);
      }
    }, (err) => {
      // Rules hali deploy qilinmagan bo'lsa permission-denied bo'ladi — ilova ishlashda davom etadi
      console.warn("Shaxsiy notification snapshot xatosi:", err?.code || err);
    });

    return () => { unsubGlobal(); unsubPersonal(); };
    // Bog'liqlik `user` EMAS, `user?.uid` — AuthContext token yangilanishida yoki
    // tab fokusida bir xil foydalanuvchi uchun YANGI obyekt qaytaradi
    // (setUser(enhancedUser)). `user` ga bog'lansak, har safar ikkala tinglovchi
    // uzilib qayta ulanardi → kolleksiyalar boshidan qayta o'qilardi (bekorga
    // o'qish). AppContext.jsx:484 da ham xuddi shu sabab bilan `user?.uid`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

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
