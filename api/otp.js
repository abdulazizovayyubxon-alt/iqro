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
const MAX_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || 'toifa-otp-fallback-secret';

const CYNOX_BASE = 'https://cabinet.cynox.uz/api/index.php';

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

// ── IP bo'yicha oddiy rate limiting ──
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

function randomPassword() {
  return crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) + 'A9!';
}

function sanitizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

async function sendCynoxSms(phone, message) {
  const token = process.env.CYNOX_API_TOKEN;
  if (!token) throw new Error('CYNOX_API_TOKEN is not configured');

  // Cynox hujjatida JSON ko'rsatilgan, lekin server PHP — ba'zan form-urlencoded
  // ($_POST) kutadi. Ikkalasini ham sinaymiz: birinchisi ketsa, ikkinchisi umuman
  // yuborilmaydi (takroriy SMS bo'lmaydi).
  const variants = [
    { ct: 'application/json', body: JSON.stringify({ phone, message }) },
    { ct: 'application/x-www-form-urlencoded', body: new URLSearchParams({ phone, message }).toString() },
  ];
  let last = {};
  for (const v of variants) {
    const res = await fetch(CYNOX_BASE, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': v.ct },
      body: v.body,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.status !== false) return data;
    last = data;
  }
  throw new Error('Cynox send failed: ' + JSON.stringify(last));
}

// ── Handlers ──
async function handleSendOtp(req, res, ip) {
  const phoneRaw = (req.body && req.body.phone) || '';
  const phone = String(phoneRaw).replace(/\D/g, '');
  if (!phone.startsWith('998') || phone.length !== 12) {
    return res.status(400).json({ success: false, error: 'invalid_phone' });
  }
  // Qo'llab-quvvatlanmaydigan operatorga SMS yubormaymiz (tejamkorlik)
  if (!ALLOWED_OPERATOR_CODES.has(phone.slice(3, 5))) {
    return res.status(400).json({ success: false, error: 'unsupported_operator' });
  }

  ensureAdmin();
  const db = getFirestore();
  const auth = getAuth();
  const now = Date.now();

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

  let isNew = false;
  try {
    await auth.getUserByEmail(`${phone}@iqro.uz`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') isNew = true;
    else throw e;
  }

  // ── Haqiqiy 6 xonali kod yaratamiz va Cynox orqali yuboramiz ──
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await otpRef.set({
    hash: hashCode(phone, code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    sentCount: sentCount + 1,
    windowStart,
    lastSentAt: now,
  });

  const cynoxConfigured = !!process.env.CYNOX_API_TOKEN;
  const message = `Toifa Pro — tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`;

  if (cynoxConfigured) {
    try {
      await sendCynoxSms(phone, message);
    } catch (smsErr) {
      console.error('Cynox SMS xatosi:', smsErr.message, '| phone:', phone);
      return res.status(502).json({ success: false, error: 'sms_failed' });
    }
  } else {
    console.warn("⚠️ CYNOX_API_TOKEN env yo'q — SMS yuborilmadi. DEV kod:", code);
  }

  const response = { success: true, isNew, cooldown: RESEND_COOLDOWN_MS / 1000 };
  // Faqat Cynox sozlanmagan VA production bo'lmagan holatda kodni qaytaramiz
  if (!cynoxConfigured && process.env.NODE_ENV !== 'production') {
    response.devCode = code;
  }
  return res.status(200).json(response);
}

async function handleVerifyOtp(req, res) {
  const { phone: phoneRaw, code: codeRaw, name } = req.body || {};
  const phone = String(phoneRaw || '').replace(/\D/g, '');
  const code = String(codeRaw || '').replace(/\D/g, '');

  if (!phone.startsWith('998') || phone.length !== 12) {
    return res.status(400).json({ success: false, error: 'invalid_phone' });
  }
  if (code.length !== 6) {
    return res.status(400).json({ success: false, error: 'invalid_code' });
  }

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

  const { action } = req.query;
  try {
    if (action === 'send') {
      return await handleSendOtp(req, res, ip);
    } else if (action === 'verify') {
      return await handleVerifyOtp(req, res);
    } else {
      return res.status(400).json({ success: false, error: 'invalid_action' });
    }
  } catch (err) {
    console.error('OTP handler xatosi:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}
