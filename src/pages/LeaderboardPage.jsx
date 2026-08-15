import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crown, Medal, Trash2, AlertTriangle } from 'lucide-react';
import {
  collection, query, orderBy, limit, getDocs,
  doc, getDoc, where, getCountFromServer, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { avatarUrl } from '../data/avatars';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useAdmin } from '../hooks/useAdmin';
import { getWeekId, getMonthId } from '../context/AppContext';
import { getLeague, nextLeague, leagueProgress } from '../utils/league';
import './LeaderboardPage.css';

// Anti-farm — skoring o'zgartirilmaydi; faqat admin uchun shubhali hisoblarni belgilash.
// (har javobga maks 2 ball + kunlik maqsad bonusi +5 → o'rtacha ≤ ~2.5 ball/javob)
const farmFlags = (e, t) => {
  const flags = [];
  const answered = e.answered || 0;
  const correct = e.correct || 0;
  const score = e.totalScore || 0;
  const acc = answered > 0 ? correct / answered : 0;
  if (answered > 0 && score > answered * 3 + 20) flags.push(t('leaderboard.flagScore'));
  if (answered >= 200 && acc >= 0.98) flags.push(t('leaderboard.flagAccuracy'));
  return flags;
};

// ── O'QISH BYUDJETI: reyting keshi ─────────────────────────────────────────
// Ilgari bu sahifa `onSnapshot` (JONLI tinglovchi) ishlatardi. Top-50 dagi
// istalgan kishining bali o'zgarganda hujjatlar qayta o'qilardi — ya'ni
// foydalanuvchilar ko'paygan sari xarajat kvadratik o'sardi (400 kishi test
// yechayotganda top-50 doim o'zgaradi). Reytingda 50 o'qish — butun ilovadagi
// eng qimmat amal, qolgan hamma narsa birgalikda ~8 ta.
//
// Endi: bir martalik `getDocs` + 5 daqiqalik kesh. Reyting jonli bo'lishi
// shart emas. Foydalanuvchi sahifani qayta yuklasa (yoki pull-to-refresh
// qilsa) kesh chetlab o'tiladi — "yangilanmayapti" hissi qolmaydi.
const LB_CACHE_TTL = 5 * 60 * 1000;

/** Sahifa qayta yuklanganmi (F5 / pull-to-refresh)? Unda kesh chetlab o'tiladi. */
const isReload = () => {
  try {
    return performance.getEntriesByType('navigation')[0]?.type === 'reload';
  } catch { return false; }
};

const readLbCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.rows || Date.now() - cached.ts > LB_CACHE_TTL) return null;
    return cached.rows;
  } catch { return null; }
};

const writeLbCache = (key, rows) => {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), rows })); }
  catch { /* kvota to'lgan — kesh ixtiyoriy, jim o'tkazamiz */ }
};

const LeaderboardPage = () => {
  const { t } = useTranslation();
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
    let cancelled = false;
    setLoading(true);

    const weekId = getWeekId();
    const monthId = getMonthId();
    // Uch xil taxta bitta maydon nomiga keltiriladi — quyida mantiq bir marta yoziladi
    const scoreField =
      boardType === 'weekly' ? `weekly_${weekId}`
        : boardType === 'monthly' ? `monthly_${monthId}`
          : 'totalScore';
    const cacheKey = `zehin_lb_${scoreField}`;

    const toRow = (docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: d.displayName || d.userName || d.name || `#${docSnap.id.slice(0, 6)}`,
        score: d[scoreField] || 0,
        totalScore: d.totalScore || 0,
        correct: d.totalCorrect || 0,
        streak: d.dailyStreak || 0,
        answered: d.totalAnswered || 0,
        photoURL: d.photoURL || null,
        avatarId: d.avatarId || null,
        // Akademik pasport — reyting ballidan MUSTAQIL ko'rsatkich.
        // Ball hajmni mukofotlaydi, AMI/unvon esa sifatni; ikkalasi bir qatorda
        // turgani uchun "ko'p yechish" yagona maqsad bo'lib qolmaydi.
        // (userStats hujjatida `achievements` allaqachon sinxronlanadi.)
        ami: d.achievements?.ami || 0,
        unvonTier: d.achievements?.unvonTier || 0
      };
    };

    const load = async () => {
      try {
        // ── 1) Top-50: keshdan (0 o'qish) yoki bazadan (50 o'qish) ──
        let results = isReload() ? null : readLbCache(cacheKey);
        if (!results) {
          const snap = await getDocs(
            query(collection(db, 'userStats'), orderBy(scoreField, 'desc'), limit(50))
          );
          if (cancelled) return;
          results = snap.docs.map(toRow);
          writeLbCache(cacheKey, results);   // rank/isMe qo'shilishidan OLDIN — ular shaxsiy
        }

        // ── 2) "Siz" qatori ──
        const meIdx = results.findIndex(r => r.id === user.uid);
        if (meIdx !== -1) {
          results[meIdx].rank = meIdx + 1;
          results[meIdx].isMe = true;
          setMyEntry(null);
        } else {
          // Top-50 tashqarisida — o'z o'rnini HAR SAFAR yangi o'qiymiz (2 o'qish).
          // Foydalanuvchi avvalo o'z o'rnini ko'rgani keladi, u eskirmasligi kerak.
          try {
            const myDoc = await getDoc(doc(db, 'userStats', user.uid));
            if (cancelled) return;
            if (myDoc.exists()) {
              const md = myDoc.data();
              const myScore = md[scoreField] || 0;
              const cnt = await getCountFromServer(
                query(collection(db, 'userStats'), where(scoreField, '>', myScore))
              );
              if (cancelled) return;
              setMyEntry({
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || t('leaderboard.you'),
                score: myScore,
                totalScore: md.totalScore || 0,
                correct: md.totalCorrect || 0,
                streak: md.dailyStreak || 0,
                answered: md.totalAnswered || 0,
                photoURL: user.photoURL || null,
                avatarId: user.avatarId || null,
                ami: md.achievements?.ami || 0,
                unvonTier: md.achievements?.unvonTier || 0,
                rank: cnt.data().count + 1,
                isMe: true
              });
            } else {
              setMyEntry(null);
            }
          } catch { /* reyting o'qishda xato — e'tiborsiz */ }
        }

        results.forEach((r, i) => { if (!r.rank) r.rank = i + 1; });
        if (!cancelled) setLeaders(results);
      } catch (err) {
        console.error('Leaderboard load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // Bog'liqlik `user` EMAS, `user?.uid` — AuthContext token yangilanganda bir xil
    // foydalanuvchi uchun yangi obyekt qaytaradi (AppContext.jsx:484 dagi bilan bir xil sabab).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, boardType]);

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
      // Ilgari `onSnapshot` o'chirilgan qatorni o'zi olib tashlardi. Endi ro'yxat
      // keshlangani uchun uni QO'LDA yangilaymiz: barcha taxtalar keshini
      // bekor qilamiz va ekrandagi qatorni darhol olib tashlaymiz (qayta
      // o'qishsiz — 0 ta qo'shimcha o'qish).
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('zehin_lb_'))
          .forEach(k => localStorage.removeItem(k));
      } catch { /* kesh ixtiyoriy */ }
      setLeaders(prev => prev
        .filter(r => r.id !== deleteConfirm.id)
        .map((r, i) => ({ ...r, rank: i + 1 }))
      );
      showToast(t('leaderboard.toastDeleted'), 'success');
    } catch (e) {
      showToast(t('exam.toastError'), 'error');
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
          {(avatarUrl(entry.avatarId) || entry.photoURL)
            ? <img src={avatarUrl(entry.avatarId) || entry.photoURL} alt={entry.name} />
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
          {entry.isMe && <span className="lb-badge me">{t('leaderboard.youBadge')}</span>}
          {entry.isMe && sessionRankChange !== 0 && (
            <span className={`lb-delta ${sessionRankChange > 0 ? 'up' : 'down'}`}>
              {sessionRankChange > 0 ? `▲ ${sessionRankChange}` : `▼ ${Math.abs(sessionRankChange)}`}
            </span>
          )}
          {pinned && !entry.isMe && <span className="lb-badge pin">PIN</span>}
          {isAdmin && farmFlags(entry, t).length > 0 && (
            <span
              title={t('leaderboard.suspiciousTitle', { flags: farmFlags(entry, t).join(', ') })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 'var(--fs-2xs)', fontWeight: 800, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 6, padding: '1px 6px' }}
            >
              <AlertTriangle size={11} /> {t('leaderboard.suspicious')}
            </span>
          )}
        </div>
        <div className="lb-meta">
          <span title={t('leaderboard.leagueTitle', { name: getLeague(entry.totalScore).name })}>{getLeague(entry.totalScore).icon}</span>
          <span>{t('test.questionsCount', { count: entry.answered })}</span>
          {entry.streak > 0 && <span>{t('leaderboard.streakDays', { count: entry.streak })}</span>}
          {/* Unvon faqat 2-darajadan boshlab: «Izlanuvchi» hammada bor va u
              qatorni ma'nosiz to'ldirardi. AMI esa har doim ma'lumot beradi. */}
          {entry.unvonTier >= 2 && (
            <span className="lb-unvon" title={t('tracks.amiLabel')}>{t(`tracks.tier${entry.unvonTier}`)}</span>
          )}
          {entry.ami > 0 && <span title={t('tracks.amiLabel')}>{t('leaderboard.amiShort', { count: entry.ami })}</span>}
        </div>
      </div>
      <div className="lb-score-wrap">
        <div className={`lb-score${entry.isMe ? ' me' : ''}`}>
          {entry.score.toLocaleString()}
        </div>
        <div className="lb-score-lbl">{t('leaderboard.points')}</div>
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
        <h1 className="lb-title">{t('leaderboard.title')}</h1>
        <p className="lb-subtitle">{t('leaderboard.subtitle')}</p>
      </div>

      {/* Board type tabs */}
      <div className="lb-tabs">
        {[
          { id: 'all', label: t('leaderboard.tabAll') },
          { id: 'weekly', label: t('leaderboard.tabWeekly') },
          { id: 'monthly', label: t('leaderboard.tabMonthly') }
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

      {/* Mening ligam — kosmetik daraja + keyingi darajaga progress */}
      {!loading && (() => {
        const myStat = leaders.find(r => r.isMe) || myEntry;
        const myScore = myStat?.totalScore || 0;
        const lg = getLeague(myScore);
        const nxt = nextLeague(myScore);
        const prog = leagueProgress(myScore);
        return (
          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 'var(--fs-7xl)', lineHeight: 1 }}>{lg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', color: lg.color }}>{t('leaderboard.leagueSuffix', { name: lg.name })}</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                  {nxt ? t('leaderboard.toNextLeague', { name: nxt.name, points: (nxt.min - myScore).toLocaleString() }) : t('leaderboard.topLeague')}
                </div>
              </div>
            </div>
            {nxt && (
              <div style={{ height: 7, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ width: `${prog * 100}%`, height: '100%', background: lg.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
            )}
          </div>
        );
      })()}

      {!loading && top3.length >= 3 && (
        <div className="lb-podium">
          <div className="lb-podium-item">
            <Avatar entry={top3[1]} size={52} />
            <div className="lb-podium-name">{top3[1].name}</div>
            <div className="lb-podium-score">{top3[1].score.toLocaleString()}</div>
            <div className="lb-podium-block silver">2</div>
          </div>
          <div className="lb-podium-item first">
            <Crown size={28} className="lb-crown" />
            <Avatar entry={top3[0]} size={64} />
            <div className="lb-podium-name">{top3[0].name}</div>
            <div className="lb-podium-score">{top3[0].score.toLocaleString()}</div>
            <div className="lb-podium-block gold">1</div>
          </div>
          <div className="lb-podium-item">
            <Avatar entry={top3[2]} size={52} />
            <div className="lb-podium-name">{top3[2].name}</div>
            <div className="lb-podium-score">{top3[2].score.toLocaleString()}</div>
            <div className="lb-podium-block bronze">3</div>
          </div>
        </div>
      )}

      <div className="lb-list-wrap">
        {loading ? (
          <div className="lb-empty">{t('common.loading')}</div>
        ) : leaders.length === 0 ? (
          <div className="lb-empty">{t('leaderboard.empty')}</div>
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
            <h3 className="lb-confirm-title">{t('leaderboard.deleteTitle')}</h3>
            <p className="lb-confirm-text">{t('leaderboard.deleteText', { name: deleteConfirm.name })}</p>
            <div className="lb-confirm-actions">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>{t('common.cancel')}</button>
              <button className="btn lb-confirm-del" onClick={executeDelete}>{t('common.delete')}</button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default LeaderboardPage;
