/**
 * useAppUpdate — ServiceWorker yangilanishini kuzatadi va qo'llaydi.
 *
 * Ilgari bu mantiq OfflineIndicator ichida edi. Endi yangilanish oynasi
 * InterruptHost navbatidan chiqadi, tabletka esa OfflineIndicator'da qoladi —
 * ikkalasi bir manbadan o'qishi uchun hook'ga ajratildi.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// `SKIP_WAITING` dan keyin ba'zi ichki brauzer/TWA'larda `controllerchange`
// otilmaydi — foydalanuvchi tugmani bosadi-yu, hech narsa o'zgarmaydi.
const RELOAD_FALLBACK_MS = 3000;

// Uzoq ochiq turgan PWA/TWA yangi deployni o'zi sezmaydi: brauzer sw.js ni
// asosan navigatsiyada tekshiradi, standalone ilovada esa navigatsiya bo'lmaydi.
const POLL_MS = 60 * 60 * 1000;

export function useAppUpdate() {
  const [worker, setWorker] = useState(null);
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);

  // ⚠️ 2026-08-29 — IKKI MARTA RELOAD POYGASI TUZATILDI.
  // Avval zaxira taymer `controllerchange` allaqachon reload qilgan bo'lsa ham
  // BEKOR QILINMASDI: `refreshing` bayrog'i effekt ichida, taymer esa apply()
  // ichida yashardi — ular bir-birini ko'rmasdi. Sekin qurilmada birinchi
  // navigatsiya tugamasidan ikkinchi reload otilardi, aynan yangi SW eski
  // precache yozuvlarini tozalayotgan lahzada. Shu oynada sahifa ESKI
  // `index.html` ni olishi mumkin edi — uning JS fayllari esa Vercel'da
  // allaqachon yo'q (har deploy oldingi paketni o'chiradi, 404). Natija:
  // navy splash'da abadiy qotib qolish.
  // Endi bayroq ham, taymer ham ref'da: kim birinchi ulgursa, ikkinchisini
  // o'chiradi va reload FAQAT bir marta bo'ladi.
  const reloadingRef = useRef(false);
  const fallbackRef = useRef(null);

  const reloadOnce = useCallback(() => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    let timer = null;

    navigator.serviceWorker.ready.then((registration) => {
      // ⚠️ AUDIT 2026-08-06, T-11 BAND — avval FAQAT `updatefound` tinglanardi.
      // Agar yangi SW OLDINGI sessiyada o'rnatilib `waiting` holatida qolgan
      // bo'lsa, yangi yuklanishda `updatefound` UMUMAN otilmaydi va yangilanish
      // boshqa taklif qilinmasdi. Shu sababli tayyor turganini ham tekshiramiz.
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWorker(registration.waiting);
        setReady(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // Yangi SW o'rnatildi + eski SW mavjud = yangilanish bor
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWorker(newWorker);
            setReady(true);
          }
        });
      });

      timer = setInterval(() => {
        registration.update().catch(() => { /* tarmoq yo'q — keyingi urinishda */ });
      }, POLL_MS);
    }).catch(() => {
      /* SW ro'yxatdan o'tmagan (private rejim / ichki brauzer) — yangilanish
         taklifi ko'rsatilmaydi, qolgan indikator ishlayveradi */
    });

    // SW almashinuvidan keyin sahifani yangilash
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);

    // Tozalash — StrictMode effektni ikki marta ishga tushirganda ikkita
    // tinglovchi va ikkita interval qolib ketardi (T-11).
    return () => {
      if (timer) clearInterval(timer);
      if (fallbackRef.current) {
        clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
      navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
    };
  }, [reloadOnce]);

  const apply = useCallback(() => {
    setApplying(true);
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
      // Zaxira: `controllerchange` otilmasa ham foydalanuvchi qotib qolmaydi.
      // `controllerchange` ulgursa — reloadOnce bu taymerni o'chiradi.
      fallbackRef.current = setTimeout(reloadOnce, RELOAD_FALLBACK_MS);
    } else {
      reloadOnce();
    }
  }, [worker, reloadOnce]);

  return { updateReady: ready, applyUpdate: apply, applying };
}

export default useAppUpdate;
