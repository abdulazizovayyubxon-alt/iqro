/**
 * push.js — FCM (Firebase Cloud Messaging) klient xizmati.
 *
 * Foydalanuvchi ruxsat bersa: notifikatsiya tokeni olinadi va
 * `users/{uid}.fcmTokens` ga (arrayUnion) saqlanadi. Server (notify-admin
 * funksiyasi ?action=push) shu tokenlarga push yuboradi.
 *
 * EGASI: Firebase Console → Project Settings → Cloud Messaging → Web Push
 * sertifikati (VAPID) kalitini yaratib, .env'ga qo'shadi:
 *   VITE_FIREBASE_VAPID_KEY=...
 * Kalit bo'lmasa — push jimgina o'chiq qoladi (xatosiz).
 */
// ⚠️ `firebase/messaging` ATAYLAB statik import QILINMAYDI (AUDIT 2026-08-17).
//
// Avval u shu yerda statik `import` bilan kelardi. Natijada bu modulni
// import qilgan HAR QANDAY fayl butun messaging SDK'sini o'zi bilan tortardi —
// jumladan `App.jsx` va `InterruptHost.jsx` (ikkalasi ham eager). Shu sababli
// `fb-messaging` chunk'i `index.html` ga `modulepreload` bo'lib yozilib,
// 36 KB birinchi ekrandan OLDIN yuklanardi. Push ruxsati bermagan
// foydalanuvchiga (ko'pchilikka) u hech qachon kerak emas, va bu
// `vite.config.js` dagi o'z niyatiga qarshi edi.
//
// Endi SDK faqat HAQIQATAN kerak bo'lganda (`getMessagingInstance` birinchi
// chaqirilganda) yuklanadi. `pushSupported()` va `pushPermission()` esa SDK'siz
// ishlaydi — ular faqat `Notification` va `navigator` ni o'qiydi, shuning uchun
// InterruptHost'ning "ruxsat holatini tekshirish" yo'li bepul qoldi.
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { isPlayBuild } from '../config';
// `analytics.js` bog'liqliksiz va yengil — yuqoridagi messaging SDK izohida
// tasvirlangan «eager chunk» muammosini keltirib chiqarmaydi.
import { AnalyticsEvents } from './analytics';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

let messagingInstance = null;
// SDK modulining o'zi ham keshlanadi (ikki marta yuklanmasin)
let sdkPromise = null;

function loadMessagingSdk() {
  if (!sdkPromise) sdkPromise = import('firebase/messaging');
  return sdkPromise;
}

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  try {
    const { getMessaging, isSupported } = await loadMessagingSdk();
    if (!(await isSupported())) return null;
    const { getApp } = await import('firebase/app');
    messagingInstance = getMessaging(getApp());
    return messagingInstance;
  } catch {
    return null;
  }
}

// Brauzer push'ni umuman qo'llab-quvvatlaydimi
export function pushSupported() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && !!VAPID_KEY;
}

// Joriy ruxsat holati: 'granted' | 'denied' | 'default' | 'unsupported'
export function pushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// FCM uchun alohida SW'ni ro'yxatdan o'tkazish (config query-param orqali)
async function registerSW() {
  const qs = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  });
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs.toString()}`, { scope: SW_SCOPE });
}

// ── Nega token yo'q? — holatni QAYD ETISH ────────────────────────────────
//
// ⚠️ 2026-08-19 TEKSHIRUVI: 357 hisobning HECH BIRIDA `fcmTokens` yo'q edi.
// Server tomoni sog'lom ekani tekshirildi (FCM registratsiya API loyiha
// kaliti + shu VAPID bilan token beradi), ya'ni uzilish mijozda. Lekin
// QAYERDA ekanini aytadigan hech narsa yo'q edi: `enablePush` xatoni
// `console.error` ga yozib, chaqiruvchiga esa umumiy 'error' qaytarardi;
// InterruptHost natijani UMUMAN o'qimasdi. Ya'ni butun kanal jimgina
// o'lik turardi — xuddi cron kabi (api/_shared.js `cronHeartbeat` izohi).
//
// Endi holat foydalanuvchi hujjatida turadi. Uch qiymat javobni bir
// qarashda beradi:
//   pushPerm='denied'  → ruxsat bloklangan (TWA'da bildirishnoma
//                        delegatsiyasi yoqilmagan bo'lsa hammada shunday)
//   pushPerm='default' → ruxsat SO'RALMAGAN — oyna chiqmayapti
//   pushPerm='granted' + token yo'q → getToken yiqilyapti (`pushLastError`)
//
// YOZUV NARXI ~NOL: qiymat o'zgarmasa yozilmaydi (oxirgi yozilgani shu
// qurilmaning localStorage'ida saqlanadi). Firestore kvotasi bir marta
// tugab, ilova soatlab ishlamagani uchun (2026-08-17) bu shart muhim.
const STATE_CACHE_KEY = 'iqro_push_state';

export async function recordPushState(user, patch = {}) {
  if (!user?.uid) return;
  const state = {
    pushPerm: pushPermission(),
    pushSupport: pushSupported(),
    pushIsPlayApp: isPlayBuild(),
    ...patch,
  };
  try {
    // Bir xil holat qayta-qayta yozilmasin — faqat O'ZGARISH yoziladi.
    const key = `${STATE_CACHE_KEY}:${user.uid}`;
    if (localStorage.getItem(key) === JSON.stringify(state)) return;
    await updateDoc(doc(db, 'users', user.uid), { ...state, pushStateAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    // Kuzatuv asosiy oqimni to'xtatmaydi.
    console.warn('recordPushState:', e?.message);
  }
}

/**
 * Push'ni yoqish: ruxsat so'raydi, token oladi, Firestore'ga saqlaydi.
 * Natija: { ok, reason?, detail? }
 *   reason: 'unsupported'|'no_vapid'|'denied'|'no_token'|'error'
 *   detail: xatoning HAQIQIY kodi (masalan 'messaging/token-subscribe-failed').
 *           Ilgari u faqat konsolda qolardi — ya'ni foydalanuvchida nima
 *           bo'lganini bilishning imkoni yo'q edi.
 */
export async function enablePush(user) {
  if (!user) return { ok: false, reason: 'error' };
  if (!VAPID_KEY) return { ok: false, reason: 'no_vapid' };
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    recordPushState(user, { pushLastError: 'unsupported' });
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const perm = await Notification.requestPermission();
    // Ruxsat natijasi o'lchanadi: push kanalining HAJMI retention rejasining
    // asosiy cheklovi, uni bilmasdan eslatma tizimini baholab bo'lmaydi.
    AnalyticsEvents.pushOptIn(perm);
    if (perm !== 'granted') {
      recordPushState(user, { pushLastError: `perm:${perm}` });
      return { ok: false, reason: 'denied' };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      recordPushState(user, { pushLastError: 'messaging_unsupported' });
      return { ok: false, reason: 'unsupported' };
    }

    const swReg = await registerSW();
    const { getToken } = await loadMessagingSdk();
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) {
      recordPushState(user, { pushLastError: 'no_token' });
      return { ok: false, reason: 'no_token' };
    }

    // `pushLang` — server tomonda eslatma matnini to'g'ri tilda yozish uchun
    // (api/cron-reminder.js). Boshqa joyda foydalanuvchi tili saqlanmaydi.
    let pushLang = 'uz';
    try {
      pushLang = (localStorage.getItem('i18nextLng') || 'uz').slice(0, 2);
    } catch { /* private rejim — zaxira 'uz' */ }

    // `pushIsPlay` — token Play ilovasidan ro'yxatdan o'tganmi.
    // Server (api/cron-daily.js) obuna xabarlarida Telegram manzilini
    // KO'RSATISHNI shu bayroqqa qarab hal qiladi: Play build'ga tashqi to'lov
    // kanalini yuborish anti-steering qoidasini buzadi, brauzer/sayt
    // foydalanuvchisiga esa Google'ning aloqasi yo'q.
    //
    // FAQAT `true` yoziladi, hech qachon `false` ga qaytarilmaydi: TWA va
    // Chrome bitta origin'ni bo'lishadi va ko'pincha AYNI tokenni oladi —
    // shubha bo'lsa cheklovli tomonni tanlaymiz.
    // Muvaffaqiyat — oldingi xato izi tozalanadi (aks holda hisobda eski
    // sabab qolib, kuzatuvni chalg'itardi).
    const patch = {
      fcmTokens: arrayUnion(token), pushLang,
      pushPerm: 'granted', pushLastError: null, pushStateAt: new Date().toISOString(),
    };
    if (isPlayBuild()) patch.pushIsPlay = true;
    await updateDoc(doc(db, 'users', user.uid), patch);
    localStorage.setItem('iqro_push_token', token);
    try { localStorage.removeItem(`${STATE_CACHE_KEY}:${user.uid}`); } catch { /* ignore */ }
    return { ok: true, token };
  } catch (e) {
    // `e.code` — SDK xatosining aniq nomi ('messaging/token-subscribe-failed',
    // 'messaging/permission-blocked', ...). Chaqiruvchiga ham beriladi:
    // sozlamalar sahifasi uni ekranda ko'rsatadi, ya'ni foydalanuvchi
    // aytolmasa ham sabab ma'lum bo'ladi.
    console.error('enablePush error:', e);
    const detail = String(e?.code || e?.message || 'unknown').slice(0, 120);
    recordPushState(user, { pushLastError: detail });
    return { ok: false, reason: 'error', detail };
  }
}

// Ilova ochiq turganda kelgan push'ni tinglash (foreground). onPush(payload) chaqiriladi.
export async function listenForegroundPush(onPush) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const { onMessage } = await loadMessagingSdk();
  return onMessage(messaging, (payload) => { try { onPush?.(payload); } catch { /* ignore */ } });
}
