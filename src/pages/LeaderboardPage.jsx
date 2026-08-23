import React, { useState, useEffect, useContext } from 'react';
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
// foydalanuvchilar ko'paygan sari xarajat kvadratik o'sardi (400 kishi test
// yechayotganda top-50 doim o'zgaradi). Reytingda 50 o'qish — butun ilovadagi
// eng qimmat amal, qolgan hamma narsa birgalikda ~8 ta.
//
// Endi: bir martalik `getDocs` + 5 daqiqalik kesh. Reyting jonli bo'lishi
// shart emas. Foydalanuvchi sahifani qayta yuklasa (yoki pull-to-refresh
// qilsa) kesh chetlab o'tiladi — "yangilanmayapti" hissi qolmaydi.
const LB_CACHE_TTL = 5 * 60 * 1000;

// ── Server snapshot'i (o'qish byudjeti, 2-bosqich) ─────────────────────────
// `api/cron-daily.js` reytingni oldindan hisoblab `settings/leaderboard` ga
// yozadi. Undan o'qish — 1 O'QISH, jonli so'rov esa 50 ta.
//   400 foydalanuvchi:     20 000 → ~400 o'qish/kun
//  50 000 foydalanuvchi: 2 500 000 →  50 000 o'qish/kun
//
// ⚠️ 2026-08-22 — BU YERDA OPTIMIZATSIYA O'LIK EDI. Chegara 30 DAQIQA edi,
// cron esa kuniga BIR MARTA ishlaydi (`vercel.json`: `0 6 * * *`). Ya'ni
// snapshot kunning 23.5 soatida «eskirgan» deb tashlab yuborilardi va HAR
// KIM baribir 50 ta hujjatni jonli o'qirdi. Kod yozilgan, foyda esa yo'q edi.
//
// ENDI 26 SOAT: cron oralig'idan (24 s) kattaroq, ya'ni snapshot kun bo'yi
// ishlatiladi; ustidagi 2 soat esa cron kechikkan yoki bir marta o'tkazib
// yuborilgan holat uchun zaxira. Undan ham eski bo'lsa — cron buzilgan
// demakdir va sahifa avvalgidek jonli so'rovga tushadi (xavfsizlik to'ri).
//
// «Reyting qotib qolgandek ko'rinadi» degan e'tiroz YOLG'ON KO'RSATISH bilan
// emas, ROSTINI AYTISH bilan yechildi: taxta tepasida «Yangilangan: 13:00»
// yozuvi turadi. Foydalanuvchining O'Z o'rni esa (agar u top-50 dan tashqarida
// bo'lsa) hamon JONLI hisoblanadi — pastdagi `getCountFromServer` juftligi.
//
// Vercel Hobby'da cronni tez-tez ishlatib bo'lmaydi (kuniga 1 marta, 2 ta
// vazifa) — shuning uchun chastotani oshirish yo'li ataylab tanlanmadi.
const SNAPSHOT_MAX_AGE = 26 * 60 * 60 * 1000;

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

/** Sahifa qayta yuklanganmi (F5 / pull-to-refresh)? Unda kesh chetlab o'tiladi. */
const isReload = () => {
  try {
    return performance.getEntriesByType('navigation')[0]?.type === 'reload';
  } catch { return false; }
};

// Kesh `at` ni ham saqlaydi — ro'yxat qachonlik holat ekani. `null` = jonli
// so'rovdan olingan. Busiz keshdan kelgan ro'yxatda «Yangilangan: …» yozuvi
// yo'qolib, taxta jonli ko'rinardi.
const readLbCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.rows || Date.now() - cached.ts > LB_CACHE_TTL) return null;
    return { rows: cached.rows, at: cached.at || null };
  } catch { return null; }
};

const writeLbCache = (key, rows, at) => {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), rows, at: at || null })); }
  catch { /* kvota to'lgan — kesh ixtiyoriy, jim o'tkazamiz */ }
};

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

  // Reyting ko'rildi. ALOHIDA effekt — quyidagi yuklash effekti `cloudSynced`
  // ni kutadi, qiziqish esa sahifa ochilgan zahoti qayd etilishi kerak.
  // Kesim (`scope`) muhim: haftalik taxta global taxtadan boshqacha xulqni
  // ko'rsatadi va viloyat kesimi joriy etilganda taqqoslash bazasi kerak.
  useEffect(() => {
    AnalyticsEvents.leaderboardView(boardType);
  }, [boardType]);

  useEffect(() => {
    if (!user) return;
    // `cloudSynced` — AppContext bulutdagi statistikani lokal zaxira bilan
    // birlashtirib bo'lgani belgisi. Undan OLDIN `state` hali defaultda (0 ball)
    // turadi; shu payt yuklasak, ballari bor foydalanuvchiga bir lahza
    // «hali reytingda emassiz» chiqib ketardi.
    if (!cloudSynced) return;
    let cancelled = false;
    setLoading(true);
    setSnapshotAt(null);

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
        // Akademik unvon — reyting ballidan MUSTAQIL ko'rsatkich: ball hajmni
        // mukofotlaydi, unvon esa sifatni. (AMI raqami bu yerdan olib
        // tashlandi — u Yutuqlar sahifasida, o'z kontekstida ko'rsatiladi.)
        unvonTier: d.achievements?.unvonTier || 0
      };
    };

    const load = async () => {
      try {
        // ── 1) Top-50: keshdan (0) → server snapshot'idan (1) → bazadan (50) ──
        const cachedEntry = isReload() ? null : readLbCache(cacheKey);
        let results = cachedEntry?.rows || null;
        if (cachedEntry) setSnapshotAt(cachedEntry.at);

        if (!results) {
          // Server snapshot'i — yangi bo'lsa 50 ta o'qishni 1 taga almashtiradi.
          try {
            const snapDoc = await getDoc(doc(db, 'settings', 'leaderboard'));
            if (cancelled) return;
            const data = snapDoc.exists() ? snapDoc.data() : null;
            const age = data?.updatedAt ? Date.now() - new Date(data.updatedAt).getTime() : Infinity;
            const rows = data?.boards?.[boardType];
            // Hafta/oy taxtasi uchun snapshot AYNAN shu davrniki bo'lishi shart:
            // o'tgan haftaning ro'yxatini «joriy hafta» deb ko'rsatish — yolg'on.
            const periodOk =
              boardType === 'all' ? true
                : boardType === 'weekly' ? data?.weekId === weekId
                  : data?.monthId === monthId;
            if (Array.isArray(rows) && age <= SNAPSHOT_MAX_AGE && periodOk) {
              results = rows;
              setSnapshotAt(data.updatedAt || null);
              writeLbCache(cacheKey, results, data.updatedAt || null);
            }
          } catch {
            // Snapshot ixtiyoriy — yiqilsa jonli so'rovga tushamiz.
          }
        }

        if (!results) {
          const snap = await getDocs(
            query(collection(db, 'userStats'), orderBy(scoreField, 'desc'), limit(50))
          );
          if (cancelled) return;
          results = snap.docs.map(toRow);
          setSnapshotAt(null);               // jonli so'rov = hozirgi holat
          writeLbCache(cacheKey, results, null);   // rank/isMe qo'shilishidan OLDIN — ular shaxsiy
        }

        // ── 2) "Siz" qatori ──
        const meIdx = results.findIndex(r => r.id === user.uid);
        if (meIdx !== -1) {
          results[meIdx].rank = meIdx + 1;
          results[meIdx].isMe = true;
          setMyEntry(null);
        } else {
          // Top-50 tashqarisida. O'z statistikam AppContext'da ALLAQACHON bor —
          // ilgari shu yerda qo'shimcha `getDoc(userStats/uid)` qilinardi, u
          // olib tashlandi (−1 o'qish). Bo'shagan joyga tenglikni yechadigan
          // ikkinchi sanoq qo'yildi (+1) — umumiy sarf o'zgarmadi.
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

          // Hali ball yig'magan foydalanuvchiga raqam ko'rsatish — yolg'on:
          // 0 ballilar bir-biridan farq qilmaydi, ular necha kishi bo'lsa ham
          // BIR XIL o'rinni ko'rardi (skrinshotdagi «51»). Raqam o'rniga
          // chaqiruv chiqadi. Yon foyda: bu yo'lda birorta o'qish yo'q (−2).
          if (myScore <= 0) {
            setMyEntry({ ...base, rank: null, unranked: true });
          } else {
            try {
              // O'rin = mendan yuqoridagilar soni + 1. «Yuqorida» ikki toifa:
              //   a) bali KATTA bo'lganlar;
              //   b) bali TENG, lekin Firestore tartibida oldinda turganlar.
              // (b) hisobga olinmasa teng ballilar bir xil raqam olardi. Firestore
              // `orderBy(score,'desc')` ga yashirin `__name__ desc` tartibini
              // qo'shadi va yuqoridagi ro'yxat 1-50 ni AYNAN shu tartibda
              // chizadi — demak tenglikni ham shu mezonda yechsak, ikkala
              // kod yo'li bir xil raqam beradi (ilgari ular zid edi).
              // Kompozit indeks KERAK EMAS: (maydon, __name__) — Firestore
              // har bir maydon uchun o'zi yasaydigan indeks.
              // `allSettled` — ataylab: ikkinchi sanoq (tenglik) qulasa ham
              // birinchisi bergan o'rinni ko'rsatamiz. U holda xatti-harakat
              // eski holatga tushadi (teng ballilar bir xil raqam oladi) —
              // bu o'rinni butunlay yashirgandan afzal.
              const [above, tiedAbove] = await Promise.allSettled([
                getCountFromServer(query(
                  collection(db, 'userStats'),
                  where(scoreField, '>', myScore)
                )),
                getCountFromServer(query(
                  collection(db, 'userStats'),
                  where(scoreField, '==', myScore),
                  where(documentId(), '>', user.uid)
                ))
              ]);
              if (cancelled) return;
              if (above.status === 'fulfilled') {
                const tie = tiedAbove.status === 'fulfilled' ? tiedAbove.value.data().count : 0;
                setMyEntry({ ...base, rank: above.value.data().count + tie + 1 });
              } else {
                // Ikkalasi ham bajarilmadi (oflayn) — raqamsiz beramiz.
                setMyEntry({ ...base, rank: null });
              }
            } catch {
              if (!cancelled) setMyEntry({ ...base, rank: null });
            }
          }
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
    // `state` ataylab bog'liqlikda EMAS: u har javobda o'zgaradi, unga bog'lansak
    // reyting test yechilayotganda qayta-qayta yuklanardi. Bu yerda kerak bo'lgani —
    // sahifa ochilgan paytdagi suratigina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, boardType, cloudSynced]);

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
    // Ball yig'ilmagan yoki sanoq bajarilmagan holat — raqam o'rniga chiziqcha
    if (!rank) return <span className="lb-rank-num muted">—</span>;
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
          {/* Hali ball yo'q — «0 savol» ni takrorlagandan ko'ra, nima qilish
              kerakligini aytamiz. Reytingga kirish yo'li shu qatorda turadi. */}
          {entry.unranked && <span className="lb-cta">{t('leaderboard.unranked')}</span>}
          <span title={t('leaderboard.leagueTitle', { name: getLeague(entry.totalScore).name })}>{getLeague(entry.totalScore).icon}</span>
          {!entry.unranked && <span>{t('test.questionsCount', { count: entry.answered })}</span>}
          {entry.streak > 0 && <span>{t('leaderboard.streakDays', { count: entry.streak })}</span>}
          {/* Unvon faqat 2-darajadan boshlab: «Izlanuvchi» hammada bor va u
              qatorni ma'nosiz to'ldirardi. */}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`lb-page${myEntry ? ' has-pinned' : ''}`}>
      <div className="lb-header">
        <h1 className="lb-title">{t('leaderboard.title')}</h1>
        <p className="lb-subtitle">{t('leaderboard.subtitle')}</p>
      </div>

      {/* ── Ro'yxat qachonlik holat ekani ────────────────────────────────
          Reyting kuniga bir marta (cron 06:00) oldindan hisoblanadi: bu 50 ta
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
