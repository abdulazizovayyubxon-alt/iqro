import React, { useContext, useEffect, useState } from 'react';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { db, storage } from '../firebase';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, getDocs, addDoc, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { q0_harbiy_xizmat } from '../data/questions_0.js';
import { q1_umumharbiy_nizomlar } from '../data/questions_1.js';
import { q2_otish_tayyorgarligi } from '../data/questions_2.js';
import { q3_taktik_tayyorgarlik } from '../data/questions_3.js';
import { q4_fuqaro_muhofazasi } from '../data/questions_4.js';
import { q5_tibbiy_bilim } from '../data/questions_5.js';
import { q6_pedagogik_mahorat } from '../data/questions_6.js';
import { q7_tasviriy_sanat } from '../data/questions_7.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, MessageCircle, Users, BarChart3,
  CheckCircle, Trash2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Search, Plus, Edit3, FileText, Zap,
  Bell, Send, CheckCircle2, AlertCircle, Info
} from 'lucide-react';

const AdminPage = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);

  const [tab, setTab] = useState('objections'); // objections | users | stats | questions | tariffs | notifications
  const [objections, setObjections] = useState([]);
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSolved, setFilterSolved] = useState('all'); // all | unsolved | solved
  const [expandedId, setExpandedId] = useState(null);

  // Question Management State
  const [isAdding, setIsAdding] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [newQ, setNewQ] = useState({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleDeleteNotification = async (notifId) => {
    if (!window.confirm("Bu bildirishnomani bazadan o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
      showToast("🗑️ Bildirishnoma o'chirildi", 'info');
    } catch (e) { showToast("Xatolik: " + e.message, 'error'); }
  };

  const handleSyncAllQuestions = async () => {
    if (!window.confirm("Barcha lokal fayllardagi (questions_0...7) savollarni Firestore bazasi bilan sinxronlashni tasdiqlaysizmi? (Faqat yangi savollar qo'shiladi)")) return;
    setIsSyncing(true);
    showToast("Sinxronlash boshlandi, iltimos kuting...", 'info');
    try {
      const allData = [
        { id: 0, data: q0_harbiy_xizmat, cat: 'chqbt' },
        { id: 1, data: q1_umumharbiy_nizomlar, cat: 'chqbt' },
        { id: 2, data: q2_otish_tayyorgarligi, cat: 'chqbt' },
        { id: 3, data: q3_taktik_tayyorgarlik, cat: 'chqbt' },
        { id: 4, data: q4_fuqaro_muhofazasi, cat: 'chqbt' },
        { id: 5, data: q5_tibbiy_bilim, cat: 'chqbt' },
        { id: 6, data: q6_pedagogik_mahorat, cat: 'chqbt' },
        { id: 7, data: q7_tasviriy_sanat, cat: 'art' }
      ];

      const snap = await getDocs(collection(db, 'questions'));
      const normalize = (text) => text ? text.toLowerCase().replace(/[‘'`ʼ]/g, "'").replace(/\s+/g, " ").trim() : "";
      const existingSet = new Set(snap.docs.map(d => normalize(d.data().q)));

      const newQuestionsToPush = [];
      for (const item of allData) {
        for (const q of item.data) {
          if (!existingSet.has(normalize(q.q))) {
            newQuestionsToPush.push({
              ...q,
              topicId: item.id,
              category: item.cat,
              createdAt: new Date().toISOString()
            });
            existingSet.add(normalize(q.q));
          }
        }
      }

      if (newQuestionsToPush.length === 0) {
        showToast("Barcha savollar allaqachon bazada mavjud. Sinxronlash shart emas!", 'success');
        setIsSyncing(false);
        return;
      }

      showToast(`${newQuestionsToPush.length} ta yangi savol topildi. Yuklanmoqda...`, 'info');

      const qRef = collection(db, 'questions');
      for (let i = 0; i < newQuestionsToPush.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = newQuestionsToPush.slice(i, i + 400);
        chunk.forEach(q => {
          const newDoc = doc(qRef);
          batch.set(newDoc, q);
        });
        await batch.commit();
      }

      showToast(`Muvaffaqiyatli! ${newQuestionsToPush.length} ta yangi savol Firestore'ga qo'shildi.`, 'success');
      
      const updatedSnap = await getDocs(collection(db, 'questions'));
      setQuestions(updatedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Sinxronlash xatosi:", err);
      showToast("Sinxronlashda xatolik: " + err.message, 'error');
    }
    setIsSyncing(false);
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
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadUsers();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'questions') return;
    const loadQuestions = async () => {
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

  const handleSolve = async (fbId) => {
    try {
      await updateDoc(doc(db, 'objections', fbId), { solved: true, solvedBy: user.email, solvedAt: new Date() });
      showToast("✅ E'tiroz hal qilindi!", 'success');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
  };

  const handleDeleteObjection = async (fbId) => {
    if (!window.confirm("E'tirozni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, 'objections', fbId));
      showToast("🗑️ O'chirildi", 'info');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
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
    if (!window.confirm(`DIQQAT!!! Siz foydalanuvchini (${userEmail || userId}) tizimdan butunlay o'chirmoqchisiz.\n\nUshbu amal foydalanuvchining hisobini va reytingdagi (Leaderboard) barcha natijalarini batamom supurib tashlaydi!\n\nTasdiqlaysizmi?`)) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      await deleteDoc(doc(db, 'userStats', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast("🗑️ Foydalanuvchi va uning reyting natijalari batamom o'chirildi!", 'success');
    } catch (e) {
      console.error("Foydalanuvchini o'chirishda xatolik:", e);
      showToast("Xatolik yuz berdi: " + e.message, 'error');
    }
  };


  const handleSaveQuestion = async () => {
    try {
      if (editingQ) {
        await updateDoc(doc(db, 'questions', editingQ.id), newQ);
        showToast("✅ Savol yangilandi!", 'success');
      } else {
        await addDoc(collection(db, 'questions'), newQ);
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

  const handleCleanDuplicates = async () => {
    if (!window.confirm("Barcha takroriy (dublikat) savollarni bazadan o'chirishni tasdiqlaysizmi?")) return;
    try {
      showToast("Tahlil va o'chirish boshlandi, kuting...", 'info');
      const questionMap = new Map();
      const duplicatesToDelete = [];
      
      const normalize = (text) => text ? text.toLowerCase().replace(/[‘'`ʼ]/g, "'").replace(/\s+/g, " ").trim() : "";
      
      for (const q of questions) {
        const normText = normalize(q.q);
        if (questionMap.has(normText)) {
          duplicatesToDelete.push(q.id);
        } else {
          questionMap.set(normText, q.id);
        }
      }

      if (duplicatesToDelete.length === 0) {
        showToast("Takroriy savollar topilmadi!", 'success');
        return;
      }

      for (const docId of duplicatesToDelete) {
        await deleteDoc(doc(db, 'questions', docId));
      }

      showToast(`Muvaffaqiyatli! ${duplicatesToDelete.length} ta takroriy savol o'chirildi.`, 'success');
      
      // Ro'yxatni yangilash
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showToast("Xatolik yuz berdi: " + e.message, 'error');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Savolni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      showToast("🗑️ Savol o'chirildi", 'info');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
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

  const handleDeleteTariff = async (tariffId) => {
    if (!window.confirm("Tarifni o'chirishni tasdiqlaysizmi?")) return;
    try {
      const updatedTariffs = tariffs.filter(t => t.id !== tariffId);
      await updateDoc(doc(db, 'settings', 'premium'), { plans: updatedTariffs });
      showToast("🗑️ Tarif o'chirildi", 'info');
    } catch (e) { showToast("Xatolik yuz berdi", 'error'); }
  };

  const filtered = objections.filter(o => {
    const matchSearch = !search || o.question?.toLowerCase().includes(search.toLowerCase()) || o.topic?.toLowerCase().includes(search.toLowerCase()) || o.note?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterSolved === 'all' || (filterSolved === 'solved' ? o.solved : !o.solved);
    return matchSearch && matchFilter;
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page">
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="admin-badge"><Shield size={18} /> ADMIN</div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>Boshqaruv Paneli</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="admin-quick-stat" style={{ borderColor: 'var(--amber)' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--amber)' }}>{unsolvedCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>KUTMOQDA</div>
          </div>
          <div className="admin-quick-stat" style={{ borderColor: 'var(--green)' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--green)' }}>{solvedCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>HAL QILINDI</div>
          </div>
          <div className="admin-quick-stat" style={{ borderColor: 'var(--blue)' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue)' }}>{users.length || '—'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>FOYDALANUVCHI</div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'objections' ? 'active' : ''}`} onClick={() => setTab('objections')}>
          <MessageCircle size={16} /> E'tirozlar
          {unsolvedCount > 0 && <span className="admin-tab-badge">{unsolvedCount}</span>}
        </button>
        <button className={`admin-tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
          <FileText size={16} /> Savollar
        </button>
        <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <Users size={16} /> Foydalanuvchilar
        </button>
        <button className={`admin-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          <BarChart3 size={16} /> Statistika
        </button>
        <button className={`admin-tab ${tab === 'tariffs' ? 'active' : ''}`} onClick={() => setTab('tariffs')}>
          <Zap size={16} /> Tariflar
        </button>
        <button className={`admin-tab ${tab === 'notifications' ? 'active' : ''}`} onClick={() => setTab('notifications')}>
          <Bell size={16} /> Bildirishnomalar
        </button>
      </div>

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
                {filtered.map((obj) => (
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
                        <span style={{
                          background: obj.solved ? 'var(--green)' : 'var(--amber)',
                          color: 'white', fontSize: '10px', fontWeight: '700',
                          padding: '3px 8px', borderRadius: '6px'
                        }}>
                          {obj.solved ? '✅ HAL QILINDI' : '⏳ YANGI'}
                        </span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Savollar Bazasi ({questions.length})</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={handleSyncAllQuestions} disabled={isSyncing}>
                <Zap size={16} /> {isSyncing ? 'Sinxronlanmoqda...' : 'Fayllardan bazaga sinxronlash'}
              </button>
              <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleCleanDuplicates}>
                <Trash2 size={16} /> Takroriylarni o'chirish
              </button>
              <button className="btn btn-primary" onClick={() => { setIsAdding(true); setEditingQ(null); setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '', image: '' }); }}>
                <Plus size={16} /> Yangi savol qo'shish
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg3)' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)' }}>Savol</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)' }}>Mavzu ID</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.q}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text2)' }}>{q.topicId}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => { setEditingQ(q); setNewQ({...q}); setIsAdding(true); }}><Edit3 size={14} /></button>
                      <button className="btn btn-sm btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>Yuklanmoqda...</div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg3)' }}>
                  <tr>
                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Foydalanuvchi</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Premium</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rol</th>
                    <th style={{ padding: '14px', textAlign: 'right', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #007AFF, #5AC8FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                          {(u.displayName || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>{u.displayName || '—'}</span>
                      </td>
                      <td style={{ padding: '14px', fontSize: '14px', color: 'var(--text2)' }}>{u.email}</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{ 
                          background: u.isPremium ? 'var(--green-bg)' : 'var(--bg3)', 
                          color: u.isPremium ? 'var(--green)' : 'var(--text3)', 
                          fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' 
                        }}>
                          {u.isPremium ? '⭐ Premium' : 'Oddiy'}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{ background: u.role === 'admin' ? 'var(--blue-bg)' : 'var(--bg3)', color: u.role === 'admin' ? 'var(--blue)' : 'var(--text3)', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' }}>
                          {u.role === 'admin' ? '🛡️ Admin' : '👤 Foydalanuvchi'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            className="btn btn-sm" 
                            style={{ padding: '6px 10px', fontSize: '11px', background: u.isPremium ? 'var(--bg3)' : 'var(--amber)', color: u.isPremium ? 'var(--text)' : '#fff' }}
                            onClick={() => togglePremium(u.id, u.isPremium)}
                          >
                            {u.isPremium ? 'Premiumni bekor qilish' : '+ Premium berish'}
                          </button>
                          <button 
                            className="btn btn-sm" 
                            style={{ padding: '6px 10px', fontSize: '11px', background: 'var(--bg3)', color: 'var(--text)' }}
                            onClick={() => toggleAdmin(u.id, u.role)}
                          >
                            {u.role === 'admin' ? 'Admindan olish' : 'Admin qilish'}
                          </button>
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--red)', borderColor: 'var(--red)' }}
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title="Foydalanuvchini va uning reytingdagi natijasini o'chirish"
                          >
                            <Trash2 size={13} style={{ marginRight: '4px' }} /> O'chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="stats-grid">
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
                  <div style={{ minWidth: '180px', fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{topic}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Premium Tariflar</div>
            <button className="btn btn-primary" onClick={() => { setIsAddingTariff(true); setEditingTariff(null); setNewTariff({ id: '', name: '', price: 0, durationMonths: 1 }); }}>
              <Plus size={16} /> Yangi tarif qo'shish
            </button>
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg3)' }}>
                <tr>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)' }}>ID / Nomi</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)' }}>Narxi (so'm)</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)' }}>Muddati (Oy)</th>
                  <th style={{ padding: '14px', textAlign: 'right', fontSize: '12px', color: 'var(--text3)' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {tariffs.map((t) => (
                  <tr key={t.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '14px', fontSize: '14px', color: 'var(--text)', fontWeight: '600' }}>
                      {t.name} <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '400' }}>{t.id}</div>
                    </td>
                    <td style={{ padding: '14px', fontSize: '14px', color: 'var(--amber)', fontWeight: '700' }}>{new Intl.NumberFormat('uz-UZ').format(t.price)} so'm</td>
                    <td style={{ padding: '14px', fontSize: '14px', color: 'var(--text2)' }}>{t.durationMonths === 999 ? 'Cheksiz' : `${t.durationMonths} oy`}</td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => { setEditingTariff(t); setNewTariff({...t}); setIsAddingTariff(true); }}><Edit3 size={14} /></button>
                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDeleteTariff(t.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <label style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: '600' }}>Mavzu ID (topicId)</label>
                  <input
                    type="number"
                    className="modal-input"
                    value={newQ.topicId}
                    onChange={e => setNewQ({...newQ, topicId: parseInt(e.target.value)})}
                  />
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
    </motion.div>
  );
};

export default AdminPage;
