import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Trash2, CheckCircle2, Play,
  HelpCircle, Trash, BookOpen, Lightbulb, AlertTriangle, BadgeCheck
} from 'lucide-react';
import { SUBJECTS, TOPICS } from '../data/mockData';
import TheoryModal from '../components/theory/TheoryModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import SafeHtml from '../components/shared/SafeHtml';
import { activeMistakes, retiredMistakes, leechMistakes, isRetired, isLeech, mistakeKey } from '../engine/mistakeQueue';

const ErrorNotebookPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, deleteMistake, clearMistakes, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);

  const cat = state.activeCategory;
  const currentSubjectName = SUBJECTS.find(s => s.id === cat)?.name || t('errorNotebook.subjectFallback');
  const mistakes = state.stats?.[cat]?.mistakes || [];

  // ⚠️ AUDIT 2026-08-19, T-3 BAND — xato endi RO'YXAT emas, NAVBAT.
  // Uch holat bor va ular aralashtirilmasligi kerak:
  //   · ochiq      — mashqqa tushadi;
  //   · tirishqoq  — 5+ marta xato: mashq foyda bermayapti, nazariya kerak;
  //   · yopilgan   — o'zlashtirilgan, nazorat savoli sifatida qaytadi.
  const openList = activeMistakes(mistakes);
  const leechList = leechMistakes(mistakes);
  const closedList = retiredMistakes(mistakes);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [status, setStatus] = useState('open'); // 'open' | 'leech' | 'closed'
  const [expandedQuestion, setExpandedQuestion] = useState(null); // qIndex
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [theoryTopic, setTheoryTopic] = useState(null); // { id, name } | null

  const handleBack = () => navigate('/test');

  const statusList = status === 'leech' ? leechList : status === 'closed' ? closedList : openList;

  // Tirishqoq savollar eng ko'p qaysi bo'limda to'plangan — nazariya taklifi
  // shu bo'lim uchun beriladi (bitta savolga emas, TUSHUNCHAGA qaytish kerak).
  const leechTopTopic = (() => {
    if (leechList.length === 0) return null;
    const count = new Map();
    for (const m of leechList) {
      if (m.topicId === undefined || m.topicId === null || m.topicId < 0) continue;
      count.set(m.topicId, (count.get(m.topicId) || 0) + 1);
    }
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const topic = TOPICS.find(tp => tp.id === top[0]);
    return topic ? { id: topic.id, name: topic.name } : null;
  })();

  // Filters
  const filteredMistakes = statusList.filter(m => {
    const matchesSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.correct.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === 'all' || m.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  // Mavzu chiplari joriy HOLAT ro'yxatidan quriladi — aks holda «Didaktika (4)»
  // deb turib, bosilganda bo'sh ro'yxat chiqardi.
  const uniqueTopics = Array.from(new Set(statusList.map(m => m.topic))).filter(Boolean);

  const handleDelete = (mistake, e) => {
    e.stopPropagation();
    deleteMistake(mistake);
    showToast(t('errorNotebook.toastRemoved'), "info");
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handlePractice = () => {
    if (openList.length === 0) return;
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
              {/* Bosh raqam — OCHIQ xatolar. Jami emas: yopilgan xatolar
                  o'zlashtirilgan va ular ustida ishlash kerak emas, ularni
                  hisobga qo'shish esa harakat qilinayotgan foydalanuvchining
                  raqamini o'sib borayotgandek ko'rsatardi (T-3). */}
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>{t('errorNotebook.openErrors')}</div>
              <div style={{ fontSize: 'var(--fs-11xl)', fontWeight: 900, color: openList.length > 0 ? 'var(--red)' : 'var(--green)', lineHeight: 1, marginBottom: 8 }}>{openList.length}</div>
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5, marginBottom: closedList.length > 0 || leechList.length > 0 ? 8 : 20 }}>
                {t('errorNotebook.improveText')}
              </p>
              {(closedList.length > 0 || leechList.length > 0) && (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginBottom: 20 }}>
                  {closedList.length > 0 && t('errorNotebook.closedCount', { count: closedList.length })}
                  {closedList.length > 0 && leechList.length > 0 && ' · '}
                  {leechList.length > 0 && t('errorNotebook.leechCount', { count: leechList.length })}
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <motion.button
                  whileHover={openList.length > 0 ? { scale: 1.01, y: -1 } : undefined}
                  whileTap={openList.length > 0 ? { scale: 0.98 } : undefined}
                  onClick={handlePractice}
                  disabled={openList.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: openList.length > 0 ? 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)' : 'var(--bg3)', color: openList.length > 0 ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', cursor: openList.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: openList.length > 0 ? '0 4px 15px rgba(239, 68, 68, 0.2)' : 'none' }}
                >
                  <Play size={16} fill={openList.length > 0 ? 'white' : 'var(--text3)'} /> {t('errorNotebook.practice')}
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
          {/* Holat chiplari — ochiq / tirishqoq / yopilgan (T-3).
              Bo'sh guruh ko'rsatilmaydi: yangi foydalanuvchi faqat «Ochiq» ni
              ko'radi va interfeys murakkablashmaydi. */}
          {(leechList.length > 0 || closedList.length > 0) && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                { id: 'open', label: t('errorNotebook.statusOpen', { count: openList.length }), color: 'var(--red)' },
                ...(leechList.length > 0 ? [{ id: 'leech', label: t('errorNotebook.statusLeech', { count: leechList.length }), color: 'var(--amber)' }] : []),
                ...(closedList.length > 0 ? [{ id: 'closed', label: t('errorNotebook.statusClosed', { count: closedList.length }), color: 'var(--green)' }] : []),
              ].map(chip => {
                const on = status === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => { setStatus(chip.id); setSelectedTopic('all'); setExpandedQuestion(null); }}
                    style={{
                      padding: '8px 14px', borderRadius: 10,
                      border: `1px solid ${on ? chip.color : 'var(--border)'}`,
                      background: on ? chip.color : 'var(--bg2)',
                      color: on ? '#fff' : 'var(--text2)',
                      fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tirishqoq savollar uchun tushuntirish — foydalanuvchi «nega bular
              mashqda yo'q?» degan savolga javob olishi kerak.
              Maslahat HARAKAT bilan birga keladi: «nazariyani o'qing» deb
              aytib, o'qish yo'lini bermaslik bo'sh nasihat bo'lardi. */}
          {status === 'leech' && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5 }}>
                  {t('errorNotebook.leechHint')}
                </div>
                {/* Eng ko'p tirishqoq savol qaysi bo'limda — o'sha bo'lim nazariyasi */}
                {leechTopTopic && (
                  <button
                    onClick={() => setTheoryTopic(leechTopTopic)}
                    style={{
                      marginTop: 8, padding: '6px 12px', borderRadius: 9,
                      border: '1px solid var(--amber)', background: 'transparent',
                      color: 'var(--amber)', fontSize: 'var(--fs-sm)', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <BookOpen size={13} /> {t('errorNotebook.leechReadTheory', { topic: leechTopTopic.name })}
                  </button>
                )}
              </div>
            </div>
          )}

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
                {t('errorNotebook.allTopicsCount', { count: statusList.length })}
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
                  key={mistakeKey(m) || idx}
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, background: 'var(--red-bg)', color: 'var(--red)', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {m.topic}
                      </span>
                      {/* Necha marta xato qilingani — «bir marta adashdim» va
                          «to'rt marta adashdim» butunlay boshqa vaziyatlar. */}
                      {(m.wrongCount || 1) > 1 && (
                        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, background: 'var(--bg3)', color: 'var(--text3)', padding: '2px 8px', borderRadius: 6 }}>
                          {t('errorNotebook.wrongTimes', { count: m.wrongCount })}
                        </span>
                      )}
                      {isRetired(m) && (
                        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, background: 'var(--green-bg)', color: 'var(--green)', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <BadgeCheck size={11} /> {t('errorNotebook.badgeClosed')}
                        </span>
                      )}
                      {!isRetired(m) && isLeech(m) && (
                        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, background: 'var(--amber-bg)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={11} /> {t('errorNotebook.badgeLeech')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(m, e)}
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

                        {/* ⚠️ AUDIT 2026-08-19, T-2 BAND — ILMIY IZOH.
                            Bu blok umuman yo'q edi: xatolar daftari faqat
                            «to'g'ri javob — B» deb aytardi. Ya'ni foydalanuvchi
                            harfni yodlardi, sababni emas — va bir xil tamoyilga
                            asoslangan boshqa savolda yana xato qilardi.
                            Izoh endi xato yozuvining o'zida saqlanadi. */}
                        {m.explanation && (
                          <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--blue-bg)', border: '1px solid var(--accent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <Lightbulb size={14} style={{ color: 'var(--accent2)' }} />
                              <strong style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text)' }}>
                                {t('exam.explanation')}
                              </strong>
                            </div>
                            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                              {m.explanation.trim().startsWith('<')
                                ? <SafeHtml html={m.explanation} />
                                : m.explanation}
                            </div>
                            {m.source && <div className="q-source">{t('test.source', { source: m.source })}</div>}
                          </div>
                        )}
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

      <TheoryModal
        open={!!theoryTopic}
        onClose={() => setTheoryTopic(null)}
        topicId={theoryTopic?.id}
        topicName={theoryTopic?.name}
      />

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
