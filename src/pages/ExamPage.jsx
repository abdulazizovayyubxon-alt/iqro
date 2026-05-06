import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { TOPICS, getFallbackQuestions } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const EXAM_DURATION = 90 * 60; // 90 daqiqa
const EXAM_TOTAL = 50;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ExamPage = ({ goBack }) => {
  const { state, addScore, addMistake, addObjection, showToast } = useContext(AppContext);
  const cat = state.activeCategory;

  const [questions, setQuestions] = useState([]);
  const [topicGroups, setTopicGroups] = useState([]); // [{name, icon, start, end}]
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(new Date());
  const [endTime, setEndTime] = useState(null);
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [objectionText, setObjectionText] = useState('');
  const timerRef = useRef(null);

  // Savollarni yuklash
  useEffect(() => {
    const filteredTopics = TOPICS.filter(t =>
      Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
    );

    let allQuestions = [];
    const groups = [];

    filteredTopics.forEach(topic => {
      const qs = getFallbackQuestions(topic.id, cat).map(q => ({ ...q, topicId: topic.id, topicName: topic.name, topicIcon: topic.icon }));
      if (qs.length > 0) {
        const shuffled = shuffleArray(qs);
        const pick = Math.ceil(EXAM_TOTAL / filteredTopics.length);
        const selected = shuffled.slice(0, pick);
        const start = allQuestions.length;
        allQuestions = [...allQuestions, ...selected];
        groups.push({ name: topic.name, icon: topic.icon, start, end: allQuestions.length - 1 });
      }
    });

    const final = shuffleArray(allQuestions).slice(0, EXAM_TOTAL);
    setQuestions(final);

    // Guruhlarni qayta hisoblash
    const regrouped = [];
    filteredTopics.forEach((topic, ti) => {
      const indices = final.map((q, i) => q.topicId === topic.id ? i : -1).filter(i => i >= 0);
      if (indices.length > 0) {
        regrouped.push({ name: topic.name, icon: topic.icon, indices });
      }
    });
    setTopicGroups(regrouped);
  }, [cat]);

  // Taymer
  useEffect(() => {
    if (finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinish(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [finished]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const handleSelect = (optIdx) => {
    if (finished) return;
    setAnswers(prev => ({ ...prev, [currentQ]: optIdx }));
  };

  const handleFinish = (auto = false) => {
    if (!auto && !window.confirm("Imtihonni yakunlashni tasdiqlaysizmi?")) return;
    clearInterval(timerRef.current);
    setFinished(true);
    setEndTime(new Date());

    // Statistikani yangilash — har bir javobni addScore/addMistake orqali saqlash
    questions.forEach((q, i) => {
      if (answers[i] !== undefined) {
        if (answers[i] === q.correct) {
          addScore(2, q.topicId);
        } else {
          addMistake(q.topicId, q.q, q.opts[q.correct], q.opts);
        }
      }
    });

    const correct = questions.filter((q, i) => answers[i] === q.correct).length;
    const pct = Math.round((correct / questions.length) * 100);
    if (pct >= 60) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  };

  const handleObjectionSubmit = () => {
    if (!objectionText.trim()) return;
    const q = questions[currentQ];
    addObjection({
      question: q.q,
      topic: q.topicName,
      correct: q.opts[q.correct],
      note: objectionText,
      category: cat,
    });
    setObjectionText('');
    setShowObjectionModal(false);
    showToast("E'tiroz yuborildi!", 'success');
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = finished ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const wrongCount = finished ? questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.correct).length : 0;
  const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const isUrgent = timeLeft <= 300; // 5 daqiqa
  const isWarning = timeLeft <= 600; // 10 daqiqa

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%' }} />
        <div style={{ color: 'var(--text3)' }}>Savollar yuklanmoqda...</div>
      </div>
    );
  }

  // ===== NATIJA SAHIFASI =====
  if (finished) {
    const r = 54, circ = 2 * Math.PI * r;
    const fillArc = (pct / 100) * circ;
    const scoreColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
        {/* Natija kartasi */}
        <div className="glass-panel exam-result-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              {pct >= 70 ? '🎉 Tabriklaymiz!' : pct >= 50 ? '📊 Yaxshi harakat!' : '💪 Davom eting!'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Imtihon yakunlandi</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
            {/* Donut grafik */}
            <div style={{ position: 'relative' }}>
              <svg width={130} height={130} viewBox="0 0 130 130">
                <circle cx={65} cy={65} r={r} fill="none" stroke="var(--bg3)" strokeWidth={12} />
                <circle cx={65} cy={65} r={r} fill="none" stroke={scoreColor} strokeWidth={12}
                  strokeDasharray={`${fillArc} ${circ}`} strokeLinecap="round"
                  transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
                  fontSize={22} fontWeight={800} fill="var(--text)">{pct}%</text>
                <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fill="var(--text3)">Bajarildi</text>
              </svg>
            </div>

            {/* Statistika */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>{correctCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>TO'G'RI</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)' }}>{wrongCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>XATO</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>{questions.length - answeredCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>QOLDIRILDI</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
                <div>📅 Sanasi: <strong>{startTime.toLocaleDateString()}</strong></div>
                <div>▶ Boshlandi: <strong>{startTime.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong></div>
                <div>⏹ Yakunlandi: <strong>{endTime?.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong></div>
              </div>
            </div>
          </div>

          {/* Izoh */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--green-bg)', border: '2px solid var(--green)' }} />
              <span>To'g'ri javoblar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--red-bg)', border: '2px dashed var(--red)' }} />
              <span>Noto'g'ri javoblar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg3)', border: '1.5px solid var(--border2)' }} />
              <span>Qoldirilgan</span>
            </div>
          </div>

          {/* Mavzular bo'yicha grid */}
          {topicGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>
                {group.icon} {group.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.indices.map((qi) => {
                  const q = questions[qi];
                  const ans = answers[qi];
                  const isCorrect = ans === q.correct;
                  const isWrong = ans !== undefined && !isCorrect;
                  const isSkipped = ans === undefined;
                  return (
                    <button
                      key={qi}
                      onClick={() => { setFinished(false); setCurrentQ(qi); setTimeout(() => setFinished(true), 0); }}
                      style={{
                        width: 40, height: 40, borderRadius: 10, border: isWrong ? '2px dashed var(--red)' : isCorrect ? '2px solid var(--green)' : '1.5px solid var(--border2)',
                        background: isCorrect ? 'var(--green-bg)' : isWrong ? 'var(--red-bg)' : 'var(--bg3)',
                        color: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--text3)',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer'
                      }}
                    >
                      {qi + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.location.reload()}>
              Qaytadan urinish
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={goBack}>
              Bosh sahifaga
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ===== IMTIHON SAHIFASI =====
  const q = questions[currentQ];
  const answered = answers[currentQ];

  return (
    <div className="exam-layout">
      {/* TOP BAR */}
      <div className="exam-topbar glass-panel">
        <button className="btn btn-sm btn-outline" onClick={goBack} style={{ padding: '6px 12px' }}>
          <ChevronLeft size={16} /> Chiqish
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          {cat === 'art' ? "🎨 San'at" : "🎖️ CHQBT"} — Imtihon Simulyatsiyasi
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className={`exam-timer ${isUrgent ? 'timer-danger' : isWarning ? 'timer-warning' : ''}`}>
            <Clock size={16} />
            <span>Qolgan vaqt: <strong>{formatTime(timeLeft)}</strong></span>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--red)', color: 'white', border: 'none' }}
            onClick={() => handleFinish(false)}
          >
            <Flag size={14} /> Yakunlash
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="exam-content">
        {/* SAVOL QISMI */}
        <div className="exam-question-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Savol {currentQ + 1} / {questions.length}
                </div>
                <button
                  className="objection-btn"
                  style={{ position: 'static' }}
                  onClick={() => setShowObjectionModal(true)}
                >
                  <AlertCircle size={13} /> E'tiroz
                </button>
              </div>

              {/* Savol rasmi */}
              {q.image && (
                <div style={{ margin: '0 0 16px', textAlign: 'center' }}>
                  <img src={q.image} alt="Savol rasmi"
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid var(--border)' }} />
                </div>
              )}
              {/* Savol matni */}
              {q.isHtml ? (
                <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.6, marginBottom: 24, color: 'var(--text)' }}
                  dangerouslySetInnerHTML={{ __html: q.q }} />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5, marginBottom: 24, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                  {q.q}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.opts.map((opt, i) => {
                  const isSelected = answered === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 12, textAlign: 'left',
                        border: isSelected ? '2px solid var(--blue)' : '1.5px solid var(--border)',
                        background: isSelected ? 'var(--blue-bg)' : 'var(--bg2)',
                        cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                        fontSize: 15, fontWeight: 500, color: isSelected ? 'var(--text)' : 'var(--text2)',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isSelected ? 'var(--blue)' : 'var(--bg3)',
                        color: isSelected ? 'white' : 'var(--text3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14
                      }}>
                        {['A', 'B', 'C', 'D'][i]}
                      </div>
                      {opt.replace(/^[A-D]\)\s*/, '')}
                    </button>
                  );
                })}
              </div>

              {/* Navigatsiya */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button
                  className="btn btn-outline"
                  disabled={currentQ === 0}
                  onClick={() => setCurrentQ(prev => prev - 1)}
                >
                  <ChevronLeft size={18} /> Orqaga
                </button>
                <button
                  className="btn btn-primary"
                  disabled={currentQ === questions.length - 1}
                  onClick={() => setCurrentQ(prev => prev + 1)}
                >
                  Keyingi <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* O'NG PANEL — Savollar Navigator */}
        <div className="exam-navigator glass-panel">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Savollar
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>
                {answeredCount} / {questions.length}
              </div>
            </div>

            {/* Rang izohlari - Minimalist */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text2)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--blue)' }} />
                <span>Belgilangan</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)' }} />
                <span>Qoldirilgan</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: 'transparent', border: '2px solid var(--text)' }} />
                <span>Joriy</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
              {questions.map((_, i) => {
                const isCurrent = i === currentQ;
                const isAns = answers[i] !== undefined;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 4,
                      border: isCurrent ? '2px solid var(--text)' : isAns ? 'none' : '1px solid var(--border)',
                      background: isAns && !isCurrent ? 'var(--blue)' : isCurrent ? 'var(--bg2)' : 'var(--bg3)',
                      color: isAns && !isCurrent ? 'white' : 'var(--text)',
                      fontWeight: 700, fontSize: 10, cursor: 'pointer',
                      transition: 'all 0.15s', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', background: 'var(--red)', borderColor: 'var(--red)' }}
            onClick={() => handleFinish(false)}
          >
            <Flag size={16} /> Yakunlash ({answeredCount}/{questions.length})
          </button>
        </div>
      </div>

      {/* E'TIROZ MODALI */}
      {showObjectionModal && (
        <div className="modal-overlay" onClick={() => setShowObjectionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ E'tiroz bildirish</div>
            <div className="modal-text" style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong>Savol:</strong> {q.q}
            </div>
            <textarea
              className="modal-input"
              placeholder="Muammo yoki xatolikni tushuntiring..."
              value={objectionText}
              onChange={e => setObjectionText(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowObjectionModal(false)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleObjectionSubmit}>Yuborish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPage;
