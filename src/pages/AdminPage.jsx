import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { db } from '../firebase';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, getDocs, addDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, MessageCircle, Users, BarChart3,
  CheckCircle, Trash2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Search, Plus, Edit3, FileText
} from 'lucide-react';

const AdminPage = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { showToast } = useContext(AppContext);

  const [tab, setTab] = useState('objections'); // objections | users | stats | questions
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
  const [newQ, setNewQ] = useState({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '' });

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
      setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '' });
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showToast("Xatolik yuz berdi", 'error');
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
        <div style={{ color: 'var(--text3)', fontSize: '15px' }}>Bu sahifa faqat admin uchun</div>
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
            <button className="btn btn-primary" onClick={() => { setIsAdding(true); setEditingQ(null); setNewQ({ q: '', opts: ['', '', '', ''], correct: 0, topicId: 0, explanation: '', mnemonic: '' }); }}>
              <Plus size={16} /> Yangi savol qo'shish
            </button>
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
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg3)' }}>
                  <tr>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Foydalanuvchi</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rol</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ro'yxatdan o'tgan</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #007AFF, #5AC8FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                          {(u.displayName || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>{u.displayName || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', color: 'var(--text2)' }}>{u.email}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: u.role === 'admin' ? 'var(--blue-bg)' : 'var(--bg3)', color: u.role === 'admin' ? 'var(--blue)' : 'var(--text3)', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' }}>
                          {u.role === 'admin' ? '🛡️ Admin' : '👤 Foydalanuvchi'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text3)' }}>
                        {u.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
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
              style={{ maxWidth: '600px', width: '//90%' }}
            >
              <div className="modal-title">{editingQ ? 'Savolni tahrirlash' : 'Yangi savol qo\'shish'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
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
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => { setIsAdding(false); setEditingQ(null); }}>Bekor qilish</button>
                <button className="btn btn-primary" onClick={handleSaveQuestion} disabled={!newQ.q || newQ.opts.some(o => !o)}>Saqlash</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminPage;
