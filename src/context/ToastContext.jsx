import React, { createContext, useState, useContext, useCallback, useMemo, useRef, useEffect } from 'react';

export const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  // ⚠️ HAMKOR AUDITI 2026-08-15 — `showToast` HAR RENDERDA yangi funksiya edi.
  // U ilova bo'ylab `useEffect`/`useCallback` bog'liqliklarida turadi, demak
  // HAR toast ko'rsatilganda o'sha effektlar qaytadan ishga tushardi:
  //  · PartnerPage — statistika qayta yuklanardi (xato yo'lida to'xtovsiz
  //    halqa: xato → toast → qayta yuklash → yana xato…);
  //  · ObjectionContext — Firestore `onSnapshot` obunasi uzilib, qayta
  //    ulanardi (har safar qo'shimcha o'qish).
  // `useCallback` + `useMemo` bu zanjirni uzadi: funksiya doimiy bo'ladi va
  // faqat `toast` qiymati o'zgargandagina yangi kontekst qiymati beriladi.
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    // Eski taymerni bekor qilamiz: ketma-ket ikki toast bo'lsa, birinchisining
    // taymeri ikkinchisini muddatidan oldin o'chirib yuborardi.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Komponent yo'q qilinganda osilgan taymer state yangilashiga urinmasin.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const value = useMemo(() => ({ toast, showToast }), [toast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
