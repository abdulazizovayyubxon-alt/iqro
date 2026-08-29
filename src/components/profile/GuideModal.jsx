import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, BookMarked } from 'lucide-react';
import { SUBJECT_COUNT } from '../../data/mockData';
import { QUESTION_COUNT_TEXT, APP_VERSION } from '../../config';
import SettingsSheet from '../shared/SettingsSheet';

/**
 * Foydalanish qo'llanmasi (yig'iladigan panellar).
 *
 * Qo'llanma 4 ta paneldan 10 taga kengaytirildi: ilgari boshlash, imtihon
 * rejimi, kunlik reja, tayyorlik ko'rsatkichi, xatolar daftari, ball hisobi
 * va oflayn ishlash umuman tushuntirilmasdi.
 *
 * Har panel ODDIY `Title` + `Body` juftligi. Avval matn `...a`/`...bold`/`...b`
 * bo'laklariga bo'lingan edi — uni tarjima qilish ham, o'zgartirish ham og'ir
 * edi va uch tilda bo'laklar sonini teng ushlab turish kerak bo'lardi.
 * Baza hajmi matnga QO'LDA yozilmaydi — fan soni SUBJECTS ro'yxatidan, savol
 * soni config'dan keladi (ulashish matni ham shu manbadan oladi).
 *
 * ⚠️ 2026-08-29, IKKI TUZATISH:
 *   1. Oyna umumiy qobiqdan FOYDALANMASDI (o'z overlay'ini o'zi chizardi) —
 *      shu sabab Escape ishlamasdi, fokus orqadagi sahifaga qochardi va o'qish
 *      dasturi oynani e'lon qilmasdi. Endi SettingsSheet, ya'ni a11y qatlami
 *      bepul keladi.
 *   2. Yashirin ambassador triggeri SARLAVHADA edi — foydalanuvchi qo'llanmani
 *      ochib, sarlavhani bexosdan bosishi kifoya edi. Endi u pastdagi versiya
 *      yozuvida va BEShTA bosishni talab qiladi.
 */
const PANEL_COUNT = 10;
const SECRET_TAPS = 5;

export default function GuideModal({ onClose, showToast }) {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState(null);
  const [taps, setTaps] = useState(0);

  const panels = Array.from({ length: PANEL_COUNT }, (_, i) => ({
    title: t(`modals.guideP${i + 1}Title`),
    body: t(`modals.guideP${i + 1}Body`, { subjects: SUBJECT_COUNT, questions: QUESTION_COUNT_TEXT }),
  }));

  // Ambassador oynasini sinash uchun yashirin kalit — versiya yozuvida
  const handleSecretTap = () => {
    const next = taps + 1;
    setTaps(next);
    if (next < SECRET_TAPS) return;
    setTaps(0);
    localStorage.setItem('force_ambassador', '1');
    localStorage.removeItem('iqro_ambassador_thanks');
    showToast(t('modals.guideAdminToast'), 'success');
  };

  return (
    <SettingsSheet
      icon={<BookMarked size={20} />}
      title={t('modals.guideTitle')}
      sublabel={t('modals.guideSub', { count: PANEL_COUNT })}
      onClose={onClose}
      footer={
        <button type="button" className="ss-btn is-cta" onClick={onClose}>
          {t('modals.guideUnderstood')}
        </button>
      }
    >
      <div className="ss-acc">
        {panels.map((panel, i) => (
          <div key={i} className={`ss-acc-item${activePanel === i ? ' is-open' : ''}`}>
            <button
              type="button"
              className="ss-acc-btn"
              aria-expanded={activePanel === i}
              onClick={() => setActivePanel(p => (p === i ? null : i))}
            >
              {panel.title}
              <ChevronRight size={16} />
            </button>
            {activePanel === i && <div className="ss-acc-body">{panel.body}</div>}
          </div>
        ))}
      </div>

      <button type="button" className="ss-secret" onClick={handleSecretTap}>
        {t('settings.version', { version: APP_VERSION })}
      </button>
    </SettingsSheet>
  );
}
