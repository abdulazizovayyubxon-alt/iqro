import { useEffect, useRef } from 'react';

// Initialize global back stack and listener
if (typeof window !== 'undefined') {
  window._modalBackStack = window._modalBackStack || [];
  
  if (!window._modalBackStackListenerRegistered) {
    window.addEventListener('popstate', (event) => {
      const stack = window._modalBackStack;
      if (stack.length > 0) {
        // Pop the topmost handler and run it
        const handler = stack.pop();
        if (handler && typeof handler.fn === 'function') {
          handler.fn();
        }
      }
    });
    window._modalBackStackListenerRegistered = true;
  }
}

/**
 * Android/iOS "orqaga" tugmasi modalni yopishi uchun history interception.
 * Shartnoma: modal ochilganda global stackka handler qo'shiladi va history.pushState qilinadi.
 * Hardware orqaga bosilganda stackdagi eng ustki modal yopiladi.
 * Modal UI orqali yopilganda stackdan olib tashlanadi va history.back() orqali stack moslanadi.
 */
export function useModalBackButton(isAnyModalOpen, closeAll) {
  const closeAllRef = useRef(closeAll);
  useEffect(() => { closeAllRef.current = closeAll; }, [closeAll]);

  useEffect(() => {
    if (!isAnyModalOpen) return;

    // Har bir modal ochilishi uchun maxsus handler obyekti
    const handler = {
      fn: () => {
        if (closeAllRef.current) closeAllRef.current();
      }
    };

    // Global stackka qo'shish
    window._modalBackStack.push(handler);

    // Tarixga yozish
    window.history.pushState({ profileModalOpen: true }, '');

    return () => {
      // Agar modal yopilgan bo'lsa, uni stackdan o'chirish
      const index = window._modalBackStack.indexOf(handler);
      if (index !== -1) {
        window._modalBackStack.splice(index, 1);
        
        // Agar popstate orqali emas, qo'lda yopilgan bo'lsa historyni sinxronlash
        if (window.history.state?.profileModalOpen) {
          window.history.back();
        }
      }
    };
  }, [isAnyModalOpen]);
}
