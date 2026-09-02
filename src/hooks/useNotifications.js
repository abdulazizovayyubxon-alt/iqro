import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { getSettings } from '../utils/settingsCache';
import { reconcileAnnouncements, ANNOUNCEMENTS_ID } from '../utils/announcements';

// ⚠️ AUDIT 2026-09-02 (3), B-2 — KALITLAR HISOBGA BOG'LANDI.
//
// Ilgari bular GLOBAL edi ('IQRO_NOTIFICATIONS'), `logout()` esa ularni
// tozalamasdi. Umumiy qurilmada (maktab, oila telefoni) A chiqib B kirganda
// B **A ning shaxsiy bildirishnomalarini** ko'rardi: admin bir kishiga
// yuborgan xabarlar (to'lov eslatmasi, e'tirozga javob, obuna holati) va
// yutuq / marra / unvon yozuvlari. `DELETED_KEY` ham o'tib, A yopgan
// bildirishnomalar B da ham yashirin qolardi.
//
// Bu tahdid modeli loyihada ALLAQACHON tan olingan va imtihon sessiyasi
// uchun yopilgan (ExamPage.jsx:361, audit 2026-08-06 T-21) — qo'ng'iroq
// o'sha qamrovga kirmay qolgan edi.
//
// Kursor allaqachon bog'langan edi, u naqsh sifatida olindi.
const STORAGE_KEY = (uid) => `IQRO_NOTIFICATIONS_${uid}`;
const DELETED_KEY = (uid) => `IQRO_NOTIFICATIONS_DELETED_${uid}`;
const CURSOR_KEY = (uid) => `zehin_notif_cursor_${uid}`;

// Eski global kalitlar — faqat bir martalik tozalash uchun (pastga qarang).
const LEGACY_STORAGE_KEY = 'IQRO_NOTIFICATIONS';
const LEGACY_DELETED_KEY = 'IQRO_NOTIFICATIONS_DELETED';

// ════════════════════════════════════════════════════════════════════════════
//  O'QISH BYUDJETI — bu hook butun ilovadagi eng qimmat mijoz kodi edi
// ════════════════════════════════════════════════════════════════════════════
//
// AVVAL: ikkita `onSnapshot`, har biri `limit(30)`. Ikkalasi ham HAR ilova
// ochilishida boshidan o'qilardi — seansiga 60 tagacha hujjat. Firestore keshi
// ataylab XOTIRADA (`firebase.js` izohiga qarang), shuning uchun keshdan
// yordam yo'q: har seans to'liq to'lanadi. Qolgan butun ilova ~8 o'qish edi,
// ya'ni sarfning ~88% i shu qo'ng'iroqqa ketardi.
//
// ENDI ikkala manba ham QO'SHIMCHA (incremental) o'qiladi:
//
//   1) UMUMIY E'LONLAR — `settings/announcements` surati (1 o'qish, seans
//      keshida). Admin panel uni qo'shimcha o'qishsiz yozadi
//      (`utils/announcements.js`). Suratdan KEYIN qo'shilganlar jonli
//      tinglovchi bilan keladi: `where('date','>', surat.updatedAt)` —
//      odatda 0 hujjat.
//
//   2) SHAXSIY BILDIRISHNOMALAR — `users/{uid}/notifications` faqat
//      QO'SHILADI (yutuq, marra, unvon, cron eslatmalari, to'lov bonusi);
//      hech kim eskisini tahrirlamaydi. Shuning uchun lokal kursordan
//      keyingilarigina so'raladi: `where('date','>', kursor)` — odatda 0.
//
// Ro'yxatning O'ZI localStorage'da turadi, ya'ni tarix yo'qolmaydi va
// qo'ng'iroq oflayn ham to'la ko'rinadi.
//
// NARXI: seansiga ~60 → ~3 o'qish (bo'sh so'rov ham 1 o'qish deb sanaladi).
//
// ⚠️ CHEGARA — bilib turib qabul qilingan: surat yozilgandan keyin ESKI
// e'lonning matni tahrirlansa yoki u o'chirilsa, o'zgarish shu qurilmaga
// admin keyingi marta suratni yangilaganda yetadi. Yangi e'lon esa DARHOL
// keladi. Shaxsiy bildirishnomalarda bu chegara umuman yo'q — ular
// o'zgarmaydi.
const NOTIF_LIMIT = 30;

// Lokal ro'yxat cheksiz o'smasin (localStorage kvotasi ~5 MB).
// Qo'ng'iroqda 30 tadan ortig'i baribir ko'rinmaydi; zaxira sifatida 60.
const KEEP_LOCAL = 60;

// ⚠️ STANDART BILDIRISHNOMALAR OLIB TASHLANDI.
//
// Bu yerda uchta soxta xabar turardi («Xush kelibsiz», «Kunlik maqsadni
// unutmang», «Takrorlash tavsiya etiladi») va ular HAR yangi o'rnatishda
// o'qilmagan holatda paydo bo'lardi. Sanalari ham qalbaki edi: `new Date()`
// va `Date.now() - 3600000` — ya'ni xabar «bir soat oldin kelgan» ko'rinardi,
// aslida esa hozir yaratilgan edi.
//
// NEGA ZARAR: qo'ng'iroq birinchi ochilishdanoq «3» ni ko'rsatardi, ichida
// esa hech qanday yangilik yo'q edi. Bu foydalanuvchini qo'ng'iroqni
// E'TIBORSIZ QOLDIRISHGA o'rgatadi. Keyinchalik haqiqiy signal — yutuq,
// unvon, zanjir xavfi, obuna tugashi — o'sha o'rgangan e'tiborsizlikka
// uriladi va kanal qiymatini yo'qotadi.
//
// Endi qo'ng'iroq faqat HAQIQIY voqea bo'lganda yonadi: global e'lonlar
// (admin yozadi) va shaxsiy bildirishnomalar (yutuq/marra/unvon/obuna).
// Bo'sh ro'yxat — to'g'ri holat, xato emas.
const DEFAULT_NOTIFS = () => [];

// O'chirilgan bildirishnoma ID'lari — Firestore ularni qayta tiklamasligi va
// standart bildirishnomalar qayta paydo bo'lmasligi uchun saqlanadi.
const loadDeleted = (uid) => {
  if (!uid) return new Set();
  try {
    const raw = localStorage.getItem(DELETED_KEY(uid));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const saveDeleted = (uid, set) => {
  if (!uid) return;
  try { localStorage.setItem(DELETED_KEY(uid), JSON.stringify([...set])); }
  catch { /* private rejim yoki kvota — ro'yxat baribir Firestore'dan tiklanadi */ }
};

/** Hisobga bog'langan ro'yxatni o'qish. */
const readStored = (uid) => {
  if (!uid) return [];
  const deleted = loadDeleted(uid);
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    if (raw) return JSON.parse(raw).filter(n => n?.id && !deleted.has(n.id));
  } catch { /* buzilgan ma'lumot — bo'shdan boshlaymiz */ }
  return [];
};

const persist = (uid, list) => {
  if (!uid) return;
  try { localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(list)); }
  catch { /* private rejim yoki kvota — qo'ng'iroq shu seansda baribir ishlaydi */ }
};

// ── Eski GLOBAL kalitlarni bir martalik tozalash (B-2 migratsiyasi) ──
//
// Global ro'yxat KIMGA tegishli ekanini bilib bo'lmaydi: u shu qurilmada
// oxirgi ishlagan odamniki. Shuning uchun uni yangi kalitga KO'CHIRMAYMIZ —
// aynan shu ko'chirish yopilayotgan teshikni ochiq qoldirardi.
//
// O'chirish evaziga egasi tarixini yo'qotmasin deb, o'sha hisobning KURSORI
// ham nolga tushiriladi: shaxsiy bildirishnomalar Firestore'dan qaytadan
// o'qiladi (`users/{uid}/notifications`, ko'pi bilan 30 hujjat, BIR MARTA) va
// ular AYNAN shu hisobniki bo'ladi. Umumiy e'lonlar suratdan baribir keladi.
let legacyPurged = false;
const purgeLegacyStorage = (uid) => {
  if (legacyPurged || !uid) return;
  try {
    const hadLegacy = localStorage.getItem(LEGACY_STORAGE_KEY) !== null
      || localStorage.getItem(LEGACY_DELETED_KEY) !== null;
    if (!hadLegacy) { legacyPurged = true; return; }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DELETED_KEY);
    localStorage.removeItem(CURSOR_KEY(uid));
    legacyPurged = true;
  } catch { /* private rejim — eski kalit ham yo'q, tozalash shart emas */ }
};

// Shaxsiy bildirishnomalar kursori — «shu sanagacha bo'lganini ko'rganman».
const readCursor = (uid) => {
  try { return localStorage.getItem(CURSOR_KEY(uid)) || null; } catch { return null; }
};
const writeCursor = (uid, date) => {
  if (!date) return;
  try {
    const prev = readCursor(uid);
    // Faqat OLDINGA suriladi: kech kelgan javob kursorni orqaga tortmasin.
    if (!prev || date > prev) localStorage.setItem(CURSOR_KEY(uid), date);
  } catch { /* private rejim — keyingi seansda to'liq o'qiladi, zarari yo'q */ }
};

const newestDate = (list) =>
  list.reduce((max, n) => (n?.date && (!max || n.date > max) ? n.date : max), null);

const toItem = (d) => ({ id: d.id, ...d.data() });

// ── Umumiy e'lonlarning boshlang'ich yuklanishi ─────────────────────────────
//
// MODUL DARAJASIDA MEMOIZATSIYA QILINADI. Sabab: bu hook bir vaqtda IKKI
// joyda ishlaydi (Header'dagi hisoblagich va ProfileDrawer ichidagi
// NotificationBell). Surat hujjati bor bo'lsa `getSettings` ni o'zi keshlaydi,
// lekin surat HALI YO'Q bo'lgan holatda (admin panelni birinchi marta
// ochmagunicha) pastdagi zaxira yo'l 30 ta hujjat o'qiydi — va u ikki marta
// bajarilardi. Va'da qilingan promise bitta bo'lgani uchun endi bir marta.
let globalBootstrap = null;

const loadGlobalAnnouncements = () => {
  if (globalBootstrap) return globalBootstrap;
  globalBootstrap = (async () => {
    const agg = await getSettings(ANNOUNCEMENTS_ID, { scope: 'session', ttlMs: null });
    if (agg && Array.isArray(agg.items)) {
      // Langar — suratning yozilgan vaqti: undan keyingilarigina alohida
      // o'qiladi. `updatedAt` yo'q bo'lsa eng yangi element sanasi ishlaydi.
      // `fromSnapshot` — A-1 uchun: solishtirish FAQAT surat rostdan
      // o'qilganda bajariladi. Migratsiya yo'lida (surat yo'q) ro'yxat
      // to'liq emas, unga qarab hech narsa o'chirib bo'lmaydi.
      return {
        items: agg.items,
        anchor: agg.updatedAt || newestDate(agg.items),
        fromSnapshot: true,
      };
    }
    // Surat hali yo'q — bir martalik to'liq o'qish (migratsiya yo'li).
    try {
      const snap = await getDocs(query(
        collection(db, 'notifications'),
        orderBy('date', 'desc'),
        limit(NOTIF_LIMIT),
      ));
      const items = snap.docs.map(toItem);
      return { items, anchor: newestDate(items), fromSnapshot: false };
    } catch (e) {
      console.warn('Elonlarni yuklashda xato:', e?.code || e?.message || e);
      return { items: [], anchor: null, fromSnapshot: false };
    }
  })();
  return globalBootstrap;
};

/**
 * Bildirishnomalar holati — localStorage + Firestore (qo'shimcha o'qish).
 * Header (faqat unreadCount) va NotificationBell (to'liq ro'yxat) ikkalasi ham
 * shu hook'dan foydalanadi. Ikkita nusxa bir vaqtda ishlasa ham Firestore SDK
 * bir xil so'rovni bitta tinglovchiga birlashtiradi — qo'shimcha o'qish yo'q.
 */
export function useNotifications() {
  const { user } = useAuth();
  // B-2: ro'yxat endi HISOBGA bog'langan, shuning uchun uni boshlang'ich
  // qiymatda o'qib bo'lmaydi — o'sha paytda `user` hali null bo'lishi mumkin.
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFS);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Hisob aniqlanganda O'SHA hisobning ro'yxatini yuklaymiz ──
  // Chiqishda (uid = null) ro'yxat BO'SHAYDI — keyingi foydalanuvchi
  // oldingisining bildirishnomalarini ko'rmaydi. Bu B-2 tuzatishining
  // asosiy qatori; `logout()` dagi tozalash unga qo'shimcha himoya.
  // Bu effekt quyidagi Firestore effektidan OLDIN turishi shart: u holat
  // asosini qo'yadi, quyidagisi ustiga qo'shadi.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) { setNotifications(DEFAULT_NOTIFS()); return; }
    purgeLegacyStorage(uid);
    setNotifications(readStored(uid));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const uid = user.uid;

    // Umumiy e'lon HAMMAGA tegishli; eski yozuvlarda esa targetUser/userId
    // uchrashi mumkin — o'shalar faqat egasiga ko'rsatiladi.
    const isMine = (n) =>
      (!n.targetUser && !n.userId)
      || n.targetUser === 'all'
      || n.targetUser === uid
      || n.userId === uid;

    // Ikkala manbadan kelgan bildirishnomalarni lokal holatga singdirish
    // `src` — element QAYSI kanaldan kelgani: 'global' (ochiq `notifications`
    // + surat) yoki 'personal' (`users/{uid}/notifications`). A-1 solishtirishi
    // shunga tayanadi: shaxsiy bildirishnomalarda `targetUser`/`userId`
    // maydonlari YO'Q, ya'ni ularni shakl bo'yicha ajratib bo'lmaydi.
    const absorb = (incoming, src) => {
      const deleted = loadDeleted(uid);
      const fresh = incoming.filter(n => n?.id && !deleted.has(n.id));
      if (fresh.length === 0) return;
      setNotifications(prev => {
        const localMap = new Map(prev.map(item => [item.id, item]));
        fresh.forEach(fn => {
          const existing = localMap.get(fn.id);
          localMap.set(fn.id, { ...fn, src, read: existing ? existing.read : false });
        });
        const merged = Array.from(localMap.values())
          .filter(n => !deleted.has(n.id))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, KEEP_LOCAL);
        persist(uid, merged);
        return merged;
      });
    };

    let cancelled = false;
    const unsubs = [];

    // ── 1) UMUMIY E'LONLAR ────────────────────────────────────────────────
    const startGlobal = async () => {
      const { items, anchor, fromSnapshot } = await loadGlobalAnnouncements();
      if (cancelled) return;

      // ⚠️ A-1 — ADMIN O'CHIRGAN E'LONNI OLIB TASHLASH. Solishtirish
      // `absorb` dan OLDIN: shu tartibda hali suratda turgan element
      // darhol qaytib qo'shiladi va ekranda miltillash bo'lmaydi.
      // Qaysi elementga tegish MUMKIN emasligi — `utils/announcements.js`.
      if (fromSnapshot) {
        setNotifications(prev => {
          const next = reconcileAnnouncements(prev, items, anchor);
          if (next === prev) return prev;   // o'zgarish yo'q — yozuv ham qilmaymiz
          persist(uid, next);
          return next;
        });
      }

      absorb(items.filter(isMine), 'global');

      // Suratdan (yoki oxirgi ma'lum e'londan) KEYIN qo'shilganlar — jonli.
      // Langar yo'q bo'lsa (kolleksiya bo'sh) oddiy limitli so'rov ishlaydi.
      const qGlobal = anchor
        ? query(
          collection(db, 'notifications'),
          where('date', '>', anchor),
          orderBy('date', 'desc'),
          limit(NOTIF_LIMIT),
        )
        : query(collection(db, 'notifications'), orderBy('date', 'desc'), limit(NOTIF_LIMIT));

      unsubs.push(onSnapshot(qGlobal, (snap) => {
        absorb(snap.docs.map(toItem).filter(isMine), 'global');
      }, (err) => {
        console.error('Elon tinglovchisi xatosi:', err?.code || err);
      }));
    };

    startGlobal();

    // ── 2) SHAXSIY BILDIRISHNOMALAR ───────────────────────────────────────
    // Kursor bor bo'lsa — faqat undan keyingilari (odatda 0 hujjat).
    // Kursor yo'q (yangi qurilma / birinchi kirish) — bir martalik 30 ta.
    const cursor = readCursor(uid);
    const personalRef = collection(db, 'users', uid, 'notifications');
    const qPersonal = cursor
      ? query(personalRef, where('date', '>', cursor), orderBy('date', 'desc'), limit(NOTIF_LIMIT))
      : query(personalRef, orderBy('date', 'desc'), limit(NOTIF_LIMIT));

    unsubs.push(onSnapshot(qPersonal, (snap) => {
      const items = snap.docs.map(toItem);
      absorb(items, 'personal');
      // Kursor ABSORB'dan keyin suriladi: hujjat lokal ro'yxatga tushgach
      // «ko'rilgan» deb belgilanadi, aks holda u yo'qolib qolardi.
      writeCursor(uid, newestDate(items));
    }, (err) => {
      // Rules hali deploy qilinmagan bo'lsa permission-denied bo'ladi
      console.warn('Shaxsiy bildirishnoma tinglovchisi xatosi:', err?.code || err);
    }));

    return () => {
      cancelled = true;
      unsubs.forEach(u => u());
    };
    // Bog'liqlik `user` EMAS, `user?.uid` — AuthContext token yangilanishida yoki
    // tab fokusida bir xil foydalanuvchi uchun YANGI obyekt qaytaradi
    // (setUser(enhancedUser)). `user` ga bog'lansak, har safar tinglovchilar
    // uzilib qayta ulanardi → kolleksiyalar boshidan qayta o'qilardi (bekorga
    // o'qish). AppContext.jsx:484 da ham xuddi shu sabab bilan `user?.uid`.
  }, [user?.uid]);

  const uid = user?.uid;

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(uid, updated);
      return updated;
    });
  };

  const markOneRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, read: true } : item);
      persist(uid, updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications(prev => {
      // Joriy ID'larni "o'chirilgan" ro'yxatiga qo'shamiz — shunda Firestore ham,
      // standart bildirishnomalar ham qayta paydo bo'lmaydi.
      const deleted = loadDeleted(uid);
      prev.forEach(n => deleted.add(n.id));
      saveDeleted(uid, deleted);
      persist(uid, []);
      return [];
    });
  };

  return { notifications, unreadCount, markAllRead, markOneRead, clearAll };
}
