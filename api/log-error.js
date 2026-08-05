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
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { rateLimit, clientIp, clip, clampObject } from './_shared.js';

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  // ── AUDIT 2026-08-05, 6-BAND ──
  // Avval: auth YO'Q, `context` cheklanmagan obyekt (Vercel body chegarasigacha
  // ~4.5MB), `uid` esa MIJOZDAN olinardi. Ya'ni istalgan odam Firestore yozuv
  // kvotasini (loyihaning asosiy xavfi) arzon narxda tugatishi va jurnalni
  // boshqa foydalanuvchi nomiga yozishi mumkin edi.
  //
  // ENDI:
  //  · `uid` FAQAT tekshirilgan tokendan olinadi (mijoz aytganidan emas)
  //  · `context` hajmi qisiladi (clampObject)
  //  · ishonchli IP ajratish + ikki darajali chegara
  //
  // NEGA token MAJBURIY EMAS: kuzatuvning eng qimmatli qismi — tizimga
  // kirishdan OLDIN (splash/login ekranida) yuz bergan crash'lar. Token o'sha
  // paytda hali yo'q. Bundan tashqari sentry.js `navigator.sendBeacon`
  // ishlatadi — u sarlavha yubora OLMAYDI, shuning uchun token BODY'da keladi.
  // Tokensiz so'rov qabul qilinadi, lekin chegarasi ancha qattiq.
  const ip = clientIp(req);

  try {
    const db = getDb();

    const { message, stack, url, userAgent, severity, context, idToken } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'message_required' });
    }

    // Token bo'lsa tekshiramiz; bo'lmasa anonim log (uid: null)
    let uid = null;
    if (typeof idToken === 'string' && idToken.length > 20) {
      try {
        uid = (await getAuth().verifyIdToken(idToken)).uid;
      } catch {
        uid = null; // yaroqsiz token — anonim sifatida davom etadi
      }
    }

    // Anonim yo'nak SEZILARLI qattiqroq: kvota hujumining asosiy vektori shu.
    const limited = uid
      ? rateLimit(`log:uid:${uid}`, 20).limited
      : rateLimit(`log:anon:${ip}`, 5).limited;
    if (limited) return res.status(429).json({ ok: false, error: 'too_many_requests' });

    await db.collection('errorLogs').add({
      message: clip(message, 1000),
      stack: clip(stack, 4000),
      url: clip(url, 500),
      userAgent: clip(userAgent, 500),
      uid,                                  // TOKENDAN — mijoz yuborgani emas
      severity: ['error', 'warning', 'info'].includes(severity) ? severity : 'error',
      context: clampObject(context, 2000),  // hajmi cheklangan
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
