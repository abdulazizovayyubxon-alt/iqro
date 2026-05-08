import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Stats from './pages/Stats';
import TestPage from './pages/TestPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ExamPage from './pages/ExamPage';
import SmartReviewPage from './pages/SmartReviewPage';
import MigrationPage from './pages/MigrationPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AchievementsPage from './pages/AchievementsPage';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('migration');
  const [examMode, setExamMode] = useState(false);
  const [testMode, setTestMode] = useState('exam');
  const [selectedTopic, setSelectedTopic] = useState(-1);
  const [theme, setTheme] = useState('light');

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

  const navigateToTest = (topicId = -1, mode = 'exam') => {
    setSelectedTopic(topicId);
    setTestMode(mode);
    setCurrentPage('test');
  };

  // Firebase yuklanmoqda
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--bg)'
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

  // Asosiy ilova
  return (
    <div className="layout-container">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <div className="layout-body">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          navigateToTest={navigateToTest}
        />
        <main className="main-content">
          <AnimatePresence mode="wait">
            {currentPage === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Dashboard navigateToTest={navigateToTest} />
              </motion.div>
            )}
            {currentPage === 'schedule' && (
              <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Schedule />
              </motion.div>
            )}
            {currentPage === 'stats' && (
              <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Stats />
              </motion.div>
            )}
            {currentPage === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AdminPage />
              </motion.div>
            )}
            {currentPage === 'exam' && (
              <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ExamPage goBack={() => setCurrentPage('dashboard')} />
              </motion.div>
            )}
            {currentPage === 'smartreview' && (
              <motion.div key="smartreview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SmartReviewPage goBack={() => setCurrentPage('dashboard')} />
              </motion.div>
            )}
            {currentPage === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LeaderboardPage goBack={() => setCurrentPage('dashboard')} />
              </motion.div>
            )}
            {currentPage === 'achievements' && (
              <motion.div key="achievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AchievementsPage />
              </motion.div>
            )}
            {currentPage === 'test' && (
              <motion.div key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TestPage
                  mode={testMode}
                  setMode={setTestMode}
                  topicId={selectedTopic}
                  setTopicId={setSelectedTopic}
                  goBack={() => setCurrentPage('dashboard')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
