/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Check if phone number is registered
 *  api/check-user.js
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getAuthAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
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
