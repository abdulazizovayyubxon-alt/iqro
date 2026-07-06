import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { TRACKS, reconcileAchievements } from '../data/tracks';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, TrendingUp, AlertCircle, Award, Flame, AlertTriangle } from 'lucide-react';
import RadialChart from '../components/shared/RadialChart';
import AmiCard from '../components/achievements/AmiCard';
import TrackCard from '../components/achievements/TrackCard';
import PremiumModal from '../components/PremiumModal';
import RoiBlock from '../components/RoiBlock';
import { DEFAULT_YEARLY_PRICE } from '../config';

// Canvas yordamchilari — pasportni chizish uchun
const hexToRgba = (hex, a) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const AchievementsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('achievements');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [topicTotals, setTopicTotals] = useState({});
  const canvasRef = useRef(null);
  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;

  const handleNavigation = (topicId, mode) => {
    if (isFreeLimitReached) {
      setShowPremiumModal(true);
      return;
    }
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, streak: 0, maxStreak: 0, mistakes: [] };

  // Calculate average time stats
  const totalTime = state.timeStats?.totalTime || 0;
  const totalQuestionsTime = state.timeStats?.totalQuestions || 0;
  const avgTime = totalQuestionsTime > 0 ? Math.round(totalTime / totalQuestionsTime) : 0;

  let speedLabel = t('achievements.speedNoData');
  let speedColor = "var(--text3)";
  if (avgTime > 0) {
    if (avgTime < 45) {
      speedLabel = t('achievements.speedFast');
      speedColor = "#10B981"; // Green
    } else if (avgTime <= 90) {
      speedLabel = t('achievements.speedMedium');
      speedColor = "#F59E0B"; // Amber
    } else {
      speedLabel = t('achievements.speedSlow');
      speedColor = "#EF4444"; // Red
    }
  }

  const total = catStats.totalAnswered;
  const correct = catStats.totalCorrect;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Predict Category (Toifa)
  let toifa = t('achievements.toifaSpecialist');
  let toifaColor = "#3b82f6"; // Blue
  let nextToifaText = "";
  if (total >= 10) {
    if (acc >= 80) {
      toifa = t('achievements.toifaHigh');
      toifaColor = "#F59E0B"; // Gold
      nextToifaText = t('achievements.toifaHighNext');
    } else if (acc >= 70) {
      toifa = t('achievements.toifa1');
      toifaColor = "#10B981"; // Green
      nextToifaText = t('achievements.toifaNeedHigh', { pct: 80 - acc });
    } else if (acc >= 60) {
      toifa = t('achievements.toifa2');
      toifaColor = "#8B5CF6"; // Purple
      nextToifaText = t('achievements.toifaNeed1', { pct: 70 - acc });
    } else {
      toifa = t('achievements.toifaSpecialist');
      toifaColor = "#EF4444"; // Red
      nextToifaText = t('achievements.toifaNeed2', { pct: 60 - acc });
    }
  } else {
    toifa = t('achievements.toifaCalculating');
    nextToifaText = t('achievements.toifaNeedMin');
  }

  const subjectName = SUBJECTS.find(s => s.id === state.activeCategory)?.name || 'CHQBT';
  const hasEnoughData = total >= 10;

  // Premium sertifikat (cream/iliq palitra — loyiha dizayniga mos)
  const drawPassport = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 900, H = 560;
    const dpr = Math.max(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const gold = '#C9A227';
    const goldLight = '#E9CB6B';
    const ink = '#2A2118';
    const muted = '#9A8B6E';
    const accent = '#1180B8'; // quyuqroq — krem passport fonida o'qilishi yaxshiroq (a11y)

    // Fon — iliq krem gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FCF8EE');
    bg.addColorStop(1, '#F1EAD8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Yumshoq yorug'lik (tepa-markaz)
    const glow = ctx.createRadialGradient(W / 2, 60, 20, W / 2, 60, 540);
    glow.addColorStop(0, hexToRgba(accent, 0.07));
    glow.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Tashqi ramka (oltin)
    ctx.lineWidth = 2;
    ctx.strokeStyle = gold;
    roundRect(ctx, 22, 22, W - 44, H - 44, 20);
    ctx.stroke();
    // Ichki nozik ramka (accent)
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexToRgba(accent, 0.45);
    roundRect(ctx, 31, 31, W - 62, H - 62, 15);
    ctx.stroke();

    // Burchak romblari
    const corner = (cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = gold;
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    };
    corner(31, 31); corner(W - 31, 31); corner(31, H - 31); corner(W - 31, H - 31);

    // Suv belgisi
    ctx.save();
    ctx.font = '900 92px sans-serif';
    ctx.fillStyle = hexToRgba(ink, 0.028);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Toifa Pro', W / 2, H / 2 + 24);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Kicker
    ctx.font = '700 13px sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(t('achievements.passportKicker'), W / 2, 68);

    // Sarlavha
    ctx.font = '800 40px sans-serif';
    ctx.fillStyle = ink;
    ctx.fillText(t('achievements.passportTitle'), W / 2, 110);

    // Subtitr
    ctx.font = '500 14px sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(t('achievements.passportSubtitle'), W / 2, 134);

    // Oltin ajratuvchi + markazda romb
    const dividerY = 156;
    ctx.strokeStyle = hexToRgba(gold, 0.6);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 140, dividerY); ctx.lineTo(W / 2 - 14, dividerY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 14, dividerY); ctx.lineTo(W / 2 + 140, dividerY); ctx.stroke();
    ctx.save(); ctx.translate(W / 2, dividerY); ctx.rotate(Math.PI / 4); ctx.fillStyle = gold; ctx.fillRect(-4, -4, 8, 8); ctx.restore();

    // Taqdim etiladi
    ctx.font = '500 13px sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(t('achievements.passportPresented'), W / 2, 192);

    const userName = user?.displayName || state.displayName || t('achievements.passportUserFallback');
    ctx.font = '800 30px sans-serif';
    ctx.fillStyle = ink;
    ctx.fillText(userName, W / 2, 228);

    // Ism ostidagi accent chiziq
    const nameW = Math.min(ctx.measureText(userName).width, 400);
    ctx.strokeStyle = hexToRgba(accent, 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - nameW / 2 - 22, 240); ctx.lineTo(W / 2 + nameW / 2 + 22, 240); ctx.stroke();

    ctx.font = '600 15px sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(t('achievements.passportDirection', { subject: subjectName }), W / 2, 266);

    // Markaziy medal (toifa) yoki "tayyorlanmoqda" holati
    const medY = 352;
    if (hasEnoughData) {
      const r = 56;
      const ring = ctx.createLinearGradient(W / 2 - r, medY - r, W / 2 + r, medY + r);
      ring.addColorStop(0, goldLight);
      ring.addColorStop(1, gold);
      ctx.beginPath(); ctx.arc(W / 2, medY, r, 0, Math.PI * 2);
      ctx.fillStyle = ring; ctx.fill();
      ctx.beginPath(); ctx.arc(W / 2, medY, r - 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FCF8EE'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = hexToRgba(toifaColor, 0.55); ctx.stroke();

      ctx.fillStyle = toifaColor;
      const parts = toifa.split(' ');
      if (parts.length > 1) {
        ctx.font = '800 18px sans-serif';
        ctx.fillText(parts[0], W / 2, medY - 3);
        ctx.fillText(parts.slice(1).join(' '), W / 2, medY + 20);
      } else {
        ctx.font = '800 20px sans-serif';
        ctx.fillText(toifa, W / 2, medY + 7);
      }
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(t('achievements.passportToifaLabel'), W / 2, medY + r + 24);
    } else {
      ctx.font = '800 22px sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(t('achievements.passportPrepTitle'), W / 2, medY);
      ctx.font = '500 14px sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(t('achievements.passportPrepHint', { total }), W / 2, medY + 28);
    }

    // Statistika lentasi
    const bandY = 466;
    const cells = [
      { v: `${acc}%`, l: t('achievements.passportCellAccuracy'), c: acc >= 70 ? '#4E8A4B' : acc >= 50 ? gold : '#C64B3C' },
      { v: `${total}`, l: t('achievements.passportCellSolved'), c: ink },
      { v: avgTime > 0 ? `${avgTime}s` : '—', l: t('achievements.passportCellAvgTime'), c: accent },
    ];
    const colW = (W - 120) / 3;
    cells.forEach((s, i) => {
      const cx = 60 + colW * i + colW / 2;
      ctx.font = '800 26px sans-serif';
      ctx.fillStyle = hasEnoughData ? s.c : muted;
      ctx.fillText(hasEnoughData ? s.v : '—', cx, bandY);
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(s.l, cx, bandY + 22);
      if (i < cells.length - 1) {
        const sx = 60 + colW * (i + 1);
        ctx.strokeStyle = hexToRgba(ink, 0.1);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, bandY - 22); ctx.lineTo(sx, bandY + 18); ctx.stroke();
      }
    });

    // Footer
    let dateStr;
    try {
      dateStr = new Date().toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { dateStr = new Date().toLocaleDateString(); }
    ctx.font = '500 12px sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    ctx.fillText(dateStr, 48, H - 36);
    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    ctx.fillText('toifapro-t41p.vercel.app', W - 48, H - 36);
    ctx.textAlign = 'center';
  }, [t, i18n.language, user, state.displayName, subjectName, hasEnoughData, toifaColor, toifa, total, acc, avgTime]);

  useEffect(() => {
    if (showShareModal && canvasRef.current) {
      drawPassport(canvasRef.current);
    }
  }, [showShareModal, drawPassport]);

  // Mavzu bo'yicha umumiy savol sonini lokal keshdan yuklash (qamrov bari uchun) —
  // avval topicTotal=answered qilingani sababli qamrov doimo 100% ko'rinardi.
  useEffect(() => {
    (async () => {
      try {
        const localforage = (await import('localforage')).default;
        const rawList = await localforage.getItem(`bundle_v2_${cat}`);
        if (Array.isArray(rawList)) {
          const totals = {};
          rawList.forEach(q => { if (q.category === cat) totals[q.topicId] = (totals[q.topicId] || 0) + 1; });
          setTopicTotals(totals);
        }
      } catch { /* kesh yo'q — qamrov ko'rsatilmaydi */ }
    })();
  }, [cat]);

  const downloadPassport = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `toifapro_passport_${user?.displayName || 'user'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const shareToTelegram = () => {
    const text = t('achievements.shareTgText', { subject: subjectName, acc, avg: avgTime, speed: speedLabel, toifa });
    window.open(`https://t.me/share/url?url=https://toifapro-t41p.vercel.app&text=${encodeURIComponent(text)}`, '_blank');
  };


  // Akademik yutuqlar: saqlangan darajalar (monoton) + jonli progress (sof hisob).
  // reconcileAchievements bu yerda faqat O'QISH uchun — yozish AppContext'da bo'ladi.
  const achView = reconcileAchievements(state, state.achievements);
  const ami = achView.achievements.ami;
  const radarAxes = TRACKS.map(tr => {
    const lv = achView.live[tr.id] || { tier: 0, progress: 0 };
    return {
      label: t(`tracks.${tr.id}.name`),
      value: lv.tier >= 3 ? 1 : Math.min(1, (lv.tier + lv.progress) / 3)
    };
  });

  // Umumiy (barcha fanlar bo'yicha) statistika — Lv banner ostidagi qator uchun
  const globalAnswered = Object.values(state.stats || {}).reduce((sum, c) => sum + (c.totalAnswered || 0), 0);
  const globalCorrect = Object.values(state.stats || {}).reduce((sum, c) => sum + (c.totalCorrect || 0), 0);
  const globalAcc = globalAnswered > 0 ? Math.round((globalCorrect / globalAnswered) * 100) : 0;

  const filteredTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  const wrong = total - correct;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 32px' }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>{t('achievements.title')}</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>{t('achievements.subtitle')}</p>

      {/* Akademik mahorat indeksi + radar */}
      <AmiCard ami={ami} axes={radarAxes} />

      {/* Global stats summary */}
      <div style={{
        display: 'flex', padding: '14px 12px', marginBottom: 20,
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)', borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.01)',
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{globalAnswered}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{t('achievements.questions')}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{globalAcc}%</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{t('achievements.accuracy')}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/leaderboard')}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent2)', lineHeight: 1 }}>{state.totalScore || 0}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{t('achievements.points')}</div>
        </div>
      </div>

      {/* Reorganized Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, padding: 3, gap: 3, marginBottom: 20 }}>
        {[
          { id: 'achievements', label: t('achievements.tabAchievements', 'Yutuqlar') },
          { id: 'passport', label: t('achievements.tabPassport', 'Pasport') },
          { id: 'statistics', label: t('achievements.tabStats', 'Statistika') }
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none',
              background: activeTab === tab.id ? 'var(--bg2)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Daily Goal inside Achievements Tab */}
            {(() => {
              const today = new Date().toDateString();
              const dg = state.dailyGoal?.date === today ? state.dailyGoal : { date: today, answered: 0, target: 20, completed: false };
              const pct = Math.min(100, Math.round((dg.answered / dg.target) * 100));
              const ds = state.dailyStreak || 0;

              return (
                <div className="glass-panel" style={{
                  padding: '16px 20px', marginBottom: 20,
                  border: dg.completed ? '1.5px solid var(--green)' : '1px solid var(--glass-border)',
                  background: dg.completed ? 'rgba(16,185,129,0.03)' : 'var(--glass-bg)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {dg.completed ? <Award size={22} color="var(--green)" /> : <Target size={22} color="var(--accent)" />}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                          {dg.completed ? t('achievements.goalDoneTitle') : t('achievements.goalTitle')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                          {t('achievements.goalProgress', { answered: dg.answered, target: dg.target })}
                        </div>
                      </div>
                    </div>
                    {ds > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'var(--amber-bg)',
                        color: 'var(--amber)', padding: '4px 10px', borderRadius: 20,
                        fontWeight: 800, fontSize: 11,
                      }}>
                        <Flame size={12} /> {t('achievements.goalStreak', { count: ds })}
                      </div>
                    )}
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden', border: '0.5px solid var(--glass-border)' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 3,
                      background: dg.completed ? 'var(--green)' : 'var(--accent)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })()}

            {/* Yo'nalishlar bo'yicha akademik darajalar */}
            <div className="section-header" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
              <Trophy size={18} style={{ color: 'var(--accent2)' }} /> {t('tracks.sectionTitle')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {TRACKS.map((track) => {
                const lv = achView.live[track.id] || { tier: 0, progress: 0 };
                return (
                  <TrackCard key={track.id} track={track} tier={lv.tier} progress={lv.progress} />
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'passport' && (
          <motion.div
            key="passport"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* 📋 ATTESTATSIYA PASPORTI & PROGNOZ WIDGET */}
            <div className="glass-panel" style={{
              padding: 18,
              marginBottom: 16,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)',
            }}>
              {/* Sarlavha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(217,119,6,0.18)',
                }}>
                  <Award size={20} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.3px' }}>{t('achievements.widgetTitle')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{t('achievements.widgetSubtitle')}</div>
                </div>
              </div>

              {/* Toifa banneri yoki "tayyorlanmoqda" progressi */}
              {hasEnoughData ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 14, marginBottom: 12,
                  background: hexToRgba(toifaColor, 0.06),
                  border: `1.2px solid ${hexToRgba(toifaColor, 0.18)}`,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: hexToRgba(toifaColor, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Award size={22} color={toifaColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('achievements.toifaForecast')}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: toifaColor, lineHeight: 1.1 }}>{toifa}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{nextToifaText}</div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '12px 14px', borderRadius: 14, marginBottom: 12,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t('achievements.passportPrepTitle')}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)' }}>{total}/10</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${Math.min(100, total * 10)}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--accent), #8B5CF6)', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>{t('achievements.prepRemaining', { count: Math.max(0, 10 - total) })}</div>
                </div>
              )}

              {/* 3 ko'rsatkich */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { label: t('achievements.accuracy'), value: hasEnoughData ? `${acc}%` : '—', color: !hasEnoughData ? 'var(--text3)' : acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)' },
                  { label: t('achievements.metricSpeed'), value: avgTime > 0 ? `${avgTime}s` : '—', color: avgTime > 0 ? speedColor : 'var(--text3)' },
                  { label: t('achievements.questions'), value: total, color: 'var(--text)' },
                ].map((m) => (
                  <div key={m.label} style={{ background: 'var(--bg3)', padding: '10px 6px', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 10px rgba(43,163,220,0.15)',
                }}
              >
                {t('achievements.viewSharePassport')}
              </button>

              {/* Toifa ROI */}
              {hasEnoughData && (toifa === 'Oliy Toifa' || toifa === '1-Toifa' || toifa === '2-Toifa') && (
                <div style={{ marginTop: 10 }}>
                  <RoiBlock
                    price={DEFAULT_YEARLY_PRICE}
                    planName={t('achievements.yearly')}
                    targetToifa={toifa === 'Oliy Toifa' ? 'oliy' : toifa === '1-Toifa' ? '1-toifa' : '2-toifa'}
                    variant="theme"
                  />
                </div>
              )}
            </div>

            {/* Weekly Status Banner */}
            {catStats.totalAnswered > 10 && (
              <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, border: '1.2px solid rgba(59,130,246,0.12)', background: 'rgba(59,130,246,0.01)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={18} color="var(--blue)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    {acc >= 70 ? t('achievements.weekExcellent') : acc >= 50 ? t('achievements.weekGood') : t('achievements.weekKeep')}
                    {t('achievements.weekAccuracy', { acc })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {t('achievements.weekSummary', { answered: catStats.totalAnswered, correct: catStats.totalCorrect })}
                    {catStats.maxStreak > 3 && t('achievements.weekStreak', { count: catStats.maxStreak })}
                  </div>
                </div>
                {acc >= 70 && <div style={{ fontSize: 24 }}>🎯</div>}
                {acc >= 50 && acc < 70 && <div style={{ fontSize: 24 }}>📈</div>}
                {acc < 50 && <div style={{ fontSize: 24 }}>💪</div>}
              </div>
            )}

            {/* ⚠️ Zaif Nuqtalar Paneli */}
            {(() => {
              const weakTopics = TOPICS
                .filter(t => {
                  const match = Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat;
                  const ts = state.topicStats[t.id];
                  return match && ts && ts.answered > 0;
                })
                .map(t => {
                  const ts = state.topicStats[t.id];
                  const wrong = ts.answered - ts.correct;
                  const topicAcc = Math.round((ts.correct / ts.answered) * 100);
                  return { ...t, wrong, acc: topicAcc, answered: ts.answered, correct: ts.correct };
                })
                .filter(t => t.wrong > 0)
                .sort((a, b) => b.wrong - a.wrong || a.acc - b.acc)
                .slice(0, 5);

              if (weakTopics.length === 0) return null;

              return (
                <div style={{ marginBottom: 16 }}>
                  <div className="section-header" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800', marginBottom: 10 }}><AlertTriangle size={18} /> {t('achievements.weakTitle')}</div>
                  <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.1)', background: 'rgba(239,68,68,0.01)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                      {t('achievements.weakHint')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {weakTopics.map((tp) => (
                        <div
                          key={tp.id}
                          onClick={() => handleNavigation(tp.id, 'exam')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                            background: 'var(--bg2)', borderRadius: 12, cursor: 'pointer',
                            border: '0.5px solid var(--border)', transition: 'all 0.2s'
                          }}
                          className="hoverable"
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: tp.acc < 40 ? 'var(--red-bg)' : tp.acc < 70 ? 'var(--amber-bg)' : 'var(--green-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                          }}>
                            {tp.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tp.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg3)', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${tp.acc}%`, height: '100%', borderRadius: 2,
                                  background: tp.acc < 40 ? 'var(--red)' : tp.acc < 70 ? 'var(--amber)' : 'var(--green)',
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: tp.acc < 40 ? 'var(--red)' : tp.acc < 70 ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }}>
                                {tp.acc}%
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingLeft: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>{tp.wrong}</div>
                            <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{t('achievements.weakError')}</div>
                          </div>
                          <button
                            className="btn btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleNavigation(tp.id, 'exam'); }}
                            style={{
                              background: 'var(--red)', color: 'white', border: 'none',
                              fontSize: 10, padding: '5px 8px', borderRadius: 8, flexShrink: 0,
                              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                            }}
                          >
                            {t('achievements.weakPractice')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'statistics' && (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Radial charts */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--blue)' }} /> {t('achievements.overallMetrics')}
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}>
                <RadialChart pct={acc} size={120} stroke={10} color={acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)'} label={t('achievements.accuracy')} />
                <div style={{ display: 'flex', flexName: 'stats-list', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '150px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.correctLabel')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--green)' }}>{correct}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.wrongLabel')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--red)' }}>{wrong}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.totalLabel')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>{total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>{t('achievements.maxStreak')}</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--amber)' }}>{catStats.maxStreak}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bo'limlar bo'yicha grafik */}
            <div className="section-header" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
              <Target size={18} style={{ color: 'var(--blue)' }} /> {t('achievements.byTopic')}
            </div>
            <div className="glass-panel" style={{ padding: '18px', marginBottom: '20px' }}>
              {filteredTopics.map((t, idx) => {
                const s = state.topicStats[t.id];
                const topicTotal = topicTotals[t.id] || 0;
                const answered = s?.answered || 0;
                const topicCorrect = s?.correct || 0;
                const pct = answered > 0 ? Math.round((topicCorrect / answered) * 100) : 0;
                const coveragePct = topicTotal > 0 ? Math.min(100, Math.round((answered / topicTotal) * 100)) : 0;
                const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : pct > 0 ? 'var(--red)' : 'var(--accent)';

                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="stats-topic-row"
                  >
                    <div style={{ minWidth: '110px', maxWidth: '170px', fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {t.icon} {t.name}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.04 }}
                            style={{ height: '100%', borderRadius: '3px', background: barColor }}
                          />
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', minWidth: '35px', textAlign: 'right', color: barColor }}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '3px', background: 'var(--bg3)', borderRadius: '1.5px', overflow: 'hidden' }}>
                          <div style={{ width: `${coveragePct}%`, height: '100%', borderRadius: '1.5px', background: 'var(--blue)', opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', minWidth: '50px', textAlign: 'right' }}>
                          {answered}/{topicTotal}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Oxirgi Xatolar */}
            <div className="section-header" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
              <AlertCircle size={18} style={{ color: 'var(--red)' }} /> {t('achievements.recentMistakes')}
            </div>
            <div style={{ marginBottom: '20px' }}>
              {catStats.mistakes.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '12px 0' }}>{t('achievements.noMistakes')}</div>
              ) : (
                [...catStats.mistakes].reverse().slice(0, 5).map((m, i) => (
                  <div key={i} className="glass-panel" style={{ borderLeft: '3px solid var(--red)', padding: '10px 14px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--red)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '3px' }}>{m.topic}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.4' }}>{m.question}</div>
                    <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '5px' }}>{t('achievements.mistakeCorrect', { correct: m.correct })}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: 'var(--bg2)',
                border: '1.5px solid var(--border)',
                borderRadius: '24px',
                padding: '24px',
                width: '100%',
                maxWidth: '640px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
                textAlign: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: 800 }}>{t('achievements.widgetTitle')}</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text3)',
                    fontSize: '20px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Canvas rendered but scaled down responsively */}
              <div style={{
                width: '100%',
                overflow: 'hidden',
                borderRadius: '16px',
                border: '1.5px solid var(--border)',
                background: '#FCF8EE',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                marginBottom: 20
              }}>
                <canvas 
                  ref={canvasRef} 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    display: 'block' 
                  }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button 
                  onClick={downloadPassport}
                  style={{
                    padding: '14px',
                    background: '#0E97E0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {t('achievements.downloadPng')}
                </button>
                <button 
                  onClick={shareToTelegram}
                  style={{
                    padding: '14px',
                    background: '#24A1DE',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {t('achievements.shareTelegram')}
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
                {t('achievements.shareModalHint')}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

};

export default AchievementsPage;
