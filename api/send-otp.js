/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Send SMS OTP (Cynox.uz)
 *  api/send-otp.js
 *
 *  Telefon raqamga 6 xonali tasdiqlash kodi yuboradi.
 *  Kod Firestore'da (xeshlangan holda) qisqa muddatga saqlanadi.
 *
 *  Kerakli env o'zgaruvchilar (Vercel → Settings → Environment Variables):
 *    CYNOX_API_TOKEN    — Cynox.uz API Bearer Token
 *    OTP_SECRET         — (ixtiyoriy, tavsiya) kodni xeshlash uchun maxfiy kalit
 *    FIREBASE_SERVICE_ACCOUNT — allaqachon mavjud (admin SDK)
 *
 *  Cynox kaliti BO'LMASA — kod yuborilmaydi, lekin DEV rejimda javobda
 *  `devCode` qaytadi (faqat production EMAS). Kalit qo'shilishi bilan
 *  avtomatik haqiqiy SMS yuboradi — kodni o'zgartirish shart emas.
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
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // Qayta yuborish orasidagi minimal vaqt: 2 daqiqa
const MAX_SENDS_PER_HOUR = 5;             // Bir raqamga soatiga maksimal SMS
const OTP_SECRET = process.env.OTP_SECRET || 'toifa-otp-fallback-secret';

const CYNOX_BASE = 'https://cabinet.cynox.uz/api/';

// ── Cynox qamrovidagi operatorlar (998'dan keyingi 2 xonali kod) ──
// Faqat shu kodlar bilan boshlanuvchi raqamlarga SMS yuboriladi — qolganiga yo'q (tejamkorlik).
const ALLOWED_OPERATOR_CODES = new Set([
  '97', '88', '87',        // Mobiuz
  '93', '94', '50',        // Ucell
  '33',                    // Humans
  '98', '80',              // Perfectum
  '90', '91', '92',        // Beeline
  '99', '77', '70', '95',  // Uzmobile
  '20',                    // OQ
]);

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

async function sendCynoxSms(phone, message) {
  const token = process.env.CYNOX_API_TOKEN;
  if (!token) throw new Error('CYNOX_API_TOKEN is not configured');

  const res = await fetch(CYNOX_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone, message })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error('Cynox send failed: ' + JSON.stringify(data));
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
  // Qo'llab-quvvatlanmaydigan operatorga SMS yubormaymiz (tejamkorlik)
  if (!ALLOWED_OPERATOR_CODES.has(phone.slice(3, 5))) {
    return res.status(400).json({ success: false, error: 'unsupported_operator' });
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

    // ── SMS yuborish (Cynox sozlangan bo'lsa) ──
    const cynoxConfigured = !!process.env.CYNOX_API_TOKEN;
    const message = `Toifa Pro — tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`;

    if (cynoxConfigured) {
      try {
        await sendCynoxSms(phone, message);
      } catch (smsErr) {
        console.error('Cynox SMS xatosi:', smsErr.message);
        return res.status(502).json({ success: false, error: 'sms_failed' });
      }
    } else {
      console.warn('⚠️ CYNOX_API_TOKEN env yo\'q — SMS yuborilmadi. DEV kod:', code);
    }

    const response = { success: true, isNew, cooldown: RESEND_COOLDOWN_MS / 1000 };
    // Faqat Cynox sozlanmagan VA production bo'lmagan holatda kodni qaytaramiz
    if (!cynoxConfigured && process.env.NODE_ENV !== 'production') {
      response.devCode = code;
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error('send-otp xatosi:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}
