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

/**
 * Push'ni yoqish: ruxsat so'raydi, token oladi, Firestore'ga saqlaydi.
 * Natija: { ok, reason? } — reason: 'unsupported'|'no_vapid'|'denied'|'no_token'|'error'
 */
export async function enablePush(user) {
  if (!user) return { ok: false, reason: 'error' };
  if (!VAPID_KEY) return { ok: false, reason: 'no_vapid' };
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'denied' };

    const messaging = await getMessagingInstance();
    if (!messaging) return { ok: false, reason: 'unsupported' };

    const swReg = await registerSW();
    const { getToken } = await loadMessagingSdk();
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return { ok: false, reason: 'no_token' };

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
    const patch = { fcmTokens: arrayUnion(token), pushLang };
    if (isPlayBuild()) patch.pushIsPlay = true;
    await updateDoc(doc(db, 'users', user.uid), patch);
    localStorage.setItem('iqro_push_token', token);
    return { ok: true, token };
  } catch (e) {
    console.error('enablePush error:', e);
    return { ok: false, reason: 'error' };
  }
}

// Ilova ochiq turganda kelgan push'ni tinglash (foreground). onPush(payload) chaqiriladi.
export async function listenForegroundPush(onPush) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const { onMessage } = await loadMessagingSdk();
  return onMessage(messaging, (payload) => { try { onPush?.(payload); } catch { /* ignore */ } });
}
