import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, RefreshCw } from 'lucide-react';

const TestHeader = ({ 
  topicName, 
  questionsCount, 
  mode, 
  setMode, 
  selectedBatch, 
  generateQuestions 
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #F1F5F9', marginBottom: 12 }}>
      <button
        onClick={() => navigate('/')}
        style={{ width: 38, height: 38, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
      >
        <ArrowLeft size={18} color="var(--text2)" />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topicName}</div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
          {questionsCount} savol{mode !== 'mistakes' && selectedBatch + 1 > 0 ? ` · Blok ${selectedBatch + 1}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => setMode(mode === 'flashcard' ? 'exam' : 'flashcard')}
          style={{ background: mode === 'flashcard' ? '#29B6F6' : '#F1F5F9', border: 'none', borderRadius: 10, color: mode === 'flashcard' ? '#fff' : '#64748B', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
        >
          <Zap size={15} />
          <span className="hide-mobile">Flashcard</span>
        </button>
        <button
          onClick={generateQuestions}
          style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, color: '#64748B', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw size={17} />
        </button>
      </div>
    </div>
  );
};

export default TestHeader;
