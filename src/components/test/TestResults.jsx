import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Target, Home, Share2 } from 'lucide-react';

const TestResults = ({
  correctCount,
  questionsLength,
  topicName,
  state,
  setMode,
  generateQuestions,
  navigate,
  showToast
}) => {
  const pct = Math.round((correctCount / questionsLength) * 100);
  const isExcellent = correctCount / questionsLength >= 0.7;
  const isGood = correctCount / questionsLength >= 0.5;

  const handleTelegramShare = () => {
    const emoji = pct >= 70 ? '🏆' : pct >= 50 ? '📊' : '💪'; 
    const text = `${emoji} IQRO platformasida test yechdim!\n📚 Mavzu: ${topicName}\n✅ Natija: ${correctCount}/${questionsLength} (${pct}%)\n🎯 Imtihonga tayyorgarlik!`; 
    window.open(`https://t.me/share/url?url=https://iqro-t41p.vercel.app&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyShare = () => {
    const text = `IQRO platformasida test: ${correctCount}/${questionsLength} (${pct}%) - ${topicName}`; 
    navigator.clipboard?.writeText(text); 
    showToast('Nusxalandi! 📋', 'info');
  };

  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '36px 24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 52, marginBottom: 12, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>
        {isExcellent ? '🏆' : isGood ? '📊' : '💪'}
      </div>
      <div style={{ fontSize: 22, color: 'var(--text)', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.5px' }}>
        {isExcellent ? 'Ajoyib Natija!' : 'Davom eting!'}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24, fontWeight: 500 }}>
        {questionsLength} ta savoldan {correctCount} tasiga to'g'ri javob berdingiz.
      </div>
      
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: '24px 32px', display: 'inline-block', marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Natija</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: isExcellent ? '#10B981' : isGood ? '#F59E0B' : '#EF4444', lineHeight: 1 }}>
          {correctCount} <span style={{ fontSize: 28, color: 'var(--text3)' }}>/ {questionsLength}</span>
        </div>
        <div style={{ fontSize: 20, marginTop: 8, color: 'var(--text2)', fontWeight: 800 }}>{pct}%</div>
        <div style={{ fontSize: 13, color: '#29B6F6', fontWeight: 700, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          🏆 +{correctCount * 2} reyting ball qo'shildi!
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
        <motion.button 
          whileHover={{ scale: 1.01, y: -1 }} 
          whileTap={{ scale: 0.98 }} 
          style={{ padding: '14px', background: 'linear-gradient(135deg, #29B6F6 0%, #8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)' }} 
          onClick={generateQuestions}
        >
          <RefreshCw size={17} /> Yana ishlash
        </motion.button>
        
        {state.mistakes?.length > 0 && (
          <motion.button 
            whileHover={{ scale: 1.01, y: -1 }} 
            whileTap={{ scale: 0.98 }} 
            style={{ padding: '13px', background: 'var(--glass-bg)', color: 'var(--text2)', border: '1px solid var(--glass-border)', borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
            onClick={() => setMode('mistakes')}
          >
            <Target size={16} /> Xatolar ustida ishlash
          </motion.button>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.01, y: -1 }} 
          whileTap={{ scale: 0.98 }} 
          style={{ padding: '13px', background: 'var(--glass-bg)', color: 'var(--text2)', border: '1px solid var(--glass-border)', borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
          onClick={() => navigate('/test')}
        >
          <Home size={16} /> Bosh sahifaga
        </motion.button>
        
        <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <Share2 size={13} /> Natijani ulashing
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              className="btn btn-sm" 
              style={{ flex: 1, background: '#29B6F6', color: 'white', border: 'none', borderRadius: '12px', padding: '10px' }} 
              onClick={handleTelegramShare}
            >
              Telegram
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              className="btn btn-sm btn-outline" 
              style={{ borderRadius: '12px', padding: '10px', border: '1px solid var(--glass-border)' }} 
              onClick={handleCopyShare} 
            >
              📋
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
