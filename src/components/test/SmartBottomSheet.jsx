import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SmartBottomSheet = ({
  showSelectorDrawer, 
  setShowSelectorDrawer, 
  state, 
  updateState, 
  topicId, 
  setTopicId, 
  SUBJECTS, 
  TOPICS
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Tanlagich (trigger) endi TestHeader sarlavhasida — bu yerda faqat modal */}
      <AnimatePresence>
        {showSelectorDrawer && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelectorDrawer(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(3px)',
                zIndex: 1000,
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%', x: '-50%' }}
              animate={{ y: 0, x: '-50%' }}
              exit={{ y: '100%', x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bottom-sheet-modal"
              style={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                width: '100%',
                maxWidth: '700px',
                background: 'var(--bg2)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                border: '1px solid var(--glass-border)',
                borderBottom: 'none',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>{t('smartSheet.title')}</h3>
                <button
                  onClick={() => setShowSelectorDrawer(false)}
                  aria-label={t('common.close')}
                  style={{ background: 'var(--bg3)', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 30px' }}>
                {/* Subjects Grid */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('smartSheet.subjects')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                    {SUBJECTS.map(subj => {
                      const Icon = subj.icon;
                      const isSelected = subj.id === state.activeCategory;
                      return (
                        <button
                          key={subj.id}
                          onClick={() => updateState({ activeCategory: subj.id, topicId: -1 })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', minHeight: 44,
                            borderRadius: '14px', border: '1.5px solid',
                            background: isSelected ? 'var(--blue-bg)' : 'var(--bg3)',
                            borderColor: isSelected ? 'var(--accent)' : 'transparent',
                            color: isSelected ? 'var(--accent2)' : 'var(--text2)',
                            fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            textAlign: 'left'
                          }}
                        >
                          <Icon size={16} />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Topics List */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('smartSheet.topics')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => { setTopicId(-1); setShowSelectorDrawer(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
                        borderRadius: '14px', border: '1px solid',
                        background: topicId === -1 ? 'var(--bg2)' : 'transparent',
                        borderColor: topicId === -1 ? 'var(--accent)' : 'transparent',
                        color: topicId === -1 ? 'var(--text)' : 'var(--text2)',
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>📚</span> {t('common.allTopics')}
                      </div>
                      {topicId === -1 && <Check size={16} color="var(--accent)" />}
                    </button>
                    {TOPICS.filter(t => Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory).map(t => {
                      const isSelected = topicId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setTopicId(t.id); setShowSelectorDrawer(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
                            borderRadius: '14px', border: '1px solid',
                            background: isSelected ? 'var(--bg2)' : 'transparent',
                            borderColor: isSelected ? 'var(--accent)' : 'transparent',
                            color: isSelected ? 'var(--text)' : 'var(--text2)',
                            fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '16px' }}>{t.icon}</span> {t.name}
                          </div>
                          {isSelected && <Check size={16} color="var(--accent)" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartBottomSheet;
