/**
 * ProfilePage.jsx — Premium Profile sahifasi
 * Gradient header, XP, streak, countdown, badges, referral, edit
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sun, Edit3, LogOut, ChevronRight, Copy, Check, Crown, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  const { state } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', gender: '', birthDate: '', goal: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [refStats, setRefStats] = useState(null);
  const [copied, setCopied] = useState(false);

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
  const catStats = state.stats?.chqbt || { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 };
  const totalAnswered = (state.stats?.chqbt?.totalAnswered || 0) + (state.stats?.art?.totalAnswered || 0);
  const totalCorrect = (state.stats?.chqbt?.totalCorrect || 0) + (state.stats?.art?.totalCorrect || 0);
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
      {/* ═══ GRADIENT HEADER ═══ */}
      <div className="pp-header">
        <div className="pp-header-top">
          <div className="pp-avatar">{initials}</div>
          <div className="pp-user-info">
            <h1 className="pp-user-name">{displayName}</h1>
            <div className="pp-user-email">{user.email}</div>
            <div className="pp-badges-row">
              <span className="pp-badge pp-badge-level">⚡ Lv.{levelInfo.level} {levelInfo.name}</span>
              {isPremium
                ? <span className="pp-badge pp-badge-premium"><Crown size={10} /> Premium</span>
                : <span className="pp-badge pp-badge-free" onClick={() => setShowPremium(true)} style={{ cursor: 'pointer' }}>Bepul</span>
              }
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="pp-xp-bar">
          <div className="pp-xp-labels">
            <span>⚡ {totalXP} XP</span>
            <span>{totalXP}/{nextXP} XP</span>
          </div>
          <div className="pp-xp-track">
            <div className="pp-xp-fill" style={{ width: `${xpPct}%` }} />
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

        {/* ═══ EXAM COUNTDOWN ═══ */}
        {countdown && (
          <div className="pp-card">
            <div className="pp-card-label">📅 Imtihon sanasi</div>
            <div className="pp-countdown-grid">
              {[{ v: countdown.y, l: 'Yil' }, { v: countdown.m, l: 'Oy' }, { v: countdown.d, l: 'Kun' }].map((c, i) => (
                <div key={i} className="pp-countdown-box">
                  <div className="pp-countdown-val">{c.v}</div>
                  <div className="pp-countdown-lbl">{c.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STAT CARDS ═══ */}
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

        {/* ═══ REFERRAL SLOTS GAMIFICATION ═══ */}
        <div className="pp-card">
          <div className="pp-card-label">🤝 Taklif qilishlar · {refStats?.total || 0}/{MAX_REFERRALS}</div>
          <div className="pp-ref-slots">
            {Array.from({ length: MAX_REFERRALS }).map((_, i) => {
              const isActive = i < (refStats?.total || 0);
              return (
                <div key={i} className={`pp-ref-slot ${isActive ? 'filled' : 'empty'}`}>
                  {isActive ? '✅' : '⚪'}
                </div>
              );
            })}
          </div>
          {refStats && refStats.total >= MAX_REFERRALS ? (
            <div className="pp-ref-limit-msg">🏆 Maksimal limitga erishildi!</div>
          ) : (
            <div className="pp-ref-sub">Har bir taklif uchun ikkalangizga {REFERRAL_DISCOUNT}% chegirma!</div>
          )}
        </div>

        {/* ═══ REFERRAL LINK ═══ */}
        <div className="pp-referral" onClick={() => navigate('/referral')}>
          <div className="pp-referral-icon">🤝</div>
          <div className="pp-referral-text">
            <div className="pp-referral-title">Do'stlarni taklif qil</div>
            <div className="pp-referral-desc">
              {refStats ? `${refStats.total}/${MAX_REFERRALS} taklif · ` : ''}Bonus oling!
            </div>
          </div>
          <div className="pp-referral-arrow"><ChevronRight size={20} /></div>
        </div>

        {refCode && (
          <div className="pp-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 4 }}>REFERRAL KOD</div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, color: 'var(--blue)', fontFamily: 'monospace' }}>{refCode}</div>
            </div>
            <button onClick={copyRef} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg3)',
              fontSize: 13, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Nusxalandi' : 'Nusxa'}
            </button>
          </div>
        )}

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

          {/* Logout */}
          <button className="pp-menu-item danger" onClick={handleLogout}>
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
            <div className="pp-field">
              <label>Imtihon sanasi</label>
              <input type="date" value={examDate} onChange={e => {
                setExamDate(e.target.value);
                // Kesh sifatida localStorage ga saqlaymiz (Firestore ga handleSave da saqlanadi)
                localStorage.setItem('iqro_exam_date', e.target.value);
                if (e.target.value) {
                  localStorage.setItem('CUSTOM_EXAM_DATE', new Date(e.target.value).toISOString());
                }
              }} />
            </div>
            <div className="pp-modal-actions">
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
    </motion.div>
  );
}
