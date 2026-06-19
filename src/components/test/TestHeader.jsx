import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TestHeader = ({
  topicName,
  subjectName,
  questionsCount,
  mode,
  selectedBatch,
  onOpenSelector,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
      {/* Bosib fan/mavzu almashtirish — tanlagich (dropdown) ko'rinishida */}
      <button
        onClick={onOpenSelector}
        className="test-selector-chip"
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '7px 8px 7px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
      >
        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', minWidth: 0, fontSize: 15 }}>
            {subjectName && (
              <>
                <span style={{ fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>{subjectName}</span>
                <span style={{ color: 'var(--text3)', fontWeight: 500, margin: '0 6px', flexShrink: 0 }}>•</span>
              </>
            )}
            <span style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topicName}</span>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {t('test.questionsCount', { count: questionsCount })}{mode !== 'mistakes' && selectedBatch + 1 > 0 ? ` · ${t('test.block', { n: selectedBatch + 1 })}` : ''}
          </span>
        </span>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: 'var(--bg3)', color: 'var(--text2)' }}>
          <ChevronDown size={16} />
        </span>
      </button>
    </div>
  );
};

export default TestHeader;
