import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Trash2 } from 'lucide-react';
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, getDoc, where, getCountFromServer, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useAdmin } from '../hooks/useAdmin';
import { getWeekId, getMonthId } from '../context/AppContext';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const [leaders, setLeaders] = useState([]);
  const [myEntry, setMyEntry] = useState(null); // top-50 tashqarisidagi "Siz" qatori
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });

  // New states for safe/local improvements
  const [boardType, setBoardType] = useState('all'); // 'all' | 'weekly' | 'monthly'
  const [sessionRankChange, setSessionRankChange] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let q;
    const weekId = getWeekId();
    const monthId = getMonthId();

    if (boardType === 'weekly') {
      q = query(collection(db, 'userStats'), orderBy(`weekly_${weekId}`, 'desc'), limit(50));
    } else if (boardType === 'monthly') {
      q = query(collection(db, 'userStats'), orderBy(`monthly_${monthId}`, 'desc'), limit(50));
    } else {
      q = query(collection(db, 'userStats'), orderBy('totalScore', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        let results = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();

          let score = 0;
          if (boardType === 'weekly') {
            score = d[`weekly_${weekId}`] || 0;
          } else if (boardType === 'monthly') {
            score = d[`monthly_${monthId}`] || 0;
          } else {
            score = d.totalScore || 0;
          }

          results.push({
            id: docSnap.id,
            name: d.displayName || d.userName || d.name || `#${docSnap.id.slice(0, 6)}`,
            score: score,
            streak: d.dailyStreak || 0,
            answered: d.totalAnswered || 0,
            photoURL: d.photoURL || null
          });
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

              let myScore = 0;
              let rankAbove = 0;

              if (boardType === 'weekly') {
                myScore = md[`weekly_${weekId}`] || 0;
                const rankQ = query(collection(db, 'userStats'), where(`weekly_${weekId}`, '>', myScore));
                const cnt = await getCountFromServer(rankQ);
                rankAbove = cnt.data().count;
              } else if (boardType === 'monthly') {
                myScore = md[`monthly_${monthId}`] || 0;
                const rankQ = query(collection(db, 'userStats'), where(`monthly_${monthId}`, '>', myScore));
                const cnt = await getCountFromServer(rankQ);
                rankAbove = cnt.data().count;
              } else {
                myScore = md.totalScore || 0;
                const rankQ = query(collection(db, 'userStats'), where('totalScore', '>', myScore));
                const cnt = await getCountFromServer(rankQ);
                rankAbove = cnt.data().count;
              }

              setMyEntry({
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Siz',
                score: myScore,
                streak: md.dailyStreak || 0,
                answered: md.totalAnswered || 0,
                photoURL: user.photoURL || null,
                rank: rankAbove + 1,
                isMe: true
              });
            } else {
              setMyEntry(null);
            }
          } catch { /* reyting o'qishda xato — e'tiborsiz */ }
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
  }, [user, boardType]);

  // Session rank tracking for safe shifts
  useEffect(() => {
    if (loading) return;
    const me = leaders.find(r => r.id === user.uid);
    const currentRank = me ? me.rank : (myEntry ? myEntry.rank : null);
    
    if (currentRank) {
      const sessionKey = `iqro_initial_rank_${boardType}`;
      const saved = sessionStorage.getItem(sessionKey);
      if (!saved) {
        sessionStorage.setItem(sessionKey, currentRank.toString());
        setSessionRankChange(0);
      } else {
        const initialRank = parseInt(saved, 10);
        setSessionRankChange(initialRank - currentRank);
      }
    } else {
      setSessionRankChange(0);
    }
  }, [leaders, myEntry, loading, boardType, user.uid]);

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

  const Avatar = ({ entry, size = 44 }) => {
    const isPodium = entry.rank <= 3;
    const ring = entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : '#B45309';
    return (
      <div className={`lb-av-ring${isPodium ? ' podium' : ''}`} style={{ '--sz': `${size}px`, '--ring': ring }}>
        <div className="lb-av">
          {entry.photoURL
            ? <img src={entry.photoURL} alt={entry.name} />
            : <span style={{ fontSize: size * 0.38 }}>{(entry.name || '?').charAt(0).toUpperCase()}</span>
          }
        </div>
      </div>
    );
  };

  const RankIcon = ({ rank }) => {
    if (rank === 1) return <Crown size={20} style={{ color: '#F59E0B' }} />;
    if (rank === 2) return <Medal size={20} style={{ color: '#9CA3AF' }} />;
    if (rank === 3) return <Medal size={20} style={{ color: '#B45309' }} />;
    return <span className="lb-rank-num">{rank}</span>;
  };

  const LeaderRow = ({ entry, pinned }) => (
    <div
      id={`lb-${entry.id}`}
      className={`lb-row${entry.isMe ? ' me' : pinned ? ' pinned' : ''}`}
    >
      {entry.isMe && <div className="lb-row-accent" />}
      <div className="lb-rank">
        <RankIcon rank={entry.rank} />
      </div>
      <Avatar entry={entry} size={40} />
      <div className="lb-info">
        <div className="lb-name-row">
          <span className="lb-name">{entry.name}</span>
          {entry.isMe && <span className="lb-badge me">SIZ</span>}
          {entry.isMe && sessionRankChange !== 0 && (
            <span className={`lb-delta ${sessionRankChange > 0 ? 'up' : 'down'}`}>
              {sessionRankChange > 0 ? `▲ ${sessionRankChange}` : `▼ ${Math.abs(sessionRankChange)}`}
            </span>
          )}
          {pinned && !entry.isMe && <span className="lb-badge pin">PIN</span>}
        </div>
        <div className="lb-meta">
          <span>{entry.answered} savol</span>
          {entry.streak > 0 && <span>🔥 {entry.streak} kun</span>}
        </div>
      </div>
      <div className="lb-score-wrap">
        <div className={`lb-score${entry.isMe ? ' me' : ''}`}>
          {entry.score.toLocaleString()}
        </div>
        <div className="lb-score-lbl">BALL</div>
      </div>
      {isAdmin && (
        <button
          className="lb-del-btn"
          onClick={(e) => { e.stopPropagation(); handleDeleteClick(entry.id, entry.name); }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lb-page">
      <div className="lb-header">
        <h1 className="lb-title">Reyting</h1>
        <p className="lb-subtitle">Har bir to'g'ri javob uchun bir ball</p>
      </div>

      {/* Board type tabs */}
      <div className="lb-tabs">
        {[
          { id: 'all', label: 'Barchasi' },
          { id: 'weekly', label: 'Haftalik' },
          { id: 'monthly', label: 'Oylik' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`lb-tab${boardType === tab.id ? ' active' : ''}`}
            onClick={() => setBoardType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!loading && top3.length >= 3 && (
        <div className="lb-podium">
          <div className="lb-podium-item">
            <Avatar entry={top3[1]} size={52} />
            <div className="lb-podium-name">{top3[1].name}</div>
            <div className="lb-podium-block silver">2</div>
          </div>
          <div className="lb-podium-item first">
            <Crown size={28} className="lb-crown" />
            <Avatar entry={top3[0]} size={64} />
            <div className="lb-podium-name">{top3[0].name}</div>
            <div className="lb-podium-block gold">1</div>
          </div>
          <div className="lb-podium-item">
            <Avatar entry={top3[2]} size={52} />
            <div className="lb-podium-name">{top3[2].name}</div>
            <div className="lb-podium-block bronze">3</div>
          </div>
        </div>
      )}

      <div className="lb-list-wrap">
        {loading ? (
          <div className="lb-empty">Yuklanmoqda...</div>
        ) : leaders.length === 0 ? (
          <div className="lb-empty">Hozircha reyting bo'sh</div>
        ) : (
          <div className="lb-list">
            {/* Podium ko'rsatilganda top-3 ro'yxatda takrorlanmaydi — 4-o'rindan boshlaymiz */}
            {(top3.length >= 3 ? leaders.slice(3) : leaders).map((entry, idx) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                <LeaderRow entry={entry} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {myEntry && (
        <div className="lb-pinned-wrap">
          <div className="lb-pinned-divider">
            <div className="lb-pinned-dots">• • •</div>
          </div>
          <LeaderRow entry={myEntry} pinned />
        </div>
      )}

      {deleteConfirm.show && (
        <div className="lb-modal-overlay">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel lb-confirm">
            <div className="lb-confirm-emoji">⚠️</div>
            <h3 className="lb-confirm-title">O'chirishni tasdiqlang</h3>
            <p className="lb-confirm-text">"{deleteConfirm.name}" ning reyting natijasini rostdan ham o'chirasizmi?</p>
            <div className="lb-confirm-actions">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>Bekor qilish</button>
              <button className="btn lb-confirm-del" onClick={executeDelete}>O'chirish</button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default LeaderboardPage;
