import { useEffect, useRef } from 'react';

/**
 * useEscapeClose — Escape klavishi oynani yopadi.
 *
 * NEGA ALOHIDA HOOK (2026-09-09 dizayn auditi):
 *   Ilovada oynani yopishning ikki yo'li ikki xil hookda edi va deyarli
 *   hech bir oyna IKKALASINI ham ishlatmasdi:
 *     · `useModalBackButton` — Android/iOS «orqaga» tugmasi (ProfileDrawer,
 *       StatsDrawer, TheoryModal, ExamRulesModal, NotificationBell…);
 *     · `useModalA11y`       — Escape + fokus tutqichi (ActionSheet,
 *       ConfirmDialog, SettingsSheet, ModalShell…).
 *   Natijada bir oyna klaviaturadan yopilmas, boshqasi telefonda «orqaga»
 *   bosilganda yopilmay, odamni sahifadan chiqarib yuborardi.
 *
 *   `useModalA11y` Escape'ni ham qamraydi, LEKIN u ustiga fokus tutqichini
 *   o'rnatadi va fokusni oyna ichiga majburan ko'chiradi. Yon panel (drawer)
 *   va ochiluvchi menyular uchun bu ortiqcha va xatarli o'zgarish bo'lardi.
 *   Shu sababli faqat Escape kerak bo'lgan joyga aynan shu hook.
 *
 * ⚠️ USTMA-UST OCHILGAN OYNALAR — ikki himoya bor, ikkalasi ham ZARUR:
 *
 *   1. LIFO navbat. `document` ga har biri o'z tinglovchisini qo'shsa,
 *      Escape bosilganda HAMMASI ishga tushardi (`stopPropagation` bir
 *      elementdagi boshqa tinglovchilarni to'xtatmaydi). Masalan profil
 *      panelida bildirishnomalar ochilgan bo'lsa, Escape ikkalasini birdan
 *      yopardi. Endi tinglovchi BITTA va u faqat eng oxirgi (eng ustki)
 *      ro'yxatdan o'tgan oynani yopadi.
 *
 *   2. `aria-modal` tekshiruvi. `useModalA11y` ishlatadigan oynalarning
 *      HAMMASI `aria-modal="true"` beradi (shu hook shartnomasi), bu hookni
 *      ishlatadiganlarning esa HECH BIRI bermaydi. Ya'ni DOM'da shunday
 *      element bo'lsa — ustimizda fokus tutqichli modal turibdi va Escape
 *      o'shanga tegishli. Aks holda profil panelida «Profilni tahrirlash»
 *      oynasi ochilganda Escape butun panelni yopib yuborardi.
 *
 * Foydalanish:
 *   useEscapeClose(open, onClose);
 */

// Eng ustki oyna oxirida turadigan navbat (LIFO)
const stack = [];
let listening = false;

const onDocumentKeyDown = (event) => {
  if (event.key !== 'Escape') return;
  if (stack.length === 0) return;
  // Fokus tutqichli modal (useModalA11y) ochiq bo'lsa — Escape o'shaniki
  if (document.querySelector('[aria-modal="true"]')) return;
  const entry = stack[stack.length - 1];
  entry.fn?.();
};

const ensureListening = () => {
  if (listening) return;
  // capture fazasi — ostidagi sahifa tinglovchilaridan oldin ushlaymiz
  document.addEventListener('keydown', onDocumentKeyDown, true);
  listening = true;
};

export function useEscapeClose(isOpen, onClose) {
  // onClose har renderda yangi funksiya bo'lsa ham effekt qayta ishga
  // tushmasin — ref orqali eng so'nggi nusxani o'qiymiz.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    ensureListening();
    const entry = { fn: () => onCloseRef.current?.() };
    stack.push(entry);
    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [isOpen]);
}

export default useEscapeClose;
