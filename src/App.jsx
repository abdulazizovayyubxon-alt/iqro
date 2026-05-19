import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
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
const Schedule = React.lazy(() => import('./pages/Schedule'));
const Stats = React.lazy(() => import('./pages/Stats'));
const TestPage = React.lazy(() => import('./pages/TestPage'));
const ExamPage = React.lazy(() => import('./pages/ExamPage'));
const SmartReviewPage = React.lazy(() => import('./pages/SmartReviewPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const AchievementsPage = React.lazy(() => import('./pages/AchievementsPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const MigrationPage = React.lazy(() => import('./pages/MigrationPage'));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage'));

// ── Skeleton Loader — sahifa yuklanayotganda chiroyli ko'rinish ──
const PageSkeleton = () => (
  <div className="skeleton-page">
    {/* Sarlavha skeleton */}
    <div className="skeleton-header">
      <div className="skeleton-line skeleton-w40 skeleton-h24" />
      <div className="skeleton-line skeleton-w20 skeleton-h16" />
    </div>

    {/* Kartalar skeleton */}
    <div className="skeleton-cards">
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
    <div className="skeleton-content">
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

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
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
    '/': 'Test', '/dashboard': 'Dashboard', '/schedule': 'Jadval', '/stats': 'Statistika',
    '/test': 'Test', '/exam': 'Imtihon', '/review': 'Takrorlash',
    '/leaderboard': 'Reyting', '/achievements': 'Yutuqlar',
    '/admin': 'Admin', '/migration': 'Migratsiya'
  };

  useEffect(() => {
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    trackPageView(pageName, location.pathname);
    startPageTimer(pageName);
  }, [location.pathname]);

  // ── Sentry foydalanuvchi konteksti ──
  useEffect(() => {
    if (user) setUser(user);
    else clearUser();
  }, [user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('iqro-theme') || localStorage.getItem('chqbt-theme');
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.body.classList.add('dark-theme');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.body.classList.add('dark-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('iqro-theme', newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  // Firebase yuklanmoqda
  if (loading || !onboardingChecked) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column',
        gap: '16px', background: 'var(--bg)'
      }}>
        <RefreshCw className="spin" size={36} style={{ color: 'var(--accent)' }} />
        <div style={{ color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}>
          IQRO yuklanmoqda...
        </div>
      </div>
    );
  }

  // Tizimga kirmagan foydalanuvchi
  if (!user) {
    return <LoginPage />;
  }

  // Yangi foydalanuvchi — Onboarding
  if (needsOnboarding) {
    return <OnboardingPage onComplete={() => {
      localStorage.setItem(`iqro_onboarding_${user.uid}`, '1');
      setNeedsOnboarding(false);
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
          <Suspense fallback={<PageSkeleton />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to="/test" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/test" element={<TestPage />} />
                <Route path="/exam" element={<ExamPage />} />
                <Route path="/review" element={<SmartReviewPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/migration" element={<MigrationPage />} />
                <Route path="/referral" element={<ReferralPage />} />
                <Route path="*" element={<Navigate to="/test" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
