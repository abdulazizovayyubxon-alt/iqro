/**
 * Vercel Serverless Function — Click/Payme webhook handler
 *
 * Click yoki Payme to'lov tasdiqlanganda bu endpoint chaqiriladi.
 * U Firestore'da foydalanuvchining isPremium = true qiladi.
 *
 * URL: https://your-domain.vercel.app/api/payment-webhook
 *
 * .env da quyidagilar bo'lishi kerak:
 *   CLICK_SECRET_KEY=xxx
 *   PAYME_SECRET_KEY=xxx
 *   FIREBASE_SERVICE_ACCOUNT=xxx (base64 encoded)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Firebase Admin SDK (server-side)
function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

// ── Click webhook handler ──
async function handleClick(req, res) {
  const {
    click_trans_id,
    service_id,
    merchant_trans_id, // = userId
    amount,
    action,           // 0 = prepare, 1 = complete
    sign_time,
    sign_string,
    error
  } = req.body;

  const secretKey = process.env.CLICK_SECRET_KEY;

  // 1. Imzoni tekshirish (HMAC)
  const signCheck = crypto
    .createHash('md5')
    .update(`${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`)
    .digest('hex');

  if (signCheck !== sign_string) {
    return res.status(200).json({
      error: -1,
      error_note: 'SIGN CHECK FAILED'
    });
  }

  // 2. Prepare bosqichi (action=0) — to'lovni tasdiqlash
  if (parseInt(action) === 0) {
    return res.status(200).json({
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: merchant_trans_id,
      error: 0,
      error_note: 'Success'
    });
  }

  // 3. Complete bosqichi (action=1) — isPremium = true
  if (parseInt(action) === 1) {
    if (parseInt(error) < 0) {
      return res.status(200).json({
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: merchant_trans_id,
        error: parseInt(error),
        error_note: 'Transaction cancelled'
      });
    }

    try {
      const db = getDb();
      
      const rawUserId = merchant_trans_id;
      let userId = rawUserId;
      let planId = 'lifetime';
      if (rawUserId && rawUserId.includes('__')) {
        const parts = rawUserId.split('__');
        userId = parts[0];
        planId = parts[1];
      }

      // Muddatini hisoblash
      let durationMonths = 999;
      try {
        const settingsDoc = await db.collection('settings').doc('premium').get();
        if (settingsDoc.exists) {
          const plans = settingsDoc.data().plans || [];
          const matchedPlan = plans.find(p => p.id === planId);
          if (matchedPlan) {
            durationMonths = matchedPlan.durationMonths;
          }
        }
      } catch(e) { console.error('Plan fetch error', e); }

      let expireDate = null;
      if (durationMonths && durationMonths !== 999) {
        const d = new Date();
        d.setMonth(d.getMonth() + durationMonths);
        expireDate = d.toISOString();
      }

      // Firestore'da isPremium = true
      await db.collection('users').doc(userId).update({
        isPremium: true,
        premiumSince: new Date().toISOString(),
        premiumExpire: expireDate,
        premiumPlan: planId,
        premiumMethod: 'click',
        premiumTransId: click_trans_id
      });

      return res.status(200).json({
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: merchant_trans_id,
        error: 0,
        error_note: 'Success'
      });
    } catch (err) {
      console.error('Firestore update error:', err);
      return res.status(200).json({
        error: -9,
        error_note: 'DB_ERROR'
      });
    }
  }

  return res.status(200).json({ error: -3, error_note: 'Action not found' });
}

// ── Payme webhook handler ──
async function handlePayme(req, res) {
  const { method, params, id } = req.body;

  // Basic Auth tekshirish
  const authHeader = req.headers.authorization || '';
  const expectedAuth = 'Basic ' + Buffer.from(`Paycom:${process.env.PAYME_SECRET_KEY}`).toString('base64');

  if (authHeader !== expectedAuth) {
    return res.status(200).json({
      id,
      error: { code: -32504, message: 'Auth error' }
    });
  }

  // PerformTransaction — to'lov tasdiqlandi
  if (method === 'PerformTransaction') {
    try {
      const db = getDb();
      const rawUserId = params.account?.user_id;
      let userId = rawUserId;
      let planId = 'lifetime';
      if (rawUserId && rawUserId.includes('__')) {
        const parts = rawUserId.split('__');
        userId = parts[0];
        planId = parts[1];
      }

      if (!userId) {
        return res.status(200).json({
          id,
          error: { code: -31050, message: 'User not found' }
        });
      }

      // Muddatini hisoblash
      let durationMonths = 999;
      try {
        const settingsDoc = await db.collection('settings').doc('premium').get();
        if (settingsDoc.exists) {
          const plans = settingsDoc.data().plans || [];
          const matchedPlan = plans.find(p => p.id === planId);
          if (matchedPlan) {
            durationMonths = matchedPlan.durationMonths;
          }
        }
      } catch(e) { console.error('Plan fetch error', e); }

      let expireDate = null;
      if (durationMonths && durationMonths !== 999) {
        const d = new Date();
        d.setMonth(d.getMonth() + durationMonths);
        expireDate = d.toISOString();
      }

      await db.collection('users').doc(userId).update({
        isPremium: true,
        premiumSince: new Date().toISOString(),
        premiumExpire: expireDate,
        premiumPlan: planId,
        premiumMethod: 'payme',
        premiumTransId: params.id
      });

      return res.status(200).json({
        id,
        result: {
          transaction: params.id,
          perform_time: Date.now(),
          state: 2
        }
      });
    } catch (err) {
      console.error('Firestore error:', err);
      return res.status(200).json({
        id,
        error: { code: -31008, message: 'DB error' }
      });
    }
  }

  // Boshqa Payme metodlar (CheckPerformTransaction, CheckTransaction, etc.)
  if (method === 'CheckPerformTransaction') {
    return res.status(200).json({
      id,
      result: { allow: true }
    });
  }

  return res.status(200).json({
    id,
    error: { code: -32601, message: 'Method not found' }
  });
}

// ── Asosiy handler ──
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Click yoki Payme ekanligini aniqlash
  const isPayme = req.body.method && req.body.params;

  if (isPayme) {
    return handlePayme(req, res);
  } else {
    return handleClick(req, res);
  }
}
