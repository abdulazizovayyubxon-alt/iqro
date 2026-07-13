import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// MTT (maktabgacha) yo'nalishlari — qolganlari "Maktab fanlari" guruhiga kiradi
const MTT_IDS = ['mtt', 'mtt_rahbar', 'mtt_logoped', 'mtt_psixolog'];

const SmartBottomSheet = ({
  showSelectorDrawer,
  setShowSelectorDrawer,
  state,
  updateState,
  topicId,
  setTopicId,
  SUBJECTS,
  TOPICS,
  subjectsOnly = false,
  topicsOnly = false
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const activeSubject = SUBJECTS.find(s => s.id === state.activeCategory);
  const ActiveIcon = activeSubject ? activeSubject.icon : null;

  // Joriy fan topiklari (kategoriya bo'yicha) — hero o'zlashtirishi va topiklar ro'yxati uchun
  const categoryTopics = useMemo(
    () => TOPICS.filter(top => Array.isArray(top.category) ? top.category.includes(state.activeCategory) : top.category === state.activeCategory),
    [TOPICS, state.activeCategory]
  );

  // Fan o'zlashtirishi — faol fan topiklari statistikasidan agregatlanadi (HAQIQIY ma'lumot, soxta emas)
  const masteryPct = useMemo(() => {
    const stats = state.topicStats || {};
    let answered = 0, correct = 0;
    categoryTopics.forEach(top => {
      const ts = stats[top.id];
      if (ts && ts.answered > 0) { answered += ts.answered; correct += ts.correct; }
    });
    return answered > 0 ? Math.round((correct / answered) * 100) : null;
  }, [state.topicStats, categoryTopics]);

  const q = query.trim().toLowerCase();
  const matches = (subj) => !q || subj.name.toLowerCase().includes(q) || (subj.desc && subj.desc.toLowerCase().includes(q));

  // Faol fan grid'dan chiqariladi — u hero kartada ko'rsatiladi
  const schoolSubjects = SUBJECTS.filter(s => !MTT_IDS.includes(s.id) && s.id !== state.activeCategory && matches(s));
  const mttSubjects = SUBJECTS.filter(s => MTT_IDS.includes(s.id) && s.id !== state.activeCategory && matches(s));
  const noResults = q && schoolSubjects.length === 0 && mttSubjects.length === 0;

  // Bitta fan kartasi — neytral kulrang (faol fan hero kartada, bu yerda faqat boshqalari)
  const renderSubjectCard = (subj) => {
    const Icon = subj.icon;
    return (
      <button
        key={subj.id}
        onClick={() => { updateState({ activeCategory: subj.id, topicId: -1 }); setQuery(''); if (subjectsOnly) setShowSelectorDrawer(false); }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, padding: 13, minHeight: 64,
          borderRadius: 15, border: '1px solid var(--border)', background: 'var(--bg2)',
          cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left',
        }}
      >
        <span style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--blue-bg)', color: 'var(--accent)', marginBottom: 10,
        }}>
          <Icon size={20} strokeWidth={2} />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{subj.name}</span>
        {subj.desc && (
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', lineHeight: 1.25, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{subj.desc}</span>
        )}
      </button>
    );
  };

  const groupHeaderStyle = { fontSize: 11, fontWeight: 800, color: 'var(--text3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' };

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
              {/* Header: sarlavha + subtitr + yopish */}
              <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '23px', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>{topicsOnly ? t('smartSheet.topicTitle') : t('smartSheet.title')}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: 2 }}>{topicsOnly ? (activeSubject ? activeSubject.name : t('smartSheet.subtitle')) : t('smartSheet.subtitle')}</div>
                </div>
                <button
                  onClick={() => setShowSelectorDrawer(false)}
                  aria-label={t('common.close')}
                  style={{ flexShrink: 0, background: 'var(--surface2)', border: '1px solid var(--border)', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 30px' }}>
                {/* Qidiruv + hero + fan grid'lari — faqat fan tanlash rejimida */}
                {!topicsOnly && (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '12px 14px', marginBottom: 18 }}>
                  <Search size={18} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--text3)' }} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('smartSheet.searchPlaceholder')}
                    aria-label={t('smartSheet.searchPlaceholder')}
                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)' }}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} aria-label={t('common.close')} style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* HERO — Faol fan kartasi (qidiruvsiz holatda) */}
                {activeSubject && !q && (
                  <div style={{ background: 'var(--cta)', borderRadius: 18, padding: 16, marginBottom: 22, boxShadow: '0 12px 28px rgba(14,151,224,0.32)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {ActiveIcon && <ActiveIcon size={25} strokeWidth={2} />}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.20)', padding: '5px 11px', borderRadius: 99 }}>
                        <Check size={13} strokeWidth={3.2} color="#fff" />
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>{t('smartSheet.activeFan')}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 13 }}>{activeSubject.name}</div>
                    {activeSubject.desc && (
                      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>{activeSubject.desc}</div>
                    )}
                    {masteryPct !== null && (
                      <>
                        <div style={{ marginTop: 14, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{t('smartSheet.mastery')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>{masteryPct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                          <div style={{ width: `${masteryPct}%`, height: '100%', borderRadius: 99, background: '#fff' }} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Fanlar — guruhlangan, neytral; faqat tanlangani (hero) rangli */}
                {schoolSubjects.length > 0 && (
                  <div style={{ marginBottom: '22px' }}>
                    <div style={groupHeaderStyle}>{t('smartSheet.schoolSubjects')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {schoolSubjects.map(renderSubjectCard)}
                    </div>
                  </div>
                )}

                {mttSubjects.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={groupHeaderStyle}>{t('smartSheet.mttSubjects')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {mttSubjects.map(renderSubjectCard)}
                    </div>
                  </div>
                )}

                {noResults && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 14, fontWeight: 600 }}>
                    {t('smartSheet.noResults')}
                  </div>
                )}
                </>)}

                {/* Topics List — qidiruvsiz holatda (mavzu tanlash funksiyasi saqlanadi) */}
                {!q && !subjectsOnly && (
                  <div>
                    <div style={groupHeaderStyle}>{t('smartSheet.topics')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={() => { setTopicId(-1); setShowSelectorDrawer(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', minHeight: 52,
                          borderRadius: '14px', border: '1px solid',
                          background: topicId === -1 ? 'var(--blue-bg)' : 'var(--bg2)',
                          borderColor: topicId === -1 ? 'var(--accent)' : 'var(--border)',
                          color: topicId === -1 ? 'var(--accent2)' : 'var(--text)',
                          fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '17px' }}>📚</span> {t('common.allTopics')}
                        </span>
                        {topicId === -1 && <Check size={17} color="var(--accent)" style={{ flexShrink: 0 }} />}
                      </button>
                      {categoryTopics.map(top => {
                        const isSelected = topicId === top.id;
                        const hint = top.theoryHint ? top.theoryHint.replace(/^📌\s*/, '') : '';
                        return (
                          <button
                            key={top.id}
                            onClick={() => { setTopicId(top.id); setShowSelectorDrawer(false); }}
                            style={{
                              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '12px 16px', minHeight: 52,
                              borderRadius: '14px', border: '1px solid',
                              background: isSelected ? 'var(--blue-bg)' : 'var(--bg2)',
                              borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                              cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left'
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 }}>
                              <span style={{ flexShrink: 0, marginTop: 1, lineHeight: 1, color: isSelected ? 'var(--accent)' : 'var(--text3)' }}>{top.icon}</span>
                              <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? 'var(--accent2)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.name}</span>
                                {hint && (
                                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hint}</span>
                                )}
                              </span>
                            </span>
                            {isSelected && <Check size={17} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartBottomSheet;
