import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ObjectionContext } from '../context/ObjectionContext';
import { ToastContext } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import PremiumModal from '../components/PremiumModal';
import { SCHEDULE, TOPICS } from '../data/mockData';
import { Play, Repeat, Zap, MessageCircle, Download, Trash2, Medal, Palette, Clock, Award, Target, Flame, AlertTriangle, Map, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { EXAM_DATE, EXAM_LABEL, EXAM_GOAL_SCORE } from '../config';

const Dashboard = ({ navigateToTest }) => {
  const { user } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { objections, clearObjections, solveObjection, deleteObjection, importObjections, updateObjectionNote } = useContext(ObjectionContext);
  const { showToast } = useContext(ToastContext);
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleNavigation = (topicId, mode) => {
    // Agar premium bo'lmasa, ma'lum funksiyalarni bloklash
    if (!user?.isPremium) {
      if (mode === 'exam') {
        setShowPremiumModal(true);
        return;
      }
      if (topicId >= 2) {
        setShowPremiumModal(true);
        return;
      }
    }
    navigateToTest(topicId, mode);
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

      {/* E'tirozlar paneli */}
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

      {/* Statistika */}
      <div className="stats-grid">
        <div className="stat-box glass-panel">
          <div className="stat-box-val">{catStats.totalAnswered}</div>
          <div className="stat-box-lbl">Javob berildi</div>
          <div className="stat-box-sub">jami savollar</div>
        </div>
        <div className="stat-box glass-panel">
          <div className="stat-box-val">{totalAcc}%</div>
          <div className="stat-box-lbl">Aniqlik</div>
          <div className="stat-box-sub">to'g'ri / jami</div>
        </div>
        <div className="stat-box glass-panel">
          <div className="stat-box-val" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{catStats.streak} <Flame size={24} color="var(--amber)" /></div>
          <div className="stat-box-lbl">Streak</div>
          <div className="stat-box-sub">ketma-ket to'g'ri</div>
        </div>
        {/* FIX: maxStreak endi ko'rsatiladi */}
        <div className="stat-box glass-panel">
          <div className="stat-box-val" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '4px' }}>{catStats.maxStreak} <Zap size={24} /></div>
          <div className="stat-box-lbl">Rekord Streak</div>
          <div className="stat-box-sub">eng uzun zanjir</div>
        </div>
      </div>

      {/* G'OYA-6: Haftalik taqqoslash */}
      {catStats.totalAnswered > 10 && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={20} color="var(--blue)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {totalAcc >= 70 ? "Ajoyib natija! " : totalAcc >= 50 ? "Yaxshi yo'ldasiz! " : "Davom eting! "}
              {totalAcc}% aniqlik
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {catStats.totalAnswered} ta savoldan {catStats.totalCorrect} tasiga to'g'ri javob berdingiz
              {catStats.maxStreak > 3 && ` • Eng uzun seriya: ${catStats.maxStreak} ta ketma-ket`}
            </div>
          </div>
          {totalAcc >= 70 && <div style={{ fontSize: 28 }}>🎯</div>}
          {totalAcc >= 50 && totalAcc < 70 && <div style={{ fontSize: 28 }}>📈</div>}
          {totalAcc < 50 && <div style={{ fontSize: 28 }}>💪</div>}
        </div>
      )}

      {/* 📌 Kunlik Maqsad */}
      {(() => {
        const today = new Date().toDateString();
        const dg = state.dailyGoal?.date === today ? state.dailyGoal : { date: today, answered: 0, target: 20, completed: false };
        const pct = Math.min(100, Math.round((dg.answered / dg.target) * 100));
        const ds = state.dailyStreak || 0;

        return (
          <div className="glass-panel" style={{
            padding: '20px 24px', marginBottom: 24,
            border: dg.completed ? '1.5px solid var(--green)' : '0.5px solid var(--border)',
            background: dg.completed ? 'rgba(16,185,129,0.05)' : 'var(--bg2)',
            transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {dg.completed ? <Award size={24} color="var(--green)" /> : <Target size={24} color="var(--accent)" />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {dg.completed ? 'Bugungi maqsad bajarildi!' : 'Bugungi maqsad'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {dg.answered} / {dg.target} savol yechildi
                  </div>
                </div>
              </div>
              {ds > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: 'white', padding: '5px 14px', borderRadius: 20,
                  fontWeight: 700, fontSize: 13
                }}>
                  <Flame size={14} /> {ds} kun streak
                </div>
              )}
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--bg3)', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 5,
                background: dg.completed
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : pct > 50 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
              <span>{pct}% bajarildi</span>
              <span>{Math.max(0, dg.target - dg.answered)} ta qoldi</span>
            </div>
          </div>
        );
      })()}

      {/* ⚠️ Zaif Nuqtalar Paneli */}
      {(() => {
        // topicStats dan xatolar sonini hisoblaymiz
        const weakTopics = TOPICS
          .filter(t => {
            const match = Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat;
            const ts = state.topicStats[t.id];
            return match && ts && ts.answered > 0;
          })
          .map(t => {
            const ts = state.topicStats[t.id];
            const wrong = ts.answered - ts.correct;
            const acc = Math.round((ts.correct / ts.answered) * 100);
            return { ...t, wrong, acc, answered: ts.answered, correct: ts.correct };
          })
          .filter(t => t.wrong > 0)
          .sort((a, b) => b.wrong - a.wrong || a.acc - b.acc)
          .slice(0, 5);

        if (weakTopics.length === 0) return null;

        return (
          <div style={{ marginBottom: 24 }}>
            <div className="section-header" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} /> Zaif Nuqtalaringiz</div>
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                Eng ko'p xato qilingan mavzular — bu yerga ko'proq e'tibor bering!
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {weakTopics.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => handleNavigation(t.id, 'exam')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                      background: 'var(--bg2)', borderRadius: 12, cursor: 'pointer',
                      border: '0.5px solid var(--border)', transition: 'all 0.2s'
                    }}
                    className="hoverable"
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: t.acc < 40 ? 'var(--red-bg)' : t.acc < 70 ? 'var(--amber-bg)' : 'var(--green-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                    }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${t.acc}%`, height: '100%', borderRadius: 3,
                            background: t.acc < 40 ? 'var(--red)' : t.acc < 70 ? 'var(--amber)' : 'var(--green)',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.acc < 40 ? 'var(--red)' : t.acc < 70 ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }}>
                          {t.acc}%
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{t.wrong}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>XATO</div>
                    </div>
                    {/* G'OYA-5: Mashq qilish tugmasi */}
                    <button 
                      className="btn btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleNavigation(t.id, 'exam'); }}
                      style={{ 
                        background: 'var(--red)', color: 'white', border: 'none', 
                        fontSize: 11, padding: '6px 10px', borderRadius: 8, flexShrink: 0,
                        fontWeight: 700
                      }}
                    >
                      Mashq qil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Oxirgi Tuzatishlar Jurnali (Public Fix Log) */}
      {objections.filter(o => o.solved).length > 0 && (
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
