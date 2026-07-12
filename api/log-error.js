/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Client xatolarini qayd etish
 *  api/log-error.js
 * ════════════════════════════════════════════════════════════
 *
 *  Client (brauzer) tomonidagi kutilmagan xatolarni Firestore
 *  `errorLogs` kolleksiyasiga yozadi — admin production'da nima
 *  sinayotganini ko'rib turishi uchun (kuzatuv/observability).
 *
 *  XAVFSIZLIK:
 *   - Client Firestore'ga TO'G'RIDAN yozmaydi — faqat shu endpoint
 *     orqali (Admin SDK). Firestore rules'da errorLogs write bloklangan.
 *   - IP bo'yicha rate-limit (buzilgan client toshqinini to'xtatadi).
 *   - IP hujjatda SAQLANMAYDI (maxfiylik) — faqat rate-limit uchun.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getDb() {
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
  return getFirestore();
}

// ── IP bo'yicha rate limiting ──
const rateLimitMap = new Map();
const RL_LIMIT = 30;              // daqiqasiga maksimal 30 (buzilgan client burst yuborishi mumkin)
const RL_WINDOW_MS = 60 * 1000;
function isRateLimited(ip) {
  const now = Date.now();
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.filter(t => now - t < RL_WINDOW_MS).length === 0) rateLimitMap.delete(k);
    }
  }
  const times = (rateLimitMap.get(ip) || []).filter(t => now - t < RL_WINDOW_MS);
  times.push(now);
  rateLimitMap.set(ip, times);
  return times.length > RL_LIMIT;
}

const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';
  if (isRateLimited(ip)) return res.status(429).json({ ok: false, error: 'too_many_requests' });

  try {
    const { message, stack, url, userAgent, uid, severity, context } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'message_required' });
    }

    const db = getDb();
    await db.collection('errorLogs').add({
      message: clip(message, 1000),
      stack: clip(stack, 4000),
      url: clip(url, 500),
      userAgent: clip(userAgent, 500),
      uid: clip(uid, 128),
      severity: ['error', 'warning', 'info'].includes(severity) ? severity : 'error',
      context: context && typeof context === 'object' ? context : null,
      resolved: false,
      createdAt: new Date().toISOString(),
      ts: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('log-error failed:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
