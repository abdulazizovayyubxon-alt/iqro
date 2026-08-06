/**
 * SettingsPage.jsx — Sozlamalar sahifasi (/settings)
 * Bo'limlar: Ko'rinish, Hisob, O'rganish, Ilova, Ma'lumot, Hisob amallari.
 * Marketing (premium banner / ishonch nishonlari / FAQ) /premium sahifasiga ko'chirildi.
 *
 * Qatorlar quyidagi uch ko'rinishdan biri: ActionRow (bosiladigan),
 * ChoiceRow (segment tanlov) va SwitchRow (yoq/o'chir). Segment har doim
 * yorliq OSTIDA, to'liq kenglikda — ilgari yonma-yon edi va 360px ekranda
 * kartadan chiqib ketardi.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Moon, Sun, BookOpen, Type, Edit3, LogOut, ChevronRight, Shield, Download, Brain, KeyRound, Crown, FileText, Bell, Languages, MessageCircle, Info, Trash2, Smartphone, Activity, AlertCircle, CalendarDays, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { PWAContext } from '../context/PWAContext';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { APP_VERSION, SUPPORT_URL } from '../config';
import { enablePush, pushPermission } from '../services/push';
import { isCountdownEnabled, COUNTDOWN_KEY, COUNTDOWN_EVENT } from '../utils/examDate';
import { useModalBackButton } from '../components/profile/useModalBackButton';
import EditProfileModal from '../components/profile/EditProfileModal';
import PasswordModal from '../components/profile/PasswordModal';
import RepetitionModal from '../components/profile/RepetitionModal';
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

/* ── Qayta ishlatiladigan qator bloklari ───────────────────────────
   Barcha qatorlar bir xil skeletdan quriladi: ikonka + matn + o'ng
   element. Tanlov qatorlarida segment yorliq OSTIDA, to'liq kenglikda —
   shu sabab tor ekranda ham hech narsa siqilib qolmaydi. */

function RowIcon({ tone = 'accent', children }) {
  return <div className={`pp-menu-icon${tone === 'accent' ? '' : ` is-${tone}`}`}>{children}</div>;
}

function RowText({ label, sublabel, labelTone, sublabelTone }) {
  if (!sublabel) {
    return <span className={`pp-menu-label${labelTone ? ` is-${labelTone}` : ''}`}>{label}</span>;
  }
  return (
    <div className="pp-menu-text">
      <span className={`pp-menu-label${labelTone ? ` is-${labelTone}` : ''}`}>{label}</span>
      <span className={`pp-menu-sublabel${sublabelTone ? ` is-${sublabelTone}` : ''}`}>{sublabel}</span>
    </div>
  );
}

/** Bosiladigan qator — o'ngida strelka yoki ixtiyoriy element */
function ActionRow({ icon, tone, label, sublabel, labelTone, sublabelTone, right, danger, onClick, disabled }) {
  return (
    <button className={`pp-menu-item${danger ? ' danger' : ''}`} onClick={onClick} disabled={disabled}>
      <RowIcon tone={tone}>{icon}</RowIcon>
      <RowText label={label} sublabel={sublabel} labelTone={labelTone} sublabelTone={sublabelTone} />
      {right ?? <ChevronRight size={18} className="pp-menu-arrow" />}
    </button>
  );
}

/** Tanlov qatori — segment yorliq ostida, to'liq kenglikda */
function ChoiceRow({ icon, tone, label, sublabel, options, value, onSelect }) {
  return (
    <div className="pp-menu-item sp-row--choice">
      <div className="sp-row-head">
        <RowIcon tone={tone}>{icon}</RowIcon>
        <RowText label={label} sublabel={sublabel} />
      </div>
      <div className="pp-segment-container" role="group" aria-label={label}>
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            aria-pressed={value === opt.id}
            className={`pp-segment-btn ${value === opt.id ? 'active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Yoqish/o'chirish qatori */
function SwitchRow({ icon, tone, label, sublabel, checked, onToggle }) {
  return (
    <div className="pp-menu-item">
      <RowIcon tone={tone}>{icon}</RowIcon>
      <RowText label={label} sublabel={sublabel} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`sp-switch${checked ? ' on' : ''}`}
      />
    </div>
  );
}

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
    if (pushStatus === 'granted') { showToast(t('settings.toasts.pushAlreadyEnabled'), 'info'); return; }
    if (pushStatus === 'denied') { showToast(t('settings.toasts.pushBlocked'), 'error'); return; }
    setPushBusy(true);
    const res = await enablePush(user);
    setPushBusy(false);
    setPushStatus(pushPermission());
    if (res.ok) showToast(t('settings.toasts.pushEnabled'), 'success');
    else if (res.reason === 'no_vapid') showToast(t('settings.toasts.pushNoVapid'), 'info');
    else if (res.reason === 'denied') showToast(t('settings.toasts.pushDenied'), 'error');
    else if (res.reason === 'unsupported') showToast(t('settings.toasts.pushUnsupported'), 'error');
    else showToast(t('settings.toasts.pushError'), 'error');
  };

  // Kunlik reja eslatmasi — server (api/cron-reminder.js) kechqurun bitta push
  // yuboradi. Push ruxsatisiz ma'nosi yo'q, shuning uchun qator faqat ruxsat
  // berilganda ko'rinadi. Holat Firestore'da (`users/{uid}.dailyReminder`),
  // localStorage'da EMAS: qarorni serverning o'zi o'qishi kerak.
  const [dailyReminder, setDailyReminder] = useState(true);
  useEffect(() => {
    if (!user?.uid || pushStatus !== 'granted') return;
    let alive = true;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (alive && snap.exists()) setDailyReminder(snap.data().dailyReminder !== false); })
      .catch(() => { /* o'qilmasa yoqilgan deb qoladi — cron ham shunday o'qiydi */ });
    return () => { alive = false; };
  }, [user?.uid, pushStatus]);

  const toggleDailyReminder = async () => {
    const next = !dailyReminder;
    setDailyReminder(next);
    try {
      await setDoc(doc(db, 'users', user.uid), { dailyReminder: next }, { merge: true });
      showToast(next ? t('settings.toasts.reminderOn') : t('settings.toasts.reminderOff'), 'success');
    } catch {
      setDailyReminder(!next);   // yozilmadi — tugmani orqaga qaytaramiz
      showToast(t('settings.toasts.pushError'), 'error');
    }
  };

  // Shrift o'lchami — tipografiya tizimining --fs-scale ko'paytuvchisi (src/index.css).
  // S=0.9, M=1, L=1.1, XL=1.25. Ildizdagi `font-size: calc(clamp(...) * var(--fs-scale))`
  // shu qiymatga ko'payadi, tokenlar esa rem'da — shuning uchun BITTA o'zgaruvchi
  // butun ilovadagi matnni (savol, variant, menyu, izoh, tugma) birdek o'zgartiradi.
  // DIQQAT: bevosita html.style.fontSize BERILMAYDI — inline uslub calc()ni bosib
  // ketadi va ekranga moslashuvchi clamp() o'chib qoladi.
  const [fontScale, setFontScale] = useState(() => {
    const saved = parseFloat(localStorage.getItem('iqro-font-scale'));
    return saved && saved >= 0.8 && saved <= 1.5 ? saved : 1;
  });
  const applyFontScale = (v) => {
    setFontScale(v);
    localStorage.setItem('iqro-font-scale', String(v));
    document.documentElement.style.setProperty('--fs-scale', String(v));
  };

  // Imtihonga sanoq — doim ko'rinib turgan muddat hammaga ham foydali emas,
  // shuning uchun o'chirib qo'yish mumkin (Dashboard banneri va header chipi).
  const [countdownOn, setCountdownOn] = useState(() => isCountdownEnabled());
  const toggleCountdown = () => {
    const next = !countdownOn;
    setCountdownOn(next);
    localStorage.setItem(COUNTDOWN_KEY, next ? 'on' : 'off');
    // Ayni tabda `storage` hodisasi otilmaydi — sanoqni o'zimiz xabardor qilamiz
    window.dispatchEvent(new Event(COUNTDOWN_EVENT));
    showToast(next ? t('settings.vibrationOn') : t('settings.vibrationOff'), 'success');
  };

  // Vibratsiya sozlamasi — splash animatsiyada telefon vibratsiyasi
  const [vibrationOn, setVibrationOn] = useState(() => {
    return localStorage.getItem('iqro-vibration') !== 'off';
  });
  const toggleVibration = () => {
    const newVal = !vibrationOn;
    setVibrationOn(newVal);
    localStorage.setItem('iqro-vibration', newVal ? 'on' : 'off');
    showToast(newVal ? t('settings.vibrationOn') : t('settings.vibrationOff'), 'success');
  };

  // Android "orqaga" tugmasi modallarni yopadi (popstate shartnomasi)
  const anyModalOpen = showEdit || showPasswordModal || showRepetitionModal
    || showGuideModal || showPrivacy || showLogoutConfirm || showDeleteConfirm;
  useModalBackButton(anyModalOpen, () => {
    setShowEdit(false);
    setShowPasswordModal(false);
    setShowRepetitionModal(false);
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
      showToast(t('profile.profileSaved'), 'success');
      setShowEdit(false);
    } catch (e) {
      showToast(t('settings.toasts.generalError'), 'error');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/'); } catch { showToast(t('settings.toasts.logoutError'), 'error'); }
  };

  /**
   * Hisobni o'chirish — modal 3 bosqichdan o'tkazgach chaqiriladi.
   *
   * Oqim:
   *   1. Parol bilan QAYTA autentifikatsiya — shaxsni tasdiqlaydi va Firebase
   *      tokenidagi `auth_time` ni yangilaydi (server shuni tekshiradi).
   *   2. Tozalash SERVERDA (`/api/notify-admin?action=delete-me`): u yerda
   *      Auth hisobi, `users/{uid}`, `userStats/{uid}` va bildirishnomalar
   *      subkolleksiyasi birga o'chiriladi. Mijozdagi eski `deleteUser()`
   *      subkolleksiyani qoldirib ketardi.
   *   3. Lokal sessiya va keshni tozalash.
   *
   * @returns {{error?: string}} modal xatoni ko'rsatishi uchun
   */
  const handleDeleteAccount = async (password) => {
    if (deleting) return { error: 'busy' };
    setDeleting(true);
    try {
      const current = auth.currentUser;
      if (!current) return { error: 'not_signed_in' };

      // ── 1. Qayta autentifikatsiya ──
      try {
        const credential = EmailAuthProvider.credential(current.email, password);
        await reauthenticateWithCredential(current, credential);
      } catch (e) {
        if (
          e.code === 'auth/wrong-password' ||
          e.code === 'auth/invalid-credential' ||
          e.code === 'auth/invalid-login-credentials'
        ) {
          return { error: 'wrong_password' };
        }
        if (e.code === 'auth/too-many-requests') {
          showToast(t('settings.toasts.deleteAccountTooMany'), 'error');
          return { error: 'too_many' };
        }
        throw e;
      }

      // ── 2. Serverda to'liq tozalash ──
      const idToken = await current.getIdToken(true); // yangi auth_time bilan
      const res = await fetch('/api/notify-admin?action=delete-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({}),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        // Lokal `vite dev`da serverless funksiyalar yo'q — bu kutilgan holat
        throw new Error('api_unavailable');
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `http_${res.status}`);

      // ── 3. Lokal izlarni tozalash ──
      localStorage.removeItem(`iqro_state_${user.uid}`);
      await logout().catch(() => {});
      showToast(t('settings.toasts.deleteAccountSuccess'), 'success');
      navigate('/');
      return {};
    } catch (e) {
      console.error('Hisobni o\'chirish xatosi:', e);
      showToast(t('settings.toasts.deleteAccountError'), 'error');
      return { error: 'failed' };
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

        showToast(t('settings.toasts.offlineSuccess', { count: rawList.length }), 'success');
      } else {
        showToast(t('settings.toasts.offlineNotReady'), 'error');
      }
    } catch (e) {
      console.error(e);
      showToast(t('settings.toasts.offlineError'), 'error');
    } finally {
      setDownloadingOffline(false);
    }
  };

  const activeLang = i18n.resolvedLanguage || i18n.language;
  const dateLocale = activeLang === 'ru' ? 'ru-RU' : activeLang === 'en' ? 'en-US' : 'uz-UZ';

  return (
    <motion.div className="pp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ═══ SARLAVHA ═══ */}
      <div className="sp-head">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label={t('settings.back')}
          className="pp-back-btn"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="sp-head-text">
          <h1 className="sp-title">{t('settings.title')}</h1>
          <div className="sp-subtitle">{user.displayName || t('settings.userFallback')}</div>
        </div>
      </div>

      {/* ═══ YORDAM VA ALOQA ═══ */}
      <div className="pp-support-card">
        <div className="pp-support-icon">
          <MessageCircle size={22} />
        </div>
        <div className="pp-support-body">
          <div className="pp-support-title">{t('settings.helpTitle')}</div>
          <div className="pp-support-text">{t('settings.helpText')}</div>
        </div>
        <button onClick={() => window.open(SUPPORT_URL, '_blank')} className="pp-support-btn">
          {t('settings.helpCta')}
        </button>
      </div>

      <div className="sp-sections">
        {/* ═══ KO'RINISH ═══ */}
        <section className="sp-section">
          <div className="pp-section-label">{t('settings.sections.appearance')}</div>
          <div className="pp-group">
            <ChoiceRow
              icon={<Languages size={20} />}
              label={t('lang.label')}
              value={activeLang}
              onSelect={(id) => i18n.changeLanguage(id)}
              options={[
                { id: 'uz', label: "O'zbekcha" },
                { id: 'ru', label: 'Русский' },
                { id: 'en', label: 'English' },
              ]}
            />

            <ChoiceRow
              icon={theme === 'dark' ? <Moon size={20} /> : theme === 'sepia' ? <BookOpen size={20} /> : <Sun size={20} />}
              label={t('settings.themeMode')}
              value={theme}
              onSelect={toggleTheme}
              options={['light', 'sepia', 'dark'].map(id => ({ id, label: t(`theme.${id}`) }))}
            />

            <ChoiceRow
              icon={<Type size={20} />}
              label={t('settings.fontSize')}
              sublabel={t('settings.fontSizeHint')}
              value={fontScale}
              onSelect={applyFontScale}
              options={FONT_SCALES.map(f => ({ id: f.value, label: f.label }))}
            />

            <SwitchRow
              icon={<CalendarDays size={20} />}
              label={t('settings.examCountdown')}
              sublabel={t('settings.examCountdownHint')}
              checked={countdownOn}
              onToggle={toggleCountdown}
            />

            <SwitchRow
              icon={<Smartphone size={20} />}
              label={t('settings.vibration')}
              sublabel={t('settings.vibrationHint')}
              checked={vibrationOn}
              onToggle={toggleVibration}
            />
          </div>
        </section>

        {/* ═══ HISOB ═══ */}
        <section className="sp-section">
          <div className="pp-section-label">{t('settings.sections.account')}</div>
          <div className="pp-group">
            <ActionRow
              icon={<Edit3 size={20} />}
              label={t('settings.editProfile')}
              onClick={() => setShowEdit(true)}
            />
            <ActionRow
              icon={<KeyRound size={20} />}
              label={t('settings.changePassword')}
              onClick={() => setShowPasswordModal(true)}
            />
            {/* Pro obuna — marketing /premium sahifasida; bu yerda holat + kirish havolasi */}
            <ActionRow
              icon={<Crown size={20} />}
              tone="amber"
              label={t('settings.premium')}
              sublabel={user.isTruePremium
                ? (user.premiumExpire
                    ? t('settings.premiumActiveUntil', { date: new Date(user.premiumExpire).toLocaleDateString(dateLocale) })
                    : t('settings.premiumUnlimited'))
                : t('settings.premiumHint')}
              sublabelTone={user.isTruePremium ? 'green' : undefined}
              onClick={() => navigate('/premium')}
            />
          </div>
        </section>

        {/* ═══ O'RGANISH ═══ */}
        <section className="sp-section">
          <div className="pp-section-label">{t('settings.sections.learning')}</div>
          <div className="pp-group">
            {/* Tahlil va Xatolar daftari — profil menyusidan shu yerga ko'chirildi */}
            <ActionRow
              icon={<Activity size={20} />}
              label={t('settings.analysis')}
              sublabel={t('settings.analysisHint')}
              onClick={() => navigate('/analysis')}
            />

            <ActionRow
              icon={<AlertCircle size={20} />}
              tone="red"
              label={t('settings.errors')}
              sublabel={t('settings.errorsHint')}
              onClick={() => navigate('/errors')}
            />

            <ActionRow
              icon={<Brain size={20} />}
              label={t('settings.smartReview')}
              onClick={() => setShowRepetitionModal(true)}
            />

            <ActionRow
              icon={<Bell size={20} />}
              tone="amber"
              label={t('settings.push')}
              sublabel={pushStatus === 'granted' ? t('settings.pushOn')
                : pushStatus === 'denied' ? t('settings.pushBlocked')
                : t('settings.pushHint')}
              onClick={handleEnablePush}
              disabled={pushBusy}
              right={
                <span className={`sp-pill${pushStatus === 'granted' ? ' is-on' : pushStatus === 'denied' ? ' is-off' : ''}`}>
                  {pushBusy ? '…' : pushStatus === 'granted' ? t('settings.pushEnabled') : t('settings.pushEnable')}
                </span>
              }
            />

            {pushStatus === 'granted' && (
              <SwitchRow
                icon={<CalendarClock size={20} />}
                label={t('settings.dailyReminder')}
                sublabel={t('settings.dailyReminderHint')}
                checked={dailyReminder}
                onToggle={toggleDailyReminder}
              />
            )}

            <ActionRow
              icon={<Download size={20} />}
              tone="green"
              label={downloadingOffline ? t('settings.offlineLoading') : t('settings.offline')}
              sublabel={t('settings.offlineHint')}
              onClick={handleDownloadOffline}
              disabled={downloadingOffline}
            />
          </div>
        </section>

        {/* ═══ ILOVA ═══ */}
        <section className="sp-section">
          <div className="pp-section-label">{t('settings.sections.app')}</div>
          <div className="pp-group">
            {isInstallable && (
              <ActionRow
                icon={<Download size={20} />}
                tone="green"
                label={t('settings.installPWA')}
                onClick={installApp}
              />
            )}
            <ActionRow
              icon={<BookOpen size={20} />}
              label={t('settings.guide')}
              onClick={() => setShowGuideModal(true)}
            />
          </div>
        </section>

        {/* ═══ MA'LUMOT VA HUQUQIY ═══ */}
        <section className="sp-section">
          <div className="pp-section-label">{t('settings.sections.info')}</div>
          <div className="pp-group">
            <ActionRow
              icon={<Shield size={20} />}
              label={t('settings.privacy')}
              onClick={() => setShowPrivacy(true)}
            />
            <ActionRow
              icon={<FileText size={20} />}
              label={t('settings.terms')}
              onClick={() => navigate('/terms')}
            />
            <ActionRow
              icon={<Info size={20} />}
              label={t('settings.about')}
              sublabel={t('settings.aboutHint')}
              onClick={() => navigate('/about')}
            />
          </div>
        </section>

        {/* ═══ HISOB AMALLARI ═══ */}
        <section className="sp-section">
          <div className="pp-section-label">{t('settings.sections.accountActions')}</div>
          <div className="pp-group">
            {/* Chiqish qaytariladigan amal — neytral; o'chirish esa qaytarilmaydi */}
            <ActionRow
              icon={<LogOut size={20} />}
              tone="muted"
              label={t('settings.logout')}
              onClick={() => setShowLogoutConfirm(true)}
            />
            <ActionRow
              icon={<Trash2 size={20} />}
              tone="red"
              label={t('settings.deleteAccount')}
              labelTone="red"
              danger
              onClick={() => setShowDeleteConfirm(true)}
            />
          </div>
        </section>

        {/* ═══ VERSIYA ═══ */}
        <div className="sp-version">
          {/* Token o'lchami — yonidagi versiya matni bilan birga A+/A- ga ergashadi */}
          <BrandLogo size="var(--fs-4xl)" /> · {t('settings.version', { version: APP_VERSION })}
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
          value={state.repetitionLimit ?? 0}
          onChange={(v) => { updateState({ repetitionLimit: v }); showToast(t('settings.toasts.saved'), 'success'); }}
          onClose={() => setShowRepetitionModal(false)}
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
          isPremium={user?.isTruePremium}
          premiumExpire={user?.premiumExpire}
          onConfirm={handleDeleteAccount}
          // Modal xavfsizroq muqobil taklif qiladi: shunchaki chiqish yoki
          // yordamga murojaat. Ikkalasi ham o'chirishdan qaytaradi.
          onClose={(intent) => {
            setShowDeleteConfirm(false);
            if (intent === 'logout') setShowLogoutConfirm(true);
            else if (intent === 'support') window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
          }}
        />
      )}
    </motion.div>
  );
}
