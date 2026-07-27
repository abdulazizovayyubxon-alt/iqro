import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { SUBJECTS } from '../data/mockData';
import GiftBox from './shared/GiftBox';
import {
  Home,
  PenTool,
  BookOpen,
  Shield,
  GraduationCap,
  Brain,
  Trophy,
  Medal,
  Users,
  AlertCircle,
  Download,
  Settings,
  Activity,
  School
} from 'lucide-react';

import { PWAContext } from '../context/PWAContext';

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useContext(AppContext);
  const { isInstallable, installApp } = useContext(PWAContext);
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
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
          <div className="sidebar-title">{t('sidebar.subjects')}</div>
          {SUBJECTS.map(subj => {
            const Icon = subj.icon;
            const isSelected = state.activeCategory === subj.id;
            return (
              <div
                key={subj.id}
                className={`nav-item ${isSelected ? 'active' : ''}`}
                onClick={() => { updateState({ activeCategory: subj.id }); navigate('/test'); }}
                style={{ marginBottom: '5px' }}
              >
                <span className="nav-icon"><Icon size={20} /></span> {subj.name}
              </div>
            );
          })}
        </div>

        {/* MAIN NAVIGATION */}
        <div className="sidebar-section">
          <div className="sidebar-title hide-mobile">{t('sidebar.main')}</div>
          <div
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <span className="nav-icon"><Home size={20} /></span>
            <span className="nav-label">{t('sidebar.dashboard')}</span>
          </div>


          <div
            className={`nav-item ${isActive('/test') ? 'active' : ''}`}
            onClick={() => navigateToTest(-1, 'exam')}
          >
            <span className="nav-icon"><PenTool size={20} /></span>
            <span className="nav-label">{t('sidebar.test')}</span>
          </div>

          <div
            className={`nav-item ${isActive('/exam') ? 'active' : ''}`}
            onClick={() => navigate('/exam')}
          >
            <span className="nav-icon"><GraduationCap size={20} /></span>
            <span className="nav-label">{t('sidebar.exam')}</span>
          </div>

          <div
            className={`nav-item ${isActive('/review') ? 'active' : ''}`}
            onClick={() => navigate('/review')}
          >
            <span className="nav-icon"><Brain size={20} /></span>
            <span className="nav-label">{t('sidebar.review')}</span>
            {(() => {
              const now = Date.now();
              const due = (state.spacedCards || []).filter(c => c.nextReview <= now).length;
              return due > 0 ? <span style={{ background: 'var(--red)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>{due}</span> : null;
            })()}
          </div>

          <div
            className={`nav-item ${isActive('/errors') ? 'active' : ''}`}
            onClick={() => navigate('/errors')}
          >
            <span className="nav-icon"><AlertCircle size={20} /></span>
            <span className="nav-label">{t('sidebar.errors')}</span>
            {(() => {
              const cat = state.activeCategory;
              const mistakesCount = (state.stats?.[cat]?.mistakes || []).length;
              return mistakesCount > 0 ? <span style={{ background: 'var(--red)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>{mistakesCount}</span> : null;
            })()}
          </div>

          <div
            className={`nav-item ${isActive('/leaderboard') ? 'active' : ''}`}
            onClick={() => navigate('/leaderboard')}
          >
            <span className="nav-icon"><Trophy size={20} /></span>
            <span className="nav-label">{t('sidebar.leaderboard')}</span>
          </div>

          <div
            className={`nav-item ${isActive('/achievements') ? 'active' : ''}`}
            onClick={() => navigate('/achievements')}
          >
            <span className="nav-icon"><Medal size={20} /></span>
            <span className="nav-label">{t('sidebar.achievements')}</span>
          </div>

          <div
            className={`nav-item ${isActive('/analysis') ? 'active' : ''}`}
            onClick={() => navigate('/analysis')}
          >
            <span className="nav-icon"><Activity size={20} /></span>
            <span className="nav-label">{t('sidebar.analysis')}</span>
          </div>

          {/* Maktab — faqat admin yoki maktabga a'zo bo'lganlarga */}
          {(isAdmin || user?.schoolId) && (
            <div
              className={`nav-item ${isActive('/school') ? 'active' : ''}`}
              onClick={() => navigate('/school')}
            >
              <span className="nav-icon"><School size={20} /></span>
              <span className="nav-label">{t('sidebar.school')}</span>
            </div>
          )}

          <div
            className={`nav-item ${isActive('/referral') ? 'active' : ''}`}
            onClick={() => navigate('/referral')}
          >
            <span className="nav-icon"><Users size={20} /></span>
            <span className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {t('sidebar.invite')}
              <span style={{ animation: 'pulseGift 1.5s infinite', display: 'inline-flex' }}><GiftBox size={16} /></span>
            </span>
          </div>

          {/* Sozlamalar — faqat desktop (mobilda Profil ichidan ochiladi) */}
          <div
            className={`nav-item hide-mobile ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <span className="nav-icon"><Settings size={20} /></span>
            <span className="nav-label">{t('sidebar.settings')}</span>
          </div>

          {/* INSTALL APP */}
          {isInstallable && (
            <div
              className={`nav-item`}
              onClick={installApp}
              style={{ background: 'var(--green-bg)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
            >
              <span className="nav-icon" style={{ color: 'var(--green)' }}><Download size={20} /></span>
              <span className="nav-label" style={{ color: 'var(--green)', fontWeight: 800 }}>{t('sidebar.install')}</span>
            </div>
          )}

          {/* Admin link — faqat admin uchun */}
          {isAdmin && (
            <div
              className={`nav-item ${isActive('/admin') ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <span className="nav-icon"><Shield size={20} /></span>
              <span className="nav-label">{t('sidebar.admin')}</span>
            </div>
          )}

          {/* MOBILE ONLY: Subject Switcher (Yashirildi) */}
          <div
            className="nav-item hide-mobile"
            onClick={() => setShowMobSubjects(true)}
            style={{ display: 'none' }}
          >
            <span className="nav-icon"><BookOpen size={20} /></span>
            <span className="nav-label">{t('sidebar.subjects')}</span>
          </div>
        </div>


      </div>

      {/* MOBILE SUBJECT SELECTOR MODAL */}
      {showMobSubjects && (
        <div className="modal-overlay" onClick={() => setShowMobSubjects(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{t('sidebar.chooseSubject')}</div>
            <div className="modal-text">{t('sidebar.currentSubject')} <strong>{activeCategoryName}</strong></div>
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
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
