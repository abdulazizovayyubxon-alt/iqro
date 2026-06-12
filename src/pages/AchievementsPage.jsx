import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTrialExpiry } from '../hooks/useTrialExpiry';
import { TOPICS, SUBJECTS } from '../data/mockData';
import { BADGES, getEarnedBadges, getTotalXP, getLevel } from '../data/badges';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Zap, Target, TrendingUp, BarChart3, Star, AlertCircle, Award, Flame, AlertTriangle } from 'lucide-react';
import RadialChart from '../components/shared/RadialChart';
import PremiumModal from '../components/PremiumModal';
import RoiBlock from '../components/RoiBlock';
import { DEFAULT_YEARLY_PRICE } from '../config';

const AchievementsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('achievements');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const canvasRef = useRef(null);
  const { isTrialExpired } = useTrialExpiry();
  const isFreeLimitReached = isTrialExpired && (state.dailyGoal?.answered || 0) >= 50;

  const handleNavigation = (topicId, mode) => {
    if (isFreeLimitReached) {
      setShowPremiumModal(true);
      return;
    }
    updateState({ topicId, testMode: mode });
    navigate('/test');
  };

  const cat = state.activeCategory;
  const catStats = state.stats[cat] || { totalAnswered: 0, totalCorrect: 0, streak: 0, maxStreak: 0, mistakes: [] };

  // Calculate average time stats
  const totalTime = state.timeStats?.totalTime || 0;
  const totalQuestionsTime = state.timeStats?.totalQuestions || 0;
  const avgTime = totalQuestionsTime > 0 ? Math.round(totalTime / totalQuestionsTime) : 0;

  let speedLabel = "Ma'lumot yo'q";
  let speedColor = "var(--text3)";
  if (avgTime > 0) {
    if (avgTime < 45) {
      speedLabel = "Tezkor (Ajoyib!)";
      speedColor = "#10B981"; // Green
    } else if (avgTime <= 90) {
      speedLabel = "O'rtacha";
      speedColor = "#F59E0B"; // Amber
    } else {
      speedLabel = "Sekin";
      speedColor = "#EF4444"; // Red
    }
  }

  const total = catStats.totalAnswered;
  const correct = catStats.totalCorrect;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Predict Category (Toifa)
  let toifa = "Mutaxassis";
  let toifaColor = "#3b82f6"; // Blue
  let nextToifaText = "";
  if (total >= 10) {
    if (acc >= 80) {
      toifa = "Oliy Toifa";
      toifaColor = "#F59E0B"; // Gold
      nextToifaText = "Tayyorlik darajasi ajoyib!";
    } else if (acc >= 70) {
      toifa = "1-Toifa";
      toifaColor = "#10B981"; // Green
      nextToifaText = `Oliy toifa uchun yana ${80 - acc}% kerak`;
    } else if (acc >= 60) {
      toifa = "2-Toifa";
      toifaColor = "#8B5CF6"; // Purple
      nextToifaText = `1-toifa uchun yana ${70 - acc}% kerak`;
    } else {
      toifa = "Mutaxassis";
      toifaColor = "#EF4444"; // Red
      nextToifaText = `2-toifa uchun yana ${60 - acc}% kerak`;
    }
  } else {
    toifa = "Hisoblanmoqda...";
    nextToifaText = "Kamida 10 ta savol yeching";
  }

  const subjectName = SUBJECTS.find(s => s.id === state.activeCategory)?.name || 'CHQBT';

  const drawPassport = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set dimensions
    canvas.width = 800;
    canvas.height = 500;
    
    // 1. Draw Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 500);
    grad.addColorStop(0, '#0F172A'); // Slate 900
    grad.addColorStop(1, '#1E1B4B'); // Indigo 950
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);
    
    // 2. Draw Decorative Borders / Frames
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 760, 460);
    
    ctx.strokeStyle = '#29B6F6';
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, 750, 450);
    
    // Draw Corner Ornaments
    const drawCorner = (x, y, dx, dy) => {
      ctx.strokeStyle = '#29B6F6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 20);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 20, y);
      ctx.stroke();
    };
    drawCorner(25, 25, 1, 1);
    drawCorner(775, 25, -1, 1);
    drawCorner(25, 475, 1, -1);
    drawCorner(775, 475, -1, -1);
    
    // 3. Draw Watermark logo/text in background
    ctx.font = 'bold 90px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IQRO PLATFORM', 400, 250);
    
    // 4. Header text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '800 28px sans-serif';
    
    // Gold gradient for Header
    const textGrad = ctx.createLinearGradient(0, 40, 0, 80);
    textGrad.addColorStop(0, '#38BDF8');
    textGrad.addColorStop(1, '#818CF8');
    ctx.fillStyle = textGrad;
    ctx.fillText('TAYYORGARLIK PASPORTI', 400, 45);
    
    ctx.font = '500 13px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('ATTESTATSIYA VA TOIFA PROGNOZI', 400, 82);
    
    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 110);
    ctx.lineTo(700, 110);
    ctx.stroke();
    
    // 5. Left Side: User Info & Subject
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    const userName = user?.displayName || state.displayName || 'Hurmatli Foydalanuvchi';
    ctx.fillText(userName, 80, 150);
    
    ctx.font = '500 14px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Foydalanuvchi', 80, 180);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(subjectName, 80, 230);
    
    ctx.font = '500 14px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Fan/Yo\'nalish', 80, 260);
    
    // 6. Right Side: Category Prediction (Toifa)
    ctx.textAlign = 'right';
    ctx.fillStyle = toifaColor;
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(toifa, 720, 150);
    
    ctx.font = '500 14px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Tahminiy Toifa', 720, 195);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(nextToifaText || 'Tayyorlik darajasi ajoyib', 720, 230);
    
    ctx.font = '500 14px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Holat/Maslahat', 720, 260);
    
    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(100, 310);
    ctx.lineTo(700, 310);
    ctx.stroke();
    
    // 7. Bottom Row: Stats Summary
    // Stat 1: Aniqlik
    ctx.textAlign = 'center';
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${acc}%`, 200, 340);
    ctx.font = '500 13px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('O\'zlashtirish', 200, 375);
    
    // Stat 2: O'rtacha vaqt
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${avgTime}s`, 400, 340);
    ctx.font = '500 13px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('O\'rtacha vaqt', 400, 375);
    
    // Stat 3: Tezlik
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(speedLabel, 600, 340);
    ctx.font = '500 13px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Tezlik bahosi', 600, 375);
    
    // 8. Footer Info
    ctx.fillStyle = '#475569';
    ctx.font = '500 12px monospace';
    ctx.fillText('IQRO PLATFORMASI ORQALI GENERATSIYA QILINGAN', 400, 440);
  };

  useEffect(() => {
    if (showShareModal && canvasRef.current) {
      drawPassport(canvasRef.current);
    }
  }, [showShareModal]);

  const downloadPassport = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `iqro_passport_${user?.displayName || 'user'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const shareToTelegram = () => {
    const pct = acc;
    const toifaText = toifa;
    const text = `🏆 IQRO platformasida attestatsiyaga tayyorgarlik darajasi pasportimni oldim!\n\n📚 Fan: ${subjectName}\n🎯 Aniqlik ko'rsatkichi: ${pct}%\n⏱ O'rtacha tezlik: ${avgTime}s (${speedLabel})\n⚡ Toifa prognozi: ${toifaText}\n\nSiz ham o'z toifangizni sinab ko'ring: iqro-t41p.vercel.app`;
    window.open(`https://t.me/share/url?url=https://iqro-t41p.vercel.app&text=${encodeURIComponent(text)}`, '_blank');
  };


  const earnedBadges = getEarnedBadges(state.stats);
  const totalXP = getTotalXP(state.stats);
  const levelInfo = getLevel(totalXP);

  const nextLevelXP = levelInfo.level === 1 ? 75 : levelInfo.level === 2 ? 200 : levelInfo.level === 3 ? 500 : levelInfo.level === 4 ? 1000 : 9999;
  const levelPct = Math.min(100, Math.round((totalXP / nextLevelXP) * 100));

  const filteredTopics = TOPICS.filter(t =>
    Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat
  );

  const wrong = total - correct;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 32px' }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>🏅 Yutuqlar</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Statistika va natijalaringiz</p>

      {/* Level Header */}
      <div style={{
        padding: '24px 20px', marginBottom: 20,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: `1px solid var(--glass-border)`,
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: `linear-gradient(135deg, ${levelInfo.color} 0%, #8B5CF6 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 15px ${levelInfo.color}30`,
            }}>
              <Trophy size={26} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
                {levelInfo.name} <span style={{ color: levelInfo.color, fontWeight: 800 }}>Lv.{levelInfo.level}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>
                ⚡ {totalXP} XP · {earnedBadges.length}/{BADGES.length} badge
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
              <span>Keyingi daraja</span>
              <span style={{ fontWeight: 700, color: levelInfo.color }}>{totalXP}/{nextLevelXP} XP</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <div style={{ width: `${levelPct}%`, height: '100%', background: `linear-gradient(90deg, ${levelInfo.color}, #8B5CF6)`, borderRadius: 4, transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 📋 ATTESTATSIYA PASPORTI & PROGNOZ WIDGET */}
      <div className="glass-panel" style={{
        padding: '24px 20px',
        marginBottom: 20,
        border: '1.5px solid var(--border)',
        background: 'linear-gradient(135deg, var(--glass-bg), rgba(41, 182, 246, 0.05))',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={24} color="#F59E0B" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.3px' }}>Attestatsiya Pasporti & Toifa Prognozi</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>Foydalanuvchi natijalari asosida tayyorlandi</div>
            </div>
          </div>
          <button 
            onClick={() => setShowShareModal(true)} 
            style={{ 
              background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '8px 16px', 
              fontSize: '12px', 
              fontWeight: 700, 
              cursor: 'pointer', 
              fontFamily: 'inherit',
              boxShadow: '0 4px 10px rgba(41, 182, 246, 0.2)' 
            }}
          >
            📋 Pasportni Ko'rish
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 12 }}>
          <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>TOIFA PROGNOZI</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: toifaColor }}>{toifa}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{nextToifaText}</div>
          </div>
          <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>O'RTACHA TEZLIK</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: speedColor }}>{avgTime > 0 ? `${avgTime}s / savol` : "Hisoblanmoqda..."}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{speedLabel}</div>
          </div>
        </div>

        {/* Toifa ROI — bashorat qilingan toifa asosida personalizatsiya */}
        {(toifa === 'Oliy Toifa' || toifa === '1-Toifa' || toifa === '2-Toifa') && (
          <div style={{ marginTop: 12 }}>
            <RoiBlock
              price={DEFAULT_YEARLY_PRICE}
              planName="Yillik"
              targetToifa={toifa === 'Oliy Toifa' ? 'oliy' : toifa === '1-Toifa' ? '1-toifa' : '2-toifa'}
              variant="theme"
            />
          </div>
        )}
      </div>

      {/* G'OYA-6: Haftalik taqqoslash */}
      {catStats.totalAnswered > 10 && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={20} color="var(--blue)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {acc >= 70 ? "Ajoyib natija! " : acc >= 50 ? "Yaxshi yo'ldasiz! " : "Davom eting! "}
              {acc}% aniqlik
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {catStats.totalAnswered} ta savoldan {catStats.totalCorrect} tasiga to'g'ri javob berdingiz
              {catStats.maxStreak > 3 && ` • Eng uzun seriya: ${catStats.maxStreak} ta ketma-ket`}
            </div>
          </div>
          {acc >= 70 && <div style={{ fontSize: 28 }}>🎯</div>}
          {acc >= 50 && acc < 70 && <div style={{ fontSize: 28 }}>📈</div>}
          {acc < 50 && <div style={{ fontSize: 28 }}>💪</div>}
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
            border: dg.completed ? '1.5px solid var(--green)' : '1px solid var(--glass-border)',
            background: dg.completed ? 'rgba(16,185,129,0.04)' : 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
            transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {dg.completed ? <Award size={24} color="var(--green)" /> : <Target size={24} color="var(--accent)" />}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                    {dg.completed ? 'Bugungi maqsad bajarildi!' : 'Bugungi maqsad'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                    {dg.answered} / {dg.target} savol yechildi
                  </div>
                </div>
              </div>
              {ds > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #FFB300, #F4511E)',
                  color: 'white', padding: '6px 14px', borderRadius: 20,
                  fontWeight: 800, fontSize: 12,
                  boxShadow: '0 4px 10px rgba(244, 81, 30, 0.2)'
                }}>
                  <Flame size={14} /> {ds} kun streak
                </div>
              )}
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--bg3)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 5,
                background: dg.completed
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : pct > 50 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
              <span>{pct}% bajarildi</span>
              <span>{Math.max(0, dg.target - dg.answered)} ta qoldi</span>
            </div>
          </div>
        );
      })()}

      {/* ⚠️ Zaif Nuqtalar Paneli */}
      {(() => {
        const weakTopics = TOPICS
          .filter(t => {
            const match = Array.isArray(t.category) ? t.category.includes(cat) : t.category === cat;
            const ts = state.topicStats[t.id];
            return match && ts && ts.answered > 0;
          })
          .map(t => {
            const ts = state.topicStats[t.id];
            const wrong = ts.answered - ts.correct;
            const topicAcc = Math.round((ts.correct / ts.answered) * 100);
            return { ...t, wrong, acc: topicAcc, answered: ts.answered, correct: ts.correct };
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

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, padding: 3, gap: 3, marginBottom: 24 }}>
        {[{ id: 'achievements', label: '🏅 Yutuqlar' }, { id: 'statistics', label: '📊 Statistika' }].map(tab => (
          <button
            key={tab.id}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: activeTab === tab.id ? 'var(--bg2)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.18s',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'achievements' ? (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} style={{ color: 'var(--amber)' }} /> Kolleksiya
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {BADGES.map((badge) => {
                const earned = earnedBadges.some(b => b.id === badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    whileHover={{ y: -2, scale: 1.02 }}
                    style={{
                      padding: '20px 12px 16px', borderRadius: 20, textAlign: 'center',
                      border: earned ? `1px solid ${badge.color}40` : '1px solid var(--glass-border)',
                      background: earned ? `${badge.color}08` : 'var(--glass-bg)',
                      backdropFilter: 'blur(10px)',
                      opacity: earned ? 1 : 0.45,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      boxShadow: earned ? `0 4px 20px ${badge.color}0F` : 'none',
                    }}
                  >
                    <div style={{
                      fontSize: 36,
                      filter: earned ? 'none' : 'grayscale(1)',
                      marginBottom: 4,
                      transform: earned ? 'scale(1)' : 'scale(0.95)'
                    }}>
                      {earned ? badge.icon : '🔒'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, letterSpacing: '-0.3px' }}>{badge.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4, fontWeight: 500 }}>{badge.desc}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: earned ? badge.color : 'var(--text3)', background: earned ? `${badge.color}15` : 'var(--bg3)', padding: '2px 8px', borderRadius: 8, marginTop: 4 }}>+{badge.xp} XP</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Radial grafiklar */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--blue)' }} /> Umumiy Ko'rsatkichlar
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}>
                <RadialChart pct={acc} size={130} stroke={12} color={acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)'} label="Aniqlik" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: '160px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>✅ To'g'ri</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--green)' }}>{correct}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>❌ Xato</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--red)' }}>{wrong}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>📝 Jami</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)' }}>{total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '500' }}>⚡ Max Streak</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--amber)' }}>{catStats.maxStreak}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bo'limlar bo'yicha grafik */}
            <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} style={{ color: 'var(--blue)' }} /> Bo'limlar bo'yicha natijalar
            </div>
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
              {filteredTopics.map((t, idx) => {
                const s = state.topicStats[t.id];
                const topicTotal = s?.answered || 0;
                const answered = s?.answered || 0;
                const topicCorrect = s?.correct || 0;
                const pct = answered > 0 ? Math.round((topicCorrect / answered) * 100) : 0;
                const coveragePct = topicTotal > 0 ? Math.min(100, Math.round((answered / topicTotal) * 100)) : 0;
                const barColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : pct > 0 ? 'var(--red)' : 'var(--accent)';

                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="stats-topic-row"
                  >
                    <div style={{ minWidth: '120px', maxWidth: '180px', fontSize: '14px', fontWeight: '500', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {t.icon} {t.name}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.05 }}
                            style={{ height: '100%', borderRadius: '4px', background: barColor }}
                          />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', minWidth: '40px', textAlign: 'right', color: barColor }}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${coveragePct}%`, height: '100%', borderRadius: '2px', background: 'var(--blue)', opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', minWidth: '60px', textAlign: 'right' }}>
                          {answered}/{topicTotal}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Oxirgi Xatolar */}
            <div className="section-header" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: 'var(--red)' }} /> Oxirgi Xatolar (Top 5)
            </div>
            <div style={{ marginBottom: '24px' }}>
              {catStats.mistakes.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '12px 0' }}>Hali xato yo'q — ajoyib!</div>
              ) : (
                [...catStats.mistakes].reverse().slice(0, 5).map((m, i) => (
                  <div key={i} className="glass-panel" style={{ borderLeft: '3px solid var(--red)', padding: '12px 16px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--red)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '4px' }}>{m.topic}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>{m.question}</div>
                    <div style={{ fontSize: '12px', color: 'var(--green)', marginTop: '6px' }}>✓ To'g'ri: {m.correct}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: 'var(--bg2)',
                border: '1.5px solid var(--border)',
                borderRadius: '24px',
                padding: '24px',
                width: '100%',
                maxWidth: '640px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
                textAlign: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: 800 }}>Tayyorgarlik Pasporti</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text3)',
                    fontSize: '20px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Canvas rendered but scaled down responsively */}
              <div style={{ 
                width: '100%', 
                overflow: 'hidden', 
                borderRadius: '16px', 
                border: '1.5px solid var(--border)', 
                background: '#0F172A',
                marginBottom: 20
              }}>
                <canvas 
                  ref={canvasRef} 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    display: 'block' 
                  }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button 
                  onClick={downloadPassport}
                  style={{
                    padding: '14px',
                    background: '#29B6F6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  📥 Yuklab Olish (PNG)
                </button>
                <button 
                  onClick={shareToTelegram}
                  style={{
                    padding: '14px',
                    background: '#24A1DE',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  ✈️ Telegramda Ulashish
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
                Pasport rasmini yuklab olib, Telegram guruhlarida do'stlaringizga yuborishingiz mumkin!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

};

export default AchievementsPage;
