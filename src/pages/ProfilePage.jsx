/**
 * ProfilePage.jsx — Premium Profile sahifasi
 * Gradient header, XP, streak, countdown, badges, referral, edit
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Edit3, LogOut, ChevronRight, Copy, Check, Crown, Shield, Download, FileText, Send, Play, GraduationCap, Brain, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { SUBJECTS } from '../data/mockData';
import { ToastContext } from '../context/ToastContext';
import { PWAContext } from '../context/PWAContext';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, onSnapshot, collection, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { updateProfile, deleteUser, signInWithCustomToken } from 'firebase/auth';
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
  const { isInstallable, installApp } = useContext(PWAContext);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeGuidePanel, setActiveGuidePanel] = useState(null);
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
    const hasOpenModal = showEdit || showPremium || showLogoutConfirm || showPrivacy || showTelegramModal || showDeleteConfirm;
    if (!hasOpenModal) return;

    window.history.pushState({ profileModalOpen: true }, '');

    const handlePopState = () => {
      setShowEdit(false);
      setShowPremium(false);
      setShowLogoutConfirm(false);
      setShowPrivacy(false);
      setShowTelegramModal(false);
      setShowDeleteConfirm(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.profileModalOpen) {
        window.history.back();
      }
    };
  }, [showEdit, showPremium, showLogoutConfirm, showPrivacy, showTelegramModal, showDeleteConfirm]);

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

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const uid = user.uid;
      // 1. Delete Firestore records (errors ignored if permissions deny, but they shouldn't)
      await deleteDoc(doc(db, 'userStats', uid)).catch(e => console.log(e));
      await deleteDoc(doc(db, 'users', uid)).catch(e => console.log(e));
      
      // 2. Delete Auth user
      await deleteUser(auth.currentUser);
      showToast("Hisobingiz muvaffaqiyatli o'chirildi.", 'success');
      navigate('/');
    } catch (e) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
        showToast("Xavfsizlik: Iltimos, hisobdan chiqib qayta kiring va keyin o'chiring.", 'error');
        setShowDeleteConfirm(false);
      } else {
        showToast("Xatolik yuz berdi. Adminga murojaat qiling.", 'error');
      }
    } finally {
      setDeleting(false);
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 4px' }}>
            <div style={{ 
              width: 52, height: 52, borderRadius: '16px', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {initials}
            </div>
            <div>
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

        {/* (Subject section and Referral Card removed from here) */}

        {/* ═══ MENU ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* ═══ PREMIUM HOLATI KARTASI ═══ */}
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

          {isAdmin && (
            <button className="pp-menu-item" onClick={() => navigate('/admin')}>
              <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#fff' }}>
                <Shield size={20} />
              </div>
              <span className="pp-menu-label">Admin Panel</span>
              <ChevronRight size={18} className="pp-menu-arrow" />
            </button>
          )}

          {/* Install App */}
          {isInstallable && (
            <button className="pp-menu-item" onClick={installApp}>
              <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}>
                <Download size={20} />
              </div>
              <span className="pp-menu-label" style={{ fontWeight: 800 }}>Ilovani o'rnatish (PWA)</span>
              <ChevronRight size={18} className="pp-menu-arrow" />
            </button>
          )}

          {/* Oflayn ishlash kafolati / Yuklab olish */}
          <button className="pp-menu-item" onClick={handleDownloadOffline}>
            <div className="pp-menu-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <Shield size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label" style={{ fontWeight: 800, color: '#10B981' }}>
                {downloadingOffline ? downloadProgress : "Oflayn ishlash (Kafolat)"}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Internetsiz ishlash uchun savollarni yuklash</span>
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

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

          {/* Telegram Bot */}
          <button className="pp-menu-item" onClick={() => setShowTelegramModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'rgba(41, 182, 246, 0.1)', color: '#29B6F6' }}>
              <Send size={20} />
            </div>
            <span className="pp-menu-label">Telegram Bot & Sozlamalar</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Qo'llanma */}
          <button className="pp-menu-item" onClick={() => setShowGuideModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <div style={{ fontSize: 16 }}>📖</div>
            </div>
            <span className="pp-menu-label">Foydalanish qo'llanmasi</span>
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

          {/* Delete Account */}
          <button className="pp-menu-item" onClick={() => setShowDeleteConfirm(true)}>
            <div className="pp-menu-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <Shield size={20} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <span className="pp-menu-label" style={{ color: '#EF4444' }}>Hisobni o'chirish</span>
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

      {/* ═══ DELETE ACCOUNT CONFIRMATION MODAL ═══ */}
      {showDeleteConfirm && (
        <div className="pp-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <div className="pp-modal-title" style={{ marginBottom: 10, fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>Hisobni o'chirish</div>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              Rostdan ham hisobingizni o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi. Barcha ballaringiz, obunangiz va statistikangiz butunlay o'chib ketadi.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                onClick={handleDeleteAccount} 
                disabled={deleting}
                style={{ 
                  padding: '13px', borderRadius: 12, background: 'var(--red)', color: '#fff', 
                  border: 'none', fontWeight: 700, fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 0.2s', opacity: deleting ? 0.7 : 1
                }}
              >
                {deleting ? "O'chirilmoqda..." : "Ha, hisobimni o'chirish"}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                disabled={deleting}
                style={{ 
                  padding: '12px', borderRadius: 12, background: 'transparent', color: 'var(--text)', 
                  border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                Bekor qilish
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
            <div className="pp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
              <Send size={22} style={{ color: '#29B6F6' }} /> Telegram Sozlamalari
            </div>
            
            {/* Eslatmalar bo'limi */}
            <div style={{ background: 'var(--bg3)', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>⏰ Kundalik eslatmalar</span>
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
                    width: 48, height: 26, borderRadius: 13, border: 'none', position: 'relative', cursor: 'pointer',
                    background: state.telegramEnabled ? '#10B981' : 'var(--border)', transition: '0.3s'
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                    left: state.telegramEnabled ? 24 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                Har kuni test ishlash eslatmalarini Telegram bot orqali oling. Buning uchun <a href="tg://resolve?domain=IQRO_testbot" style={{ color: '#29B6F6', textDecoration: 'none', fontWeight: 700 }}>@IQRO_testbot</a> botiga <code style={{background:'var(--bg)', padding:'2px 4px', borderRadius:4}}>IQRO-{user.uid.substring(0, 8).toUpperCase()}</code> kodini yuboring.
              </div>
            </div>

            {/* Hisobni tiklash bo'limi */}
            <div style={{ background: 'var(--bg3)', borderRadius: 16, padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🔄 Eski hisobni tiklash</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 12 }}>
                Oldingi hisobingizdagi obuna va yutuqlarni hozirgi hisobingizga ko'chirib o'tkazish.
              </div>
              <button 
                onClick={handleTelegramLogin} 
                disabled={tgLoading}
                style={{ 
                  width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue-bg)', color: 'var(--blue)', 
                  border: '1px solid rgba(41, 182, 246, 0.3)', fontWeight: 700, fontSize: 13, cursor: tgLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                }}
              >
                <Send size={16} className={tgLoading ? "spin" : ""} />
                {tgLoading ? 'Kutilmoqda...' : 'Telegram orqali tiklash'}
              </button>
              {tgError && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8, textAlign: 'center' }}>{tgError}</div>}
            </div>

            <button onClick={() => setShowTelegramModal(false)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '20px' }}>
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* ═══ USER GUIDE MODAL ═══ */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="pp-modal-overlay" onClick={() => setShowGuideModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: '24px' }}
            >
              <div 
                className="pp-modal-title" 
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', cursor: 'pointer' }}
                onClick={() => {
                  // Secret trigger for testing Ambassador Modal
                  localStorage.setItem('force_ambassador', '1');
                  localStorage.removeItem('iqro_ambassador_thanks');
                  showToast('Admin: Ambassador test yuborildi. Sahifani yangilang!', 'success');
                }}
              >
                <span style={{ fontSize: 24 }}>📖</span> Foydalanish qo'llanmasi
              </div>
              
              <div className="pp-policy-scroll" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Panel 1 */}
                <div style={{ background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => setActiveGuidePanel(p => p === 1 ? null : 1)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    🚀 IQRO o'zi qanday platforma?
                    <ChevronRight size={16} style={{ transform: activeGuidePanel === 1 ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                  </button>
                  {activeGuidePanel === 1 && (
                    <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                      IQRO — attestatsiya va sertifikatlash imtihonlariga tayyorlanish uchun mo'ljallangan zamonaviy platforma. Bizda minglab testlar bazasi bo'lib, ular haqiqiy imtihon standartlariga mos keladi. Siz bu yerda o'z bilimingizni tekshirishingiz va xatolar ustida tizimli ishlashingiz mumkin.
                    </div>
                  )}
                </div>

                {/* Panel 2 */}
                <div style={{ background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => setActiveGuidePanel(p => p === 2 ? null : 2)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    🧠 "Takrorlash" bo'limi qanday ishlaydi?
                    <ChevronRight size={16} style={{ transform: activeGuidePanel === 2 ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                  </button>
                  {activeGuidePanel === 2 && (
                    <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                      Biz <strong>"Spaced Repetition" (Oraliq takrorlash)</strong> algoritmidan foydalanamiz. Testda xato qilgan yoki qiynalgan savollaringiz darhol sizga ko'rinmaydi. Algoritm ularni xotirangizdan o'chib ketishiga yaqin qolganda aynan qulay vaqtda hisoblab sizga qayta ko'rsatadi. Shu sababli bilimingiz doimiy yodda qoladi!
                    </div>
                  )}
                </div>

                {/* Panel 3 */}
                <div style={{ background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => setActiveGuidePanel(p => p === 3 ? null : 3)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    🏆 Reyting va XP nima?
                    <ChevronRight size={16} style={{ transform: activeGuidePanel === 3 ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                  </button>
                  {activeGuidePanel === 3 && (
                    <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                      Siz to'g'ri ishlagan har bir test uchun <strong>XP (Tajriba ochkosi)</strong> olasiz. Ketma-ket kunlar davomida kirib o'qisangiz (Streak), olingan ochkolar hajmi ortib boradi. Shuningdek, tizimli o'qisangiz Respublika bo'yicha Reytingingiz ko'tariladi va turli nishonlar olasiz.
                    </div>
                  )}
                </div>

                {/* Panel 4 */}
                <div style={{ background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => setActiveGuidePanel(p => p === 4 ? null : 4)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    🎁 Do'stlarni taklif qilish
                    <ChevronRight size={16} style={{ transform: activeGuidePanel === 4 ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                  </button>
                  {activeGuidePanel === 4 && (
                    <div style={{ padding: '10px 16px 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                      Tizimda <strong>50/50 Chegirma</strong> tizimi ishlaydi. Siz do'stingizga maxsus havolangizni yuborasiz. U shu orqali ro'yxatdan o'tsa 50% chegirmaga ega bo'ladi. U to'lov qilgach, <strong>Siz ham o'z navbatdagi to'lovingiz uchun juda katta chegirma yutib olasiz!</strong>
                    </div>
                  )}
                </div>

              </div>

              <button onClick={() => setShowGuideModal(false)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '20px', cursor: 'pointer' }}>
                Tushunarli 🤝
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
