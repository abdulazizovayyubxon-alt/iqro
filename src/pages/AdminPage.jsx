import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { db, auth } from '../firebase';
import { invalidateSettings } from '../utils/settingsCache';
import { buildAnnouncementItems, publishAnnouncements } from '../utils/announcements';
import {
  collection, query, orderBy, onSnapshot, where, getCountFromServer,
  updateDoc, deleteDoc, doc, getDoc, getDocs, addDoc, writeBatch, increment, setDoc, limit, documentId,
  runTransaction, startAfter, Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// storage faqat shu sahifada kerak (lazy route) — default app'dan olamiz.
// Bu firebase.js'dan eager eksport qilinmaydi → dastlabki yuklanish yengilroq.
const storage = getStorage();
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, MessageCircle, Users, BarChart3,
  CheckCircle, Trash2, AlertTriangle,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Plus, Edit3, FileText, Zap,
  Bell, Send, CheckCircle2, AlertCircle, Info, ArrowLeft, UploadCloud,
  Download, Crown, Database, RefreshCw, Inbox, School, CreditCard, Ticket, X,
  Activity, Sparkles, MoreVertical, KeyRound, Copy, CalendarDays
} from 'lucide-react';

import './AdminPage.css';
import PromoTab from '../components/admin/PromoTab';
import SchoolsTab from '../components/admin/SchoolsTab';
import PartnerSetsTab from '../components/admin/PartnerSetsTab';
import FixQuestionModal, { REASON_LABELS } from '../components/admin/FixQuestionModal';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { normalizeText, trigrams, jaccard } from '../utils/textSimilarity';
// A-1: shubhali savol diagnozi. AdminPage test qilib bo'lmaydigan hajmda,
// shuning uchun mantiq alohida, testlanadigan modulda turadi.
import {
  diagnoseQuestion, SUSP_MIN_SHOWN, SUSP_MIN_WRONG_RATE, SUSP_SCAN_LIMIT, SUSP_TOP,
} from '../utils/questionDiagnosis';
// K-3: dublikatni 47 000 o'qishsiz topish uchun.
import { qHashOf, normalizeQuestion } from '../utils/qHash';
// K-5: yuklashdan oldin siqish — 4 MB lik skrinshot butun bazaga tarqalmasin.
import { compressImage } from '../utils/compressImage';
import {
  logAdminAction, describeAdminAction, formatActionMeta, ADMIN_ACTION_GROUPS,
} from '../services/adminLog';
import { useModalA11y } from '../hooks/useModalA11y';
// Foydalanuvchi qidiruvi ALOHIDA modulda va testga olingan (utils/userSearch.js):
// aynan bu mantiq jimgina buzilib, mavjud odamni "bazada yo'q" ko'rsatgan edi.
import { matchesUserSearch } from '../utils/userSearch';
// 2026-08-20: «Xatolik yuz berdi» xabari sababni yashirib, adminni bir necha
// soat noto'g'ri joyda qidirishga majbur qildi (haqiqiy sabab — kvota tugashi).
import { describeFirebaseError, withWriteTimeout } from '../utils/firebaseError';
import ConfirmDialog from '../components/shared/ConfirmDialog';

// Ro'yxatlar uchun yagona chegara. `users`/`referrals` ilgari CHEGARASIZ
// o'qilardi (A-15): panelga bir kirish = kolleksiyadagi hujjat soni qadar
// o'qish. Spark kunlik limiti 50 000 — 5 000 foydalanuvchida bu bir seansda
// kvotaning 10% i. Aniq odamni topish uchun sahifalash emas, SERVER tomonda
// qidiruv ishlatiladi (`searchUsersOnServer`).
const LIST_PAGE_SIZE = 200;

// ── Foydalanuvchilar ro'yxati uchun ALOHIDA chegara (2026-08-20) ─────────
//
// MUAMMO: `LIST_PAGE_SIZE = 200` bo'lganda bazadagi ~390 hisobning ~190 tasi
// ro'yxatga TUSHMASDI. Ism bo'yicha qidiruv esa faqat yuklangan ro'yxat
// ichida ishlaydi (`filteredUsers`), server qidiruvida ism bo'yicha so'rov
// esa umuman yo'q edi — natijada admin "Omonov" deb qidirib «mavjud emas»
// javobini olardi, holbuki bazada uchta Omonov bor edi.
//
// NEGA 200 → 500, va nega bu KVOTAGA ZARAR QILMAYDI:
//   · Bepul (Spark) reja kuniga 50 000 o'qish beradi.
//   · ~390 hisobni to'liq yuklash = ~390 o'qish = kunlik kvotaning 0,8% i
//     (200 ta yuklash 0,4% edi — farq atigi +192 o'qish).
//   · Solishtirish uchun: «Savollar bazasi»ni bir bosish 47 000 o'qish.
//   · Ustiga sessiya keshi qo'shildi (`readUserCache`), ya'ni panelni bir
//     sessiya ichida qayta-qayta ochish QO'SHIMCHA o'qish qilmaydi.
//
// ⚠️ Bu chegara ATAYLAB bazadan katta qilib olindi: baza 500 dan oshgan
// kunda mijozdagi qidiruv yana "yarim ko'r" bo'lib qoladi. O'sha holat
// UI'da ochiq ogohlantirish bilan ko'rsatiladi (`usersTruncated`) va
// «Bazadan qidirish» server so'rovi shunda ASOSIY yo'lga aylanadi.
// Baza ~2 000 dan oshsa, to'g'ri yechim — `users` hujjatlariga qidiruv
// uchun prefiks-token maydoni qo'shib, `array-contains` bilan izlash.
const USER_PAGE_SIZE = 500;

// Foydalanuvchi ro'yxatining sessiya keshi. `sessionStorage` ATAYLAB
// (`localStorage` emas): ro'yxatda shaxsiy ma'lumot bor — u diskda uzoq
// yashamasligi, tab yopilishi bilan o'chishi kerak.
const USER_CACHE_KEY = 'iqro_admin_users_cache';
const USER_CACHE_TTL = 10 * 60 * 1000; // 10 daqiqa — yangi ro'yxatdan o'tganlar juda kechikmasin

// Jurnal bir bosqichda shuncha yozuv o'qiydi. Kichik saqlanadi: jurnalga kirish
// odatiy hol bo'lishi kerak, lekin har kirish 200 ta o'qish bo'lsa, kuzatuvning
// o'zi kvota muammosiga aylanadi. Davomi «Ko'proq» tugmasi bilan keladi.
const JOURNAL_PAGE_SIZE = 60;

// ── Sessiya keshi (kvotani tejash) ──────────────────────────────────────
// Panelni qayta ochish/yangilash har safar butun ro'yxatni o'qimasligi uchun
// ro'yxat 10 daqiqa `sessionStorage`da yashaydi. Kesh buzilgan/eskirgan
// bo'lsa jimgina tashlab yuboriladi — kesh HECH QACHON ma'lumotni
// ko'rsatmaslikka sabab bo'lmasligi kerak.
//
// ⚠️ JSON keshning nozik joyi: Firestore `Timestamp` obyekti `JSON.stringify`
// dan `{seconds, nanoseconds}` bo'lib chiqadi, ya'ni `.toDate()` metodini
// YO'QOTADI. Keshdan kelgan ro'yxat tirik ro'yxatdan farq qilib qolmasligi
// uchun bunday obyektlar qayta `Timestamp`ga aylantiriladi — aks holda
// `createdAt.toDate()` chaqirilgan joyda sana «—» bo'lib ko'rinardi.
const reviveTimestamps = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(reviveTimestamps);
  if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number'
      && Object.keys(obj).every(k => ['seconds', 'nanoseconds', 'type'].includes(k))) {
    return new Timestamp(obj.seconds, obj.nanoseconds);
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = reviveTimestamps(v);
  return out;
};

const readUserCache = () => {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const { at, list } = JSON.parse(raw);
    if (!Array.isArray(list) || !at || Date.now() - at > USER_CACHE_TTL) return null;
    return list.map(reviveTimestamps);
  } catch { return null; }
};

const writeUserCache = (list) => {
  // sessionStorage kvotasi to'lib qolishi (yoki private rejim) yuklashni
  // BUZMASLIGI kerak — shuning uchun xato jimgina yutiladi.
  try {
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify({ at: Date.now(), list }));
  } catch { /* kesh — qulaylik, majburiyat emas */ }
};

const clearUserCache = () => {
  try { sessionStorage.removeItem(USER_CACHE_KEY); } catch { /* ahamiyatsiz */ }
};

// Yaqin-dublikat chegarasi (0..1). Yuqori = faqat juda o'xshashlar (matching/sequence soxta-ijobiyni kamaytiradi).
const DUP_SIM_THRESHOLD = 0.87;

// Bir marta tahlil qilinadigan maksimal savol soni (T-19). Bundan katta hajmda
// trigram indeksi xotirani portlatadi — admin avval fan filtrini tanlashi kerak.
const DUP_MAX_POOL = 8000;

// User-Agent satridan qisqa o'qiladigan nom chiqaradi ("Samsung Internet 30 · Android").
// Xatolarni tahlil qilishda eng kerakli ma'lumot — bu brauzer/OS: xatolarning
// ko'pchiligi aynan bitta muhitga bog'liq bo'lib chiqadi.
const prettyUA = (ua) => {
  if (!ua) return null;
  const ver = (re) => { const m = ua.match(re); return m ? m[1].split('.')[0] : ''; };
  let browser = 'Noma\'lum brauzer';
  if (/SamsungBrowser/.test(ua))            browser = `Samsung Internet ${ver(/SamsungBrowser\/([\d.]+)/)}`;
  else if (/Edg\//.test(ua))                browser = `Edge ${ver(/Edg\/([\d.]+)/)}`;
  else if (/OPR\/|Opera/.test(ua))          browser = `Opera ${ver(/OPR\/([\d.]+)/)}`;
  else if (/Firefox\//.test(ua))            browser = `Firefox ${ver(/Firefox\/([\d.]+)/)}`;
  else if (/Chrome\//.test(ua))             browser = `Chrome ${ver(/Chrome\/([\d.]+)/)}`;
  else if (/Version\/.*Safari/.test(ua))    browser = `Safari ${ver(/Version\/([\d.]+)/)}`;

  let os = '';
  if (/iPhone|iPad/.test(ua))      os = `iOS ${(ua.match(/OS (\d+)[_\d]*/) || [])[1] || ''}`.trim();
  else if (/Android/.test(ua))     os = 'Android';
  else if (/Windows/.test(ua))     os = 'Windows';
  else if (/Mac OS X/.test(ua))    os = 'macOS';
  return os ? `${browser.trim()} · ${os}` : browser.trim();
};

// Xato kartasida uid o'rniga o'qiladigan identifikator chiqaramiz.
// Login modeli telefon+parol (email — soxta `<telefon>@iqro.uz`), shuning uchun
// telefon eng foydali belgi; soxta email'dan telefon qismini ajratib olamiz.
const userLabel = (u) => {
  if (!u) return null;
  const phone = u.phoneNumber || u.phone
    || (typeof u.email === 'string' && u.email.endsWith('@iqro.uz') ? u.email.split('@')[0] : '');
  const email = typeof u.email === 'string' && !u.email.endsWith('@iqro.uz') ? u.email : '';
  const parts = [u.displayName, phone || email].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
};

// ⚠️ ADMIN AUDIT 2026-08-06, A-14 BAND — tahrirlash formasi ilgari `{...q}`
// bilan to'ldirilardi. Firestore hujjatlari `{ id: d.id, ...d.data() }`
// ko'rinishida yuklanadi, ya'ni `id` ham formaga tushardi va saqlashda
// `updateDoc(..., { id: '<docId>' })` sifatida HUJJAT ICHIGA qaytib yozilardi.
// Zarar cheklangan (rules faqat topicId/category ni tekshiradi), lekin har
// tahrirlangan savol ortiqcha maydon olardi va bu zaxira JSON hamda import
// formatiga oqib o'tardi. Endi faqat tahrirlanadigan maydonlar ko'chiriladi.
const toEditableQuestion = (q) => ({
  q: q.q || '',
  opts: Array.isArray(q.opts) && q.opts.length ? [...q.opts] : ['', '', '', ''],
  correct: Number.isInteger(q.correct) ? q.correct : 0,
  topicId: q.topicId ?? 0,
  explanation: q.explanation || '',
  mnemonic: q.mnemonic || '',
  image: q.image || '',
});

const getCategoryFromTopicId = (topicId) => {
  const idNum = parseInt(topicId);
  const topicObj = TOPICS.find(t => t.id === idNum);
  return topicObj ? topicObj.category : 'chqbt';
};

// `users/{uid}.subject` DOIM fan `id` sini saqlaydi (nomini emas) — yozuvchi
// ikkita joy bor va ikkalasi ham `SUBJECTS[].id` beradi:
// OnboardingPage.jsx:366 va EditProfileModal.jsx:82. Shu sabab aggregatsiya
// so'rovlarini to'g'ridan-to'g'ri `id` bo'yicha yuritsa bo'ladi.
const SUBJECT_NAMES = Object.fromEntries(SUBJECTS.map(s => [s.id, s.name]));
const subjectName = (id) => (id ? (SUBJECT_NAMES[id] || id) : null);

// EditProfileModal.jsx:16 dagi TOIFALAR bilan bir xil lug'at. ATAYLAB nusxa:
// o'sha fayldan import qilish butun profil modalini (DateInput, i18n va h.k.)
// admin bandliga tortib kelardi — bu yerda kerak bo'lgani atigi 5 ta yorliq.
const TOIFA_NAMES = {
  mutaxassis: 'Mutaxassis',
  ikkinchi: 'Ikkinchi toifa',
  birinchi: 'Birinchi toifa',
  oliy: 'Oliy toifa',
  sertifikat: 'Kasbiy sertifikat',
};

const AdminPage = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [tab, setTab] = useState('objections'); // objections | requests | questions | users | stats | tariffs | notifications | referrals | promos | errors

  // ── Kuzatuv: client xatolari (errorLogs) ──
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorsShowResolved, setErrorsShowResolved] = useState(false); // hal qilinganlarni ko'rsatish
  const [errorUsers, setErrorUsers] = useState({}); // uid -> users/{uid} hujjati
  const [errorsError, setErrorsError] = useState(null);
  const loadErrorLogs = () => {
    setErrorsLoading(true);
    setErrorsError(null);
    getDocs(query(collection(db, 'errorLogs'), orderBy('ts', 'desc'), limit(100)))
      .then(async snap => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setErrorLogs(logs);

        // uid'larni ismga aylantirish uchun users hujjatlarini olamiz.
        // FAQAT noyob uid'lar va 30 talik bo'laklarda (`in` filtri chegarasi) —
        // 100 ta log bo'lsa ham bu ko'pi bilan bir nechta so'rov, o'qish kvotasi
        // behuda sarflanmaydi.
        const uids = [...new Set(logs.map(l => l.uid).filter(Boolean))];
        if (!uids.length) { setErrorUsers({}); return; }
        const map = {};
        for (let i = 0; i < uids.length; i += 30) {
          const chunk = uids.slice(i, i + 30);
          const us = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
          us.docs.forEach(d => { map[d.id] = d.data(); });
        }
        setErrorUsers(map);
      })
      .catch(e => {
        // Ilgari xato faqat `console.error` ga tushardi — admin bo'sh ro'yxatni
        // ko'rib "xato yo'q" deb o'ylardi (A-3/D-5).
        console.error('errorLogs load:', e);
        setErrorsError(e?.message || 'Yuklashda xatolik');
      })
      .finally(() => setErrorsLoading(false));
  };
  // ⚠️ JURNAL AUDITI 2026-08-15: bu tugma yagona QAYTARILMAS amal edi, lekin
  // (a) tasdiq so'ramasdi — telefonda ✅ va 🗑 yonma-yon, xato bosish oson;
  // (b) hech qayerda qayd etilmasdi — ya'ni kuzatuv yozuvini bir bosishda
  // izsiz yo'q qilish mumkin edi. Jurnalning o'zini tozalash ham jurnalga
  // tushishi kerak, aks holda audit izi ishonchsiz.
  const deleteErrorLog = (id) => {
    const target = errorLogs.find(e => e.id === id);
    confirmAction("Bu xato yozuvini butunlay o'chirasizmi? (Odatda «hal qilindi» belgilash yetarli)", async () => {
      try {
        await deleteDoc(doc(db, 'errorLogs', id));
        setErrorLogs(prev => prev.filter(e => e.id !== id));
        logAdminAction('log.delete', id, { xabar: (target?.message || '').slice(0, 80) });
      } catch (e) {
        showToast("O'chirishda xato", 'error');
      }
    });
  };
  // `resolved` maydoni /api/log-error tomonidan false bilan yoziladi — shu
  // yergacha hech qayerda ishlatilmasdi. Endi "hal qilindi" belgisi bilan
  // bog'landi: bir marta ko'rib chiqilgan xato ro'yxatdan yashiriladi,
  // lekin o'chirilmaydi (takrorlanishini kuzatish uchun kerak).
  const toggleErrorResolved = async (id, next) => {
    try {
      await updateDoc(doc(db, 'errorLogs', id), { resolved: next });
      setErrorLogs(prev => prev.map(e => (e.id === id ? { ...e, resolved: next } : e)));
    } catch (e) {
      showToast('Belgilashda xato', 'error');
    }
  };
  // A-16: ilgari kesh guard'i yo'q edi — tablar orasida har almashishda 100 ta
  // log + uid'lar bo'yicha `in` so'rovlari qayta o'qilardi. Yangilash tugmasi
  // allaqachon bor, demak avtomatik qayta o'qishning ma'nosi yo'q.
  useEffect(() => {
    if (!isAdmin || tab !== 'journal') return;
    if (errorLogs.length > 0 || errorsError) return;
    loadErrorLogs();
  }, [tab, isAdmin]);

  const visibleErrorLogs = errorsShowResolved ? errorLogs : errorLogs.filter(e => !e.resolved);
  const unresolvedErrorCount = errorLogs.filter(e => !e.resolved).length;

  // ── Admin harakatlari jurnali (B-5) ──
  // «Jurnal» tabi ichida ikkinchi ko'rinish: client xatolari va admin amallari
  // bir xil turdagi ma'lumot (kuzatuv), shuning uchun 12-tab ochilmadi —
  // telefonda tab qatori allaqachon siqiq.
  const [journalView, setJournalView] = useState('errors'); // errors | actions
  const [adminActions, setAdminActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState(null);
  const [actionsCursor, setActionsCursor] = useState(null);   // oxirgi hujjat (startAfter uchun)
  const [actionsDone, setActionsDone] = useState(false);      // oxiriga yetdikmi
  const [actionsMoreLoading, setActionsMoreLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');    // all | danger | guruh kaliti
  const [actionSearch, setActionSearch] = useState('');
  const loadAdminActions = () => {
    setActionsLoading(true);
    setActionsError(null);
    // ⚠️ JURNAL AUDITI 2026-08-15 — tartiblash HAMON `createdAt` (mijoz vaqti).
    // `ts` (serverTimestamp) yangi qo'shildi, lekin unga o'tib bo'lmaydi:
    // Firestore `orderBy` maydoni YO'Q hujjatlarni natijadan butunlay tashlab
    // yuboradi — eski yozuvlar jurnaldan g'oyib bo'lardi. `ts` faqat mijoz
    // soati bilan nomuvofiqlikni fosh qilish uchun ishlatiladi (pastda ⚠️).
    getDocs(query(collection(db, 'adminActions'), orderBy('createdAt', 'desc'), limit(JOURNAL_PAGE_SIZE)))
      .then(snap => {
        setAdminActions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setActionsCursor(snap.docs[snap.docs.length - 1] || null);
        setActionsDone(snap.docs.length < JOURNAL_PAGE_SIZE);
      })
      .catch(e => {
        console.error('adminActions load:', e);
        // Eng ehtimoliy sabab — firestore.rules hali deploy qilinmagan
        setActionsError(e?.code === 'permission-denied'
          ? "Ruxsat yo'q — `firebase deploy --only firestore:rules` bajarilganmi?"
          : (e?.message || 'Yuklashda xatolik'));
      })
      .finally(() => setActionsLoading(false));
  };
  // Sahifalash: ilgari jurnal eng yangi 100 tada TUGARDI va bundan oldingiga
  // yo'l yo'q edi — "o'tgan oyda kim o'chirgan?" degan savolga javob berib
  // bo'lmasdi, ya'ni audit izi amalda 100 ta amaldan iborat edi.
  const loadMoreAdminActions = () => {
    if (!actionsCursor || actionsMoreLoading) return;
    setActionsMoreLoading(true);
    getDocs(query(
      collection(db, 'adminActions'), orderBy('createdAt', 'desc'),
      startAfter(actionsCursor), limit(JOURNAL_PAGE_SIZE),
    ))
      .then(snap => {
        setAdminActions(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
        setActionsCursor(snap.docs[snap.docs.length - 1] || null);
        setActionsDone(snap.docs.length < JOURNAL_PAGE_SIZE);
      })
      .catch(e => showToast(e?.message || 'Yuklashda xatolik', 'error'))
      .finally(() => setActionsMoreLoading(false));
  };
  useEffect(() => {
    if (!isAdmin || tab !== 'journal' || journalView !== 'actions') return;
    if (adminActions.length > 0 || actionsError) return;
    loadAdminActions();
  }, [tab, journalView, isAdmin]);

  // ── Jurnal filtri ──
  // 30 dan ortiq amal turi bor: filtrsiz ro'yxat "kim savolni o'chirdi?"
  // savoliga javob bermaydi — ko'z bilan qidirish kerak bo'ladi. Filtr
  // YUKLANGAN yozuvlar ustida ishlaydi (server tomonda `where` + `orderBy`
  // kompozit indeks talab qiladi, u esa har filtr uchun alohida indeks).
  const filteredActions = adminActions.filter(a => {
    const info = describeAdminAction(a.type);
    if (actionFilter === 'danger' && !info.danger) return false;
    if (actionFilter !== 'all' && actionFilter !== 'danger' && info.group !== actionFilter) return false;
    if (!actionSearch.trim()) return true;
    const needle = actionSearch.trim().toLowerCase();
    return [info.label, a.type, a.actorEmail, a.target, formatActionMeta(a.meta)]
      .filter(Boolean).join(' ').toLowerCase().includes(needle);
  });

  // ── Tab qatorini boshqarish va surish (Desktop & Mobile) ──
  const activeTabRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons]);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    updateScrollButtons();
  }, [tab, updateScrollButtons]);

  const scrollTabs = (direction) => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const scrollAmount = 280;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  const handleTabsWheel = (e) => {
    const el = tabsContainerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      updateScrollButtons();
    }
  };

  // ── To'lovlar (B-1) ──
  // ⚠️ ADMIN AUDIT 2026-08-06, B-1 BAND: `firestore.rules:197` da
  // `payments` admin uchun ochiq va izohida "faqat admin ko'radi
  // ('to'ladim, premium yo'q' murojaatlarini tekshirish uchun)" deb yozilgan.
  // Bunday UI umuman YO'Q edi — admin bu ma'lumotni faqat Firebase konsolidan
  // ko'ra olardi. `AMOUNT_MISMATCH` bilan rad etilgan to'lovlar ham ko'rinmasdi.
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const loadPayments = ({ force = false } = {}) => {
    if (!force && payments.length > 0) return;
    setPaymentsLoading(true);
    setPaymentsError(null);
    getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(LIST_PAGE_SIZE)))
      .then(snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(e => {
        console.error('payments load:', e);
        setPaymentsError(e?.message || 'Yuklashda xatolik');
      })
      .finally(() => setPaymentsLoading(false));
  };
  useEffect(() => {
    if (!isAdmin || tab !== 'payments') return;
    loadPayments();
  }, [tab, isAdmin]);

  // ── Hisobni o'chirish arizalari (B-2) ──
  // ⚠️ `firestore.rules:289` admin uchun ochiq, `api/notify-admin.js:161`
  // yozadi, lekin UI YO'Q edi. Yagona xabar kanali — Telegram, u esa
  // `TELEGRAM_BOT_TOKEN` sozlanmagan bo'lsa jimgina `false` qaytaradi
  // (notify-admin.js:94) → ariza BUTUNLAY yo'qolardi. Google Play bo'yicha
  // bu arizalarga javob berish majburiyati bor.
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [delReqLoading, setDelReqLoading] = useState(false);
  const [delReqError, setDelReqError] = useState(null);
  // Bajarilgan arizalar standart holatda YASHIRIN (2026-08-19) — pastdagi
  // `visibleDeletionRequests` ga qarang.
  const [delReqShowDone, setDelReqShowDone] = useState(false);
  const loadDeletionRequests = ({ force = false } = {}) => {
    if (!force && deletionRequests.length > 0) return;
    setDelReqLoading(true);
    setDelReqError(null);
    getDocs(query(collection(db, 'deletionRequests'), orderBy('createdAt', 'desc'), limit(50)))
      .then(snap => setDeletionRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(e => {
        console.error('deletionRequests load:', e);
        setDelReqError(e?.message || 'Yuklashda xatolik');
      })
      .finally(() => setDelReqLoading(false));
  };
  useEffect(() => {
    if (!isAdmin || tab !== 'users') return;
    loadDeletionRequests();
  }, [tab, isAdmin]);
  const newDeletionRequests = deletionRequests.filter(r => r.status === 'pending').length;
  const doneDeletionRequests = deletionRequests.length - newDeletionRequests;
  // Ekranda faqat javob KUTAYOTGANLAR. Bajarilganlar ro'yxatdan chiqadi, lekin
  // hujjat o'chirilmaydi — 'Arxiv' tugmasi ularni qaytarib ko'rsatadi.
  const visibleDeletionRequests = delReqShowDone
    ? deletionRequests
    : deletionRequests.filter(r => r.status === 'pending');

  // ⚠️ 2026-08-19 — "Bajarildi" tugmasi arizaning HOLATINI o'zgartiradi,
  // hisobni o'chirmaydi (haqiqiy o'chirish — pastdagi ro'yxatda ⋮ → o'chirish,
  // `api/notify-admin?action=delete-user`). Ilgari admin telefonni QO'LDA
  // ko'chirib, qidiruv maydoniga qo'yib, "Bazadan qidirish"ni bosardi — uch
  // qadam, va raqamni adashtirsa BOSHQA odam o'chib ketishi mumkin edi.
  // Endi ariza telefonini to'g'ridan-to'g'ri server qidiruviga uzatamiz.
  const findUserFromRequest = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 9) { showToast("Arizada telefon raqami yo'q", 'error'); return; }
    setUserSearch(digits);
    searchUsersOnServer(digits);
  };

  const setDeletionRequestStatus = async (id, status) => {
    try {
      const handledAt = new Date().toISOString();
      await updateDoc(doc(db, 'deletionRequests', id), { status, handledAt });
      // `handledAt` lokal holatga ham yoziladi — arxivda 'qachon bajarilgani'
      // sahifani yangilamasdan ko'rinsin.
      setDeletionRequests(prev => prev.map(r => (r.id === id ? { ...r, status, handledAt } : r)));
      // Hisobni o'chirish — huquqiy ahamiyatga ega so'rov: "bajarildi" deb kim
      // va qachon belgilagani keyinchalik isbot bo'ladi.
      logAdminAction('deletion_request.status', id, { holat: status });
      showToast(status === 'done' ? "Bajarildi deb belgilandi" : 'Holat yangilandi', 'success');
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error');
    }
  };

  // ── Foydalanuvchi kartochkasi (B-3) ──
  // Qatorda faqat ism/email va 3 ta tugma bor edi: obuna qachon tugashi,
  // qanday olingani, ro'yxatdan o'tgan sanasi HECH QAYERDA ko'rinmasdi.
  // Ma'lumot allaqachon yuklangan — qo'shimcha o'qish kerak emas (0 kvota).
  const [userCard, setUserCard] = useState(null);

  // ── Qator amallari menyusi (⋮) ──
  // Ilgari har qatorda 3 ta ikonka-tugma turardi (Pro / Rol / O'chirish) —
  // ular ~110px joy egallab, ism, PRO muddati, fan va oxirgi faollik
  // matnlarini siqib qo'yardi (telefonda ism «...» bilan kesilardi). Endi
  // bitta ⋮ tugmasi (32px) va amallar menyu ichida — matnli, ya'ni
  // «bu ikonka nima qilardi?» degan savol ham qolmaydi.
  // Holat: { id, up } — `up` menyu tepaga ochilishini bildiradi (qator ekran
  // pastida bo'lsa; aks holda menyu ekrandan chiqib ketardi).
  const [userMenu, setUserMenu] = useState(null);
  const closeUserMenu = () => setUserMenu(null);
  const toggleUserMenu = (id, btn) => {
    setUserMenu(prev => {
      if (prev?.id === id) return null;
      const r = btn.getBoundingClientRect();
      return { id, up: r.bottom + 200 > window.innerHeight };
    });
  };
  // Amal bajarilishi bilan menyu yopiladi — aks holda tasdiq oynasi
  // ustida osilib qolardi.
  const runUserAction = (fn) => { closeUserMenu(); fn(); };

  // Tashqariga bosish / Escape — menyuni yopadi.
  // ⚠️ Bu yerda `position: fixed` ko'rinmas qatlam ISHLATILMAYDI: qator
  // hover'da `transform: translateY(-2px)` oladi (AdminPage.css), transform
  // esa `fixed` uchun containing block yaratadi — qatlam butun ekranni emas,
  // qatorning o'zini qoplab qolardi va menyu yopilmasdi.
  useEffect(() => {
    if (!userMenu) return;
    const onDown = (e) => { if (!e.target.closest?.('.admin-menu-wrap')) closeUserMenu(); };
    const onKey = (e) => { if (e.key === 'Escape') closeUserMenu(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenu]);

  // ── Platforma umumiy statistikasi (arzon count so'rovlari) ──
  const [overview, setOverview] = useState(null); // { users, premium, questions, referrals, unsolvedObjections }
  // Savol paketi holati (`settings/version.bundles`) — "savol yuklash arzonmi
  // yoki qimmatmi?" degan savolning yagona ko'rsatkichi.
  const [bundleInfo, setBundleInfo] = useState(null); // null | { fanlar, savollar, updatedAt }
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);

  // ── Fan kesimi: qaysi fan o'qituvchilari nechta ──
  // { rows: [{ id, name, total, premium, questions }], unknown, totalUsers, totalQuestions }
  const [subjectStats, setSubjectStats] = useState(null);
  const [subjectStatsLoading, setSubjectStatsLoading] = useState(false);
  const [subjectStatsError, setSubjectStatsError] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('all'); // all | <fan id> | none

  // ── Kunlik faollik tarixi (`metrics/{YYYY-MM-DD}`) ──
  // 14 ta hujjat = 14 o'qish, faqat "Statistika" tabi ochilganda.
  const [metrics, setMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  // `undefined` — hali o'qilmagan, `null` — hujjat YO'Q (cron hech qachon
  // ishlamagan). Farq muhim: ikkinchisi nosozlik, birinchisi shunchaki kutish.
  const [cronHealth, setCronHealth] = useState(undefined);

  // ── Referral statistika state ──
  const [allReferrals, setAllReferrals] = useState([]);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralSummary, setReferralSummary] = useState({ total: 0, paid: 0, pending: 0, totalBonus: 0 });
  const [objections, setObjections] = useState([]);
  const [questionRequests, setQuestionRequests] = useState([]); // "Ko'proq savol kerak" so'rovlari
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  // Baza haqiqatan yuklanganmi. `questions.length > 0` YETARLI EMAS: bo'sh baza
  // ham 0 uzunlik beradi, JSON import esa dublikat tekshiruvi uchun aynan shu
  // farqni bilishi kerak (T-3).
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  // ⚠️ ADMIN AUDIT 2026-08-06, B-6 BAND — savol tahriri va «Yangilanishni
  // yuborish» hech qanday tarzda bog'lanmagan edi. Admin savolni tuzatib
  // publish qilishni unutsa, foydalanuvchilar ESKI keshdagi savolni ko'raveradi
  // (loyihaning ma'lum keshi tuzog'i: scripts/bump-questions-version.mjs).
  // Endi har yozuvdan keyin Savollar tabida ogohlantirish tasmasi chiqadi.
  const [pendingPublish, setPendingPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [objectionsError, setObjectionsError] = useState(null);
  // ADMIN UX AUDIT 2026-08-18, M-2: «Tuzatish» oynasi ochilgan e'tiroz.
  const [fixTarget, setFixTarget] = useState(null);
  // A-1: shubhali savollar ro'yxati (ataylab yuklanadi — kvota).
  const [suspicious, setSuspicious] = useState([]);
  const [suspLoading, setSuspLoading] = useState(false);
  const [suspError, setSuspError] = useState(null);
  const [suspLoaded, setSuspLoaded] = useState(false);
  const [suspOpen, setSuspOpen] = useState(false);
  // K-3: bir martalik `qHash` to'ldirish holati.
  const [qhashBusy, setQhashBusy] = useState(false);
  const [qhashProgress, setQhashProgress] = useState(null);
  // A-3: «hozir faol» — 15 daqiqalik oyna (pastdagi effekt izohiga qarang).
  const [liveActive, setLiveActive] = useState(null);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userSearchServer, setUserSearchServer] = useState(false); // server qidiruvi natijasimi
  // Ro'yxat `USER_PAGE_SIZE` chegarasiga tiqilib qoldimi — ya'ni bazada
  // ro'yxatda KO'RINMAYDIGAN odam bormi. Faqat shu holatda mijozdagi qidiruv
  // to'liq emas, va UI shuni ochiq aytishi kerak.
  const [usersTruncated, setUsersTruncated] = useState(false);
  const [referralError, setReferralError] = useState(null);
  const [filterSolved, setFilterSolved] = useState('all'); // all | unsolved | solved
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, text: "", onConfirm: null });

  const confirmAction = (text, onConfirm) => {
    setConfirmDialog({ isOpen: true, text, onConfirm });
  };

  // Dublikat preview state (o'chirishdan oldin ko'rsatish uchun)
  const [dupPreview, setDupPreview] = useState(null); // null | { groups, totalRemove, scope }
  const [dupAnalyzing, setDupAnalyzing] = useState(false);
  const [dupDeleting, setDupDeleting] = useState(false);


  // Question Management State
  const [isAdding, setIsAdding] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [newQ, setNewQ] = useState({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // Paket qurishda "3/16" ko'rinishidagi jarayon — 40 MB yuklanayotganda
  // tugma jim tursa admin sahifani yopib yuborardi.
  const [syncProgress, setSyncProgress] = useState(null); // null | { done, total }
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadingJSON, setIsUploadingJSON] = useState(false);

  // Question Filters & Search State
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState('all');
  const [questionTopicFilter, setQuestionTopicFilter] = useState('all');

  // Notification Management State
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'info', targetUser: 'all' });
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const [notifsLoaded, setNotifsLoaded] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    // limit(100) — T-8: ilgari chegara yo'q edi, ya'ni kolleksiya o'sgani sari
    // admin sahifasi ochilishi bilan BUTUN tarix real-time yuklanardi.
    const qNotifs = query(collection(db, 'notifications'), orderBy('date', 'desc'), limit(100));
    const unsub = onSnapshot(qNotifs, (snap) => {
      setAdminNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setNotifsLoaded(true);
    }, (err) => console.error("Notifs fetch error:", err));
    return () => unsub();
  }, [isAdmin]);

  // ── Umumiy e'lonlar surati (O'QISH BYUDJETI) ────────────────────────────
  //
  // Har foydalanuvchi ilovani ochganda `notifications` kolleksiyasidan 30 ta
  // hujjat o'qirdi. E'lonlar HAMMA uchun bir xil, ya'ni bu 30× ortiqcha ish
  // edi. Bu yerda ro'yxat BITTA hujjatga (`settings/announcements`) yoziladi
  // va mijoz uni 1 o'qishda oladi (`hooks/useNotifications.js`).
  //
  // QO'SHIMCHA O'QISH YO'Q: manba — yuqoridagi tinglovchi allaqachon
  // yuklagan `adminNotifs`. Effekt yuborish, o'chirish va sahifa birinchi
  // ochilishini BIR YO'LDA qamraydi, shuning uchun ishlov beruvchilarga
  // tegishning hojati yo'q.
  //
  // `notifsLoaded` MUHIM: usiz birinchi renderdagi bo'sh massiv suratni
  // o'chirib yuborardi.
  const publishedSigRef = useRef(null);
  useEffect(() => {
    if (!isAdmin || !notifsLoaded) return;
    const items = buildAnnouncementItems(adminNotifs);
    const sig = JSON.stringify(items);
    if (sig === publishedSigRef.current) return;
    publishedSigRef.current = sig;
    publishAnnouncements(items).catch(e => {
      // Surat yozilmasa ilova buzilmaydi — mijoz eski yo'lga (30 o'qish)
      // tushadi. Shuning uchun bu jimgina ogohlantirish.
      console.warn("E'lonlar surati yozilmadi:", e?.code || e?.message || e);
      publishedSigRef.current = null;   // keyingi o'zgarishda qayta urinsin
    });
  }, [isAdmin, notifsLoaded, adminNotifs]);

  // ── Umumiy statistika (count aggregation — barcha hujjatlarni o'qimaydi, arzon) ──
  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      // A-17: `unsolvedObjections` qo'shildi. Ilgari sarlavhadagi va tab
      // badge'idagi raqam FAQAT yuklangan 200 ta e'tirozdan hisoblanardi
      // (limit(200)) — go'yo jami son bo'lib ko'rinardi. Aggregatsiya
      // so'rovi 1000 hujjatga 1 o'qish, ya'ni deyarli bepul.
      const [u, p, q, r, o, v] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'users'), where('isPremium', '==', true))),
        getCountFromServer(collection(db, 'questions')),
        getCountFromServer(collection(db, 'referrals')),
        getCountFromServer(query(collection(db, 'objections'), where('solved', '==', false))),
        // 1 ta hujjat o'qish — lekin platformaning eng qimmat sozlamasi shu:
        // paket qurilmagan bo'lsa har foydalanuvchi fan boshiga ~2 900 o'qish
        // sarflaydi (qarang: handleRebuildBundles).
        getDoc(doc(db, 'settings', 'version')).catch(() => null),
      ]);
      setOverview({
        users: u.data().count,
        premium: p.data().count,
        questions: q.data().count,
        referrals: r.data().count,
        unsolvedObjections: o.data().count,
      });
      const vData = v?.exists?.() ? v.data() : null;
      const b = vData?.bundles || {};
      setBundleInfo({
        fanlar: Object.keys(b).length,
        savollar: Object.values(b).reduce((a, x) => a + (x?.count || 0), 0),
        updatedAt: Object.values(b)[0]?.updatedAt || vData?.updatedAt || null,
      });
    } catch (e) {
      console.error('Overview load error:', e);
      const isQuota = e?.code === 'resource-exhausted' || (e?.message && e.message.includes('RESOURCE_EXHAUSTED'));
      const msg = isQuota
        ? "⚠️ Firebase kunlik o'qish limiti (50,000 o'qish/kun) tugadi. Soat 05:00 da (UTC 00:00) limit yangilanadi yoki Firebase Console'da Blaze (pay-as-you-go) tarifiga o'tish lozim."
        : (e?.message || 'Yuklashda xatolik');
      setOverviewError(msg);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview();
  }, [isAdmin]);

  // ── Fan bo'yicha o'qituvchilar kesimi ────────────────────────────────────
  // Platformaning HAR BIR foydalanuvchisi — o'qituvchi, va uning fani
  // `users/{uid}.subject` da turadi. Bu kesimsiz "keyingi savol/konspektni
  // qaysi fanga yozaman?" degan savol ko'r-ko'rona hal qilinardi.
  //
  // NARXI: 16 fan × 2 so'rov (jami + Pro) + 1 umumiy son = 33 aggregatsiya
  // so'rovi. `getCountFromServer` har 1000 mos hujjatga 1 o'qish sarflaydi,
  // ya'ni amalda ~33 O'QISH — hujjatlarning o'zi yuklanmaydi.
  // Shu sabab bu ATAYLAB dangasa: faqat "Statistika" tabi birinchi marta
  // ochilganda ishga tushadi (loadOverview kabi har kirishda emas).
  //
  // INDEKS: ikkala filtr ham TENGLIK (`==`) — Firestore bunday so'rovni bir
  // maydonli indekslarni zigzag birlashtirib bajaradi, KOMPOZIT INDEKS SHART
  // EMAS. Baribir har bir so'rov alohida `catch` bilan o'ralgan: bittasi
  // yiqilsa qolgan 15 fan ko'rinaversin.
  const loadSubjectStats = async () => {
    setSubjectStatsLoading(true);
    setSubjectStatsError(null);
    try {
      const usersCol = collection(db, 'users');
      const [counted, totalSnap, metaSnap] = await Promise.all([
        Promise.all(SUBJECTS.map(async (s) => {
          const [tot, pro] = await Promise.all([
            getCountFromServer(query(usersCol, where('subject', '==', s.id)))
              .then(r => r.data().count).catch(() => null),
            getCountFromServer(query(usersCol, where('subject', '==', s.id), where('isPremium', '==', true)))
              .then(r => r.data().count).catch(() => null),
          ]);
          return { id: s.id, name: s.name, total: tot, premium: pro };
        })),
        getCountFromServer(usersCol).then(r => r.data().count).catch(() => null),
        // Fan bo'yicha savol soni — `handlePublishBundles` yozadi (A-1 bandi).
        // Bu yerda faqat O'QILADI: 1 ta hujjat = 1 o'qish.
        getDoc(doc(db, 'settings', 'questionMeta')).then(s => (s.exists() ? s.data() : {})).catch(() => ({})),
      ]);

      const rows = counted.map(r => ({
        ...r,
        total: r.total ?? 0,
        premium: r.premium ?? 0,
        failed: r.total === null,
        questions: metaSnap?.[r.id]?.count ?? null,
      }));
      const sumSubjects = rows.reduce((a, r) => a + r.total, 0);

      setSubjectStats({
        rows,
        // ⚠️ Ayirma bilan hisoblanadi, `where('subject','==','')` bilan EMAS.
        // Sabab: onboardingni tashlab ketgan hisoblarda maydon bo'sh satr
        // ('') YOKI umuman yo'q bo'lishi mumkin, Firestore esa maydoni yo'q
        // hujjatni tenglik filtriga QO'SHMAYDI — bunday odamlar jimgina
        // yo'qolardi va ustunlar yig'indisi jamiga teng kelmasdi.
        unknown: totalSnap === null ? null : Math.max(0, totalSnap - sumSubjects),
        totalUsers: totalSnap,
        totalQuestions: rows.reduce((a, r) => a + (r.questions || 0), 0),
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error('Fan statistikasi xatosi:', e);
      const isQuota = e?.code === 'resource-exhausted' || (e?.message && e.message.includes('RESOURCE_EXHAUSTED'));
      const msg = isQuota
        ? "⚠️ Firebase kunlik o'qish limiti (50,000 o'qish/kun) tugadi. Soat 05:00 da (UTC 00:00) limit yangilanadi yoki Blaze tarifiga o'tish lozim."
        : (e?.message || 'Yuklashda xatolik');
      setSubjectStatsError(msg);
    } finally {
      setSubjectStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || tab !== 'stats') return;
    if (subjectStats || subjectStatsLoading) return;
    loadSubjectStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  // ── Kunlik faollik tarixi ────────────────────────────────────────────────
  // Hujjat ID'si — `YYYY-MM-DD`, ya'ni `documentId()` bo'yicha tartiblash
  // AYNAN sana bo'yicha tartiblashdir: alohida `date` maydoni va indeks
  // kerak emas. So'nggi 14 kun = 14 o'qish.
  const loadMetrics = async ({ force = false } = {}) => {
    if (!force && (metrics.length > 0 || metricsLoading)) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const snap = await getDocs(query(
        collection(db, 'metrics'),
        orderBy(documentId(), 'desc'),
        limit(14),
      ));
      setMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('metrics load error:', e);
      setMetricsError(e?.message || 'Yuklashda xatolik');
    } finally {
      setMetricsLoading(false);
    }

    // Cron izi — 1 ta o'qish. `metrics` bo'sh bo'lishining IKKI sababi bor
    // (hali kun tugamagan / cron o'lik) va ularni faqat shu hujjat ajratadi.
    try {
      const hs = await getDoc(doc(db, 'meta', 'cronHealth'));
      setCronHealth(hs.exists() ? hs.data() : null);
    } catch (e) {
      console.warn('cronHealth load error:', e);
      setCronHealth(undefined);
    }
  };

  useEffect(() => {
    if (!isAdmin || tab !== 'stats') return;
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  const handleSendNotification = async () => {
    if (!newNotif.title || !newNotif.message) {
      showToast("Sarlavha va matnni to'ldiring!", 'error');
      return;
    }
    setIsSendingNotif(true);
    try {
      // MARSHRUTLASH: umumiy e'lon → ochiq `notifications`; bitta kishiga xabar →
      // `users/{uid}/notifications` subkolleksiyasi.
      // Sabab payment-webhook.js:110 dagi bilan bir xil: yuqori darajadagi
      // kolleksiya tizimga kirgan HAR QANDAY foydalanuvchiga o'qish uchun ochiq
      // (firestore.rules:101) → bir kishiga atalgan xabarni hamma ko'rardi.
      // Qo'shimcha foyda: ochiq kolleksiya kichik qoladi (faqat umumiy e'lonlar),
      // shuning uchun uni har bir client arzon o'qiydi.
      const notifPayload = { ...newNotif, date: new Date().toISOString() };
      if (newNotif.targetUser && newNotif.targetUser !== 'all') {
        await addDoc(
          collection(db, 'users', newNotif.targetUser, 'notifications'),
          { ...notifPayload, read: false }
        );
      } else {
        await addDoc(collection(db, 'notifications'), notifPayload);
      }
      // FCM push (best-effort) — VAPID kalit + foydalanuvchi tokenlari sozlangan bo'lsa
      // ilova yopiq bo'lsa ham yetib boradi. Sozlanmagan bo'lsa jimgina o'tkazib yuboriladi.
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await fetch('/api/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ action: 'push', title: newNotif.title, body: newNotif.message, target: newNotif.targetUser }),
          });
        }
      } catch (pushErr) {
        console.warn('Push yuborishda xato (zararsiz):', pushErr);
      }
      logAdminAction('notification.send', newNotif.targetUser, { sarlavha: newNotif.title.slice(0, 80), tur: newNotif.type });
      showToast("✅ Bildirishnoma muvaffaqiyatli yuborildi!", 'success');
      setNewNotif({ title: '', message: '', type: 'info', targetUser: 'all' });
    } catch (e) {
      showToast("Xatolik: " + e.message, 'error');
    }
    setIsSendingNotif(false);
  };

  const handleDeleteNotification = (notifId) => {
    confirmAction("Bu bildirishnomani bazadan o'chirishni tasdiqlaysizmi?", async () => {
try {
      await deleteDoc(doc(db, 'notifications', notifId));
      showToast("🗑️ Bildirishnoma o'chirildi", 'info');
    } catch (e) { showToast("Xatolik: " + e.message, 'error'); }
    });
  };



  const processJsonQuestions = async (jsonString) => {
    // ⚠️ ADMIN UX AUDIT 2026-08-18, K-3 BAND — import endi BAZASIZ ishlaydi.
    //
    // AVVAL (2026-08-06, T-3): dublikat filtri `questions` state'iga tayanardi,
    // ya'ni import butun bazani yuklashni TALAB QILARDI — panelning o'z
    // ogohlantirishiga ko'ra ~47 000 o'qish, bepul kunlik kvota esa 50 000.
    // Amalda 20 ta savol qo'shish ilovani o'sha kuni HAMMA uchun o'chirib
    // qo'yishi mumkin edi.
    //
    // ENDI: har savolning `qHash` i hisoblanadi va serverdan 30 talab
    // so'raladi (`where('qHash','in',[...])`). 200 savollik import ~ 7 so'rov.
    //
    // ⚠️ Bu faqat `qHash` YOZILGAN savollarni topadi. Eski yozuvlarda u yo'q,
    // shuning uchun «Savollar» tabida bir martalik «qHash to'ldirish» amali
    // bor. To'ldirilmaguncha xotiradagi eski tekshiruv zaxira bo'lib qoladi.
    setIsUploadingJSON(true);
    showToast("JSON fayl tahlil qilinmoqda...", 'info');
    try {
      const parsed = JSON.parse(jsonString);
      const list = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      
      if (!Array.isArray(list) || list.length === 0) {
        showToast("Xato: Savollar topilmadi. JSON massiv formatida bo'lishi kerak!", 'error');
        setIsUploadingJSON(false);
        return;
      }

      // Ta'rif BITTA joyda — src/utils/qHash.js. Eski lokal nusxada oddiy
      // apostrof (U+0027) hisobga olinmasdi, ya'ni «bo'lim» va «bo‘lim» turli
      // savol sanalardi va dublikat jimgina o'tib ketardi.
      const normalize = normalizeQuestion;

      // Xotiradagi to'plam — ZAXIRA. Baza yuklangan bo'lsa ishlaydi; yuklanmagan
      // bo'lsa bo'sh qoladi va asosiy tekshiruv `qHash` orqali SERVERDA bajariladi.
      const existingSet = new Set(questions.map(q => normalize(q.q)));

      // ⚠️ AUDIT 2026-08-06, T-16 BAND — validatsiya kuchaytirildi.
      // AVVAL: `parseInt(q.topicId) || 0` — noma'lum yoki buzilgan `topicId`
      // JIMGINA 0 ga (chqbt 1-bo'limi) tushardi va savol butunlay BOSHQA fanga
      // yozilardi. `correct` esa variantlar chegarasidan chiqsa ham qabul
      // qilinardi — natijada to'g'ri javobi YO'Q savol foydalanuvchiga borardi.
      // Endi noaniq yozuv rad etiladi va sababi bo'yicha sanaladi.
      const knownTopicIds = new Set(TOPICS.map(t => t.id));
      const toAdd = [];
      const skipped = { format: 0, topic: 0, correct: 0, duplicate: 0 };

      list.forEach(q => {
        if (!q.q || !Array.isArray(q.opts) || q.opts.length < 2 || q.correct === undefined) {
          skipped.format++;
          return;
        }

        const resolvedTopicId = Number.parseInt(q.topicId, 10);
        if (!Number.isInteger(resolvedTopicId) || !knownTopicIds.has(resolvedTopicId)) {
          skipped.topic++;
          return;
        }

        const correctIdx = Number.parseInt(q.correct, 10);
        if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= q.opts.length) {
          skipped.correct++;
          return;
        }

        const normQText = normalize(q.q);
        if (existingSet.has(normQText)) {
          skipped.duplicate++;
          return;
        }

        toAdd.push({
          q: q.q,
          opts: q.opts,
          correct: correctIdx,
          topicId: resolvedTopicId,
          category: getCategoryFromTopicId(resolvedTopicId),
          explanation: q.explanation || `✓ To'g'ri javob: ${String.fromCharCode(65 + correctIdx)}`,
          mnemonic: q.mnemonic || '',
          image: q.image || '',
          // K-3: keyingi importlar shu maydon orqali dublikatni SERVERDAN
          // topadi — butun bazani yuklash kerak bo'lmaydi.
          qHash: qHashOf(q.q),
          createdAt: new Date().toISOString()
        });
        existingSet.add(normQText);
      });

      // ── K-3: SERVERDAN dublikat tekshiruvi ────────────────────────────
      // `in` operatori bir so'rovda 30 ta qiymatni oladi. 200 savollik
      // import = 7 so'rov. Bu — butun bazani yuklashning (47 000 o'qish)
      // o'rnini bosadi.
      //
      // Xato bo'lsa (indeks yo'q, tarmoq uzildi) import TO'XTATILADI: jimgina
      // davom etsa dublikat yozilib ketardi, uni keyin qo'lda tozalash kerak
      // bo'lardi.
      if (toAdd.length > 0) {
        const hashes = [...new Set(toAdd.map(q => q.qHash).filter(Boolean))];
        const found = new Set();
        try {
          for (let i = 0; i < hashes.length; i += 30) {
            const snap = await getDocs(query(
              collection(db, 'questions'),
              where('qHash', 'in', hashes.slice(i, i + 30)),
            ));
            snap.forEach(d => found.add(d.data().qHash));
          }
        } catch (dupErr) {
          showToast('Dublikat tekshiruvi bajarilmadi: ' + dupErr.message, 'error');
          setIsUploadingJSON(false);
          return;
        }
        if (found.size > 0) {
          const before = toAdd.length;
          for (let i = toAdd.length - 1; i >= 0; i--) {
            if (found.has(toAdd[i].qHash)) toAdd.splice(i, 1);
          }
          skipped.duplicate += before - toAdd.length;
        }
      }

      const skipSummary = [
        skipped.duplicate ? `${skipped.duplicate} ta takror` : null,
        skipped.format ? `${skipped.format} ta format xatosi` : null,
        skipped.topic ? `${skipped.topic} ta noma'lum bo'lim` : null,
        skipped.correct ? `${skipped.correct} ta noto'g'ri javob indeksi` : null,
      ].filter(Boolean).join(', ');

      if (toAdd.length === 0) {
        showToast(skipSummary ? `Yangi savol yo'q (${skipSummary})` : "Barcha savollar allaqachon bazada mavjud!", 'success');
        setIsUploadingJSON(false);
        return;
      }

      showToast(`${toAdd.length} ta yangi savol topildi${skipSummary ? ` (o'tkazildi: ${skipSummary})` : ''}. Yuklanmoqda...`, 'info');

      // Batch push to Firestore in chunks of 400
      const qRef = collection(db, 'questions');
      const added = [];
      let commitError = null;
      try {
        for (let i = 0; i < toAdd.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = toAdd.slice(i, i + 400);
          const chunkDocs = [];
          chunk.forEach(q => {
            const newDoc = doc(qRef);
            batch.set(newDoc, q);
            chunkDocs.push({ id: newDoc.id, ...q });
          });
          await batch.commit();
          // Lokal ro'yxatga FAQAT commit muvaffaqiyatli bo'lgach qo'shamiz —
          // aks holda yozilmagan savollar ekranda "bor" bo'lib ko'rinardi (T-16).
          added.push(...chunkDocs);
        }
      } catch (commitErr) {
        commitError = commitErr;
      }

      if (added.length > 0) {
        logAdminAction('question.import', null, { qoshildi: added.length, otkazildi: list.length - added.length });
        setPendingPublish(true); // B-6
      }

      if (commitError) {
        // Qisman import: shu paytgacha commit qilingan partiyalar bazada QOLADI.
        showToast(`Yuklash to'xtadi: ${added.length} ta yozildi, ${toAdd.length - added.length} ta yozilmadi. Sabab: ${commitError.message}`, 'error');
      } else {
        showToast(`Muvaffaqiyatli! ${added.length} ta yangi savol yuklandi. 🎉`, 'success');
      }

      // Ilgari bu yerda BUTUN kolleksiya qayta o'qilardi (~47 000 o'qish).
      // Nima qo'shganimizni allaqachon bilamiz — lokal ro'yxatga qo'shamiz.
      setQuestions(prev => [...prev, ...added]);

    } catch (e) {
      console.error("JSON upload error:", e);
      showToast("Faylni yuklashda xatolik: " + e.message, 'error');
    }
    setIsUploadingJSON(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/json" || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (event) => processJsonQuestions(event.target.result);
      reader.readAsText(file);
    } else {
      showToast("Faqat .json kengaytmali fayllar qabul qilinadi!", 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => processJsonQuestions(event.target.result);
      reader.readAsText(file);
    }
  };

  // Tariffs State
  const [tariffs, setTariffs] = useState([]);
  const [isAddingTariff, setIsAddingTariff] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [newTariff, setNewTariff] = useState({ id: '', name: '', price: 0, durationMonths: 1 });

  // ── Rasm yuklash (ADMIN UX AUDIT 2026-08-18, K-5) ───────────────────
  //
  // Uch o'zgarish:
  //  1. CLIPBOARD'DAN QO'YISH — metodist PDF'dan skrinshot oladi va
  //     to'g'ridan-to'g'ri Ctrl+V qiladi. Ilgari har rasmda uch ortiqcha
  //     qadam bor edi: skrinshot → faylga saqlash → «tanlash» oynasi.
  //  2. SIQISH — 4 MB lik kamera rasmi o'zgarishsiz ketardi va uni HAR BIR
  //     foydalanuvchi mobil internetda yuklab olardi.
  //  3. `setNewQ(prev => …)` — ilgari `{...newQ}` yopilmasi ishlatilardi.
  //     Yuklash davomida admin matnni tahrirlasa, o'sha tahrir YO'QOLARDI
  //     (eskirgan nusxa ustiga yozilardi).
  const uploadQuestionImage = async (rawFile) => {
    if (!rawFile) return;
    if (!rawFile.type?.startsWith('image/')) {
      showToast('Faqat rasm fayllari qabul qilinadi', 'error');
      return;
    }
    setIsUploadingImage(true);
    try {
      const file = await compressImage(rawFile);
      const ext = file.type === 'image/webp' ? 'webp' : (rawFile.name?.split('.').pop() || 'img');
      const storageRef = ref(storage, `questions/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewQ(prev => ({ ...prev, image: url }));
      const saved = rawFile.size - file.size;
      showToast(
        saved > 50000
          ? `Rasm yuklandi (${Math.round(saved / 1024)} KB tejaldi)`
          : 'Rasm yuklandi!',
        'success',
      );
    } catch (err) {
      showToast('Rasm yuklashda xatolik: ' + err.message, 'error');
    }
    setIsUploadingImage(false);
  };

  const handleImageUpload = (e) => uploadQuestionImage(e.target.files[0]);

  // Savol matni maydoniga qo'yilgan rasm — matn qo'yish buzilmaydi:
  // faqat clipboard'da RASM bo'lsagina aralashamiz.
  const handleImagePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])]
      .find(i => i.type?.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    uploadQuestionImage(item.getAsFile());
  };

  useEffect(() => {
    if (!isAdmin) return;
    // limit(200) — T-8. Eng yangi 200 ta e'tiroz ko'rsatiladi; chegarasiz
    // real-time listener kolleksiya o'sishi bilan o'qish kvotasini yeb qo'yardi.
    const q = query(collection(db, 'objections'), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setObjections(snap.docs.map(d => ({
        ...d.data(),
        fbId: d.id,
        date: d.data().timestamp?.toDate()?.toLocaleString() || d.data().date
      })));
      setObjectionsError(null);
      setLoading(false);
    }, (err) => {
      // ⚠️ ADMIN AUDIT 2026-08-06, A-3 BAND — bu callback YO'Q edi. `loading`
      // bu tabning yagona darvozasi, u faqat muvaffaqiyat yo'lida false
      // bo'lardi. Rules rad etsa yoki indeks yetishmasa, admin CHEKSIZ
      // "Yuklanmoqda..." ko'rardi — na toast, na sabab.
      console.error('objections fetch error:', err);
      setObjectionsError(err?.message || 'Yuklashda xatolik');
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  // ── "Ko'proq savol kerak" so'rovlari (tirik halqa) — real-time ──
  useEffect(() => {
    if (!isAdmin) return;
    // limit(200) — T-8. DIQQAT: "bajarildi" deb belgilash faqat YUKLANGAN
    // so'rovlarga ta'sir qiladi; 200 tadan oshsa qolganlari keyingi ochilishda ko'rinadi.
    const qReq = query(collection(db, 'questionRequests'), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(qReq, (snap) => {
      setQuestionRequests(snap.docs.map(d => ({
        ...d.data(),
        fbId: d.id,
        date: d.data().timestamp?.toDate()?.toLocaleString() || d.data().date
      })));
    }, (err) => console.error('questionRequests fetch error:', err));
    return () => unsub();
  }, [isAdmin]);

  // ⚠️ ADMIN AUDIT 2026-08-06 — A-3, A-4, A-15 BANDLARI birga tuzatildi.
  //
  // AVVAL uchta muammo bor edi:
  //  (a) `try/catch` YO'Q — xato bo'lsa ushlanmagan promise rejection, `users`
  //      bo'sh qolardi va tab MANGU "👥 Yuklanmoqda..." ko'rsatardi (A-3);
  //  (b) BUTUN `users` kolleksiyasi chegarasiz o'qilardi — panelga bir kirish
  //      = kolleksiyadagi hujjat soni qadar Firestore o'qishi (A-15);
  //  (c) yuklash FAQAT `tab === 'users'` da ishga tushardi, "Xabarlar"
  //      tabidagi qabul qiluvchi ro'yxati esa AYNI shu massivdan quriladi —
  //      ya'ni bitta kishiga xabar yuborish amalda ishlamasdi (A-4).
  //
  // ⚠️ `orderBy('createdAt')` — `createdAt` maydoni YO'Q hisoblar bu ro'yxatga
  // TUSHMAYDI (Firestore maydonsiz hujjatni tartiblashdan chiqaradi). Bunday
  // eski hisoblar bor (AuthContext.jsx:64 shu holatni ochiq ishlaydi), shuning
  // uchun ular SERVER QIDIRUVI orqali topiladi va UI'da bu ochiq yozilgan.
  // (2026-08-20 da tekshirildi: o'sha kundagi 394 hisobning HAMMASIDA `createdAt` bor,
  //  ya'ni bu xavf amalda yo'q — lekin kod baribir shu holatga tayyor turadi.)
  //
  // 2026-08-20: chegara `USER_PAGE_SIZE` ga o'tdi va SESSIYA KESHI qo'shildi
  // — sabablari konstanta izohida. Kesh `force` bilan chetlab o'tiladi
  // («Yangilash» tugmasi), aks holda admin yangi ro'yxatdan o'tgan odamni
  // 10 daqiqa ko'rmasligi mumkin edi.
  const loadUsers = async ({ force = false } = {}) => {
    if (!force && users.length > 0) return;

    if (!force) {
      const cached = readUserCache();
      if (cached) {
        setUsers(cached);
        setUsersTruncated(cached.length >= USER_PAGE_SIZE);
        setUserSearchServer(false);
        return; // 0 Firestore o'qishi
      }
    }

    setUsersLoading(true);
    setUsersError(null);
    try {
      const snap = await getDocs(query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(USER_PAGE_SIZE),
      ));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      // Chegaraga TIQILIB qolgan bo'lsa, bazada ko'rinmayotgan odam bor —
      // bu holat UI'da ochiq ogohlantiriladi, chunki aynan shu holat
      // "qidirdim, topilmadi" degan yolg'on xulosaga olib keladi.
      setUsersTruncated(list.length >= USER_PAGE_SIZE);
      setUserSearchServer(false);
      writeUserCache(list);
    } catch (e) {
      console.error('users load error:', e);
      setUsersError(e?.message || 'Yuklashda xatolik');
    } finally {
      setUsersLoading(false);
    }
  };

  // ── Server tomonda qidiruv (B-7) ──
  // Mijozdagi `filter()` faqat YUKLANGAN ro'yxat ichida ishlaydi. Baza
  // `USER_PAGE_SIZE` dan oshgan kunda ro'yxatga tushmagan odamni faqat shu
  // yo'l bilan topish mumkin: har bir so'rov 0–20 o'qish, ya'ni butun
  // kolleksiyani o'qishdan o'nlab marta arzon.
  //
  // 2026-08-20 — ISM BO'YICHA SO'ROV QO'SHILDI. Avval bu funksiya faqat
  // `shortId`, `email` va `phone` ni TENGLIK bo'yicha so'rardi; `displayName`
  // uchun so'rov UMUMAN YO'Q edi. Natijada admin "Omonov" deb qidirsa
  // «topilmadi» degan javob olardi — aslida qidirilmagan edi.
  //
  // ⚠️ Firestore matn ichidan qidirishni (`LIKE '%omon%'`) qo'llab-quvvatlamaydi.
  // Shu sababli ism uchun PREFIKS so'rovi ishlatiladi: `>= term` va
  // `<= term + ''` oralig'i, ya'ni «omon» → «Omonov», «Omonova».
  // Cheklovi ochiq: bu ism/familiyaning BOSHIDAN mos kelishini talab qiladi
  // va registrga sezgir — shuning uchun bir necha yozuv varianti bilan
  // parallel so'rov yuboriladi. Ism O'RTASIDAN qidirish (masalan familiya
  // ikkinchi so'z bo'lsa) faqat yuklangan ro'yxat ichida ishlaydi — hozir
  // bu yetarli, chunki baza (2026-08-20: 394) chegaradan (500) kichik.
  //
  // ⚠️⚠️ QO'L TEGMASIN: pastdagi `'...'` satrlari BO'SH EMAS — ichida
  // U+F8FF (Unicode private-use) belgisi bor. U muharrirda KO'RINMAYDI,
  // lekin prefiks oralig'ining yuqori chegarasi aynan shu. Uni tasodifan
  // o'chirish so'rovni `>= v AND <= v` ga aylantiradi, ya'ni prefiks
  // qidiruvi jimgina FAQAT ANIQ TENGLIKka tushib qoladi va «omon» hech
  // qachon «Omonov» ni topmaydi. Bu Firestore'da standart usul.
  //
  // `termArg` — arizadan kelgan telefon kabi TAYYOR so'z. Berilmasa maydondagi
  // matn ishlatiladi. `onClick={searchUsersOnServer}` hodisa obyektini uzatadi,
  // shuning uchun tur tekshiruvi shart — aks holda [object Object] qidirilardi.
  const searchUsersOnServer = async (termArg) => {
    const term = (typeof termArg === 'string' ? termArg : userSearch).trim();
    if (!term) { loadUsers({ force: true }); return; }
    setUsersLoading(true);
    setUsersError(null);
    try {
      const digits = term.replace(/\D/g, '');
      const queries = [
        // shortId formati: harf(lar) + 4 raqam (utils/shortId.js) — doim katta harf
        query(collection(db, 'users'), where('shortId', '==', term.toUpperCase()), limit(5)),
        query(collection(db, 'users'), where('email', '==', term.toLowerCase()), limit(5)),
      ];

      // Ism/familiya prefiksi. Bazada ismlar odatda «Omonov Aziz» ko'rinishida
      // — birinchi harf katta. Admin esa «omonov» deb ham yozadi, shuning
      // uchun uchta yozuv varianti sinaladi. Takrorlar `Map` da yig'ishtiriladi.
      const nameVariants = [...new Set([
        term,
        term.toLowerCase(),
        term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
      ])];
      nameVariants.forEach(v => {
        queries.push(query(
          collection(db, 'users'),
          where('displayName', '>=', v),
          where('displayName', '<=', v + ''),
          limit(20),
        ));
      });

      // Telefon 998XXXXXXXXX ko'rinishida saqlanadi (AuthContext cleanPhone).
      // Admin raqamni 998 bilan ham, 998 siz ham yozadi — ikkisi ham sinaladi.
      if (digits.length >= 7) {
        const phoneVariants = [...new Set([
          digits,
          digits.startsWith('998') ? digits.slice(3) : `998${digits}`,
        ])];
        phoneVariants.forEach(p => {
          // Prefiks: to'liq bo'lmagan raqam bilan ham topilsin
          queries.push(query(
            collection(db, 'users'),
            where('phone', '>=', p),
            where('phone', '<=', p + ''),
            limit(20),
          ));
          // Soxta email — telefon+@iqro.uz (login modeli)
          queries.push(query(collection(db, 'users'), where('email', '==', `${p}@iqro.uz`), limit(5)));
        });
      }

      // Bitta so'rov indeks yetishmasligi sababli yiqilsa, qolganlari ishlashda davom etsin
      const snaps = await Promise.all(queries.map(q => getDocs(q).catch(() => null)));
      const found = new Map();
      snaps.forEach(s => s?.docs.forEach(d => found.set(d.id, { id: d.id, ...d.data() })));
      if (found.size === 0) {
        // ⚠️ Avvalgi matn ("...ID, telefon yoki email TO'LIQ yozilsin")
        // ADASHTIRARDI: u adminni ism bo'yicha qidirish umuman mumkin emas
        // degan xulosaga olib borardi. Endi ism ham qidiriladi, shuning uchun
        // xabar rost holatni aytadi.
        showToast(`«${term}» bo'yicha bazada hech kim topilmadi`, 'info');
        return;
      }
      setUsers(Array.from(found.values()));
      setUserSearchServer(true);
      setUsersTruncated(false); // qidiruv natijasi — chegara ogohlantirishi bu yerda o'rinsiz
      showToast(`${found.size} ta natija topildi`, 'success');
    } catch (e) {
      console.error('user search error:', e);
      setUsersError(e?.message || 'Qidiruvda xatolik');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    // "Xabarlar" tabi ham shu ro'yxatga tayanadi (A-4)
    if (tab !== 'users' && tab !== 'notifications') return;
    loadUsers();
  }, [tab, isAdmin]);

  // ── Savollar bazasini yuklash — ATAYLAB, QO'LDA ──────────────────────────
  // ⚠️ `questions` kolleksiyasida ~47 000 hujjat bor. Bitta to'liq yuklash =
  // 47 000 Firestore o'qish, ya'ni Spark bepul rejasining KUNLIK kvotasining
  // (50 000) deyarli hammasi. Ilgari bu tab ochilishi bilan avtomatik ishga
  // tushardi — bitta tasodifiy bosish kvotani tugatib, ilovani o'sha kun
  // davomida HAMMA foydalanuvchi uchun buzardi (statistika, reyting,
  // bildirishnomalar `permission-denied` bergan bo'lardi).
  // Endi faqat admin ataylab tugmani bosganda yuklanadi.
  // ── «Shubhali savollar» (ADMIN UX AUDIT 2026-08-18, A-1) ────────────
  //
  // NEGA: shu paytgacha buzuq savolni faqat KIMDIR SHIKOYAT QILSA topish
  // mumkin edi — ya'ni moderatsiya sof reaktiv edi. Ko'pchilik foydalanuvchi
  // esa shikoyat qilmaydi: xato javobni ko'radi, yelka qisadi va ketadi.
  //
  // Bu ro'yxat `questionStats` (cron yig'adi) asosida buzuq savollarni
  // SHIKOYAT KUTMASDAN topadi va har biriga o'sha «Tuzatish» oynasini beradi.
  //
  // NARXI: ~300 ta o'qish, faqat admin ATAYLAB bosganda. `orderBy` va `where`
  // BITTA maydonda (`shown`) — composite indeks kerak emas.
  // ── Bir martalik `qHash` to'ldirish (ADMIN UX AUDIT 2026-08-18, K-3) ──
  //
  // Eski savollarda `qHash` yo'q, ya'ni import ularni dublikat sifatida
  // TOPA OLMAYDI. Bu amal bazani bir marta ko'rib chiqib maydonni to'ldiradi.
  //
  // NARXI: bazani yuklash (~47 000 o'qish) + yozuv. ATAYLAB bir marta
  // bajariladi — shundan keyin har import 7 ta so'rov bilan kifoyalanadi.
  // Shu sababli bu yerda baza yuklangan bo'lishi SHART: qayta yuklamaymiz.
  const backfillQHash = async () => {
    if (!questionsLoaded) {
      showToast('Avval «Bazani yuklash» tugmasini bosing', 'error');
      return;
    }
    const missing = questions.filter(q => !q.qHash && q.q);
    if (missing.length === 0) {
      showToast('Hamma savolda qHash bor — to’ldirish kerak emas', 'success');
      return;
    }
    confirmAction(
      `${missing.length.toLocaleString('uz-UZ')} ta savolga dublikat kaliti yoziladi. ` +
      'Shundan keyin ommaviy import butun bazani yuklamasdan ishlaydi. Davom etamizmi?',
      async () => {
        setQhashBusy(true);
        setQhashProgress({ done: 0, total: missing.length });
        try {
          for (let i = 0; i < missing.length; i += 400) {
            const chunk = missing.slice(i, i + 400);
            const batch = writeBatch(db);
            chunk.forEach(q => batch.update(doc(db, 'questions', q.id), { qHash: qHashOf(q.q) }));
            await batch.commit();
            setQhashProgress({ done: Math.min(i + 400, missing.length), total: missing.length });
          }
          // Lokal ro'yxatni ham moslaymiz — qayta yuklash shart bo'lmasin.
          setQuestions(prev => prev.map(q => (q.qHash || !q.q ? q : { ...q, qHash: qHashOf(q.q) })));
          await setDoc(doc(db, 'settings', 'qhash'), {
            backfilledAt: new Date().toISOString(),
            count: missing.length,
          }, { merge: true });
          logAdminAction('question.qhashBackfill', null, { count: missing.length });
          showToast(`✅ ${missing.length} ta savolga kalit yozildi`, 'success');
        } catch (e) {
          showToast('Xatolik: ' + e.message, 'error');
        } finally {
          setQhashBusy(false);
          setQhashProgress(null);
        }
      }
    );
  };

  const loadSuspicious = async () => {
    if (suspLoading) return;
    setSuspLoading(true);
    setSuspError(null);
    try {
      const snap = await getDocs(query(
        collection(db, 'questionStats'),
        where('shown', '>=', SUSP_MIN_SHOWN),
        orderBy('shown', 'desc'),
        limit(SUSP_SCAN_LIMIT),
      ));

      const rows = [];
      snap.forEach(d => {
        const s = d.data();
        const shown = s.shown || 0;
        if (shown < SUSP_MIN_SHOWN) return;
        const wrongRate = (s.wrong || 0) / shown;
        if (wrongRate < SUSP_MIN_WRONG_RATE) return;
        rows.push({
          id: d.id,
          shown,
          wrong: s.wrong || 0,
          wrongRate,
          picks: s.picks || {},
          avgMs: s.msCount ? Math.round(s.msSum / s.msCount) : null,
          // Zarar o'lchovi: 90% xato x 40 ko'rsatish < 70% xato x 900 ko'rsatish.
          score: shown * wrongRate,
        });
      });
      rows.sort((a, b) => b.score - a.score);
      const top = rows.slice(0, SUSP_TOP);

      // Savol matnini olish — `documentId() in` 30 talik bo'laklarda.
      // 20 ta savol = 1 ta so'rov.
      const byId = new Map();
      for (let i = 0; i < top.length; i += 30) {
        const ids = top.slice(i, i + 30).map(r => r.id);
        if (ids.length === 0) break;
        const qs = await getDocs(query(
          collection(db, 'questions'),
          where(documentId(), 'in', ids),
        ));
        qs.forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));
      }

      setSuspicious(top.map(r => {
        const q = byId.get(r.id) || null;
        return { ...r, question: q, diagnosis: diagnoseQuestion(r, q) };
      }));
      setSuspLoaded(true);
    } catch (e) {
      // Indeks yo'q bo'lsa Firestore aniq havola beradi — xabarni yashirmaymiz.
      setSuspError(e.message);
    } finally {
      setSuspLoading(false);
    }
  };

  // ── «So'nggi 15 daqiqada faol» (ADMIN UX AUDIT 2026-08-18, A-3) ──────
  //
  // MUAMMO: panel «real vaqt» ko'rsatkichi deb kunlik cron yozgan raqamni
  // ko'rsatardi. U Toshkent vaqti bilan 11:00 da hisoblanib, keyingi kunga
  // qadar O'ZGARMASDI — ya'ni «hozir nechta odam test yechyapti?» degan
  // savolga javob yo'q edi.
  //
  // NEGA AYNAN 15 DAQIQA: Firestore'da haqiqiy «online» holati yo'q — u
  // Realtime Database presence talab qiladi (alohida mahsulot, ulanish
  // hisoblagichi bilan). Bor bo'lgan eng yaqin va ROST signal —
  // `userStats.lastActiveAt` (mijoz test yakunlaganda yozadi).
  //
  // Shuning uchun yorliq ATAYLAB «hozir onlayn» EMAS, «so'nggi 15 daqiqada
  // faol» deb yozilgan: panel o'zini haqiqatdan aniqroq ko'rsatmasligi kerak.
  //
  // NARXI: 1 ta agregatsiya so'rovi (hujjatlar yuklanmaydi) har 60 soniyada,
  // FAQAT statistika tabi ochiq VA sahifa ko'rinib turganda. Tab fonda
  // qolsa so'rov to'xtaydi — ochiq unutilgan panel kvota yemasin.
  useEffect(() => {
    if (!isAdmin || tab !== 'stats') return undefined;

    let cancelled = false;
    const read = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const snap = await getCountFromServer(query(
          collection(db, 'userStats'),
          where('lastActiveAt', '>=', since),
        ));
        if (!cancelled) setLiveActive(snap.data().count);
      } catch {
        // Indeks yoki kvota — jimgina '—' bo'lib qoladi, panel yiqilmaydi.
        if (!cancelled) setLiveActive(null);
      }
    };

    read();
    const id = setInterval(read, 60000);
    document.addEventListener('visibilitychange', read);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', read);
    };
  }, [isAdmin, tab]);

  const loadAllQuestions = async () => {
    if (questionsLoaded || questionsLoading) return;
    setQuestionsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setQuestionsLoaded(true);
    } catch (e) {
      showToast('Savollarni yuklashda xatolik: ' + e.message, 'error');
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || tab !== 'tariffs') return;
    const unsub = onSnapshot(doc(db, 'settings', 'premium'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().plans) {
        setTariffs(docSnap.data().plans);
      } else {
        setTariffs([{ id: 'lifetime', name: 'Cheksiz Pro', price: 15000, durationMonths: 999 }]);
      }
    });
    return () => unsub();
  }, [tab, isAdmin]);

  // ── Referral jamlanmasi — YAGONA formula ──
  // ⚠️ ADMIN AUDIT 2026-08-06, A-9 BAND: ilgari jamlanma IKKI xil hisoblanardi.
  // Boshlang'ich yuklashda `pending = status === 'pending'`, har amaldan keyin
  // esa `pending = total - paid`. Jadval `status === 'active'` holatini ham
  // chizadi — demak 'active' yozuvlari bo'lsa, boshida ular hech qayerda
  // sanalmasdi (total ≠ paid + pending), bitta tugma bosilgach esa BIRDAN
  // `pending` ga qo'shilib, raqam sakrardi.
  // `totalBonus` ham endi haqiqiy `bonusAmount` dan yig'iladi — qattiq
  // kodlangan 15000 dan emas (summa o'zgarsa jimgina noto'g'ri bo'lardi).
  const summarizeReferrals = (refs) => {
    const paid = refs.filter(r => r.status === 'paid').length;
    return {
      total: refs.length,
      paid,
      pending: refs.filter(r => r.status !== 'paid').length,
      totalBonus: refs.reduce((sum, r) => sum + (r.bonusPaid ? (r.bonusAmount || 15000) : 0), 0),
    };
  };

  // ── Referral tab ma'lumotlarini yuklash ──
  // A-15: chegarasiz o'qish → `limit(LIST_PAGE_SIZE)`.
  // `createdAt` har referral hujjatida bor (api/find-referral.js:181), shuning
  // uchun `orderBy` hech kimni ro'yxatdan tushirib qoldirmaydi.
  const loadReferrals = async ({ force = false } = {}) => {
    if (!force && allReferrals.length > 0) return;
    setReferralLoading(true);
    setReferralError(null);
    try {
      const snap = await getDocs(query(
        collection(db, 'referrals'),
        orderBy('createdAt', 'desc'),
        limit(LIST_PAGE_SIZE),
      ));
      const refs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllReferrals(refs);
      setReferralSummary(summarizeReferrals(refs));
    } catch (e) {
      console.error("Referrals load error:", e);
      setReferralError(e?.message || 'Yuklashda xatolik');
      showToast("Referral ma'lumotlarini yuklashda xatolik: " + e.message, 'error');
    }
    setReferralLoading(false);
  };

  useEffect(() => {
    if (!isAdmin || tab !== 'referrals') return;
    loadReferrals();
  }, [tab, isAdmin]);

  // Bitta referral yozuvini LOKAL yangilaydi va jamlanmani qayta hisoblaydi.
  // Admin amalidan keyin butun kolleksiyani qayta o'qish shart emas (T-8).
  const applyReferralPatch = (refId, patch) => {
    const next = allReferrals.map(r => (r.id === refId ? { ...r, ...patch } : r));
    setAllReferrals(next);
    setReferralSummary(summarizeReferrals(next));
  };

  // ═══ Admin: Referral statusini "to'ladi" ga o'zgartirish ═══
  const handleMarkReferralPaid = async (refId, referrerId) => {
    confirmAction("Bu referralni 'To'ladi' deb belgilashni tasdiqlaysizmi?", async () => {
    try {
      // ⚠️ AUDIT 2026-08-06, T-9 BAND — avval `bonusPaid` OLDINDAN tekshirilmasdi:
      // ikki marta bosilsa (yoki allaqachon to'langan referralda) `increment(15000)`
      // qayta bajarilib, referrer ikki barobar bonus olardi. payment-webhook.js ham
      // bonus beradi — ya'ni qo'sh hisoblash ehtimoli bor edi.
      // Endi tekshiruv va ikkala yozuv BITTA tranzaksiyada (redeem-promo.js naqshi).
      await runTransaction(db, async (tx) => {
        const refDoc = doc(db, 'referrals', refId);
        const snap = await tx.get(refDoc);
        if (!snap.exists()) throw new Error('NOT_FOUND');
        if (snap.data().bonusPaid === true) throw new Error('ALREADY_PAID');

        tx.update(refDoc, {
          status: 'paid',
          bonusPaid: true,
          bonusAmount: 15000,
          paidAt: new Date().toISOString(),
        });
        // Referrer ga bonus qo'shish — shu tranzaksiya ichida, ya'ni referral
        // hujjati yangilanmasa bonus ham berilmaydi (va aksincha).
        if (referrerId) {
          tx.update(doc(db, 'users', referrerId), {
            referralBonus: increment(15000),
          });
        }
      });
      logAdminAction('referral.mark_paid', refId, { referrerId: referrerId || null, bonus: 15000 });
      showToast("✅ Referral to'langan deb belgilandi va bonus berildi!", 'success');
      // Ro'yxatni LOKAL yangilash — ilgari bu yerda butun `referrals` kolleksiyasi
      // qayta o'qilardi (T-8). Nima o'zgarganini bilamiz, qayta o'qish shart emas.
      applyReferralPatch(refId, {
        status: 'paid', bonusPaid: true, bonusAmount: 15000, paidAt: new Date().toISOString(),
      });
    } catch (e) {
      if (e.message === 'ALREADY_PAID') {
        showToast('Bu referral bo\'yicha bonus allaqachon berilgan', 'info');
      } else if (e.message === 'NOT_FOUND') {
        showToast('Referral topilmadi (o\'chirilgan bo\'lishi mumkin)', 'error');
      } else {
        showToast("Xatolik: " + e.message, 'error');
      }
    }
    });
  };

  // ═══ Admin: Referral bepul premiumini bekor qilish ═══
  const handleCancelReferralPremium = async (referredId, referralDocId) => {
    confirmAction("Bu foydalanuvchining bepul premium statusini bekor qilishni tasdiqlaysizmi?", async () => {
    try {
      // ⚠️ ADMIN AUDIT 2026-08-06, A-2 BAND — avval `isPremium: false` SHARTSIZ
      // yozilardi. Referral orqali kelgan odam keyinchalik HAQIQIY to'lov qilgan
      // bo'lsa (premiumPlan: 'paid'), uning referral yozuvida `freeExpire` hamon
      // turardi va bu tugma ko'rinardi. Bir bosish — pul to'lagan mijoz Pro'ni
      // yo'qotardi (AuthContext.jsx:42 `isPremium && premiumPlan === 'paid'`
      // sharti buziladi), `premiumExpire` esa kelajakda turgani uchun
      // cron-daily ham uni tiklamasdi.
      // Endi obuna turi tranzaksiya ichida o'qiladi va to'langan obunaga TEGILMAYDI.
      const keptPaid = await runTransaction(db, async (tx) => {
        const refDoc = doc(db, 'referrals', referralDocId);
        const userDoc = referredId ? doc(db, 'users', referredId) : null;
        // Firestore tranzaksiyasida barcha o'qishlar yozuvlardan OLDIN bo'lishi shart
        const uSnap = userDoc ? await tx.get(userDoc) : null;
        const uData = uSnap?.exists() ? uSnap.data() : null;
        const isPaid = uData?.premiumPlan === 'paid';

        tx.update(refDoc, { freeExpire: null });
        if (userDoc && uData) {
          tx.update(userDoc, isPaid
            // To'lagan mijoz: faqat referral bepul muddatini olib tashlaymiz
            ? { freeMonthExpire: null }
            // Bepul premium: to'liq bekor qilish. `premiumExpire`/`premiumPlan`
            // ham tozalanadi — togglePremium'dagi bekor qilish yo'li bilan bir xil.
            : { isPremium: false, freeMonthExpire: null, premiumExpire: null, premiumPlan: 'expired' });
        }
        return isPaid;
      });
      showToast(
        keptPaid
          ? "Bepul muddat bekor qilindi. Foydalanuvchi TO'LOV qilgani uchun Pro statusi saqlandi."
          : "✅ Bepul premium status bekor qilindi!",
        keptPaid ? 'info' : 'success'
      );
      logAdminAction('referral.cancel_free', referralDocId, { referredId: referredId || null, toloviBor: keptPaid });
      // Lokal yangilash — butun kolleksiyani qayta o'qimaymiz (T-8)
      applyReferralPatch(referralDocId, { freeExpire: null });
    } catch (e) {
      showToast("Xatolik: " + e.message, 'error');
    }
    });
  };

  const handleSolve = async (fbId) => {
    try {
      await updateDoc(doc(db, 'objections', fbId), { solved: true, solvedBy: user.email, solvedAt: new Date() });
      showToast("✅ E'tiroz hal qilindi!", 'success');
    } catch (e) {
      console.error('admin amali xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    }
  };

  const handleDeleteObjection = (fbId) => {
    confirmAction("E'tirozni o'chirishni tasdiqlaysizmi?", async () => {
try {
      await deleteDoc(doc(db, 'objections', fbId));
      showToast("🗑️ O'chirildi", 'info');
    } catch (e) {
      console.error('admin amali xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    }
    });
  };

  // ── "Savol qo'shildi" deb belgilash + so'ragan foydalanuvchilarga bildirishnoma ──
  const handleFulfillRequest = (group) => {
    const pendingItems = group.items.filter(i => !i.fulfilled);
    if (pendingItems.length === 0) return;
    confirmAction(`"${group.topicName}" mavzusiga savol qo'shildi deb belgilab, so'rov yuborgan ${pendingItems.length} ta foydalanuvchiga bildirishnoma yuborilsinmi?`, async () => {
      try {
        // 1) So'rovlarni "bajarildi" deb belgilash (400 talik batch)
        const fulfilledAt = new Date().toISOString();
        for (let i = 0; i < pendingItems.length; i += 400) {
          const batch = writeBatch(db);
          pendingItems.slice(i, i + 400).forEach(it =>
            batch.update(doc(db, 'questionRequests', it.fbId), { fulfilled: true, fulfilledAt })
          );
          await batch.commit();
        }
        // 2) Har bir foydalanuvchiga SHAXSIY subkolleksiyaga bildirishnoma.
        // Ilgari ochiq `notifications` kolleksiyasiga yozilardi — bu ikki muammo
        // tug'dirardi: (a) maxfiylik, xabar hammaga o'qish uchun ochiq edi;
        // (b) yuk, bir marta 50 ta so'rovni bajarsak ochiq kolleksiyaga 50 ta
        // hujjat tushib, uni HAR BIR foydalanuvchi ilova ochganda o'qirdi.
        await Promise.all(pendingItems.map(it => addDoc(
          collection(db, 'users', it.uid, 'notifications'), {
            title: '✅ Yangi savollar qo\'shildi!',
            message: `Siz so'ragan "${group.topicName}" mavzusiga yangi savollar qo'shildi. Hoziroq sinab ko'ring!`,
            type: 'success',
            read: false,
            date: new Date().toISOString(),
          })));
        showToast(`✅ Bajarildi! ${pendingItems.length} ta foydalanuvchiga bildirishnoma yuborildi`, 'success');
      } catch (e) {
        showToast('Xatolik: ' + e.message, 'error');
      }
    });
  };

  const handleDeleteRequestGroup = (group) => {
    confirmAction(`"${group.topicName}" bo'yicha ${group.items.length} ta so'rovni o'chirishni tasdiqlaysizmi?`, async () => {
      try {
        for (let i = 0; i < group.items.length; i += 400) {
          const batch = writeBatch(db);
          group.items.slice(i, i + 400).forEach(it => batch.delete(doc(db, 'questionRequests', it.fbId)));
          await batch.commit();
        }
        showToast("🗑️ So'rovlar o'chirildi", 'info');
      } catch (e) { showToast('Xatolik: ' + e.message, 'error'); }
    });
  };

  // ⚠️ ADMIN AUDIT 2026-08-06, A-5 va B-4 BANDLARI.
  //
  // AVVAL: `window.prompt("Necha kunga Pro berilsin?\n(bo'sh qoldiring — muddatsiz)")`.
  // Uch muammo:
  //  1. Bo'sh qoldirish `premiumExpire: null` yozardi. AuthContext.jsx:51 buni
  //     MANGU premium deb biladi va `api/cron-daily.js` ham bunday hisoblarga
  //     tegmaydi — ya'ni obuna hech qachon tugamasdi. Bu «premiumExpire —
  //     muddatning yagona manbasi» qoidasiga zid. Muddatsiz variant OLIB
  //     TASHLANDI (mavjud null-muddatli hisoblarga BU O'ZGARISH TEGMAYDI —
  //     ular alohida migratsiya qarori).
  //  2. `window.prompt` dizayn tizimidan tashqarida va TWA/PWA muhitida
  //     bloklanishi mumkin — bunda amal jimgina bajarilmasdi.
  //  3. Kun soni so'ralardi, aniq sana emas — «31-dekabrgacha bering»
  //     so'rovi qo'lda hisoblashni talab qilardi.
  const [premiumModal, setPremiumModal] = useState(null); // { userId, name, currentExpire, plan }
  const [premiumUntil, setPremiumUntil] = useState('');
  const [premiumSaving, setPremiumSaving] = useState(false);

  // Sana kiritish maydoni uchun `YYYY-MM-DD`
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const dayFromNow = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return isoDay(d); };

  const togglePremium = (userId, currentStatus) => {
    const u = users.find(x => x.id === userId);
    const label = u?.displayName || u?.shortId || u?.email || userId;

    // ── Bekor qilish ──
    if (currentStatus) {
      const paidWarning = u?.premiumPlan === 'paid'
        ? "\n\n⚠️ DIQQAT: bu foydalanuvchi Pro ni TO'LOV orqali olgan. Bekor qilsangiz to'langan obuna yo'qoladi."
        : '';
      confirmAction(`"${label}" foydalanuvchidan Pro statusini olib tashlaysizmi?${paidWarning}`, async () => {
        try {
          await withWriteTimeout(updateDoc(doc(db, 'users', userId), {
            isPremium: false,
            premiumExpire: null,
            premiumPlan: 'expired',
          }));
          setUsers(prev => prev.map(x => x.id === userId
            ? { ...x, isPremium: false, premiumExpire: null, premiumPlan: 'expired' } : x));
          logAdminAction('premium.revoke', userId, { oldingiReja: u?.premiumPlan || null });
          showToast("Pro bekor qilindi", 'info');
        } catch (e) {
          console.error('premium.revoke xatosi:', e?.code, e?.message);
          showToast(describeFirebaseError(e), 'error');
        }
      });
      return;
    }

    // ── Berish: aniq sana bilan ──
    setPremiumUntil(dayFromNow(30));
    setPremiumModal({ userId, name: label, currentExpire: u?.premiumExpire || null, plan: u?.premiumPlan || null });
  };

  const grantPremium = async () => {
    if (!premiumModal) return;
    const { userId } = premiumModal;

    if (!premiumUntil) { showToast('Tugash sanasini tanlang', 'error'); return; }
    // Kun oxirigacha amal qilsin — admin "31-dekabrgacha" deganda o'sha kun
    // ham kirishi kutiladi.
    const expire = new Date(`${premiumUntil}T23:59:59`);
    if (Number.isNaN(expire.getTime())) { showToast("Sana noto'g'ri", 'error'); return; }
    if (expire <= new Date()) { showToast("Sana kelajakda bo'lishi kerak", 'error'); return; }
    // 5 yildan uzoq muddat — deyarli har doim xato terish (masalan 2226).
    // Cheksiz obunani "juda uzoq sana" orqali qaytarib kiritmaslik uchun ham.
    const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 5);
    if (expire > maxDate) { showToast('Muddat 5 yildan oshmasin — sanani tekshiring', 'error'); return; }

    setPremiumSaving(true);
    try {
      const premiumExpire = expire.toISOString();
      // premiumPlan: 'admin' — 'paid' EMAS. Shu bois muddat o'tganda AuthContext
      // avtomatik tugatadi (to'lov/promo obunalariga tegmaydi).
      await withWriteTimeout(updateDoc(doc(db, 'users', userId), {
        isPremium: true,
        premiumExpire,
        premiumPlan: 'admin',
        premiumSince: new Date().toISOString(),
        premiumMethod: 'admin',
      }));
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, isPremium: true, premiumExpire, premiumPlan: 'admin' } : u));
      logAdminAction('premium.grant', userId, { gacha: premiumUntil });
      showToast(`Pro berildi — ${new Date(premiumExpire).toLocaleDateString('uz-UZ')} gacha ✅`, 'success');
      setPremiumModal(null);
    } catch (e) {
      // ⚠️ 2026-08-20 HODISASI. Bu yerda ilgari `showToast("Xatolik yuz berdi")`
      // turardi va u AMALDA HECH QACHON KO'RINMASDI. Sabab: kvota tugaganda
      // (`resource-exhausted`) Firestore promise'ni rad etmaydi — cheksiz qayta
      // uradi. Ya'ni `await` tugamaydi, `catch` ishga tushmaydi, `finally` ham
      // yonmaydi: tugma abadiy «saqlanmoqda» holatida qoladi.
      // Endi yozuv `withWriteTimeout` bilan chegaralangan va sabab aytiladi.
      console.error('premium.grant xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    } finally {
      setPremiumSaving(false);
    }
  };

  // ⚠️ ADMIN AUDIT 2026-08-06, A-13 BAND — avval bu amal TASDIQSIZ edi: bitta
  // bosish to'liq admin huquqini berardi (savol o'chirish, hisob yo'q qilish,
  // Pro tarqatish). Panelda 10 ta `confirmAction` bor edi, eng kuchli amal esa
  // ularning orasida emas edi. Tugma foydalanuvchi qatorida ⭐ yonida, 32×32 px —
  // telefonda noto'g'ri bosish real xavf.
  // Qo'shimcha: admin o'zidan huquqni olib, paneldan chiqib ketishi mumkin edi.
  // ⚠️ HAMKOR AUDITI 2026-08-15: rol tanlash `window.prompt` da edi ("1, 2 yoki
  // 3 kiriting"). Ikki muammo:
  //  1. `window.prompt` TWA/PWA (Play ilovasi) muhitida BLOKLANADI — tugma
  //     jimgina ishlamasdi. Aynan shu sabab D-8 bandida boshqa prompt'lar
  //     panel ichidagi formalarga ko'chirilgan edi.
  //  2. Raqam kiritish — xato bosish oson: "3" to'liq admin huquqi demak.
  // Endi panel ichidagi modal: variantlar ko'rinib turadi, hamkor kodi shu
  // yerda kiritiladi, xavfli variant esa alohida tasdiq oynasidan o'tadi.
  const [roleModal, setRoleModal] = useState(null); // { id, name, role, partnerCode }
  const [rolePartnerCode, setRolePartnerCode] = useState('');

  const handleManageRole = (u) => {
    if (u.id === user?.uid) {
      showToast("O'z rolingizni bu yerdan o'zgartira olmaysiz", 'error');
      return;
    }
    // Foydalanuvchi kartochkasi ochiq bo'lsa yopamiz: ikkita modal bir vaqtda
    // ochilsa, `useModalA11y` ning ikki fokus tutqichi bir-biriga xalaqit
    // beradi (Escape ikkalasini yopadi, fokus sakraydi).
    setUserCard(null);
    setRolePartnerCode(u.partnerCode || '');
    setRoleModal({
      id: u.id,
      name: u.displayName || u.email || u.shortId || 'Ustoz',
      role: u.role || 'user',
      partnerCode: u.partnerCode || null,
    });
  };

  // Rolni yozish — uchala variant uchun bitta yo'l (yozuv + ro'yxat + jurnal).
  const applyRole = (target, nextRole, partnerCode = null) => {
    const patch = nextRole === 'partner'
      ? { role: 'partner', partnerCode }
      : { role: nextRole, partnerCode: null };
    setRoleModal(null);
    const label = nextRole === 'admin' ? "To'liq admin"
      : nextRole === 'partner' ? `Hamkor ustoz (${partnerCode})`
      : 'Oddiy foydalanuvchi';
    const question = nextRole === 'admin'
      ? "DIQQAT: Foydalanuvchiga TO'LIQ ADMIN huquqini berasizmi?\n\nU savollarni tahrirlash va o'chirish, foydalanuvchi hisoblarini yo'q qilish va Pro tarqatish imkoniyatiga ega bo'ladi."
      : nextRole === 'partner'
        ? `Foydalanuvchiga HAMKOR USTOZ huquqi va '${partnerCode}' promokodi biriktirilsinmi?\n\nU faqat /partner sahifasidan o'z guruhi statistikasini ko'radi.`
        : 'Ushbu foydalanuvchini ODDIY FOYDALANUVCHI ga aylantirasizmi?';
    confirmAction(question, async () => {
      try {
        await updateDoc(doc(db, 'users', target.id), patch);
        setUsers(prev => prev.map(item => (item.id === target.id ? { ...item, ...patch } : item)));
        if (userCard?.id === target.id) setUserCard(prev => ({ ...prev, ...patch }));
        logAdminAction(
          nextRole === 'admin' ? 'role.grant_admin'
            : nextRole === 'partner' ? 'role.set_partner' : 'role.set_user',
          target.id,
          nextRole === 'partner' ? { partnerCode } : undefined,
        );
        showToast(`Rol o'zgartirildi: ${label}`, 'success');
      } catch (e) {
        console.error('admin amali xatosi:', e?.code, e?.message);
        showToast(describeFirebaseError(e), 'error');
      }
    });
  };

  const handleSetPartnerCode = (userId, currentPartnerCode) => {
    const u = users.find(x => x.id === userId)
      || userCard
      || { id: userId, role: 'partner', partnerCode: currentPartnerCode };
    handleManageRole({ ...u, id: userId, partnerCode: currentPartnerCode ?? u.partnerCode });
  };

  // ⚠️ AUDIT 2026-08-06, T-12 BAND — avval bu yerda faqat ikkita hujjat
  // o'chirilardi (`users/{uid}`, `userStats/{uid}`). Firebase AUTH hisobi
  // qolardi: foydalanuvchi kirishda davom etardi, lekin profil hujjati
  // yo'qligidan hamma joyda paywall ko'rardi — zombi hisob. Bildirishnoma
  // subkolleksiyasi ham qolib ketardi. Auth hisobini faqat Admin SDK o'chira
  // oladi, shuning uchun amal serverga ko'chirildi.
  const handleDeleteUser = async (userId, userEmail) => {
    confirmAction(`DIQQAT!!! Siz foydalanuvchini (${userEmail || userId}) tizimdan butunlay o'chirmoqchisiz.\n\nUshbu amal foydalanuvchining KIRISH HISOBINI, profilini, bildirishnomalarini va reytingdagi barcha natijalarini batamom supurib tashlaydi!\n\nTasdiqlaysizmi?`, async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Sessiya topilmadi — qaytadan kiring');

      const res = await fetch('/api/notify-admin?action=delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ uid: userId }),
      });
      // Dev muhitida /api/* serverless funksiyalari ishlamaydi va HTML qaytaradi
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error("API javob bermadi (lokal dev muhitida bu kutilgan holat)");
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || (data.errors || []).join('; ') || `HTTP ${res.status}`);
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      logAdminAction('user.delete', userId, { email: userEmail || null, tozalandi: data.deleted || null });
      showToast("🗑️ Hisob, profil va barcha bog'liq yozuvlar butunlay o'chirildi!", 'success');
    } catch (e) {
      console.error("Foydalanuvchini o'chirishda xatolik:", e);
      showToast("Xatolik yuz berdi: " + e.message, 'error');
    }
    });
  };

  // ── Parolni tiklash ──
  // Foydalanuvchi parolini unutsa, o'zi tiklay OLMAYDI: Firebase Auth emaili
  // soxta (`998XXXXXXXXX@iqro.uz`), demak tiklash xati yuboriladigan pochta
  // qutisi yo'q. Sabab va texnik tafsilot: api/notify-admin.js `reset-password`.
  // Shu sababli yagona yo'l — admin vaqtinchalik parol beradi.
  //
  // Natija TOAST'da ko'rsatilmaydi: toast o'z-o'zidan yo'qoladi va parol
  // ko'chirilmay qolib ketardi (uni qayta ko'rish imkoni yo'q — Firebase
  // parolni xeshlab saqlaydi, o'qib bo'lmaydi). Shuning uchun modal.
  const [resetPwModal, setResetPwModal] = useState(null); // { name, password }
  const [pwCopied, setPwCopied] = useState(false);

  const handleResetPassword = (u) => {
    const label = u.displayName || u.email || u.phoneNumber || u.id;
    confirmAction(
      `${label} uchun YANGI VAQTINCHALIK parol yaratilsinmi?\n\n`
      + `· Eski paroli darhol ishlamay qoladi.\n`
      + `· Ochiq qolgan seanslari uziladi — hamma qurilmada qaytadan kirishi kerak.\n`
      + `· Yangi parolni faqat SIZ ko'rasiz va o'ziga yetkazasiz.`,
      async () => {
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (!idToken) throw new Error('Sessiya topilmadi — qaytadan kiring');

          const res = await fetch('/api/notify-admin?action=reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ uid: u.id }),
          });
          // Dev muhitida /api/* serverless funksiyalari ishlamaydi va HTML qaytaradi
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            throw new Error('API javob bermadi (lokal dev muhitida bu kutilgan holat)');
          }
          const data = await res.json();
          if (!res.ok || !data.ok) {
            const known = {
              cannot_reset_admin: "Admin hisobining parolini bu yerdan tiklab bo'lmaydi",
              user_not_found: 'Auth hisobi topilmadi (profil hujjati yetim qolgan)',
              too_many_requests: "Juda ko'p urinish — bir soatdan keyin qayta urining",
              forbidden: 'Huquq yetarli emas',
            };
            throw new Error(known[data.error] || data.error || `HTTP ${res.status}`);
          }

          setPwCopied(false);
          setUserCard(null);
          setResetPwModal({ name: label, password: data.password });
          // Parolning O'ZI jurnalga YOZILMAYDI — `adminActions` panelda
          // o'qiladigan oddiy kolleksiya, jonli parol u yerda qolmasligi kerak.
          logAdminAction('user.reset_password', u.id, { kim: label });
        } catch (e) {
          console.error('Parolni tiklashda xatolik:', e);
          showToast('Xatolik: ' + e.message, 'error');
        }
      }
    );
  };

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetPwModal.password);
      setPwCopied(true);
    } catch {
      // HTTPS bo'lmagan muhitda clipboard API yo'q — parol maydonda ko'rinib
      // turibdi, admin qo'lda belgilab ko'chiradi.
      showToast("Ko'chirib bo'lmadi — parolni qo'lda belgilab oling", 'error');
    }
  };

  // ── CSV eksport (admin yozuvlari uchun) ──
  const exportCSV = (filename, headers, rows) => {
    if (!rows.length) { showToast("Eksport uchun ma'lumot yo'q", 'info'); return; }
    const esc = (v) => {
      const s = (v === undefined || v === null) ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM — Excel kirillni to'g'ri o'qiydi
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📥 ${rows.length} ta yozuv eksport qilindi`, 'success');
  };

  const exportUsers = () => {
    exportCSV('foydalanuvchilar',
      ['ID', 'Ism', 'Email', 'Telefon', 'Fan', 'Toifa', 'Pro', 'Rol', "Ro'yxatdan o'tgan", 'Oxirgi faollik'],
      filteredUsers.map(u => [
        u.shortId || '',
        u.displayName || '',
        u.email || '',
        u.phone || u.phoneNumber || '',
        subjectName(u.subject) || '',
        TOIFA_NAMES[u.teacherCategory] || u.teacherCategory || '',
        u.isPremium ? 'Ha' : "Yo'q",
        u.role || 'user',
        u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('uz-UZ')
          : (u.createdAt ? new Date(u.createdAt.seconds ? u.createdAt.seconds * 1000 : u.createdAt).toLocaleDateString('uz-UZ') : ''),
        u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('uz-UZ') : '',
      ])
    );
  };

  const exportReferrals = () => {
    exportCSV('referrallar',
      ['Taklif qiluvchi', 'Taklif qilingan', 'Sana', 'Status', 'Bonus', "Bonus to'langan"],
      allReferrals.map(r => [
        r.referrerName || '',
        r.referredName || '',
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('uz-UZ') : '',
        r.status || 'pending',
        r.bonusAmount || (r.bonusPaid ? 15000 : 0),
        r.bonusPaid ? 'Ha' : "Yo'q",
      ])
    );
  };

  // ── Savollarni JSON'ga zaxiralash (import bilan mos format; dedup/publish'dan oldin backup) ──
  const exportQuestionsJSON = () => {
    if (!questions.length) { showToast("Savollar hali yuklanmagan", 'info'); return; }
    // id'ni chiqarib tashlaymiz — fayl qayta import qilinganda toza bo'lishi uchun
    const data = questions.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `savollar_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📥 ${data.length} ta savol JSON ga zaxiralandi`, 'success');
  };


  // topicId asosida category avtomatik hisoblanadi
  // TOPICS ro'yxatidan qidiriladi

  const handleSaveQuestion = async () => {
    if (!newQ.q || newQ.q.trim() === '') {
      showToast("Xato: Savol matnini kiriting!", 'error');
      return;
    }
    if (newQ.opts.some(opt => !opt || opt.trim() === '')) {
      showToast("Xato: Barcha variantlarni to'ldiring!", 'error');
      return;
    }
    const correctVal = parseInt(newQ.correct);
    if (isNaN(correctVal) || correctVal < 0 || correctVal > 3) {
      showToast("Xato: To'g'ri javob indeksi 0, 1, 2 yoki 3 bo'lishi shart!", 'error');
      return;
    }

    try {
      // category ni topicId dan avtomatik hisoblab, savolga qo'shamiz
      const questionToSave = {
        ...newQ,
        correct: correctVal,
        category: getCategoryFromTopicId(newQ.topicId),
        // K-3: dublikat kaliti. Matn tahrirlansa QAYTA hisoblanadi —
        // aks holda eski hash qolib, keyingi import dublikatni topmasdi.
        qHash: qHashOf(newQ.q),
      };
      // Ilgari saqlashdan keyin BUTUN kolleksiya qayta o'qilardi (~47 000 o'qish)
      // — bitta savol uchun. Endi lokal ro'yxatni to'g'ridan-to'g'ri yangilaymiz.
      const wasEditing = editingQ;
      if (wasEditing) {
        await updateDoc(doc(db, 'questions', wasEditing.id), questionToSave);
        setQuestions(prev => prev.map(q =>
          q.id === wasEditing.id ? { ...q, ...questionToSave } : q
        ));
        logAdminAction('question.update', wasEditing.id, { topicId: questionToSave.topicId });
        showToast("✅ Savol yangilandi!", 'success');
      } else {
        const newRef = await addDoc(collection(db, 'questions'), questionToSave);
        setQuestions(prev => [...prev, { id: newRef.id, ...questionToSave }]);
        logAdminAction('question.create', newRef.id, { topicId: questionToSave.topicId });
        showToast("✅ Yangi savol qo'shildi!", 'success');
      }
      setPendingPublish(true); // B-6: publish eslatmasi
      setIsAdding(false);
      setEditingQ(null);
      setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' });
    } catch (e) {
      console.error('admin amali xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    }
  };

  // Dublikatlarni tahlil qiladi (aniq + yaqin-takror), O'CHIRMAYDI — preview ochadi.
  const analyzeDuplicates = () => {
    // ⚠️ AUDIT 2026-08-06, T-19 BAND — tahlil har savol uchun trigram `Set`
    // quradi. 45 000 savolda bu o'n millionlab satr obyekti, ya'ni yuzlab MB
    // xotira va asosiy oqimda uzoq qotish (`setTimeout` yordam bermaydi —
    // hisob baribir bitta blokda ketadi). Brauzer tabi qulashi mumkin edi.
    // Endi katta hajmda avval fan filtri talab qilinadi: fan bo'yicha ~3 000
    // savol — xavfsiz va tahlil sifatiga ta'sir qilmaydi (dublikatlar deyarli
    // doim bitta fan ichida bo'ladi).
    // ⚠️ ADMIN AUDIT 2026-08-06, A-7 BAND — bu guard YO'Q edi. Baza yuklanmagan
    // bo'lsa `questions` bo'sh → poolSize 0 → hech qanday klaster topilmaydi →
    // yashil "Takroriy savollar topilmadi!" toasti chiqardi. Admin bazada
    // dublikat yo'q degan XATO xulosaga kelardi.
    // JSON import (`processJsonQuestions`) va zaxira (`exportQuestionsJSON`)
    // da bu tekshiruv allaqachon bor edi — faqat shu yo'l unutilgan.
    if (!questionsLoaded) {
      showToast("Avval «Savollarni yuklash» tugmasini bosing — busiz dublikat tahlili bo'sh natija beradi", 'error');
      return;
    }

    const scopeCheck = questionCategoryFilter !== 'all' ? questionCategoryFilter : 'all';
    const poolSize = scopeCheck === 'all'
      ? questions.length
      : questions.filter(q => q.category === scopeCheck).length;
    if (poolSize > DUP_MAX_POOL) {
      showToast(
        `Juda katta hajm (${poolSize} ta savol). Avval yuqoridagi fan filtrini tanlang — aks holda brauzer qotib qoladi.`,
        'error'
      );
      return;
    }

    setDupAnalyzing(true);
    // og'ir hisob UI ni bloklamasligi uchun keyingi tick'da
    setTimeout(() => {
    try {
      const scope = questionCategoryFilter !== 'all' ? questionCategoryFilter : 'all';
      const pool = scope === 'all' ? questions : questions.filter(q => q.category === scope);
      const items = pool.map(q => {
        const norm = normalizeText(q.q);
        return { id: q.id, q: q.q, category: q.category, topicId: q.topicId, explen: (q.explanation || '').length, norm, tris: trigrams(norm) };
      });
      const n = items.length;

      // Union-find
      const parent = items.map((_, i) => i);
      const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

      // 1) Aniq dublikat: bir xil normalized matn
      const byNorm = new Map();
      items.forEach((it, i) => {
        if (!it.norm) return;
        if (byNorm.has(it.norm)) union(i, byNorm.get(it.norm));
        else byNorm.set(it.norm, i);
      });

      // 2) Yaqin dublikat: trigram inverted-index bloklash → nomzod juftlar
      const index = new Map();
      items.forEach((it, i) => { for (const t of it.tris) { if (!index.has(t)) index.set(t, []); index.get(t).push(i); } });
      for (let i = 0; i < n; i++) {
        const cand = new Map();
        for (const t of items[i].tris) {
          const arr = index.get(t);
          if (!arr || arr.length > 200) continue; // juda keng trigramni o'tkaz (tezlik)
          for (const j of arr) if (j > i) cand.set(j, (cand.get(j) || 0) + 1);
        }
        for (const [j, shared] of cand) {
          if (find(i) === find(j)) continue;
          const minSize = Math.min(items[i].tris.size, items[j].tris.size);
          if (shared < minSize * 0.5) continue; // arzon prefilter
          if (jaccard(items[i].tris, items[j].tris) >= DUP_SIM_THRESHOLD) union(i, j);
        }
      }

      // Klasterlash
      const clusters = new Map();
      for (let i = 0; i < n; i++) { const r = find(i); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(i); }
      const groups = [];
      let totalRemove = 0;
      for (const idxs of clusters.values()) {
        if (idxs.length < 2) continue;
        idxs.sort((a, b) => items[b].explen - items[a].explen); // eng to'liq (uzun izoh) saqlanadi
        const keepI = idxs[0];
        const removed = idxs.slice(1).map(j => ({
          id: items[j].id, q: items[j].q, category: items[j].category, topicId: items[j].topicId,
          sim: Math.round(jaccard(items[keepI].tris, items[j].tris) * 100),
        }));
        totalRemove += removed.length;
        groups.push({ keep: { id: items[keepI].id, q: items[keepI].q, topicId: items[keepI].topicId }, removed });
      }
      groups.sort((a, b) => b.removed.length - a.removed.length);

      if (totalRemove === 0) { showToast('Takroriy savollar topilmadi!', 'success'); setDupPreview(null); }
      else setDupPreview({ groups, totalRemove, scope: scope === 'all' ? 'Barchasi' : scope });
    } catch (e) {
      showToast('Tahlilda xatolik: ' + e.message, 'error');
    } finally {
      setDupAnalyzing(false);
    }
    }, 50);
  };

  // Preview tasdiqlangach — dublikatlarni Firestore'dan o'chiradi (400 talik batch).
  const executeDuplicateDeletion = async () => {
    if (!dupPreview) return;
    const removeIds = dupPreview.groups.flatMap(g => g.removed.map(r => r.id));
    setDupDeleting(true);
    try {
      showToast(`${removeIds.length} ta dublikat o'chirilmoqda...`, 'info');
      for (let i = 0; i < removeIds.length; i += 400) {
        const batch = writeBatch(db);
        removeIds.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'questions', id)));
        await batch.commit();
      }
      logAdminAction('question.dedupe', dupPreview.scope, { ochirildi: removeIds.length, guruh: dupPreview.groups.length });
      setPendingPublish(true); // B-6
      showToast(`Muvaffaqiyatli! ${removeIds.length} ta dublikat o'chirildi. 🎉`, 'success');
      // Ilgari butun kolleksiya qayta o'qilardi (~47 000 o'qish).
      // O'chirilgan ID'lar bizda bor — lokal ro'yxatdan olib tashlaymiz.
      const removedSet = new Set(removeIds);
      setQuestions(prev => prev.filter(q => !removedSet.has(q.id)));
      setDupPreview(null);
    } catch (e) {
      showToast("O'chirishda xatolik: " + e.message, 'error');
    } finally {
      setDupDeleting(false);
    }
  };

  // ── Savol keshini bekor qilish (foydalanuvchilarga yangilanishni yetkazish) ──
  //
  // ⚠️ AUDIT 2026-08-05, 2-BAND — TUZATILDI.
  // AVVAL bu funksiya barcha savollarni yig'ib Storage'ga `bundles/<fan>.json`
  // qilib yuklardi, `getDownloadURL()` bilan havola olardi va uni
  // `settings/version.urls` ga yozardi. Uch jihatdan xavfli edi:
  //
  //   1. getDownloadURL() `?token=...` havolasi qaytaradi — u Storage
  //      xavfsizlik QOIDALARINI BUTUNLAY CHETLAB O'TADI va autentifikatsiyasiz,
  //      muddatsiz ishlaydi.
  //   2. `settings` hujjatini HAR BIR kirgan foydalanuvchi o'qiy oladi
  //      (firestore.rules: `allow read: if isLoggedIn()`), ya'ni o'sha havola
  //      bepul hisob uchun ham ko'rinardi → ~47k savollik pullik baza oqib
  //      ketardi.
  //   3. Bir tugma bosish bilan butun `questions` kolleksiyasi mijoz brauzeriga
  //      yuklanardi (~47 000 o'qish).
  //
  // Endi bu tugma FAQAT `dbVersion` ni oshiradi — ilovaga aynan shu kerak:
  // TestPage/ExamPage localforage keshini `dbVersion` o'zgargani bo'yicha
  // bekor qiladi va savollarni /api/get-questions orqali (premium tekshiruvi
  // bilan) qaytadan oladi. Storage'ga hech narsa yozilmaydi.
  //
  // Bir xil mantiq CLI'da: scripts/bump-questions-version.mjs
  const handlePublishBundles = async () => {
    confirmAction(
      "Foydalanuvchilarga savol yangilanishini yetkazasizmi? Ularning ilovasidagi kesh bekor qilinadi va savollar qayta yuklanadi.",
      async () => {
        setIsSyncing(true);
        try {
          const newVersion = Date.now();
          const nowIso = new Date().toISOString();

          // ⚠️ ADMIN AUDIT 2026-08-06, A-1 BAND — `settings/questionMeta` ni
          // butun repoda YAGONA yozuvchi `api/admin-publish.js:103` edi, uni
          // esa HECH KIM chaqirmasdi (grep bilan tasdiqlangan). Natijada
          // Dashboard.jsx:95 va OnboardingPage.jsx:320 dagi fan kartochkalari
          // "ishonch badge" i — fan bo'yicha savol soni — o'sha endpoint
          // oxirgi marta qo'lda ishga tushirilgan kunda MUZLAB qolgan edi.
          //
          // Endi son shu yerda hisoblanadi. Narxi: fan boshiga 1 ta
          // aggregatsiya so'rovi = 16 ta fan uchun ≈ 16 O'QISH.
          // `loadAllQuestions()` (~47 000 o'qish) SHART EMAS.
          const categories = [...new Set(
            TOPICS.map(t => (Array.isArray(t.category) ? t.category[0] : t.category)).filter(Boolean)
          )];
          const counted = await Promise.all(categories.map(cat =>
            getCountFromServer(query(collection(db, 'questions'), where('category', '==', cat)))
              .then(s => [cat, s.data().count])
              // Bitta fan yiqilsa qolganlari yozilaversin — badge'ning bir
              // qismi yangilanmagani butunlay yangilanmaganidan yaxshiroq
              .catch(() => null)
          ));
          const questionMeta = {};
          counted.filter(Boolean).forEach(([cat, count]) => {
            questionMeta[cat] = { count, updatedAt: nowIso };
          });

          await setDoc(doc(db, 'settings', 'version'), {
            dbVersion: newVersion,
            // `urls` ATAYLAB bo'shatiladi: eski publish qoldirgan ochiq
            // havolalar hamon o'sha hujjatda turishi mumkin.
            urls: {},
            updatedAt: nowIso,
          }, { merge: true });

          if (Object.keys(questionMeta).length > 0) {
            await setDoc(doc(db, 'settings', 'questionMeta'), questionMeta, { merge: true });
          }
          // Mijoz keshini bekor qilamiz (utils/settingsCache) — savol soni
          // badge'i va versiya hujjati shu qurilmada darhol yangilansin.
          invalidateSettings('questionMeta');
          invalidateSettings('version');

          setPendingPublish(false);
          logAdminAction('question.publish', null, {
            version: newVersion,
            fanlar: Object.keys(questionMeta).length,
          });
          showToast(
            `✅ Yangilanish yuborildi — ${Object.keys(questionMeta).length} ta fan bo'yicha savol soni ham yangilandi`,
            'success'
          );
        } catch (e) {
          console.error('Versiya yangilash xatosi:', e);
          showToast('Xatolik: ' + e.message, 'error');
        }
        setIsSyncing(false);
      }
    );
  };

  // ── Savol paketlarini qayta qurish (Storage) ────────────────────────────
  //
  // NEGA KERAK — bu platformaning eng qimmat nuqtasi edi:
  // `settings/version.bundles` bo'sh bo'lsa `api/get-questions` 404 beradi va
  // ilova TestPage/ExamPage dagi zaxira yo'lga tushadi — ya'ni HAR sovuq
  // yuklashda `getDocs(where('category','==',fan))` = fan boshiga ~2 900
  // FIRESTORE O'QISHI. Spark kunlik limiti (50 000) shunday ~17 ta yuklashga
  // yetadi, keyin ilova HAMMA uchun ishlamay qoladi.
  //
  // Paket qurilgach o'sha yo'l 2 ta o'qishga tushadi (users/{uid} +
  // settings/version) — savollarning o'zi Storage'dan keladi.
  //
  // XAVFSIZLIK: fayl MAXFIY yuklanadi va `getDownloadURL()` CHAQIRILMAYDI —
  // aynan o'sha `?token=` havolasi 2026-08-05 auditidagi teshik edi. Firestore'ga
  // faqat ICHKI YO'L (`bundles/<fan>.json`) yoziladi; uni o'qish Admin SDK
  // bilan faqat serverdan mumkin (storage.rules: `allow read: if false`).
  //
  // NARXI: bu tugma QO'SHIMCHA o'qish sarflamaydi — allaqachon yuklangan
  // ro'yxatdan quriladi. Shuning uchun avval «Bazani yuklash» kerak (u ataylab
  // qo'lda: ~45 000 o'qish). Ya'ni kuniga bir marta baza yuklab, paketni
  // qayta qurish — butun oy davomidagi eng qimmat amal.
  const handleRebuildBundles = async () => {
    if (!questionsLoaded || questions.length === 0) {
      showToast('Avval «Bazani yuklash» tugmasini bosing — paket shu ro\'yxatdan quriladi', 'error');
      return;
    }
    confirmAction(
      `Savol paketlari qayta quriladi va Storage'ga yuklanadi (${questions.length.toLocaleString('uz-UZ')} ta savol). ` +
      "Bu bir necha daqiqa olishi mumkin — sahifani yopmang. Yakunida foydalanuvchilar keshi ham yangilanadi.",
      async () => {
        setIsSyncing(true);
        try {
          // Fan bo'yicha guruhlash. `category` yo'q savol paketga tushmaydi —
          // u baribir hech qaysi fanda ko'rinmasdi (TestPage filtrlaydi).
          const groups = new Map();
          // ADMIN UX AUDIT 2026-08-18: «Muomaladan olish» (FixQuestionModal)
          // savolga `status: 'retired'` qo'yadi. Agar paket uni baribir olsa,
          // tugma SOXTA bo'lardi — aynan M-1 da tanqid qilingan naqsh.
          // Savol bazadan o'chmaydi (tarix va tiklash uchun), lekin
          // foydalanuvchiga bormaydi.
          let retiredSkipped = 0;
          for (const q of questions) {
            if (!q.category || typeof q.category !== 'string') continue;
            if (q.status === 'retired') { retiredSkipped++; continue; }
            if (!groups.has(q.category)) groups.set(q.category, []);
            groups.get(q.category).push(q);
          }
          if (retiredSkipped > 0) {
            console.info(`Paketga kirmadi (muomaladan olingan): ${retiredSkipped} ta`);
          }
          if (groups.size === 0) throw new Error('Fanga tegishli savol topilmadi');

          const nowIso = new Date().toISOString();
          const bundles = {};
          const questionMeta = {};
          const failed = [];

          // Ketma-ket yuklaymiz: 16 ta faylni bir vaqtda yuborish mobil
          // internetda ulanishni bo'g'adi va xatoni qaysi fan bergani
          // ko'rinmay qoladi.
          let done = 0;
          for (const [cat, list] of groups) {
            try {
              const blob = new Blob([JSON.stringify(list)], { type: 'application/json' });
              const path = `bundles/${cat}.json`;
              await uploadBytes(ref(storage, path), blob, {
                contentType: 'application/json',
                // Kesh yo'q: paket ustidan qayta yozilganda eski nusxa
                // qaytib qolmasin (serverdan o'qiydi, lekin GCS keshi bor).
                cacheControl: 'no-store',
              });
              bundles[cat] = { path, count: list.length, updatedAt: nowIso };
              questionMeta[cat] = { count: list.length, updatedAt: nowIso };
            } catch (e) {
              console.error(`Paket yuklash xatosi (${cat}):`, e);
              failed.push(cat);
            }
            done++;
            setSyncProgress({ done, total: groups.size });
          }

          if (Object.keys(bundles).length === 0) {
            throw new Error('Birorta paket yuklanmadi — Storage qoidalari deploy qilinganmi?');
          }

          // ⚠️ `merge: true` — QISMAN muvaffaqiyat holatida eski fanlarning
          // yo'li o'chib ketmasligi uchun. Bitta fan yiqilsa, qolgan 15 tasi
          // yangi paketdan ishlaydi, yiqilgani esa Firestore zaxirasidan.
          await setDoc(doc(db, 'settings', 'version'), {
            dbVersion: Date.now(),
            bundles,
            // Eski OCHIQ havolalar maydoni — doim bo'sh turishi shart.
            urls: {},
            updatedAt: nowIso,
          }, { merge: true });

          await setDoc(doc(db, 'settings', 'questionMeta'), questionMeta, { merge: true });

          setPendingPublish(false);
          logAdminAction('question.publish', null, {
            mode: 'bundles',
            fanlar: Object.keys(bundles).length,
            savollar: questions.length,
            ...(failed.length ? { xato: failed.join(',') } : {}),
          });
          showToast(
            failed.length
              ? `⚠️ ${Object.keys(bundles).length} ta fan yuklandi, ${failed.length} tasida xato: ${failed.join(', ')}`
              : `✅ ${Object.keys(bundles).length} ta fan paketi yuklandi — savol yuklash endi ~1000 barobar arzon`,
            failed.length ? 'error' : 'success'
          );
        } catch (e) {
          console.error('Paketlarni qurish xatosi:', e);
          showToast('Xatolik: ' + e.message, 'error');
        }
        setSyncProgress(null);
        setIsSyncing(false);
      }
    );
  };

  const handleDeleteQuestion = (id) => {
    confirmAction("Savolni o'chirishni tasdiqlaysizmi?", async () => {
try {
      await deleteDoc(doc(db, 'questions', id));
      logAdminAction('question.delete', id);
      setPendingPublish(true); // B-6
      showToast("🗑️ Savol o'chirildi", 'info');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (e) {
      console.error('admin amali xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    }
    });
  };

  const handleSaveTariff = async () => {
    // ⚠️ ADMIN AUDIT 2026-08-06, A-6 BAND — `durationMonths` VALIDATSIYASIZ edi.
    // Maydon tozalansa `parseInt('')` = NaN, saqlash tugmasi esa faqat
    // id/name/price ni tekshirardi. Firestore NaN ni qabul qiladi (yaroqli
    // double), keyin api/payment-webhook.js:273 da:
    //     if (durationMonths && durationMonths !== 999)   → NaN truthy, kiradi
    //     d.setMonth(d.getMonth() + NaN)                  → Invalid Date
    //     d.toISOString()                                 → RangeError
    // Bu `runTransaction` ichida — ya'ni MIJOZ PUL TO'LAYDI, Pro OLMAYDI.
    const price = Number(newTariff.price);
    const months = Number(newTariff.durationMonths);
    if (!Number.isFinite(price) || price <= 0) {
      showToast("Narx noto'g'ri — musbat son kiriting", 'error');
      return;
    }
    if (!Number.isInteger(months) || months < 1) {
      showToast("Muddat noto'g'ri — butun son (oy) kiriting, cheksiz uchun 999", 'error');
      return;
    }
    const normalized = { ...newTariff, price, durationMonths: months };
    try {
      let updatedTariffs = [...tariffs];
      if (editingTariff) {
        updatedTariffs = updatedTariffs.map(t => t.id === normalized.id ? normalized : t);
      } else {
        if (updatedTariffs.some(t => t.id === normalized.id)) {
          showToast("Bunday ID dagi tarif mavjud", 'error');
          return;
        }
        updatedTariffs.push(normalized);
      }
      // settings/premium hujjatini saqlash yoki yangilash (yo'q bo'lsa yaratiladi)
      await setDoc(doc(db, 'settings', 'premium'), { plans: updatedTariffs }, { merge: true });
      invalidateSettings('premium');
      logAdminAction('tariff.save', normalized.id, { price, months });
      showToast("✅ Tarif saqlandi!", 'success');
      setIsAddingTariff(false);
      setEditingTariff(null);
    } catch (e) {
      console.error('admin amali xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    }
  };

  const handleDeleteTariff = (tariffId) => {
    confirmAction("Tarifni o'chirishni tasdiqlaysizmi?", async () => {
try {
      const updatedTariffs = tariffs.filter(t => t.id !== tariffId);
      // ⚠️ A-12: ilgari `updateDoc` edi — u mavjud bo'lmagan hujjatda
      // `not-found` beradi. `settings/premium` yo'q bo'lgan holat kodda ochiq
      // ishlanadi (default `lifetime` tarifi ko'rsatiladi), ya'ni admin aynan
      // o'sha ko'rsatilgan tarifni o'chirmoqchi bo'lsa sababsiz xato olardi.
      await setDoc(doc(db, 'settings', 'premium'), { plans: updatedTariffs }, { merge: true });
      invalidateSettings('premium');
      logAdminAction('tariff.delete', tariffId);
      showToast("🗑️ Tarif o'chirildi", 'info');
    } catch (e) {
      console.error('admin amali xatosi:', e?.code, e?.message);
      showToast(describeFirebaseError(e), 'error');
    }
    });
  };

  const filtered = objections.filter(o => {
    const matchSearch = !search || o.question?.toLowerCase().includes(search.toLowerCase()) || o.topic?.toLowerCase().includes(search.toLowerCase()) || o.note?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterSolved === 'all' || (filterSolved === 'solved' ? o.solved : !o.solved);
    return matchSearch && matchFilter;
  });

  // E'tirozlarni savol matni bo'yicha guruhlash:
  // bir savolga ≥2 shikoyat = ehtimoliy xato savol → flag + ro'yxat boshiga
  const objKey = (o) => (o.question || '').trim().toLowerCase().slice(0, 100);
  const objectionCounts = {};
  objections.forEach(o => {
    const key = objKey(o);
    if (key) objectionCounts[key] = (objectionCounts[key] || 0) + 1;
  });
  const filteredSorted = [...filtered].sort((a, b) => {
    const ca = objectionCounts[objKey(a)] || 0;
    const cb = objectionCounts[objKey(b)] || 0;
    const fa = ca >= 2 && !a.solved ? 1 : 0;
    const fb = cb >= 2 && !b.solved ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return cb - ca;
  });

  const filteredUsers = users.filter(u => {
    // Fan filtri ATAYLAB mijoz tomonda: `where('subject','==',x)` ni
    // `orderBy('createdAt')` bilan birga ishlatish KOMPOZIT INDEKS talab
    // qiladi (tenglik + boshqa maydon bo'yicha tartiblash), u esa loyihada
    // e'lon qilinmagan. Aniq raqamlar baribir "Statistika" tabida —
    // bu filtr yuklangan ro'yxatni ko'zdan kechirish uchun.
    if (subjectFilter !== 'all') {
      const has = !!u.subject;
      if (subjectFilter === 'none' ? has : u.subject !== subjectFilter) return false;
    }
    // 2026-08-20: qidiruv `matchesUserSearch` ga ko'chirildi. Avvalgi kod
    // xom `toLowerCase()` bilan solishtirardi va butun qidiruv matnini BITTA
    // bo'lak deb qarardi. Uch nuqsoni bor edi:
    //  · «O‘monov» (tipografik apostrof) «O'monov» deb yozilsa topilmasdi;
    //  · «aziz omonov» deb yozilsa hech narsa chiqmasdi, chunki bazada ism
    //    «Omonov Aziz» tartibida — satr sifatida mos kelmaydi;
    //  · telefonni 998 siz («901234567») yozsa topilmasdi, chunki bazada
    //    raqam «998901234567» ko'rinishida saqlanadi.
    // Endi matn so'zlarga bo'linadi va har biri alohida izlanadi.
    return matchesUserSearch(u, userSearch);
  });

  // ── Fan kesimini ko'rsatishga tayyorlash ──
  // Saralash: eng ko'p o'qituvchili fan tepada — panel ochilganda birinchi
  // ko'zga tushadigan qator eng muhimi bo'lsin.
  //
  // «Savol yetishmaydi» belgisi ATAYLAB NISBIY: mutlaq son ("3000 dan kam")
  // aldaydi, chunki fanlar hajmi tabiiy ravishda har xil. Bu yerda fanning
  // FOYDALANUVCHI ulushi uning SAVOL ulushi bilan solishtiriladi — ya'ni
  // "talab bor, kontent yo'q" holati. 5% chegara kichik fanlarda shovqin
  // chiqmasligi uchun.
  //
  // Koeffitsiyent 0.5 — belgi FAQAT ulush ikki barobar past bo'lganda yonadi.
  // 0.6 da sinab ko'rildi: 4.9 savol/kishi bo'lgan fan ham belgilanib qoldi,
  // ya'ni ogohlantirish o'z ma'nosini yo'qotardi.
  const subjectRows = (() => {
    if (!subjectStats?.rows) return [];
    const assigned = subjectStats.rows.reduce((a, r) => a + r.total, 0);
    const totalQ = subjectStats.totalQuestions || 0;
    const maxTotal = Math.max(1, ...subjectStats.rows.map(r => r.total));
    return subjectStats.rows
      .map(r => {
        const userShare = assigned > 0 ? r.total / assigned : 0;
        const qShare = totalQ > 0 && r.questions != null ? r.questions / totalQ : null;
        return {
          ...r,
          barPct: Math.round((r.total / maxTotal) * 100),
          sharePct: Math.round(userShare * 100),
          proPct: r.total > 0 ? Math.round((r.premium / r.total) * 100) : null,
          perUser: r.total > 0 && r.questions != null ? r.questions / r.total : null,
          needsContent: qShare !== null && userShare >= 0.05 && qShare < userShare * 0.5,
        };
      })
      .sort((a, b) => b.total - a.total);
  })();

  const filteredQuestions = questions.filter(q => {
    const qText = q.q || '';
    const category = q.category || '';
    const topicId = q.topicId !== undefined ? q.topicId : '';

    const matchSearch = !questionSearch || qText.toLowerCase().includes(questionSearch.toLowerCase());
    const matchCategory = questionCategoryFilter === 'all' || category === questionCategoryFilter;
    const matchTopic = questionTopicFilter === 'all' || String(topicId) === String(questionTopicFilter);

    return matchSearch && matchCategory && matchTopic;
  });

  const unsolvedCount = objections.filter(o => !o.solved).length;
  const solvedCount = objections.filter(o => o.solved).length;

  // ── "Ko'proq savol kerak" so'rovlarini mavzu bo'yicha guruhlash (talab darajasi) ──
  const requestGroups = Object.values(
    questionRequests.reduce((acc, r) => {
      const key = `${r.category}:${r.topicId}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          category: r.category,
          categoryName: r.categoryName || r.category,
          topicId: r.topicId,
          topicName: r.topicName || 'Aralash',
          items: [],
        };
      }
      acc[key].items.push(r);
      return acc;
    }, {})
  )
    .map(g => ({
      ...g,
      count: g.items.length,
      pending: g.items.filter(i => !i.fulfilled).length,
      latest: g.items.reduce((max, i) => {
        const t = i.timestamp?.toDate ? i.timestamp.toDate().getTime() : new Date(i.date || 0).getTime();
        return t > max ? t : max;
      }, 0),
    }))
    .sort((a, b) => {
      // Faol talab (bajarilmagan) tepada, keyin so'rovlar soni bo'yicha
      if ((a.pending > 0) !== (b.pending > 0)) return a.pending > 0 ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return b.latest - a.latest;
    });
  const pendingReqGroups = requestGroups.filter(g => g.pending > 0).length;

  // ── Modal a11y (D-3) ──
  // ⚠️ ADMIN AUDIT 2026-08-06: panelda 5 ta modal bor, hech birida
  // `role="dialog"`, `aria-modal`, Escape yoki fokus tutqichi YO'Q edi.
  // `useModalA11y` AYNAN shu muammo uchun yaratilgan (T-10) va 11 ta modalga
  // ulangan — admin paneli o'sha ro'yxatga kirmagan edi.
  const qModalRef = useModalA11y(isAdding, () => { setIsAdding(false); setEditingQ(null); });
  const tariffModalRef = useModalA11y(isAddingTariff, () => setIsAddingTariff(false));
  const dupModalRef = useModalA11y(!!dupPreview, () => { if (!dupDeleting) setDupPreview(null); });
  const premiumModalRef = useModalA11y(!!premiumModal, () => { if (!premiumSaving) setPremiumModal(null); });
  const userCardRef = useModalA11y(!!userCard, () => setUserCard(null));
  const roleModalRef = useModalA11y(!!roleModal, () => setRoleModal(null));
  const resetPwModalRef = useModalA11y(!!resetPwModal, () => setResetPwModal(null));

  // ── Tab ta'rifi bitta joyda ──
  // Ilgari 11 ta tab tugmasi qo'lda takrorlangan edi (har biri ~4 qator bir xil
  // JSX). Ro'yxatga aylantirish tab qo'shishni bir qatorlik ishga aylantiradi
  // va `role="tab"`/`aria-selected` ni HAMMASIGA bir xil beradi (D-4).
  const TABS = [
    { key: 'objections', label: "E'tirozlar", Icon: MessageCircle, badge: overview?.unsolvedObjections ?? unsolvedCount },
    { key: 'requests', label: "So'rovlar", Icon: Inbox, badge: pendingReqGroups },
    { key: 'questions', label: 'Savollar', Icon: FileText, badge: pendingPublish ? 1 : 0 },
    { key: 'users', label: 'Foydalanuvchilar', Icon: Users, badge: newDeletionRequests },
    { key: 'payments', label: "To'lovlar", Icon: CreditCard, badge: 0 },
    { key: 'stats', label: 'Statistika', Icon: BarChart3, badge: 0 },
    { key: 'tariffs', label: 'Tariflar', Icon: Zap, badge: 0 },
    { key: 'notifications', label: 'Xabarlar', Icon: Bell, badge: 0 },
    { key: 'referrals', label: 'Referral', Icon: Users, badge: 0 },
    { key: 'promos', label: 'Promo', Icon: Ticket, badge: 0 },
    { key: 'schools', label: 'Maktablar', Icon: School, badge: 0 },
    { key: 'partnerSets', label: "Hamkor to'plamlari", Icon: CalendarDays, badge: 0 },
    { key: 'journal', label: 'Jurnal', Icon: AlertTriangle, badge: unresolvedErrorCount },
  ];

  if (!isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--red)' }} />
        <div style={{ fontSize: 'var(--fs-5xl)', fontWeight: '800', color: 'var(--text)' }}>Ruxsat yo'q</div>
        <div style={{ color: 'var(--text3)', fontSize: 'var(--fs-lg)', textAlign: 'center' }}>
          Bu sahifa faqat adminlar uchun. <br/>
          Sizning hozirgi emailingiz: <b>{user?.email}</b> <br/>
          Roli: <b>{user?.role || 'user'}</b>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="admin-page">
      {/* Back button */}
      <button className="admin-back-btn" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} /> Bosh sahifaga qaytish
      </button>

      <div className="admin-header">
        <div className="admin-row">
          <div className="admin-badge"><Shield size={14} /> ADMIN</div>
          <div>
            <h1 className="admin-title">Boshqaruv Paneli</h1>
            <div className="admin-subtitle">{user?.email}</div>
          </div>
        </div>
        <div className="admin-quick-stats">
          <div className="admin-quick-stat">
            {/* A-17: `unsolvedCount` faqat yuklangan 200 ta e'tirozdan hisoblanadi.
                Aggregatsiya soni bo'lsa — HAQIQIY jami ko'rsatiladi. */}
            <div className="admin-quick-stat-val" style={{ color: 'var(--amber)' }}>
              {overview?.unsolvedObjections ?? unsolvedCount}
            </div>
            <div className="admin-quick-stat-lbl">Kutmoqda</div>
          </div>
          <div className="admin-quick-stat">
            <div className="admin-quick-stat-val" style={{ color: 'var(--green)' }}>{solvedCount}</div>
            <div className="admin-quick-stat-lbl">Hal qilindi</div>
          </div>
          <div className="admin-quick-stat">
            <div className="admin-quick-stat-val" style={{ color: 'var(--blue)' }}>{overview?.users ?? (users.length || '—')}</div>
            <div className="admin-quick-stat-lbl">Foydalanuvchi</div>
          </div>
        </div>
      </div>

      {/* Tab qatori — sichqoncha g'ildiragi va tugmalar bilan gorizontal suriladi */}
      <div className="admin-tabs-wrap">
        {canScrollLeft && (
          <button 
            className="admin-tabs-scroll-btn admin-tabs-scroll-btn--left" 
            onClick={() => scrollTabs('left')} 
            aria-label="Chapga surish"
            type="button"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div 
          className="admin-tabs" 
          ref={tabsContainerRef}
          onWheel={handleTabsWheel}
          role="tablist" 
          aria-label="Admin bo'limlari"
        >
          {TABS.map(({ key, label, Icon, badge }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              role="tab"
              aria-selected={tab === key}
              className={`admin-tab ${tab === key ? 'active' : ''}`}
              ref={tab === key ? activeTabRef : null}
              onClick={() => setTab(key)}
            >
              <Icon size={15} /> {label}
              {badge > 0 && <span className="admin-tab-badge">{badge}</span>}
            </motion.button>
          ))}
        </div>
        {canScrollRight && (
          <button 
            className="admin-tabs-scroll-btn admin-tabs-scroll-btn--right" 
            onClick={() => scrollTabs('right')} 
            aria-label="O'ngga surish"
            type="button"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {tab === 'promos' && <PromoTab />}

      {tab === 'schools' && <SchoolsTab />}

      {tab === 'partnerSets' && <PartnerSetsTab />}

      {tab === 'journal' && (
        <div>
          {/* Ikkita ko'rinish bitta tabda: client xatolari va admin amallari
              bir xil turdagi ma'lumot (kuzatuv). Alohida 13-tab telefondagi
              tab qatorini yanada siqib qo'yardi. */}
          <div className="admin-row-between" style={{ marginBottom: 14 }}>
            <div className="admin-segment" role="tablist" aria-label="Jurnal ko'rinishi">
              <button role="tab" aria-selected={journalView === 'errors'}
                className={journalView === 'errors' ? 'active' : ''}
                onClick={() => setJournalView('errors')}>
                Client xatolari{unresolvedErrorCount > 0 ? ` (${unresolvedErrorCount})` : ''}
              </button>
              <button role="tab" aria-selected={journalView === 'actions'}
                className={journalView === 'actions' ? 'active' : ''}
                onClick={() => setJournalView('actions')}>
                Admin amallari{adminActions.length > 0 ? ` (${adminActions.length})` : ''}
              </button>
            </div>
            <div className="admin-row--tight">
              {journalView === 'errors' && (
                <button
                  className={`btn btn-sm ${errorsShowResolved ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setErrorsShowResolved(v => !v)}
                >
                  {errorsShowResolved ? '✅ Hal qilinganlar ko\'rinmoqda' : 'Hal qilinganlarni ko\'rsatish'}
                </button>
              )}
              <button
                className="btn btn-sm btn-outline"
                onClick={() => (journalView === 'errors' ? loadErrorLogs() : loadAdminActions())}
                disabled={journalView === 'errors' ? errorsLoading : actionsLoading}
              >
                <RefreshCw size={14} className={(journalView === 'errors' ? errorsLoading : actionsLoading) ? 'spin' : ''} /> Yangilash
              </button>
            </div>
          </div>

          {/* ── Admin amallari (B-5) ── */}
          {journalView === 'actions' && (
            actionsLoading ? (
              <div className="admin-state-block">Yuklanmoqda...</div>
            ) : actionsError ? (
              <div className="admin-info-box admin-info-box--error">
                <div className="admin-info-title"><AlertCircle size={15} /> Jurnalni o'qib bo'lmadi</div>
                <div className="admin-info-text">{actionsError}</div>
              </div>
            ) : adminActions.length === 0 ? (
              <div className="admin-state-block">
                <div className="admin-empty-icon">🗒️</div>
                <div className="admin-empty-text">Hali qayd etilgan amal yo'q</div>
                <div className="admin-info-text" style={{ marginTop: 6 }}>
                  Jurnal shu tuzatishdan keyingi amallarni yozadi — undan oldingilari qayd etilmagan.
                </div>
              </div>
            ) : (
              <>
                {/* Jurnalning chegarasi ochiq aytiladi: adminlar bu ro'yxatga
                    "hamma o'zgarish shu yerda" deb ishonmasligi kerak. */}
                <div className="admin-info-box" style={{ marginBottom: 12 }}>
                  <div className="admin-info-text">
                    Jurnal <strong>panel orqali</strong> qilingan amallarni yozadi va
                    keyin <strong>o'zgartirib/o'chirib bo'lmaydi</strong> (firestore.rules).
                    Firebase konsoli yoki server skriptidan qilingan o'zgarish bu yerga tushmaydi.
                  </div>
                </div>

                {/* Filtr: "kim savolni o'chirdi?" degan savolga tez javob berish
                    uchun. `Xavflilar` — qaytarilmas amallar (o'chirish, huquq). */}
                <div className="admin-row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {[['all', 'Hammasi'], ['danger', '⚠️ Xavflilar'],
                    ...Object.entries(ADMIN_ACTION_GROUPS)].map(([key, label]) => (
                    <button
                      key={key}
                      className={`admin-chip ${actionFilter === key ? 'admin-chip--blue' : 'admin-chip--muted'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => setActionFilter(key)}
                      aria-pressed={actionFilter === key}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="admin-search-wrap" style={{ marginBottom: 12 }}>
                  <Search size={16} className="admin-search-icon" />
                  <input
                    className="admin-search"
                    value={actionSearch}
                    onChange={e => setActionSearch(e.target.value)}
                    placeholder="Admin emaili, hujjat ID yoki izoh bo'yicha qidirish..."
                    aria-label="Jurnalda qidirish"
                  />
                </div>

                {filteredActions.length === 0 ? (
                  <div className="admin-state-block">
                    <div className="admin-empty-text">Bu filtrga mos yozuv yo'q</div>
                    <div className="admin-info-text" style={{ marginTop: 6 }}>
                      Filtr faqat yuklangan {adminActions.length} ta yozuv ustida ishlaydi —
                      eskiroq amal uchun avval «Ko'proq yuklash».
                    </div>
                  </div>
                ) : (
                  <div className="admin-stack">
                    {filteredActions.map(a => {
                      const info = describeAdminAction(a.type);
                      // Server vaqti bilan mijoz vaqti orasidagi katta farq —
                      // yo admin kompyuterining soati noto'g'ri, yo yozuv
                      // qo'lda soxtalashtirilgan. Ikkalasi ham jurnal
                      // ishonchliligiga tegadi, shuning uchun ko'rsatiladi.
                      const serverMs = a.ts?.toDate ? a.ts.toDate().getTime() : null;
                      const skewMin = serverMs
                        ? Math.abs(serverMs - new Date(a.createdAt).getTime()) / 60000 : 0;
                      const metaLine = formatActionMeta(a.meta);
                      return (
                        <div key={a.id} className="admin-card">
                          <div className="admin-row-between">
                            <div style={{ minWidth: 0 }}>
                              <div className="admin-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: info.danger ? 'var(--red)' : 'var(--text)' }}>
                                  {info.danger && '⚠️ '}{info.label}
                                </span>
                                <span className="admin-chip admin-chip--muted">
                                  {ADMIN_ACTION_GROUPS[info.group] || info.group}
                                </span>
                              </div>
                              <div className="admin-meta-line" style={{ marginTop: 4 }}>
                                <span>👤 {a.actorEmail || a.actorUid}</span>
                                {a.target && <span>🎯 {a.target}</span>}
                                <span title={serverMs ? `Server: ${new Date(serverMs).toLocaleString()}` : 'Server vaqti yozilmagan (eski yozuv)'}>
                                  🕒 {new Date(a.createdAt).toLocaleString()}
                                </span>
                                {skewMin > 5 && (
                                  <span style={{ color: 'var(--amber)' }}>
                                    ⚠️ soat farqi ~{Math.round(skewMin)} daq.
                                  </span>
                                )}
                              </div>
                            </div>
                            {metaLine && (
                              <span className="admin-chip admin-chip--muted">{metaLine}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!actionsDone && (
                  <button
                    className="btn btn-outline"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={loadMoreAdminActions}
                    disabled={actionsMoreLoading}
                  >
                    {actionsMoreLoading ? 'Yuklanmoqda…' : `Ko'proq yuklash (+${JOURNAL_PAGE_SIZE})`}
                  </button>
                )}
              </>
            )
          )}

          {/* ── Client xatolari ── */}
          {journalView === 'errors' && (errorsLoading && errorLogs.length === 0 ? (
            <div className="admin-state-block">Yuklanmoqda...</div>
          ) : errorsError ? (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> Xatolarni o'qib bo'lmadi</div>
              <div className="admin-info-text">{errorsError}</div>
            </div>
          ) : visibleErrorLogs.length === 0 ? (
            <div className="admin-state-block">
              <CheckCircle size={40} style={{ color: 'var(--green)', marginBottom: 10 }} />
              <div style={{ fontWeight: 700 }}>Xatolar yo'q</div>
              <div className="admin-info-text">
                {errorLogs.length > 0
                  ? "Barcha xatolar hal qilindi deb belgilangan."
                  : "Production'da qayd etilgan client xatosi topilmadi."}
              </div>
            </div>
          ) : (
            <div className="admin-stack">
              {visibleErrorLogs.map(log => {
                const sev = log.severity || 'error';
                const ua = prettyUA(log.userAgent);
                // uid bo'lsa — ism/telefon; users'da topilmasa (akkaunt o'chirilgan)
                // uid'ning boshi ko'rsatiladi. uid umuman yo'q = kirmagan mehmon.
                const who = log.uid
                  ? (userLabel(errorUsers[log.uid]) || `${log.uid.slice(0, 8)}… (topilmadi)`)
                  : 'Kirmagan mehmon';
                const sevClass = sev === 'info' ? 'admin-chip--blue' : sev === 'warning' ? 'admin-chip--amber' : 'admin-chip--red';
                return (
                  <div key={log.id} className={`admin-card ${log.resolved ? 'admin-card--dim' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="admin-row" style={{ marginBottom: 4 }}>
                          <span className={`admin-chip ${sevClass}`}>{sev}</span>
                          {log.resolved && (
                            <span className="admin-chip admin-chip--green">✅ HAL QILINDI</span>
                          )}
                        </div>
                        <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word' }}>
                          {log.message}
                        </div>
                      </div>
                      <div className="admin-row--tight">
                        <button
                          className={`admin-icon-btn ${log.resolved ? 'is-on' : ''}`}
                          onClick={() => toggleErrorResolved(log.id, !log.resolved)}
                          aria-label={log.resolved ? "Hal qilinmagan deb belgilash" : "Hal qilindi deb belgilash"}
                          title={log.resolved ? "Hal qilinmagan deb belgilash" : "Hal qilindi deb belgilash"}
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          className="admin-icon-btn"
                          onClick={() => deleteErrorLog(log.id)}
                          aria-label="Xato yozuvini o'chirish"
                          title="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {log.stack && (
                      <pre style={{ margin: '8px 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text3)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflow: 'auto' }}>{log.stack}</pre>
                    )}
                    {log.context && (
                      <pre style={{ margin: '8px 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 8, padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 100, overflow: 'auto' }}>
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    )}
                    <div className="admin-meta-line" style={{ marginTop: 8 }}>
                      {log.url && <span>🔗 {log.url.replace(/^https?:\/\//, '')}</span>}
                      {ua && <span title={log.userAgent}>🌐 {ua}</span>}
                      <span title={log.uid || 'uid yozilmagan'} style={{ color: log.uid ? 'var(--text2)' : 'var(--text3)' }}>
                        👤 {who}
                      </span>
                      {log.createdAt && <span>🕒 {new Date(log.createdAt).toLocaleString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TO'LOVLAR (B-1) — «to'ladim, Pro yo'q» murojaatlarini tekshirish
          ════════════════════════════════════════════ */}
      {tab === 'payments' && (
        <div className="admin-stack">
          <div className="admin-row-between">
            <div className="admin-section-title admin-section-title--flush">
              <CreditCard size={18} style={{ color: 'var(--blue)' }} /> To'lovlar ({payments.length})
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => loadPayments({ force: true })} disabled={paymentsLoading}>
              <RefreshCw size={14} className={paymentsLoading ? 'spin' : ''} /> Yangilash
            </button>
          </div>

          <div className="admin-info-box">
            <div className="admin-info-text">
              Har muvaffaqiyatli to'lov <code>api/payment-webhook.js</code> tomonidan yoziladi.
              «To'ladim, lekin Pro kelmadi» murojaatida shu yerdan <strong>tranzaksiya ID</strong> yoki
              foydalanuvchi UID bo'yicha izlang: <strong>Kutilgan</strong> va <strong>To'langan</strong>
              summalar farq qilsa, to'lov <code>AMOUNT_MISMATCH</code> bilan rad etilgan bo'ladi.
              Eng yangi {LIST_PAGE_SIZE} tasi ko'rsatiladi.
            </div>
          </div>

          {paymentsLoading && payments.length === 0 ? (
            <div className="admin-state-block">Yuklanmoqda...</div>
          ) : paymentsError ? (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> To'lovlarni o'qib bo'lmadi</div>
              <div className="admin-info-text">{paymentsError}</div>
            </div>
          ) : payments.length === 0 ? (
            <div className="admin-state-block">
              <div className="admin-empty-icon">💳</div>
              <div className="admin-empty-text">Hali to'lov yozuvi yo'q</div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 20 }}>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {['Sana', 'Foydalanuvchi', 'Tarif', 'Kutilgan', "To'langan", 'Muddat', 'Holat'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => {
                      const mismatch = Number.isFinite(p.paidAmount)
                        && Number.isFinite(p.expectedAmount)
                        && p.paidAmount !== p.expectedAmount;
                      const fmt = (n) => (Number.isFinite(n) ? new Intl.NumberFormat('uz-UZ').format(n) : '—');
                      return (
                        <tr key={p.id}>
                          <td>
                            <div>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('uz-UZ') : '—'}</div>
                            <div className="admin-td-sub">{p.provider || '—'}</div>
                          </td>
                          <td>
                            <div className="admin-td-sub">{p.uid || '—'}</div>
                            <div className="admin-td-sub">tx: {p.transId || p.id}</div>
                          </td>
                          <td>{p.planId || '—'}</td>
                          <td>{fmt(p.expectedAmount)}</td>
                          <td style={{ color: mismatch ? 'var(--red)' : 'var(--text)', fontWeight: mismatch ? 700 : 400 }}>
                            {fmt(p.paidAmount)}
                          </td>
                          <td className="admin-td-sub">
                            {p.premiumExpire
                              ? new Date(p.premiumExpire).toLocaleDateString('uz-UZ')
                              : (p.durationMonths === 999 ? 'Cheksiz' : '—')}
                          </td>
                          <td>
                            {mismatch ? (
                              <span className="admin-chip admin-chip--red">SUMMA MOS EMAS</span>
                            ) : p.status === 'success' ? (
                              <span className="status-badge-neon paid">✅ {p.status}</span>
                            ) : (
                              <span className="status-badge-neon pending">{p.status || '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'objections' && (
        <div>
          {/* ── SHUBHALI SAVOLLAR (ADMIN UX AUDIT 2026-08-18, A-1) ──────
              E'tirozlar — bu odamlar SHIKOYAT QILGAN savollar. Ko'pchilik
              esa shikoyat qilmaydi. Bu blok statistikadan buzuq savolni
              shikoyat kutmasdan topadi: moderatsiya reaktivdan proaktivga
              o'tadi. Yopiq turadi — ochilganda kvota sarflanadi. */}
          <div className="admin-susp">
            <button
              className="admin-susp-head"
              onClick={() => { setSuspOpen(o => !o); if (!suspLoaded && !suspLoading) loadSuspicious(); }}
              aria-expanded={suspOpen}
            >
              <span className="admin-susp-title">
                <Activity size={16} style={{ color: 'var(--amber)' }} /> Shubhali savollar
                {suspLoaded && suspicious.length > 0 && (
                  <span className="admin-chip admin-chip--red">{suspicious.length}</span>
                )}
              </span>
              {suspOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {suspOpen && (
              <div className="admin-susp-body">
                <div className="admin-info-text">
                  Xato foizi <strong>{Math.round(SUSP_MIN_WRONG_RATE * 100)}%</strong> dan yuqori va
                  kamida <strong>{SUSP_MIN_SHOWN}</strong> marta ko'rsatilgan savollar.
                  Ro'yxat <em>ko'rsatilgan x xato foizi</em> bo'yicha saralanadi — ya'ni
                  tepada eng ko'p zarar yetkazayotgani turadi.
                  {' '}Yuqori foiz o'z-o'zidan nuqson emas: savol qiyin ham bo'lishi mumkin.
                  Aynan shuning uchun har qatorga javob taqsimotidan diagnoz qo'yiladi.
                </div>

                {suspLoading && <div className="admin-state-block">Statistika o'qilmoqda...</div>}

                {suspError && (
                  <div className="admin-info-box admin-info-box--error">
                    <div className="admin-info-title"><AlertCircle size={15} /> O'qib bo'lmadi</div>
                    <div className="admin-info-text">{suspError}</div>
                  </div>
                )}

                {suspLoaded && !suspLoading && suspicious.length === 0 && !suspError && (
                  <div className="admin-info-box">
                    <div className="admin-info-title"><CheckCircle2 size={15} /> Shubhali savol topilmadi</div>
                    <div className="admin-info-text">
                      Statistika hali yig'ilmagan bo'lishi ham mumkin: birinchi ma'lumot
                      foydalanuvchilar test yechgandan va kunlik cron ishlagandan keyin paydo bo'ladi.
                    </div>
                  </div>
                )}

                {suspicious.map(s => (
                  <div key={s.id} className="admin-susp-row">
                    <div className="admin-susp-q">
                      {s.question
                        ? s.question.q
                        : <span style={{ color: 'var(--text3)' }}>[savol o'chirilgan — {s.id}]</span>}
                      {s.diagnosis && (
                        <div className={'admin-susp-diag is-' + s.diagnosis.kind}>{s.diagnosis.text}</div>
                      )}
                    </div>
                    <div className="admin-susp-n">{s.shown.toLocaleString('uz-UZ')}</div>
                    <div className="admin-susp-n is-bad">{Math.round(s.wrongRate * 100)}%</div>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={!s.question}
                      onClick={() => setFixTarget({
                        // Sun'iy e'tiroz: haqiqiy shikoyat yo'q, lekin oyna
                        // aynan shu shaklni kutadi. `fbId` yo'q — modal buni
                        // hisobga oladi (closeAllObjections).
                        questionId: s.id,
                        question: s.question?.q || '',
                        options: s.question?.opts || [],
                        correct: s.question?.opts?.[s.question?.correct] || null,
                        note: s.diagnosis?.text || 'Statistika bo’yicha shubhali',
                        date: '—',
                        reason: s.diagnosis?.kind === 'key' ? 'wrong_answer' : 'other',
                      })}
                    >
                      <Edit3 size={14} /> Tuzatish
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-filter-bar">
            <div className="admin-search-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                className="admin-search"
                placeholder="Savol yoki mavzu bo'yicha qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="admin-row--tight">
              {['all', 'unsolved', 'solved'].map(f => (
                <button
                  key={f}
                  className={`btn btn-sm ${filterSolved === f ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilterSolved(f)}
                >
                  {f === 'all' ? 'Barchasi' : f === 'unsolved' ? '⏳ Kutmoqda' : '✅ Hal qilingan'}
                </button>
              ))}
            </div>
          </div>

          {/* A-3: xato holati — ilgari `loading` mangu true bo'lib qolardi */}
          {objectionsError ? (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> E'tirozlarni o'qib bo'lmadi</div>
              <div className="admin-info-text">
                {objectionsError}<br />
                Sahifani yangilab ko'ring. Xato takrorlansa — Firestore qoidalari yoki indeks muammosi.
              </div>
            </div>
          ) : loading ? (
            <div className="admin-state-block">Yuklanmoqda...</div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-10xl)', marginBottom: '12px' }}>🎉</div>
              <div style={{ color: 'var(--text2)', fontWeight: '600' }}>Hamma e'tirozlar hal qilindi!</div>
            </div>
          ) : (
            <div className="admin-stack">
              <AnimatePresence>
                {filteredSorted.map((obj) => (
                  <motion.div
                    key={obj.fbId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`admin-objection-card glass-panel ${obj.solved ? 'is-solved' : 'is-open'}`}
                  >
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedId(expandedId === obj.fbId ? null : obj.fbId)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <span className={`status-badge-neon ${obj.solved ? 'paid' : 'pending'}`} style={{ fontSize: 'var(--fs-2xs)', padding: '2px 8px', borderRadius: '6px' }}>
                          {obj.solved ? '✅ HAL QILINDI' : '⏳ YANGI'}
                        </span>
                        {(objectionCounts[objKey(obj)] || 0) >= 2 && (
                          <span className="admin-chip admin-chip--red">
                            ⚠ {objectionCounts[objKey(obj)]} ta shikoyat
                          </span>
                        )}
                        {/* M-3: shikoyat turi. Eski yozuvlarda maydon yo'q —
                            chip ko'rsatilmaydi (soxta 'Boshqa' emas). */}
                        {obj.reason && obj.reason !== 'other' && (
                          <span className="admin-chip">
                            {REASON_LABELS[obj.reason] || obj.reason}
                          </span>
                        )}
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--blue)', fontWeight: '600' }}>{obj.category === 'art' ? '🎨' : '🎖️'} {obj.topic}</span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>{obj.date}</span>
                        {obj.userEmail && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>📧 {obj.userEmail}</span>}
                      </div>
                      {expandedId === obj.fbId ? <ChevronUp size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: 'var(--fs-base)', color: 'var(--text)', fontWeight: '500', lineHeight: '1.4' }}>
                      📝 {obj.question?.slice(0, 120)}{obj.question?.length > 120 ? '...' : ''}
                    </div>
                    <AnimatePresence>
                      {expandedId === obj.fbId && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ background: 'var(--bg3)', padding: '12px', borderRadius: '10px', fontSize: 'var(--fs-base)', color: 'var(--text)', lineHeight: '1.5' }}>
                              <strong>Savol:</strong> {obj.question}
                            </div>
                            {obj.correct && (
                              <div style={{ background: 'var(--green-bg)', padding: '10px 12px', borderRadius: '10px', fontSize: 'var(--fs-md)', color: 'var(--green)', fontWeight: '600', border: '1px solid rgba(16,185,129,0.2)' }}>
                                ✅ To'g'ri javob: {obj.correct.replace(/^[A-D]\)\s*/, '')}
                              </div>
                            )}
                            <div style={{ background: 'var(--amber-bg)', padding: '12px', borderRadius: '10px', fontSize: 'var(--fs-md)', color: 'var(--text2)', border: '1px solid rgba(245,158,11,0.2)' }}>
                              <strong>E'tiroz:</strong> {obj.note}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {/* ── M-1/M-2: ASOSIY amal endi «Tuzatish» ──
                                  Ilgari bu yerdagi yagona amal «Hal qilindi deb
                                  belgilash» edi — u FAQAT e'tirozga bayroq
                                  qo'yardi, savolga tegmasdi. Ya'ni panel
                                  tozalanardi, buzuq savol esa qolaverardi.
                                  «Tuzatish» savolni 1 o'qishda ochadi va
                                  chindan tahrirlashga imkon beradi. */}
                              {!obj.solved && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => setFixTarget(obj)}
                                  title={obj.questionId
                                    ? "Savolni ochib tuzatish (1 o'qish)"
                                    : "Eski e'tiroz — savol identifikatori yo'q"}
                                >
                                  <Edit3 size={14} /> Tuzatish
                                </button>
                              )}
                              {!obj.solved && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => handleSolve(obj.fbId)}
                                  title="Savolga tegmasdan, faqat e'tirozni yopish"
                                >
                                  <CheckCircle size={14} /> Faqat yopish
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline admin-btn-danger"
                                onClick={() => handleDeleteObjection(obj.fbId)}
                              >
                                <Trash2 size={14} /> O'chirish
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="admin-stack-l">
          <div className="admin-section-title"><Inbox size={18} style={{ color: 'var(--blue)' }} /> Savol so'rovlari ({questionRequests.length})</div>
          <div className="admin-info-box">
            <div className="admin-info-text">
              Foydalanuvchilar savol yetishmagan mavzular uchun <strong>"Ko'proq savol kerak"</strong> so'rovini yuboradi. Eng ko'p so'ralgan mavzular tepada turadi. Savol qo'shgach <strong>"Savol qo'shildi"</strong> tugmasini bosing — so'rov yuborgan barcha foydalanuvchilarga avtomatik bildirishnoma boradi.
            </div>
          </div>

          {questionRequests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-10xl)', marginBottom: '12px' }}>📥</div>
              <div style={{ color: 'var(--text2)', fontWeight: '600' }}>Hali savol so'rovlari yo'q</div>
              <div style={{ color: 'var(--text3)', fontSize: 'var(--fs-md)', marginTop: '6px' }}>Foydalanuvchilar savol yetishmagan bo'limlardan so'rov yuborganda shu yerda paydo bo'ladi.</div>
            </div>
          ) : (
            <div className="admin-stack">
              {requestGroups.map(group => (
                <motion.div
                  key={group.key}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel"
                  style={{ padding: '16px', border: group.pending > 0 ? '1px solid rgba(14,151,224,0.3)' : '1px solid rgba(16,185,129,0.25)', opacity: group.pending > 0 ? 1 : 0.8 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, background: 'var(--blue-bg)', color: 'var(--blue)', padding: '3px 10px', borderRadius: 8 }}>
                          🔥 {group.count} ta so'rov
                        </span>
                        {group.pending === 0 ? (
                          <span className="status-badge-neon paid" style={{ fontSize: 'var(--fs-2xs)', padding: '2px 8px', borderRadius: 6 }}>✅ BAJARILDI</span>
                        ) : (
                          <span className="status-badge-neon pending" style={{ fontSize: 'var(--fs-2xs)', padding: '2px 8px', borderRadius: 6 }}>⏳ {group.pending} KUTMOQDA</span>
                        )}
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>{group.categoryName}</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)' }}>
                        {group.topicName} <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: 500 }}>#{group.topicId}</span>
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 6 }}>
                        So'raganlar: {group.items.slice(0, 5).map(i => i.userName || i.userEmail || 'Anonim').join(', ')}{group.items.length > 5 ? ` +${group.items.length - 5}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {group.pending > 0 && (
                        <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff', border: 'none' }} onClick={() => handleFulfillRequest(group)}>
                          <CheckCircle size={14} /> Savol qo'shildi
                        </button>
                      )}
                      <button className="btn btn-sm btn-outline admin-btn-danger" onClick={() => handleDeleteRequestGroup(group)} title="So'rovlarni o'chirish">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div className="admin-stack-l">
          <div className="admin-section-title"><FileText size={18} style={{ color: 'var(--blue)' }} /> Savollar Bazasi ({questions.length ? questions.length : (overview?.questions ?? '—')})</div>

          {/* Savollar yuklanmagan — ataylab tasdiqlash kerak (kvota himoyasi) */}
          {questions.length === 0 && (
            <div className="admin-info-box">
              <div className="admin-info-title">
                <AlertCircle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Savollar bazasi yuklanmagan
              </div>
              <div className="admin-info-text">
                Bazada <strong>{overview?.questions ?? '~47 000'}</strong> ta savol bor. To'liq yuklash
                shuncha Firestore <strong>o'qishini</strong> sarflaydi — bu bepul rejaning kunlik
                kvotasidan (50 000) deyarli hammasi. Kvota tugasa ilova o'sha kun davomida
                <strong> barcha foydalanuvchilar uchun</strong> ishlamay qoladi.<br />
                Tahrirlash, dublikat tozalash, zaxira va Publish uchun yuklash shart —
                shunchaki ko'rish uchun kerak bo'lsa, yuklamang.
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="btn btn-outline"
                style={{ marginTop: 10 }}
                onClick={loadAllQuestions}
                disabled={questionsLoading}
              >
                <Database size={14} /> {questionsLoading ? 'Yuklanmoqda...' : 'Tushundim — baribir yuklash'}
              </motion.button>
            </div>
          )}

          {/* B-6: savol tahriri va publish o'rtasidagi bog'lanish.
              Bu tasmasiz admin savolni tuzatib publish qilishni unutsa,
              foydalanuvchilar eski keshdagi savolni ko'raverardi. */}
          {pendingPublish && (
            <div className="admin-info-box admin-info-box--warn">
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="admin-info-title"><AlertTriangle size={15} /> Yuborilmagan o'zgarishlar bor</div>
                <div className="admin-info-text">
                  Savollar o'zgardi, lekin foydalanuvchilarning ilovasidagi kesh hali eski.
                  «Yangilanishni yuborish» tugmasini bosmaguningizcha ular <strong>eski savollarni</strong> ko'radi.
                </div>
              </div>
              <button className="btn btn-primary" onClick={handlePublishBundles} disabled={isSyncing}>
                <UploadCloud size={14} /> {isSyncing ? 'Yuborilmoqda...' : 'Hoziroq yuborish'}
              </button>
            </div>
          )}

          {/* ── Savol paketi holati ──────────────────────────────────────
              Bu quti platformaning eng qimmat sozlamasini ko'rsatadi. Paket
              yo'q bo'lsa har foydalanuvchi test ochganda fan boshiga ~2 900
              Firestore o'qishi ketadi (kunlik bepul kvota = 50 000, ya'ni
              ~17 ta yuklash). Paket bor bo'lsa — 2 ta o'qish. */}
          {bundleInfo && (
            <div className={`admin-info-box ${bundleInfo.fanlar === 0 ? 'admin-info-box--error' : ''}`}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="admin-info-title">
                  {bundleInfo.fanlar === 0
                    ? <><AlertTriangle size={15} /> Savol paketi qurilmagan — kvota tez tugaydi</>
                    : <><CheckCircle2 size={15} /> Savol paketi faol — {bundleInfo.fanlar} ta fan</>}
                </div>
                <div className="admin-info-text">
                  {bundleInfo.fanlar === 0 ? (
                    <>
                      Foydalanuvchi testni birinchi marta ochganda savollar Firestore'dan
                      hujjatma-hujjat o'qiladi: <strong>fan boshiga ~2 900 o'qish</strong>.
                      Bepul rejaning kunlik kvotasi (50 000) shunday <strong>~17 ta yuklashga</strong> yetadi.
                      Paket qurilsa bu <strong>2 ta o'qishga</strong> tushadi.<br />
                      Tartib: «Bazani yuklash» → «Paketlarni qayta qurish».
                    </>
                  ) : (
                    <>
                      {bundleInfo.savollar.toLocaleString('uz-UZ')} ta savol paketda.
                      {bundleInfo.updatedAt && <> Oxirgi qurilgan: <strong>{new Date(bundleInfo.updatedAt).toLocaleString('uz-UZ')}</strong>.</>}
                      {' '}Savollarni tahrirlagandan keyin paketni <strong>qayta quring</strong> —
                      aks holda foydalanuvchilar eski savollarni ko'radi.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="admin-action-bar">
            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-primary admin-btn-ok" onClick={handlePublishBundles} disabled={isSyncing}>
              <UploadCloud size={14} /> {isSyncing ? 'Yuborilmoqda...' : '🚀 Yangilanishni yuborish'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }}
              className="btn btn-outline"
              onClick={handleRebuildBundles}
              disabled={isSyncing || !questionsLoaded}
              title={questionsLoaded
                ? "Savollarni Storage paketiga yig'adi — foydalanuvchi yuklashi ~1000 barobar arzonlashadi"
                : 'Avval «Bazani yuklash» kerak'}
            >
              <Database size={14} />
              {syncProgress
                ? `Yuklanmoqda ${syncProgress.done}/${syncProgress.total}...`
                : 'Paketlarni qayta qurish'}
            </motion.button>

            {/* K-3: bir martalik amal — shundan keyin import butun bazani
                yuklamaydi (47 000 o'qish o'rniga ~7 so'rov). */}
            <motion.button
              whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }}
              className="btn btn-outline"
              onClick={backfillQHash}
              disabled={qhashBusy || !questionsLoaded}
              title={questionsLoaded
                ? "Import dublikatni serverdan topishi uchun kalit yozadi (bir marta)"
                : 'Avval «Bazani yuklash» kerak'}
            >
              <KeyRound size={14} />
              {qhashProgress
                ? `Kalit yozilmoqda ${qhashProgress.done}/${qhashProgress.total}...`
                : 'Dublikat kalitini to’ldirish'}
            </motion.button>

            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-outline admin-btn-danger" onClick={analyzeDuplicates} disabled={dupAnalyzing}>
              <Trash2 size={14} /> {dupAnalyzing ? 'Tahlil...' : 'Dublikatlar'}
            </motion.button>
            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-outline" onClick={exportQuestionsJSON} disabled={!questions.length} title="Barcha savollarni JSON faylga zaxiralash">
              <Download size={14} /> Zaxira (JSON)
            </motion.button>
            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-primary" onClick={() => { setIsAdding(true); setEditingQ(null); setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' }); }}>
              <Plus size={14} /> Yangi savol
            </motion.button>
          </div>

          {/* Glassmorphic Filter and Search Bar */}
          <div className="admin-glass-filter-bar">
            <div className="admin-search-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                className="admin-search"
                placeholder="Savol matni bo'yicha qidirish..."
                value={questionSearch}
                onChange={e => setQuestionSearch(e.target.value)}
              />
            </div>
            <div className="admin-filter-selects">
              <div className="admin-select-wrapper">
                <span className="admin-select-label">Kategoriya:</span>
                <select
                  className="admin-select"
                  value={questionCategoryFilter}
                  onChange={e => {
                    setQuestionCategoryFilter(e.target.value);
                    setQuestionTopicFilter('all'); // category o'zgarganda mavzuni reset qilamiz
                  }}
                >
                  <option value="all">Barchasi</option>
                  <option value="chqbt">🎖️ CHQBT</option>
                  <option value="art">🎨 Tasviriy san'at</option>
                  <option value="tarix">📜 Tarix</option>
                  <option value="sport">⚽ Jismoniy tarbiya</option>
                  <option value="boshlangich">🏫 Boshlang'ich sinf</option>
                  <option value="info">💻 Informatika</option>
                  <option value="mtt">🧸 MTT tarbiyachisi</option>
                  <option value="mtt_rahbar">👔 MTT rahbari</option>
                  <option value="til">🗣️ Ona tili va adabiyot</option>
                  <option value="biologiya">🧬 Biologiya</option>
                  <option value="geografiya">🌍 Geografiya</option>
                  <option value="mtt_logoped">💬 MTT Logopedi</option>
                  <option value="mtt_psixolog">🧠 MTT Psixologi</option>
                  <option value="kimyo">🧪 Kimyo</option>
                  <option value="rus_tili">📕 Rus tili</option>
                  <option value="ingliz">📗 Ingliz tili</option>
                  <option value="mtt_jismoniy">🤸 MTT Jismoniy tarbiya</option>
                </select>
              </div>
              <div className="admin-select-wrapper">
                <span className="admin-select-label">Mavzu:</span>
                <select
                  className="admin-select"
                  value={questionTopicFilter}
                  onChange={e => setQuestionTopicFilter(e.target.value)}
                >
                  <option value="all">Barchasi</option>
                  {TOPICS.filter(t => 
                    questionCategoryFilter === 'all' || 
                    t.category === questionCategoryFilter || 
                    (Array.isArray(t.category) && t.category.includes(questionCategoryFilter))
                  ).map(t => (
                    <option key={t.id} value={t.id}>
                      #{t.id} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Real-time stats indicator */}
          <div className="admin-stats-indicator">
            <span>Ko'rsatilmoqda: <strong>{Math.min(50, filteredQuestions.length)} ta</strong></span>
            <span>Topildi: <strong>{filteredQuestions.length} ta</strong></span>
            <span>Jami: <strong>{questions.length} ta</strong></span>
          </div>

          {/* Drag and Drop JSON Upload Area */}
          <motion.div
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleFileDrop}
            className={`admin-dropzone ${isDraggingFile ? 'is-dragging' : ''}`}
            onClick={() => document.getElementById('json-file-input').click()}
          >
            <input
              id="json-file-input"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {isUploadingJSON ? (
              <div>
                {/* C-4: `spin-icon` klassi CSS'da HECH QAYERDA ta'riflanmagan edi —
                    "yuklanmoqda" ko'rsatkichi qimirlamasdi. `.spin` esa mavjud
                    (src/index.css:1618). */}
                <div className="admin-dropzone-icon spin" style={{ display: 'inline-block' }}>⏳</div>
                <div className="admin-dropzone-title">Savollar yuklanmoqda, iltimos kuting...</div>
              </div>
            ) : (
              <div>
                <div className="admin-dropzone-icon">📁</div>
                <div className="admin-dropzone-title">
                  {isDraggingFile ? 'Faylni shu yerga tashlang' : 'JSON faylni sudrab tashlang yoki bosing'}
                </div>
                <div className="admin-dropzone-hint">
                  topicId va category avtomatik bog'lanadi. Dublikat serverdan
                  tekshiriladi — bazani oldindan yuklash SHART EMAS.
                </div>
              </div>
            )}
          </motion.div>

          <div className="admin-stack-s">
            {filteredQuestions.slice(0, 50).map((q) => (
              <div key={q.id} className="admin-q-card">
                <div className="admin-q-text">{q.q}</div>
                <div className="admin-q-footer">
                  <span className="admin-q-topic">#{q.topicId} · {q.category || 'chqbt'}</span>
                  <div className="admin-q-actions">
                    <button className="btn btn-sm btn-outline" aria-label="Savolni tahrirlash" title="Tahrirlash" onClick={() => { setEditingQ(q); setNewQ(toEditableQuestion(q)); setIsAdding(true); }}><Edit3 size={14} /></button>
                    <button className="btn btn-sm btn-outline admin-btn-danger" aria-label="Savolni o'chirish" title="O'chirish" onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredQuestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 'var(--fs-base)' }}>
                Savol topilmadi 🔍
              </div>
            )}
            {filteredQuestions.length > 50 && (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 'var(--fs-md)' }}>
                ... va yana {filteredQuestions.length - 50} ta savol
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          {/* ── Hisobni o'chirish arizalari (B-2) ── */}
          {/* ⚠️ 2026-08-19: "Bajarildi" bosilgach ariza ro'yxatdan KETMASDI.
              Bajarilganlar to'planib, "Foydalanuvchilar" tabining butun birinchi
              ekranini egallardi — admin har safar ularni aylantirib o'tishga
              majbur bo'lardi, YANGI ariza esa ular orasida ko'zga tashlanmasdi.
              Endi standart holatda faqat KUTAYOTGAN arizalar ko'rinadi.
              Bajarilganlar O'CHIRILMAYDI — Google Play talabi bo'yicha ular
              "arizaga javob berilgani"ning isboti, shuning uchun "Arxiv"
              tugmasi ostida turadi (naqsh: Jurnaldagi `errorsShowResolved`). */}
          {(deletionRequests.length > 0 || delReqError) && (
            <div className="glass-panel" style={{ padding: 16, marginBottom: 16 }}>
              <div className="admin-row-between" style={{ marginBottom: 10 }}>
                <div className="admin-row" style={{ fontWeight: 800, color: 'var(--text)' }}>
                  <Trash2 size={16} style={{ color: 'var(--amber)' }} /> Hisobni o'chirish arizalari
                  {newDeletionRequests > 0 && <span className="admin-tab-badge">{newDeletionRequests}</span>}
                </div>
                <div className="admin-row--tight">
                  {doneDeletionRequests > 0 && (
                    <button
                      className={`btn btn-sm ${delReqShowDone ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setDelReqShowDone(v => !v)}
                      title="Bajarilgan arizalar o'chirilmaydi — javob berilganining isboti sifatida saqlanadi"
                    >
                      {delReqShowDone ? 'Arxivni yashirish' : `Arxiv (${doneDeletionRequests})`}
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => loadDeletionRequests({ force: true })} disabled={delReqLoading}>
                    <RefreshCw size={13} className={delReqLoading ? 'spin' : ''} /> Yangilash
                  </button>
                </div>
              </div>
              {delReqError ? (
                <div className="admin-info-text" style={{ color: 'var(--red)' }}>{delReqError}</div>
              ) : visibleDeletionRequests.length === 0 ? (
                // Yig'ilgan holat — bitta satr. Kartochka butunlay yo'qolmaydi,
                // aks holda "Arxiv" tugmasiga yo'l ham qolmasdi.
                <div className="admin-info-text">
                  ✅ Javob kutayotgan ariza yo'q{doneDeletionRequests > 0 ? ` — ${doneDeletionRequests} tasi bajarilgan (Arxiv)` : ''}
                </div>
              ) : (
                <div className="admin-stack-s">
                  {visibleDeletionRequests.map(r => (
                    <div key={r.id} className={`admin-card ${r.status !== 'pending' ? 'admin-card--dim' : ''}`}>
                      <div className="admin-row-between">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{r.name || '—'}</div>
                          <div className="admin-meta-line" style={{ marginTop: 3 }}>
                            <span>📞 {r.phone || '—'}</span>
                            {r.createdAt && <span>🕒 {new Date(r.createdAt).toLocaleString()}</span>}
                            <span className={`admin-chip ${r.status === 'pending' ? 'admin-chip--amber' : 'admin-chip--green'}`}>
                              {r.status || 'pending'}
                            </span>
                            {/* Server takroriy murojaatni shu arizaga qo'shadi
                                (api/notify-admin.js) — nechta ekani ko'rinsin */}
                            {r.repeatCount > 0 && (
                              <span className="admin-chip admin-chip--blue">🔁 {r.repeatCount + 1} marta yozgan</span>
                            )}
                            {/* Arxivda "qachon bajarilgani" ko'rinsin — aynan shu
                                sana huquqiy jihatdan isbot bo'ladi */}
                            {r.status !== 'pending' && r.handledAt && (
                              <span>✅ {new Date(r.handledAt).toLocaleString()}</span>
                            )}
                          </div>
                          {/* `pre-line`: server takroriy murojaatlarni bitta
                              matnga qatorma-qator qo'shadi — aks holda hammasi
                              bitta uzun satrga yopishib qolardi */}
                          {r.reason && <div className="admin-info-text" style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{r.reason}</div>}
                        </div>
                        {r.status === 'pending' && (
                          <div className="admin-row--tight">
                            <button className="btn btn-sm btn-outline" onClick={() => findUserFromRequest(r.phone)} title="Shu telefon bo'yicha hisobni pastdagi ro'yxatda topish">
                              <Search size={13} /> Hisobni topish
                            </button>
                            <button className="btn btn-sm btn-outline" onClick={() => setDeletionRequestStatus(r.id, 'done')}>
                              <CheckCircle size={13} /> Bajarildi
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="admin-row-between" style={{ marginBottom: 14 }}>
            <div className="admin-section-title admin-section-title--flush">
              <Users size={18} style={{ color: 'var(--blue)' }} /> Foydalanuvchilar ({filteredUsers.length}/{users.length})
            </div>
            <div className="admin-row">
              <div className="admin-search-wrap" style={{ maxWidth: 260, width: '100%' }}>
                <Search size={16} className="admin-search-icon" />
                <input
                  className="admin-search"
                  placeholder="Familiya, ism, ID, telefon yoki email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  // ⚠️ Enter ATAYLAB shartli. Avval u har safar
                  // `searchUsersOnServer()` ni chaqirardi, u esa `users` ni
                  // FAQAT prefiks bo'yicha topilganlar bilan ALMASHTIRADI.
                  // Ya'ni «omon» yozib yuklangan ro'yxatdan 3 ta Omonov
                  // ko'rinib turgan holda Enter bosilsa, familiyasi ikkinchi
                  // so'zda turgani ro'yxatdan YO'QOLARDI — qidiruv natijani
                  // yaxshilash o'rniga kambag'allashtirardi.
                  // Endi server so'rovi faqat mijozda HECH NARSA topilmaganda
                  // ishga tushadi — ya'ni haqiqatan kerak bo'lganda.
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return;
                    if (filteredUsers.length === 0) searchUsersOnServer();
                  }}
                />
              </div>
              <select
                className="admin-select"
                style={{ maxWidth: 190 }}
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                aria-label="Fan bo'yicha filtr"
                title="Yuklangan ro'yxatni fan bo'yicha filtrlash"
              >
                <option value="all">Barcha fanlar</option>
                {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="none">Fan belgilanmagan</option>
              </select>
              {/* B-7: mijozdagi filtr faqat yuklangan ro'yxat ichida ishlaydi.
                  Baza `USER_PAGE_SIZE` dan oshgan kunda bu tugma ASOSIY yo'lga
                  aylanadi; hozir esa zaxira — shuning uchun matni ham
                  "aniq qidirish" emas, halolroq. */}
              <button className="btn btn-sm btn-outline" onClick={searchUsersOnServer} disabled={usersLoading || !userSearch.trim()} title="Ro'yxatda topilmasa — butun bazadan prefiks bo'yicha qidirish">
                <Search size={14} /> Bazadan qidirish
              </button>
              {/* Kesh ATAYLAB tozalanadi: admin «Yangilash» bosganda eng
                  yangi ma'lumotni so'ragan bo'ladi, keshdagi 10 daqiqalik
                  nusxa esa keyingi ochilishda yana o'sha eski holatni
                  qaytarib qo'yishi mumkin edi. */}
              <button className="btn btn-sm btn-outline" onClick={() => { setUserSearch(''); clearUserCache(); loadUsers({ force: true }); }} disabled={usersLoading} title="Ro'yxatni bazadan qayta yuklash">
                <RefreshCw size={14} className={usersLoading ? 'spin' : ''} />
              </button>
              <button className="btn btn-sm btn-outline" onClick={exportUsers} disabled={!filteredUsers.length} title="CSV faylga eksport">
                <Download size={14} /> CSV
              </button>
            </div>
          </div>

          {/* A-15 → 2026-08-20 da qayta yozildi.
              AVVAL bu satr HAR DOIM "Eng yangi N ta ko'rsatilmoqda" deb turardi
              — ya'ni ro'yxat to'liq bo'lgan holatda ham admin uni chala deb
              o'qirdi, chala bo'lganda esa qanchasi tushib qolganini bilmasdi.
              Endi ikki holat AJRATILADI, chunki qidiruvning ishonchliligi
              aynan shunga bog'liq: ro'yxat to'liq bo'lsa «topilmadi» = rostdan
              yo'q; chala bo'lsa «topilmadi» hech narsani isbotlamaydi. */}
          {!usersError && users.length > 0 && (
            <div className="admin-stats-indicator">
              <span>
                {userSearchServer
                  ? <>🔎 <strong>Server qidiruvi</strong> natijasi</>
                  : usersTruncated
                    ? <>⚠️ Eng yangi <strong>{users.length}</strong> ta ko'rsatilmoqda{overview?.users ? <> · bazada <strong>{overview.users}</strong> ta</> : null}</>
                    : <>✅ Bazadagi <strong>barcha {users.length}</strong> ta hisob yuklangan</>}
              </span>
              <span style={{ color: 'var(--text3)' }}>
                {subjectFilter !== 'all'
                  // Bu son BUTUN bazaning emas, faqat yuklangan ro'yxatning
                  // kesimi — aks holda admin uni fan bo'yicha jami deb o'qishi
                  // mumkin. Haqiqiy jami "Statistika" tabida.
                  ? <>Fan filtri faqat shu ro'yxat ichida — bazadagi jami son «Statistika» tabida</>
                  : usersTruncated
                    ? <>Ro'yxatga sig'magan odamni «Bazadan qidirish» bilan toping</>
                    : <>Qidiruv shu ro'yxatning hammasini qamraydi — familiya, ism, ID, telefon</>}
              </span>
            </div>
          )}

          {/* Chegaraga tiqilgan holat ALOHIDA, ko'zga tashlanadigan
              ogohlantirish oladi: bu yagona holat, unda «topilmadi» javobi
              YOLG'ON bo'lishi mumkin. */}
          {!usersError && usersTruncated && !userSearchServer && (
            <div className="admin-info-box">
              <div className="admin-info-title"><AlertCircle size={15} /> Ro'yxat to'liq emas</div>
              <div className="admin-info-text">
                Bazada <strong>{overview?.users ?? 'ko\'proq'}</strong> hisob bor, bu yerga esa eng yangi{' '}
                <strong>{users.length}</strong> tasi yuklandi. Ya'ni bu ro'yxatdagi qidiruv{' '}
                <strong>hammasini qamramaydi</strong> — kimni topa olmasangiz, «Bazadan qidirish»
                tugmasini bosing.
              </div>
            </div>
          )}

          {usersError ? (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> Foydalanuvchilarni o'qib bo'lmadi</div>
              <div className="admin-info-text">{usersError}</div>
              <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => loadUsers({ force: true })}>
                <RefreshCw size={14} /> Qayta urinish
              </button>
            </div>
          ) : usersLoading && users.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon">👥</div><div className="admin-empty-text">Yuklanmoqda...</div></div>
          ) : users.length === 0 ? (
            <div className="admin-state-block">
              <div className="admin-empty-icon">👥</div>
              <div className="admin-empty-text">Foydalanuvchi topilmadi</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
              {/* Matn ro'yxat holatiga qarab O'ZGARADI. Avval har doim
                  "Yuklangan ro'yxatda topilmadi" deb turardi — ro'yxat
                  to'liq bo'lganda bu ortiqcha shubha tug'dirardi, chala
                  bo'lganda esa admin uni "bazada yo'q" deb o'qib, mavjud
                  odamni yo'q deb hisoblardi. Ikkisi bir xil gap emas. */}
              {usersTruncated || userSearchServer ? (
                <>Yuklangan ro'yxatda topilmadi 🔍<br /></>
              ) : (
                <>
                  Bazada <strong>«{userSearch}»</strong> bo'yicha hech kim yo'q 🔍<br />
                  <span style={{ fontSize: 13 }}>Barcha {users.length} ta hisob tekshirildi</span><br />
                </>
              )}
              {/* Fan filtri yoqiqda "Butun bazadan qidirish" chalg'itadi —
                  u qidiruv MATNI bo'yicha ishlaydi, fan bo'yicha emas. */}
              {subjectFilter !== 'all' ? (
                <button className="btn btn-sm btn-outline" style={{ marginTop: 12 }} onClick={() => setSubjectFilter('all')}>
                  <X size={14} /> Fan filtrini tozalash
                </button>
              ) : (
                <button className="btn btn-sm btn-outline" style={{ marginTop: 12 }} onClick={searchUsersOnServer}>
                  <Search size={14} /> Yana bazadan qidirib ko'rish
                </button>
              )}
            </div>
          ) : (
            <div className="admin-stack-s">
              {filteredUsers.map((u) => {
                // B-3: obuna holati qatorning O'ZIDA ko'rinadi. Ilgari faqat
                // ⭐ bor edi — muddati o'tgan hisob ham "Pro" bo'lib turardi.
                const exp = u.premiumExpire ? new Date(u.premiumExpire) : null;
                const expired = exp && exp < new Date();
                // ⋮ menyusi ochiq qator SIBLING qatorlardan tepaga ko'tariladi.
                // Sababi `.admin-user-row:hover` dagi `transform` — u qatorni
                // STACKING CONTEXT ga aylantiradi va menyuning `z-index: 40`
                // qiymati o'sha qator ICHIDA qamalib qoladi. Natijada sichqoncha
                // ⋮ ustida turganda (bosgandan keyingi odatiy holat) pastdagi
                // qatorlarning ⋮ tugmalari ochilgan menyu USTIDA chizilardi.
                const menuOpen = userMenu?.id === u.id;
                return (
                <div key={u.id} className={`admin-user-row${menuOpen ? ' admin-user-row--menu-open' : ''}`}>
                  <button
                    className="admin-user-left"
                    onClick={() => setUserCard(u)}
                    aria-label={`${u.displayName || u.id} kartochkasini ochish`}
                  >
                    <div className="admin-user-avatar-sm">
                      {(u.displayName || u.email || u.phoneNumber || '?')[0].toUpperCase()}
                    </div>
                    <div className="admin-user-details">
                      <div className="admin-user-name-line">
                        <span className="admin-user-name-sm">{u.displayName || '—'}</span>
                        {u.shortId && <span className="admin-chip admin-chip--muted">{u.shortId}</span>}
                        {u.isPremium && (
                          <span className={`admin-chip ${expired ? 'admin-chip--red' : 'admin-chip--amber'}`}>
                            {expired ? 'PRO — MUDDATI TUGAGAN' : exp ? `PRO · ${exp.toLocaleDateString('uz-UZ')}` : 'PRO · MUDDATSIZ'}
                          </span>
                        )}
                        {u.role === 'admin' && <span className="admin-chip admin-chip--blue">ADMIN</span>}
                        {u.role === 'partner' && (
                          <span className="admin-chip" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 800 }}>
                            🤝 HAMKOR {u.partnerCode ? `(${u.partnerCode})` : ''}
                          </span>
                        )}
                      </div>
                      <div className="admin-user-subtext">
                        {u.email || u.phoneNumber || 'Identifikator yo\'q'}
                        {/* Fan — platformadagi har bir foydalanuvchi o'qituvchi,
                            shuning uchun bu ism/telefondan keyingi eng foydali
                            belgi. Bo'sh bo'lsa = onboarding tugallanmagan. */}
                        {subjectName(u.subject)
                          ? <> · {subjectName(u.subject)}</>
                          : <span style={{ color: 'var(--text3)', opacity: 0.7 }}> · fan yo'q</span>}
                        {u.lastActiveAt && (
                          <span style={{ color: 'var(--text3)' }}>
                            {' · 🕒 '}
                            {(() => {
                              const d = new Date(u.lastActiveAt);
                              const now = new Date();
                              const diffMs = now - d;
                              const diffMin = Math.floor(diffMs / 60000);
                              const diffH = Math.floor(diffMs / 3600000);
                              const diffD = Math.floor(diffMs / 86400000);
                              if (diffMin < 1) return 'hozir';
                              if (diffMin < 60) return `${diffMin} daqiqa oldin`;
                              if (diffH < 24) return `${diffH} soat oldin`;
                              if (diffD < 7) return `${diffD} kun oldin`;
                              return d.toLocaleDateString('uz-UZ');
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="admin-user-actions-sm admin-menu-wrap">
                    <button
                      onClick={e => toggleUserMenu(u.id, e.currentTarget)}
                      className={`action-btn-sm${menuOpen ? ' menu-open' : ''}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-label={`${u.displayName || u.id} — amallar menyusi`}
                      title="Amallar"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuOpen && (
                      <div className={`admin-menu${userMenu.up ? ' admin-menu--up' : ''}`} role="menu">
                        <button
                          role="menuitem"
                          className="admin-menu-item"
                          onClick={() => runUserAction(() => togglePremium(u.id, u.isPremium))}
                        >
                          <Crown size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                          {u.isPremium ? 'Pro statusini bekor qilish' : 'Pro statusini berish'}
                        </button>

                        <button
                          role="menuitem"
                          className="admin-menu-item"
                          onClick={() => runUserAction(() => handleManageRole(u))}
                        >
                          <Shield size={15} style={{ color: u.role === 'admin' ? 'var(--blue)' : u.role === 'partner' ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
                          <span>
                            Rolni boshqarish
                            <span className="admin-menu-hint">Joriy: {u.role === 'admin' ? 'Admin' : u.role === 'partner' ? 'Hamkor' : 'Foydalanuvchi'}</span>
                          </span>
                        </button>

                        <button
                          role="menuitem"
                          className="admin-menu-item"
                          onClick={() => runUserAction(() => handleResetPassword(u))}
                        >
                          <KeyRound size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                          <span>
                            Parolni tiklash
                            <span className="admin-menu-hint">Vaqtinchalik parol beriladi</span>
                          </span>
                        </button>

                        <div className="admin-menu-sep" />

                        <button
                          role="menuitem"
                          className="admin-menu-item admin-menu-item--danger"
                          onClick={() => runUserAction(() => handleDeleteUser(u.id, u.email || u.phoneNumber))}
                        >
                          <Trash2 size={15} style={{ flexShrink: 0 }} />
                          Foydalanuvchini o'chirish
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="admin-stack-l">
          {/* ── Platforma umumiy ko'rsatkichlari ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div className="admin-section-title admin-section-title--flush"><BarChart3 size={18} style={{ color: 'var(--blue)' }} /> Platforma ko'rsatkichlari</div>
            <button className="btn btn-sm btn-outline" onClick={loadOverview} disabled={overviewLoading}>
              <RefreshCw size={14} className={overviewLoading ? 'spin' : ''} /> {overviewLoading ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
          </div>
          {/* D-5: statistika tabida xato holati umuman yo'q edi — barcha
              raqamlar jimgina «—» bo'lib qolardi */}
          {overviewError && (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> Ko'rsatkichlarni o'qib bo'lmadi</div>
              <div className="admin-info-text">{overviewError}</div>
            </div>
          )}
          <div className="admin-stats-grid">
            {/* A-3: yagona JONLI ko'rsatkich — qolganlari kunlik cron'dan */}
            <div className="stat-box glass-panel">
              <div className="stat-box-val admin-live" style={{ color: 'var(--green)' }}>
                {liveActive ?? '—'}
              </div>
              <div className="stat-box-lbl">So'nggi 15 daqiqada faol</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Users size={18} /> {overview?.users ?? '—'}</div>
              <div className="stat-box-lbl">Foydalanuvchilar</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Crown size={18} /> {overview?.premium ?? '—'}</div>
              <div className="stat-box-lbl">Pro</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Database size={18} /> {overview?.questions ?? '—'}</div>
              <div className="stat-box-lbl">Savollar</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🔗 {overview?.referrals ?? '—'}</div>
              <div className="stat-box-lbl">Referrallar</div>
            </div>
          </div>

          {/* ── Kunlik faollik (metrics kolleksiyasi) ──────────────────────
              Manba: api/cron-daily.js har kuni 11:00 (Toshkent) da bir hujjat
              yozadi. Shu paytgacha "kecha nechta odam kirdi?" degan savolga
              javob beradigan joy umuman yo'q edi. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <div className="admin-section-title admin-section-title--flush">
              <Activity size={18} style={{ color: 'var(--blue)' }} /> Kunlik faollik
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => loadMetrics({ force: true })} disabled={metricsLoading}>
              <RefreshCw size={14} className={metricsLoading ? 'spin' : ''} /> {metricsLoading ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>

          {/* ── Cron holati (2026-08-19) ────────────────────────────────────
              NEGA: 11 ta hisob qisqa ID'siz qolgani aniqlanganda ma'lum
              bo'ldiki, ularni to'ldirishi kerak bo'lgan kunlik cron BIRON
              MARTA ishlamagan. Panel esa buni "hali ma'lumot yig'ilmagan,
              ertaga paydo bo'ladi" deb ko'rsatib turardi — ya'ni o'lik
              tizim odatiy kutishga o'xshardi. Endi holat AYTIB beriladi.
              Manba: `meta/cronHealth` (api/_shared.js `cronHeartbeat`). */}
          {(() => {
            if (cronHealth === undefined) return null;   // o'qilmagan — jim turamiz
            const d = cronHealth?.daily || null;
            const started = d?.startedAt ? new Date(d.startedAt) : null;
            const finished = d?.finishedAt ? new Date(d.finishedAt) : null;
            const fmt = (x) => (x ? x.toLocaleString('uz-UZ') : '—');

            if (!started) return (
              <div className="admin-info-box admin-info-box--error">
                <div className="admin-info-title"><AlertTriangle size={15} /> Kunlik cron ishlamayapti</div>
                <div className="admin-info-text">
                  <code>/api/cron-daily</code> hech qachon muvaffaqiyatli chaqirilmagan.
                  Eng ehtimolli sabab — Vercel loyihasida <code>CRON_SECRET</code> env
                  o'zgaruvchisi yo'q: usiz Vercel <code>Authorization</code> sarlavhasini
                  qo'shmaydi va endpoint 401 qaytaradi.
                  <br />
                  Oqibati: muddati o'tgan Pro obunalar bekor qilinmaydi, ID'siz qolgan
                  hisoblarga qisqa ID berilmaydi, kunlik ko'rsatkichlar va reyting
                  yozilmaydi.
                </div>
              </div>
            );

            if (!finished || finished < started) return (
              <div className="admin-info-box admin-info-box--warn">
                <div className="admin-info-title"><AlertTriangle size={15} /> Cron yarim yo'lda uzilgan</div>
                <div className="admin-info-text">
                  Oxirgi yurish {fmt(started)} da boshlangan, lekin tugamagan —
                  ehtimol 60 soniyalik funksiya limitiga urilgan. Ba'zi ishlar
                  (ID to'ldirish, obuna muddati) bajarilmay qolgan bo'lishi mumkin.
                </div>
              </div>
            );

            const ageH = (Date.now() - started.getTime()) / 3600000;
            if (ageH > 36) return (
              <div className="admin-info-box admin-info-box--warn">
                <div className="admin-info-title"><AlertTriangle size={15} /> Cron {Math.floor(ageH / 24)} kundan beri ishlamadi</div>
                <div className="admin-info-text">Oxirgi muvaffaqiyatli yurish: {fmt(finished)}.</div>
              </div>
            );

            return (
              <div className="admin-info-text" style={{ color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                Kunlik cron: {fmt(finished)} · {d.errors ? `${d.errors} ta xato` : 'xatosiz'}
                {d.shortIdsAssigned ? ` · ${d.shortIdsAssigned} ta ID to'ldirildi` : ''}
              </div>
            );
          })()}

          {metricsError ? (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> Faollik tarixini o'qib bo'lmadi</div>
              <div className="admin-info-text">{metricsError}</div>
            </div>
          ) : metricsLoading && metrics.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon">📈</div><div className="admin-empty-text">Yuklanmoqda...</div></div>
          ) : metrics.length === 0 ? (
            <div className="admin-info-box">
              <div className="admin-info-title"><Info size={15} /> Hali ma'lumot yig'ilmagan</div>
              <div className="admin-info-text">
                {/* ⚠️ Bu matn AVVAL shartsiz "ertaga paydo bo'ladi" derdi — cron
                    umuman ishlamayotganda ham. Endi sabab yuqoridagi holat
                    qutisida turadi, bu yerda faqat kutilayotgan holat. */}
                Har kun bitta qator qo'shiladi: jami, Pro, kunlik va haftalik faol
                foydalanuvchilar. Yozuvni kunlik cron (soat 11:00, Toshkent) qo'shadi —
                uning holati yuqorida ko'rsatilgan.
              </div>
            </div>
          ) : (
            <>
              {/* ── Konversiya voronkasi (eng so'nggi kun) ──────────────────
                  Auditda aniqlangan bo'shliq: panel faqat "jami" va "Pro"
                  raqamlarini ko'rsatardi, ya'ni "qayerda odam yo'qolyapti?"
                  degan savolga javob yo'q edi. Voronka aynan shuni ko'rsatadi:
                  ro'yxatdan o'tdi → testni boshladi → to'ladi. */}
              {(() => {
                const m = metrics[0];
                if (!m || !m.total) return null;
                const pct = (n) => (n == null ? '—' : `${Math.round((n / m.total) * 100)}%`);
                const steps = [
                  { label: "Ro'yxatdan o'tgan", val: m.total, hint: 'jami hisoblar' },
                  { label: 'Testni boshlagan', val: m.activated, hint: 'kamida bir marta javob bergan' },
                  { label: 'Haftalik faol', val: m.wau, hint: "so'nggi 7 kunda yechgan" },
                  { label: "Pul to'lagan", val: m.paidActive, hint: 'promo/admin Pro hisobga olinmagan' },
                ];
                return (
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div className="admin-info-text" style={{ marginBottom: 12 }}>
                      <strong>{m.id}</strong> holatiga ko'ra voronka:
                    </div>
                    <div className="admin-stats-grid">
                      {steps.map(s => (
                        <div key={s.label} className="stat-box">
                          <div className="stat-box-val" style={{ color: 'var(--blue)' }}>
                            {s.val ?? '—'}
                            <span style={{ fontSize: '0.6em', color: 'var(--text3)', marginLeft: 6 }}>{pct(s.val)}</span>
                          </div>
                          <div className="stat-box-lbl">{s.label}</div>
                          <div className="stat-box-lbl" style={{ color: 'var(--text3)', fontSize: '0.85em' }}>{s.hint}</div>
                        </div>
                      ))}
                    </div>
                    {/* ── TUSHUM, SO'MDA (ADMIN UX AUDIT 2026-08-18, A-2) ──
                        Ilgari bu yerda faqat TRANZAKSIYALAR SONI ko'rsatilardi
                        (`.count()`), ya'ni 12 ta to'lov 12 x 29 000 ham,
                        12 x 199 000 ham bo'lishi mumkin edi — panel farqni
                        ko'rsatmasdi. Endi cron summani ham yozadi. */}
                    {(m.paymentsSumToday != null || m.paymentsSum30d != null) && (
                      <div className="admin-stats-grid" style={{ marginTop: 14 }}>
                        <div className="stat-box">
                          <div className="stat-box-val" style={{ color: 'var(--green)' }}>
                            {(m.paymentsSumToday ?? 0).toLocaleString('uz-UZ')}
                          </div>
                          <div className="stat-box-lbl">Bugungi tushum, so'm</div>
                        </div>
                        <div className="stat-box">
                          <div className="stat-box-val" style={{ color: 'var(--green)' }}>
                            {(m.paymentsSum30d ?? 0).toLocaleString('uz-UZ')}
                          </div>
                          <div className="stat-box-lbl">30 kunlik tushum, so'm</div>
                        </div>
                        <div className="stat-box">
                          <div className="stat-box-val">
                            {m.paymentsSum30d && m.paidActive
                              ? Math.round(m.paymentsSum30d / m.paidActive).toLocaleString('uz-UZ')
                              : '—'}
                          </div>
                          <div className="stat-box-lbl">O'rtacha chek, so'm</div>
                        </div>
                      </div>
                    )}
                    {/* ── Push kanali (2026-08-19) ────────────────────────
                        NEGA: 357 hisobning hech birida token yo'q edi va buni
                        ko'rsatadigan joy yo'q edi — eslatma tizimi jimgina
                        o'lik turardi. Uch raqam sababni ajratadi:
                        «so'ralmagan» ko'p → oyna chiqmayapti; «bloklangan»
                        ko'p → ruxsat berilmayapti (Play ilovasida
                        bildirishnoma delegatsiyasi yoqilmagan bo'lishi
                        mumkin); «ruxsat bor, token yo'q» → getToken yiqilyapti
                        (sabab `users/{uid}.pushLastError` da). */}
                    {m.pushTokens != null && (
                      <div className="admin-stats-grid" style={{ marginTop: 14 }}>
                        <div className="stat-box">
                          <div className="stat-box-val" style={{ color: m.pushTokens ? 'var(--green)' : 'var(--red)' }}>
                            {m.pushTokens}
                          </div>
                          <div className="stat-box-lbl">Push tokeni bor</div>
                        </div>
                        <div className="stat-box">
                          <div className="stat-box-val" style={{ color: 'var(--amber)' }}>{m.pushDenied ?? 0}</div>
                          <div className="stat-box-lbl">Ruxsat bloklangan</div>
                        </div>
                        <div className="stat-box">
                          <div className="stat-box-val" style={{ color: 'var(--text3)' }}>{m.pushUnasked ?? 0}</div>
                          <div className="stat-box-lbl">Hali so'ralmagan</div>
                        </div>
                        <div className="stat-box">
                          <div className="stat-box-val" style={{ color: 'var(--text3)' }}>{m.pushUnknown ?? 0}</div>
                          <div className="stat-box-lbl">Holati noma'lum</div>
                        </div>
                      </div>
                    )}
                    {m.paymentsTotal != null && (
                      <div className="admin-info-text" style={{ marginTop: 12 }}>
                        Jami to'lovlar (soni): <strong>{m.paymentsTotal}</strong>
                        {m.paymentsToday ? <> · so'nggi 24 soatda <strong>{m.paymentsToday}</strong></> : null}
                        {m.paymentsSum30d == null && (
                          <><br /><span style={{ color: 'var(--text3)' }}>
                            So'mdagi tushum ertangi cron'dan keyin paydo bo'ladi.
                          </span></>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="glass-panel" style={{ padding: 20 }}>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {['Sana', 'Jami', 'Pro', "To'lagan", 'Kunlik faol', 'Haftalik faol', 'Yangi'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map(m => (
                        <tr key={m.id}>
                          <td>{m.id}</td>
                          <td>{m.total ?? '—'}</td>
                          <td>{m.premium ?? '—'}</td>
                          <td>{m.paidActive ?? '—'}</td>
                          <td><strong>{m.dau ?? '—'}</strong></td>
                          <td>{m.wau ?? '—'}</td>
                          <td>{m.newToday ? `+${m.newToday}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="admin-info-text" style={{ marginTop: 10 }}>
                  «Kunlik faol» — oxirgi 24 soatda test yechgan odamlar soni
                  (<code>userStats.lastActiveAt</code>). Ro'yxatdan o'tib hech narsa qilmagan
                  hisoblar bu ustunga tushmaydi. «To'lagan» — <code>premiumPlan == 'paid'</code>,
                  ya'ni promo yoki admin qo'lda bergan Pro bu ustunga kirmaydi.
                </div>
              </div>
            </>
          )}

          {/* ── Fan bo'yicha o'qituvchilar ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <div className="admin-section-title admin-section-title--flush">
              <Users size={18} style={{ color: 'var(--blue)' }} /> Fan bo'yicha o'qituvchilar
            </div>
            <button className="btn btn-sm btn-outline" onClick={loadSubjectStats} disabled={subjectStatsLoading}>
              <RefreshCw size={14} className={subjectStatsLoading ? 'spin' : ''} /> {subjectStatsLoading ? 'Sanalmoqda...' : 'Yangilash'}
            </button>
          </div>

          {subjectStatsError ? (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertCircle size={15} /> Fan kesimini o'qib bo'lmadi</div>
              <div className="admin-info-text">{subjectStatsError}</div>
              <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={loadSubjectStats}>
                <RefreshCw size={14} /> Qayta urinish
              </button>
            </div>
          ) : subjectStatsLoading && !subjectStats ? (
            <div className="admin-empty"><div className="admin-empty-icon">📊</div><div className="admin-empty-text">Fanlar sanalmoqda...</div></div>
          ) : subjectStats ? (
            <div className="glass-panel" style={{ padding: 20 }}>
              <div className="admin-subject-list">
                {subjectRows.map(r => (
                  <div key={r.id} className="admin-subject-row">
                    <div className="admin-subject-head">
                      <span className="admin-subject-name">{r.name}</span>
                      <span className="admin-subject-count">
                        {r.failed ? '—' : <>{r.total.toLocaleString()} ta</>}
                        {!r.failed && r.sharePct > 0 && <span className="admin-subject-share"> · {r.sharePct}%</span>}
                      </span>
                    </div>
                    <div className="admin-subject-bar">
                      <div className="admin-subject-bar-fill" style={{ width: `${r.barPct}%` }} />
                    </div>
                    <div className="admin-subject-meta">
                      <span>Pro: <strong>{r.premium.toLocaleString()}</strong>{r.proPct !== null && ` (${r.proPct}%)`}</span>
                      <span>Savol: <strong>{r.questions != null ? r.questions.toLocaleString() : '—'}</strong></span>
                      {r.perUser !== null && <span>{r.perUser.toFixed(1)} savol/kishi</span>}
                      {r.needsContent && (
                        <span className="admin-chip admin-chip--amber">⚠️ Savol yetishmaydi</span>
                      )}
                      {r.failed && <span className="admin-chip admin-chip--red">so'rov yiqildi</span>}
                    </div>
                  </div>
                ))}

                {/* Onboardingni tugatmaganlar. Nolga teng bo'lsa ko'rsatilmaydi. */}
                {subjectStats.unknown > 0 && (
                  <div className="admin-subject-row admin-subject-row--muted">
                    <div className="admin-subject-head">
                      <span className="admin-subject-name">Fan belgilanmagan</span>
                      <span className="admin-subject-count">{subjectStats.unknown.toLocaleString()} ta</span>
                    </div>
                    <div className="admin-subject-meta">
                      <span>Onboardingni tugatmagan yoki profilda fan tanlamagan hisoblar</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-subject-note">
                {/* Ikkala ogohlantirish ham raqamlarni noto'g'ri o'qishdan saqlaydi. */}
                <div>
                  «Savol» ustuni <strong>«Yangilanishni yuborish»</strong> tugmasi oxirgi bosilgandagi holat —
                  savol qo'shgandan keyin uni bosmasangiz, bu yerdagi son ham, foydalanuvchidagi badge ham eskiradi.
                </div>
                <div style={{ marginTop: 6 }}>
                  «Pro» — <code>isPremium</code> bayrog'i bo'yicha, ya'ni <strong>muddati tugaganlar ham</strong> shu songa kiradi.
                </div>
                {subjectStats.totalUsers != null && (
                  <div style={{ marginTop: 6 }}>
                    Jami <strong>{subjectStats.totalUsers.toLocaleString()}</strong> foydalanuvchi ·
                    oxirgi sanoq {subjectStats.updatedAt.toLocaleTimeString('uz-UZ')}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="admin-section-title" style={{ marginTop: 8 }}><MessageCircle size={18} style={{ color: 'var(--amber)' }} /> E'tirozlar statistikasi</div>
          <div className="admin-stats-grid">
            <div className="stat-box glass-panel">
              <div className="stat-box-val">{objections.length}</div>
              <div className="stat-box-lbl">Jami E'tirozlar</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--amber)' }}>{unsolvedCount}</div>
              <div className="stat-box-lbl">Kutmoqda</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--green)' }}>{solvedCount}</div>
              <div className="stat-box-lbl">Hal qilingan</div>
            </div>
            <div className="stat-box glass-panel">
              <div className="stat-box-val" style={{ color: 'var(--blue)' }}>
                {objections.length > 0 ? Math.round((solvedCount / objections.length) * 100) : 0}%
              </div>
              <div className="stat-box-lbl">Hal qilish darajasi</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontWeight: '700', fontSize: 'var(--fs-xl)', marginBottom: '20px', color: 'var(--text)' }}>Mavzu bo'yicha e'tirozlar</div>
            {Object.entries(
              objections.reduce((acc, o) => {
                const key = o.topic || 'Boshqa';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1]).map(([topic, count]) => {
              const pct = Math.round((count / objections.length) * 100);
              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ minWidth: '100px', fontSize: 'var(--fs-md)', color: 'var(--text2)', fontWeight: '500', flex: '0 0 auto' }}>{topic}</div>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ minWidth: '50px', textAlign: 'right', fontSize: 'var(--fs-md)', fontWeight: '700', color: 'var(--text2)' }}>{count} ta</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'tariffs' && (
        <div className="admin-stack-l">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div className="admin-section-title"><Zap size={18} style={{ color: 'var(--amber)' }} /> Pro Tariflar</div>
            <button className="btn btn-primary" onClick={() => { setIsAddingTariff(true); setEditingTariff(null); setNewTariff({ id: '', name: '', price: 0, durationMonths: 1 }); }}>
              <Plus size={14} /> Yangi tarif
            </button>
          </div>

          <div className="admin-stack">
            {tariffs.map((t) => (
              <div key={t.id} className="admin-tariff-card">
                <div className="admin-tariff-info">
                  <div className="admin-tariff-name">{t.name}</div>
                  <div className="admin-tariff-details">{t.id} · {t.durationMonths === 999 ? 'Cheksiz' : `${t.durationMonths} oy`}</div>
                </div>
                <div className="admin-tariff-price">{new Intl.NumberFormat('uz-UZ').format(t.price)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => { setEditingTariff(t); setNewTariff({...t}); setIsAddingTariff(true); }}><Edit3 size={14} /></button>
                  <button className="btn btn-sm btn-outline admin-btn-danger" onClick={() => handleDeleteTariff(t.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Yangi bildirishnoma yuborish formasi */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={20} style={{ color: 'var(--blue)' }} /> Yangi Bildirishnoma Yuborish
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                <label className="admin-label">Sarlavha</label>
                <input 
                  className="modal-input" 
                  placeholder="Masalan: 🎉 Yangi imtihon bo'limi qo'shildi!" 
                  value={newNotif.title} 
                  onChange={e => setNewNotif({...newNotif, title: e.target.value})} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                <label className="admin-label">Xabar matni</label>
                <textarea 
                  className="modal-input" 
                  style={{ minHeight: '80px' }}
                  placeholder="Xabar mazmunini batafsil yozing..." 
                  value={newNotif.message} 
                  onChange={e => setNewNotif({...newNotif, message: e.target.value})} 
                />
              </div>

              <div className="admin-form-row">
                <label className="admin-label">Xabar turi</label>
                <select 
                  className="modal-input" 
                  value={newNotif.type} 
                  onChange={e => setNewNotif({...newNotif, type: e.target.value})}
                >
                  <option value="info">ℹ️ Ma'lumot (Info - Ko'k)</option>
                  <option value="success">✅ Muvaffaqiyat (Success - Yashil)</option>
                  <option value="warning">⚠️ Ogohlantirish (Warning - Sariq)</option>
                </select>
              </div>

              <div className="admin-form-row">
                <label className="admin-label">Qabul qiluvchilar</label>
                <select 
                  className="modal-input" 
                  value={newNotif.targetUser} 
                  onChange={e => setNewNotif({...newNotif, targetUser: e.target.value})}
                >
                  <option value="all">👥 Barcha foydalanuvchilar (All)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>👤 {u.email || u.id}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSendNotification}
                disabled={isSendingNotif || !newNotif.title || !newNotif.message}
              >
                {isSendingNotif ? 'Yuborilmoqda...' : <><Send size={16} /> Yuborish</>}
              </button>
            </div>
          </div>

          {/* Yuborilgan bildirishnomalar ro'yxati */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} style={{ color: 'var(--amber)' }} /> Yuborilgan Bildirishnomalar Tarixi
            </div>
            
            {adminNotifs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 'var(--fs-base)' }}>
                Hali hech qanday bildirishnoma yuborilmagan.
              </div>
            ) : (
              <div className="admin-stack">
                {adminNotifs.map(n => (
                  <div key={n.id} style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0 }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                        background: n.type === 'success' ? 'var(--green-bg)' : n.type === 'warning' ? 'var(--amber-bg)' : 'var(--blue-bg)',
                        color: n.type === 'success' ? 'var(--green)' : n.type === 'warning' ? 'var(--amber)' : 'var(--blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {n.type === 'success' ? <CheckCircle2 size={20} /> : n.type === 'warning' ? <AlertCircle size={20} /> : <Info size={20} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: 'var(--fs-lg)', color: 'var(--text)', marginBottom: '4px' }}>{n.title}</div>
                        <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', marginBottom: '6px' }}>{n.message}</div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--fs-xs)', color: 'var(--text3)', fontWeight: '500' }}>
                          <span>📅 {new Date(n.date).toLocaleString()}</span>
                          <span>🎯 {n.targetUser === 'all' ? 'Barcha foydalanuvchilar' : `👤 Foydalanuvchi: ${n.targetUser}`}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ color: 'var(--red)', borderColor: 'var(--red)', flexShrink: 0 }}
                      onClick={() => handleDeleteNotification(n.id)}
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          REFERRALLAR BO'LIMI — Admin Panel
          ════════════════════════════════════════════ */}
      {tab === 'referrals' && (
        <div className="admin-stack-l">

          {/* Umumiy statistika kartalari */}
          <div className="admin-ref-grid">
            {[
              { label: 'Jami referrallar', value: referralSummary.total, icon: '🔗', color: 'var(--blue)' },
              { label: "To'lagan", value: referralSummary.paid, icon: '✅', color: 'var(--green)' },
              { label: 'Kutilmoqda', value: referralSummary.pending, icon: '⏳', color: 'var(--amber)' },
              { label: "Jami bonus", value: referralSummary.totalBonus.toLocaleString() + " so'm", icon: '💰', color: 'var(--accent2)' },
            ].map((card, i) => (
              <div key={i} className="admin-stat-card">
                <div style={{ fontSize: 'var(--fs-4xl)', marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 2 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Referrallar jadvali */}
          <div className="glass-panel" style={{ padding: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--blue)' }} /> Barcha referrallar ro'yxati
              </div>
              <div className="admin-row--tight">
                <button className="btn btn-sm btn-outline" onClick={() => loadReferrals({ force: true })} disabled={referralLoading} title="Ro'yxatni yangilash">
                  <RefreshCw size={14} className={referralLoading ? 'spin' : ''} />
                </button>
                <button className="btn btn-sm btn-outline" onClick={exportReferrals} disabled={!allReferrals.length} title="CSV faylga eksport">
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {referralError ? (
              <div className="admin-info-box admin-info-box--error">
                <div className="admin-info-title"><AlertCircle size={15} /> Referrallarni o'qib bo'lmadi</div>
                <div className="admin-info-text">{referralError}</div>
              </div>
            ) : referralLoading ? (
              <div className="admin-state-block">⏳ Yuklanmoqda...</div>
            ) : allReferrals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <div style={{ fontSize: 'var(--fs-8xl)', marginBottom: 8 }}>🔗</div>
                <div>Hali hech kim referral orqali kelmagan</div>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {["Taklif qiluvchi", "Taklif qilingan", "Sana", "Status", "Bonus", "Bepul tugash", "Amal"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* A-8: ilgari bu yerda `allReferrals.sort(...)` edi — `sort`
                        JOYIDA ishlaydi, ya'ni React state massivi render paytida
                        mutatsiya qilinardi. Nusxa olamiz. */}
                    {[...allReferrals]
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.referrerName || '—'}</div>
                            <div className="admin-td-sub">{r.referrerId?.slice(0, 8)}...</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.referredName || '—'}</div>
                            <div className="admin-td-sub">{r.referredId?.slice(0, 8)}...</div>
                          </td>
                          <td className="admin-td-sub">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                          </td>
                          <td>
                            {r.status === 'paid' ? (
                              <span className="status-badge-neon paid">✅ To'ladi</span>
                            ) : r.status === 'active' ? (
                              <span className="status-badge-neon active">🔄 Faol</span>
                            ) : (
                              <span className="status-badge-neon pending">⏳ Kutilmoqda</span>
                            )}
                          </td>
                          <td style={{ color: r.bonusPaid ? 'var(--green)' : 'var(--text3)', fontWeight: r.bonusPaid ? 700 : 400 }}>
                            {r.bonusPaid ? `+${(r.bonusAmount || 15000).toLocaleString()} so'm` : '—'}
                          </td>
                          <td>
                            {(() => {
                              if (r.freeExpire) {
                                return (
                                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                                    🎁 {new Date(r.freeExpire).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                                  </span>
                                );
                              }
                              if (r.createdAt) {
                                const created = new Date(r.createdAt);
                                const now = new Date();
                                const diffMs = now - created;
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                if (diffDays < 7) {
                                  return (
                                    <span style={{ color: 'var(--blue)', fontWeight: 600 }}>
                                      🎁 Trial: {7 - diffDays} kun
                                    </span>
                                  );
                                } else if (diffDays < 10) {
                                  return (
                                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                                      ⏳ Chegirma: {10 - diffDays} kun
                                    </span>
                                  );
                                } else {
                                  return <span style={{ color: 'var(--text3)' }}>❌ Tugagan</span>;
                                }
                              }
                              return <span style={{ color: 'var(--text3)' }}>—</span>;
                            })()}
                          </td>
                          <td>
                            <div className="admin-row--tight">
                              {r.status !== 'paid' && (
                                <button
                                  className="btn btn-sm admin-btn-ok"
                                  onClick={() => handleMarkReferralPaid(r.id, r.referrerId)}
                                >
                                  ✓ To'ladi
                                </button>
                              )}
                              {r.freeExpire && (
                                <button
                                  className="btn btn-sm btn-outline admin-btn-danger"
                                  onClick={() => handleCancelReferralPremium(r.referredId, r.id)}
                                  title="Bepul premiumni bekor qilish (to'lagan mijozga tegmaydi)"
                                >
                                  ✕ Bepul Pro
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Qoidalar eslatmasi */}
          <div className="admin-info-box">
            <div className="admin-info-title">ℹ️ Referral tizimi joriy qoidalari (50/50 MODEL)</div>
            <div className="admin-info-text">
              • <strong>Taklif qilingan do'st (B)</strong> ro'yxatdan o'tganda keyingi oylik to'loviga <strong>50% chegirma</strong> oladi (bepul premium yo'q).<br/>
              • <strong>Taklif qiluvchi (A)</strong> do'sti (B) birinchi to'lovni muvaffaqiyatli qilgandan so'ng <strong>15 000 so'm</strong> bonus oladi.<br/>
              • Maksimal takliflar soni: <strong>5 ta do'st</strong> (maksimal 75 000 so'm bonus).<br/>
              • To'lov amalga oshirilganda (Click orqali) referral statusi avtomatik ravishda <strong>"To'ladi"</strong>ga o'tadi va bonus avtomatik beriladi.<br/>
              • <strong>Amal (✓ To'ladi)</strong> tugmasi faqat favqulodda holatlar (qo'lda to'lov qilinganda) uchun admin qo'shimcha boshqaruvi sifatida qoldirilgan.
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ zIndex: 1000 }}
          >
            <motion.div
              ref={qModalRef}
              role="dialog"
              aria-modal="true"
              aria-label={editingQ ? 'Savolni tahrirlash' : "Yangi savol qo'shish"}
              tabIndex={-1}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
            >
              <div className="modal-title" style={{ flexShrink: 0 }}>{editingQ ? 'Savolni tahrirlash' : 'Yangi savol qo\'shish'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0', overflowY: 'auto', flex: 1 }}>
                <div className="admin-form-row">
                  <label className="admin-label">Savol matni</label>
                  <textarea
                    className="modal-input"
                    style={{ minHeight: '80px' }}
                    value={newQ.q}
                    onChange={e => setNewQ({...newQ, q: e.target.value})}
                    onPaste={handleImagePaste}
                    placeholder="Savol matni. Rasmni to'g'ridan-to'g'ri shu yerga qo'ysangiz (Ctrl+V) — avtomatik yuklanadi."
                  />
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Rasm qo'shish (ixtiyoriy) — yoki savol maydoniga Ctrl+V</label>
                  {newQ.image && (
                    <div style={{ position: 'relative', width: '150px', marginBottom: '8px' }}>
                      <img src={newQ.image} alt="Uploaded" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      <button 
                        className="btn btn-sm btn-outline" 
                        style={{ position: 'absolute', top: 5, right: 5, padding: '4px', background: 'var(--bg)', color: 'var(--red)' }}
                        onClick={() => setNewQ({...newQ, image: ''})}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    style={{ fontSize: 'var(--fs-input)', color: 'var(--text3)' }}
                  />
                  {isUploadingImage && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--blue)' }}>Yuklanmoqda...</div>}
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Mavzu (topicId)</label>
                  <select
                    className="modal-input"
                    value={newQ.topicId}
                    onChange={e => setNewQ({...newQ, topicId: parseInt(e.target.value)})}
                    style={{ cursor: 'pointer' }}
                  >
                    {TOPICS.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.id} — {t.name} ({Array.isArray(t.category) ? t.category.join(', ') : t.category})
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: '-4px' }}>
                    ⚡ Category avtomatik ravishda mavzuga mos ravishda belgilanadi.
                  </div>
                </div>
                <div className="admin-stack">
                  <label className="admin-label">Javob variantlari</label>
                  {newQ.opts.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: '700', color: 'var(--text3)' }}>{String.fromCharCode(65 + i)})</span>
                      <input
                        className="modal-input"
                        value={opt}
                        onChange={e => {
                          const nextOpts = [...newQ.opts];
                          nextOpts[i] = e.target.value;
                          setNewQ({...newQ, opts: nextOpts});
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">To'g'ri javob indeksi (0-3)</label>
                  <input
                    type="number"
                    className="modal-input"
                    value={newQ.correct}
                    onChange={e => setNewQ({...newQ, correct: parseInt(e.target.value)})}
                    min="0" max="3"
                  />
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Tushuntirish (Explanation)</label>
                  <textarea
                    className="modal-input"
                    value={newQ.explanation}
                    onChange={e => setNewQ({...newQ, explanation: e.target.value})}
                  />
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Eslab qolish usuli (Mnemonic)</label>
                  <input
                    className="modal-input"
                    value={newQ.mnemonic}
                    onChange={e => setNewQ({...newQ, mnemonic: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ flexShrink: 0, marginTop: '16px' }}>
                <button className="btn btn-outline" onClick={() => { setIsAdding(false); setEditingQ(null); }}>Bekor qilish</button>
                <button className="btn btn-primary" onClick={handleSaveQuestion} disabled={!newQ.q || newQ.opts.some(o => !o)}>Saqlash</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingTariff && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ zIndex: 1000 }}
          >
            <motion.div
              ref={tariffModalRef}
              role="dialog"
              aria-modal="true"
              aria-label={editingTariff ? 'Tarifni tahrirlash' : 'Yangi tarif'}
              tabIndex={-1}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '400px', width: '90%', padding: '24px' }}
            >
              <div className="modal-title">{editingTariff ? 'Tarifni tahrirlash' : 'Yangi tarif'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
                <div className="admin-form-row">
                  <label className="admin-label">ID (masalan: 6months)</label>
                  <input className="modal-input" value={newTariff.id} onChange={e => setNewTariff({...newTariff, id: e.target.value})} disabled={!!editingTariff} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Nomi</label>
                  <input className="modal-input" value={newTariff.name} onChange={e => setNewTariff({...newTariff, name: e.target.value})} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Narxi (so'm)</label>
                  <input type="number" className="modal-input" value={newTariff.price} onChange={e => setNewTariff({...newTariff, price: parseInt(e.target.value)})} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-label">Muddati (oy, cheksiz uchun 999)</label>
                  <input type="number" className="modal-input" value={newTariff.durationMonths} onChange={e => setNewTariff({...newTariff, durationMonths: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button className="btn btn-outline" onClick={() => setIsAddingTariff(false)}>Bekor qilish</button>
                <button className="btn btn-primary" onClick={handleSaveTariff} disabled={!newTariff.id || !newTariff.name || !newTariff.price}>Saqlash</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dublikat PREVIEW modali — o'chirishdan oldin ko'rsatadi */}
      {dupPreview && (
        <div className="admin-modal-overlay">
          <motion.div
            ref={dupModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Topilgan dublikatlar"
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="admin-modal-panel admin-modal-panel--lg"
          >
            <div className="admin-row-between" style={{ marginBottom: 4 }}>
              <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', margin: 0 }}>🔍 Topilgan dublikatlar</h3>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>Qamrov: <strong>{dupPreview.scope}</strong></span>
            </div>
            <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', marginBottom: 12 }}>
              <strong style={{ color: 'var(--red)' }}>{dupPreview.totalRemove} ta</strong> savol o'chiriladi · {dupPreview.groups.length} guruh ·
              har guruhda eng to'liq (izohli) variant <strong style={{ color: 'var(--green)' }}>saqlanadi</strong>.
            </p>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {dupPreview.groups.map((g, gi) => (
                <div key={gi} className="admin-card">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                    <span className="admin-chip admin-chip--green">🟢 Saqlanadi</span>
                    <span style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', fontWeight: 600 }}>{g.keep.q}</span>
                  </div>
                  {g.removed.map((r, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 4, paddingLeft: 8 }}>
                      <span className="admin-chip admin-chip--red">🔴 {r.sim}%</span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)' }}>{r.q} <em style={{ opacity: 0.6 }}>(#{r.topicId})</em></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" disabled={dupDeleting} onClick={() => setDupPreview(null)}>Bekor qilish</button>
              <button className="btn admin-btn-danger" style={{ background: 'var(--red)', color: '#fff', border: 'none', fontWeight: 700 }} disabled={dupDeleting} onClick={executeDuplicateDeletion}>
                {dupDeleting ? 'O\'chirilmoqda...' : `Hammasini o'chirish (${dupPreview.totalRemove})`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Pro berish modali (A-5 / B-4) — `window.prompt` o'rniga ── */}
      {/* ── Rolni boshqarish (window.prompt o'rniga) ── */}
      {roleModal && (
        <div className="admin-modal-overlay">
          <motion.div
            ref={roleModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Foydalanuvchi rolini boshqarish"
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="admin-modal-panel admin-modal-panel--md"
          >
            <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              <Shield size={18} style={{ color: 'var(--blue)', verticalAlign: '-3px', marginRight: 6 }} />
              Rolni boshqarish
            </h3>
            <p className="admin-info-text" style={{ marginTop: 4, marginBottom: 16 }}>
              <strong style={{ color: 'var(--text)' }}>{roleModal.name}</strong> · joriy holat:{' '}
              {roleModal.role === 'admin' ? "To'liq admin"
                : roleModal.role === 'partner' ? `Hamkor ustoz (${roleModal.partnerCode || 'kodsiz'})`
                : 'Oddiy foydalanuvchi'}
            </p>

            <div className="admin-stack">
              <button
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => applyRole(roleModal, 'user')}
                disabled={roleModal.role === 'user' && !roleModal.partnerCode}
              >
                👤 Oddiy foydalanuvchi
              </button>

              <div className="admin-info-box">
                <div className="admin-info-title">🤝 Hamkor ustoz</div>
                <div className="admin-info-text" style={{ marginBottom: 8 }}>
                  Faqat <code>/partner</code> sahifasini ochadi: o'z promokodi bilan
                  kirgan ustozlar ro'yxati va biriktirilgan fan bo'yicha natijalar.
                  Fan promokodning o'zida («Promo» bo'limi) belgilanadi.
                </div>
                <div className="admin-row--tight">
                  <input
                    className="admin-input admin-input--code"
                    value={rolePartnerCode}
                    onChange={e => setRolePartnerCode(e.target.value.toUpperCase())}
                    placeholder="MIRONSHOH"
                    aria-label="Hamkor promokodi"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => applyRole(roleModal, 'partner', rolePartnerCode.trim().toUpperCase())}
                    disabled={!rolePartnerCode.trim()}
                  >
                    Biriktirish
                  </button>
                </div>
              </div>

              <button
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', color: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={() => applyRole(roleModal, 'admin')}
                disabled={roleModal.role === 'admin'}
              >
                🛡️ To'liq admin — boshqaruv, savollar va to'lovlar
              </button>
            </div>

            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setRoleModal(null)}>Yopish</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Vaqtinchalik parol. Bu oyna — parolni ko'rishning YAGONA imkoniyati:
          Firebase parolni xeshlab saqlaydi, ya'ni uni qaytadan o'qib bo'lmaydi.
          Yopilgandan keyin qolgan yo'l — qaytadan tiklash. Shuning uchun oynada
          ko'chirish tugmasi bor va yopish tugmasi ataylab «Yozib oldim» deyiladi. */}
      {resetPwModal && (
        <div className="admin-modal-overlay">
          <motion.div
            ref={resetPwModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Vaqtinchalik parol"
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="admin-modal-panel admin-modal-panel--md"
          >
            <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              <KeyRound size={18} style={{ color: 'var(--amber)', verticalAlign: '-3px', marginRight: 6 }} />
              Vaqtinchalik parol
            </h3>
            <p className="admin-info-text" style={{ marginTop: 4, marginBottom: 16 }}>
              <strong style={{ color: 'var(--text)' }}>{resetPwModal.name}</strong> uchun yangi parol o'rnatildi.
            </p>

            {/* `textTransform: none` — SHART. `.admin-input--code` matnni KATTA
                HARFGA aylantiradi (u promokodlar uchun yozilgan), parol esa
                registrga sezgir: ekranda `K7pQ…` ni `K7PQ…` deb ko'rgan admin
                uni telefonda xato aytib berardi. */}
            <div className="admin-row--tight" style={{ marginBottom: 12 }}>
              <input
                className="admin-input admin-input--code"
                value={resetPwModal.password}
                readOnly
                onFocus={e => e.target.select()}
                aria-label="Vaqtinchalik parol"
                style={{
                  textTransform: 'none',
                  fontSize: 'var(--fs-3xl)',
                  letterSpacing: '2px',
                  textAlign: 'center',
                }}
              />
              <button className="btn btn-primary" onClick={copyTempPassword}>
                <Copy size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                {pwCopied ? "Ko'chirildi" : "Ko'chirish"}
              </button>
            </div>

            <div className="admin-info-box">
              <div className="admin-info-title">⚠️ Bu oyna bir marta ko'rsatiladi</div>
              <div className="admin-info-text">
                Parol hech qayerda saqlanmaydi — yopilgandan keyin uni qayta ko'rib bo'lmaydi
                (kerak bo'lsa qaytadan tiklaysiz). Foydalanuvchiga yetkazing va ayting:
                kirgandan so'ng <strong>Profil → Parolni o'zgartirish</strong> dan o'z parolini qo'ysin.
                Ochiq qolgan seanslari uzildi — barcha qurilmada qaytadan kirishi kerak.
              </div>
            </div>

            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={() => setResetPwModal(null)}>Yozib oldim</button>
            </div>
          </motion.div>
        </div>
      )}

      {premiumModal && (
        <div className="admin-modal-overlay">
          <motion.div
            ref={premiumModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Pro statusini berish"
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="admin-modal-panel admin-modal-panel--md"
          >
            <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              <Crown size={18} style={{ color: 'var(--amber)', verticalAlign: '-3px', marginRight: 6 }} />
              Pro berish
            </h3>
            <p className="admin-info-text" style={{ marginTop: 4, marginBottom: 16 }}>
              <strong style={{ color: 'var(--text)' }}>{premiumModal.name}</strong>
              {premiumModal.currentExpire && (
                <> · joriy muddat: {new Date(premiumModal.currentExpire).toLocaleDateString('uz-UZ')}</>
              )}
            </p>

            <div className="admin-form-row">
              <label className="admin-label" htmlFor="premium-until">Qaysi sanagacha</label>
              <input
                id="premium-until"
                type="date"
                className="admin-input"
                value={premiumUntil}
                min={isoDay(new Date())}
                onChange={e => setPremiumUntil(e.target.value)}
              />
            </div>

            <div className="admin-row" style={{ marginTop: 10 }}>
              {[[30, '30 kun'], [90, '3 oy'], [180, '6 oy'], [365, '1 yil']].map(([d, label]) => (
                <button key={d} type="button" className="btn btn-sm btn-outline" onClick={() => setPremiumUntil(dayFromNow(d))}>
                  {label}
                </button>
              ))}
            </div>

            <div className="admin-info-box" style={{ marginTop: 14 }}>
              <div className="admin-info-text">
                Obuna <strong>{premiumUntil ? new Date(`${premiumUntil}T23:59:59`).toLocaleDateString('uz-UZ') : '—'}</strong> kuni
                oxirida tugaydi. Reja <code>admin</code> deb belgilanadi — ya'ni muddat o'tganda
                avtomatik tugaydi va to'lov/promo obunalariga tegmaydi.
                <br />
                <strong>Muddatsiz Pro yo'li ataylab olib tashlangan:</strong> <code>premiumExpire</code> —
                obuna muddatining yagona manbasi.
              </div>
            </div>

            <div className="admin-modal-actions">
              <button className="btn btn-outline" onClick={() => setPremiumModal(null)} disabled={premiumSaving}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={grantPremium} disabled={premiumSaving || !premiumUntil}>
                {premiumSaving ? 'Saqlanmoqda...' : 'Pro berish'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Foydalanuvchi kartochkasi (B-3) ── */}
      {userCard && (
        <div className="admin-modal-overlay" onClick={() => setUserCard(null)}>
          <motion.div
            ref={userCardRef}
            role="dialog"
            aria-modal="true"
            aria-label="Foydalanuvchi kartochkasi"
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="admin-modal-panel admin-modal-panel--md"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-row-between">
              <div className="admin-row">
                <div className="admin-user-avatar-sm">
                  {(userCard.displayName || userCard.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text)' }}>{userCard.displayName || '—'}</div>
                  <div className="admin-user-subtext">{userCard.email || userCard.phone || userCard.phoneNumber || '—'}</div>
                </div>
              </div>
              <button className="admin-icon-btn" onClick={() => setUserCard(null)} aria-label="Yopish"><X size={18} /></button>
            </div>

            <div style={{ overflowY: 'auto', marginTop: 16 }}>
              <table className="admin-table">
                <tbody>
                  {[
                    ['Qisqa ID', userCard.shortId || '—'],
                    ['UID', userCard.id],
                    ['Telefon', userCard.phone || userCard.phoneNumber || '—'],
                    // Fan/toifa — kartochkada eng kerakli profil maydonlari:
                    // fan qaysi savol bazasini ishlatishini, toifa esa maqsad
                    // foizini belgilaydi (studyContract).
                    ['Fan', subjectName(userCard.subject) || '—'],
                    ['Toifa', TOIFA_NAMES[userCard.teacherCategory] || userCard.teacherCategory || '—'],
                    ['Rol', userCard.role || 'user'],
                    ['Pro', userCard.isPremium ? 'Ha' : "Yo'q"],
                    ['Obuna turi', userCard.premiumPlan || '—'],
                    ['Obuna usuli', userCard.premiumMethod || '—'],
                    ['Pro boshlangan', userCard.premiumSince ? new Date(userCard.premiumSince).toLocaleString('uz-UZ') : '—'],
                    ['Pro tugaydi', userCard.premiumExpire
                      ? new Date(userCard.premiumExpire).toLocaleString('uz-UZ')
                      : (userCard.isPremium ? '⚠️ MUDDATSIZ' : '—')],
                    ["Ro'yxatdan o'tgan", userCard.createdAt?.toDate
                      ? userCard.createdAt.toDate().toLocaleString('uz-UZ')
                      : (userCard.createdAt ? new Date(userCard.createdAt.seconds ? userCard.createdAt.seconds * 1000 : userCard.createdAt).toLocaleString('uz-UZ') : '—')],
                    ['Takliflar soni', userCard.referralCount ?? 0],
                    ['Referral bonusi', (userCard.referralBonus ?? 0).toLocaleString() + " so'm"],
                    ['Chegirma', userCard.referralDiscount ? `${userCard.referralDiscount}%` : '—'],
                    ['Oxirgi faollik', userCard.lastActiveAt
                      ? new Date(userCard.lastActiveAt).toLocaleString('uz-UZ')
                      : '—'],
                    ['Maktab', userCard.schoolName || '—'],
                    ['Hamkor kodi', userCard.partnerCode || '—'],
                    ['Oxirgi tranzaksiya', userCard.premiumTransId || '—'],
                    // ── Push tashxisi (2026-08-19) ──
                    // «Nega bu odamga eslatma bormadi?» degan savolga javob
                    // shu ikki qatorda: ruxsat holati + oxirgi xato kodi.
                    ['Push holati', {
                      granted: '✅ ruxsat berilgan', denied: '⛔ bloklangan',
                      default: '⏳ so\'ralmagan',
                    }[userCard.pushPerm] || '— (hali qayd etilmagan)'],
                    ['Push tokeni', Array.isArray(userCard.fcmTokens) && userCard.fcmTokens.length
                      ? `${userCard.fcmTokens.length} ta qurilma`
                      : "Yo'q"],
                    ['Push xatosi', userCard.pushLastError || '—'],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <th style={{ width: '45%' }}>{k}</th>
                      <td style={{ wordBreak: 'break-all' }}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-modal-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => handleSetPartnerCode(userCard.id, userCard.partnerCode)}>
                <Sparkles size={14} /> {userCard.partnerCode ? `Hamkor: ${userCard.partnerCode}` : "Hamkor kodi berish"}
              </button>
              <button className="btn btn-outline" onClick={() => { setUserCard(null); setTab('payments'); }}>
                <CreditCard size={14} /> To'lovlar
              </button>
              <button className="btn btn-primary" onClick={() => { const u = userCard; setUserCard(null); togglePremium(u.id, u.isPremium); }}>
                <Crown size={14} /> {userCard.isPremium ? 'Pro bekor qilish' : 'Pro berish'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* D-3: panel o'zining tasdiq oynasini saqlab turardi. `ConfirmDialog`
          umumiy komponenti allaqachon mavjud va `useModalA11y` bilan
          jihozlangan (Escape, fokus tutqichi, `role="dialog"`). */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        title="Tasdiqlang"
        text={confirmDialog.text}
        confirmLabel="Tasdiqlash"
        cancelLabel="Bekor qilish"
        danger
        onConfirm={() => {
          const fn = confirmDialog.onConfirm;
          setConfirmDialog({ isOpen: false, text: '', onConfirm: null });
          fn?.();
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, text: '', onConfirm: null })}
      />

      {/* ── M-1/M-2: e'tirozni bir oynada tuzatish ────────────────────
          Savol `questionId` bo'yicha 1 O'QISHDA ochiladi. Saqlangach shu
          savolga tegishli BARCHA e'tiroz yopiladi va lokal ro'yxat darhol
          yangilanadi — panel qayta yuklanmaydi (kvota tejaladi). */}
      <AnimatePresence>
        {fixTarget && (
          <FixQuestionModal
            objection={fixTarget}
            adminEmail={user?.email}
            showToast={showToast}
            onClose={() => setFixTarget(null)}
            onResolved={({ action, questionId, patch }) => {
              // E'tirozlar ro'yxati onSnapshot bilan o'zi yangilanadi;
              // savollar ro'yxati esa lokal — qo'lda moslaymiz.
              if (patch && questionId) {
                setQuestions(prev => prev.map(q =>
                  q.id === questionId ? { ...q, ...patch } : q));
              }
              if (action === 'fixed' || action === 'retired') setPendingPublish(true);
              setFixTarget(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminPage;
