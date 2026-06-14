import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { db, storage } from '../firebase';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, getDocs, addDoc, writeBatch, increment, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, MessageCircle, Users, BarChart3,
  CheckCircle, Trash2, AlertTriangle,
  ChevronDown, ChevronUp, Search, Plus, Edit3, FileText, Zap,
  Bell, Send, CheckCircle2, AlertCircle, Info, ArrowLeft, UploadCloud
} from 'lucide-react';

import './AdminPage.css';
import PromoTab from '../components/admin/PromoTab';
import { TOPICS } from '../data/mockData';
import { normalizeText, trigrams, jaccard } from '../utils/textSimilarity';

// Yaqin-dublikat chegarasi (0..1). Yuqori = faqat juda o'xshashlar (matching/sequence soxta-ijobiyni kamaytiradi).
const DUP_SIM_THRESHOLD = 0.87;

const getCategoryFromTopicId = (topicId) => {
  const idNum = parseInt(topicId);
  const topicObj = TOPICS.find(t => t.id === idNum);
  return topicObj ? topicObj.category : 'chqbt';
};

const AdminPage = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [tab, setTab] = useState('objections'); // objections | users | stats | questions | tariffs | notifications | referrals

  // ── Referral statistika state ──
  const [allReferrals, setAllReferrals] = useState([]);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralSummary, setReferralSummary] = useState({ total: 0, paid: 0, pending: 0, totalBonus: 0 });
  const [objections, setObjections] = useState([]);
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
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

  useEffect(() => {
    if (!isAdmin) return;
    const qNotifs = query(collection(db, 'notifications'), orderBy('date', 'desc'));
    const unsub = onSnapshot(qNotifs, (snap) => {
      setAdminNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Notifs fetch error:", err));
    return () => unsub();
  }, [isAdmin]);

  const handleSendNotification = async () => {
    if (!newNotif.title || !newNotif.message) {
      showToast("Sarlavha va matnni to'ldiring!", 'error');
      return;
    }
    setIsSendingNotif(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        ...newNotif,
        date: new Date().toISOString()
      });
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

      const normalize = (text) => text ? text.toLowerCase().replace(/[‘’`ʼ]/g, "’").replace(/\s+/g, " ").trim() : "";

      // Use already-loaded questions state — avoids re-fetching 6000+ docs
      const existingSet = new Set(questions.map(q => normalize(q.q)));

      const toAdd = [];
      list.forEach(q => {
        if (!q.q || !Array.isArray(q.opts) || q.correct === undefined) {
          console.warn("Noto'g'ri formatdagi savol chetlab o'tildi:", q);
          return;
        }

        const normQText = normalize(q.q);
        if (!existingSet.has(normQText)) {
          const resolvedTopicId = parseInt(q.topicId) || 0;
          toAdd.push({
            q: q.q,
            opts: q.opts,
            correct: parseInt(q.correct) || 0,
            topicId: resolvedTopicId,
            category: getCategoryFromTopicId(resolvedTopicId),
            explanation: q.explanation || `✓ To'g'ri javob: ${String.fromCharCode(65 + (parseInt(q.correct) || 0))}`,
            mnemonic: q.mnemonic || '',
            image: q.image || '',
            createdAt: new Date().toISOString()
          });
          existingSet.add(normQText);
        }
      });

      if (toAdd.length === 0) {
        showToast("Barcha savollar allaqachon bazada mavjud!", 'success');
        setIsUploadingJSON(false);
        return;
      }

      showToast(`${toAdd.length} ta yangi savol topildi. Yuklanmoqda...`, 'info');

      // Batch push to Firestore in chunks of 400
      const qRef = collection(db, 'questions');
      for (let i = 0; i < toAdd.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = toAdd.slice(i, i + 400);
        chunk.forEach(q => {
          const newDoc = doc(qRef);
          batch.set(newDoc, q);
        });
        await batch.commit();
      }

      showToast(`Muvaffaqiyatli! ${toAdd.length} ta yangi savol yuklandi. 🎉`, 'success');
      
      const updatedSnap = await getDocs(collection(db, 'questions'));
      setQuestions(updatedSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const storageRef = ref(storage, `questions/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewQ({ ...newQ, image: url });
      showToast("Rasm yuklandi!", 'success');
    } catch (err) {
      showToast("Rasm yuklashda xatolik: " + err.message, 'error');
    }
    setIsUploadingImage(false);
  };

  useEffect(() => {
    const q = query(collection(db, 'objections'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setObjections(snap.docs.map(d => ({
        ...d.data(),
        fbId: d.id,
        date: d.data().timestamp?.toDate()?.toLocaleString() || d.data().date
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (tab !== 'users') return;
    const loadUsers = async () => {
      if (users.length > 0) return; // Keshdan o'qish (qayta yuklamaslik uchun)
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadUsers();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'questions') return;
    const loadQuestions = async () => {
      if (questions.length > 0) return; // Keshdan o'qish (qayta yuklamaslik uchun)
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadQuestions();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'tariffs') return;
    const unsub = onSnapshot(doc(db, 'settings', 'premium'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().plans) {
        setTariffs(docSnap.data().plans);
      } else {
        setTariffs([{ id: 'lifetime', name: 'Cheksiz Premium', price: 15000, durationMonths: 999 }]);
      }
    });
    return () => unsub();
  }, [tab]);

  // ── Referral tab ma'lumotlarini yuklash ──
  useEffect(() => {
    if (tab !== 'referrals') return;
    const loadReferrals = async () => {
      if (allReferrals.length > 0) return; // Keshdan o'qish
      setReferralLoading(true);
      try {
        const snap = await getDocs(collection(db, 'referrals'));
        const refs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReferrals(refs);
        const paid = refs.filter(r => r.status === 'paid').length;
        const pending = refs.filter(r => r.status === 'pending').length;
        setReferralSummary({
          total: refs.length,
          paid,
          pending,
          totalBonus: paid * 15000,
        });
      } catch (e) {
        console.error("Referrals load error:", e);
        showToast("Referral ma'lumotlarini yuklashda xatolik: " + e.message, 'error');
      }
      setReferralLoading(false);
    };
    loadReferrals();
  }, [tab]);

  // ═══ Admin: Referral statusini "to'ladi" ga o'zgartirish ═══
  const handleMarkReferralPaid = async (refId, referrerId) => {
    confirmAction("Bu referralni 'To'ladi' deb belgilashni tasdiqlaysizmi?", async () => {
    try {
      await updateDoc(doc(db, 'referrals', refId), {
        status: 'paid',
        bonusPaid: true,
        bonusAmount: 15000,
        paidAt: new Date().toISOString(),
      });
      // Referrer ga bonus qo'shish
      if (referrerId) {
        await updateDoc(doc(db, 'users', referrerId), {
          referralBonus: increment(15000),
        });
      }
      showToast("✅ Referral to'langan deb belgilandi va bonus berildi!", 'success');
      // Ro'yxatni yangilash
      const snap = await getDocs(collection(db, 'referrals'));
      const refs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllReferrals(refs);
      const paid = refs.filter(r => r.status === 'paid').length;
      const pending = refs.filter(r => r.status !== 'paid').length;
      setReferralSummary({ total: refs.length, paid, pending, totalBonus: paid * 15000 });
    } catch (e) {
      showToast("Xatolik: " + e.message, 'error');
    }
    });
  };

  // ═══ Admin: Referral bepul premiumini bekor qilish ═══
  const handleCancelReferralPremium = async (referredId, referralDocId) => {
    confirmAction("Bu foydalanuvchining bepul premium statusini bekor qilishni tasdiqlaysizmi?", async () => {
    try {
      await updateDoc(doc(db, 'referrals', referralDocId), {
        freeExpire: null
      });
      if (referredId) {
        await updateDoc(doc(db, 'users', referredId), {
          isPremium: false,
          freeMonthExpire: null
        });
      }
      showToast("✅ Bepul premium status bekor qilindi!", 'success');
      // Ro'yxatni yangilash
      const snap = await getDocs(collection(db, 'referrals'));
      const refs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllReferrals(refs);
      const paid = refs.filter(r => r.status === 'paid').length;
      const pending = refs.filter(r => r.status !== 'paid').length;
      setReferralSummary({ total: refs.length, paid, pending, totalBonus: paid * 15000 });
    } catch (e) {
      showToast("Xatolik: " + e.message, 'error');
    }
    });
  };

  const handleSolve = async (fbId) => {
    try {
      await updateDoc(doc(db, 'objections', fbId), { solved: true, solvedBy: user.email, solvedAt: new Date() });
      showToast("✅ E'tiroz hal qilindi!", 'success');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
  };

  const handleDeleteObjection = (fbId) => {
    confirmAction("E'tirozni o'chirishni tasdiqlaysizmi?", async () => {
try {
      await deleteDoc(doc(db, 'objections', fbId));
      showToast("🗑️ O'chirildi", 'info');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
    });
  };

  const togglePremium = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isPremium: !currentStatus });
      showToast("Premium holati o'zgartirildi!", 'success');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
  };

  const toggleAdmin = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showToast(`Rol o'zgartirildi: ${newRole}`, 'success');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    confirmAction(`DIQQAT!!! Siz foydalanuvchini (${userEmail || userId}) tizimdan butunlay o'chirmoqchisiz.\n\nUshbu amal foydalanuvchining hisobini va reytingdagi (Leaderboard) barcha natijalarini batamom supurib tashlaydi!\n\nTasdiqlaysizmi?`, async () => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      await deleteDoc(doc(db, 'userStats', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast("🗑️ Foydalanuvchi va uning reyting natijalari batamom o'chirildi!", 'success');
    } catch (e) {
      console.error("Foydalanuvchini o'chirishda xatolik:", e);
      showToast("Xatolik yuz berdi: " + e.message, 'error');
    }
    });
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
        category: getCategoryFromTopicId(newQ.topicId)
      };
      if (editingQ) {
        await updateDoc(doc(db, 'questions', editingQ.id), questionToSave);
        showToast("✅ Savol yangilandi!", 'success');
      } else {
        await addDoc(collection(db, 'questions'), questionToSave);
        showToast("✅ Yangi savol qo'shildi!", 'success');
      }
      setIsAdding(false);
      setEditingQ(null);
      setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' });
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showToast("Xatolik yuz berdi", 'error');
    }
  };

  // Dublikatlarni tahlil qiladi (aniq + yaqin-takror), O'CHIRMAYDI — preview ochadi.
  const analyzeDuplicates = () => {
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
      showToast(`Muvaffaqiyatli! ${removeIds.length} ta dublikat o'chirildi. 🎉`, 'success');
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDupPreview(null);
    } catch (e) {
      showToast("O'chirishda xatolik: " + e.message, 'error');
    } finally {
      setDupDeleting(false);
    }
  };

  const handlePublishBundles = async () => {
    confirmAction("Barcha savollarni yig'ib Firebase Storage'ga yuklashni (Publish) tasdiqlaysizmi? Bu foydalanuvchilar ilovasida versiyani yangilaydi.", async () => {
    setIsSyncing(true);
    showToast("Ma'lumotlar yig'ilmoqda, kuting...", 'info');

    try {
      // 1. Hamma savollarni olish
      const snap = await getDocs(collection(db, 'questions'));
      const allQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Kategoriya bo'yicha guruhlash
      const bundles = {};
      allQuestions.forEach(q => {
        let cat = q.category || 'other';
        if (Array.isArray(cat)) cat = cat[0]; // If category is an array, take the first one
        if (!bundles[cat]) bundles[cat] = [];
        bundles[cat].push(q);
      });

      // 3. Storage'ga yuklash
      const storageUrls = {};
      const catKeys = Object.keys(bundles);
      for (let i = 0; i < catKeys.length; i++) {
        const cat = catKeys[i];
        showToast(`'${cat}' fani yuklanmoqda... (${i + 1}/${catKeys.length})`, 'info');
        const jsonStr = JSON.stringify(bundles[cat]);
        const bundleRef = ref(storage, `bundles/${cat}.json`);
        await uploadString(bundleRef, jsonStr, 'raw', { contentType: 'application/json' });
        const url = await getDownloadURL(bundleRef);
        storageUrls[cat] = url;
      }

      // 4. settings/version ni yangilash
      showToast(`Sozlamalar yangilanmoqda...`, 'info');
      const versionDocRef = doc(db, 'settings', 'version');
      const newVersion = Date.now();
      
      await setDoc(versionDocRef, {
        dbVersion: newVersion,
        urls: storageUrls,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast("✅ Barcha savollar muvaffaqiyatli Storage'ga yuklandi!", 'success');

    } catch (e) {
      console.error("Publish xatosi:", e);
      showToast("Yuklashda xatolik: " + e.message, 'error');
    }
    setIsSyncing(false);
    });
  };

  const handleDeleteQuestion = (id) => {
    confirmAction("Savolni o'chirishni tasdiqlaysizmi?", async () => {
try {
      await deleteDoc(doc(db, 'questions', id));
      showToast("🗑️ Savol o'chirildi", 'info');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
    });
  };

  const handleSaveTariff = async () => {
    try {
      let updatedTariffs = [...tariffs];
      if (editingTariff) {
        updatedTariffs = updatedTariffs.map(t => t.id === newTariff.id ? newTariff : t);
      } else {
        if (updatedTariffs.some(t => t.id === newTariff.id)) {
          showToast("Bunday ID dagi tarif mavjud", 'error');
          return;
        }
        updatedTariffs.push(newTariff);
      }
      // settings/premium hujjatini saqlash yoki yangilash
      await updateDoc(doc(db, 'settings', 'premium'), { plans: updatedTariffs }).catch(async (err) => {
        if (err.code === 'not-found') {
          // hujjat yo'q bo'lsa yaratamiz
          const { setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'settings', 'premium'), { plans: updatedTariffs });
        } else throw err;
      });
      showToast("✅ Tarif saqlandi!", 'success');
      setIsAddingTariff(false);
      setEditingTariff(null);
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
  };

  const handleDeleteTariff = (tariffId) => {
    confirmAction("Tarifni o'chirishni tasdiqlaysizmi?", async () => {
try {
      const updatedTariffs = tariffs.filter(t => t.id !== tariffId);
      await updateDoc(doc(db, 'settings', 'premium'), { plans: updatedTariffs });
      showToast("🗑️ Tarif o'chirildi", 'info');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
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
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    const nameMatch = u.displayName?.toLowerCase().includes(term);
    const emailMatch = u.email?.toLowerCase().includes(term);
    const phoneMatch = u.phoneNumber?.toLowerCase().includes(term) || u.phone?.toLowerCase().includes(term);
    return nameMatch || emailMatch || phoneMatch;
  });

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

  if (!isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--red)' }} />
        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)' }}>Ruxsat yo'q</div>
        <div style={{ color: 'var(--text3)', fontSize: '15px', textAlign: 'center' }}>
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
      <button className="admin-back-btn" onClick={() => navigate('/profile')}>
        <ArrowLeft size={16} /> Profilga qaytish
      </button>

      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="admin-badge"><Shield size={14} /> ADMIN</div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--text)' }}>Boshqaruv Paneli</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{user?.email}</div>
          </div>
        </div>
        <div className="admin-quick-stats">
          <div className="admin-quick-stat">
            <div className="admin-quick-stat-val" style={{ color: 'var(--amber)' }}>{unsolvedCount}</div>
            <div className="admin-quick-stat-lbl">Kutmoqda</div>
          </div>
          <div className="admin-quick-stat">
            <div className="admin-quick-stat-val" style={{ color: 'var(--green)' }}>{solvedCount}</div>
            <div className="admin-quick-stat-lbl">Hal qilindi</div>
          </div>
          <div className="admin-quick-stat">
            <div className="admin-quick-stat-val" style={{ color: 'var(--blue)' }}>{users.length || '—'}</div>
            <div className="admin-quick-stat-lbl">Foydalanuvchi</div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'objections' ? 'active' : ''}`} onClick={() => setTab('objections')}>
          <MessageCircle size={15} /> E'tirozlar
          {unsolvedCount > 0 && <span className="admin-tab-badge">{unsolvedCount}</span>}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
          <FileText size={15} /> Savollar
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <Users size={15} /> Foydalanuvchilar
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          <BarChart3 size={15} /> Statistika
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'tariffs' ? 'active' : ''}`} onClick={() => setTab('tariffs')}>
          <Zap size={15} /> Tariflar
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'notifications' ? 'active' : ''}`} onClick={() => setTab('notifications')}>
          <Bell size={15} /> Xabarlar
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'referrals' ? 'active' : ''}`} onClick={() => setTab('referrals')}>
          <Users size={15} /> Referral
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className={`admin-tab ${tab === 'promos' ? 'active' : ''}`} onClick={() => setTab('promos')}>
          <Zap size={15} /> Promo
        </motion.button>
      </div>

      {tab === 'promos' && <PromoTab />}

      {tab === 'objections' && (
        <div>
          <div className="admin-filter-bar">
            <div className="admin-search-wrap">
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                className="admin-search"
                placeholder="Savol yoki mavzu bo'yicha qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>Yuklanmoqda...</div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
              <div style={{ color: 'var(--text2)', fontWeight: '600' }}>Hamma e'tirozlar hal qilindi!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <AnimatePresence>
                {filteredSorted.map((obj) => (
                  <motion.div
                    key={obj.fbId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="admin-objection-card glass-panel"
                    style={{ border: obj.solved ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)', opacity: obj.solved ? 0.75 : 1 }}
                  >
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedId(expandedId === obj.fbId ? null : obj.fbId)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <span className={`status-badge-neon ${obj.solved ? 'paid' : 'pending'}`} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px' }}>
                          {obj.solved ? '✅ HAL QILINDI' : '⏳ YANGI'}
                        </span>
                        {(objectionCounts[objKey(obj)] || 0) >= 2 && (
                          <span style={{ fontSize: '10px', fontWeight: 800, background: 'var(--red-bg)', color: 'var(--red)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)' }}>
                            ⚠ {objectionCounts[objKey(obj)]} ta shikoyat
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: '600' }}>{obj.category === 'art' ? '🎨' : '🎖️'} {obj.topic}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{obj.date}</span>
                        {obj.userEmail && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>📧 {obj.userEmail}</span>}
                      </div>
                      {expandedId === obj.fbId ? <ChevronUp size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text)', fontWeight: '500', lineHeight: '1.4' }}>
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
                            <div style={{ background: 'var(--bg3)', padding: '12px', borderRadius: '10px', fontSize: '14px', color: 'var(--text)', lineHeight: '1.5' }}>
                              <strong>Savol:</strong> {obj.question}
                            </div>
                            {obj.correct && (
                              <div style={{ background: 'var(--green-bg)', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', color: 'var(--green)', fontWeight: '600', border: '1px solid rgba(16,185,129,0.2)' }}>
                                ✅ To'g'ri javob: {obj.correct.replace(/^[A-D]\)\s*/, '')}
                              </div>
                            )}
                            <div style={{ background: 'var(--amber-bg)', padding: '12px', borderRadius: '10px', fontSize: '13px', color: 'var(--text2)', border: '1px solid rgba(245,158,11,0.2)' }}>
                              <strong>E'tiroz:</strong> {obj.note}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {!obj.solved && (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: 'var(--green)', color: 'white', border: 'none' }}
                                  onClick={() => handleSolve(obj.fbId)}
                                >
                                  <CheckCircle size={14} /> Hal qilindi deb belgilash
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
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

      {tab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="admin-section-title"><FileText size={18} style={{ color: 'var(--blue)' }} /> Savollar Bazasi ({questions.length})</div>
          
          <div className="admin-action-bar">
            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-primary" style={{ background: 'var(--green)', borderColor: 'var(--green)' }} onClick={handlePublishBundles} disabled={isSyncing}>
              <UploadCloud size={14} /> {isSyncing ? 'Yuklanmoqda...' : '🚀 Dasturni Yangilash (Publish)'}
            </motion.button>

            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={analyzeDuplicates} disabled={dupAnalyzing}>
              <Trash2 size={14} /> {dupAnalyzing ? 'Tahlil...' : 'Dublikatlar'}
            </motion.button>
            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-primary" onClick={() => { setIsAdding(true); setEditingQ(null); setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' }); }}>
              <Plus size={14} /> Yangi savol
            </motion.button>
          </div>

          {/* Glassmorphic Filter and Search Bar */}
          <div className="admin-glass-filter-bar">
            <div className="admin-search-wrap">
              <Search size={16} className="admin-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
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
                  <option value="til">🗣️ Tillar</option>
                  <option value="nemis">🌐 Nemis tili</option>
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
            style={{
              border: `2.5px dashed ${isDraggingFile ? 'var(--blue)' : 'var(--glass-border)'}`,
              borderRadius: '20px',
              padding: '32px 24px',
              textAlign: 'center',
              background: isDraggingFile ? 'var(--blue-bg)' : 'var(--glass-bg)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.25s ease',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: isDraggingFile ? '0 8px 30px rgba(59, 130, 246, 0.15)' : 'none',
            }}
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
                <div style={{ fontSize: '32px', marginBottom: '8px', display: 'inline-block' }} className="spin-icon">⏳</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Savollar yuklanmoqda, iltimos kuting...</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
                  {isDraggingFile ? 'Faylni shu yerga tashlang' : 'JSON faylni sudrab tashlang yoki bosing'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                  Diapazon bo'yicha topicId va category avtomatik bog'lanadi (Ommaviy yuklash)
                </div>
              </div>
            )}
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredQuestions.slice(0, 50).map((q) => (
              <div key={q.id} className="admin-q-card">
                <div className="admin-q-text">{q.q}</div>
                <div className="admin-q-footer">
                  <span className="admin-q-topic">#{q.topicId} · {q.category || 'chqbt'}</span>
                  <div className="admin-q-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditingQ(q); setNewQ({...q}); setIsAdding(true); }}><Edit3 size={14} /></button>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredQuestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: '14px' }}>
                Savol topilmadi 🔍
              </div>
            )}
            {filteredQuestions.length > 50 && (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>
                ... va yana {filteredQuestions.length - 50} ta savol
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div className="admin-section-title" style={{ marginBottom: 0 }}><Users size={18} style={{ color: 'var(--blue)' }} /> Foydalanuvchilar ({filteredUsers.length}/{users.length})</div>
            <div className="admin-search-wrap" style={{ maxWidth: 300, width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                className="admin-search"
                style={{ padding: '8px 8px 8px 32px', fontSize: '13px', borderRadius: '10px' }}
                placeholder="Ism, telefon yoki email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
          </div>
          {users.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon">👥</div><div className="admin-empty-text">Yuklanmoqda...</div></div>
          ) : filteredUsers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
              Foydalanuvchi topilmadi 🔍
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredUsers.map((u) => (
                <div key={u.id} className="admin-user-row">
                  <div className="admin-user-left">
                    <div className="admin-user-avatar-sm">
                      {(u.displayName || u.email || u.phoneNumber || '?')[0].toUpperCase()}
                    </div>
                    <div className="admin-user-details">
                      <div className="admin-user-name-line">
                        <span className="admin-user-name-sm">{u.displayName || '—'}</span>
                        {u.isPremium && <span style={{ fontSize: 11 }} title="Premium">⭐</span>}
                        {u.role === 'admin' && <span style={{ fontSize: 11 }} title="Admin">🛡️</span>}
                      </div>
                      <div className="admin-user-subtext">{u.email || u.phoneNumber || 'Identifikator yo\'q'}</div>
                    </div>
                  </div>
                  <div className="admin-user-actions-sm">
                    <button 
                      onClick={() => togglePremium(u.id, u.isPremium)} 
                      className={`action-btn-sm ${u.isPremium ? 'premium-active' : ''}`}
                      title={u.isPremium ? "Premium statusini bekor qilish" : "Premium statusini yoqish"}
                    >
                      ⭐
                    </button>
                    <button 
                      onClick={() => toggleAdmin(u.id, u.role)} 
                      className={`action-btn-sm ${u.role === 'admin' ? 'admin-active' : ''}`}
                      title={u.role === 'admin' ? "Admin huquqini olish" : "Admin huquqini berish"}
                    >
                      🛡️
                    </button>
                    <button 
                      className="action-btn-sm delete-btn" 
                      onClick={() => handleDeleteUser(u.id, u.email || u.phoneNumber)}
                      title="O'chirish"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '20px', color: 'var(--text)' }}>Mavzu bo'yicha e'tirozlar</div>
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
                  <div style={{ minWidth: '100px', fontSize: '13px', color: 'var(--text2)', fontWeight: '500', flex: '0 0 auto' }}>{topic}</div>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ minWidth: '50px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: 'var(--text2)' }}>{count} ta</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'tariffs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div className="admin-section-title"><Zap size={18} style={{ color: 'var(--amber)' }} /> Premium Tariflar</div>
            <button className="btn btn-primary" onClick={() => { setIsAddingTariff(true); setEditingTariff(null); setNewTariff({ id: '', name: '', price: 0, durationMonths: 1 }); }}>
              <Plus size={14} /> Yangi tarif
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tariffs.map((t) => (
              <div key={t.id} className="admin-tariff-card">
                <div className="admin-tariff-info">
                  <div className="admin-tariff-name">{t.name}</div>
                  <div className="admin-tariff-details">{t.id} · {t.durationMonths === 999 ? 'Cheksiz' : `${t.durationMonths} oy`}</div>
                </div>
                <div className="admin-tariff-price">{new Intl.NumberFormat('uz-UZ').format(t.price)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => { setEditingTariff(t); setNewTariff({...t}); setIsAddingTariff(true); }}><Edit3 size={14} /></button>
                  <button className="btn btn-sm btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDeleteTariff(t.id)}><Trash2 size={14} /></button>
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
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={20} style={{ color: 'var(--blue)' }} /> Yangi Bildirishnoma Yuborish
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Sarlavha</label>
                <input 
                  className="modal-input" 
                  placeholder="Masalan: 🎉 Yangi imtihon bo'limi qo'shildi!" 
                  value={newNotif.title} 
                  onChange={e => setNewNotif({...newNotif, title: e.target.value})} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Xabar matni</label>
                <textarea 
                  className="modal-input" 
                  style={{ minHeight: '80px' }}
                  placeholder="Xabar mazmunini batafsil yozing..." 
                  value={newNotif.message} 
                  onChange={e => setNewNotif({...newNotif, message: e.target.value})} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Xabar turi</label>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Qabul qiluvchilar</label>
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
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} style={{ color: 'var(--amber)' }} /> Yuborilgan Bildirishnomalar Tarixi
            </div>
            
            {adminNotifs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '14px' }}>
                Hali hech qanday bildirishnoma yuborilmagan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>{n.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '6px' }}>{n.message}</div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text3)', fontWeight: '500' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Umumiy statistika kartalari */}
          <div className="admin-ref-grid">
            {[
              { label: 'Jami referrallar', value: referralSummary.total, icon: '🔗', color: 'var(--blue)' },
              { label: "To'lagan", value: referralSummary.paid, icon: '✅', color: '#22c55e' },
              { label: 'Kutilmoqda', value: referralSummary.pending, icon: '⏳', color: '#eab308' },
              { label: "Jami bonus", value: referralSummary.totalBonus.toLocaleString() + " so'm", icon: '💰', color: '#8b5cf6' },
            ].map((card, i) => (
              <div key={i} className="admin-stat-card">
                <div style={{ fontSize: 22, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Referrallar jadvali */}
          <div className="glass-panel" style={{ padding: '20px', overflow: 'hidden' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--blue)' }} /> Barcha referrallar ro'yxati
            </div>

            {referralLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>⏳ Yuklanmoqda...</div>
            ) : allReferrals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
                <div>Hali hech kim referral orqali kelmagan</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ background: 'var(--bg3)' }}>
                    <tr>
                      {["Taklif qiluvchi", "Taklif qilingan", "Sana", "Status", "Bonus", "Bepul tugash", "Amal"].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allReferrals
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((r) => (
                        <tr key={r.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                            <div style={{ fontWeight: 600 }}>{r.referrerName || '—'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.referrerId?.slice(0, 8)}...</div>
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                            <div style={{ fontWeight: 600 }}>{r.referredName || '—'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.referredId?.slice(0, 8)}...</div>
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--text3)', fontSize: 12 }}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {r.status === 'paid' ? (
                              <span className="status-badge-neon paid">✅ To'ladi</span>
                            ) : r.status === 'active' ? (
                              <span className="status-badge-neon active">🔄 Faol</span>
                            ) : (
                              <span className="status-badge-neon pending">⏳ Kutilmoqda</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: r.bonusPaid ? '#22c55e' : 'var(--text3)', fontWeight: r.bonusPaid ? 700 : 400, fontSize: 13 }}>
                            {r.bonusPaid ? `+${(r.bonusAmount || 15000).toLocaleString()} so'm` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12 }}>
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
                          <td style={{ padding: '10px 12px' }}>
                            {r.status !== 'paid' && (
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--green)', color: '#fff', border: 'none', fontSize: 11, padding: '4px 10px', marginRight: 6 }}
                                onClick={() => handleMarkReferralPaid(r.id, r.referrerId)}
                              >
                                ✓ To'ladi
                              </button>
                            )}
                            {r.freeExpire && (
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--red)', color: '#fff', border: 'none', fontSize: 11, padding: '4px 10px' }}
                                onClick={() => handleCancelReferralPremium(r.referredId, r.id)}
                                title="Bepul premiumni bekor qilish"
                              >
                                ✕ Premium bekor qilish
                              </button>
                            )}
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
              • To'lov amalga oshirilganda (Click/Payme orqali) referral statusi avtomatik ravishda <strong>"To'ladi"</strong>ga o'tadi va bonus avtomatik beriladi.<br/>
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
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
            >
              <div className="modal-title" style={{ flexShrink: 0 }}>{editingQ ? 'Savolni tahrirlash' : 'Yangi savol qo\'shish'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Savol matni</label>
                  <textarea
                    className="modal-input"
                    style={{ minHeight: '80px' }}
                    value={newQ.q}
                    onChange={e => setNewQ({...newQ, q: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Rasm qo'shish (ixtiyoriy)</label>
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
                    style={{ fontSize: '13px', color: 'var(--text3)' }}
                  />
                  {isUploadingImage && <div style={{ fontSize: '12px', color: 'var(--blue)' }}>Yuklanmoqda...</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Mavzu (topicId)</label>
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
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '-4px' }}>
                    ⚡ Category avtomatik ravishda mavzuga mos ravishda belgilanadi.
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Javob variantlari</label>
                  {newQ.opts.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)' }}>{String.fromCharCode(65 + i)})</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>To'g'ri javob indeksi (0-3)</label>
                  <input
                    type="number"
                    className="modal-input"
                    value={newQ.correct}
                    onChange={e => setNewQ({...newQ, correct: parseInt(e.target.value)})}
                    min="0" max="3"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Tushuntirish (Explanation)</label>
                  <textarea
                    className="modal-input"
                    value={newQ.explanation}
                    onChange={e => setNewQ({...newQ, explanation: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Eslab qolish usuli (Mnemonic)</label>
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
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              style={{ maxWidth: '400px', width: '90%', padding: '24px' }}
            >
              <div className="modal-title">{editingTariff ? 'Tarifni tahrirlash' : 'Yangi tarif'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>ID (masalan: 6months)</label>
                  <input className="modal-input" value={newTariff.id} onChange={e => setNewTariff({...newTariff, id: e.target.value})} disabled={!!editingTariff} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Nomi</label>
                  <input className="modal-input" value={newTariff.name} onChange={e => setNewTariff({...newTariff, name: e.target.value})} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Narxi (so'm)</label>
                  <input type="number" className="modal-input" value={newTariff.price} onChange={e => setNewTariff({...newTariff, price: parseInt(e.target.value)})} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Muddati (oy, cheksiz uchun 999)</label>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 20, maxWidth: 720, width: '100%', maxHeight: '85vh', borderRadius: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>🔍 Topilgan dublikatlar</h3>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Qamrov: <strong>{dupPreview.scope}</strong></span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
              <strong style={{ color: 'var(--red)' }}>{dupPreview.totalRemove} ta</strong> savol o'chiriladi · {dupPreview.groups.length} guruh ·
              har guruhda eng to'liq (izohli) variant <strong style={{ color: 'var(--green)' }}>saqlanadi</strong>.
            </p>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {dupPreview.groups.map((g, gi) => (
                <div key={gi} style={{ border: '1px solid var(--glass-border)', borderRadius: 12, padding: 10, background: 'var(--glass-bg)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'var(--green-bg, rgba(34,197,94,0.12))', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>🟢 Saqlanadi</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{g.keep.q}</span>
                  </div>
                  {g.removed.map((r, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 4, paddingLeft: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'var(--red-bg, rgba(239,68,68,0.12))', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>🔴 {r.sim}%</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.q} <em style={{ opacity: 0.6 }}>(#{r.topicId})</em></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} disabled={dupDeleting} onClick={() => setDupPreview(null)}>Bekor qilish</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} disabled={dupDeleting} onClick={executeDuplicateDeletion}>
                {dupDeleting ? 'O\'chirilmoqda...' : `Hammasini o'chirish (${dupPreview.totalRemove})`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 24, maxWidth: 320, width: '90%', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Tasdiqlang</h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24, whiteSpace: 'pre-wrap' }}>{confirmDialog.text}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setConfirmDialog({ isOpen: false, text: '', onConfirm: null })}>Bekor qilish</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); }}>Tasdiqlash</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminPage;
