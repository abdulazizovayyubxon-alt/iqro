import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crown, Medal, Trash2, AlertTriangle } from 'lucide-react';
import {
  collection, query, orderBy, limit, getDocs,
  doc, getDoc, where, getCountFromServer, deleteDoc, documentId
} from 'firebase/firestore';
import { db } from '../firebase';
import { avatarUrl } from '../data/avatars';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { useAdmin } from '../hooks/useAdmin';
import { AppContext, getWeekId, getMonthId } from '../context/AppContext';
import { getLeague, nextLeague, leagueProgress } from '../utils/league';
import { decideLeaderboardSource } from '../utils/leaderboardSnapshot';
import { withWriteTimeout } from '../utils/firebaseError';
import { AnalyticsEvents } from '../services/analytics';
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
// foydalanuvchilar ko'paygan sari xarajat kvadratik o'sardi.
//
// Endi: bir martalik `getDocs` + 30 daqiqalik kesh. Reyting jonli bo'lishi
// shart emas. Foydalanuvchi sahifani qayta yuklasa (F5 / pull-to-refresh)
// kesh birinchi martada chetlab o'tiladi.
const LB_CACHE_TTL = 30 * 60 * 1000;
const LB_NET_TIMEOUT_MS = 8000;
const SNAPSHOT_MAX_AGE = 26 * 60 * 60 * 1000;

// Tezkor xotira (RAM) keshi — tablar ('all', 'weekly', 'monthly') o'rtasida
// almashganda JSON parse qilmasdan 0ms da yuklash uchun
const memLbCache = new Map();
const userRankCache = new Map();

/**
 * Snapshot vaqti — bugungi bo'lsa faqat soat, aks holda sana ham.
 * Buzuq qiymatda `null` qaytadi va yozuv umuman ko'rsatilmaydi.
 */
const formatSnapshotTime = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString()} ${time}`;
};

/**
 * Sahifa qayta yuklanganmi (F5 / pull-to-refresh)?
 * ⚠️ Muhim: faqat qayta yuklangandan keyingi BIRINCHI yuklashda kesh chetlab
 * o'tiladi. Keyingi tab almashishlarda kesh qayta ishlayveradi.
 */
let reloadConsumed = false;
const shouldBypassCacheOnReload = () => {
  if (reloadConsumed) return false;
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav?.type === 'reload') {
      reloadConsumed = true;
      return true;
    }
  } catch { /* ignore */ }
  return false;
};

const readLbCache = (key, allowStale = false) => {
  const mem = memLbCache.get(key);
  if (mem) {
    if (allowStale || Date.now() - mem.ts <= LB_CACHE_TTL) {
      return { rows: mem.rows.map(r => ({ ...r })), at: mem.at };
    }
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.rows) return null;
    if (!allowStale && Date.now() - cached.ts > LB_CACHE_TTL) return null;
    const result = { rows: cached.rows.map(r => ({ ...r })), at: cached.at || null };
    memLbCache.set(key, { ts: cached.ts, rows: result.rows, at: result.at });
    return result;
  } catch { return null; }
};

const writeLbCache = (key, rows, at) => {
  const now = Date.now();
  memLbCache.set(key, { ts: now, rows, at: at || null });
  try { localStorage.setItem(key, JSON.stringify({ ts: now, rows, at: at || null })); }
  catch { /* kvota to'lgan — kesh ixtiyoriy, jim o'tkazamiz */ }
};

// ── Kichik vizual komponentlar tashqariga chiqarildi (har renderda noldan yasalmasligi uchun) ──
const Avatar = React.memo(function Avatar({ entry, size = 44 }) {
  const isPodium = entry.rank <= 3;
  const ring = entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : '#B45309';
  const url = avatarUrl(entry.avatarId) || entry.photoURL;
  return (
    <div className={`lb-av-ring${isPodium ? ' podium' : ''}`} style={{ '--sz': `${size}px`, '--ring': ring }}>
      <div className="lb-av">
        {url
          ? <img src={url} alt={entry.name} loading="lazy" />
          : <span style={{ fontSize: size * 0.38 }}>{(entry.name || '?').charAt(0).toUpperCase()}</span>
        }
      </div>
    </div>
  );
});

const RankIcon = React.memo(function RankIcon({ rank }) {
  if (!rank) return <span className="lb-rank-num muted">—</span>;
  if (rank === 1) return <Crown size={20} style={{ color: '#F59E0B' }} />;
  if (rank === 2) return <Medal size={20} style={{ color: '#9CA3AF' }} />;
  if (rank === 3) return <Medal size={20} style={{ color: '#B45309' }} />;
  const num = Number(rank);
  const sizeClass = num >= 10000 ? ' rank-xs' : num >= 1000 ? ' rank-sm' : num >= 100 ? ' rank-md' : '';
  return <span className={`lb-rank-num${sizeClass}`}>{num.toLocaleString()}</span>;
});

const LeaderRow = React.memo(function LeaderRow({ entry, pinned, isAdmin, sessionRankChange, t, onDelete }) {
  const isSuspicious = isAdmin && farmFlags(entry, t).length > 0;
  return (
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
          {isSuspicious && (
            <span
              title={t('leaderboard.suspiciousTitle', { flags: farmFlags(entry, t).join(', ') })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 'var(--fs-2xs)', fontWeight: 800, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 6, padding: '1px 6px' }}
            >
              <AlertTriangle size={11} /> {t('leaderboard.suspicious')}
            </span>
          )}
        </div>
        <div className="lb-meta">
          {entry.unranked && <span className="lb-cta">{t('leaderboard.unranked')}</span>}
          <span title={t('leaderboard.leagueTitle', { name: getLeague(entry.totalScore).name })}>{getLeague(entry.totalScore).icon}</span>
          {!entry.unranked && <span>{t('test.questionsCount', { count: entry.answered })}</span>}
          {entry.streak > 0 && <span>{t('leaderboard.streakDays', { count: entry.streak })}</span>}
          {entry.unvonTier >= 2 && (
            <span className="lb-unvon">{t(`tracks.tier${entry.unvonTier}`)}</span>
          )}
        </div>
      </div>
      <div className="lb-score-wrap">
        <div className={`lb-score${entry.isMe ? ' me' : ''}`}>
          {entry.score.toLocaleString()}
        </div>
        <div className="lb-score-lbl">{t('leaderboard.points')}</div>
      </div>
      {isAdmin && onDelete && (
        <button
          className="lb-del-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id, entry.name); }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
});

const LeaderboardPage = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { state, cloudSynced } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const [leaders, setLeaders] = useState([]);
  const [myEntry, setMyEntry] = useState(null); // top-50 tashqarisidagi "Siz" qatori
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });

  // New states for safe/local improvements
  const [boardType, setBoardType] = useState('all'); // 'all' | 'weekly' | 'monthly'
  const [sessionRankChange, setSessionRankChange] = useState(0);
  // Ro'yxat qachonlik holatini ko'rsatadi: snapshot sanasi (ISO) yoki
  // `null` = jonli so'rovdan olingan, ya'ni hozirgi holat.
  const [snapshotAt, setSnapshotAt] = useState(null);
  // Davr almashdi, lekin server surati hali OLDINGI davrniki (dushanba
  // ertalab / oyning 1-sanasi). Bu holatda jonli so'rovga TUSHMAYMIZ —
  // sabab `periodStale` izohida (AUDIT 2026-09-02, K-2).
  const [periodPending, setPeriodPending] = useState(false);

  // Reyting ko'rildi
  useEffect(() => {
    AnalyticsEvents.leaderboardView(boardType);
  }, [boardType]);

  // ── 1) Top-50 ro'yxatini yuklash (tezkor, kutishlarsiz) ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const weekId = getWeekId();
    const monthId = getMonthId();
    const scoreField =
      boardType === 'weekly' ? `weekly_${weekId}`
        : boardType === 'monthly' ? `monthly_${monthId}`
          : 'totalScore';
    const cacheKey = `zehin_lb_${scoreField}`;

    setPeriodPending(false);

    // Keshni tekshiramiz: agar F5 emas bo'lsa, keshdan darhol ko'rsatamiz
    const bypass = shouldBypassCacheOnReload();
    const cachedEntry = bypass ? null : readLbCache(cacheKey);

    if (cachedEntry) {
      const rows = cachedEntry.rows.map((r, i) => ({
        ...r,
        rank: r.rank || (i + 1),
        isMe: r.id === user.uid
      }));
      setLeaders(rows);
      setSnapshotAt(cachedEntry.at);
      setLoading(false);
    } else {
      setLoading(true);
      setSnapshotAt(null);
    }

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
        unvonTier: d.achievements?.unvonTier || 0
      };
    };

    const load = async () => {
      let results = cachedEntry?.rows || null;
      let periodStale = false;

      if (!results) {
        try {
          const snapDoc = await withWriteTimeout(
            getDoc(doc(db, 'settings', 'leaderboard')),
            LB_NET_TIMEOUT_MS
          );
          if (cancelled) return;
          const snapData = snapDoc.exists() ? snapDoc.data() : null;

          // ⚠️ KESHNI ISITISH: 1 ta o'qishda olingan hujjat ichida 3 ta taxta bor.
          // Ularni keshga yozib qo'yamiz — haftalik yoki oylikka o'tilganda 0ms da ochiladi.
          if (snapData) {
            ['all', 'weekly', 'monthly'].forEach(bt => {
              const dec = decideLeaderboardSource({
                data: snapData,
                boardType: bt,
                weekId,
                monthId,
                now: Date.now(),
                maxAgeMs: SNAPSHOT_MAX_AGE,
              });
              if (dec.source === 'snapshot' && Array.isArray(dec.rows)) {
                const k = `zehin_lb_${bt === 'weekly' ? `weekly_${weekId}` : bt === 'monthly' ? `monthly_${monthId}` : 'totalScore'}`;
                writeLbCache(k, dec.rows, dec.updatedAt);
              }
            });
          }

          const decision = decideLeaderboardSource({
            data: snapData,
            boardType,
            weekId,
            monthId,
            now: Date.now(),
            maxAgeMs: SNAPSHOT_MAX_AGE,
          });

          if (decision.source === 'snapshot') {
            results = decision.rows.map(r => ({ ...r }));
            setSnapshotAt(decision.updatedAt);
            writeLbCache(cacheKey, results, decision.updatedAt);
          } else if (decision.source === 'periodPending') {
            periodStale = true;
          }
        } catch {
          // Snapshot ixtiyoriy — yiqilsa jonli so'rovga tushamiz
        }
      }

      if (periodStale) {
        results = [];
        setPeriodPending(true);
      }

      if (!results) {
        try {
          const snap = await withWriteTimeout(
            getDocs(query(collection(db, 'userStats'), orderBy(scoreField, 'desc'), limit(50))),
            LB_NET_TIMEOUT_MS
          );
          if (cancelled) return;
          results = snap.docs.map(toRow);
          setSnapshotAt(null);
          writeLbCache(cacheKey, results, null);
        } catch (liveErr) {
          if (cancelled) return;
          const stale = readLbCache(cacheKey, true);
          if (stale) {
            results = stale.rows;
            setSnapshotAt(stale.at);
          } else {
            console.error('Leaderboard load error:', liveErr);
            results = [];
          }
        }
      }

      if (cancelled) return;

      const rowsToDisplay = results.map((r, i) => ({
        ...r,
        rank: r.rank || (i + 1),
        isMe: r.id === user.uid
      }));

      setLeaders(rowsToDisplay);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, boardType]);

  // ── 2) "Siz" qatorini hisoblash (asosiy ro'yxatni kutmasdan, fon rejimida) ──
  useEffect(() => {
    if (!user) {
      setMyEntry(null);
      return;
    }

    const meInLeaders = leaders.find(r => r.id === user.uid);
    if (meInLeaders) {
      setMyEntry(null);
      return;
    }

    if (loading || periodPending) return;

    let cancelled = false;
    const weekId = getWeekId();
    const monthId = getMonthId();
    const scoreField =
      boardType === 'weekly' ? `weekly_${weekId}`
        : boardType === 'monthly' ? `monthly_${monthId}`
          : 'totalScore';

    const myScore = state[scoreField] || 0;
    const base = {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || t('leaderboard.you'),
      score: myScore,
      totalScore: state.totalScore || 0,
      correct: state.totalCorrect || 0,
      streak: state.dailyStreak || 0,
      answered: state.totalAnswered || 0,
      photoURL: user.photoURL || null,
      avatarId: user.avatarId || null,
      unvonTier: state.achievements?.unvonTier || 0,
      isMe: true
    };

    if (myScore <= 0) {
      if (!cloudSynced) {
        // Hali bulut statistikasi yuklanmagan bo'lsa, noto'g'ri 0 ko'rsatmaymiz
        setMyEntry(null);
      } else {
        setMyEntry({ ...base, rank: null, unranked: true });
      }
      return;
    }

    // myScore > 0: oldin hisoblangan bo'lsa keshdan olamiz
    const rankCacheKey = `${user.uid}_${scoreField}_${myScore}`;
    const cachedRank = userRankCache.get(rankCacheKey);
    if (cachedRank !== undefined) {
      setMyEntry({ ...base, rank: cachedRank });
      return;
    }

    setMyEntry(prev => (prev?.id === user.uid ? { ...base, rank: prev.rank } : { ...base, rank: null }));

    const calcRank = async () => {
      try {
        const [above, tiedAbove] = await Promise.allSettled([
          withWriteTimeout(
            getCountFromServer(query(
              collection(db, 'userStats'),
              where(scoreField, '>', myScore)
            )),
            5000
          ),
          withWriteTimeout(
            getCountFromServer(query(
              collection(db, 'userStats'),
              where(scoreField, '==', myScore),
              where(documentId(), '>', user.uid)
            )),
            5000
          )
        ]);

        if (cancelled) return;

        if (above.status === 'fulfilled') {
          const tie = tiedAbove.status === 'fulfilled' ? tiedAbove.value.data().count : 0;
          const finalRank = above.value.data().count + tie + 1;
          userRankCache.set(rankCacheKey, finalRank);
          setMyEntry({ ...base, rank: finalRank });
        } else {
          setMyEntry({ ...base, rank: null });
        }
      } catch {
        if (!cancelled) setMyEntry({ ...base, rank: null });
      }
    };

    calcRank();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, leaders, loading, periodPending, boardType, state, cloudSynced, t]);

  // Session rank tracking for safe shifts
  useEffect(() => {
    if (loading) return;
    const me = leaders.find(r => r.id === user?.uid);
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
  }, [leaders, myEntry, loading, boardType, user?.uid]);

  const handleDeleteClick = useCallback((id, name) => {
    setDeleteConfirm({ show: true, id, name });
  }, []);

  const executeDelete = async () => {
    try {
      await deleteDoc(doc(db, 'userStats', deleteConfirm.id));
      try {
        memLbCache.clear();
        userRankCache.clear();
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`lb-page${myEntry ? ' has-pinned' : ''}`}>
      <div className="lb-header">
        <h1 className="lb-title">{t('leaderboard.title')}</h1>
        <p className="lb-subtitle">{t('leaderboard.subtitle')}</p>
      </div>

      {/* ── Ro'yxat qachonlik holat ekani ────────────────────────────────
          Reyting kuniga bir marta (cron 14:00, Toshkent) oldindan hisoblanadi: bu 50 ta
          o'qishni 1 taga tushiradi. Raqamning eskiligini YASHIRMAYMIZ —
          foydalanuvchi ball yig'ib taxta qimirlamasa, sababini bilishi kerak.
          Jonli so'rovdan kelgan bo'lsa (`snapshotAt === null`) hech narsa
          yozilmaydi: «hozirgi holat» — standart kutilma, izohga muhtoj emas. */}
      {!loading && snapshotAt && formatSnapshotTime(snapshotAt) && (
        <div className="lb-freshness">
          {t('leaderboard.updatedAt', { time: formatSnapshotTime(snapshotAt) })}
        </div>
      )}

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
        const myScore = myStat?.totalScore || state.totalScore || 0;
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
        ) : periodPending ? (
          // K-2: davr almashdi, surat hali eski. Bo'sh ro'yxat o'rniga SABAB.
          <div className="lb-empty">
            {boardType === 'weekly' ? t('leaderboard.newWeek') : t('leaderboard.newMonth')}
          </div>
        ) : leaders.length === 0 ? (
          <div className="lb-empty">{t('leaderboard.empty')}</div>
        ) : (
          <div className="lb-list">
            {/* Podium ko'rsatilganda top-3 ro'yxatda takrorlanmaydi — 4-o'rindan boshlaymiz */}
            {(top3.length >= 3 ? leaders.slice(3) : leaders).map((entry, idx) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.015, 0.2) }}>
                <LeaderRow
                  entry={entry}
                  isAdmin={isAdmin}
                  sessionRankChange={sessionRankChange}
                  t={t}
                  onDelete={handleDeleteClick}
                />
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
          <LeaderRow
            entry={myEntry}
            pinned
            isAdmin={isAdmin}
            sessionRankChange={sessionRankChange}
            t={t}
            onDelete={handleDeleteClick}
          />
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
