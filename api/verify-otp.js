/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Verify SMS OTP & issue login token
 *  api/verify-otp.js
 *
 *  Foydalanuvchi kiritgan kodni tekshiradi. To'g'ri bo'lsa:
 *   - Mavjud foydalanuvchi bo'lsa → topamiz
 *   - Yangi bo'lsa → Firebase Auth user yaratamiz (ism bilan)
 *   - Firebase Custom Token qaytaramiz → mijoz signInWithCustomToken bilan kiradi
 *
 *  Kod TO'G'RI bo'lgandagina token beriladi — bu raqam egaligini isbotlaydi.
 *  (Parol o'rniga OTP: raqamni tasdiqlash + kirish bitta oqimda.)
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

const MAX_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || 'toifa-otp-fallback-secret';

function hashCode(phone, code) {
  return crypto.createHash('sha256').update(`${phone}:${code}:${OTP_SECRET}`).digest('hex');
}

function randomPassword() {
  return crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) + 'A9!';
}

function sanitizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone: phoneRaw, code: codeRaw, name } = req.body || {};
  const phone = String(phoneRaw || '').replace(/\D/g, '');
  const code = String(codeRaw || '').replace(/\D/g, '');

  if (!phone.startsWith('998') || phone.length !== 12) {
    return res.status(400).json({ success: false, error: 'invalid_phone' });
  }
  if (code.length !== 6) {
    return res.status(400).json({ success: false, error: 'invalid_code' });
  }

  try {
    ensureAdmin();
    const db = getFirestore();
    const auth = getAuth();
    const now = Date.now();

    const otpRef = db.collection('otps').doc(phone);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return res.status(400).json({ success: false, error: 'expired' });
    }
    const otp = otpSnap.data();

    if (now > otp.expiresAt) {
      await otpRef.delete().catch(() => {});
      return res.status(400).json({ success: false, error: 'expired' });
    }
    if ((otp.attempts || 0) >= MAX_ATTEMPTS) {
      await otpRef.delete().catch(() => {});
      return res.status(429).json({ success: false, error: 'too_many' });
    }

    // ── Kodни tekshiramiz (doimiy vaqtli taqqoslash) ──
    const expected = Buffer.from(otp.hash, 'utf8');
    const provided = Buffer.from(hashCode(phone, code), 'utf8');
    const match = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);

    if (!match) {
      const attempts = (otp.attempts || 0) + 1;
      await otpRef.update({ attempts });
      return res.status(400).json({
        success: false,
        error: 'invalid',
        remaining: Math.max(0, MAX_ATTEMPTS - attempts),
      });
    }

    // ── Kod to'g'ri — bir martalik, o'chiramiz ──
    await otpRef.delete().catch(() => {});

    const email = `${phone}@iqro.uz`;
    let uid;
    let isNew = false;
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const displayName = sanitizeName(name) || 'Foydalanuvchi';
        const created = await auth.createUser({
          email,
          password: randomPassword(),
          displayName,
        });
        uid = created.uid;
        isNew = true;
      } else {
        throw e;
      }
    }

    const token = await auth.createCustomToken(uid);
    return res.status(200).json({ success: true, token, isNew });
  } catch (err) {
    console.error('verify-otp xatosi:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}
