import { useEffect, useRef } from 'react';

/**
 * useModalA11y — modal/drawer oynalari uchun klaviatura va screen reader qatlami.
 *
 * ⚠️ AUDIT 2026-08-06, T-10 BAND — nima uchun kerak:
 *   · butun `src/` da `Escape` klavishi HECH QAYERDA tinglanmasdi;
 *   · ~28 ta modal/drawer/sheet komponentidan hech birida `role="dialog"`,
 *     `aria-modal` yoki fokus tutqichi yo'q edi;
 *   · Tab bosilganda fokus modal ORTIDAGI sahifaga "qochib ketardi", ya'ni
 *     oyna faqat sichqoncha/teginish bilan boshqarilardi.
 *
 * Hook uchta ishni bajaradi:
 *   1. ochilganda fokusni oyna ichiga ko'chiradi;
 *   2. Tab/Shift+Tab ni oyna ichida aylantiradi (focus trap);
 *   3. Escape bosilganda `onClose` ni chaqiradi va yopilgach fokusni
 *      oyna ochilishidan OLDINGI elementga qaytaradi.
 *
 * Foydalanish:
 *   const ref = useModalA11y(open, onClose);
 *   <div ref={ref} role="dialog" aria-modal="true" aria-label="..." tabIndex={-1}>
 *
 * `tabIndex={-1}` SHART: ichida fokuslanadigan element bo'lmasa, fokus
 * konteynerning o'ziga beriladi.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useModalA11y(isOpen, onClose) {
  const containerRef = useRef(null);
  // onClose ni ref orqali o'qiymiz — chaqiruvchi uni har renderda yangi
  // funksiya sifatida bersa ham effekt qayta ishga tushmasin (fokus sakramasin).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const node = containerRef.current;
    const previouslyFocused = document.activeElement;

    // Ko'rinmaydigan elementlar tutqichga kirmasligi kerak (yashirin tablar va h.k.)
    const getFocusable = () => {
      if (!node) return [];
      return Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
    };

    // Fokusni oyna ichiga ko'chirish — render tugagach
    const focusTimer = setTimeout(() => {
      const first = getFocusable()[0];
      if (first) first.focus();
      else node?.focus?.();
    }, 0);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !node) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Fokus qandaydir yo'l bilan oynadan chiqib ketgan bo'lsa — qaytaramiz
      if (!node.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // capture fazasi — ostidagi sahifa tinglovchilaridan oldin ushlaymiz
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      // Fokusni qaytarish — foydalanuvchi qayerdan chiqqan bo'lsa, o'sha yerga
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
}

export default useModalA11y;
