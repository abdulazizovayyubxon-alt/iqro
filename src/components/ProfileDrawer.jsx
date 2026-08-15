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
import { ageFromBirthDate } from '../utils/age';
import { writeContract, hydrateContract } from '../services/studyContract';
import NotificationBell from './NotificationBell';
import PremiumModal from './PremiumModal';
import EditProfileModal from './profile/EditProfileModal';
import AvatarPickerModal from './profile/AvatarPickerModal';
import { useModalBackButton } from './profile/useModalBackButton';
import { useAdmin } from '../hooks/useAdmin';
import { usePartner } from '../hooks/usePartner';
import BrandLogo from './shared/BrandLogo';

import {
  Award, Settings, Users, Shield, Crown, ChevronRight,
  Pencil, Camera, Share2, Send, School, BarChart3, ListChecks,
  Sparkles
} from 'lucide-react';

// ── Sokin/jiddiy uslub — kir kulrang (--bg3) o'rniga chegarali --surface ──
// Balandliklar ataylab ixcham: panel oddiy foydalanuvchida skrollsiz sig'ishi kerak.
const actionBtn = { flexShrink: 0, width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };
const menuBtn = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', minHeight: 48 };
const iconCircle = { flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const menuLabel = { flex: 1, fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text)' };
// Ulashish/Aloqa — 2 ustunli ixcham kartalar (ilgari to'liq kenglikdagi 2 qator edi)
const miniCard = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '11px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,27,45,0.04)' };
const iconCircleSolid = { flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const miniLabel = { fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.25 };
const urgBlk = { flex: '1 1 0', minWidth: 0, textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 2px', fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)', display: 'flex', flexDirection: 'column', lineHeight: 1.1 };
const urgSmall = { fontSize: 'var(--fs-3xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 2 };

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
 *
 * MAQSAD: panel oddiy foydalanuvchida SKROLLSIZ sig'ishi kerak. Shu sababli menyu
 * qisqa (Yutuqlar / Taklif / Sozlamalar), qolgan bo'limlar o'z kontekstiga
 * ko'chirilgan: Tahlil va Xatolar daftari → Sozlamalar > O'rganish,
 * Dastur haqida → Sozlamalar > Ma'lumot, Tahlil kirish nuqtasi → Dashboard.
 */
const ProfileDrawer = ({ open, onClose, theme, user }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { updateUserData } = useAuth();
  const { showToast } = useContext(ToastContext);
  const { isAdmin } = useAdmin();
  const { isPartner } = usePartner();

  const [showPremium, setShowPremium] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSubject, setProfileSubject] = useState('');
  const [profileToifa, setProfileToifa] = useState('');
  const [avatarId, setAvatarId] = useState(user?.avatarId || null);
  const [schoolId, setSchoolId] = useState(user?.schoolId || null);
  // `age` forma maydoni EMAS — tug'ilgan sanadan hisoblanadi (utils/age.js)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', gender: '', birthDate: '', subject: '', teacherCategory: '' });
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
      setSchoolId(d.schoolId || null);
      setProfileSubject(d.subject || '');
      setProfileToifa(d.teacherCategory || '');
      setEditForm({
        firstName: d.firstName ?? (dn.split(' ')[0] || ''),
        lastName: d.lastName ?? (dn.split(' ').slice(1).join(' ') || ''),
        gender: d.gender || '', birthDate: d.birthDate || '',
        subject: d.subject || '', teacherCategory: d.teacherCategory || '',
      });
      if (d.examDate) {
        localStorage.setItem('iqro_exam_date', d.examDate);
        localStorage.setItem('CUSTOM_EXAM_DATE', new Date(d.examDate).toISOString());
      }
      // Boshqa qurilmada tanlangan toifa/byudjet shu qurilmaga ham yetib borsin
      hydrateContract(d);
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
        // Yosh alohida so'ralmaydi — sanadan hosila (eski hujjatlarda qolib
        // ketmasligi uchun sana bo'lmasa maydon tozalanadi)
        age: ageFromBirthDate(editForm.birthDate) ?? '',
        gender: editForm.gender || '', birthDate: editForm.birthDate || '',
        subject: editForm.subject || '', teacherCategory: editForm.teacherCategory || '',
      }, { merge: true });
      if (dn && auth.currentUser) {
        try { await updateProfile(auth.currentUser, { displayName: dn }); } catch (e) { console.warn('updateProfile:', e); }
      }
      if (dn) { setProfileName(dn); updateUserData({ displayName: dn }); }
      setProfileSubject(editForm.subject || '');
      setProfileToifa(editForm.teacherCategory || '');
      // Toifa = maqsad foizining manbasi. Profil orqali o'zgartirilsa, Dashboard
      // va Tahlildagi maqsad ham darhol shunga moslashadi.
      writeContract({ toifa: editForm.teacherCategory || null }, user.uid);
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
        await navigator.share({ title: 'Zehin', text: t('drawer.shareText', 'Zehin — kasbiy attestatsiyaga tayyorgarlik platformasi'), url: APP_URL });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(APP_URL);
        showToast(t('common.copied', 'Havola nusxalandi'), 'success');
      }
    } catch (e) { /* foydalanuvchi bekor qildi */ }
  };

  const contactSupport = () => { window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer'); };

  // Menyu tartibi «o'quv yo'li» bo'yicha: avval bugun nima qilish kerak (Reja),
  // keyin qayerda turibman (Tahlil), keyin nimaga erishdim (Yutuqlar).
  // Dastur haqida → Sozlamalar > Ma'lumot. Maktab faqat admin/a'zolarga.
  const menuItems = [
    { icon: ListChecks, label: t('sidebar.plan', 'Bugungi reja'), path: '/analysis?tab=plan' },
    { icon: BarChart3, label: t('sidebar.analysis', 'Tahlil'), path: '/analysis' },
    { icon: Award, label: t('sidebar.achievements', 'Yutuqlarim'), path: '/achievements' },
    { icon: Users, label: t('sidebar.invite', "Do'stni taklif qilish"), path: '/referral' },
    { icon: Settings, label: t('sidebar.settings', 'Sozlamalar'), path: '/settings' },
  ];
  if (isAdmin || schoolId) menuItems.push({ icon: School, label: t('sidebar.school', 'Maktab'), path: '/school' });
  // Shart `usePartner` da — server tekshiruvi bilan bir xil bo'lishi kerak,
  // aks holda menyu ochiladi-yu, sahifa «huquqingiz yo'q» beradi.
  if (isPartner) {
    menuItems.push({ icon: Sparkles, label: t('sidebar.partner', 'Hamkor paneli'), path: '/partner' });
  }
  if (isAdmin) menuItems.push({ icon: Shield, label: t('sidebar.admin', 'Admin'), path: '/admin' });

  // Obuna banner mazmuni (holatga qarab)
  const subTitle = isTruePremium
    ? t('profile.premiumActive', 'Obuna faol')
    : trialStatus === 'trial'
      ? t('profile.trialActive', 'Bepul sinov faol')
      : (trialStatus === 'urgency' && urgencyLeft > 0)
        ? t('profile.urgencyExpired', 'Sinov tugadi')
        : t('drawer.subTitle', 'Zehin Obunasi');
  const premiumExpireDate = user.premiumExpire ? new Date(user.premiumExpire) : null;
  const premiumDaysLeft = premiumExpireDate
    ? Math.max(0, Math.ceil((premiumExpireDate.getTime() - Date.now()) / 86400000))
    : null;
  const subDesc = isTruePremium
    ? (premiumExpireDate
        ? t('profile.premiumExpires', {
            date: premiumExpireDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }),
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
                position: 'fixed', top: 0, left: 0, bottom: 0, width: 'var(--drawer-w)',
                background: 'var(--bg2)', zIndex: 1101, display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 60px rgba(0,0,0,0.30)', borderRadius: '0 24px 24px 0',
                overflowY: 'auto',
              }}
            >
              {/* ── Shaxsiy sarlavha (zich: 5 qator o'rniga 3) ── */}
              <div style={{ padding: '18px 18px 6px' }}>
                {/* 1-qator: Avatar chapda, Tahrirlash va Bildirishnoma o'ngda */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  {/* Avatar — bosilganda tanlagich ochiladi */}
                  <button
                    onClick={() => setShowAvatarPicker(true)}
                    title={t('profile.avatarPick', 'Avatar tanlash')}
                    style={{ position: 'relative', flexShrink: 0, width: 54, height: 54, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span style={{ display: 'flex', width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-3xl)', fontWeight: 800, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
                      {avatarSrc
                        ? <img src={avatarSrc} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span>{initials}</span>}
                    </span>
                    <span style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                {/* 2-qator: Ism · 3-qator: telefon + ID · 4-qator: status + fan/toifa */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, overflowWrap: 'break-word' }}>{displayName}</div>

                  {(phoneDisplay || user.shortId) && (
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text2)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {phoneDisplay && <span>{phoneDisplay}</span>}
                      {phoneDisplay && user.shortId && <span style={{ color: 'var(--text3)' }}>·</span>}
                      {user.shortId && <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', letterSpacing: 0.3 }}>ID: {user.shortId}</span>}
                    </div>
                  )}

                  <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isTruePremium ? 'var(--accent)' : 'var(--text3)' }}>
                      {isTruePremium && <Crown size={12} />}
                      {isTruePremium ? t('profile.premiumActive', 'Obuna faol') : t('header.freeAccount', 'Oddiy hisob')}
                    </span>
                    {subjectLine && (
                      <>
                        <span style={{ color: 'var(--text3)' }}>·</span>
                        <span style={{ fontWeight: 500, color: 'var(--text3)' }}>{subjectLine}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Menyu (doira ikonkalar) ── */}
              <div style={{ padding: '10px 14px 0' }}>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.path} onClick={() => go(item.path)} style={menuBtn}>
                      <span style={iconCircle}><Icon size={18} color="var(--accent)" strokeWidth={2} /></span>
                      <span style={menuLabel}>{item.label}</span>
                      <ChevronRight size={17} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>

              {/* ── Obuna banneri (Click uslubi: azure gradient, dekorativ toj — ixcham) ── */}
              <div style={{ padding: '12px 16px 4px' }}>
                <button
                  onClick={() => setShowPremium(true)}
                  style={{
                    width: '100%', textAlign: 'left', borderRadius: 18, padding: '16px 18px 15px',
                    border: '1px solid var(--border)',
                    background: 'linear-gradient(135deg, var(--surface) 0%, var(--blue-bg) 72%, rgba(14,151,224,0.18) 100%)',
                    cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
                    boxShadow: '0 10px 26px rgba(15,27,45,0.06)',
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ paddingRight: 64 }}>
                      <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', letterSpacing: -0.2, lineHeight: 1.2 }}>{subTitle}</div>
                      {(trialStatus === 'urgency' && urgencyLeft > 0 && !isTruePremium) ? (
                        <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                          <span style={urgBlk}>{urg.d}<small style={urgSmall}>{t('profile.urgDay', 'kun')}</small></span>
                          <span style={urgBlk}>{urg.h}<small style={urgSmall}>{t('profile.urgHour', 'soat')}</small></span>
                          <span style={urgBlk}>{urg.m}<small style={urgSmall}>{t('profile.urgMin', 'daq')}</small></span>
                          <span style={urgBlk}>{urg.s}<small style={urgSmall}>{t('profile.urgSec', 'son')}</small></span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 500, color: 'var(--text2)', marginTop: 6, lineHeight: 1.45 }}>{subDesc}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 13, color: 'var(--accent)', fontWeight: 800, fontSize: 'var(--fs-base)' }}>
                      {isTruePremium ? t('profile.premiumManage', 'Obunani boshqarish') : t('drawer.connect', 'Ulanish')}
                      <ChevronRight size={16} strokeWidth={2.6} />
                    </div>
                  </div>
                  {/* Dekorativ olmos — toj o'rnida: qirrali (brilliant) kesim, har
                      yoq alohida azure tonda. Toj bolalarcha ko'rinardi; olmos
                      «qimmatbaho» ma'nosini beradi va Click/bank uslubiga mos. */}
                  <svg width={84} height={84} viewBox="0 0 64 64" fill="none" aria-hidden="true"
                    style={{ position: 'absolute', right: 8, bottom: 6, filter: 'drop-shadow(0 10px 18px rgba(11,90,140,0.22))' }}>
                    {/* yuqori qism (toj yoqlari) */}
                    <path d="M17.6 7.2 H29.6 L22.4 21.6 H8 Z" fill="#8FD6F8" />
                    <path d="M29.6 7.2 H34.4 L41.6 21.6 H22.4 Z" fill="#C7EBFD" />
                    <path d="M34.4 7.2 H46.4 L56 21.6 H41.6 Z" fill="#5BBCEF" />
                    {/* pastki qism (pavilion) */}
                    <path d="M8 21.6 H22.4 L32 52.8 Z" fill="#2A9CDC" />
                    <path d="M22.4 21.6 H41.6 L32 52.8 Z" fill="#67C2F1" />
                    <path d="M41.6 21.6 H56 L32 52.8 Z" fill="#0B6FA9" />
                  </svg>
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 12 }} />

              {/* ── Ilovani ulashish + Biz bilan bog'lanish (2 ustunli ixcham kartalar) ── */}
              <div style={{ padding: '8px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={shareApp} style={miniCard}>
                  <span style={iconCircleSolid}><Share2 size={18} color="#fff" /></span>
                  <span style={miniLabel}>{t('drawer.shareApp', 'Ilovani ulashish')}</span>
                </button>
                <button onClick={contactSupport} style={miniCard}>
                  <span style={iconCircleSolid}><Send size={17} color="#fff" /></span>
                  <span style={miniLabel}>{t('drawer.contact', "Biz bilan bog'lanish")}</span>
                </button>
              </div>

              {/* ── Drawer footer (versiya va logo) ── */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 0 calc(12px + env(safe-area-inset-bottom))',
                userSelect: 'none',
                flexShrink: 0
              }}>
                <BrandLogo size={18} />
                {/* v2.0 */}
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 500,
                  color: theme === 'dark' ? '#5A606A' : '#94A3B8',
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
