import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Medal, Star, Trash2, Trophy } from 'lucide-react';
import {
  collection, query, orderBy, limit, getDocs,
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

  useEffect(() => { fetchLeaderboard(); }, [user]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" ning reyting natijasini o'chirasizmi?`)) return;
    try {
      await deleteDoc(doc(db, 'userStats', id));
      setLeaders(prev => prev.filter(l => l.id !== id));
      if (myEntry?.id === id) setMyEntry(null);
      showToast("Reyting natijasi o'chirildi", 'success');
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error');
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, 'userStats'), orderBy('totalScore', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.totalScore !== undefined) {
          results.push({
            id: docSnap.id,
            name: d.displayName || d.userName || d.name || null,
            score: d.totalScore || 0,
            streak: d.dailyStreak || 0,
            answered: d.totalAnswered || 0,
            photoURL: d.photoURL || null,
          });
        }
      });

      // Ismlarni users kolleksiyasidan yuklash
      await Promise.all(results.map(async (res) => {
        if (!res.name) {
          try {
            const ud = await getDoc(doc(db, 'users', res.id));
            if (ud.exists()) {
              const u = ud.data();
              res.name = u.displayName || u.userName || u.name || u.email?.split('@')[0];
              if (u.photoURL && !res.photoURL) res.photoURL = u.photoURL;
            }
          } catch (_) {}
          if (!res.name) res.name = `#${res.id.slice(0, 6)}`;
        }
      }));

      // "Siz" top-50 da bormi?
      const meIdx = results.findIndex(r => user && r.id === user.uid);
      if (meIdx !== -1) {
        results[meIdx].rank = meIdx + 1;
        results[meIdx].isMe = true;
        setMyEntry(null);
      } else if (user) {
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
          }
        } catch (_) {}
      }

      results.forEach((r, i) => { if (!r.rank) r.rank = i + 1; });
      setLeaders(results);
    } catch (err) {
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Top 3 podium
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const Avatar = ({ entry, size = 44 }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--bg3)', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: entry.rank <= 3 ? `2px solid ${entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : '#B45309'}` : 'none',
    }}>
      {entry.photoURL
        ? <img src={entry.photoURL} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 800, color: 'var(--text3)' }}>{(entry.name || '?').charAt(0).toUpperCase()}</span>
      }
    </div>
  );

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
        padding: '12px 16px', borderRadius: 14,
        border: `1.5px solid ${entry.isMe ? PRIMARY : 'var(--border)'}`,
        background: entry.isMe ? 'rgba(41, 182, 246, 0.12)' : pinned ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg2)',
        boxShadow: entry.isMe ? `0 0 0 3px rgba(41, 182, 246, 0.2)` : 'none',
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
          onClick={() => handleDelete(entry.id, entry.name)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, borderRadius: 8 }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>🏆 Reyting</h1>
        <p style={s.subtitle}>Eng yuqori ball to'plagan o'quvchilar</p>
      </div>

      {/* Top 3 Podium */}
      {!loading && top3.length >= 3 && (
        <div style={s.podium}>
          {/* 2-o'rin */}
          <div style={s.podiumItem}>
            <Avatar entry={top3[1]} size={52} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[1].name}</div>
            <div style={{ ...s.podiumBlock, height: 60, background: '#9CA3AF' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>2</span>
            </div>
          </div>
          {/* 1-o'rin */}
          <div style={{ ...s.podiumItem, marginTop: -20 }}>
            <Crown size={28} style={{ color: '#F59E0B', marginBottom: 4 }} />
            <Avatar entry={top3[0]} size={64} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[0].name}</div>
            <div style={{ ...s.podiumBlock, height: 80, background: '#F59E0B' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>1</span>
            </div>
          </div>
          {/* 3-o'rin */}
          <div style={s.podiumItem}>
            <Avatar entry={top3[2]} size={52} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[2].name}</div>
            <div style={{ ...s.podiumBlock, height: 44, background: '#B45309' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>3</span>
            </div>
          </div>
        </div>
      )}

      {/* Ro'yxat */}
      <div style={s.listWrap}>
        {loading ? (
          <div style={s.empty}>⏳ Yuklanmoqda...</div>
        ) : leaders.length === 0 ? (
          <div style={s.empty}>Hozircha reyting bo'sh</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Top-3 ni ro'yxatda ham ko'rsatamiz */}
            {leaders.map((entry, idx) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                <LeaderRow entry={entry} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* "Siz" qatori — top-50 tashqarida bo'lsa, pastda PIN sifatida */}
      {myEntry && (
        <div style={s.pinnedWrap}>
          <div style={s.pinnedDivider}>
            <div style={s.pinnedDots}>• • •</div>
          </div>
          <LeaderRow entry={myEntry} pinned />
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
