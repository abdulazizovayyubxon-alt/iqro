/**
 * useAppUpdate — ServiceWorker yangilanishini kuzatadi va qo'llaydi.
 *
 * Ilgari bu mantiq OfflineIndicator ichida edi. Endi yangilanish oynasi
 * InterruptHost navbatidan chiqadi, tabletka esa OfflineIndicator'da qoladi —
 * ikkalasi bir manbadan o'qishi uchun hook'ga ajratildi.
 */

import { useState, useEffect, useCallback } from 'react';

// `SKIP_WAITING` dan keyin ba'zi ichki brauzer/TWA'larda `controllerchange`
// otilmaydi — foydalanuvchi tugmani bosadi-yu, hech narsa o'zgarmaydi.
const RELOAD_FALLBACK_MS = 3000;

// Uzoq ochiq turgan PWA/TWA yangi deployni o'zi sezmaydi: brauzer sw.js ni
// asosan navigatsiyada tekshiradi, standalone ilovada esa navigatsiya bo'lmaydi.
const POLL_MS = 60 * 60 * 1000;

// ⚠️ 2026-08-29 — IKKI MARTA RELOAD POYGASI TUZATILDI.
// Avval zaxira taymer `controllerchange` allaqachon reload qilgan bo'lsa ham
// BEKOR QILINMASDI: `refreshing` bayrog'i effekt ichida, taymer esa apply()
// ichida yashardi — ular bir-birini ko'rmasdi. Sekin qurilmada birinchi
// navigatsiya tugamasidan ikkinchi reload otilardi, aynan yangi SW eski
// precache yozuvlarini tozalayotgan lahzada. Shu oynada sahifa ESKI
// `index.html` ni olishi mumkin edi — uning JS fayllari esa Vercel'da
// allaqachon yo'q (har deploy oldingi paketni o'chiradi, 404). Natija:
// navy splash'da abadiy qotib qolish.
//
// ⚠️ HOLAT NEGA MODUL DARAJASIDA, `useRef` DA EMAS (2026-08-29, ikkinchi o'tish):
//   1. Hook IKKI joyda chaqiriladi — InterruptHost va LoginPage. Ref bilan har
//      nusxaning o'z bayrog'i bo'lardi, ya'ni «bir marta reload» kafolati bitta
//      nusxa ichida qolib, nusxalar o'rtasida ishlamasdi.
//   2. Zaxira taymer effekt tozalashida bekor qilinardi. LoginPage navigatsiyada
//      unmount bo'ladi: «Yangilash» bosilib, o'sha 3 soniya ichida sessiya
//      tiklanib sahifa almashsa, zaxira reload BEKOR bo'lib, yangilanish jimgina
//      qo'llanmay qolardi — aynan `RELOAD_FALLBACK_MS` mavjud bo'lgan holat
//      (TWA'da `controllerchange` otilmaydi) himoyasiz qolardi.
// Modul darajasidagi holat ikkalasini ham hal qiladi: taymer unmount'dan omon
// qoladi, bayroq esa BARCHA nusxalar uchun umumiy — reload baribir bir marta.
let reloading = false;
let fallbackTimer = null;

function reloadOnce() {
  if (reloading) return;
  reloading = true;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  window.location.reload();
}

export function useAppUpdate() {
  const [worker, setWorker] = useState(null);
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);

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
      // ⚠️ Zaxira taymer BU YERDA BEKOR QILINMAYDI — u ataylab unmount'dan
      // omon qoladi (yuqoridagi izoh, 2-band). Uni faqat `reloadOnce` o'chiradi.
      navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
    };
  }, []);

  const apply = useCallback(() => {
    setApplying(true);
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
      // Zaxira: `controllerchange` otilmasa ham foydalanuvchi qotib qolmaydi.
      // `controllerchange` ulgursa — reloadOnce bu taymerni o'chiradi.
      fallbackTimer = setTimeout(reloadOnce, RELOAD_FALLBACK_MS);
    } else {
      reloadOnce();
    }
  }, [worker]);

  return { updateReady: ready, applyUpdate: apply, applying };
}

export default useAppUpdate;
