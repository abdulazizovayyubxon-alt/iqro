/**
 * ComingSoonNotice — savollari hali joylanmagan fan uchun «tez orada» kartasi.
 *
 * NEGA KERAK: fizika va texnologiya fanlari ro'yxatda ko'rinadi (o'qituvchi o'z
 * fanini topsin), lekin savol bazasi hali tayyor emas. Kartasiz bunday fan
 * oddiy «Mavzu tayyorlanmoqda» ekraniga tushardi — «Ko'proq savol kerak»
 * so'rovi yozilar, imtihon sahifasi esa sababsiz ortga qaytarardi.
 * Karta muddatni aytadi va shu vaqtgacha pedagogik mahorat va kasb standarti
 * savollarini yechishni taklif qiladi (`COMING_SOON_SUGGESTED_SUBJECT`).
 *
 * Muddat `COMING_SOON_UNTIL` dan hisoblanadi: sana o'tib ketsa matn «tez
 * kunlarda» bo'ladi — eskirgan va'da ko'rsatilmaydi.
 *
 * props:
 *   category — faol fan id'si
 *   variant  — 'card' (Dashboard, ExamPage) | 'plain' (TestPage bo'sh holat kartasi ichida)
 *   onBack   — 'plain' da «Boshqa fanni tanlash» tugmasi uchun
 */
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarClock, GraduationCap } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { SUBJECTS, COMING_SOON_SUGGESTED_SUBJECT } from '../data/mockData';
import { audienceOfSubject, setPedAudience, PED_CATEGORY } from '../data/pedAudience';
import { comingSoonWhen } from '../utils/comingSoon';

export default function ComingSoonNotice({ category, variant = 'card', onBack }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateState } = useContext(AppContext);

  const subjectName = SUBJECTS.find(s => s.id === category)?.name || category;
  const title = t('comingSoon.title', { subject: subjectName });
  const text = t('comingSoon.text', { when: comingSoonWhen(t) });

  // Taklif qilingan fanga o'tib, darhol «Fan testi» ochiladi. Profildagi fan
  // (`user.subject`) o'zgarmaydi — fan tanlagichda u ★ bilan turadi va
  // savollar joylangach bitta bosishda qaytiladi.
  // Pedmahorat umumiy fan: maktab fanidan kelgan o'qituvchiga maktab yo'nalishi ochiladi.
  const openSuggestion = () => {
    const audience = COMING_SOON_SUGGESTED_SUBJECT === PED_CATEGORY && audienceOfSubject(category);
    if (audience) setPedAudience(audience);
    updateState({ activeCategory: COMING_SOON_SUGGESTED_SUBJECT, topicId: -1, testMode: 'exam' });
    navigate('/test');
  };

  if (variant === 'plain') {
    return (
      <>
        <div className="empty-state-icon info float-animation">🗓️</div>
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-text">{text}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-primary" style={{ width: 'min(100%, 320px)' }} onClick={openSuggestion}>{t('comingSoon.cta')}</button>
          {onBack && (
            <button className="btn btn-outline" style={{ width: 'min(100%, 320px)' }} onClick={onBack}><ArrowLeft size={16} /> {t('test.chooseOtherSubject')}</button>
          )}
        </div>
      </>
    );
  }

  return (
    <div role="status" style={{
      padding: '16px 16px 14px', borderRadius: 18,
      background: 'var(--blue-bg)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg2)', color: 'var(--accent)',
        }}>
          <CalendarClock size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <span style={{
            display: 'inline-block', marginBottom: 3,
            fontSize: 'var(--fs-3xs)', fontWeight: 800, letterSpacing: 0.4,
            textTransform: 'uppercase', color: 'var(--accent)',
          }}>
            {t('comingSoon.badge')}
          </span>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{title}</div>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.5 }}>{text}</p>
        </div>
      </div>
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        onClick={openSuggestion}
      >
        <GraduationCap size={17} /> {t('comingSoon.cta')}
      </button>
    </div>
  );
}
