/**
 * ProfilePage.jsx — Profil (shaxsiy dashboard)
 * Sarlavha (XP/level + sozlamalar tugmasi), trial banner, tezkor boshlash,
 * streak, statistika kartalari, premium holati va havolalar.
 * Sozlamalar/hisob/FAQ alohida sahifaga ko'chirilgan: /settings (SettingsPage.jsx)
 */
import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, ChevronRight, Crown, Shield, Zap, Users, Smile, Pencil, Trophy } from 'lucide-react';
import { SUBJECTS } from '../data/mockData';
import GiftBox from '../components/shared/GiftBox';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { avatarUrl } from '../data/avatars';
import AvatarPickerModal from '../components/profile/AvatarPickerModal';
import { getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { REFERRAL_DISCOUNT, MONTHLY_PRICE, DISCOUNT_AMOUNT } from '../services/referral';
import PremiumModal from '../components/PremiumModal';
import NotificationBell from '../components/NotificationBell';
import EditProfileModal from '../components/profile/EditProfileModal';
import { useModalBackButton } from '../components/profile/useModalBackButton';
import { useAdmin } from '../hooks/useAdmin';
import './ProfilePage.css';

const DAY_NAMES = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateUserData } = useAuth();
  const { state } = useContext(AppContext);
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

  // Avatar — tayyor avatarlar reyestridan tanlanadi (rasm yuklash olib tashlandi)
  const [avatarId, setAvatarId] = useState(user?.avatarId || null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const avatarSrc = avatarUrl(avatarId) || user?.photoURL || null;

  const handlePickAvatar = async (id) => {
    setAvatarId(id);
    setShowAvatarPicker(false);
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { avatarId: id || null }, { merge: true });
      updateUserData({ avatarId: id || null });
      showToast(id ? t('profile.avatarUpdated') : t('profile.avatarRemoved'), 'success');
    } catch (err) {
      console.error('Avatar saqlash xatosi:', err);
      showToast(t('exam.toastError'), 'error');
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
      showToast(t('profile.profileSaved'), 'success');
      setShowEdit(false);
    } catch (e) {
      console.error('Profil saqlash xatosi:', e);
      showToast(t('exam.toastError'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Urgency countdown (72h real-time)
  const [urgencyLeft, setUrgencyLeft] = useState(user?.urgencyMs || 0);

  // Android "orqaga" tugmasi premium modalni yopadi
  useModalBackButton(showPremium || showEdit || showAvatarPicker, () => { setShowPremium(false); setShowEdit(false); setShowAvatarPicker(false); });

  // Profil ma'lumotlarini yuklash (ism + imtihon sanasi sinxroni)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const dn = d.displayName || user.displayName || '';
        if (d.displayName) setProfileName(d.displayName);
        setAvatarId(d.avatarId || null);
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
  const displayName = profileName || user.displayName || t('common.userFallback');
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isPremium = user.isPremium || false;
  // Haqiqiy (to'langan) premium — "Premium" nishonini ko'rsatish uchun. Trial/urgency
  // davrida isPremium=true bo'lsa-da, bu false bo'ladi, shu sababli "Premium" nishoni
  // bilan "Sinov tugadi" banneri bir vaqtda chiqib qolmaydi.
  const isTruePremium = user.isTruePremium || false;
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
  const streakFreezes = state.streakFreezes ?? 2;
  const todayIdx = new Date().getDay(); // 0=Sun
  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

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
            title={t('settings.title')}
            style={{ width: 36, height: 36 }}
          >
            <Settings size={18} />
          </motion.button>
        </div>

        {/* Markazda: avatar + ism + badge'lar */}
        <div className="pp-hero-id">
          <motion.div
            className="pp-hero-avatar"
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAvatarPicker(true)}
            title={t('profile.avatarPick')}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
            <div className="pp-hero-cam"><Smile size={11} color="#fff" /></div>
          </motion.div>

          <div className="pp-hero-name-row">
            <span className="pp-hero-name">{displayName}</span>
            <button className="pp-hero-edit" onClick={() => setShowEdit(true)} title={t('settings.editProfile')}>
              <Pencil size={14} />
            </button>
          </div>

          {(profileSubject || profileToifa) && (
            <div className="pp-hero-sub">
              {profileSubject && t('profile.teacherOf', { subject: SUBJECTS.find(s => s.id === profileSubject)?.name || '' })}
              {profileSubject && profileToifa && ' · '}
              {profileToifa && t(`modals.toifa.${profileToifa}`)}
            </div>
          )}

          <div className="pp-hero-badges">
            <span className="pp-hero-chip lv"><Zap size={11} /> Lv.{levelInfo.level}</span>
            {isTruePremium
              ? <span className="pp-hero-chip premium"><Crown size={11} /> {t('header.premium')}</span>
              : <span className="pp-hero-chip free" onClick={() => setShowPremium(true)}>{t('profile.free')}</span>
            }
          </div>
        </div>

        {/* Statistika qatori: XP · Daraja · Streak */}
        <div className="pp-hero-stats">
          <div className="pp-hero-stat"><b>{totalXP}</b><span>{t('profile.statXp', { next: nextXP })}</span></div>
          <div className="pp-hero-stat"><b>{levelInfo.level}</b><span>{t('profile.statLevel')}</span></div>
          <div className="pp-hero-stat"><b>🔥 {dailyStreak}</b><span>{t('profile.statDay')}</span></div>
        </div>

        {/* XP progress chizig'i */}
        <div className="pp-hero-xptrack"><div className="pp-hero-xpfill" style={{ width: `${xpPct}%` }} /></div>

        {/* Haftalik streak — 7 kunlik lenta */}
        <div className="pp-hero-streak-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>{t('profile.weeklyStreak')}</span>
          <span
            title={t('profile.freezeTooltip')}
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)', background: 'var(--blue-bg)', borderRadius: 8, padding: '2px 8px', whiteSpace: 'nowrap' }}
          >
            {t('profile.freezeCount', { count: streakFreezes })}
          </span>
        </div>
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
              <div className="pp-trial-title">{t('profile.trialActive')}</div>
              <div className="pp-trial-desc">{t('profile.trialActiveDesc', { days: trialDaysLeft })}</div>
            </div>
            <div className="pp-trial-days">
              <div className="pp-trial-days-num">{trialDaysLeft}</div>
              <div className="pp-trial-days-lbl">{t('profile.daysLeft')}</div>
            </div>
          </div>
        )}

        {/* ═══ URGENCY COUNTDOWN (72h) ═══ */}
        {trialStatus === 'urgency' && urgencyLeft > 0 && (
          <div className="pp-urgency-banner" onClick={() => setShowPremium(true)}>
            <div className="pp-urgency-top">
              <span>{t('profile.urgencyExpired')}</span>
              {user.hasReferralDiscount && <span className="pp-urgency-badge">{t('profile.discountBadge', { percent: REFERRAL_DISCOUNT })}</span>}
            </div>
            <div className="pp-urgency-timer">
              <div className="pp-urg-block"><span>{urg.d}</span><small>{t('profile.urgDay')}</small></div>
              <div className="pp-urg-sep">:</div>
              <div className="pp-urg-block"><span>{urg.h}</span><small>{t('profile.urgHour')}</small></div>
              <div className="pp-urg-sep">:</div>
              <div className="pp-urg-block"><span>{urg.m}</span><small>{t('profile.urgMin')}</small></div>
              <div className="pp-urg-sep">:</div>
              <div className="pp-urg-block"><span>{urg.s}</span><small>{t('profile.urgSec')}</small></div>
            </div>
            <div className="pp-urgency-cta">
              {user.hasReferralDiscount
                ? t('profile.urgencyCtaDiscount', { price: (MONTHLY_PRICE - DISCOUNT_AMOUNT).toLocaleString(), original: MONTHLY_PRICE.toLocaleString() })
                : t('profile.urgencyCtaDefault')
              }
            </div>
          </div>
        )}

        {/* ═══ EXPIRED BANNER ═══ */}
        {trialStatus === 'expired' && !isPremium && (
          <div className="pp-expired-banner" onClick={() => setShowPremium(true)}>
            <div className="pp-expired-text">
              <span>🔒</span> {t('profile.expiredP1')} <strong>{t('profile.expiredStrong')}</strong> →
            </div>
          </div>
        )}

        {/* Tezkor Boshlash olib tashlandi — BottomNav (Test/Imtihon/Takror) bilan dublikat edi */}

        {/* ═══ PREMIUM HOLATI ═══ */}
        <div>
          {isTruePremium ? (
            /* Premium foydalanuvchi — obuna holati */
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              title={t('profile.premiumManage')}
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
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 3 }}>{t('profile.premiumActive')}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {user.premiumExpire
                    ? t('profile.premiumExpires', { date: new Date(user.premiumExpire).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) })
                    : t('profile.premiumLifetime')}
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
                {t('profile.renew')}
              </span>
            </motion.div>
          ) : (
            /* Premium yo'q — sotib olish tugmasi */
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                background: 'var(--grad-primary)',
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
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 2 }}>{t('profile.premiumBuy')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                  {t('profile.premiumBuyDesc')}
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
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: 18 }}>{t('profile.noResultsTitle')}</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text3)', fontSize: 13 }}>{t('profile.noResultsText')}</p>
            <button
              onClick={() => navigate('/test')}
              style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              {t('profile.noResultsBtn')}
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
              <span className="pp-menu-label">{t('profile.achievements')}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {earnedBadges.length > 0 ? t('profile.badgesEarned', { count: earnedBadges.length }) : t('profile.badgesNone')}
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
              <span className="pp-menu-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{t('profile.inviteFriends')} <GiftBox size={15} /></span>
              <span style={{ fontSize: 11, color: bonusBalance > 0 ? 'var(--green)' : 'var(--text3)', fontWeight: bonusBalance > 0 ? 700 : 400 }}>
                {bonusBalance > 0
                  ? t('profile.bonusBalance', { amount: bonusBalance.toLocaleString() })
                  : t('profile.inviteDesc', { percent: REFERRAL_DISCOUNT, amount: DISCOUNT_AMOUNT.toLocaleString() })}
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
              <span className="pp-menu-label">{t('settings.title')}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t('profile.settingsDesc')}</span>
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {isAdmin && (
            <button className="pp-menu-item" onClick={() => navigate('/admin')}>
              <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#fff' }}>
                <Shield size={20} />
              </div>
              <span className="pp-menu-label">{t('profile.adminPanel')}</span>
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
      {showAvatarPicker && (
        <AvatarPickerModal
          current={avatarId}
          onSelect={handlePickAvatar}
          onClose={() => setShowAvatarPicker(false)}
          displayName={displayName}
        />
      )}
    </motion.div>
  );
}
