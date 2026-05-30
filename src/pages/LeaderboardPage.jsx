import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Medal, Star, Trash2, Trophy } from 'lucide-react';
import {
  collection, query, orderBy, limit, getDocs, onSnapshot,
  doc, getDoc, where, getCountFromServer, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useAdmin } from '../hooks/useAdmin';

const PRIMARY = '#29B6F6';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const [leaders, setLeaders] = useState([]);
  const [myEntry, setMyEntry] = useState(null); // top-50 tashqarisidagi "Siz" qatori
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'userStats'), orderBy('totalScore', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const results = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          if (d.totalScore !== undefined) {
            results.push({
              id: docSnap.id,
              name: d.displayName || d.userName || d.name || `#${docSnap.id.slice(0, 6)}`,
              score: d.totalScore || 0,
              streak: d.dailyStreak || 0,
              answered: d.totalAnswered || 0,
              photoURL: d.photoURL || null,
            });
          }
        });

        // "Siz" top-50 da bormi?
        const meIdx = results.findIndex(r => r.id === user.uid);
        if (meIdx !== -1) {
          results[meIdx].rank = meIdx + 1;
          results[meIdx].isMe = true;
          setMyEntry(null);
        } else {
          // Top-50 tashqarida — alohida qatorga solish
          try {
            const myDoc = await getDoc(doc(db, 'userStats', user.uid));
            if (myDoc.exists()) {
              const md = myDoc.data();
              const myScore = md.totalScore || 0;
              const rankQ = query(collection(db, 'userStats'), where('totalScore', '>', myScore));
              const cnt = await getCountFromServer(rankQ);
              setMyEntry({
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Siz',
                score: myScore,
                streak: md.dailyStreak || 0,
                answered: md.totalAnswered || 0,
                photoURL: user.photoURL || null,
                rank: cnt.data().count + 1,
                isMe: true,
              });
            } else {
              setMyEntry(null);
            }
          } catch (_) {}
        }

        results.forEach((r, i) => { if (!r.rank) r.rank = i + 1; });
        setLeaders(results);
      } catch (err) {
        console.error('Leaderboard processing error:', err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Leaderboard snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteClick = (id, name) => {
    setDeleteConfirm({ show: true, id, name });
  };

  const executeDelete = async () => {
    try {
      await deleteDoc(doc(db, 'userStats', deleteConfirm.id));
      showToast('Natija o\'chirildi', 'success');
    } catch (e) {
      showToast('Xatolik yuz berdi', 'error');
    } finally {
      setDeleteConfirm({ show: false, id: null, name: '' });
    }
  };

  // Top 3 podium
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const Avatar = ({ entry, size = 44 }) => {
    const isPodium = entry.rank <= 3;
    const borderColor = entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : '#B45309';
    return (
      <div style={{
        width: size + (isPodium ? 8 : 0),
        height: size + (isPodium ? 8 : 0),
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isPodium ? `2px solid ${borderColor}` : 'none',
        padding: isPodium ? 2 : 0,
        flexShrink: 0,
      }}>
        <div style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg3)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: isPodium ? `1.5px solid rgba(255,255,255,0.8)` : 'none',
        }}>
          {entry.photoURL
            ? <img src={entry.photoURL} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: size * 0.38, fontWeight: 800, color: 'var(--text3)' }}>{(entry.name || '?').charAt(0).toUpperCase()}</span>
          }
        </div>
      </div>
    );
  };

  const RankIcon = ({ rank }) => {
    if (rank === 1) return <Crown size={20} style={{ color: '#F59E0B' }} />;
    if (rank === 2) return <Medal size={20} style={{ color: '#9CA3AF' }} />;
    if (rank === 3) return <Medal size={20} style={{ color: '#B45309' }} />;
    return <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text3)', minWidth: 20, textAlign: 'center' }}>{rank}</span>;
  };

  const LeaderRow = ({ entry, pinned }) => (
    <div
      id={`lb-${entry.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 16,
        border: entry.isMe
          ? '1.5px solid #29B6F6'
          : pinned
            ? '1.5px solid #F59E0B'
            : '1px solid var(--glass-border)',
        background: entry.isMe
          ? 'rgba(41, 182, 246, 0.08)'
          : pinned
            ? 'rgba(245, 158, 11, 0.08)'
            : 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        boxShadow: entry.isMe ? '0 4px 15px rgba(41, 182, 246, 0.1)' : '0 2px 8px rgba(0,0,0,0.01)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {entry.isMe && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: PRIMARY, borderRadius: '2px 0 0 2px' }} />
      )}
      <div style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <RankIcon rank={entry.rank} />
      </div>
      <Avatar entry={entry} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          {entry.isMe && (
            <span style={{ fontSize: 10, background: PRIMARY, color: '#fff', padding: '1px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>SIZ</span>
          )}
          {pinned && !entry.isMe && (
            <span style={{ fontSize: 10, background: '#F59E0B', color: '#fff', padding: '1px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>PIN</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', gap: 10 }}>
          <span>📝 {entry.answered}</span>
          {entry.streak > 0 && <span>🔥 {entry.streak} kun</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: entry.isMe ? PRIMARY : 'var(--text)' }}>
          {entry.score.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>BALL</div>
      </div>
      {isAdmin && (
        <button
          onClick={() => handleDeleteClick(entry.id, entry.name)}
          style={{
            background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
            border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer',
            marginLeft: 10,
          }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>🏆 Reyting</h1>
        <p style={s.subtitle}>Eng yuqori ball to'plagan o'quvchilar</p>
      </div>

      {!loading && top3.length >= 3 && (
        <div style={s.podium}>
          <div style={s.podiumItem}>
            <Avatar entry={top3[1]} size={52} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[1].name}</div>
            <div style={{ ...s.podiumBlock, height: 60, background: 'linear-gradient(135deg, #E2E8F0 0%, #9CA3AF 100%)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 15px rgba(156, 163, 175, 0.2)' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>2</span>
            </div>
          </div>
          <div style={{ ...s.podiumItem, marginTop: -20 }}>
            <Crown size={28} style={{ color: '#F59E0B', marginBottom: 4, filter: 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))' }} />
            <Avatar entry={top3[0]} size={64} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[0].name}</div>
            <div style={{ ...s.podiumBlock, height: 80, background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>1</span>
            </div>
          </div>
          <div style={s.podiumItem}>
            <Avatar entry={top3[2]} size={52} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[2].name}</div>
            <div style={{ ...s.podiumBlock, height: 44, background: 'linear-gradient(135deg, #FDBA74 0%, #B45309 100%)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>3</span>
            </div>
          </div>
        </div>
      )}

      <div style={s.listWrap}>
        {loading ? (
          <div style={s.empty}>⏳ Yuklanmoqda...</div>
        ) : leaders.length === 0 ? (
          <div style={s.empty}>Hozircha reyting bo'sh</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaders.map((entry, idx) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                <LeaderRow entry={entry} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {myEntry && (
        <div style={s.pinnedWrap}>
          <div style={s.pinnedDivider}>
            <div style={s.pinnedDots}>• • •</div>
          </div>
          <LeaderRow entry={myEntry} pinned />
        </div>
      )}

      {deleteConfirm.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: 24, maxWidth: 320, width: '90%', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>O'chirishni tasdiqlang</h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>"{deleteConfirm.name}" ning reyting natijasini rostdan ham o'chirasizmi?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>Bekor qilish</button>
              <button className="btn" style={{ flex: 1, padding: '12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700 }} onClick={executeDelete}>O'chirish</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const s = {
  page: { maxWidth: 600, margin: '0 auto', padding: '20px 16px 120px' },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--text3)', margin: 0 },
  podium: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    gap: 16, marginBottom: 28, padding: '20px 0 0',
  },
  podiumItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  podiumBlock: {
    width: 72, borderRadius: '10px 10px 0 0', marginTop: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  listWrap: { display: 'flex', flexDirection: 'column', gap: 0 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 15 },
  pinnedWrap: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 600,
    padding: '0 16px calc(80px + env(safe-area-inset-bottom)) 16px',
    background: 'linear-gradient(transparent, var(--bg) 30%)',
    zIndex: 100,
  },
  pinnedDivider: { display: 'flex', justifyContent: 'center', marginBottom: 8 },
  pinnedDots: { fontSize: 14, color: 'var(--border2)', letterSpacing: 4 },
};

export default LeaderboardPage;
