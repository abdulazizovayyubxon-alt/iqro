import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

// MTT (maktabgacha) yo'nalishlari — qolganlari "Maktab fanlari" guruhiga kiradi
const MTT_IDS = ['mtt', 'mtt_rahbar', 'mtt_logoped', 'mtt_psixolog', 'mtt_jismoniy'];

const inCategory = (topic, cat) =>
  Array.isArray(topic.category) ? topic.category.includes(cat) : topic.category === cat;

/**
 * SmartBottomSheet — fan va bo'lim tanlashning YAGONA oynasi (ikki bosqichli).
 *
 * Ilgari ikkita alohida oyna edi: fan tanlagach oyna yopilardi va foydalanuvchi
 * bo'limni tanlash uchun boshqa tugmani qidirishi kerak bo'lardi. Endi:
 *   1-bosqich "Fan" → tanlangach oyna YOPILMAYDI, o'zi 2-bosqichga o'tadi
 *   2-bosqich "Bo'lim" → tanlangach oyna yopiladi
 * Qidiruv ikkala bosqichda ham ishlaydi (ilgari faqat fanlarda edi).
 */
const SmartBottomSheet = ({
  open,
  onClose,
  initialTab = 'subject',
  state,
  updateState,
  topicId,
  setTopicId,
  SUBJECTS,
  TOPICS,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');

  // Oyna har ochilganda kerakli bosqichdan boshlanadi va qidiruv tozalanadi
  useEffect(() => {
    if (open) { setTab(initialTab); setQuery(''); }
  }, [open, initialTab]);

  const activeSubject = SUBJECTS.find(s => s.id === state.activeCategory);

  // Joriy fan bo'limlari — 2-bosqich ro'yxati uchun
  const categoryTopics = useMemo(
    () => TOPICS.filter(top => inCategory(top, state.activeCategory)),
    [TOPICS, state.activeCategory]
  );

  // Har fan uchun o'zlashtirish foizi — HAQIQIY ma'lumot (topicStats), soxta emas.
  // Kartachalarda ko'rsatiladi: qaysi fanda ortda qolgani darrov ko'rinadi.
  const masteryBySubject = useMemo(() => {
    const stats = state.topicStats || {};
    const out = {};
    SUBJECTS.forEach(subj => {
      let answered = 0, correct = 0;
      TOPICS.forEach(top => {
        if (!inCategory(top, subj.id)) return;
        const ts = stats[top.id];
        if (ts && ts.answered > 0) { answered += ts.answered; correct += ts.correct; }
      });
      out[subj.id] = answered > 0 ? Math.round((correct / answered) * 100) : null;
    });
    return out;
  }, [state.topicStats, SUBJECTS, TOPICS]);

  const topicMastery = (id) => {
    const ts = (state.topicStats || {})[id];
    return (ts && ts.answered > 0) ? Math.round((ts.correct / ts.answered) * 100) : null;
  };

  const pctColor = (pct) => pct === null ? 'var(--text3)' : pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';

  const q = query.trim().toLowerCase();
  const matchSubject = (s) => !q || s.name.toLowerCase().includes(q) || (s.desc && s.desc.toLowerCase().includes(q));
  const matchTopic = (tp) => !q || tp.name.toLowerCase().includes(q) || (tp.subtitle && tp.subtitle.toLowerCase().includes(q));

  // Profildagi o'qituvchilik fani — birinchi guruhda ★ bilan chiqadi
  const profileSubjectId = user?.subject || null;
  const pinnedIds = [state.activeCategory, profileSubjectId].filter(Boolean);
  const pinned = SUBJECTS.filter(s => pinnedIds.includes(s.id) && matchSubject(s));
  const schoolSubjects = SUBJECTS.filter(s => !MTT_IDS.includes(s.id) && !pinnedIds.includes(s.id) && matchSubject(s));
  const mttSubjects = SUBJECTS.filter(s => MTT_IDS.includes(s.id) && !pinnedIds.includes(s.id) && matchSubject(s));
  const noSubjectResults = q && pinned.length === 0 && schoolSubjects.length === 0 && mttSubjects.length === 0;

  const visibleTopics = categoryTopics.filter(matchTopic);

  const chooseSubject = (id) => {
    updateState({ activeCategory: id, topicId: -1 });
    setQuery('');
    setTab('topic'); // oyna yopilmaydi — keyingi bosqichga o'tadi
  };

  const chooseTopic = (id) => {
    setTopicId(id);
    onClose();
  };

  // ── Fan kartasi. Faol fan ro'yxatdan OLIB TASHLANMAYDI (ilgari shunday edi va
  //    ro'yxat sakrab ketardi) — u shu yerda "Faol" nishoni bilan turadi.
  const renderSubjectCard = (subj) => {
    const Icon = subj.icon;
    const isActive = subj.id === state.activeCategory;
    const isProfile = subj.id === profileSubjectId;
    const pct = masteryBySubject[subj.id];
    return (
      <button
        key={subj.id}
        onClick={() => chooseSubject(subj.id)}
        style={{
          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          padding: 12, minHeight: 64, borderRadius: 15,
          border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          background: isActive ? 'var(--blue-bg)' : 'var(--bg2)',
          cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        {(isActive || isProfile) && (
          <span style={{
            position: 'absolute', top: 9, right: 9, display: 'inline-flex', alignItems: 'center', gap: 3,
            background: isActive ? 'var(--accent)' : 'var(--amber)', color: '#fff',
            fontSize: 'var(--fs-3xs)', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
          }}>
            {isActive ? <><Check size={9} strokeWidth={3.4} />{t('smartSheet.activeShort')}</> : <Star size={9} strokeWidth={3} fill="#fff" />}
          </span>
        )}
        <span style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9,
          background: isActive ? 'var(--accent)' : 'var(--blue-bg)',
          color: isActive ? '#fff' : 'var(--accent)',
        }}>
          <Icon size={19} strokeWidth={2} />
        </span>
        <span style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
          {subj.name}
        </span>
        {pct !== null ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginTop: 7 }}>
            <span style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 99, background: pctColor(pct) }} />
            </span>
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: pctColor(pct) }}>{pct}%</span>
          </span>
        ) : (
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 7 }}>{t('smartSheet.notStarted')}</span>
        )}
      </button>
    );
  };

  // ── Bo'lim qatori
  const renderTopicRow = ({ id, name, subtitle, icon, selected }) => {
    const pct = id === -1 ? masteryBySubject[state.activeCategory] : topicMastery(id);
    return (
      <button
        key={id}
        onClick={() => chooseTopic(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', minHeight: 56,
          borderRadius: 13,
          border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          background: selected ? 'var(--blue-bg)' : 'var(--bg2)',
          cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          flexShrink: 0, width: 34, height: 34, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-lg)',
          background: selected ? 'var(--accent)' : 'var(--surface2)',
          color: selected ? '#fff' : 'var(--text3)',
        }}>{icon}</span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--fs-md)', fontWeight: 700, color: selected ? 'var(--accent2)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </span>
          {subtitle && (
            <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </span>
          )}
          {pct !== null && (
            <span style={{ display: 'block', height: 4, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden', marginTop: 6 }}>
              <span style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 99, background: pctColor(pct) }} />
            </span>
          )}
        </span>

        <span style={{ flexShrink: 0, fontSize: 'var(--fs-xs)', fontWeight: 800, color: pctColor(pct), minWidth: 30, textAlign: 'right' }}>
          {pct !== null ? `${pct}%` : '—'}
        </span>
        {selected && <Check size={16} color="var(--accent)" style={{ flexShrink: 0 }} />}
      </button>
    );
  };

  const groupHeaderStyle = { fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--text3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' };

  const tabBtn = (id, step, label) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '10px 4px 11px', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 'var(--fs-md)', fontWeight: 800,
        color: tab === id ? 'var(--accent)' : 'var(--text3)',
        borderBottom: `2.5px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
        marginBottom: -1,
      }}
    >
      <span style={{
        display: 'inline-flex', width: 18, height: 18, borderRadius: '50%', fontSize: 'var(--fs-2xs)',
        alignItems: 'center', justifyContent: 'center', fontWeight: 800,
        background: tab === id ? 'var(--accent)' : 'var(--bg3)',
        color: tab === id ? '#fff' : 'var(--text3)',
      }}>{step}</span>
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)', zIndex: 1000 }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bottom-sheet-modal"
            style={{
              position: 'fixed', bottom: 0, left: '50%', width: '100%', maxWidth: '700px',
              background: 'var(--bg2)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              border: '1px solid var(--glass-border)', borderBottom: 'none',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', zIndex: 1001,
              display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden',
            }}
          >
            {/* Sarlavha + yopish */}
            <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
                  {t('smartSheet.sheetTitle')}
                </h3>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeSubject ? activeSubject.name : t('smartSheet.subtitle')}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                style={{ flexShrink: 0, background: 'var(--surface2)', border: '1px solid var(--border)', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Bosqich tablari: 1 Fan → 2 Bo'lim */}
            <div style={{ display: 'flex', margin: '12px 12px 0', borderBottom: '1px solid var(--border)' }}>
              {tabBtn('subject', '1', t('selector.subject'))}
              {tabBtn('topic', '2', t('selector.section'))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 30px' }}>
              {/* Qidiruv — ikkala bosqichda ham ishlaydi */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 13px', marginBottom: 16 }}>
                <Search size={18} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--text3)' }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tab === 'subject' ? t('smartSheet.searchPlaceholder') : t('smartSheet.searchTopicPlaceholder')}
                  aria-label={tab === 'subject' ? t('smartSheet.searchPlaceholder') : t('smartSheet.searchTopicPlaceholder')}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--fs-input)', fontFamily: 'inherit', color: 'var(--text)' }}
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label={t('common.close')} style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* ══════ 1-BOSQICH: FAN ══════ */}
              {tab === 'subject' && (
                <>
                  {pinned.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={groupHeaderStyle}>{t('smartSheet.yourSubjects')}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        {pinned.map(renderSubjectCard)}
                      </div>
                    </div>
                  )}

                  {schoolSubjects.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={groupHeaderStyle}>{t('smartSheet.schoolSubjects')}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        {schoolSubjects.map(renderSubjectCard)}
                      </div>
                    </div>
                  )}

                  {mttSubjects.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={groupHeaderStyle}>{t('smartSheet.mttSubjects')}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        {mttSubjects.map(renderSubjectCard)}
                      </div>
                    </div>
                  )}

                  {noSubjectResults && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 'var(--fs-base)', fontWeight: 600 }}>
                      {t('smartSheet.noResults')}
                    </div>
                  )}
                </>
              )}

              {/* ══════ 2-BOSQICH: BO'LIM ══════ */}
              {tab === 'topic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!q && renderTopicRow({ id: -1, name: t('selector.allSections'), icon: '📚', selected: topicId === -1 })}
                  {visibleTopics.map(top => renderTopicRow({
                    id: top.id, name: top.name, subtitle: top.subtitle, icon: top.icon, selected: topicId === top.id,
                  }))}
                  {q && visibleTopics.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 'var(--fs-base)', fontWeight: 600 }}>
                      {t('smartSheet.noResults')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SmartBottomSheet;
