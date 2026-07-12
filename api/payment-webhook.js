/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Click/Payme webhook handler
 *  api/payment-webhook.js
 * ════════════════════════════════════════════════════════════
 *
 *  YANGILIK: Referral bonus tizimi qo'shildi
 *
 *  To'lov tasdiqlanganda:
 *  1. B → isPremium = true (muddatiga qarab)
 *  2. B ning referredBy bor bo'lsa → A ga bonus beriladi
 *  3. Referral record → status: 'paid', bonusPaid: true
 *  4. A → referralBonus += 15,000
 *  5. A → referralCount += 1
 *  6. B ga eslatma uchun reminderSent = false (Cloud Scheduler tomonidan yuboriladi)
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const REFERRAL_BONUS = 15000;   // so'm — har bir to'lagan do'st uchun
const MAX_REFERRALS  = 5;        // A maksimal 5 ta bonus olishi mumkin
const REFERRAL_DISCOUNT = 50;    // 50% chegirma

// Firebase Admin SDK (server-side)
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

// ── Referral bonusini hisoblash va berish ──
async function processReferralBonus(db, payingUserId) {
  try {
    // 1. To'lovchi (B) ning referredBy ni olamiz
    const userRef = db.collection('users').doc(payingUserId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;

    const userData = userSnap.data();
    const referrerId = userData.referredBy;
    if (!referrerId) return; // B referral orqali kelmagan

    // 2. B ning referral recordini topamiz
    const refQuery = await db.collection('referrals')
      .where('referrerId', '==', referrerId)
      .where('referredId', '==', payingUserId)
      .limit(1)
      .get();

    if (refQuery.empty) return;

    const refDoc = refQuery.docs[0];
    const refData = refDoc.data();

    // Agar bonus allaqachon berilgan bo'lsa — qayta bermaymiz
    if (refData.bonusPaid) return;

    // 3. A (referrer) ning joriy bonus holatini tekshiramiz
    const referrerRef = db.collection('users').doc(referrerId);
    const referrerSnap = await referrerRef.get();
    if (!referrerSnap.exists) return;

    const referrerData = referrerSnap.data();
    const currentReferralCount = referrerData.referralCount || 0;

    // Limit tekshiruvi
    if (currentReferralCount >= MAX_REFERRALS) {
      console.log(`Referrer ${referrerId} allaqachon ${MAX_REFERRALS} ta bonus oldi — yangi bonus berilmaydi`);
      // Referral recordni yangilaymiz (bonus berilmasa ham status yangilanadi)
      await refDoc.ref.update({
        status: 'paid',
        paidAt: new Date().toISOString(),
        bonusPaid: false,
        bonusAmount: 0,
        limitReached: true
      });
      return;
    }

    // 4. A ga bonus beramiz — Firestore atomic increment
    await referrerRef.update({
      referralBonus: (referrerData.referralBonus || 0) + REFERRAL_BONUS,
      referralCount: (currentReferralCount) + 1,
    });

    // 5. Referral recordni yangilaymiz
    await refDoc.ref.update({
      status: 'paid',
      paidAt: new Date().toISOString(),
      bonusPaid: true,
      bonusAmount: REFERRAL_BONUS,
    });

    // 6. A ga notification — SHAXSIY subkolleksiyaga (users/{uid}/notifications).
    // MAXFIYLIK: avval yuqori darajadagi `notifications` kolleksiyasiga yozilardi,
    // u esa hamma uchun o'qish ochiq edi → boshqa foydalanuvchilar do'st ismini
    // (referredName) ko'ra olardi. Subkolleksiya faqat egasi/adminga ochiq.
    try {
      const nowIso = new Date().toISOString();
      await db.collection('users').doc(referrerId).collection('notifications').add({
        type: 'referral_bonus',
        title: '🎉 Bonus oldingiz!',
        message: `Do'stingiz (${refData.referredName || 'do\'stingiz'}) to'lov qildi! Hisobingizga ${REFERRAL_BONUS.toLocaleString()} so'm bonus qo'shildi.`,
        bonusAmount: REFERRAL_BONUS,
        totalBonus: (referrerData.referralBonus || 0) + REFERRAL_BONUS,
        referredName: refData.referredName || '',
        read: false,
        date: nowIso,
        createdAt: nowIso,
      });
    } catch (notifErr) {
      console.error('Notification yaratishda xato:', notifErr);
      // Xatolik bonus berilishiga ta'sir qilmasin
    }

    console.log(`✅ Referral bonus berildi: referrer=${referrerId}, amount=${REFERRAL_BONUS}, count=${currentReferralCount + 1}`);

  } catch (err) {
    console.error('processReferralBonus xatosi:', err);
    // Xatolik asosiy webhook ni to'xtatmasin
  }
}

// ── To'lovni Firestorega yozish (umumiy funksiya) ──
async function activatePremium(db, rawUserId, planId, paymentMethod, transId, paidAmount) {
  let userId = rawUserId;
  if (rawUserId && rawUserId.includes('__')) {
    const parts = rawUserId.split('__');
    userId = parts[0];
    planId = parts[1] || planId;
  }

  if (!userId) throw new Error('userId topilmadi');

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};

  // ── Idempotentlik: aynan shu tranzaksiya allaqachon qayd etilgan bo'lsa,
  // qayta faollashtirmaymiz (Click/Payme timeout'da retry yuborishi mumkin). ──
  if (transId && userData.premiumTransId === transId && userData.isPremium) {
    return userId;
  }

  // ── Reja (narx + muddat) ni settings/premium dan olamiz ──
  // XAVFSIZLIK: noma'lum planId'ni 999 oy (muddatsiz) premiumga aylantirmaymiz.
  // Reja topilmasa — tranzaksiya RAD ETILADI. Aks holda soxta/noto'g'ri planId bilan
  // abadiy premium olish va summa tekshiruvini chetlab o'tish mumkin edi.
  // settings fetch xatosi ataylab yutilmaydi — tashqi catch DB_ERROR qaytaradi, Click retry qiladi.
  const settingsDoc = await db.collection('settings').doc('premium').get();
  const plans = settingsDoc.exists ? (settingsDoc.data().plans || []) : [];
  const matchedPlan = plans.find(p => p.id === planId);
  if (!matchedPlan) {
    const err = new Error(`PLAN_NOT_FOUND: planId=${planId}`);
    err.code = 'PLAN_NOT_FOUND';
    throw err;
  }
  const durationMonths = matchedPlan.durationMonths;
  const planPrice = Number(matchedPlan.price);

  // ── Summa tekshiruvi ──
  // Kutilgan narxni SERVER hisoblaydi — mijoz yuborgan summaga ishonmaymiz.
  // Formula PremiumModal bilan aynan bir xil: max(0, narx*(1-chegirma%) - bonus).
  // Chegirmalar STACK qilinmaydi (referral va promo'dan eng kattasi olinadi).
  if (Number.isFinite(paidAmount) && paidAmount > 0 && planPrice != null && !Number.isNaN(planPrice)) {
    const referralPct = userData.referralDiscount || 0;
    const promoPct = userData.promoDiscount?.percent || 0;
    const discountPct = Math.max(referralPct, promoPct);
    const bonus = userData.referralBonus || 0;
    let expected = planPrice;
    if (discountPct > 0) expected = expected * (100 - discountPct) / 100;
    expected = Math.max(0, Math.round(expected - bonus));
    if (paidAmount + 1 < expected) {
      const err = new Error(`AMOUNT_MISMATCH: kutilgan ${expected}, kelgan ${paidAmount}`);
      err.code = 'AMOUNT_MISMATCH';
      throw err;
    }
  }

  // ── Muddatni hisoblash ──
  // premiumExpire — obuna tugash vaqtining yagona manbasi. null bo'lsa muddatsiz.
  // AuthContext premiumExpire o'tgach isPremium'ni false qiladi (premiumPlan'dan qat'i nazar).
  let expireDate = null;
  if (durationMonths && durationMonths !== 999) {
    const d = new Date();
    d.setMonth(d.getMonth() + durationMonths);
    expireDate = d.toISOString();
  }

  const updateData = {
    isPremium: true,
    premiumSince: new Date().toISOString(),
    premiumExpire: expireDate,
    premiumPlan: 'paid',
    premiumMethod: paymentMethod,
    premiumTransId: transId,
    reminderSent: false,
    referralDiscount: 0, // To'lovdan keyin chegirma nolga tushadi
    // Referral bonus balansi to'lovda SARFLANADI — nolga tushiriladi. Aks holda
    // (avvalgi holat) PremiumModal narxdan ayirgan bonus balansda qolib, qayta-qayta
    // ishlatilishi mumkin edi. Summa tekshiruvi bu qatordan OLDIN o'qigan, order to'g'ri.
    referralBonus: 0,
    discountExpired: true,
    // Promo chegirma bir martalik — to'lovda sarflanadi
    promoDiscount: null,
    promoUsedOnPayment: userData.promoDiscount?.code || null,
  };

  await userRef.update(updateData);

  // Referral bonusini hisoblaymiz (A ga bonus)
  await processReferralBonus(db, userId);

  return userId;
}

// ── Click webhook handler ──
async function handleClick(req, res) {
  const {
    click_trans_id, service_id, merchant_trans_id,
    merchant_prepare_id, amount, action, sign_time, sign_string, error
  } = req.body;

  const secretKey = process.env.CLICK_SECRET_KEY;

  // Click imzoni ikki bosqichda HAR XIL formula bilan hisoblaydi:
  //   Prepare  (action=0): click_trans_id + service_id + secret + merchant_trans_id + amount + action + sign_time
  //   Complete (action=1): ... merchant_trans_id + merchant_prepare_id + amount ...
  // merchant_prepare_id qo'shilmasa, Complete imzosi DOIM mos kelmaydi va to'lov yakunlanmaydi.
  const signSource = parseInt(action) === 1
    ? `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`
    : `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;

  const signCheck = crypto.createHash('md5').update(signSource).digest('hex');

  if (signCheck !== sign_string) {
    return res.status(200).json({ error: -1, error_note: 'SIGN CHECK FAILED' });
  }

  if (parseInt(action) === 0) {
    return res.status(200).json({
      click_trans_id, merchant_trans_id,
      merchant_prepare_id: merchant_trans_id,
      error: 0, error_note: 'Success'
    });
  }

  if (parseInt(action) === 1) {
    if (parseInt(error) < 0) {
      return res.status(200).json({
        click_trans_id, merchant_trans_id,
        merchant_confirm_id: merchant_trans_id,
        error: parseInt(error), error_note: 'Transaction cancelled'
      });
    }

    try {
      const db = getDb();
      await activatePremium(db, merchant_trans_id, 'monthly', 'click', click_trans_id, Number(amount));

      return res.status(200).json({
        click_trans_id, merchant_trans_id,
        merchant_confirm_id: merchant_trans_id,
        error: 0, error_note: 'Success'
      });
    } catch (err) {
      if (err.code === 'AMOUNT_MISMATCH') {
        console.warn('Click amount mismatch:', err.message);
        return res.status(200).json({
          click_trans_id, merchant_trans_id,
          error: -2, error_note: 'Incorrect parameter amount'
        });
      }
      if (err.code === 'PLAN_NOT_FOUND') {
        console.warn('Click plan not found:', err.message);
        return res.status(200).json({
          click_trans_id, merchant_trans_id,
          error: -8, error_note: 'Plan not found'
        });
      }
      console.error('Click Firestore error:', err);
      return res.status(200).json({ error: -9, error_note: 'DB_ERROR' });
    }
  }

  return res.status(200).json({ error: -3, error_note: 'Action not found' });
}

// ── Payme webhook handler ──
async function handlePayme(req, res) {
  const { method, params, id } = req.body;

  // XAVFSIZLIK: PAYME_SECRET_KEY sozlanmagan bo'lsa — Payme YOQILMAGAN, hamma so'rov rad etiladi.
  // Aks holda imzo `Paycom:undefined` bo'yicha hisoblanib, hujumchi uni soxtalashtirib
  // to'lovsiz premium olishi mumkin edi.
  if (!process.env.PAYME_SECRET_KEY) {
    return res.status(200).json({ id, error: { code: -32504, message: 'Auth error' } });
  }

  const authHeader = req.headers.authorization || '';
  const expectedAuth = 'Basic ' + Buffer.from(`Paycom:${process.env.PAYME_SECRET_KEY}`).toString('base64');

  if (authHeader !== expectedAuth) {
    return res.status(200).json({
      id, error: { code: -32504, message: 'Auth error' }
    });
  }

  if (method === 'PerformTransaction') {
    try {
      const db = getDb();
      const rawUserId = params.account?.user_id;
      await activatePremium(db, rawUserId, 'monthly', 'payme', params.id);

      return res.status(200).json({
        id,
        result: { transaction: params.id, perform_time: Date.now(), state: 2 }
      });
    } catch (err) {
      console.error('Payme Firestore error:', err);
      return res.status(200).json({
        id, error: { code: -31008, message: 'DB error' }
      });
    }
  }

  if (method === 'CheckPerformTransaction') {
    return res.status(200).json({ id, result: { allow: true } });
  }

  return res.status(200).json({
    id, error: { code: -32601, message: 'Method not found' }
  });
}

// ── Asosiy handler ──
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const isPayme = req.body.method && req.body.params;
  if (isPayme) return handlePayme(req, res);
  return handleClick(req, res);
}

