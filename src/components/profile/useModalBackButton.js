import { useEffect, useRef } from 'react';

/**
 * Android/iOS "orqaga" tugmasi modalni yopishi uchun history interception.
 * Shartnoma: modal ochilganda history.pushState({ profileModalOpen: true }),
 * popstate'da barcha modallar yopiladi; modal oddiy yo'l bilan yopilsa
 * qo'shilgan history yozuvi history.back() bilan olib tashlanadi.
 */
export function useModalBackButton(isAnyModalOpen, closeAll) {
  const closeAllRef = useRef(closeAll);
  useEffect(() => { closeAllRef.current = closeAll; }, [closeAll]);

  useEffect(() => {
    if (!isAnyModalOpen) return;

    window.history.pushState({ profileModalOpen: true }, '');

    const handlePopState = () => closeAllRef.current();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.profileModalOpen) {
        window.history.back();
      }
    };
  }, [isAnyModalOpen]);
}
