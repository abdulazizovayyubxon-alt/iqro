import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Star, AlertTriangle, Lightbulb, FileText, X,
} from 'lucide-react';

/**
 * TheorySheet — mavzu konspektining o'qish ko'rinishi.
 *
 * Bo'limlar bo'sh bo'lsa umuman chizilmaydi: material bosqichma-bosqich
 * to'ldiriladi, yarim to'la sahifa «tayyor emas»dek ko'rinmasligi kerak.
 *
 * props:
 *   theory      — normalizeTheory natijasi
 *   topicName   — sarlavha
 *   highlight   — ajratib ko'rsatiladigan keyPoints indeksi (xato javobdan keyin)
 *   onClose     — yopish tugmasi (berilmasa tugma chiqmaydi)
 *   embedded    — modal emas, sahifa ichida (yopish/zaxira o'ramisiz)
 */
const Section = ({ icon: Icon, title, color, children }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.4,
      textTransform: 'uppercase', color: 'var(--text3)',
    }}>
      <Icon size={13} style={{ color }} />
      {title}
    </div>
    {children}
  </div>
);

const Bullet = ({ children, tone = 'var(--text2)' }) => (
  <li style={{
    fontSize: 12.5, lineHeight: 1.6, color: tone,
    marginBottom: 7, paddingLeft: 2,
  }}>
    {children}
  </li>
);

const TheorySheet = ({ theory, topicName, highlight = null, onClose, embedded = false }) => {
  const { t } = useTranslation();
  const highlightRef = useRef(null);

  // Ajratilgan band ko'rinadigan joyga surilsin — xato javobdan keyin
  // foydalanuvchi uni qidirib o'tirmasligi kerak
  useEffect(() => {
    if (highlight == null || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight]);

  if (!theory) return null;

  const { summary, keyPoints, mustKnow, mistakes, mnemonics, source, updatedAt, legacy } = theory;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Sarlavha */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4,
      }}>
        <BookOpen size={19} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
            {topicName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {t('theory.subtitle')}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              flexShrink: 0, width: 30, height: 30, borderRadius: 9,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Qisqacha */}
      {summary && (
        <div style={{
          marginTop: 12, padding: '12px 14px', borderRadius: 12,
          background: 'var(--bg3)', fontSize: 13, lineHeight: 1.65, color: 'var(--text2)',
        }}>
          {summary}
        </div>
      )}

      {/* Asosiy bandlar */}
      {keyPoints.length > 0 && (
        <Section icon={BookOpen} title={t('theory.keyPoints')} color="var(--accent)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keyPoints.map((p, i) => {
              const on = highlight === i;
              return (
                <div
                  key={i}
                  ref={on ? highlightRef : null}
                  className="glass-panel"
                  style={{
                    padding: '12px 14px',
                    border: on ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: on ? 'var(--blue-bg)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: 6,
                      background: on ? 'var(--accent)' : 'var(--bg3)',
                      color: on ? '#fff' : 'var(--text3)',
                      fontSize: 10.5, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
                        {p.t}
                      </div>
                      {p.d && (
                        <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6, marginTop: 4 }}>
                          {p.d}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Yodda tutish shart */}
      {mustKnow.length > 0 && (
        <Section icon={Star} title={t('theory.mustKnow')} color="var(--amber)">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {mustKnow.map((x, i) => <Bullet key={i} tone="var(--text)">{x}</Bullet>)}
          </ul>
        </Section>
      )}

      {/* Tipik xatolar */}
      {mistakes.length > 0 && (
        <Section icon={AlertTriangle} title={t('theory.mistakes')} color="var(--red)">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {mistakes.map((x, i) => <Bullet key={i}>{x}</Bullet>)}
          </ul>
        </Section>
      )}

      {/* Eslab qolish */}
      {mnemonics.length > 0 && (
        <Section icon={Lightbulb} title={t('theory.mnemonics')} color="var(--green)">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {mnemonics.map((x, i) => <Bullet key={i}>{x}</Bullet>)}
          </ul>
        </Section>
      )}

      {/* Manba va yangilanish — attestatsiya materialida ishonch uchun */}
      {(source || updatedAt) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
          marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--border)',
          fontSize: 10.5, color: 'var(--text3)', lineHeight: 1.5,
        }}>
          <FileText size={12} style={{ flexShrink: 0 }} />
          {source && <span>{t('theory.source', { source })}</span>}
          {updatedAt && <span>· {t('theory.updated', { date: updatedAt })}</span>}
        </div>
      )}

      {/* Material hali strukturaga o'tkazilmagan mavzu — halol ogohlantirish */}
      {legacy && !embedded && (
        <div style={{
          marginTop: 16, fontSize: 11, color: 'var(--text3)', lineHeight: 1.55,
        }}>
          {t('theory.legacyNote')}
        </div>
      )}
    </div>
  );
};

export default TheorySheet;
