import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { resolveAvatar, avatarUrl } from '../data/avatars';
import { SUBJECTS } from '../data/mockData';
import { APP_URL, SUPPORT_URL, APP_VERSION } from '../config';
import NotificationBell from './NotificationBell';
import PremiumModal from './PremiumModal';
import EditProfileModal from './profile/EditProfileModal';
import AvatarPickerModal from './profile/AvatarPickerModal';
import { useModalBackButton } from './profile/useModalBackButton';
import { useAdmin } from '../hooks/useAdmin';
import {
  Award, AlertCircle, Settings, Info, Users, Shield, Crown, Check, ChevronRight,
  Sun, BookOpen, Moon, Pencil, Camera, Share2, Send
} from 'lucide-react';

// ── Sokin/jiddiy uslub — kir kulrang (--bg3) o'rniga chegarali --surface ──
const actionBtn = { flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };
const menuBtn = { width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '9px 10px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' };
const iconCircle = { flexShrink: 0, width: 38, height: 38, borderRadius: '50%', background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const menuLabel = { flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text)' };
const cardBtn = { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,27,45,0.04)' };
const iconCircleSolid = { flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const urgBlk = { flex: '1 1 0', minWidth: 0, textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 2px', fontSize: 16, fontWeight: 800, color: 'var(--text)', display: 'flex', flexDirection: 'column', lineHeight: 1.1 };
const urgSmall = { fontSize: 8.5, fontWeight: 600, color: 'var(--text3)', marginTop: 2 };

// Telefonni o'qishli ko'rsatish (login email = <raqam>@iqro.uz bo'lishi mumkin)
const formatPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  if (d.length === 9) return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  return (raw && !String(raw).includes('@')) ? raw : '';
};

/**
 * ProfileDrawer — chapdan chiqadigan YAGONA profil paneli (Click uslubi: sokin, toza).
 * Statistika /achievements (Yutuqlar)ga ko'chirildi — bu yerda faqat "Darajangiz" kartasi.
 * Chiqish Sozlamalar ichida (tasodifan chiqib ketmaslik uchun).
 */
const ProfileDrawer = ({ open, onClose, theme, toggleTheme, user }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { updateUserData } = useAuth();
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();

  const [showPremium, setShowPremium] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSubject, setProfileSubject] = useState('');
  const [profileToifa, setProfileToifa] = useState('');
  const [avatarId, setAvatarId] = useState(user?.avatarId || null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', age: '', gender: '', birthDate: '', subject: '', teacherCategory: '' });
  const [urgencyLeft, setUrgencyLeft] = useState(user?.urgencyMs || 0);

  // Drawerning o'zi uchun orqaga qaytish tugmasini boshqarish
  useModalBackButton(open, onClose);

  useModalBackButton(showPremium || showEdit || showAvatarPicker, () => {
    setShowPremium(false); setShowEdit(false); setShowAvatarPicker(false);
  });

  // Profil ma'lumotlarini Firestore'dan yuklash
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const dn = d.displayName || user.displayName || '';
      if (d.displayName) setProfileName(d.displayName);
      setAvatarId(d.avatarId || null);
      setProfileSubject(d.subject || '');
      setProfileToifa(d.teacherCategory || '');
      setEditForm({
        firstName: d.firstName ?? (dn.split(' ')[0] || ''),
        lastName: d.lastName ?? (dn.split(' ').slice(1).join(' ') || ''),
        age: d.age || '', gender: d.gender || '', birthDate: d.birthDate || '',
        subject: d.subject || '', teacherCategory: d.teacherCategory || '',
      });
      if (d.examDate) {
        localStorage.setItem('iqro_exam_date', d.examDate);
        localStorage.setItem('CUSTOM_EXAM_DATE', new Date(d.examDate).toISOString());
      }
    }).catch(e => console.error('Profile load error:', e));
  }, [user]);

  // Urgency (72h) sanagich
  useEffect(() => {
    if (user?.trialStatus !== 'urgency' || urgencyLeft <= 0) return;
    const iv = setInterval(() => {
      setUrgencyLeft(prev => { if (prev <= 1000) { clearInterval(iv); return 0; } return prev - 1000; });
    }, 1000);
    return () => clearInterval(iv);
  }, [user?.trialStatus, urgencyLeft]);

  if (!user) return null;

  // ── Hisoblangan qiymatlar ──
  const displayName = profileName || user.displayName || user.email?.split('@')[0] || t('common.userFallback');
  const initials = (displayName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarSrc = avatarUrl(avatarId) || resolveAvatar(user) || null;
  const isTruePremium = user.isTruePremium || false;
  const trialStatus = user.trialStatus || 'expired';
  const trialDaysLeft = user.trialDaysLeft || 0;
  const phoneDisplay = formatPhone(user.phoneNumber || ((user.email && /^\d{9,15}@/.test(user.email)) ? user.email.split('@')[0] : ''));
  const subjectLine = (profileSubject || profileToifa)
    ? [profileSubject && t('profile.teacherOf', { subject: SUBJECTS.find(s => s.id === profileSubject)?.name || '' }), profileToifa && t(`modals.toifa.${profileToifa}`)].filter(Boolean).join(' · ')
    : '';

  const fmtUrgency = () => {
    const ms = urgencyLeft;
    return {
      d: Math.floor(ms / 86400000),
      h: String(Math.floor((ms % 86400000) / 3600000)).padStart(2, '0'),
      m: String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0'),
      s: String(Math.floor((ms % 60000) / 1000)).padStart(2, '0'),
    };
  };
  const urg = fmtUrgency();

  // ── Harakatlar ──
  const go = (path) => { onClose(); navigate(path); };

  const handlePickAvatar = async (id) => {
    setAvatarId(id);
    setShowAvatarPicker(false);
    try {
      await setDoc(doc(db, 'users', user.uid), { avatarId: id || null }, { merge: true });
      updateUserData({ avatarId: id || null });
      showToast(id ? t('profile.avatarUpdated') : t('profile.avatarRemoved'), 'success');
    } catch (err) {
      console.error('Avatar saqlash xatosi:', err);
      showToast(t('exam.toastError'), 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSavingEdit(true);
    try {
      const dn = `${editForm.firstName || ''} ${editForm.lastName || ''}`.trim();
      await setDoc(doc(db, 'users', user.uid), {
        displayName: dn,
        firstName: editForm.firstName || '', lastName: editForm.lastName || '',
        age: editForm.age || '', gender: editForm.gender || '', birthDate: editForm.birthDate || '',
        subject: editForm.subject || '', teacherCategory: editForm.teacherCategory || '',
      }, { merge: true });
      if (dn && auth.currentUser) {
        try { await updateProfile(auth.currentUser, { displayName: dn }); } catch (e) { console.warn('updateProfile:', e); }
      }
      if (dn) { setProfileName(dn); updateUserData({ displayName: dn }); }
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

  const shareApp = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Toifa Pro', text: t('drawer.shareText', 'Toifa Pro — kasbiy attestatsiyaga tayyorgarlik platformasi'), url: APP_URL });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(APP_URL);
        showToast(t('common.copied', 'Havola nusxalandi'), 'success');
      }
    } catch (e) { /* foydalanuvchi bekor qildi */ }
  };

  const contactSupport = () => { window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer'); };

  // Joriy tema yorlig'i
  const themeMeta = theme === 'dark'
    ? { Icon: Moon, label: t('header.themeDark', 'Tungi') }
    : theme === 'sepia'
      ? { Icon: BookOpen, label: t('header.themeSepia', 'Sepia') }
      : { Icon: Sun, label: t('header.themeLight', 'Kunduzgi') };
  const ThemeIcon = themeMeta.Icon;

  const menuItems = [
    { icon: Award, label: t('sidebar.achievements', 'Yutuqlarim'), path: '/achievements' },
    { icon: Users, label: t('sidebar.invite', "Do'stni taklif qilish"), path: '/referral' },
    { icon: AlertCircle, label: t('sidebar.errors', 'Xatolar daftari'), path: '/errors' },
    { icon: Settings, label: t('sidebar.settings', 'Sozlamalar'), path: '/settings' },
    { icon: Info, label: t('sidebar.about', 'Dastur haqida'), path: '/about' },
  ];
  if (isAdmin) menuItems.push({ icon: Shield, label: t('sidebar.admin', 'Admin'), path: '/admin' });

  // Obuna banner mazmuni (holatga qarab)
  const subTitle = isTruePremium
    ? t('profile.premiumActive', 'Obuna faol')
    : trialStatus === 'trial'
      ? t('profile.trialActive', 'Bepul sinov faol')
      : (trialStatus === 'urgency' && urgencyLeft > 0)
        ? t('profile.urgencyExpired', 'Sinov tugadi')
        : t('drawer.subTitle', 'Toifa Pro Obunasi');
  const premiumExpireDate = user.premiumExpire ? new Date(user.premiumExpire) : null;
  const premiumDaysLeft = premiumExpireDate
    ? Math.max(0, Math.ceil((premiumExpireDate.getTime() - Date.now()) / 86400000))
    : null;
  const subDesc = isTruePremium
    ? (premiumExpireDate
        ? t('profile.premiumExpires', {
            date: premiumExpireDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }),
            days: premiumDaysLeft,
          })
        : t('profile.premiumLifetime', 'Muddatsiz'))
    : trialStatus === 'trial'
      ? t('profile.trialActiveDesc', { days: trialDaysLeft })
      : t('profile.premiumBuyDesc', 'Cheksiz testlar, reklamasiz, batafsil tahlil');

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,30,0.45)', backdropFilter: 'blur(2px)', zIndex: 1100 }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: 'min(86vw, 350px)',
                background: 'var(--bg2)', zIndex: 1101, display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 60px rgba(0,0,0,0.30)', borderRadius: '0 24px 24px 0',
                overflowY: 'auto',
              }}
            >
              {/* ── Shaxsiy sarlavha ── */}
              <div style={{ padding: '22px 18px 10px' }}>
                {/* 1-qator: Avatar chapda, Tahrirlash va Bildirishnoma o'ngda */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  {/* Avatar — bosilganda tanlagich ochiladi */}
                  <button
                    onClick={() => setShowAvatarPicker(true)}
                    title={t('profile.avatarPick', 'Avatar tanlash')}
                    style={{ position: 'relative', flexShrink: 0, width: 58, height: 58, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span style={{ display: 'flex', width: 58, height: 58, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 800, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
                      {avatarSrc
                        ? <img src={avatarSrc} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span>{initials}</span>}
                    </span>
                    <span style={{ position: 'absolute', bottom: -2, right: -2, width: 21, height: 21, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={11} color="#fff" />
                    </span>
                  </button>

                  {/* Tahrirlash + bildirishnoma */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setShowEdit(true)} title={t('settings.editProfile', 'Profilni tahrirlash')} aria-label={t('settings.editProfile', 'Profilni tahrirlash')} style={actionBtn}>
                      <Pencil size={18} />
                    </button>
                    <NotificationBell iconSize={19} buttonClassName="" buttonStyle={actionBtn} />
                  </div>
                </div>

                {/* 2-qator: Ism-familiya, telefon va status */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, overflowWrap: 'break-word' }}>{displayName}</div>
                  {phoneDisplay && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginTop: 3 }}>{phoneDisplay}</div>}
                  {user.shortId && <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text3)', marginTop: 3, letterSpacing: 0.3 }}>ID: {user.shortId}</div>}
                  <div style={{ fontSize: 12, fontWeight: 600, color: isTruePremium ? 'var(--amber)' : 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isTruePremium && <Crown size={12} />}
                    {isTruePremium ? t('profile.premiumActive', 'Obuna faol') : t('header.freeAccount', 'Oddiy hisob')}
                  </div>
                </div>

                {subjectLine && (
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text3)', marginTop: 12, paddingLeft: 2 }}>{subjectLine}</div>
                )}
              </div>

              {/* ── Obuna banneri (Click uslubi) ── */}
              <div style={{ padding: '12px 16px 0' }}>
                <button
                  onClick={() => setShowPremium(true)}
                  style={{ width: '100%', textAlign: 'left', borderRadius: 18, padding: 18, border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--blue-bg), var(--surface))', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ paddingRight: 52 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{subTitle}</div>
                    {(trialStatus === 'urgency' && urgencyLeft > 0 && !isTruePremium) ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <span style={urgBlk}>{urg.d}<small style={urgSmall}>{t('profile.urgDay', 'kun')}</small></span>
                        <span style={urgBlk}>{urg.h}<small style={urgSmall}>{t('profile.urgHour', 'soat')}</small></span>
                        <span style={urgBlk}>{urg.m}<small style={urgSmall}>{t('profile.urgMin', 'daq')}</small></span>
                        <span style={urgBlk}>{urg.s}<small style={urgSmall}>{t('profile.urgSec', 'son')}</small></span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 5, lineHeight: 1.45 }}>{subDesc}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, color: isTruePremium ? 'var(--amber)' : 'var(--accent)', fontWeight: 800, fontSize: 13.5 }}>
                      {isTruePremium
                        ? <><Check size={15} /> {t('profile.premiumManage', 'Boshqarish')}</>
                        : <>{t('header.premiumBuy', "Obuna bo'lish")} <ChevronRight size={15} /></>}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: 16, bottom: 14, width: 50, height: 50, borderRadius: 15, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}>
                    <Crown size={26} color={isTruePremium ? 'var(--amber)' : 'var(--accent)'} />
                  </div>
                </button>
              </div>

              {/* ── Menyu (doira ikonkalar) ── */}
              <div style={{ padding: '14px 14px 0' }}>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.path} onClick={() => go(item.path)} style={menuBtn}>
                      <span style={iconCircle}><Icon size={19} color="var(--accent)" strokeWidth={2} /></span>
                      <span style={menuLabel}>{item.label}</span>
                      <ChevronRight size={17} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>

              {/* ── Ko'rinish (tema) ── */}
              <div style={{ padding: '14px 16px 4px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>{t('header.appearance', "Ko'rinish")}</div>
                <button
                  onClick={() => toggleTheme && toggleTheme()}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <ThemeIcon size={19} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{themeMeta.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>{t('header.tapToSwitch', 'Bosing')}</span>
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 12 }} />

              {/* ── Ilovani ulashish + Biz bilan bog'lanish (Click uslubi) ── */}
              <div style={{ padding: '8px 16px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={shareApp} style={cardBtn}>
                  <span style={iconCircleSolid}><Share2 size={20} color="#fff" /></span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('drawer.shareApp', 'Ilovani ulashish')}</span>
                </button>
                <button onClick={contactSupport} style={cardBtn}>
                  <span style={iconCircleSolid}><Send size={19} color="#fff" /></span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('drawer.contact', "Biz bilan bog'lanish")}</span>
                </button>
              </div>

              {/* ── Drawer footer (versiya va logo) ── */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                padding: '12px 0 20px',
                userSelect: 'none',
                flexShrink: 0
              }}>
                {/* 22px ikonka */}
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  background: '#0E97E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.05em',
                    lineHeight: 1,
                    marginTop: '-1.5px'
                  }}>tp</span>
                </div>
                {/* ToifaPro Wordmark */}
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1
                }}>
                  <span style={{ color: theme === 'dark' ? '#F4F6F9' : '#0F1B2D' }}>Toifa</span>
                  <span style={{ color: theme === 'dark' ? '#36ABEC' : '#0E97E0' }}>Pro</span>
                </span>
                {/* v2.0 */}
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: theme === 'dark' ? '#5A606A' : '#94A3B8',
                  marginLeft: '2px'
                }}>
                  v{APP_VERSION}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modallar — drawer ustida (z-index 9999) ochiladi */}
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
    </>
  );
};

export default ProfileDrawer;
