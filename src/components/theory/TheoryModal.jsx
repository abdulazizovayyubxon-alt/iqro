import React from 'react';
import { motion } from 'framer-motion';
import { useTheory } from '../../hooks/useTheory';
import { useModalBackButton } from '../profile/useModalBackButton';
import TheorySheet from './TheorySheet';

/**
 * TheoryModal — konspektni istalgan joydan ochish uchun qobiq.
 *
 * Modal ekan, apparat «orqaga» tugmasi uni yopishi kerak (TWA/Android'da bu
 * shart) — shuning uchun mavjud `useModalBackButton` shartnomasi ishlatiladi.
 *
 * props:
 *   open, onClose
 *   topicId, topicName
 *   highlight — ajratiladigan keyPoints indeksi (xato javobdan keyin)
 */
const TheoryModal = ({ open, onClose, topicId, topicName, highlight = null }) => {
  const { theory } = useTheory(open ? topicId : null);
  useModalBackButton(open, onClose);

  // AnimatePresence ATAYIN ishlatilmadi: `exit` animatsiyasi tugamay qolib,
  // modal `open=false` bo'lgandan keyin ham DOM'da osilib turardi (tekshirildi
  // — X tugmasi ham, apparat «orqaga» tugmasi ham yopmasdi). Ilovadagi
  // boshqa modallar (PremiumModal) ham shu oddiy shartli render naqshida.
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 700,
          maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg)',
          borderRadius: '18px 18px 0 0',
          // Pastdagi tizim paneli (gesture bar) matnni kesib qo'ymasin
          padding: '18px 16px calc(24px + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <TheorySheet
          theory={theory}
          topicName={topicName}
          highlight={highlight}
          onClose={onClose}
        />
      </motion.div>
    </motion.div>
  );
};

export default TheoryModal;
