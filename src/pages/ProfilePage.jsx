/**
 * ProfilePage.jsx — Profil (shaxsiy dashboard)
 * Sarlavha (XP/level + sozlamalar tugmasi), trial banner, tezkor boshlash,
 * streak, statistika kartalari, premium holati va havolalar.
 * Sozlamalar/hisob/FAQ alohida sahifaga ko'chirilgan: /settings (SettingsPage.jsx)
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, ChevronRight, Crown, Shield, Play, GraduationCap, Brain, Zap, Users, Camera, Pencil, Trophy } from 'lucide-react';
import { SUBJECTS } from '../data/mockData';
import GiftBox from '../components/shared/GiftBox';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { db, storage, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { REFERRAL_DISCOUNT, MONTHLY_PRICE, DISCOUNT_AMOUNT } from '../services/referral';
import PremiumModal from '../components/PremiumModal';
import NotificationBell from '../components/NotificationBell';
import EditProfileModal, { TOIFALAR } from '../components/profile/EditProfileModal';
import { useModalBackButton } from '../components/profile/useModalBackButton';

const TOIFA_LABELS = Object.fromEntries(TOIFALAR.map(t => [t.value, t.label]));
import { useAdmin } from '../hooks/useAdmin';
import './ProfilePage.css';

const DAY_NAMES = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function ProfilePage() {
  const { user, updateUserData } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [showPremium, setShowPremium] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSubject, setProfileSubject] = useState('');
  const [profileToifa, setProfileToifa] = useState('');
  const [bonusBalance, setBonusBalance] = useState(0);

  // Profilni tahrirlash modali
  const [showEdit, setShowEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', age: '', gender: '', birthDate: '', subject: '', teacherCategory: '' });

  // Profil rasmi (avatar) — yuklash holati
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // bir xil faylni qayta tanlash mumkin bo'lsin
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      showToast('Faqat rasm fayli yuklang', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Rasm hajmi 5 MB dan oshmasligi kerak", 'error');
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const avatarRef = storageRef(storage, `avatars/${user.uid}/photo.${ext}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
      setPhotoURL(url);
      updateUserData({ photoURL: url });
      showToast('Profil rasmi yangilandi ✅', 'success');
    } catch (err) {
      console.error('Avatar yuklash xatosi:', err);
      showToast("Rasm yuklashda xatolik. Internet va ruxsatlarni tekshiring.", 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Profil ma'lumotlarini saqlash (ism/familiya/yosh/jins/sana/fan/toifa)
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingEdit(true);
    try {
      const displayName = `${editForm.firstName || ''} ${editForm.lastName || ''}`.trim();
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        firstName: editForm.firstName || '',
        lastName: editForm.lastName || '',
        age: editForm.age || '',
        gender: editForm.gender || '',
        birthDate: editForm.birthDate || '',
        subject: editForm.subject || '',
        teacherCategory: editForm.teacherCategory || '',
      }, { merge: true });
      if (displayName && auth.currentUser) {
        try { await updateProfile(auth.currentUser, { displayName }); } catch (e) { console.warn('updateProfile:', e); }
      }
      if (displayName) {
        setProfileName(displayName);
        updateUserData({ displayName });
      }
      setProfileSubject(editForm.subject || '');
      setProfileToifa(editForm.teacherCategory || '');
      showToast('Profil saqlandi ✅', 'success');
      setShowEdit(false);
    } catch (e) {
      console.error('Profil saqlash xatosi:', e);
      showToast('Xatolik yuz berdi', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Urgency countdown (72h real-time)
  const [urgencyLeft, setUrgencyLeft] = useState(user?.urgencyMs || 0);

  // Android "orqaga" tugmasi premium modalni yopadi
  useModalBackButton(showPremium || showEdit, () => { setShowPremium(false); setShowEdit(false); });

  // Profil ma'lumotlarini yuklash (ism + imtihon sanasi sinxroni)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const dn = d.displayName || user.displayName || '';
        if (d.displayName) setProfileName(d.displayName);
        if (d.photoURL) setPhotoURL(d.photoURL);
        setBonusBalance(d.referralBonus || 0);
        setProfileSubject(d.subject || '');
        setProfileToifa(d.teacherCategory || '');
        setEditForm({
          firstName: d.firstName ?? (dn.split(' ')[0] || ''),
          lastName: d.lastName ?? (dn.split(' ').slice(1).join(' ') || ''),
          age: d.age || '',
          gender: d.gender || '',
          birthDate: d.birthDate || '',
          subject: d.subject || '',
          teacherCategory: d.teacherCategory || '',
        });
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
  const totalAnswered = Object.values(state.stats || {}).reduce((sum, curr) => sum + (curr.totalAnswered || 0), 0);
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
      {/* ═══ FOYDALANUVCHI SARLAVHASI (markazlashgan hero karta) ═══ */}
      <div className="pp-hero">
        {/* Burchak ikonkalari: bildirishnoma + sozlamalar */}
        <div className="pp-hero-actions">
          <NotificationBell iconSize={18} buttonClassName="pp-hero-icon-btn" buttonStyle={{ width: 36, height: 36 }} />
          <motion.button
            className="pp-hero-icon-btn"
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate('/settings')}
            title="Sozlamalar"
            style={{ width: 36, height: 36 }}
          >
            <Settings size={18} />
          </motion.button>
        </div>

        {/* Markazda: avatar + ism + badge'lar */}
        <div className="pp-hero-id">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
          <motion.div
            className="pp-hero-avatar"
            whileTap={{ scale: 0.94 }}
            onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
            title="Profil rasmini o'zgartirish"
          >
            {uploadingPhoto ? (
              <div className="pp-avatar-spinner" />
            ) : photoURL ? (
              <img src={photoURL} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
            <div className="pp-hero-cam"><Camera size={11} color="#fff" /></div>
          </motion.div>

          <div className="pp-hero-name-row">
            <span className="pp-hero-name">{displayName}</span>
            <button className="pp-hero-edit" onClick={() => setShowEdit(true)} title="Profilni tahrirlash">
              <Pencil size={14} />
            </button>
          </div>

          {(profileSubject || profileToifa) && (
            <div className="pp-hero-sub">
              {profileSubject && `${SUBJECTS.find(s => s.id === profileSubject)?.name || ''} o'qituvchisi`}
              {profileSubject && profileToifa && ' · '}
              {profileToifa && TOIFA_LABELS[profileToifa]}
            </div>
          )}

          <div className="pp-hero-badges">
            <span className="pp-hero-chip lv"><Zap size={11} /> Lv.{levelInfo.level}</span>
            {isPremium
              ? <span className="pp-hero-chip premium"><Crown size={11} /> Premium</span>
              : <span className="pp-hero-chip free" onClick={() => setShowPremium(true)}>Bepul</span>
            }
          </div>
        </div>

        {/* Statistika qatori: XP · Daraja · Streak */}
        <div className="pp-hero-stats">
          <div className="pp-hero-stat"><b>{totalXP}</b><span>XP / {nextXP}</span></div>
          <div className="pp-hero-stat"><b>{levelInfo.level}</b><span>Daraja</span></div>
          <div className="pp-hero-stat"><b>🔥 {dailyStreak}</b><span>Kun</span></div>
        </div>

        {/* XP progress chizig'i */}
        <div className="pp-hero-xptrack"><div className="pp-hero-xpfill" style={{ width: `${xpPct}%` }} /></div>

        {/* Haftalik streak — 7 kunlik lenta */}
        <div className="pp-hero-streak-head">🔥 Haftalik streak</div>
        <div className="pp-hero-streak">
          {weekDays.map((dayIdx, i) => {
            const isActive = i < dailyStreak;
            const isToday = dayIdx === todayIdx;
            return (
              <div key={dayIdx} className={`pp-hero-day ${isActive ? 'active' : ''} ${isToday && !isActive ? 'today' : ''}`}>
                <div className="pp-hero-day-ic">{isActive ? '🔥' : isToday ? '📍' : '○'}</div>
                <div className="pp-hero-day-lbl">{DAY_NAMES[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pp-content">
        {/* ═══ FREE TRIAL BANNER ═══ */}
        {trialStatus === 'trial' && (
          <div className="pp-trial-banner">
            <div className="pp-trial-icon"><GiftBox size={28} /></div>
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
        <div>
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

        {/* ═══ PREMIUM HOLATI ═══ */}
        <div>
          {isPremium ? (
            /* Premium foydalanuvchi — obuna holati */
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              title="Premium obunani boshqarish"
              style={{
              padding: '20px 18px', borderRadius: '18px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 6px 22px rgba(245, 158, 11, 0.35)',
              position: 'relative', overflow: 'hidden'
            }}>
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 1 }}
                style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                  transform: 'skewX(-20deg)'
                }}
              />
              <div style={{
                width: 50, height: 50, borderRadius: '14px', flexShrink: 0,
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                position: 'relative', zIndex: 1
              }}>👑</div>
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Premium Faol</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {user.premiumExpire
                    ? `Tugash: ${new Date(user.premiumExpire).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Muddatsiz'}
                </div>
              </div>
              <span
                style={{
                  background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)',
                  color: '#fff', fontSize: 12.5, fontWeight: 800, padding: '8px 15px',
                  borderRadius: 11, fontFamily: 'inherit',
                  position: 'relative', zIndex: 1, flexShrink: 0
                }}
              >
                Yangilash
              </span>
            </motion.div>
          ) : (
            /* Premium yo'q — sotib olish tugmasi */
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px',
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
        </div>

        {/* ═══ NATIJALAR YO'Q — CTA (faqat hali natija bo'lmaganda) ═══ */}
        {totalAnswered === 0 && (
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
        )}

        {/* ═══ HAVOLALAR ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="pp-group">
          {/* Yutuqlar */}
          <button className="pp-menu-item" onClick={() => navigate('/achievements')}>
            <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#fff' }}>
              <Trophy size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label">Yutuqlar</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {earnedBadges.length > 0 ? `${earnedBadges.length} ta nishon qo'lga kiritildi` : "Hali nishon yo'q — test ishlab qo'lga kiriting"}
              </span>
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {/* Do'stlarni taklif qilish */}
          <button className="pp-menu-item" onClick={() => navigate('/referral')}>
            <div className="pp-menu-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <Users size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Do'stlarni taklif qilish <GiftBox size={15} /></span>
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
      </div>

      {/* Premium Modal */}
      {showPremium && <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />}
      {showEdit && (
        <EditProfileModal
          form={editForm}
          setForm={setEditForm}
          saving={savingEdit}
          onSave={handleSaveProfile}
          onClose={() => setShowEdit(false)}
        />
      )}
    </motion.div>
  );
}
