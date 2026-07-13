import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartBottomSheet from './test/SmartBottomSheet';
import ConfirmDialog from './shared/ConfirmDialog';
import { useModalBackButton } from './profile/useModalBackButton';

// Chip uslubi — yengil, ikonkasiz (Telegram-uslub): faqat matn + kichik ▾.
// Katta rangli ikonka doirasi olib tashlandi, shunda 3-4 chip bitta qatorga sig'adi.
const chipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0,
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 99, padding: '8px 12px', cursor: 'pointer',
  fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,27,45,0.05)', maxWidth: '100%',
};
const chipLabel = {
  fontSize: 14, fontWeight: 700, color: 'var(--text)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};

/**
 * Chip — yengil pill tugma (matn + ▾).
 * Fan/Mavzu/Blok chiplari shu komponentdan tashkil topadi → bir xil ko'rinish.
 */
export const Chip = ({ label, onClick, ariaLabel, labelMaxWidth, noShrink = false }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    aria-label={ariaLabel}
    style={{ ...chipStyle, flexShrink: noShrink ? 0 : 1 }}
  >
    <span style={{ ...chipLabel, ...(labelMaxWidth ? { maxWidth: labelMaxWidth } : {}) }}>{label}</span>
    <ChevronDown size={15} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--text3)' }} />
  </motion.button>
);

/**
 * SubjectTopicChips — Fan + Mavzu chiplari (yagona, qayta ishlatiluvchi).
 * Dashboard ham, TestPage ham shu komponentni ishlatadi — shunda ikkalasi
 * bir xil ko'rinadi va aynan bir state (activeCategory / topicId) bilan sinxron qoladi.
 *
 * Props:
 *   state, updateState, SUBJECTS, TOPICS — AppContext'dan
 *   setTopicId   — mavzu tanlanganda chaqiriladi (default: state.topicId yangilash)
 *   guardChange  — true bo'lsa, chip bosilganda ogohlantirib so'raydi (test o'rtasida)
 *   extraChip    — qatorga qo'shiladigan qo'shimcha chip (masalan: blok chipi)
 */
const SubjectTopicChips = ({
  state,
  updateState,
  SUBJECTS,
  TOPICS,
  setTopicId,
  guardChange = false,
  extraChip = null,
}) => {
  const { t } = useTranslation();
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  // Test o'rtasida chip bosilganda tasdiq: kutayotgan ochish funksiyasi saqlanadi
  const [pendingOpen, setPendingOpen] = useState(null);

  // Android/iOS "orqaga" tugmasi ochiq tanlagich/tasdiqni yopadi (sahifadan chiqarmaydi)
  useModalBackButton(showSubjectPicker || showTopicPicker || !!pendingOpen, () => {
    setShowSubjectPicker(false);
    setShowTopicPicker(false);
    setPendingOpen(null);
  });

  const cat = state.activeCategory;
  const activeSubject = SUBJECTS.find(s => s.id === cat);
  const activeTopicId = state.topicId ?? -1;
  const activeTopic = TOPICS.find(tp => tp.id === activeTopicId);
  const topicChipLabel = (activeTopicId !== -1 && activeTopic) ? activeTopic.name : t('common.allTopics');

  // Test o'rtasida (javob belgilangan) chip bosilsa — ilova modali orqali tasdiq
  const openGuarded = (open) => () => {
    if (guardChange) { setPendingOpen(() => open); return; }
    open(true);
  };

  const applyTopicId = setTopicId || ((id) => updateState({ topicId: id }));

  return (
    <>
      <div className="chips-row">
        {/* Fan chip */}
        <Chip
          label={activeSubject ? activeSubject.name : 'CHQBT'}
          onClick={openGuarded(setShowSubjectPicker)}
          ariaLabel={t('smartSheet.title')}
          noShrink
        />

        {/* Mavzu chip — juda uzun nom 180px da kesiladi (qator buzilmasin) */}
        <Chip
          label={topicChipLabel}
          onClick={openGuarded(setShowTopicPicker)}
          ariaLabel={t('smartSheet.topicTitle')}
          labelMaxWidth={180}
        />

        {/* Qo'shimcha chip (masalan blok) — TestPage'dan beriladi */}
        {extraChip}
      </div>

      {/* Fan tanlash (fan chip orqali) — faqat fanlar */}
      <SmartBottomSheet
        showSelectorDrawer={showSubjectPicker}
        setShowSelectorDrawer={setShowSubjectPicker}
        state={state}
        updateState={updateState}
        topicId={activeTopicId}
        setTopicId={applyTopicId}
        SUBJECTS={SUBJECTS}
        TOPICS={TOPICS}
        subjectsOnly
      />

      {/* Mavzu tanlash (mavzu chip orqali) — faqat mavzular */}
      <SmartBottomSheet
        showSelectorDrawer={showTopicPicker}
        setShowSelectorDrawer={setShowTopicPicker}
        state={state}
        updateState={updateState}
        topicId={activeTopicId}
        setTopicId={applyTopicId}
        SUBJECTS={SUBJECTS}
        TOPICS={TOPICS}
        topicsOnly
      />

      {/* Test o'rtasida fan/mavzu almashtirish tasdig'i */}
      <ConfirmDialog
        open={!!pendingOpen}
        title={t('test.changeWarn')}
        onConfirm={() => {
          const open = pendingOpen;
          setPendingOpen(null);
          if (open) open(true);
        }}
        onCancel={() => setPendingOpen(null)}
      />
    </>
  );
};

export default SubjectTopicChips;
