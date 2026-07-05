/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Send SMS OTP (Eskiz.uz)
 *  api/send-otp.js
 *
 *  Telefon raqamga 6 xonali tasdiqlash kodi yuboradi.
 *  Kod Firestore'da (xeshlangan holda) qisqa muddatga saqlanadi.
 *
 *  Kerakli env o'zgaruvchilar (Vercel → Settings → Environment Variables):
 *    ESKIZ_EMAIL        — Eskiz.uz hisob emaili
 *    ESKIZ_PASSWORD     — Eskiz.uz API paroli
 *    ESKIZ_FROM         — (ixtiyoriy) tasdiqlangan sender nomi; default '4546' (test)
 *    OTP_SECRET         — (ixtiyoriy, tavsiya) kodни xeshlash uchun maxfiy kalit
 *    FIREBASE_SERVICE_ACCOUNT — allaqachon mavjud (admin SDK)
 *
 *  Eskiz kalitlari BO'LMASA — kod yuborilmaydi, lekin DEV rejimda javobda
 *  `devCode` qaytadi (faqat production EMAS). Kalitlar qo'shilishi bilan
 *  avtomatik haqiqiy SMS yuboradi — kodни o'zgartirish shart emas.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

function ensureAdmin() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString());
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
}

// ── Sozlamalar ──
const CODE_TTL_MS = 5 * 60 * 1000;        // Kod amal qilish muddati: 5 daqiqa
const RESEND_COOLDOWN_MS = 60 * 1000;     // Qayta yuborish orasidagi minimal vaqt: 60s
const MAX_SENDS_PER_HOUR = 5;             // Bir raqamga soatiga maksimal SMS
const OTP_SECRET = process.env.OTP_SECRET || 'toifa-otp-fallback-secret';

const ESKIZ_BASE = 'https://notify.eskiz.uz/api';

// ── IP bo'yicha oddiy rate limiting (SMS-bombing'ga qarshi qo'shimcha qatlam) ──
const ipHits = new Map();
const IP_LIMIT = 8;
const IP_WINDOW_MS = 60 * 1000;
function ipRateLimited(ip) {
  const now = Date.now();
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits.entries()) {
      if (v.every(t => now - t >= IP_WINDOW_MS)) ipHits.delete(k);
    }
  }
  const arr = (ipHits.get(ip) || []).filter(t => now - t < IP_WINDOW_MS);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > IP_LIMIT;
}

function hashCode(phone, code) {
  return crypto.createHash('sha256').update(`${phone}:${code}:${OTP_SECRET}`).digest('hex');
}

// ── Eskiz token (Firestore'da keshlanadi — har chaqiruvda qayta login qilmaslik uchun) ──
async function getEskizToken(db, forceRefresh = false) {
  const ref = db.collection('settings').doc('eskiz');
  if (!forceRefresh) {
    const snap = await ref.get();
    if (snap.exists && snap.data().token) return snap.data().token;
  }
  const body = new URLSearchParams();
  body.set('email', process.env.ESKIZ_EMAIL);
  body.set('password', process.env.ESKIZ_PASSWORD);
  const res = await fetch(`${ESKIZ_BASE}/auth/login`, { method: 'POST', body });
  const data = await res.json();
  const token = data?.data?.token;
  if (!token) throw new Error('Eskiz login failed: ' + JSON.stringify(data));
  await ref.set({ token, updatedAt: new Date().toISOString() }, { merge: true });
  return token;
}

async function sendEskizSms(db, phone, message) {
  const from = process.env.ESKIZ_FROM || '4546';
  const doSend = async (token) => {
    const body = new URLSearchParams();
    body.set('mobile_phone', phone);
    body.set('message', message);
    body.set('from', from);
    return fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  };

  let token = await getEskizToken(db);
  let res = await doSend(token);
  if (res.status === 401) {
    // Token eskirgan — yangilaymiz va bir marta qayta urinamiz
    token = await getEskizToken(db, true);
    res = await doSend(token);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.status !== 'waiting') {
    throw new Error('Eskiz send failed: ' + JSON.stringify(data));
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';
  if (ipRateLimited(ip)) {
    return res.status(429).json({ success: false, error: 'rate_limited' });
  }

  const phoneRaw = (req.body && req.body.phone) || '';
  const phone = String(phoneRaw).replace(/\D/g, '');
  if (!phone.startsWith('998') || phone.length !== 12) {
    return res.status(400).json({ success: false, error: 'invalid_phone' });
  }

  try {
    ensureAdmin();
    const db = getFirestore();
    const auth = getAuth();
    const now = Date.now();

    // ── Raqam bo'yicha cooldown / soatlik limit ──
    const otpRef = db.collection('otps').doc(phone);
    const otpSnap = await otpRef.get();
    const prev = otpSnap.exists ? otpSnap.data() : {};

    if (prev.lastSentAt && now - prev.lastSentAt < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (now - prev.lastSentAt)) / 1000);
      return res.status(429).json({ success: false, error: 'cooldown', retryAfter });
    }

    let windowStart = prev.windowStart || now;
    let sentCount = prev.sentCount || 0;
    if (now - windowStart > 60 * 60 * 1000) {
      windowStart = now;
      sentCount = 0;
    }
    if (sentCount >= MAX_SENDS_PER_HOUR) {
      return res.status(429).json({ success: false, error: 'too_many_sends' });
    }

    // ── Foydalanuvchi mavjudmi (ism maydonini ko'rsatish uchun) ──
    let isNew = false;
    try {
      await auth.getUserByEmail(`${phone}@iqro.uz`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') isNew = true;
      else throw e;
    }

    // ── Kod yaratamiz ──
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await otpRef.set({
      hash: hashCode(phone, code),
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      sentCount: sentCount + 1,
      windowStart,
      lastSentAt: now,
    });

    // ── SMS yuborish (Eskiz sozlangan bo'lsa) ──
    const eskizConfigured = !!(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
    const message = `Toifa Pro — tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`;

    if (eskizConfigured) {
      try {
        await sendEskizSms(db, phone, message);
      } catch (smsErr) {
        console.error('Eskiz SMS xatosi:', smsErr.message);
        return res.status(502).json({ success: false, error: 'sms_failed' });
      }
    } else {
      console.warn('⚠️ ESKIZ_* env yo\'q — SMS yuborilmadi. DEV kod:', code);
    }

    const response = { success: true, isNew, cooldown: RESEND_COOLDOWN_MS / 1000 };
    // Faqat Eskiz sozlanmagan VA production bo'lmagan holatda kodни qaytaramiz
    if (!eskizConfigured && process.env.NODE_ENV !== 'production') {
      response.devCode = code;
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error('send-otp xatosi:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}
