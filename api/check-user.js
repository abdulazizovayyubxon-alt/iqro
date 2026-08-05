/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Check if phone number is registered
 *  api/check-user.js
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { rateLimit, clientIp } from './_shared.js';

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    if (getApps().length === 0) {
      let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountStr);
      } catch (e) {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
      }
      initializeApp({ credential: cert(serviceAccount) });
    }
    dbInstance = getFirestore();
  }
  return dbInstance;
}

function getAuthAdmin() {
  if (getApps().length === 0) {
    getDb();
  }
  return getAuth();
}

export default async function handler(req, res) {
  // ── AUDIT 2026-08-05, 8-BAND ──
  // Bu endpoint TELEFON RAQAMLARINI SANAB CHIQISH oynasi (enumeration oracle):
  // `{exists: true|false}` javobi platformada kim borligini oshkor qiladi (PII).
  // Endpoint progressiv login UX uchun ZARUR, shuning uchun butunlay yopilmadi,
  // lekin quyidagilar tuzatildi:
  //
  //  · `Access-Control-Allow-Origin: '*'` OLIB TASHLANDI — istalgan saytdan
  //    brauzer orqali so'rov yuborish yo'li yopildi. (`credentials: true` bilan
  //    `*` birga umuman yaroqsiz kombinatsiya ham edi.)
  //  · Rate-limit ishonchli IP ajratish bilan: avval xom `x-forwarded-for`
  //    kalit sifatida ishlatilardi — mijoz o'zi header qo'shib har so'rovda
  //    boshqa qiymat yuborib chegarani chetlab o'tishi mumkin edi.
  //  · Telefon formati qat'iy tekshiriladi (avval istalgan satr qabul qilinardi).
  //  · Ichki xato matni (err.message) mijozga chiqarilmaydi.
  //
  // ⚠️ QOLGAN XAVF: taqsimlangan/IP aylantiruvchi hujum. To'liq yechim —
  // Firebase App Check (keyingi bosqich, _shared.js izohiga qarang).
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimit(`chk:${clientIp(req)}`, 15).limited) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const cleanPhone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const email = `${cleanPhone}@iqro.uz`;

  try {
    const authAdmin = getAuthAdmin();
    // Firebase auth da ushbu email borligini tekshiramiz
    await authAdmin.getUserByEmail(email);
    return res.status(200).json({ exists: true });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      return res.status(200).json({ exists: false });
    }
    console.error('Check user error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

