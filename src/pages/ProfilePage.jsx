/**
 * ProfilePage.jsx — Profil (shaxsiy dashboard)
 * Sarlavha (XP/level + sozlamalar tugmasi), trial banner, tezkor boshlash,
 * streak, statistika kartalari, premium holati va havolalar.
 * Sozlamalar/hisob/FAQ alohida sahifaga ko'chirilgan: /settings (SettingsPage.jsx)
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, ChevronRight, Crown, Shield, Play, GraduationCap, Brain, Zap, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { REFERRAL_DISCOUNT, MONTHLY_PRICE, DISCOUNT_AMOUNT } from '../services/referral';
import PremiumModal from '../components/PremiumModal';
import { useModalBackButton } from '../components/profile/useModalBackButton';
import { useAdmin } from '../hooks/useAdmin';
import './ProfilePage.css';

const DAY_NAMES = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function ProfilePage() {
  const { user } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [showPremium, setShowPremium] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [bonusBalance, setBonusBalance] = useState(0);

  // Urgency countdown (72h real-time)
  const [urgencyLeft, setUrgencyLeft] = useState(user?.urgencyMs || 0);

  // Android "orqaga" tugmasi premium modalni yopadi
  useModalBackButton(showPremium, () => setShowPremium(false));

  // Profil ma'lumotlarini yuklash (ism + imtihon sanasi sinxroni)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.displayName) setProfileName(d.displayName);
        setBonusBalance(d.referralBonus || 0);
        if (d.examDate) {
          localStorage.setItem('iqro_exam_date', d.examDate);
          // Header uchun ham sinxronlaymiz (CUSTOM_EXAM_DATE formatida)
          localStorage.setItem('CUSTOM_EXAM_DATE', new Date(d.examDate).toISOString());
        }
      }
    }).catch(e => console.error('Profile load error:', e));
  }, [user]);

  // Urgency countdown interval
  useEffect(() => {
    if (user?.trialStatus !== 'urgency' || urgencyLeft <= 0) return;
    const iv = setInterval(() => {
      setUrgencyLeft(prev => {
        if (prev <= 1000) { clearInterval(iv); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [user?.trialStatus, urgencyLeft]);

  if (!user) return null;

  // Computed values
  const displayName = profileName || user.displayName || 'Foydalanuvchi';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isPremium = user.isPremium || false;
  const trialStatus = user.trialStatus || 'expired';
  const trialDaysLeft = user.trialDaysLeft || 0;

  // Urgency formatting
  const fmtUrgency = () => {
    const ms = urgencyLeft;
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { d, h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
  };
  const urg = fmtUrgency();
  const totalAnswered = Object.values(state.stats || {}).reduce((acc, curr) => acc + (curr.totalAnswered || 0), 0);
  const totalCorrect = Object.values(state.stats || {}).reduce((acc, curr) => acc + (curr.totalCorrect || 0), 0);
  const acc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const earnedBadges = getEarnedBadges(state.stats);
  const totalXP = getTotalXP(state.stats);
  const levelInfo = getLevel(totalXP);
  const nextXP = levelInfo.level === 1 ? 75 : levelInfo.level === 2 ? 200 : levelInfo.level === 3 ? 500 : levelInfo.level === 4 ? 1000 : 9999;
  const xpPct = Math.min(100, Math.round((totalXP / nextXP) * 100));

  // Streak week
  const dailyStreak = state.dailyStreak || 0;
  const todayIdx = new Date().getDay(); // 0=Sun
  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

  // ── Tezkor Boshlash Variables ──
  const cat = state.activeCategory || 'boshlangich';
  const catStats = state.stats[cat] || { mistakes: [] };
  const filteredMistakesCount = catStats.mistakes ? catStats.mistakes.length : 0;
  const dueCards = (state.spacedCards || []).filter(c => c.nextReview <= Date.now()).length;

  const handleNav = (topicId, testMode) => {
    if (trialStatus === 'expired' && !isPremium) {
      setShowPremium(true);
      return;
    }
    updateState({ topicId, testMode });
    navigate('/test');
  };

  const getExamDurationMinutes = (category) => {
    switch (category) {
      case 'boshlangich':
      case 'info':
        return 120;
      case 'til':
        return 105;
      default:
        return 90;
    }
  };

  return (
    <motion.div className="pp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ═══ FOYDALANUVCHI SARLAVHASI ═══ */}
      <div className="pp-header" style={{ paddingBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 4px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '16px', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: '4px', letterSpacing: '-0.3px' }}>
                {displayName}
              </div>
              <div className="pp-badges-row" style={{ marginTop: 0 }}>
                <span className="pp-badge pp-badge-level" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>⚡ Lv.{levelInfo.level} {levelInfo.name}</span>
                {isPremium
                  ? <span className="pp-badge pp-badge-premium"><Crown size={10} /> Premium</span>
                  : <span className="pp-badge pp-badge-free" onClick={() => setShowPremium(true)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>Bepul</span>
                }
              </div>
            </div>
            {/* Sozlamalar tugmasi */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate('/settings')}
              title="Sozlamalar"
              style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Settings size={20} />
            </motion.button>
          </div>

          {/* XP Progress */}
          <div className="pp-xp-bar" style={{ marginTop: '16px', background: 'rgba(0,0,0,0.15)' }}>
            <div className="pp-xp-labels" style={{ color: 'rgba(255,255,255,0.9)' }}>
              <span>⚡ {totalXP} XP</span>
              <span>{totalXP}/{nextXP} XP</span>
            </div>
            <div className="pp-xp-track" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="pp-xp-fill" style={{ width: `${xpPct}%`, background: '#fff' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="pp-content">
        {/* ═══ FREE TRIAL BANNER ═══ */}
        {trialStatus === 'trial' && (
          <div className="pp-trial-banner">
            <div className="pp-trial-icon">🎁</div>
            <div className="pp-trial-text">
              <div className="pp-trial-title">Sinov muddati faol</div>
              <div className="pp-trial-desc">Barcha Premium funksiyalar {trialDaysLeft} kun bepul!</div>
            </div>
            <div className="pp-trial-days">
              <div className="pp-trial-days-num">{trialDaysLeft}</div>
              <div className="pp-trial-days-lbl">kun qoldi</div>
            </div>
          </div>
        )}

        {/* ═══ URGENCY COUNTDOWN (72h) ═══ */}
        {trialStatus === 'urgency' && urgencyLeft > 0 && (
          <div className="pp-urgency-banner" onClick={() => setShowPremium(true)}>
            <div className="pp-urgency-top">
              <span>⚠️ Sinov muddati tugadi!</span>
              {user.hasReferralDiscount && <span className="pp-urgency-badge">{REFERRAL_DISCOUNT}% CHEGIRMA</span>}
            </div>
            <div className="pp-urgency-timer">
              <div className="pp-urg-block"><span>{urg.d}</span><small>kun</small></div>
              <div className="pp-urg-sep">:</div>
              <div className="pp-urg-block"><span>{urg.h}</span><small>soat</small></div>
              <div className="pp-urg-sep">:</div>
              <div className="pp-urg-block"><span>{urg.m}</span><small>daq</small></div>
              <div className="pp-urg-sep">:</div>
              <div className="pp-urg-block"><span>{urg.s}</span><small>son</small></div>
            </div>
            <div className="pp-urgency-cta">
              {user.hasReferralDiscount
                ? `Hozir sotib oling: ${(MONTHLY_PRICE - DISCOUNT_AMOUNT).toLocaleString()} so'm (${MONTHLY_PRICE.toLocaleString()} o'rniga)`
                : `Chegirma muddati tugamoqda — obunani faollashtiring!`
              }
            </div>
          </div>
        )}

        {/* ═══ EXPIRED BANNER ═══ */}
        {trialStatus === 'expired' && !isPremium && (
          <div className="pp-expired-banner" onClick={() => setShowPremium(true)}>
            <div className="pp-expired-text">
              <span>🔒</span> Sinov muddati tugadi. <strong>Premium obunani faollashtiring</strong> →
            </div>
          </div>
        )}

        {/* ═══ TEZKOR BOSHLASH (QUICK START) 2x2 GRID ═══ */}
        <div style={{ marginBottom: '24px' }}>
          <div className="pp-card-label" style={{ marginBottom: '12px' }}>🚀 Tezkor Boshlash</div>
          <div className="pp-quick-grid">
            {/* Dars Testi */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => handleNav(-1, 'exam')} className="pp-quick-card blue">
              <div className="pp-quick-card-icon">
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <div className="pp-quick-card-title">Dars Testi</div>
                <div className="pp-quick-card-subtitle">Barcha mavzular</div>
              </div>
            </motion.div>

            {/* Imtihon */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => { if (trialStatus === 'expired' && !isPremium) { setShowPremium(true); return; } navigate('/exam'); }} className="pp-quick-card purple">
              <div className="pp-quick-card-icon">
                <GraduationCap size={22} />
              </div>
              <div>
                <div className="pp-quick-card-title">Imtihon</div>
                <div className="pp-quick-card-subtitle">50 savol · {getExamDurationMinutes(cat)} daqiqa</div>
              </div>
            </motion.div>

            {/* Takrorlash */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => navigate('/review')} className="pp-quick-card green">
              {dueCards > 0 && (
                <div className="pp-quick-badge">
                  {dueCards}
                </div>
              )}
              <div className="pp-quick-card-icon">
                <Brain size={22} />
              </div>
              <div>
                <div className="pp-quick-card-title">Takrorlash</div>
                <div className="pp-quick-card-subtitle">{dueCards > 0 ? `${dueCards} savol kutmoqda` : 'Hozircha yo\'q'}</div>
              </div>
            </motion.div>

            {/* Xatolar */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => handleNav(-1, 'mistakes')} className="pp-quick-card amber">
              <div className="pp-quick-card-icon">
                <Zap size={22} />
              </div>
              <div>
                <div className="pp-quick-card-title">Xatolar</div>
                <div className="pp-quick-card-subtitle">{filteredMistakesCount} ta xato</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ═══ STREAK WEEK ═══ */}
        <div className="pp-card">
          <div className="pp-card-label">🔥 Haftalik Streak · {dailyStreak} kun</div>
          <div className="pp-streak-row">
            {weekDays.map((dayIdx, i) => {
              const isActive = i < dailyStreak;
              const isToday = dayIdx === todayIdx;
              return (
                <div key={dayIdx} className={`pp-streak-day ${isActive ? 'active' : ''}`}
                  style={isToday && !isActive ? { borderColor: 'var(--blue)', background: 'var(--blue-bg)' } : {}}>
                  <div className="pp-streak-icon">{isActive ? '🔥' : isToday ? '📍' : '○'}</div>
                  <div className="pp-streak-lbl" style={isToday && !isActive ? { color: 'var(--blue)' } : {}}>
                    {DAY_NAMES[i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ STAT CARDS OR EMPTY CTA ═══ */}
        {totalAnswered === 0 ? (
          <div className="pp-card" style={{ textAlign: 'center', padding: '30px 20px', border: '1.5px dashed var(--blue)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: 18 }}>Sizda hali natijalar yo'q</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text3)', fontSize: 13 }}>Tizimda o'z o'rningizni topish va XP yig'ish uchun hoziroq birinchi testingizni ishlang!</p>
            <button
              onClick={() => navigate('/test')}
              style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              Boshlash uchun test yechish
            </button>
          </div>
        ) : (
          <div className="pp-stats-grid">
            <div className="pp-stat-card">
              <div className="pp-stat-icon">📝</div>
              <div className="pp-stat-val">{totalAnswered}</div>
              <div className="pp-stat-lbl">Savollar</div>
            </div>
            <div className="pp-stat-card">
              <div className="pp-stat-icon">🎯</div>
              <div className="pp-stat-val">{acc}%</div>
              <div className="pp-stat-lbl">Aniqlik</div>
            </div>
            <div className="pp-stat-card" onClick={() => navigate('/leaderboard')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(41, 182, 246, 0.12), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(41, 182, 246, 0.35)' }}>
              <div className="pp-stat-icon">🏆</div>
              <div className="pp-stat-val" style={{ color: 'var(--accent)' }}>{state.totalScore || 0}</div>
              <div className="pp-stat-lbl" style={{ color: 'var(--accent2)', fontWeight: 700 }}>Balllar</div>
            </div>
            <div
              className="pp-stat-card"
              onClick={() => navigate('/achievements')}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{
                height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative'
              }}>
                {earnedBadges.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {earnedBadges.slice(0, 3).map((b, idx) => (
                      <span key={idx} style={{
                        fontSize: 22,
                        marginLeft: idx > 0 ? -12 : 0,
                        zIndex: 3 - idx,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                      }}>{b.icon}</span>
                    ))}
                    {earnedBadges.length > 3 && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: '#fff', background: '#F59E0B',
                        borderRadius: '10px', padding: '1px 5px', marginLeft: -8, zIndex: 4,
                        border: '2px solid var(--glass-bg)'
                      }}>+{earnedBadges.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 26, filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.5))' }}>🏆</span>
                )}
              </div>
              <div className="pp-stat-val" style={{ color: '#D97706', textShadow: '0 2px 4px rgba(245,158,11,0.2)' }}>{earnedBadges.length}</div>
              <div className="pp-stat-lbl" style={{ color: '#B45309', fontWeight: 700 }}>Yutuqlar</div>

              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear', repeatDelay: 1 }}
                style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)',
                  transform: 'skewX(-20deg)'
                }}
              />
            </div>
          </div>
        )}

        {/* ═══ PREMIUM HOLATI + HAVOLALAR ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isPremium ? (
            /* Premium foydalanuvchi — obuna holati */
            <div style={{
              padding: '16px', borderRadius: '16px', marginBottom: 2,
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.06))',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>👑</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B', marginBottom: 2 }}>Premium Faol</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {user.premiumExpire
                    ? `Tugash: ${new Date(user.premiumExpire).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Muddatsiz'}
                </div>
              </div>
              <button
                onClick={() => setShowPremium(true)}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#F59E0B', fontSize: 12, fontWeight: 700, padding: '6px 12px',
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                Yangilash
              </button>
            </div>
          ) : (
            /* Premium yo'q — sotib olish tugmasi */
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', marginBottom: 2,
                background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.25)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 1 }}
                style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  transform: 'skewX(-20deg)'
                }}
              />
              <div style={{
                width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>👑</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 2 }}>Premium olish</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                  Telegram orqali • Oyiga 30,000 so'm
                </div>
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
            </motion.button>
          )}

          {/* Do'stlarni taklif qilish */}
          <button className="pp-menu-item" onClick={() => navigate('/referral')}>
            <div className="pp-menu-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <Users size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label">Do'stlarni taklif qilish 🎁</span>
              <span style={{ fontSize: 11, color: bonusBalance > 0 ? 'var(--green)' : 'var(--text3)', fontWeight: bonusBalance > 0 ? 700 : 400 }}>
                {bonusBalance > 0
                  ? `Hisobingizda ${bonusBalance.toLocaleString()} so'm bonus — to'lovda avtomatik ayiriladi`
                  : `Do'stingizga ${REFERRAL_DISCOUNT}% chegirma — o'zingizga ${DISCOUNT_AMOUNT.toLocaleString()} so'm`}
              </span>
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Sozlamalar */}
          <button className="pp-menu-item" onClick={() => navigate('/settings')}>
            <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
              <Settings size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label">Sozlamalar</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Rejim, shrift, parol, eslatma, hisob</span>
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {isAdmin && (
            <button className="pp-menu-item" onClick={() => navigate('/admin')}>
              <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#fff' }}>
                <Shield size={20} />
              </div>
              <span className="pp-menu-label">Admin Panel</span>
              <ChevronRight size={18} className="pp-menu-arrow" />
            </button>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      {showPremium && <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />}
    </motion.div>
  );
}
