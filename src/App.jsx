import React, { useState, useEffect, useContext, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppContext } from './context/AppContext';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Shield, BookOpen, Clock, Palette } from 'lucide-react';
import { trackPageView, startPageTimer } from './services/analytics';
import { setUser, clearUser } from './services/sentry';
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
    '/admin': 'Admin', '/migration': 'Migratsiya',
    '/settings': 'Sozlamalar', '/premium': 'Pro', '/about': 'Biz haqimizda'
  };

  useEffect(() => {
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    trackPageView(pageName, location.pathname);
    startPageTimer(pageName);
    document.title = `${pageName} | Zehin`;
  }, [location.pathname]);

  // ── Sentry foydalanuvchi konteksti ──
  useEffect(() => {
    if (user) setUser(user);
    else clearUser();
  }, [user]);

  // Tema: light → sepia (o'qish) → dark aylanasi
  const THEMES = ['light', 'sepia', 'dark'];

  const applyTheme = (t) => {
    document.body.classList.remove('dark-theme', 'sepia-theme');
    if (t === 'dark') document.body.classList.add('dark-theme');
    else if (t === 'sepia') document.body.classList.add('sepia-theme');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('iqro-theme') || localStorage.getItem('chqbt-theme');
    const validTheme = THEMES.includes(savedTheme) ? savedTheme : 'light';
    setTheme(validTheme);
    applyTheme(validTheme);

    // Shrift o'lchami (S/M/L/XL) — faqat o'qish yuzalariga ta'sir qiladi
    const savedScale = parseFloat(localStorage.getItem('iqro-font-scale'));
    if (savedScale && savedScale >= 0.8 && savedScale <= 1.5) {
      document.documentElement.style.setProperty('--font-scale', savedScale);
    }
  }, []);

  const toggleTheme = (target) => {
    const newTheme = THEMES.includes(target)
      ? target
      : THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(newTheme);
    localStorage.setItem('iqro-theme', newTheme);
    applyTheme(newTheme);
  };

  // Firebase yuklanmoqda
  if (loading || !onboardingChecked) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: '#0E97E0',
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          {/* 112px white squircle */}
          <div style={{
            width: '112px',
            height: '112px',
            borderRadius: '28px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
            marginBottom: '26px'
          }}>
            <span style={{
              fontSize: '58px',
              fontWeight: 800,
              color: '#0E97E0',
              letterSpacing: '-0.05em',
              lineHeight: 1,
              marginTop: '-4px'
            }}>tp</span>
          </div>

          {/* "Zehin" Title */}
          <h1 style={{
            fontSize: '34px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
            color: '#ffffff',
            lineHeight: 1
          }}>
            Zehin
          </h1>

          {/* Tagline */}
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.26em',
            color: 'rgba(255, 255, 255, 0.75)',
            margin: 0,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase'
          }}>
            ATTESTATSIYA PLATFORMASI
          </p>
        </div>

        {/* Small subtle loading spinner at the bottom */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          <RefreshCw className="spin" size={12} style={{ color: '#ffffff' }} /> yuklanmoqda...
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
  return (
    <div className="layout-container">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <OfflineIndicator />
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
