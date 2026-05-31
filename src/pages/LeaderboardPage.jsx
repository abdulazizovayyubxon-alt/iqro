import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Medal, Star, Trash2, Trophy, X, Calendar, Activity, Zap } from 'lucide-react';
import {
  collection, query, orderBy, limit, getDocs, onSnapshot,
  doc, getDoc, where, getCountFromServer, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useAdmin } from '../hooks/useAdmin';
import { SUBJECTS } from '../data/mockData';
import { getWeekId, getMonthId } from '../context/AppContext';

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

  // New states for safe/local improvements
  const [boardType, setBoardType] = useState('all'); // 'all' | 'weekly' | 'monthly'
  const [selectedSubject, setSelectedSubject] = useState('all'); // 'all' | subjectId
  const [selectedUser, setSelectedUser] = useState(null); // local details popup
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
      if (selectedSubject !== 'all') {
        q = query(collection(db, 'userStats'), orderBy(`stats.${selectedSubject}.totalCorrect`, 'desc'), limit(50));
      } else {
        q = query(collection(db, 'userStats'), orderBy('totalScore', 'desc'), limit(50));
      }
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const results = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          
          let score = 0;
          if (boardType === 'weekly') {
            score = d[`weekly_${weekId}`] || 0;
          } else if (boardType === 'monthly') {
            score = d[`monthly_${monthId}`] || 0;
          } else {
            if (selectedSubject !== 'all') {
              score = (d.stats?.[selectedSubject]?.totalCorrect || 0) * 2;
            } else {
              score = d.totalScore || 0;
            }
          }

          results.push({
            id: docSnap.id,
            name: d.displayName || d.userName || d.name || `#${docSnap.id.slice(0, 6)}`,
            score: score,
            streak: d.dailyStreak || 0,
            answered: d.totalAnswered || 0,
            photoURL: d.photoURL || null,
            rawStats: d.stats || {},
            totalCorrect: d.totalCorrect || 0,
            xp: d.totalScore || 0
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
              let rankQ;

              if (boardType === 'weekly') {
                myScore = md[`weekly_${weekId}`] || 0;
                rankQ = query(collection(db, 'userStats'), where(`weekly_${weekId}`, '>', myScore));
              } else if (boardType === 'monthly') {
                myScore = md[`monthly_${monthId}`] || 0;
                rankQ = query(collection(db, 'userStats'), where(`monthly_${monthId}`, '>', myScore));
              } else {
                if (selectedSubject !== 'all') {
                  myScore = (md.stats?.[selectedSubject]?.totalCorrect || 0) * 2;
                  rankQ = query(collection(db, 'userStats'), where(`stats.${selectedSubject}.totalCorrect`, '>', Math.floor(myScore / 2)));
                } else {
                  myScore = md.totalScore || 0;
                  rankQ = query(collection(db, 'userStats'), where('totalScore', '>', myScore));
                }
              }

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
                rawStats: md.stats || {},
                totalCorrect: md.totalCorrect || 0,
                xp: md.totalScore || 0
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
  }, [user, boardType, selectedSubject]);

  // Session rank tracking for safe shifts
  useEffect(() => {
    if (loading) return;
    const me = leaders.find(r => r.id === user.uid);
    const currentRank = me ? me.rank : (myEntry ? myEntry.rank : null);
    
    if (currentRank) {
      const sessionKey = `iqro_initial_rank_${boardType}_${selectedSubject}`;
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
  }, [leaders, myEntry, loading, boardType, selectedSubject, user.uid]);

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
      onClick={() => setSelectedUser(entry)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 16,
        cursor: 'pointer',
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
        transition: 'transform 0.2s, background-color 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (!entry.isMe && !pinned) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (!entry.isMe && !pinned) e.currentTarget.style.backgroundColor = 'var(--glass-bg)';
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
          {entry.isMe && sessionRankChange !== 0 && (
            <span style={{ 
              fontSize: 10, 
              fontWeight: 800, 
              padding: '1px 6px',
              borderRadius: 6,
              background: sessionRankChange > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: sessionRankChange > 0 ? '#10B981' : '#EF4444',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              flexShrink: 0
            }}>
              {sessionRankChange > 0 ? `▲ ${sessionRankChange}` : `▼ ${Math.abs(sessionRankChange)}`}
            </span>
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
          onClick={(e) => { e.stopPropagation(); handleDeleteClick(entry.id, entry.name); }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
            border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer',
            marginLeft: 10, zIndex: 10
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

      {/* Leaderboard Type Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--bg3)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        {[
          { id: 'all', label: '🏆 Barchasi' },
          { id: 'weekly', label: '📅 Haftalik' },
          { id: 'monthly', label: '🌙 Oylik' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setBoardType(tab.id);
              if (tab.id !== 'all') setSelectedSubject('all');
            }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '10px',
              border: 'none',
              background: boardType === tab.id ? 'var(--blue)' : 'transparent',
              color: boardType === tab.id ? '#fff' : 'var(--text2)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subject Filter Tabs (Only shown for Lifetime Board) */}
      {boardType === 'all' && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="pp-policy-scroll">
          <button
            onClick={() => setSelectedSubject('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              border: selectedSubject === 'all' ? '1px solid var(--blue)' : '1px solid var(--border)',
              background: selectedSubject === 'all' ? 'var(--blue)' : 'var(--bg3)',
              color: selectedSubject === 'all' ? '#fff' : 'var(--text2)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
          >
            📚 Barcha fanlar
          </button>
          {SUBJECTS.map(subj => {
            const Icon = subj.icon;
            const isSelected = selectedSubject === subj.id;
            return (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid var(--blue)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--blue)' : 'var(--bg3)',
                  color: isSelected ? '#fff' : 'var(--text2)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                {Icon && <Icon size={14} />}
                <span>{subj.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && top3.length >= 3 && (
        <div style={s.podium}>
          <div style={s.podiumItem}>
            <Avatar entry={top3[1]} size={52} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textCenter: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[1].name}</div>
            <div style={{ ...s.podiumBlock, height: 60, background: 'linear-gradient(135deg, #E2E8F0 0%, #9CA3AF 100%)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 15px rgba(156, 163, 175, 0.2)' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>2</span>
            </div>
          </div>
          <div style={{ ...s.podiumItem, marginTop: -20 }}>
            <Crown size={28} style={{ color: '#F59E0B', marginBottom: 4, filter: 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))' }} />
            <Avatar entry={top3[0]} size={64} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textCenter: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[0].name}</div>
            <div style={{ ...s.podiumBlock, height: 80, background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>1</span>
            </div>
          </div>
          <div style={s.podiumItem}>
            <Avatar entry={top3[2]} size={52} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 6, textCenter: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[2].name}</div>
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

      {/* 👤 USER DETAIL MODAL (Local User Card) */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedUser(null)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="glass-panel" 
            style={{ padding: 24, maxWidth: 440, width: '90%', borderRadius: 24, position: 'relative', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedUser(null)} 
              style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}
            >
              <X size={16} />
            </button>

            {/* User Header Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 24px rgba(41, 182, 246, 0.25)',
                overflow: 'hidden'
              }}>
                {selectedUser.photoURL
                  ? <img src={selectedUser.photoURL} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (selectedUser.name || '?').charAt(0).toUpperCase()
                }
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px 0' }}>{selectedUser.name}</h3>
                <span style={{ fontSize: 12, background: 'var(--blue-bg)', color: 'var(--blue)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  🏆 O'rni: #{selectedUser.rank}
                </span>
              </div>
            </div>

            {/* Core Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
              <div style={{ background: 'var(--bg3)', padding: '12px 8px', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Zap size={18} style={{ color: '#F59E0B', margin: '0 auto 6px' }} />
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{(selectedUser.score || 0).toLocaleString()}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>BALL</div>
              </div>
              <div style={{ background: 'var(--bg3)', padding: '12px 8px', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Activity size={18} style={{ color: PRIMARY, margin: '0 auto 6px' }} />
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{(selectedUser.answered || 0).toLocaleString()}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>SAVOLLAR</div>
              </div>
              <div style={{ background: 'var(--bg3)', padding: '12px 8px', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Trophy size={18} style={{ color: '#10B981', margin: '0 auto 6px' }} />
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{(selectedUser.streak || 0)} kun</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>STREAK</div>
              </div>
            </div>

            {/* Category Progress Breakdown */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                📚 Fanlar bo'yicha mustahkamlik
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }} className="pp-policy-scroll">
                {SUBJECTS.map(subj => {
                  const stats = (selectedUser.rawStats || {})[subj.id] || { totalAnswered: 0, totalCorrect: 0 };
                  const accuracy = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
                  const SubjIcon = subj.icon || Trophy;
                  return (
                    <div key={subj.id} style={{ padding: '10px 12px', borderRadius: 14, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY, flexShrink: 0 }}>
                        <SubjIcon size={14} style={{ margin: '0 auto' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj.name}</div>
                        <div style={{ fontSize: 10, color: stats.totalAnswered > 0 ? (accuracy >= 70 ? '#10B981' : accuracy >= 40 ? '#F59E0B' : '#EF4444') : 'var(--text3)', fontWeight: 600, marginTop: 2 }}>
                          {stats.totalAnswered > 0 ? `${accuracy}% (${stats.totalAnswered} ta)` : 'Boshlanmagan'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={() => setSelectedUser(null)} 
              style={{ width: '100%', padding: '12px', borderRadius: 14, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 20, boxShadow: '0 4px 12px rgba(41, 182, 246, 0.25)' }}
            >
              Yopish
            </button>
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
