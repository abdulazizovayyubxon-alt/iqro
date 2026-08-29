/**
 * SettingsSheet — sozlamalar oynalarining YAGONA qobig'i.
 *
 * NEGA KERAK BO'LDI (2026-08-29 dizayn auditi):
 *   Sozlamalar ro'yxati bitta tizim bo'yicha qurilgan — 100% CSS klass, bir xil
 *   qator, bir xil ikonka plitkasi. Lekin qator bosilganda ochiladigan yetti oyna
 *   HAR BIRI o'zicha yozilgan edi: 106 ta inline uslub, 4 xil kenglik
 *   (400/420/440/500), 4 xil surish qoidasi, 4 xil pastki tugma, 3 xil ochilish
 *   animatsiyasi va birortasida ham ✕ yo'q edi. Tashqi ko'rinish tinch,
 *   ichkarisi esa notekis his qilinardi.
 *
 * UCH QATLAM, QAT'IY:
 *   1. Sarlavha — QOTIB turadi. Chapdagi ikonka plitkasi ro'yxatdagi qator
 *      ikonkasining AYNAN o'zi (`pp-menu-icon` klassi qayta ishlatiladi), shuning
 *      uchun bosilgan qator ko'z oldida oynaga "aylanadi".
 *   2. Tanasi — YAGONA suriladigan joy. Ichkaridagi hech bir blokka qotib qolgan
 *      balandlik berilmaydi: ilgari Maxfiylik matni `maxHeight: 320px` qutida
 *      turgani uchun katta ekranda ham "chala ochilardi".
 *   3. Pastki tugmalar — QOTIB turadi. Uzun formada ham Saqlash ko'zdan
 *      yo'qolmaydi (ilgari EditProfileModal'da butun oyna surilardi).
 *
 * O'LCHAMLAR: telefonda (≤768px) pastdan ko'tariladigan varaq, kompyuterda
 * markazdagi 480px oyna — farqi faqat CSS'da, mantiq bir xil.
 *
 * YOPISH ANIMATSIYASI: `is-closing` klassi + timeout. Ataylab framer-motion
 * AnimatePresence ISHLATILMADI — ActionSheet.jsx dagi izohda yozilgan xato
 * (kalitsiz bolalar tufayli overlay DOM'da qolib, butun ilovani bloklab qo'ygan)
 * shu naqshdan kelib chiqqan edi. Bu yerda qobiq o'zini o'zi yopadi, tashqi
 * kutubxona holatiga bog'liq emas.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useModalA11y from '../../hooks/useModalA11y';
import '../../pages/ProfilePage.css';

/** Yopilish animatsiyasi davomiyligi — CSS'dagi `ssUpOut`/`ssOut` bilan bir xil */
const CLOSE_MS = 200;

export default function SettingsSheet({
  icon,
  tone = 'accent',
  title,
  sublabel,
  onClose,
  footer,
  label,
  busy = false,
  children,
}) {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  const requestClose = useCallback(() => {
    // `busy` — amal bajarilayotgan payt (masalan hisob o'chirilmoqda): oyna
    // yopilmasin, aks holda foydalanuvchi natijani ko'rmay qoladi.
    if (busy || closing) return;
    setClosing(true);
    timerRef.current = setTimeout(() => onClose?.(), CLOSE_MS);
  }, [busy, closing, onClose]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Escape, fokus tutqichi va fokusni qaytarish — qobiqning O'ZIDA.
  // Ilgari GuideModal bu qatlamdan butunlay chetda qolgan edi.
  const sheetRef = useModalA11y(true, requestClose);

  return (
    <div
      className={`ss-overlay${closing ? ' is-closing' : ''}`}
      onClick={requestClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={label || (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
        className={`ss-sheet${closing ? ' is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tortish chizig'i — faqat telefonda ko'rinadi (CSS) */}
        <div className="ss-grab" aria-hidden="true" />

        <div className="ss-head">
          {icon && (
            <div className={`pp-menu-icon${tone === 'accent' ? '' : ` is-${tone}`}`}>
              {icon}
            </div>
          )}
          <div className="ss-head-text">
            <div className="ss-title">{title}</div>
            {sublabel && <div className="ss-sub">{sublabel}</div>}
          </div>
          <button
            type="button"
            className="ss-close"
            onClick={requestClose}
            disabled={busy}
            aria-label={t('common.close')}
          >
            <X size={17} />
          </button>
        </div>

        <div className="ss-body">{children}</div>

        {footer && <div className="ss-foot">{footer}</div>}
      </div>
    </div>
  );
}
