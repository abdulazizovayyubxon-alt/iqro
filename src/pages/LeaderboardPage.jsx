import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, ArrowLeft } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../context/AuthContext';

const LeaderboardPage = ({ goBack }) => {
  const { user } = useContext(AuthContext);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Firebase'dan eng ko'p ball (totalScore) to'plagan 15 kishini olamiz
      const q = query(collection(db, 'userStats'), orderBy('totalScore', 'desc'), limit(15));
      const snapshot = await getDocs(q);
      
      const results = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.totalScore !== undefined) {
          results.push({
            id: docSnap.id,
            name: data.displayName || data.userName || null,
            score: data.totalScore || 0,
            streak: data.dailyStreak || 0,
            answered: data.totalAnswered || 0,
            photoURL: data.photoURL || null
          });
        }
      });
      
      // Eski ro'yxatdan o'tganlarda ism yo'q bo'lsa, 'users' dan qidiramiz
      for (let res of results) {
        if (!res.name) {
          try {
            const userDoc = await getDoc(doc(db, 'users', res.id));
            if (userDoc.exists()) {
              res.name = userDoc.data().displayName;
            }
          } catch (e) {
            console.error("User fetch error:", e);
          }
          if (!res.name) res.name = 'Maxfiy foydalanuvchi';
        }
      }

      setLeaders(results);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return <Crown size={24} style={{ color: '#fbbf24' }} />; // Oltin
    if (index === 1) return <Medal size={24} style={{ color: '#9ca3af' }} />; // Kumush
    if (index === 2) return <Medal size={24} style={{ color: '#b45309' }} />; // Bronza
    return <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text3)', width: 24, textAlign: 'center' }}>{index + 1}</div>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-outline btn-sm" onClick={goBack}>
          <ArrowLeft size={14} /> Orqaga
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={20} style={{ color: '#fbbf24' }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>TOP Reyting</span>
        </div>
        <div style={{ width: 80 }} /> {/* Spacer */}
      </div>

      <div className="glass-panel" style={{ maxWidth: 650, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>Chempionlar Doskasi</h2>
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>Platformadagi eng faol va yuqori ball to'plagan o'quvchilar</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Yuklanmoqda...</div>
        ) : leaders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Hozircha reyting bo'sh</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leaders.map((leader, idx) => {
              const isMe = user && user.uid === leader.id;
              
              return (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    background: isMe ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg2)',
                    border: `1.5px solid ${isMe ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 16, position: 'relative', overflow: 'hidden'
                  }}
                >
                  {isMe && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--blue)' }} />}
                  
                  {/* O'rin */}
                  <div style={{ width: 30, display: 'flex', justifyContent: 'center' }}>
                    {getRankBadge(idx)}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: 'var(--bg3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    overflow: 'hidden', border: idx < 3 ? '2px solid #fbbf24' : 'none'
                  }}>
                    {leader.photoURL ? (
                      <img src={leader.photoURL} alt={leader.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text2)' }}>{leader.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Ism */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {leader.name}
                      {isMe && <span style={{ fontSize: 10, background: 'var(--blue)', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 8, verticalAlign: 'middle' }}>SIZ</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} /> {leader.answered} savol</span>
                      {leader.streak > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber)' }}>🔥 {leader.streak} kun</span>}
                    </div>
                  </div>

                  {/* Ball */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
                      {leader.score.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>BALL</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LeaderboardPage;
