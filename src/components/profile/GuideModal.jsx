import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { SUBJECT_COUNT } from '../../data/mockData';
import { QUESTION_COUNT_TEXT } from '../../config';
import '../../pages/ProfilePage.css';

/** Foydalanish qo'llanmasi (yig'iladigan panellar) */
export default function GuideModal({ onClose, showToast }) {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState(null);

  // Qo'llanma 4 ta paneldan 10 taga kengaytirildi: ilgari boshlash, imtihon
  // rejimi, kunlik reja, tayyorlik ko'rsatkichi, xatolar daftari, ball hisobi
  // va oflayn ishlash umuman tushuntirilmasdi.
  //
  // Har panel endi ODDIY `Title` + `Body` juftligi. Avval matn `...a`/`...bold`/
  // `...b` bo'laklariga bo'lingan edi — uni tarjima qilish ham, o'zgartirish ham
  // og'ir edi va uch tilda bo'laklar sonini teng ushlab turish kerak bo'lardi.
  // Baza hajmi matnga QO'LDA yozilmaydi — fan soni SUBJECTS ro'yxatidan,
  // savol soni config'dan keladi (ulashish matni ham shu manbadan oladi).
  // Ilgari qo'llanmada «16 ta fan, 44 000 savol» deb qotib turardi va baza
  // kengaygach ilova o'zi haqida eskirgan ma'lumot berardi.
  const PANEL_COUNT = 10;
  const panels = Array.from({ length: PANEL_COUNT }, (_, i) => ({
    title: t(`modals.guideP${i + 1}Title`),
    body: t(`modals.guideP${i + 1}Body`, { subjects: SUBJECT_COUNT, questions: QUESTION_COUNT_TEXT }),
  }));

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="pp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: '24px' }}
      >
        <div
          className="pp-modal-title"
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', cursor: 'pointer' }}
          onClick={() => {
            // Secret trigger for testing Ambassador Modal
            localStorage.setItem('force_ambassador', '1');
            localStorage.removeItem('iqro_ambassador_thanks');
            showToast(t('modals.guideAdminToast'), 'success');
          }}
        >
          <span style={{ fontSize: 'var(--fs-5xl)' }}>📖</span> {t('modals.guideTitle')}
        </div>

        <div className="pp-policy-scroll" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {panels.map((panel, i) => (
            <div key={i} style={{ background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setActivePanel(p => p === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 'var(--fs-base)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              >
                {panel.title}
                <ChevronRight size={16} style={{ transform: activePanel === i ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s', flexShrink: 0 }} />
              </button>
              {activePanel === i && (
                <div style={{ padding: '10px 16px 16px', fontSize: 'var(--fs-md)', color: 'var(--text2)', lineHeight: 1.65 }}>
                  {panel.body}
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--blue)', color: '#fff', border: 'none', fontWeight: 700, marginTop: '20px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('modals.guideUnderstood')}
        </button>
      </motion.div>
    </div>
  );
}
