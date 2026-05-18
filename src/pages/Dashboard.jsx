import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import PremiumModal from '../components/PremiumModal';
import { SCHEDULE, TOPICS } from '../data/mockData';
import { Play, Repeat, Zap, MessageCircle, Download, Trash2, Medal, Palette, Clock, Award, Target, Flame, AlertTriangle, Map, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { EXAM_DATE, EXAM_LABEL, EXAM_GOAL_SCORE } from '../config';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { state, updateState } = useContext(AppContext);
  const { objections, clearObjections, solveObjection, deleteObjection, importObjections, updateObjectionNote } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/test', { replace: true });
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }


  const handleNavigation = (topicId, mode) => {
    // 100 ta bepul savol limitini tekshirish
    const isFreeLimitReached = !user?.isPremium && (state.totalAnswered || 0) >= 100;
    if (isFreeLimitReached) {
      setShowPremiumModal(true);
      return;
    }
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  // FIX: countdown faqat Header da — Dashboard da faqat kun/soat matni (boshqa interval yo'q)
  const [daysLeft, setDaysLeft] = useState('');

  useEffect(() => {
    if (!EXAM_DATE) {
      setDaysLeft('Bilimingizni oshirishda davom eting!');
      return;
    }
    const calc = () => {
      const diff = EXAM_DATE - new Date();
      if (diff <= 0) setDaysLeft('Imtihon kuni!');
      else setDaysLeft(`${Math.floor(diff / 86400000)} kun ${Math.floor((diff % 86400000) / 3600000)} soat`);
    };
    calc();
    const int = setInterval(calc, 60000);
    return () => clearInterval(int);
  }, []);

  const cat = state.activeCategory;
  const catStats = state.stats[cat];
  const totalAcc = catStats.totalAnswered > 0 ? Math.round((catStats.totalCorrect / catStats.totalAnswered) * 100) : 0;

  const today = new Date();
  const startDay = new Date('2026-05-02');
  const dayNum = Math.floor((today - startDay) / 86400000) + 1;

  const downloadObjections = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(objections || [], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "iqro_etirozlar.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("E'tirozlar yuklab olindi", 'info');
  };

  const handleImportObjections = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        importObjections(json);
        showToast("Ma'lumotlar muvaffaqiyatli qo'shildi!", 'success');
      } catch (err) {
        showToast("Faylni o'qishda xatolik!", 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const filteredMistakesCount = catStats.mistakes.length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page">
      {/* Welcome Banner */}
      <div className="welcome-banner glass-panel" style={{ 
        background: state.activeCategory === 'art' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : '',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Mobile Subject Badge */}
        <div className="mobile-only-item" style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          background: 'rgba(255,255,255,0.2)', 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '10px', 
          fontWeight: 'bold', 
          color: 'white',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {state.activeCategory === 'art' ? <><Palette size={12}/> ART</> : <><Medal size={12}/> CHQBT</>}
        </div>

        <div className="welcome-title">
          {state.activeCategory === 'art' ? "Tasviriy san'at va Chizmachilik" : "IQRO Platformasi"}
        </div>
        <div className="welcome-sub">
          {state.activeCategory === 'art' ? "Sertifikatlashga tayyorgarlik kursi" : `${EXAM_LABEL} | Maqsad: ${EXAM_GOAL_SCORE} ball`}
        </div>
        <div className="day-countdown" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} /> {state.activeCategory === 'art' ? "Muvaffaqiyatli o'zlashtirish tilaymiz!" : EXAM_DATE ? `Imtihongacha: ${daysLeft}` : daysLeft}
        </div>
        
        {/* Mobile Quick Switch Button */}
        <div className="mobile-only-item" style={{ marginTop: '15px' }}>
          <button 
            className="btn btn-sm" 
            style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: '11px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => updateState({ activeCategory: state.activeCategory === 'chqbt' ? 'art' : 'chqbt' })}
          >
            {state.activeCategory === 'chqbt' ? <><Palette size={14} /> San'atga o'tish</> : <><Medal size={14} /> CHQBTga o'tish</>}
          </button>
        </div>
      </div>

      {/* 100 ta savol limiti (Non-Premium) - Ixcham va Premium ko'rinish */}
      {!user?.isPremium && (
        <div 
          className="glass-panel hoverable" 
          onClick={() => setShowPremiumModal(true)}
          style={{ 
            padding: '12px 18px', 
            marginBottom: 24, 
            border: '1px solid rgba(251, 191, 36, 0.4)', 
            background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Bepul Limit <span style={{ fontSize: 11, background: 'var(--amber)', color: '#000', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>PRO</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Cheklovsiz ishlash uchun Premium oling
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--amber)' }}>
                {Math.min(state.totalAnswered || 0, 100)} / 100
              </div>
              <div style={{ width: 70, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                <div style={{ width: `${Math.min(((state.totalAnswered || 0) / 100) * 100, 100)}%`, height: '100%', background: 'var(--amber)' }} />
              </div>
            </div>
            <div style={{ background: 'var(--amber)', color: '#000', padding: '6px 12px', borderRadius: '8px', fontSize: 12, fontWeight: 800 }}>
              Faollashtirish
            </div>
          </div>
        </div>
      )}

      {/* E'tirozlar paneli - Faqat Adminlarga ko'rinadi */}
      {isAdmin && (
        <div id="objections-section" className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blue)', fontWeight: '800', fontSize: '18px' }}>
              <MessageCircle size={22} /> E'tirozlar ({objections.length})
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadObjections}>
                <Download size={14} /> Yuklab olish
              </button>
              
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                <Download size={14} style={{ transform: 'rotate(180deg)' }} /> Yuklash (Import)
                <input type="file" accept=".json" onChange={handleImportObjections} style={{ display: 'none' }} />
              </label>

              {objections.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={() => { if(confirm('Barcha e\'tirozlarni o\'chirib yuborasizmi?')) clearObjections(); }} style={{ color: 'var(--red)' }}>
                  <Trash2 size={14} /> Tozalash
                </button>
              )}
            </div>
          </div>
          
          {objections.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              Hozircha e'tirozlar yo'q. Boshqa qurilmadagi ma'lumotlarni "Yuklash" orqali o'tkazishingiz mumkin.
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '10px' }}>
              {[...objections].reverse().map((obj, idx) => (
                <div 
                  key={obj.fbId || idx} 
                  className="glass-panel objection-card" 
                  style={{ 
                    background: obj.solved ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg2)', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    border: obj.solved ? '1px solid var(--green)' : '0.5px solid var(--border)',
                    opacity: obj.solved ? 0.8 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        background: obj.category === 'art' ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'var(--blue)', 
                        color: 'white', 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        {obj.category === 'art' ? '🎨 ART' : '🎖️ CHQBT'}
                      </span>
                      <span style={{ color: 'var(--blue)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>{obj.topic}</span>
                      {obj.solved ? (
                        <span style={{ background: 'var(--green)', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={10} /> TUZATILDI</span>
                      ) : (
                        <span style={{ background: 'var(--amber)', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }}>YANGI</span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text3)', fontSize: '11px' }}>{obj.date}</span>
                  </div>
                  
                  <div style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                    <span style={{ color: 'var(--text3)' }}>Savol:</span> {obj.question}
                  </div>

                  {obj.correct && (
                    <div style={{ color: 'var(--green)', fontSize: '12px', marginBottom: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> To'g'ri javob: {obj.correct.replace(/^[A-D]\)\s*/, '')}
                    </div>
                  )}

                  <div style={{ 
                    background: 'var(--bg3)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '13px', 
                    color: 'var(--text2)', 
                    borderLeft: `3px solid ${obj.solved ? 'var(--green)' : 'var(--blue)'}`,
                    marginBottom: '12px'
                  }}>
                    {editingId === obj.fbId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea 
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="modal-input"
                          style={{ marginBottom: '8px', minHeight: '60px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            updateObjectionNote(obj.fbId, editNote);
                            setEditingId(null);
                          }}>Saqlash</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Bekor qilish</button>
                        </div>
                      </div>
                    ) : (
                      <><strong>E'tiroz:</strong> {obj.note}</>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {!obj.solved && (
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--green)', borderColor: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => solveObjection(obj.fbId)}>
                        <CheckCircle2 size={14} /> Tuzatildi
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => deleteObjection(obj.fbId)} style={{ color: 'var(--red)', borderColor: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={14} /> O'chirish
                    </button>
                  </div>
                </div>
              ))}
            </div>

          )}
        </div>
      )}

      {/* Tezkor boshlash */}
      <div className="section-header">Tezkor Boshlash</div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={() => handleNavigation(-1, 'exam')}>
          <Play size={16} /> Bugungi Dars Testi
        </button>
        <button className="btn btn-outline" onClick={() => handleNavigation(-1, 'mistakes')}>
          <Zap size={16} /> Tezkor Takrorlash (15 ta)
          {filteredMistakesCount > 0 && <span style={{ background: 'var(--red)', color: 'white', borderRadius: '10px', padding: '2px 7px', fontSize: '11px', marginLeft: '4px' }}>{filteredMistakesCount}</span>}
        </button>
        <button className="btn btn-outline" onClick={() => handleNavigation(-1, 'flash')}>
          <Zap size={16} /> Flashcard Rejimi
        </button>
      </div>

      {/* Bo'limlar Progress Map */}
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {state.activeCategory === 'art' ? <><Palette size={20}/> Bo'limlar Xaritasi</> : <><Map size={20}/> Bo'limlar Xaritasi</>}
      </div>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
          {TOPICS.filter(t => {
            return Array.isArray(t.category) ? t.category.includes(state.activeCategory) : t.category === state.activeCategory;
          }).map((t, idx) => {
            const ts = state.topicStats[t.id];
            const hasStats = ts && ts.answered > 0;
            const pct = hasStats ? Math.round((ts.correct / ts.answered) * 100) : 0;
            const answered = hasStats ? ts.answered : 0;
            const color = !hasStats ? 'var(--text3)' : pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
            const bg = !hasStats ? 'var(--bg3)' : pct >= 70 ? 'rgba(16,185,129,0.1)' : pct >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
            const status = !hasStats ? '⬜' : pct >= 70 ? '✅' : pct >= 40 ? '🟡' : '🔴';

            // SVG donut uchun
            const r = 32, circ = 2 * Math.PI * r;
            const fillArc = (pct / 100) * circ;

            return (
              <div
                key={t.id}
                onClick={() => handleNavigation(t.id, 'exam')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 10px', borderRadius: 16, cursor: 'pointer',
                  background: bg, border: `1px solid ${hasStats ? color : 'var(--border)'}`,
                  transition: 'all 0.2s', position: 'relative'
                }}
                className="hoverable"
              >
                {/* Donut */}
                <div style={{ position: 'relative', width: 72, height: 72 }}>
                  <svg width={72} height={72} viewBox="0 0 72 72">
                    <circle cx={36} cy={36} r={r} fill="none" stroke="var(--bg3)" strokeWidth={6} />
                    {hasStats && (
                      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
                        strokeDasharray={`${fillArc} ${circ}`} strokeLinecap="round"
                        transform="rotate(-90 36 36)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                    )}
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: hasStats ? 16 : 22, fontWeight: 800, color }}>
                      {hasStats ? `${pct}%` : t.icon}
                    </div>
                  </div>
                </div>

                {/* Nomi */}
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'center',
                  lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                }}>
                  {t.name}
                </div>

                {/* Status */}
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                  {hasStats ? `${answered} savol` : 'Boshlanmagan'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Oxirgi Tuzatishlar Jurnali (Public Fix Log) - Faqat Adminlarga ko'rinadi */}
      {isAdmin && objections.filter(o => o.solved).length > 0 && (
        <div className="objections-list-container">
          <div className="section-header" style={{ marginTop: '32px', color: 'var(--green)' }}>Oxirgi tuzatishlar</div>
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            {[...objections].filter(o => o.solved).reverse().slice(0, 5).map((obj, i) => (
              <div key={obj.fbId || i} style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                padding: '10px 0', 
                borderBottom: i < 4 ? '1px solid rgba(16, 185, 129, 0.1)' : 'none' 
              }}>
                <div style={{ background: 'var(--green)', color: 'white', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                  <Zap size={12} fill="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>{obj.question}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{obj.date} · Tuzatildi</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />
    </motion.div>
  );
};

export default Dashboard;
