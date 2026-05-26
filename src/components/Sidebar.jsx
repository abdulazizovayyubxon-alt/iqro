import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAdmin } from '../hooks/useAdmin';
import { TOPICS, SUBJECTS } from '../data/mockData';
import {
  LayoutDashboard,
  PenTool,
  BookOpen,
  Shield,
  GraduationCap,
  Brain,
  Trophy,
  Medal,
  Palette,
  Users,
} from 'lucide-react';


const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useContext(AppContext);
  const { isAdmin } = useAdmin();
  const [showMobSubjects, setShowMobSubjects] = useState(false);

  // Joriy sahifani aniqlash — uniformly location.pathname orqali
  const isActive = (path) => location.pathname === path;

  const activeSubject = SUBJECTS.find(s => s.id === state.activeCategory);
  const activeCategoryName = activeSubject ? activeSubject.name : "CHQBT";

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
          {SUBJECTS.map(subj => {
            const Icon = subj.icon;
            const isSelected = state.activeCategory === subj.id;
            return (
              <div
                key={subj.id}
                className={`nav-item ${isSelected ? 'active' : ''}`}
                onClick={() => { updateState({ activeCategory: subj.id }); navigate('/'); }}
                style={{ marginBottom: '5px' }}
              >
                <span className="nav-icon"><Icon size={20} /></span> {subj.name}
              </div>
            );
          })}
        </div>

        {/* MAIN NAVIGATION */}
        <div className="sidebar-section">
          <div className="sidebar-title hide-mobile">Asosiy</div>
          {isAdmin && (
            <div
              className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              <span className="nav-icon"><LayoutDashboard size={20} /></span>
              <span className="nav-label">Dashboard</span>
            </div>
          )}


          <div
            className={`nav-item ${isActive('/test') ? 'active' : ''}`}
            onClick={() => navigateToTest(-1, 'exam')}
          >
            <span className="nav-icon"><PenTool size={20} /></span>
            <span className="nav-label">Test</span>
          </div>

          <div
            className={`nav-item ${isActive('/exam') ? 'active' : ''}`}
            onClick={() => navigate('/exam')}
          >
            <span className="nav-icon"><GraduationCap size={20} /></span>
            <span className="nav-label">Imtihon</span>
          </div>

          <div
            className={`nav-item ${isActive('/review') ? 'active' : ''}`}
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
            className={`nav-item ${isActive('/leaderboard') ? 'active' : ''}`}
            onClick={() => navigate('/leaderboard')}
          >
            <span className="nav-icon"><Trophy size={20} /></span>
            <span className="nav-label">Reyting</span>
          </div>

          <div
            className={`nav-item ${isActive('/achievements') ? 'active' : ''}`}
            onClick={() => navigate('/achievements')}
          >
            <span className="nav-icon"><Medal size={20} /></span>
            <span className="nav-label">Yutuqlar</span>
          </div>

          <div
            className={`nav-item ${isActive('/referral') ? 'active' : ''}`}
            onClick={() => navigate('/referral')}
          >
            <span className="nav-icon"><Users size={20} /></span>
            <span className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Do'stlarni taklif qilish
              <span style={{ animation: 'pulseGift 1.5s infinite', display: 'inline-block' }}>🎁</span>
            </span>
          </div>

          {/* Admin link — faqat admin uchun */}
          {isAdmin && (
            <div
              className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
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


      </div>

      {/* MOBILE SUBJECT SELECTOR MODAL */}
      {showMobSubjects && (
        <div className="modal-overlay" onClick={() => setShowMobSubjects(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Fanni tanlang</div>
            <div className="modal-text">Hozirgi fan: <strong>{activeCategoryName}</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SUBJECTS.map(subj => {
                const Icon = subj.icon;
                const isSelected = state.activeCategory === subj.id;
                return (
                  <button
                    key={subj.id}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'flex-start', padding: '16px', display: 'flex', alignItems: 'center' }}
                    onClick={() => { updateState({ activeCategory: subj.id }); navigate('/'); setShowMobSubjects(false); }}
                  >
                    <Icon size={20} style={{ marginRight: '10px' }} /> {subj.name}
                  </button>
                );
              })}
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
