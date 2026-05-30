/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Check if phone number is registered
 *  api/check-user.js
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

function getAuthAdmin() {
  if (getApps().length === 0) {
    getDb();
  }
  return getAuth();
}

// In-memory rate limiting map
const rateLimitMap = new Map();
const LIMIT = 15; // Max 15 requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(ip) {
  const now = Date.now();
  
  // Clean up memory if it grows too large (> 5000 IPs)
  if (rateLimitMap.size > 5000) {
    for (const [key, value] of rateLimitMap.entries()) {
      const active = value.filter(t => now - t < WINDOW_MS);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
  }
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [now]);
    return false;
  }
  
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < WINDOW_MS);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return timestamps.length > LIMIT;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
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
    return res.status(500).json({ error: err.message });
  }
}

