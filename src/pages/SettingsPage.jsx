/**
 * SettingsPage.jsx — Sozlamalar sahifasi (/settings)
 * Bo'limlarga ajratilgan: Ko'rinish, Hisob, O'rganish, Ilova, Ma'lumot, Hisob amallari.
 * Marketing (premium banner / ishonch nishonlari / FAQ) /premium sahifasiga ko'chirildi.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Moon, Sun, BookOpen, Type, Edit3, LogOut, ChevronRight, Shield, Download, Send, Brain, KeyRound, Crown, FileText, Bell, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { PWAContext } from '../context/PWAContext';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, updateProfile } from 'firebase/auth';
import { APP_VERSION } from '../config';
import { enablePush, pushPermission } from '../services/push';
import { useModalBackButton } from '../components/profile/useModalBackButton';
import EditProfileModal from '../components/profile/EditProfileModal';
import PasswordModal from '../components/profile/PasswordModal';
import RepetitionModal from '../components/profile/RepetitionModal';
import TelegramReminderModal from '../components/profile/TelegramReminderModal';
import GuideModal from '../components/profile/GuideModal';
import PrivacyModal from '../components/profile/PrivacyModal';
import ConfirmLogoutModal from '../components/profile/ConfirmLogoutModal';
import BrandLogo from '../components/shared/BrandLogo';
import ConfirmDeleteModal from '../components/profile/ConfirmDeleteModal';
import './ProfilePage.css';

const FONT_SCALES = [
  { label: 'S', value: 0.9 },
  { label: 'M', value: 1 },
  { label: 'L', value: 1.1 },
  { label: 'XL', value: 1.25 },
];

// Bo'lim sarlavhasi uslubi
const sectionLabel = {
  fontSize: 12, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.6px', margin: '4px 4px 8px',
};

export default function SettingsPage({ theme, toggleTheme }) {
  const { t, i18n } = useTranslation();
  const { user, logout, changePassword } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);
  const { isInstallable, installApp } = useContext(PWAContext);
  const navigate = useNavigate();

  // Modal holatlari
  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRepetitionModal, setShowRepetitionModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', age: '', gender: '', birthDate: '', subject: '', teacherCategory: '' });
  const [saving, setSaving] = useState(false);

  const [downloadingOffline, setDownloadingOffline] = useState(false);

  // Push bildirishnomalar holati
  const [pushStatus, setPushStatus] = useState(() => pushPermission());
  const [pushBusy, setPushBusy] = useState(false);

  const handleEnablePush = async () => {
    if (pushStatus === 'granted') { showToast("Push bildirishnomalar allaqachon yoqilgan", 'info'); return; }
    if (pushStatus === 'denied') { showToast("Bildirishnomalar brauzerda bloklangan. Brauzer sozlamalaridan ruxsat bering.", 'error'); return; }
    setPushBusy(true);
    const res = await enablePush(user);
    setPushBusy(false);
    setPushStatus(pushPermission());
    if (res.ok) showToast("✅ Push bildirishnomalar yoqildi!", 'success');
    else if (res.reason === 'no_vapid') showToast("Push hali sozlanmagan (server kaliti yo'q).", 'info');
    else if (res.reason === 'denied') showToast("Ruxsat berilmadi.", 'error');
    else if (res.reason === 'unsupported') showToast("Bu qurilma/brauzer push'ni qo'llab-quvvatlamaydi.", 'error');
    else showToast("Push yoqishda xatolik.", 'error');
  };

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
    || showGuideModal || showPrivacy || showLogoutConfirm || showDeleteConfirm;
  useModalBackButton(anyModalOpen, () => {
    setShowEdit(false);
    setShowPasswordModal(false);
    setShowRepetitionModal(false);
    setShowTelegramModal(false);
    setShowGuideModal(false);
    setShowPrivacy(false);
    setShowLogoutConfirm(false);
    setShowDeleteConfirm(false);
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
    color: selected ? 'var(--accent2)' : 'var(--text3)',
    boxShadow: selected ? '0 2px 8px rgba(30,42,58,0.08)' : 'none',
    transition: 'all 0.2s',
  });

  return (
    <motion.div className="pp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="pp-content" style={{ paddingTop: 16 }}>
        {/* ═══ SARLAVHA ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            onClick={() => navigate('/dashboard')}
            aria-label={t('settings.back')}
            style={{
              width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg2)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('settings.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user.displayName || t('settings.userFallback')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

          {/* ═══ KO'RINISH ═══ */}
          <div>
            <div style={sectionLabel}>{t('settings.sections.appearance')}</div>
            <div className="pp-group">
              {/* Til tanlash: O'zbekcha / Ruscha */}
              <div className="pp-menu-item" style={{ cursor: 'default' }}>
                <div className="pp-menu-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                  <Languages size={20} />
                </div>
                <span className="pp-menu-label">{t('lang.label')}</span>
                <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', padding: 3, borderRadius: 10, flexShrink: 0 }}>
                  {[{ id: 'uz', label: "O'zbekcha" }, { id: 'ru', label: 'Русский' }].map(opt => (
                    <button key={opt.id} onClick={() => i18n.changeLanguage(opt.id)} style={segBtn((i18n.resolvedLanguage || i18n.language) === opt.id)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tema tanlash: Kunduzgi / Sepia (o'qish) / Tungi */}
              <div className="pp-menu-item" style={{ cursor: 'default' }}>
                <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                  {theme === 'dark' ? <Moon size={20} /> : theme === 'sepia' ? <BookOpen size={20} /> : <Sun size={20} />}
                </div>
                <span className="pp-menu-label">{t('settings.themeMode')}</span>
                <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', padding: 3, borderRadius: 10, flexShrink: 0 }}>
                  {[{ id: 'light' }, { id: 'sepia' }, { id: 'dark' }].map(opt => (
                    <button key={opt.id} onClick={() => toggleTheme(opt.id)} style={segBtn(theme === opt.id)}>
                      {t(`theme.${opt.id}`)}
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
                  <span className="pp-menu-label">{t('settings.fontSize')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t('settings.fontSizeHint')}</span>
                </div>
                <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', padding: 3, borderRadius: 10, flexShrink: 0 }}>
                  {FONT_SCALES.map(f => (
                    <button key={f.label} onClick={() => applyFontScale(f.value)} style={{ ...segBtn(fontScale === f.value), padding: '6px 10px' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ HISOB ═══ */}
          <div>
            <div style={sectionLabel}>{t('settings.sections.account')}</div>
            <div className="pp-group">
              <button className="pp-menu-item" onClick={() => setShowEdit(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                  <Edit3 size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.editProfile')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item" onClick={() => setShowPasswordModal(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                  <KeyRound size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.changePassword')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>
            </div>
          </div>

          {/* ═══ O'RGANISH ═══ */}
          <div>
            <div style={sectionLabel}>{t('settings.sections.learning')}</div>
            <div className="pp-group">
              <button className="pp-menu-item" onClick={() => setShowRepetitionModal(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
                  <Brain size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.smartReview')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item" onClick={() => setShowTelegramModal(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
                  <Send size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.dailyReminder')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item" onClick={handleEnablePush} disabled={pushBusy}>
                <div className="pp-menu-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                  <Bell size={20} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="pp-menu-label">{t('settings.push')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {pushStatus === 'granted' ? t('settings.pushOn')
                      : pushStatus === 'denied' ? t('settings.pushBlocked')
                      : t('settings.pushHint')}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: pushStatus === 'granted' ? 'var(--green)' : 'var(--accent2)', whiteSpace: 'nowrap' }}>
                  {pushBusy ? '...' : pushStatus === 'granted' ? t('settings.pushEnabled') : t('settings.pushEnable')}
                </span>
              </button>

              <button className="pp-menu-item" onClick={handleDownloadOffline}>
                <div className="pp-menu-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                  <Download size={20} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="pp-menu-label" style={{ fontWeight: 800, color: 'var(--green)' }}>
                    {downloadingOffline ? t('settings.offlineLoading') : t('settings.offline')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t('settings.offlineHint')}</span>
                </div>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>
            </div>
          </div>

          {/* ═══ ILOVA ═══ */}
          <div>
            <div style={sectionLabel}>{t('settings.sections.app')}</div>
            <div className="pp-group">
              {isInstallable && (
                <button className="pp-menu-item" onClick={installApp}>
                  <div className="pp-menu-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}>
                    <Download size={20} />
                  </div>
                  <span className="pp-menu-label" style={{ fontWeight: 800 }}>{t('settings.installPWA')}</span>
                  <ChevronRight size={18} className="pp-menu-arrow" />
                </button>
              )}

              <button className="pp-menu-item" onClick={() => setShowGuideModal(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                  <div style={{ fontSize: 16 }}>📖</div>
                </div>
                <span className="pp-menu-label">{t('settings.guide')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>
            </div>
          </div>

          {/* ═══ MA'LUMOT VA HUQUQIY ═══ */}
          <div>
            <div style={sectionLabel}>{t('settings.sections.info')}</div>
            <div className="pp-group">
              {/* Premium — marketing /premium sahifasida; bu yerda faqat sodda kirish havolasi */}
              <button className="pp-menu-item" onClick={() => navigate('/premium')}>
                <div className="pp-menu-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                  <Crown size={20} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="pp-menu-label">{t('settings.premium')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t('settings.premiumHint')}</span>
                </div>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item" onClick={() => setShowPrivacy(true)}>
                <div className="pp-menu-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#EC4899' }}>
                  <Shield size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.privacy')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item" onClick={() => navigate('/terms')}>
                <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
                  <FileText size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.terms')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item" onClick={() => navigate('/about')}>
                <div className="pp-menu-icon" style={{ background: 'var(--blue-bg)', color: 'var(--accent)' }}>
                  <div style={{ fontSize: 16 }}>ℹ️</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="pp-menu-label">{t('settings.about')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t('settings.aboutHint')}</span>
                </div>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>
            </div>
          </div>

          {/* ═══ HISOB AMALLARI ═══ */}
          <div>
            <div style={sectionLabel}>{t('settings.sections.accountActions')}</div>
            <div className="pp-group">
              <button className="pp-menu-item" onClick={() => setShowDeleteConfirm(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
                  <Shield size={20} style={{ transform: 'rotate(180deg)' }} />
                </div>
                <span className="pp-menu-label" style={{ color: 'var(--red)' }}>{t('settings.deleteAccount')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>

              <button className="pp-menu-item danger" onClick={() => setShowLogoutConfirm(true)}>
                <div className="pp-menu-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
                  <LogOut size={20} />
                </div>
                <span className="pp-menu-label">{t('settings.logout')}</span>
                <ChevronRight size={18} className="pp-menu-arrow" />
              </button>
            </div>
          </div>

          {/* ═══ VERSIYA ═══ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', padding: '4px 0 8px' }}>
            <BrandLogo size={14} /> · versiya {APP_VERSION}
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
    </motion.div>
  );
}
