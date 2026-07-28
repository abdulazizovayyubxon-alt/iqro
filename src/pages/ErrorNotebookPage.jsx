import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Trash2, CheckCircle2, Play, 
  HelpCircle, Trash, BookOpen
} from 'lucide-react';
import { SUBJECTS } from '../data/mockData';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const ErrorNotebookPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, deleteMistake, clearMistakes, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);

  const cat = state.activeCategory;
  const currentSubjectName = SUBJECTS.find(s => s.id === cat)?.name || t('errorNotebook.subjectFallback');
  const mistakes = state.stats?.[cat]?.mistakes || [];

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [expandedQuestion, setExpandedQuestion] = useState(null); // qIndex
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleBack = () => navigate('/test');

  // Filters
  const filteredMistakes = mistakes.filter(m => {
    const matchesSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.correct.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === 'all' || m.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  // Unique topics from mistakes list for filter dropdown
  const uniqueTopics = Array.from(new Set(mistakes.map(m => m.topic))).filter(Boolean);

  const handleDelete = (questionText, e) => {
    e.stopPropagation();
    deleteMistake(questionText);
    showToast(t('errorNotebook.toastRemoved'), "info");
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handlePractice = () => {
    if (mistakes.length === 0) return;
    updateState({ topicId: -1, testMode: 'mistakes' });
    navigate('/test');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: '12px 16px 80px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          onClick={handleBack}
          style={{ width: 38, height: 38, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <ArrowLeft size={18} color="var(--text2)" />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: 'var(--text)', margin: '0 0 2px' }}>{t('errorNotebook.title')}</h1>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>{t('errorNotebook.subtitle', { subject: currentSubjectName })}</div>
        </div>
      </div>

      {/* Stats and Action Cards */}
      {mistakes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 20 }}>
          <div className="glass-panel" style={{ padding: '24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Background Glow */}
            <div style={{ position: 'absolute', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>{t('errorNotebook.totalErrors')}</div>
              <div style={{ fontSize: 'var(--fs-11xl)', fontWeight: 900, color: 'var(--red)', lineHeight: 1, marginBottom: 8 }}>{mistakes.length}</div>
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5, marginBottom: 20 }}>
                {t('errorNotebook.improveText')}
              </p>
              
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <motion.button 
                  whileHover={{ scale: 1.01, y: -1 }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={handlePractice} 
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' }}
                >
                  <Play size={16} fill="white" /> {t('errorNotebook.practice')}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.01 }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={handleClearAll} 
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px', border: '1.5px solid var(--border)', borderRadius: 14, fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text2)', background: 'var(--bg2)' }}
                >
                  <Trash size={15} /> {t('dashboard.clear')}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Filters */}
      {mistakes.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexDirection: 'column' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} color="var(--text3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('errorNotebook.searchPlaceholder')}
              style={{
                width: '100%',
                padding: '14px 16px 14px 44px',
                borderRadius: 16,
                border: '1.5px solid var(--border)',
                background: 'var(--bg2)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: 'var(--fs-input)',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          {/* Dropdown filters */}
          {uniqueTopics.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <button 
                onClick={() => setSelectedTopic('all')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: selectedTopic === 'all' ? '#EF4444' : 'var(--border)',
                  background: selectedTopic === 'all' ? '#EF4444' : 'var(--bg2)',
                  color: selectedTopic === 'all' ? '#fff' : 'var(--text2)',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap'
                }}
              >
                {t('errorNotebook.allTopicsCount', { count: mistakes.length })}
              </button>
              {uniqueTopics.map((topic, i) => {
                const count = mistakes.filter(m => m.topic === topic).length;
                const isSelected = selectedTopic === topic;
                return (
                  <button 
                    key={i}
                    onClick={() => setSelectedTopic(topic)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid',
                      borderColor: isSelected ? '#EF4444' : 'var(--border)',
                      background: isSelected ? '#EF4444' : 'var(--bg2)',
                      color: isSelected ? '#fff' : 'var(--text2)',
                      fontSize: 'var(--fs-sm)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {topic} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mistakes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence mode="popLayout">
          {filteredMistakes.length > 0 ? (
            filteredMistakes.map((m, idx) => {
              const isExpanded = expandedQuestion === idx;
              return (
                <motion.div
                  key={m.question + idx}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="glass-panel"
                  style={{ 
                    padding: '16px 20px', 
                    borderLeft: '4px solid var(--red)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red)', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {m.topic}
                    </span>
                    <button 
                      onClick={(e) => handleDelete(m.question, e)}
                      style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        color: 'var(--text3)', 
                        cursor: 'pointer', 
                        padding: 4,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s, background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ fontSize: 'var(--fs-option)', fontWeight: 'var(--fw-medium)', color: 'var(--text)', lineHeight: 'var(--lh-snug)', marginBottom: 8 }}>
                    {m.question}
                  </div>

                  {/* Expander indicator */}
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                    <HelpCircle size={12} /> {isExpanded ? t('errorNotebook.hideOptions') : t('errorNotebook.showOptions')}
                  </div>

                  {/* Expanded contents (details) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ overflow: 'hidden', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}
                        onClick={e => e.stopPropagation()} // don't collapse on clicking content
                      >
                        {m.opts && m.opts.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                            {m.opts.map((opt, i) => {
                              const isCorrect = opt.replace(/^[A-D]\)\s*/, '') === m.correct.replace(/^[A-D]\)\s*/, '');
                              return (
                                <div 
                                  key={i}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    fontSize: 'var(--fs-md)',
                                    fontWeight: 500,
                                    background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg3)',
                                    border: isCorrect ? '1.5px solid var(--green)' : '1px solid var(--border)',
                                    color: isCorrect ? 'var(--text)' : 'var(--text2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: isCorrect ? 'var(--green)' : 'var(--text3)' }}>
                                    {['A','B','C','D'][i]}
                                  </span>
                                  {opt.replace(/^[A-D]\)\s*/, '')}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                          <CheckCircle2 size={15} color="var(--green)" />
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', fontWeight: 500 }}>
                            <strong>{t('test.correctAnswer')}</strong> {m.correct.replace(/^[A-D]\)\s*/, '')}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 24,
                boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
                marginTop: 20
              }}
            >
              <div className="float-animation" style={{ fontSize: 'var(--fs-hero-sm)', marginBottom: 14 }}>
                {mistakes.length === 0 ? '🏆' : '🔍'}
              </div>
              <h3 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
                {mistakes.length === 0 ? t('errorNotebook.emptyTitle') : t('errorNotebook.noResults')}
              </h3>
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
                {mistakes.length === 0
                  ? t('errorNotebook.emptyText')
                  : t('errorNotebook.noResultsText')}
              </p>
              {mistakes.length === 0 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/test')}
                  style={{
                    padding: '12px 24px',
                    background: 'var(--grad-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 'var(--fs-base)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 15px rgba(41, 182, 246, 0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <BookOpen size={16} /> {t('errorNotebook.startTests')}
                </motion.button>
              ) : (
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedTopic('all'); }}
                  className="btn btn-outline"
                  style={{ margin: '0 auto' }}
                >
                  {t('errorNotebook.clearFilters')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title={t('errorNotebook.clearConfirmTitle')}
        text={t('errorNotebook.clearConfirmText')}
        confirmLabel={t('errorNotebook.clearConfirmBtn')}
        danger
        onConfirm={() => {
          clearMistakes();
          setShowClearConfirm(false);
          showToast(t('errorNotebook.toastCleared'), 'info');
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </motion.div>
  );
};

export default ErrorNotebookPage;
