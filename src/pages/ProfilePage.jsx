/**
 * ProfilePage.jsx — Premium Profile sahifasi
 * Gradient header, XP, streak, countdown, badges, referral, edit
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sun, Edit3, LogOut, ChevronRight, Copy, Check, Crown, Shield, Download, FileText, Send, Play, GraduationCap, Brain, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { SUBJECTS } from '../data/mockData';
import { ToastContext } from '../context/ToastContext';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { signInWithCustomToken } from 'firebase/auth';
import { BADGES, getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import {
  getUserReferralCode, buildReferralLink, getReferralStats,
  MAX_REFERRALS, REFERRAL_DISCOUNT, MONTHLY_PRICE, DISCOUNT_AMOUNT
} from '../services/referral';
import PremiumModal from '../components/PremiumModal';
import { useAdmin } from '../hooks/useAdmin';
import './ProfilePage.css';

const DAY_NAMES = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function ProfilePage({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState('');

  const handleTelegramLogin = async () => {
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    window.open(`https://t.me/IQRO_testbot?start=login_${sessionId}`, '_blank');
    setTgLoading(true);
    setTgError('Telegram orqali tasdiqlash kutilmoqda... Botga kirib START bosing.');
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/telegram-auth?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.token) {
          clearInterval(interval);
          await signInWithCustomToken(auth, data.token);
          setTgLoading(false);
          setTgError('');
          showToast('Hisob muvaffaqiyatli tiklandi!', 'success');
        }
      } catch (e) {
        console.error(e);
      }
    }, 2500);
    
    setTimeout(() => {
      clearInterval(interval);
      if (tgLoading) {
        setTgLoading(false);
        setTgError('');
      }
    }, 120000);
  };
  const [editForm, setEditForm] = useState({ name: '', gender: '', birthDate: '', goal: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [refStats, setRefStats] = useState(null);
  const [copied, setCopied] = useState(false);

  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const handleDownloadOffline = async () => {
    if (downloadingOffline) return;
    setDownloadingOffline(true);
    setDownloadProgress('Yuklanmoqda...');
    
    try {
      const cat = state.activeCategory || 'chqbt';
      const versionDocRef = doc(db, 'settings', 'version');
      const versionSnap = await getDoc(versionDocRef);
      
      let remoteVersion = 0;
      let storageUrls = {};
      if (versionSnap.exists()) {
        const vData = versionSnap.data();
        remoteVersion = vData.dbVersion || 0;
        storageUrls = vData.urls || {};
      }

      const cacheKey = `bundle_${cat}`;
      const versionKey = `version_${cat}`;
      
      const downloadUrl = storageUrls[cat];
      if (downloadUrl) {
        const res = await fetch(downloadUrl);
        const rawList = await res.json();
        
        const localforage = (await import('localforage')).default;
        await localforage.setItem(cacheKey, rawList);
        await localforage.setItem(versionKey, remoteVersion);
        
        showToast(`Tayyor! ${rawList.length} ta savol offline rejim uchun keshlandi ✅`, 'success');
      } else {
        showToast("Hozircha serverda offline ma'lumotlar tayyor emas.", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("Offline yuklashda xatolik yuz berdi", 'error');
    } finally {
      setDownloadingOffline(false);
      setDownloadProgress('');
    }
  };

  // Urgency countdown (72h real-time)
  const [urgencyLeft, setUrgencyLeft] = useState(user?.urgencyMs || 0);

  // Exam date — Firestore dan sinxronlanadi, localStorage kesh sifatida
  const [examDate, setExamDate] = useState(() => {
    try { return localStorage.getItem('iqro_exam_date') || ''; } catch { return ''; }
  });

  // Load profile data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setEditForm({
            name: d.displayName || user.displayName || '',
            gender: d.gender || '',
            birthDate: d.birthDate || '',
            goal: d.goal || '',
            subject: d.subject || '',
          });
          if (d.examDate) {
            setExamDate(d.examDate);
            localStorage.setItem('iqro_exam_date', d.examDate);
            // Header uchun ham sinxronlaymiz (CUSTOM_EXAM_DATE formatida)
            localStorage.setItem('CUSTOM_EXAM_DATE', new Date(d.examDate).toISOString());
          }
        }
        const code = await getUserReferralCode(user.uid, user.displayName);
        setRefCode(code);
        const st = await getReferralStats(user.uid);
        setRefStats(st);
      } catch (e) { console.error('Profile load error:', e); }
    };
    load();
  }, [user]);

  // Modal history interception for back button
  useEffect(() => {
    const hasOpenModal = showEdit || showPremium || showLogoutConfirm || showPrivacy || showTelegramModal;
    if (!hasOpenModal) return;

    window.history.pushState({ profileModalOpen: true }, '');

    const handlePopState = () => {
      setShowEdit(false);
      setShowPremium(false);
      setShowLogoutConfirm(false);
      setShowPrivacy(false);
      setShowTelegramModal(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.profileModalOpen) {
        window.history.back();
      }
    };
  }, [showEdit, showPremium, showLogoutConfirm, showPrivacy, showTelegramModal]);

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
  const displayName = editForm.name || user.displayName || 'Foydalanuvchi';
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

  // Daily goal
  const today = new Date().toDateString();
  const dg = state.dailyGoal?.date === today ? state.dailyGoal : { answered: 0, target: 20 };
  const goalPct = Math.min(100, Math.round((dg.answered / dg.target) * 100));
  const goalDone = dg.answered >= dg.target;

  // Streak week
  const dailyStreak = state.dailyStreak || 0;
  const todayIdx = new Date().getDay(); // 0=Sun
  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

  // Countdown
  const getCountdown = () => {
    const ed = examDate || localStorage.getItem('iqro_exam_date');
    if (!ed) return null;
    const diff = new Date(ed) - new Date();
    if (diff <= 0) return { y: 0, m: 0, d: 0 };
    const d = Math.floor(diff / 86400000);
    return { y: Math.floor(d / 365), m: Math.floor((d % 365) / 30), d: d % 30 };
  };
  const countdown = getCountdown();

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

  // Save profile
  const handleSave = async () => {
    setSaving(true);
    try {
      const profileData = {
        displayName: editForm.name,
        gender: editForm.gender,
        birthDate: editForm.birthDate,
        goal: editForm.goal,
        subject: editForm.subject,
      };
      // Imtihon sanasini ham Firestore ga saqlaymiz (qurilmalar arasi sinxron)
      if (examDate) {
        profileData.examDate = examDate;
        localStorage.setItem('iqro_exam_date', examDate);
        localStorage.setItem('CUSTOM_EXAM_DATE', new Date(examDate).toISOString());
      }
      await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      showToast("Profil saqlandi ✅", 'success');
      setShowEdit(false);
    } catch (e) {
      showToast("Xatolik yuz berdi", 'error');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/'); } catch { showToast("Chiqishda xatolik", 'error'); }
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(buildReferralLink(refCode));
      setCopied(true); showToast("Havola nusxalandi! ✅", 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch { showToast("Nusxalab bo'lmadi", 'error'); }
  };

  return (
    <motion.div className="pp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ═══ REFERRAL (TAKLIF) BANNER TOP ═══ */}
      <div className="pp-header" style={{ paddingBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <div className="pp-badges-row" style={{ marginTop: 0 }}>
              <span className="pp-badge pp-badge-level" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>⚡ Lv.{levelInfo.level} {levelInfo.name}</span>
              {isPremium
                ? <span className="pp-badge pp-badge-premium"><Crown size={10} /> Premium</span>
                : <span className="pp-badge pp-badge-free" onClick={() => setShowPremium(true)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>Bepul</span>
              }
            </div>
          </div>

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
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            {/* Dars Testi */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => handleNav(-1, 'exam')}
              style={{
                background: 'linear-gradient(135deg, rgba(41, 182, 246, 0.1), rgba(41, 182, 246, 0.05))',
                border: '1px solid rgba(41, 182, 246, 0.2)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(41, 182, 246, 0.3)' }}>
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Dars Testi</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Barcha mavzular</div>
              </div>
            </motion.div>

            {/* Imtihon */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => { if (trialStatus === 'expired' && !isPremium) { setShowPremium(true); return; } navigate('/exam'); }}
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                <GraduationCap size={22} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Imtihon</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>50 savol · {getExamDurationMinutes(cat)} daqiqa</div>
              </div>
            </motion.div>

            {/* Takrorlash */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => navigate('/review')}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative'
              }}>
              {dueCards > 0 && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--red)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '8px' }}>
                  {dueCards}
                </div>
              )}
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                <Brain size={22} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Takrorlash</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>{dueCards > 0 ? `${dueCards} savol kutmoqda` : 'Hozircha yo\'q'}</div>
              </div>
            </motion.div>

            {/* Xatolar */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => handleNav(-1, 'mistakes')}
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
                <Zap size={22} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Xatolar</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>{filteredMistakesCount} ta xato</div>
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

        {/* ═══ DAILY GOAL ═══ */}
        <div className="pp-card" style={goalDone ? { borderColor: 'var(--green)', background: 'rgba(16,185,129,0.04)' } : {}}>
          <div className="pp-card-label">{goalDone ? '✅' : '🎯'} Bugungi maqsad</div>
          <div className="pp-goal-info">
            <span className="pp-goal-text">{goalDone ? 'Bajarildi!' : `${dg.answered}/${dg.target} savol`}</span>
            <span className="pp-goal-nums" style={{ color: goalDone ? 'var(--green)' : 'var(--text3)' }}>{goalPct}%</span>
          </div>
          <div className="pp-goal-track">
            <div className="pp-goal-fill" style={{
              width: `${goalPct}%`,
              background: goalDone ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)'
            }} />
          </div>
          <div className="pp-goal-sub">
            <span>{goalPct}% bajarildi</span>
            <span>{Math.max(0, dg.target - dg.answered)} ta qoldi</span>
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
            <div className="pp-stat-card">
              <div className="pp-stat-icon">🏆</div>
              <div className="pp-stat-val">{earnedBadges.length}</div>
              <div className="pp-stat-lbl">Yutuqlar</div>
            </div>
          </div>
        )}

        {/* (Subject section and Referral Card removed from here) */}


        {/* ═══ BADGES ROW ═══ */}
        <div className="pp-card">
          <div className="pp-card-label">🏅 Yutuqlar kolleksiyasi · {earnedBadges.length}/{BADGES.length}</div>
          <div className="pp-badges-scroll">
            {BADGES.map(badge => {
              const earned = earnedBadges.some(b => b.id === badge.id);
              return (
                <div key={badge.id} className="pp-badge-item">
                  <div className={`pp-badge-icon-wrap ${earned ? 'earned' : 'locked'}`}
                    style={earned ? { background: `${badge.color}15`, borderColor: `${badge.color}40` } : {}}>
                    {earned ? badge.icon : '🔒'}
                  </div>
                  <div className="pp-badge-name">{badge.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ MENU ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Admin Panel — faqat adminlar uchun */}
          {isAdmin && (
            <button className="pp-menu-item" onClick={() => navigate('/admin')}>
              <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#fff' }}>
                <Shield size={20} />
              </div>
              <span className="pp-menu-label">Admin Panel</span>
              <ChevronRight size={18} className="pp-menu-arrow" />
            </button>
          )}

          {/* Theme Toggle */}
          <button className="pp-menu-item" onClick={toggleTheme}>
            <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <span className="pp-menu-label">{theme === 'dark' ? 'Yorqin rejim' : 'Tungi rejim'}</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Edit Profile */}
          <button className="pp-menu-item" onClick={() => setShowEdit(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
              <Edit3 size={20} />
            </div>
            <span className="pp-menu-label">Profilni tahrirlash</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Account Recovery */}
          <button className="pp-menu-item" onClick={handleTelegramLogin} disabled={tgLoading}>
            <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              <Send size={20} className={tgLoading ? "spin" : ""} />
            </div>
            <span className="pp-menu-label">{tgLoading ? 'Kutilmoqda...' : 'Eski hisobni tiklash (Telegram)'}</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>
          {tgError && <div style={{ padding: '0 16px', fontSize: 12, color: 'var(--blue)', marginTop: '-5px', marginBottom: '5px' }}>{tgError}</div>}



          {/* Qo'llanma */}
          <button className="pp-menu-item" onClick={() => window.location.href = 'tg://resolve?domain=iqro_admin'}>
            <div className="pp-menu-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <div style={{ fontSize: 16 }}>📖</div>
            </div>
            <span className="pp-menu-label">Foydalanish qo'llanmasi</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Telegram Eslatmalar */}
          <button className="pp-menu-item" onClick={() => setShowTelegramModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'rgba(41, 182, 246, 0.1)', color: '#29B6F6' }}>
              <Send size={20} />
            </div>
            <span className="pp-menu-label">Telegram eslatmalar</span>
            <div style={{ marginRight: 8, fontSize: 11, fontWeight: 700, color: state.telegramEnabled ? 'var(--green)' : 'var(--text3)' }}>
              {state.telegramEnabled ? "Yoqilgan" : "O'chirilgan"}
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Maxfiylik Siyosati */}
          <button className="pp-menu-item" onClick={() => setShowPrivacy(true)}>
            <div className="pp-menu-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#EC4899' }}>
              <Shield size={20} />
            </div>
            <span className="pp-menu-label">Maxfiylik siyosati</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Logout */}
          <button className="pp-menu-item danger" onClick={() => setShowLogoutConfirm(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
              <LogOut size={20} />
            </div>
            <span className="pp-menu-label">Chiqish</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>
        </div>
      </div>

      {/* ═══ EDIT MODAL ═══ */}
      {showEdit && (
        <div className="pp-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-title">✏️ Profilni tahrirlash</div>
            <div className="pp-field">
              <label>Ism</label>
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="To'liq ism" />
            </div>
            <div className="pp-field">
              <label>Jins</label>
              <select value={editForm.gender} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Tanlang</option>
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </select>
            </div>
            <div className="pp-field">
              <label>Tug'ilgan sana</label>
              <input type="date" value={editForm.birthDate} onChange={e => setEditForm(p => ({ ...p, birthDate: e.target.value }))} />
            </div>
            <div className="pp-field">
              <label>Maqsad</label>
              <input value={editForm.goal} onChange={e => setEditForm(p => ({ ...p, goal: e.target.value }))} placeholder="Masalan: Sertifikatlashdan o'tish" />
            </div>
            <div className="pp-field">
              <label>Fan</label>
              <input value={editForm.subject} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} placeholder="Masalan: Matematika" />
            </div>
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>Qo'shimcha Sozlamalar</div>
              <button 
                onClick={handleDownloadOffline} 
                disabled={downloadingOffline}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', 
                  padding: '12px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', 
                  borderRadius: 12, cursor: downloadingOffline ? 'not-allowed' : 'pointer', color: 'var(--text)',
                  fontSize: 14, fontWeight: 500
                }}
              >
                <Download size={18} className={downloadingOffline ? "spin" : ""} style={{ color: 'var(--green)' }} />
                {downloadProgress || "Offline rejim uchun ma'lumotlarni yuklash"}
              </button>
            </div>
            
            <div className="pp-modal-actions" style={{ marginTop: '20px' }}>
              <button className="pp-btn-cancel" onClick={() => setShowEdit(false)}>Bekor</button>
              <button className="pp-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Modal */}
      {showPremium && <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />}

      {/* ═══ LOGOUT CONFIRMATION MODAL ═══ */}
      {showLogoutConfirm && (
        <div className="pp-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🧠</div>
            <div className="pp-modal-title" style={{ marginBottom: 10, fontSize: 18, fontWeight: 800 }}>Rostdan ham chiqmoqchimisiz?</div>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              Sertifikat olish sari boshlagan yo'lingizda to'xtab qolmang. Tizimda qolib, bilimingizni oshirishda davom eting!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                style={{ 
                  padding: '13px', borderRadius: 12, background: 'var(--blue)', color: '#fff', 
                  border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 0.2s'
                }}
              >
                Platformada qolish 🧠
              </button>
              <button 
                onClick={handleLogout} 
                style={{ 
                  padding: '12px', borderRadius: 12, background: 'transparent', color: 'var(--red)', 
                  border: '1.5px solid var(--red)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                Chiqish 🚪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRIVACY POLICY MODAL ═══ */}
      {showPrivacy && (
        <div className="pp-modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: '24px' }}>
            <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={22} style={{ color: 'var(--blue)' }} /> Maxfiylik Siyosati
            </div>
            <div style={{ 
              maxHeight: '320px', 
              overflowY: 'auto', 
              fontSize: '13px', 
              lineHeight: '1.6', 
              color: 'var(--text2)', 
              margin: '16px 0',
              paddingRight: '8px',
              borderBottom: '1px solid var(--border)'
            }} className="pp-policy-scroll">
              <p style={{ marginBottom: '12px' }}><strong>1. Umumiy qoidalar</strong><br/>
              Ushbu Maxfiylik Siyosati IQRO platformasi foydalanuvchilarining shaxsiy ma'lumotlarini yig'ish, saqlash va himoya qilish tartibini belgilaydi. Biz foydalanuvchilarimizning maxfiyligini hurmat qilamiz va ma'lumotlar xavfsizligini ta'minlashga mas'uliyat bilan yondashamiz.</p>
              
              <p style={{ marginBottom: '12px' }}><strong>2. Yig'iladigan ma'lumotlar</strong><br/>
              Platformadan ro'yxatdan o'tish va foydalanish davomida quyidagi shaxsiy ma'lumotlar to'planishi mumkin:
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>Ism va familiya;</li>
                <li>Telefon raqami;</li>
                <li>Tanlangan o'quv fanlari, maqsadlar va imtihon sanasi;</li>
                <li>Ilovadan foydalanish va test natijalari statistikasi.</li>
              </ul>
              
              <p style={{ marginBottom: '12px' }}><strong>3. Ma'lumotlardan foydalanish maqsadi</strong><br/>
              Siz taqdim etgan ma'lumotlar quyidagi maqsadlarda ishlatiladi:
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>O'quv jarayonini shaxsiylashtirish va fanga mos yuklash ekranlarini ko'rsatish;</li>
                <li>Premium obuna va to'lovlarni boshqarish;</li>
                <li>Do'stlarni taklif etish (referral) dasturini to'g'ri ishlashini ta'minlash va chegirmalarni hisoblash;</li>
                <li>Platforma barqarorligini tahlil qilish va xatoliklarni bartaraf etish.</li>
              </ul>

              <p style={{ marginBottom: '12px' }}><strong>4. Ma'lumotlar xavfsizligi va himoyasi</strong><br/>
              Foydalanuvchilarning ma'lumotlari Firebase xavfsizlik qoidalari orqali himoyalangan va begona shaxslarga taqdim etilmaydi. Shaxsiy ma'lumotlar uchinchi shaxslarga sotilmaydi yoki ijaraga berilmaydi.</p>

              <p style={{ marginBottom: '12px' }}><strong>5. Aloqa va murojaat</strong><br/>
              Maxfiylik siyosati bo'yicha savollaringiz yoki takliflaringiz bo'lsa, platformaning qo'llab-quvvatlash xizmati yoki admin paneli orqali murojaat qilishingiz mumkin.</p>
            </div>
            <button 
              onClick={() => setShowPrivacy(false)} 
              style={{ 
                width: '100%',
                padding: '12px', 
                borderRadius: 12, 
                background: 'var(--blue)', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 700, 
                fontSize: 14, 
                cursor: 'pointer', 
                fontFamily: 'inherit',
                transition: 'opacity 0.2s'
              }}
            >
              Tushunarli 🤝
            </button>
          </div>
        </div>
      )}

      {/* ═══ TELEGRAM INTEGRATION MODAL ═══ */}
      {showTelegramModal && (
        <div className="pp-modal-overlay" onClick={() => setShowTelegramModal(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '24px' }}>
            <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Send size={22} style={{ color: '#29B6F6' }} /> Telegram Eslatmalar
            </div>
            
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '16px 0' }}>
              Attestatsiyaga tayyorgarlikni yanada tizimli qilish uchun har kuni takrorlashingiz kerak bo'lgan testlarni Telegram orqali qabul qiling.
            </div>

            {/* Instruction Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg3)', padding: '16px 20px', borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                <strong>1-qadam:</strong> Telegramda <a href="tg://resolve?domain=IQRO_testbot" style={{ color: '#29B6F6', textDecoration: 'none', fontWeight: 700 }}>@IQRO_testbot</a> botini oching va <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>/start</code> buyrug'ini bosing.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                <strong>2-qadam:</strong> Botga ulanish uchun quyidagi shaxsiy ID kodini yuboring:
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <code style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>
                    IQRO-{user.uid.substring(0, 8).toUpperCase()}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`IQRO-${user.uid.substring(0, 8).toUpperCase()}`);
                      showToast("Ulanish kodi nusxalandi! 📋", "success");
                    }}
                    style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >
                    Nusxalash
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--border)', marginBottom: 24 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>⏰ Kundalik eslatmalar</span>
              <button 
                onClick={async () => {
                  const newState = !state.telegramEnabled;
                  updateState({ telegramEnabled: newState });
                  
                  try {
                    await setDoc(doc(db, 'users', user.uid), {
                      telegramEnabled: newState,
                      telegramCode: `IQRO-${user.uid.substring(0, 8).toUpperCase()}`
                    }, { merge: true });
                    showToast(newState ? "Eslatmalar yoqildi! 🔔" : "Eslatmalar o'chirildi! 🔕", "success");
                  } catch (e) {
                    showToast("Firebase sinxronizatsiyada xatolik", "error");
                  }
                }}
                style={{ 
                  padding: '6px 14px', 
                  background: state.telegramEnabled ? 'var(--green)' : 'var(--bg2)', 
                  color: state.telegramEnabled ? '#fff' : 'var(--text3)', 
                  border: '1.5px solid',
                  borderColor: state.telegramEnabled ? 'var(--green)' : 'var(--border)',
                  borderRadius: 10, 
                  fontWeight: 700, 
                  fontSize: 12, 
                  cursor: 'pointer' 
                }}
              >
                {state.telegramEnabled ? "Yoqilgan" : "O'chirilgan"}
              </button>
            </div>

            <button 
              onClick={() => setShowTelegramModal(false)} 
              style={{ 
                width: '100%',
                padding: '13px', 
                borderRadius: 14, 
                background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 700, 
                fontSize: 14, 
                cursor: 'pointer', 
                fontFamily: 'inherit',
                boxShadow: '0 4px 15px rgba(41, 182, 246, 0.2)'
              }}
            >
              Tushunarli 🤝
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
