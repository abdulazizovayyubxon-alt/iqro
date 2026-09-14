import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartBottomSheet from './test/SmartBottomSheet';
import { useModalBackButton } from './profile/useModalBackButton';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { topicsOfCategory, usePedAudience } from '../data/pedAudience';

/**
 * BlockRow — panel ostidagi bosiladigan qator (blok tanlash).
 * Ilgari blok yuqorida uchinchi "chip" edi va 360px ekranda kesilib qolardi;
 * pastda esa "1–50-savollar · jami 200 ta" degan alohida yozuv turardi.
 * Endi ikkovi bitta qatorga birlashdi — yozuvning o'zi bosiladi.
 * onClick berilmasa — oddiy (bosilmaydigan) axborot qatori.
 */
export const BlockRow = ({ label, hint, onClick, ariaLabel }) => {
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      className={`sel-subrow${clickable ? '' : ' is-static'}`}
      onClick={clickable ? onClick : undefined}
      aria-label={ariaLabel}
      disabled={!clickable}
    >
      {label && <span className="sel-subrow-strong">{label}</span>}
      {label && hint && <span style={{ color: 'var(--text3)', flexShrink: 0 }}>·</span>}
      {hint && <span className="sel-subrow-hint">{hint}</span>}
      {clickable && <ChevronDown size={15} strokeWidth={2.4} className="sel-caret" />}
    </button>
  );
};

/**
 * SubjectTopicChips — Fan + Bo'lim tanlagich paneli (yagona, qayta ishlatiluvchi).
 * Dashboard, TestPage va AnalysisPage shu komponentni ishlatadi — shunda uchalasi
 * bir xil ko'rinadi va aynan bir state (activeCategory / topicId) bilan sinxron qoladi.
 *
 * Ikkala bo'lak ham BITTA oynani ochadi, faqat boshlang'ich tab'i farq qiladi:
 * fan tanlagandan keyin oyna yopilmaydi, o'zi "Bo'lim" tab'iga o'tadi.
 *
 * Props:
 *   state, updateState, SUBJECTS, TOPICS — AppContext'dan
 *   setTopicId   — bo'lim tanlanganda chaqiriladi (default: state.topicId yangilash)
 *   belowRow     — panel ostiga qo'shiladigan qator (masalan: <BlockRow/>)
 */
const SubjectTopicChips = ({
  state,
  updateState,
  SUBJECTS,
  TOPICS,
  setTopicId,
  belowRow = null,
}) => {
  const { t } = useTranslation();
  const [sheetTab, setSheetTab] = useState(null); // null = yopiq, 'subject' | 'topic'

  const cat = state.activeCategory;
  const activeSubject = SUBJECTS.find(s => s.id === cat);
  const SubjectIcon = activeSubject?.icon;
  const activeTopicId = state.topicId ?? -1;
  const activeTopic = TOPICS.find(tp => tp.id === activeTopicId);

  // Joriy fandagi bo'limlar soni — "Barchasi · 8 ta" yozuvi uchun
  // pedmahorat umumiy fan — faqat tanlangan yo'nalish (maktab / MTT) bo'limlari sanaladi
  const pedAudience = usePedAudience();
  const topicCount = useMemo(
    () => topicsOfCategory(cat, pedAudience).length,
    [cat, pedAudience]
  );

  // Android/iOS "orqaga": bo'lim tab'ida bo'lsak fan tab'iga qaytamiz, aks holda yopamiz
  useModalBackButton(!!sheetTab, () => setSheetTab(null));
  // Klaviaturada ham xuddi shu mantiq (fan/bo'lim tanlagichi — SmartBottomSheet)
  useEscapeClose(!!sheetTab, () => setSheetTab(null));

  const applyTopicId = setTopicId || ((id) => updateState({ topicId: id }));

  return (
    <>
      <div className="sel-bar">
        {/* FAN bo'lagi */}
        <button
          type="button"
          className="sel-seg"
          onClick={() => setSheetTab('subject')}
          aria-label={t('selector.subjectAria')}
        >
          {SubjectIcon && (
            <span className="sel-seg-icon"><SubjectIcon size={18} strokeWidth={2} /></span>
          )}
          <span className="sel-seg-body">
            <span className="sel-seg-cap">{t('selector.subject')}</span>
            <span className="sel-seg-val">{activeSubject ? activeSubject.name : 'CHQBT'}</span>
          </span>
          <ChevronDown size={15} strokeWidth={2.4} className="sel-caret" />
        </button>

        {/* BO'LIM bo'lagi */}
        <button
          type="button"
          className="sel-seg"
          onClick={() => setSheetTab('topic')}
          aria-label={t('selector.sectionAria')}
        >
          <span className="sel-seg-body">
            {/* Bo'limlar soni ataylab YORLIQ qatorida (9.5px) — qiymat qatorida
                bo'lsa tor ekranda "Barchasi" nomini siqib qo'yardi */}
            <span className="sel-seg-cap">
              {t('selector.section')}
              {topicCount > 0 && <> · {t('selector.sectionCount', { count: topicCount })}</>}
            </span>
            <span className="sel-seg-val">
              {(activeTopicId !== -1 && activeTopic) ? activeTopic.name : t('selector.allSections')}
            </span>
          </span>
          <ChevronDown size={15} strokeWidth={2.4} className="sel-caret" />
        </button>
      </div>

      {belowRow}

      {/* Yagona tanlash oynasi — ikki bosqichli (Fan → Bo'lim) */}
      <SmartBottomSheet
        open={!!sheetTab}
        initialTab={sheetTab || 'subject'}
        onClose={() => setSheetTab(null)}
        state={state}
        updateState={updateState}
        topicId={activeTopicId}
        setTopicId={applyTopicId}
        SUBJECTS={SUBJECTS}
        TOPICS={TOPICS}
      />
    </>
  );
};

export default SubjectTopicChips;
