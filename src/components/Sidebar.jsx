import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAdmin } from '../hooks/useAdmin';
import { TOPICS } from '../data/mockData';
import {
  LayoutDashboard,
  BarChart3,
  PenTool,
  BookOpen,
  Shield,
  GraduationCap,
  Brain,
  Trophy,
  Medal,
  Palette
} from 'lucide-react';

// URL xaritasi — route ↔ sahifa nomi
const ROUTE_MAP = {
  '/': 'dashboard',
  '/test': 'test',
  '/exam': 'exam',
  '/review': 'smartreview',
  '/leaderboard': 'leaderboard',
  '/achievements': 'achievements',
  '/admin': 'admin',
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useContext(AppContext);
  const { isAdmin } = useAdmin();
  const [showMobSubjects, setShowMobSubjects] = useState(false);

  // Joriy sahifani aniqlash
  const currentPage = ROUTE_MAP[location.pathname] || 'dashboard';

  const activeCategoryName = state.activeCategory === 'art' ? "Tasviriy san'at" : "CHQBT";

  // Test sahifasiga o'tish (topicId va mode bilan)
  const navigateToTest = (topicId, mode = 'exam') => {
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  return (
    <>
      <div className="sidebar">
        {/* DESKTOP ONLY: Platform Switcher */}
        <div className="sidebar-section hide-mobile" style={{ borderBottom: '1px solid var(--border)', marginBottom: '15px', paddingBottom: '15px' }}>
          <div className="sidebar-title">Fanlar</div>
          <div
            className={`nav-item ${state.activeCategory === 'chqbt' ? 'active' : ''}`}
            onClick={() => { updateState({ activeCategory: 'chqbt' }); navigate('/'); }}
            style={{ marginBottom: '5px' }}
          >
            <span className="nav-icon"><Medal size={20} /></span> CHQBT Platformasi
          </div>
          <div
            className={`nav-item ${state.activeCategory === 'art' ? 'active' : ''}`}
            onClick={() => { updateState({ activeCategory: 'art' }); navigate('/'); }}
          >
            <span className="nav-icon"><Palette size={20} /></span> Tasviriy san'at
          </div>
        </div>

        {/* MAIN NAVIGATION */}
        <div className="sidebar-section">
          <div className="sidebar-title hide-mobile">Asosiy</div>
          {isAdmin && (
            <div
              className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              <span className="nav-icon"><LayoutDashboard size={20} /></span>
              <span className="nav-label">Dashboard</span>
            </div>
          )}


          <div
            className={`nav-item ${currentPage === 'test' ? 'active' : ''}`}
            onClick={() => navigateToTest(-1, 'exam')}
          >
            <span className="nav-icon"><PenTool size={20} /></span>
            <span className="nav-label">Test</span>
          </div>

          <div
            className={`nav-item ${currentPage === 'exam' ? 'active' : ''}`}
            onClick={() => navigate('/exam')}
          >
            <span className="nav-icon"><GraduationCap size={20} /></span>
            <span className="nav-label">Imtihon</span>
          </div>

          <div
            className={`nav-item ${location.pathname === '/review' ? 'active' : ''}`}
            onClick={() => navigate('/review')}
          >
            <span className="nav-icon"><Brain size={20} /></span>
            <span className="nav-label">Takrorlash</span>
            {(() => {
              const now = Date.now();
              const due = (state.spacedCards || []).filter(c => c.nextReview <= now).length;
              return due > 0 ? <span style={{ background: 'var(--red)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>{due}</span> : null;
            })()}
          </div>

          <div
            className={`nav-item ${currentPage === 'leaderboard' ? 'active' : ''}`}
            onClick={() => navigate('/leaderboard')}
          >
            <span className="nav-icon"><Trophy size={20} /></span>
            <span className="nav-label">Reyting</span>
          </div>

          <div
            className={`nav-item ${currentPage === 'achievements' ? 'active' : ''}`}
            onClick={() => navigate('/achievements')}
          >
            <span className="nav-icon"><Medal size={20} /></span>
            <span className="nav-label">Yutuqlar</span>
          </div>

          {/* Admin link — faqat admin uchun */}
          {isAdmin && (
            <div
              className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <span className="nav-icon"><Shield size={20} /></span>
              <span className="nav-label">Admin Panel</span>
            </div>
          )}

          {/* MOBILE ONLY: Subject Switcher (Yashirildi) */}
          <div
            className="nav-item hide-mobile"
            onClick={() => setShowMobSubjects(true)}
            style={{ display: 'none' }}
          >
            <span className="nav-icon"><BookOpen size={20} /></span>
            <span className="nav-label">Fanlar</span>
          </div>
        </div>

        {/* DESKTOP ONLY: Topics List */}
        <div className="sidebar-section hide-mobile">
          <div className="sidebar-title">
            {state.activeCategory === 'art' ? "Mavzular" : "Bo'limlar"}
          </div>
          {TOPICS.filter(t => Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory).map((t) => {
            const s = state.topicStats[t.id];
            const pct = s && s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0;
            return (
              <div
                key={t.id}
                className={`nav-item ${location.pathname === '/test' && state.topicId === t.id ? 'active' : ''} ${pct >= 70 ? 'done' : ''}`}
                onClick={() => navigateToTest(t.id, 'exam')}
              >
                <span className="nav-icon">{t.icon}</span>
                <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <span className="nav-progress" style={{ color: pct >= 70 ? 'var(--green)' : 'var(--text3)' }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MOBILE SUBJECT SELECTOR MODAL */}
      {showMobSubjects && (
        <div className="modal-overlay" onClick={() => setShowMobSubjects(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Fanni tanlang</div>
            <div className="modal-text">Hozirgi fan: <strong>{activeCategoryName}</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className={`btn ${state.activeCategory === 'chqbt' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '16px', display: 'flex', alignItems: 'center' }}
                onClick={() => { updateState({ activeCategory: 'chqbt' }); navigate('/'); setShowMobSubjects(false); }}
              >
                <Medal size={20} style={{ marginRight: '10px' }} /> CHQBT Platformasi
              </button>
              <button
                className={`btn ${state.activeCategory === 'art' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '16px', display: 'flex', alignItems: 'center' }}
                onClick={() => { updateState({ activeCategory: 'art' }); navigate('/'); setShowMobSubjects(false); }}
              >
                <Palette size={20} style={{ marginRight: '10px' }} /> Tasviriy san'at
              </button>
            </div>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowMobSubjects(false)}>
              Yopish
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
