/**
 * SettingsPage.jsx — Sozlamalar sahifasi (/settings)
 * Profildan ajratilgan: tema, shrift, takrorlash, eslatma, oflayn,
 * PWA, parol, profil tahriri, ma'lumot, hisob (chiqish/o'chirish), FAQ.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Moon, Sun, BookOpen, Type, Edit3, LogOut, ChevronRight, Shield, Download, Send, Brain, KeyRound } from 'lucide-react';
import PremiumModal from '../components/PremiumModal';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { PWAContext } from '../context/PWAContext';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, updateProfile } from 'firebase/auth';
import { useModalBackButton } from '../components/profile/useModalBackButton';
import EditProfileModal from '../components/profile/EditProfileModal';
import PasswordModal from '../components/profile/PasswordModal';
import RepetitionModal from '../components/profile/RepetitionModal';
import TelegramReminderModal from '../components/profile/TelegramReminderModal';
import GuideModal from '../components/profile/GuideModal';
import PrivacyModal from '../components/profile/PrivacyModal';
import ConfirmLogoutModal from '../components/profile/ConfirmLogoutModal';
import ConfirmDeleteModal from '../components/profile/ConfirmDeleteModal';
import './ProfilePage.css';

const PROFILE_FAQS = [
  {
    q: "Premium obuna nimalarni beradi?",
    a: "Premium obuna barcha mavzulardagi savollarni cheksiz yechish, har bir savol uchun batafsil tahlil va mnemonika (eslab qolish texnikasi) bilan tanishish hamda oflayn rejimda ishlatish imkonini beradi."
  },
  {
    q: "To'lovlar qanday amalga oshiriladi va xavfsizmi?",
    a: "To'lovlar 100% xavfsiz Click, Payme yoki Telegram bot orqali to'g'ridan-to'g'ri o'tkaziladi. Barcha tranzaksiyalar shifrlangan."
  },
  {
    q: "Premium faollashishi uchun qancha vaqt ketadi?",
    a: "Click va Payme orqali to'lovlar avtomatik tarzda 5 soniyada faollashadi. Telegram bot orqali chek yuborilganda esa admin tomonidan 5-10 daqiqada tasdiqlanadi."
  },
  {
    q: "Savollar bazasi qanchalik tez-tez yangilanadi?",
    a: "Savollarimiz professional ekspertlar tomonidan har hafta yangilanib, eng so'nggi milliy sertifikatlash va malaka oshirish standartlariga moslashtiriladi."
  }
];

const FONT_SCALES = [
  { label: 'S', value: 0.9 },
  { label: 'M', value: 1 },
  { label: 'L', value: 1.1 },
  { label: 'XL', value: 1.25 },
];

export default function SettingsPage({ theme, toggleTheme }) {
  const { user, logout, changePassword } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { isInstallable, installApp } = useContext(PWAContext);
  const navigate = useNavigate();

  const isPremium = user?.isPremium || false;

  // Modal holatlari
  const [showEdit, setShowEdit] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRepetitionModal, setShowRepetitionModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState(null);

  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', age: '', gender: '', birthDate: '', subject: '', teacherCategory: '' });
  const [saving, setSaving] = useState(false);

  const [downloadingOffline, setDownloadingOffline] = useState(false);

  // Shrift o'lchami — faqat savol/variant/izoh matnlariga ta'sir qiladi
  const [fontScale, setFontScale] = useState(() => {
    const saved = parseFloat(localStorage.getItem('iqro-font-scale'));
    return saved && saved >= 0.8 && saved <= 1.5 ? saved : 1;
  });
  const applyFontScale = (v) => {
    setFontScale(v);
    localStorage.setItem('iqro-font-scale', String(v));
    document.documentElement.style.setProperty('--font-scale', v);
  };

  // Android "orqaga" tugmasi modallarni yopadi (popstate shartnomasi)
  const anyModalOpen = showEdit || showPasswordModal || showRepetitionModal || showTelegramModal
    || showGuideModal || showPrivacy || showLogoutConfirm || showDeleteConfirm || showPremium;
  useModalBackButton(anyModalOpen, () => {
    setShowEdit(false);
    setShowPasswordModal(false);
    setShowRepetitionModal(false);
    setShowTelegramModal(false);
    setShowGuideModal(false);
    setShowPrivacy(false);
    setShowLogoutConfirm(false);
    setShowDeleteConfirm(false);
    setShowPremium(false);
  });

  // Profil ma'lumotlarini yuklash (tahrir formasi uchun)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const dn = d.displayName || user.displayName || '';
        setEditForm({
          firstName: d.firstName ?? (dn.split(' ')[0] || ''),
          lastName: d.lastName ?? (dn.split(' ').slice(1).join(' ') || ''),
          age: d.age || '',
          gender: d.gender || '',
          birthDate: d.birthDate || '',
          subject: d.subject || '',
          teacherCategory: d.teacherCategory || '',
        });
      }
    }).catch(e => console.error('Profile load error:', e));
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
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
      await deleteDoc(doc(db, 'userStats', uid)).catch(e => console.log(e));
      await deleteDoc(doc(db, 'users', uid)).catch(e => console.log(e));
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

  const handleDownloadOffline = async () => {
    if (downloadingOffline) return;
    setDownloadingOffline(true);
    try {
      const cat = state.activeCategory || 'chqbt';
      const versionSnap = await getDoc(doc(db, 'settings', 'version'));

      let remoteVersion = 0;
      let storageUrls = {};
      if (versionSnap.exists()) {
        const vData = versionSnap.data();
        remoteVersion = vData.dbVersion || 0;
        storageUrls = vData.urls || {};
      }

      // v2: old Storage-bundle caches are invalidated; consistent with TestPage/ExamPage
      const downloadUrl = storageUrls[cat];
      if (downloadUrl) {
        const res = await fetch(downloadUrl);
        const rawList = await res.json();

        const localforage = (await import('localforage')).default;
        await localforage.setItem(`bundle_v2_${cat}`, rawList);
        await localforage.setItem(`version_v2_${cat}`, remoteVersion);

        showToast(`Tayyor! ${rawList.length} ta savol offline rejim uchun keshlandi ✅`, 'success');
      } else {
        showToast("Hozircha serverda offline ma'lumotlar tayyor emas.", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("Offline yuklashda xatolik yuz berdi", 'error');
    } finally {
      setDownloadingOffline(false);
    }
  };

  // Segmentli tanlov tugmasi uslubi
  const segBtn = (selected) => ({
    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
    background: selected ? 'var(--bg2)' : 'transparent',
    color: selected ? 'var(--accent)' : 'var(--text3)',
    boxShadow: selected ? '0 2px 8px rgba(30,42,58,0.08)' : 'none',
    transition: 'all 0.2s',
  });

  return (
    <motion.div className="pp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="pp-content" style={{ paddingTop: 16 }}>
        {/* ═══ SARLAVHA ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            onClick={() => navigate('/profile')}
            style={{
              width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg2)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Sozlamalar</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user.displayName || 'Foydalanuvchi'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* ═══════ PREMIUM BANNER (Wisdom uslubi: sozlamalar tepasida) ═══════ */}
          {isPremium ? (
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              title="Premium obunani boshqarish"
              style={{
              padding: '20px 18px', borderRadius: '18px', marginTop: 4,
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
                    : 'Barcha imkoniyatlar ochiq'}
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
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPremium(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', marginTop: 4,
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
                width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
              }}>👑</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 2 }}>IQRO Premium</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  Ko'proq imkoniyat uchun Premium oling
                </div>
              </div>
              <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
            </motion.button>
          )}

          {/* ═══════ Sozlamalar ro'yxati (Wisdom uslubi: bitta guruhlangan karta, sarlavhasiz) ═══════ */}
          <div className="pp-group">
          {/* Tema tanlash: Kunduzgi / Sepia (o'qish) / Tungi */}
          <div className="pp-menu-item" style={{ cursor: 'default' }}>
            <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              {theme === 'dark' ? <Moon size={20} /> : theme === 'sepia' ? <BookOpen size={20} /> : <Sun size={20} />}
            </div>
            <span className="pp-menu-label">Rejim</span>
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', padding: 3, borderRadius: 10, flexShrink: 0 }}>
              {[
                { id: 'light', label: 'Kun' },
                { id: 'sepia', label: 'Sepia' },
                { id: 'dark', label: 'Tun' },
              ].map(t => (
                <button key={t.id} onClick={() => toggleTheme(t.id)} style={segBtn(theme === t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shrift o'lchami */}
          <div className="pp-menu-item" style={{ cursor: 'default' }}>
            <div className="pp-menu-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
              <Type size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label">Shrift o'lchami</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Savol va javob matnlariga ta'sir qiladi</span>
            </div>
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', padding: 3, borderRadius: 10, flexShrink: 0 }}>
              {FONT_SCALES.map(f => (
                <button key={f.label} onClick={() => applyFontScale(f.value)} style={{ ...segBtn(fontScale === f.value), padding: '6px 10px' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <button className="pp-menu-item" onClick={() => setShowEdit(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
              <Edit3 size={20} />
            </div>
            <span className="pp-menu-label">Profilni tahrirlash</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          <button className="pp-menu-item" onClick={() => setShowPasswordModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
              <KeyRound size={20} />
            </div>
            <span className="pp-menu-label">Parolni o'zgartirish</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          <button className="pp-menu-item" onClick={() => setShowRepetitionModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
              <Brain size={20} />
            </div>
            <span className="pp-menu-label">Aqlli takrorlash chastotasi</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          <button className="pp-menu-item" onClick={() => setShowTelegramModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
              <Send size={20} />
            </div>
            <span className="pp-menu-label">Kundalik eslatma (Telegram)</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          <button className="pp-menu-item" onClick={handleDownloadOffline}>
            <div className="pp-menu-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <Download size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="pp-menu-label" style={{ fontWeight: 800, color: 'var(--green)' }}>
                {downloadingOffline ? 'Yuklanmoqda...' : "Oflayn ishlash (Kafolat)"}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Internetsiz ishlash uchun savollarni yuklash</span>
            </div>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          {isInstallable && (
            <button className="pp-menu-item" onClick={installApp}>
              <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}>
                <Download size={20} />
              </div>
              <span className="pp-menu-label" style={{ fontWeight: 800 }}>Ilovani o'rnatish (PWA)</span>
              <ChevronRight size={18} className="pp-menu-arrow" />
            </button>
          )}

          <button className="pp-menu-item" onClick={() => setShowGuideModal(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
              <div style={{ fontSize: 16 }}>📖</div>
            </div>
            <span className="pp-menu-label">Foydalanish qo'llanmasi</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          <button className="pp-menu-item" onClick={() => setShowPrivacy(true)}>
            <div className="pp-menu-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#EC4899' }}>
              <Shield size={20} />
            </div>
            <span className="pp-menu-label">Maxfiylik siyosati</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>
          </div>

          {/* ═══════ Hisob amallari (alohida guruh) ═══════ */}
          <div className="pp-group">
          <button className="pp-menu-item" onClick={() => setShowDeleteConfirm(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
              <Shield size={20} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <span className="pp-menu-label" style={{ color: 'var(--red)' }}>Hisobni o'chirish</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>

          <button className="pp-menu-item danger" onClick={() => setShowLogoutConfirm(true)}>
            <div className="pp-menu-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
              <LogOut size={20} />
            </div>
            <span className="pp-menu-label">Chiqish</span>
            <ChevronRight size={18} className="pp-menu-arrow" />
          </button>
          </div>
        </div>

        {/* ═══ TRUST BADGES + FAQ ═══ */}
        <div className="pp-card" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
              🛡️ Xavfsizlik va Kafolat
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              {[
                { icon: '🔒', title: 'Click & Payme', sub: "100% Xavfsiz to'lov" },
                { icon: '⚡', title: 'Tezkor Faol', sub: 'Avtomat yoqiladi' },
                { icon: '📱', title: 'Oflayn Kafolat', sub: 'Internetsiz ishlaydi' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'var(--bg3)', padding: '12px 6px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '20px' }}>{b.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text)' }}>{b.title}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text3)' }}>{b.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
              ❓ To'lov va Premium bo'yicha FAQ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PROFILE_FAQS.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: isOpen ? 'var(--blue)' : 'var(--text)',
                        minHeight: '48px',
                      }}
                    >
                      <span>{faq.q}</span>
                      <span style={{ fontSize: '14px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text3)' }}>
                        ▾
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '0 14px 12px 14px', fontSize: '12px', color: 'var(--text3)', lineHeight: '1.6' }}>
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODALLAR ═══ */}
      {showEdit && (
        <EditProfileModal
          form={editForm}
          setForm={setEditForm}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showPasswordModal && (
        <PasswordModal
          changePassword={changePassword}
          showToast={showToast}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
      {showRepetitionModal && (
        <RepetitionModal
          value={state.repetitionLimit ?? 10}
          onChange={(v) => { updateState({ repetitionLimit: v }); showToast('Saqlandi ✅', 'success'); }}
          onClose={() => setShowRepetitionModal(false)}
        />
      )}
      {showTelegramModal && (
        <TelegramReminderModal
          user={user}
          enabled={!!state.telegramEnabled}
          updateState={updateState}
          showToast={showToast}
          onClose={() => setShowTelegramModal(false)}
        />
      )}
      <AnimatePresence>
        {showGuideModal && (
          <GuideModal showToast={showToast} onClose={() => setShowGuideModal(false)} />
        )}
      </AnimatePresence>
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showLogoutConfirm && (
        <ConfirmLogoutModal onLogout={handleLogout} onClose={() => setShowLogoutConfirm(false)} />
      )}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          deleting={deleting}
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
      {showPremium && <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />}
    </motion.div>
  );
}
