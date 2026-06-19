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
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

let messagingInstance = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  try {
    if (!(await isSupported())) return null;
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
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return { ok: false, reason: 'no_token' };

    await updateDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) });
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
  return onMessage(messaging, (payload) => { try { onPush?.(payload); } catch { /* ignore */ } });
}
