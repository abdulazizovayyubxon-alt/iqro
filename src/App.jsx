import React, { useState, useEffect, useContext, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppContext } from './context/AppContext';
import { AnimatePresence } from 'framer-motion';
import { Shield, BookOpen, Clock, Palette } from 'lucide-react';
import BrandLogo, { ZehinMark } from './components/shared/BrandLogo';
import PullToRefresh, { RefreshRing } from './components/shared/PullToRefresh';
import ScrollDebugOverlay from './components/shared/ScrollDebugOverlay';
import PerfOverlay from './components/shared/PerfOverlay';
import { trackPageView, startPageTimer } from './services/analytics';
import { setUser, clearUser } from './services/sentry';
import { enablePush, listenForegroundPush } from './services/push';
import { applyThemeColor, enterSplash, exitSplash, SPLASH_BG } from './utils/statusBar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Components (har doim kerak — code split qilinmaydi)
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import OfflineIndicator from './components/OfflineIndicator';
import OnboardingPage from './pages/OnboardingPage';
import BottomNav from './components/BottomNav';

// ══════════════════════════════════════════════════════════════
// React.lazy — sahifalar faqat kerak bo'lganda yuklanadi
// Bu bundle'ni ~60% ga kamaytiradi (1.8MB → ~700KB asosiy chunk)
// ══════════════════════════════════════════════════════════════
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TestPage = React.lazy(() => import('./pages/TestPage'));
const ExamPage = React.lazy(() => import('./pages/ExamPage'));
const SmartReviewPage = React.lazy(() => import('./pages/SmartReviewPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const AchievementsPage = React.lazy(() => import('./pages/AchievementsPage'));
const AnalysisPage = React.lazy(() => import('./pages/AnalysisPage'));
const SchoolPage = React.lazy(() => import('./pages/SchoolPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const MigrationPage = React.lazy(() => import('./pages/MigrationPage'));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage'));
const PremiumPage = React.lazy(() => import('./pages/PremiumPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ErrorNotebookPage = React.lazy(() => import('./pages/ErrorNotebookPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const DeleteAccountPage = React.lazy(() => import('./pages/DeleteAccountPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

// ── Chunk'larni oldindan isitish ────────────────────────────────
// MUAMMO: route sahifalarida `exit` animatsiyasi YO'Q, shuning uchun eski
// ekran darhol yo'qoladi. Agar yangi sahifaning chunk'i hali yuklanmagan
// bo'lsa, o'rtada `PageSkeleton` chaqnab o'tadi — ekranlar «bir-biriga
// qoldiq qoldirgandek» ko'rinishi aynan shundan.
//
// Yechim: eng ko'p ishlatiladigan sahifalarni bo'sh vaqtda fonda yuklab
// qo'yamiz. Shunda navigatsiya paytida Suspense umuman qo'zg'almaydi.
// Tartib — foydalanish chastotasi bo'yicha; kamdan-kam ochiladiganlar
// (Admin, Migration, Maktab) ATAYIN ro'yxatda yo'q, ular og'ir va kerak
// bo'lganda yuklangani ma'qul.
const warmChunks = () => {
  const queue = [
    () => import('./pages/Dashboard'),
    () => import('./pages/TestPage'),
    () => import('./pages/ExamPage'),
    () => import('./pages/SmartReviewPage'),
    () => import('./pages/AnalysisPage'),
    () => import('./pages/AchievementsPage'),
    () => import('./pages/LeaderboardPage'),
    () => import('./pages/SettingsPage'),
    () => import('./pages/ErrorNotebookPage'),
  ];
  // Ketma-ket: bir vaqtda 9 ta so'rov tarmoqni bo'g'ib, birinchi ekranning
  // o'zini sekinlashtirardi. Har biri oldingisi tugagach, bo'sh kadrda.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  let i = 0;
  const next = () => {
    if (i >= queue.length) return;
    queue[i++]().catch(() => { /* tarmoq yo'q — kerak bo'lganda qayta urinadi */ })
      .then(() => idle(next));
  };
  idle(next);
};

// ── Skeleton Loader — sahifa yuklanayotganda chiroyli ko'rinish ──
const PageSkeleton = () => {
  const appContext = useContext(AppContext);
  const activeCategory = appContext?.state?.activeCategory || 'chqbt';
  
  // Icon select based on category
  let WatermarkIcon = Shield;
  let themeColor = 'rgba(14, 151, 224, 0.05)'; // default azure
  
  if (activeCategory === 'ona_tili') {
    WatermarkIcon = BookOpen;
    themeColor = 'rgba(16, 185, 129, 0.04)'; // green
  } else if (activeCategory === 'tarix') {
    WatermarkIcon = Clock;
    themeColor = 'rgba(245, 158, 11, 0.04)'; // amber
  } else if (activeCategory === 'art') {
    WatermarkIcon = Palette;
    themeColor = 'rgba(8, 95, 144, 0.04)'; // deep azure
  }

  return (
    <div className="skeleton-page" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Dynamic Watermark Background */}
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        right: '-30px',
        pointerEvents: 'none',
        zIndex: 0,
        animation: 'skeletonPulse 2.5s infinite ease-in-out',
        color: themeColor,
      }}>
        <WatermarkIcon size={260} style={{ strokeWidth: 1.2 }} />
      </div>

      {/* Sarlavha skeleton */}
      <div className="skeleton-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="skeleton-line skeleton-w40 skeleton-h24" />
        <div className="skeleton-line skeleton-w20 skeleton-h16" />
      </div>

      {/* Kartalar skeleton */}
      <div className="skeleton-cards" style={{ position: 'relative', zIndex: 1 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line skeleton-w60 skeleton-h16" />
            <div className="skeleton-line skeleton-w80 skeleton-h12" />
            <div className="skeleton-line skeleton-w40 skeleton-h12" />
            <div className="skeleton-bar" />
          </div>
        ))}
      </div>

      {/* Kontent skeleton */}
      <div className="skeleton-content" style={{ position: 'relative', zIndex: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-circle" />
            <div style={{ flex: 1 }}>
              <div className="skeleton-line skeleton-w70 skeleton-h14" />
              <div className="skeleton-line skeleton-w50 skeleton-h10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px', textAlign: 'center', color: 'var(--text)' }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🌿</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Kechirasiz, kichik nosozlik yuz berdi</h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>
            Xavotir olmang, ma'lumotlaringiz xavfsiz. Tizimda kutilmagan xatolik chiqdi. Ilovani qayta yuklasangiz, hammasi joyiga tushadi.
          </p>
          <button onClick={() => window.location.reload()} style={{ padding: '14px 28px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            Ilovani yangilash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const appContext = useContext(AppContext);
  const [theme, setTheme] = useState('light');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Yangi foydalanuvchimi tekshirish
  useEffect(() => {
    if (!user) { setOnboardingChecked(true); setNeedsOnboarding(false); return; }
    const CACHE_KEY = `iqro_onboarding_${user.uid}`;
    if (localStorage.getItem(CACHE_KEY)) { setNeedsOnboarding(false); setOnboardingChecked(true); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const done = snap.exists() && snap.data().onboardingDone === true;
      if (done) localStorage.setItem(CACHE_KEY, '1');
      setNeedsOnboarding(!done);
      setOnboardingChecked(true);
    }).catch(() => { setNeedsOnboarding(false); setOnboardingChecked(true); });
  }, [user]);

  // ── Sahifa kuzatuvi (Analytics) ──
  const PAGE_NAMES = {
    '/': 'Test', '/dashboard': 'Dashboard',
    '/test': 'Test', '/exam': 'Imtihon', '/review': 'Takrorlash',
    '/leaderboard': 'Reyting', '/achievements': 'Yutuqlar',
    '/analysis': 'Tahlil', '/school': 'Maktab',
    '/admin': 'Admin', '/migration': 'Migratsiya',
    '/settings': 'Sozlamalar', '/premium': 'Pro', '/about': 'Biz haqimizda'
  };

  useEffect(() => {
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    trackPageView(pageName, location.pathname);
    startPageTimer(pageName);
    document.title = `${pageName} | Zehin`;
  }, [location.pathname]);

  // ── Route almashganda scroll tepaga qaytadi ──
  // SPA'da brauzer buni o'zi qilmaydi: chuqur scroll holatida boshqa sahifaga
  // o'tilsa (masalan Dashboard pastidan Sozlamalarga), yangi sahifa o'sha
  // chuqurlikda ochilib qolardi. Hujjat ham, ichki konteyner ham tozalanadi.
  useEffect(() => {
    window.scrollTo(0, 0);
    const sc = document.querySelector('.main-content');
    if (sc) {
      // scroll-behavior:smooth CSS'ini chetlab o'tish uchun 'instant'
      try { sc.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
      catch { sc.scrollTop = 0; }
    }
  }, [location.pathname]);

  // ── Sentry foydalanuvchi konteksti ──
  useEffect(() => {
    if (user) setUser(user);
    else clearUser();
  }, [user]);

  // Sahifa chunk'larini fonda isitish — navigatsiyada PageSkeleton
  // chaqnamasligi uchun. Faqat tizimga kirgach: login ekranida bu chunk'lar
  // kerak emas va birinchi ekranning tarmog'ini band qilardi.
  useEffect(() => {
    if (!user) return;
    warmChunks();
  }, [user]);

  // ── FCM Push notification avto-sinxronizatsiya ──
  useEffect(() => {
    if (!user) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      enablePush(user).catch(() => {});
    }
    const unsubPromise = listenForegroundPush((payload) => {
      console.log('FCM Foreground Message:', payload);
    });
    return () => {
      unsubPromise.then(unsub => { if (typeof unsub === 'function') unsub(); }).catch(() => {});
    };
  }, [user]);

  // Tema: light → sepia (o'qish) → dark aylanasi
  const THEMES = ['light', 'sepia', 'dark'];

  const applyTheme = (t) => {
    document.body.classList.remove('dark-theme', 'sepia-theme');
    if (t === 'dark') document.body.classList.add('dark-theme');
    else if (t === 'sepia') document.body.classList.add('sepia-theme');
    // Status-bar rangi — utils/statusBar.js (splash turgan bo'lsa u navy'ni
    // ushlab turadi va tema rangini splash yopilgach qo'llaydi)
    applyThemeColor(t);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('iqro-theme') || localStorage.getItem('chqbt-theme');
    const validTheme = THEMES.includes(savedTheme) ? savedTheme : 'light';
    // React STATE'ini sinxronlaymiz. DOM (body class) va shrift o'lchami boot'da
    // index.html'dagi inline skriptlar orqali React'dan OLDIN qo'llanadi
    // (flash'ni oldini olish uchun) — bu yerda takror qo'llash SHART EMAS.
    // Runtime almashinuvi: tema toggleTheme'da, o'lcham SettingsPage'da.
    setTheme(validTheme);
    // Status-bar rangi ISTISNO: boot'da u splash foniga (navy) qo'yilgan, shu
    // sabab tema rangi shu yerda ro'yxatdan o'tkaziladi — u splash yopilgach
    // avtomatik qo'llanadi.
    applyThemeColor(validTheme);
  }, []);

  const toggleTheme = (target) => {
    const newTheme = THEMES.includes(target)
      ? target
      : THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(newTheme);
    localStorage.setItem('iqro-theme', newTheme);
    applyTheme(newTheme);
  };

  // Firebase sekin javob bersa bu navy ekran SimpleSplash yopilgandan keyin
  // ham turadi — status-bar shu vaqtda ham navy bo'lib qolsin (aks holda
  // tepada bir lahzaga och tasma chiqadi).
  const bootSplashVisible = loading || !onboardingChecked;
  useEffect(() => {
    if (!bootSplashVisible) return;
    enterSplash();
    return () => exitSplash();
  }, [bootSplashVisible]);

  // Firebase yuklanmoqda — index.html splash'ining aynan davomi (brend-kitob:
  // to'q navy fon, oq doira belgi, oq lockup; pastda §7 dagi halqa-indikator)
  if (bootSplashVisible) {
    return (
      <div style={{
        // fixed+inset — 100vh mobil brauzerlarda viewport'dan baland chiqib,
        // splash pastdan qirqilishiga sabab bo'lardi
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: SPLASH_BG,
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        userSelect: 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <ZehinMark size={104} variant="navy" />
          <BrandLogo size={51} withMark={false} style={{ color: '#ffffff', marginTop: '30px' }} />
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.26em',
            color: '#5E7FA3',
            margin: '16px 0 0',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase'
          }}>
            Attestatsiya platformasi
          </p>
        </div>

        {/* Halqa-indikator (brend-kitob §7) */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          <RefreshRing size={44} spinning />
          yuklanmoqda...
        </div>
      </div>
    );
  }

  // ── Ochiq sahifalar (Auth kerak emas) ──
  if (location.pathname === '/privacy') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <PrivacyPage />
      </Suspense>
    );
  }
  if (location.pathname === '/terms') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <TermsPage />
      </Suspense>
    );
  }
  if (location.pathname === '/delete-account') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <DeleteAccountPage />
      </Suspense>
    );
  }
  if (location.pathname === '/about') {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <AboutPage />
      </Suspense>
    );
  }

  // Tizimga kirmagan foydalanuvchi
  if (!user) {
    return <LoginPage />;
  }

  // Yangi foydalanuvchi — Onboarding
  if (needsOnboarding) {
    return <OnboardingPage onComplete={(subject) => {
      localStorage.setItem(`iqro_onboarding_${user.uid}`, '1');
      if (subject && subject !== 'multi') {
        appContext.updateState({ activeCategory: subject });
      }
      setNeedsOnboarding(false);
      // 'multi' ("Bir nechta fan") haqiqiy kategoriya emas — TOPICS/savollar yo'q,
      // shuning uchun uni o'rnatmaymiz (default fan saqlanadi), aks holda barcha
      // sahifa bo'm-bo'sh "Mavzu tayyorlanmoqda" holatiga tushib qolardi.
      // "Boshlash" bosilgach foydalanuvchini TO'G'RIDAN-TO'G'RI testga olib o'tamiz —
      // onboarding qizg'inligi profil formasida so'nmasligi uchun. Jins kabi ixtiyoriy
      // ma'lumotlar keyin Profilda to'ldiriladi (testga/avatarga ta'sir qilmaydi).
      navigate('/test');
    }} />;
  }

  // Asosiy ilova
  // Pull-to-refresh test/imtihon jarayonida o'chiq — tasodifiy tortish
  // natijasida jarayon yo'qolmasligi uchun
  const ptrOff = ['/test', '/exam', '/review', '/admin', '/migration']
    .some((p) => location.pathname.startsWith(p));
  return (
    <div className="layout-container">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <OfflineIndicator />
      <PullToRefresh disabled={ptrOff} />
      {/* VAQTINCHALIK: #sdebug bilan ochilganda scroll diagnostikasi */}
      {window.location.hash.includes('sdebug') && <ScrollDebugOverlay />}
      {/* #perf — haqiqiy telefonda silliqlikni o'lchash (FPS/jank/long task) */}
      {window.location.hash.includes('perf') && <PerfOverlay />}
      <div className="layout-body">
        <Sidebar />
        <main className="main-content">
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/test" element={<TestPage />} />
                  <Route path="/exam" element={<ExamPage />} />
                  <Route path="/review" element={<SmartReviewPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/achievements" element={<AchievementsPage />} />
                  <Route path="/analysis" element={<AnalysisPage />} />
                  <Route path="/school" element={<SchoolPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/migration" element={<MigrationPage />} />
                  <Route path="/referral" element={<ReferralPage />} />
                  <Route path="/premium" element={<PremiumPage />} />
                  <Route path="/errors" element={<ErrorNotebookPage />} />
                  <Route path="/settings" element={<SettingsPage theme={theme} toggleTheme={toggleTheme} />} />
                  <Route path="/delete-account" element={<DeleteAccountPage />} />
                  <Route path="*" element={<Navigate to="/test" replace />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
