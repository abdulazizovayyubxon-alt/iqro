/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Click/Payme webhook handler
 *  api/payment-webhook.js
 * ════════════════════════════════════════════════════════════
 *
 *  To'lov tasdiqlanganda:
 *  1. B → isPremium = true (muddatiga qarab)
 *  2. B ning referredBy bor bo'lsa → A ga bonus beriladi
 *  3. Referral record → status: 'paid', bonusPaid: true
 *  4. A → referralBonus += 15,000
 *  5. A → referralCount += 1
 *  6. B ga eslatma uchun reminderSent = false
 *
 *  ── AUDIT (2026-08-05) BO'YICHA TUZATISHLAR ──────────────────
 *  A) CLICK_SECRET_KEY bo'sh bo'lsa imzo tekshiruvi CHETLAB O'TILARDI:
 *     `${...}${undefined}${...}` satri hisoblanib, hujumkor xuddi shu
 *     formulani takrorlab to'lovni "tasdiqlashi" mumkin edi. Endi kalit
 *     yo'q bo'lsa so'rov DARHOL rad etiladi (deny-by-default).
 *  B) Imzo taqqoslash doimiy vaqtda (safeEqual).
 *  C) `payments/{click_trans_id}` AUDIT JURNALI — har urinish (muvaffaqiyatli
 *     va xato) qayd etiladi. Avval hech qanday iz qolmasdi: "to'ladim, premium
 *     yo'q" murojaatini tekshirish va Click bilan solishtirish imkonsiz edi.
 *  D) Idempotentlik `payments` hujjati ustidagi TRANSACTION bilan — avvalgi
 *     read-then-write naqshi parallel retry'da premiumni ikki marta
 *     faollashtirib, referral bonusini ikki marta berishi mumkin edi.
 *  E) Foydalanuvchi hujjati yo'q bo'lsa `update()` NOT_FOUND tashlab, Click
 *     cheksiz retry qilardi va pul "yo'qolardi". Endi aniq xato + audit yozuvi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { safeEqual } from './_shared.js';

const REFERRAL_BONUS = 15000;   // so'm — har bir to'lagan do'st uchun
const MAX_REFERRALS  = 5;        // A maksimal 5 ta bonus olishi mumkin

// Global instance caching for serverless warm starts
let dbInstance = null;

function getDb() {
  if (!dbInstance) {
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
    dbInstance = getFirestore();
  }
  return dbInstance;
}

// ── Audit jurnali ───────────────────────────────────────────────────────
// Har bir webhook urinishi shu yerga tushadi. Bu MOLIYAVIY iz: Click
// hisobotini platforma yozuvi bilan solishtirish uchun yagona manba.
// Xatolik yozuvning o'zi asosiy oqimni to'xtatmasligi kerak.
async function logPayment(db, transId, data) {
  if (!transId) return;
  try {
    await db.collection('payments').doc(String(transId)).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('payments audit yozuvi muvaffaqiyatsiz:', err);
  }
}

// ── Referral bonusini hisoblash va berish ──
// TRANSACTION ichida: parallel retry'da bonus ikki marta berilmasligi uchun.
async function processReferralBonus(db, payingUserId) {
  try {
    const userSnap = await db.collection('users').doc(payingUserId).get();
    if (!userSnap.exists) return;

    const referrerId = userSnap.data().referredBy;
    if (!referrerId) return; // B referral orqali kelmagan

    // Referral recordini transaction'dan TASHQARIDA topamiz (query'ni
    // transaction ichida ham bajarish mumkin, lekin bu yerda bitta hujjat
    // kifoya — uni ID bo'yicha transaction ichida qayta o'qiymiz).
    const refQuery = await db.collection('referrals')
      .where('referrerId', '==', referrerId)
      .where('referredId', '==', payingUserId)
      .limit(1)
      .get();
    if (refQuery.empty) return;

    const refRef = refQuery.docs[0].ref;
    const referrerRef = db.collection('users').doc(referrerId);

    const outcome = await db.runTransaction(async (tx) => {
      const [refDoc, referrerDoc] = await Promise.all([tx.get(refRef), tx.get(referrerRef)]);
      if (!refDoc.exists || !referrerDoc.exists) return null;

      const refData = refDoc.data();
      // Bonus allaqachon berilgan — QAYTA BERILMAYDI (idempotentlik)
      if (refData.bonusPaid) return null;

      const referrerData = referrerDoc.data();
      const currentCount = referrerData.referralCount || 0;

      if (currentCount >= MAX_REFERRALS) {
        tx.update(refRef, {
          status: 'paid',
          paidAt: new Date().toISOString(),
          bonusPaid: false,
          bonusAmount: 0,
          limitReached: true,
        });
        return { limitReached: true };
      }

      const newBonusTotal = (referrerData.referralBonus || 0) + REFERRAL_BONUS;
      tx.update(referrerRef, {
        referralBonus: newBonusTotal,
        referralCount: currentCount + 1,
      });
      tx.update(refRef, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        bonusPaid: true,
        bonusAmount: REFERRAL_BONUS,
      });

      return {
        referrerId,
        newBonusTotal,
        newCount: currentCount + 1,
        referredName: refData.referredName || '',
      };
    });

    if (!outcome || outcome.limitReached) {
      if (outcome?.limitReached) {
        console.log(`Referrer ${referrerId} ${MAX_REFERRALS} ta bonus limitiga yetdi`);
      }
      return;
    }

    // Bildirishnoma — SHAXSIY subkolleksiyaga (users/{uid}/notifications).
    // MAXFIYLIK: yuqori darajadagi `notifications` hamma uchun o'qish ochiq,
    // u yerga yozilsa boshqa foydalanuvchilar do'st ismini ko'ra olardi.
    try {
      const nowIso = new Date().toISOString();
      await db.collection('users').doc(outcome.referrerId).collection('notifications').add({
        type: 'referral_bonus',
        title: '🎉 Bonus oldingiz!',
        message: `Do'stingiz (${outcome.referredName || 'do\'stingiz'}) to'lov qildi! Hisobingizga ${REFERRAL_BONUS.toLocaleString()} so'm bonus qo'shildi.`,
        bonusAmount: REFERRAL_BONUS,
        totalBonus: outcome.newBonusTotal,
        referredName: outcome.referredName,
        read: false,
        date: nowIso,
        createdAt: nowIso,
      });
    } catch (notifErr) {
      console.error('Notification yaratishda xato:', notifErr);
    }

    console.log(`✅ Referral bonus: referrer=${outcome.referrerId}, +${REFERRAL_BONUS}, count=${outcome.newCount}`);
  } catch (err) {
    console.error('processReferralBonus xatosi:', err);
    // Xatolik asosiy webhook'ni to'xtatmasin — premium allaqachon berilgan
  }
}

/**
 * Kutilgan to'lov summasini SERVER hisoblaydi — mijoz yuborgan summaga
 * hech qachon ishonilmaydi. Formula PremiumModal bilan aynan bir xil:
 *   max(0, narx*(1-chegirma%) - bonus)
 * Chegirmalar STACK qilinmaydi (referral va promo'dan eng kattasi olinadi).
 *
 * Ajratib olindi: sof funksiya → unit test bilan qoplangan
 * (src/__tests__/payment-price.test.js).
 */
export function expectedAmount(planPrice, userData = {}) {
  const referralPct = Number(userData.referralDiscount) || 0;
  const promoPct = Number(userData.promoDiscount?.percent) || 0;
  // Ishonchsiz ma'lumotdan kelgan foizni 0..100 oralig'iga qisamiz —
  // manbaga qaramay 100%dan katta chegirma summani MANFIY qilib yubormaydi.
  const discountPct = Math.min(100, Math.max(0, Math.max(referralPct, promoPct)));
  const bonus = Math.max(0, Number(userData.referralBonus) || 0);

  let expected = Number(planPrice);
  if (!Number.isFinite(expected)) return null;
  if (discountPct > 0) expected = (expected * (100 - discountPct)) / 100;
  return Math.max(0, Math.round(expected - bonus));
}

// ── To'lovni Firestorega yozish ──
// Butun jarayon TRANSACTION ichida: `payments/{transId}` hujjati bir vaqtda
// idempotentlik qulfi ham, audit yozuvi ham bo'lib xizmat qiladi.
async function activatePremium(db, rawUserId, fallbackPlanId, paymentMethod, transId, paidAmount) {
  let userId = rawUserId;
  let planId = fallbackPlanId;
  if (rawUserId && rawUserId.includes('__')) {
    const parts = rawUserId.split('__');
    userId = parts[0];
    planId = parts[1] || fallbackPlanId;
  }

  if (!userId) {
    const err = new Error('userId topilmadi');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  // Reja ma'lumoti — transaction'dan tashqarida (sozlama, kamdan-kam o'zgaradi).
  // Xato ataylab YUTILMAYDI: tashqi catch DB_ERROR qaytaradi, Click retry qiladi.
  const settingsDoc = await db.collection('settings').doc('premium').get();
  const plans = settingsDoc.exists ? (settingsDoc.data().plans || []) : [];
  const matchedPlan = plans.find((p) => p.id === planId);

  // XAVFSIZLIK: noma'lum planId'ni 999 oy (muddatsiz) premiumga aylantirmaymiz.
  // Reja topilmasa tranzaksiya RAD ETILADI — aks holda soxta planId bilan
  // abadiy premium olish va summa tekshiruvini chetlab o'tish mumkin edi.
  if (!matchedPlan) {
    const err = new Error(`PLAN_NOT_FOUND: planId=${planId}`);
    err.code = 'PLAN_NOT_FOUND';
    err.userId = userId;
    throw err;
  }

  const userRef = db.collection('users').doc(userId);
  const payRef = db.collection('payments').doc(String(transId));
  const nowIso = new Date().toISOString();

  const result = await db.runTransaction(async (tx) => {
    const [payDoc, userDoc] = await Promise.all([tx.get(payRef), tx.get(userRef)]);

    // ── Idempotentlik: shu tranzaksiya allaqachon muvaffaqiyatli qayd etilgan ──
    // Click/Payme timeout'da retry yuborishi mumkin. Parallel retry'lar ham
    // shu qulfda seriyalanadi (transaction bir hujjatga ikki marta yozmaydi).
    if (payDoc.exists && payDoc.data().status === 'success') {
      return { alreadyProcessed: true, userId };
    }

    // Foydalanuvchi hujjati yo'q → merchant_trans_id yaroqsiz.
    // AVVAL: update() NOT_FOUND tashlardi → DB_ERROR → Click cheksiz retry.
    if (!userDoc.exists) {
      const err = new Error(`USER_NOT_FOUND: uid=${userId}`);
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const userData = userDoc.data();
    const expected = expectedAmount(matchedPlan.price, userData);

    // ── Summa tekshiruvi ──
    // +1 so'm bag'rikenglik — Click tomonidagi yaxlitlash uchun.
    if (Number.isFinite(paidAmount) && paidAmount > 0 && expected != null) {
      if (paidAmount + 1 < expected) {
        const err = new Error(`AMOUNT_MISMATCH: kutilgan ${expected}, kelgan ${paidAmount}`);
        err.code = 'AMOUNT_MISMATCH';
        err.expected = expected;
        throw err;
      }
    }

    // ── Muddatni hisoblash ──
    // premiumExpire — obuna tugash vaqtining yagona manbasi. null = muddatsiz.
    // AuthContext premiumExpire o'tgach isPremium'ni false qiladi.
    const durationMonths = matchedPlan.durationMonths;
    let expireDate = null;
    if (durationMonths && durationMonths !== 999) {
      const d = new Date();
      d.setMonth(d.getMonth() + durationMonths);
      expireDate = d.toISOString();
    }

    tx.update(userRef, {
      isPremium: true,
      premiumSince: nowIso,
      premiumExpire: expireDate,
      premiumPlan: 'paid',
      premiumMethod: paymentMethod,
      premiumTransId: transId,
      reminderSent: false,
      referralDiscount: 0, // To'lovdan keyin chegirma nolga tushadi
      // Referral bonus balansi to'lovda SARFLANADI. Summa tekshiruvi bu
      // qatordan OLDIN o'qigan (expectedAmount) — tartib to'g'ri.
      referralBonus: 0,
      discountExpired: true,
      // Promo chegirma bir martalik — to'lovda sarflanadi
      promoDiscount: null,
      promoUsedOnPayment: userData.promoDiscount?.code || null,
    });

    tx.set(payRef, {
      transId: String(transId),
      provider: paymentMethod,
      uid: userId,
      planId,
      planPrice: Number(matchedPlan.price),
      expectedAmount: expected,
      paidAmount: Number.isFinite(paidAmount) ? paidAmount : null,
      durationMonths: durationMonths ?? null,
      premiumExpire: expireDate,
      status: 'success',
      createdAt: nowIso,
    }, { merge: true });

    return { alreadyProcessed: false, userId };
  });

  // Referral bonusi — premium berilgandan KEYIN, o'z transaction'ida.
  // Takroriy webhook'da qayta ishlanmaydi (bonusPaid tekshiruvi).
  if (!result.alreadyProcessed) {
    await processReferralBonus(db, result.userId);
  }

  return result.userId;
}

// ── Click webhook handler ──
async function handleClick(req, res) {
  const {
    click_trans_id, service_id, merchant_trans_id,
    merchant_prepare_id, amount, action, sign_time, sign_string, error
  } = req.body || {};

  const secretKey = process.env.CLICK_SECRET_KEY;

  // ── DENY BY DEFAULT ──
  // Kalit sozlanmagan bo'lsa imzoni HISOBLAMAYMIZ. Aks holda satrga literal
  // "undefined" tushib, uni istalgan odam takrorlab to'lov "tasdiqlashi" mumkin.
  if (!secretKey || secretKey.length < 8) {
    console.error('CLICK_SECRET_KEY sozlanmagan — webhook rad etildi');
    return res.status(200).json({ error: -1, error_note: 'SIGN CHECK FAILED' });
  }

  // Click imzoni ikki bosqichda HAR XIL formula bilan hisoblaydi:
  //   Prepare  (action=0): click_trans_id + service_id + secret + merchant_trans_id + amount + action + sign_time
  //   Complete (action=1): ... merchant_trans_id + merchant_prepare_id + amount ...
  // merchant_prepare_id qo'shilmasa, Complete imzosi DOIM mos kelmaydi.
  const signSource = parseInt(action) === 1
    ? `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`
    : `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;

  const signCheck = crypto.createHash('md5').update(signSource).digest('hex');

  // Doimiy vaqtli taqqoslash (MD5 — Click talabidan, o'zgartirilmaydi)
  if (!safeEqual(signCheck, String(sign_string || ''))) {
    return res.status(200).json({ error: -1, error_note: 'SIGN CHECK FAILED' });
  }

  const db = getDb();

  if (parseInt(action) === 0) {
    // Prepare — hech narsa faollashtirilmaydi, faqat qayd etiladi
    await logPayment(db, click_trans_id, {
      transId: String(click_trans_id || ''),
      provider: 'click',
      merchantTransId: String(merchant_trans_id || ''),
      paidAmount: Number(amount),
      status: 'prepared',
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({
      click_trans_id, merchant_trans_id,
      merchant_prepare_id: merchant_trans_id,
      error: 0, error_note: 'Success'
    });
  }

  if (parseInt(action) === 1) {
    if (parseInt(error) < 0) {
      await logPayment(db, click_trans_id, {
        status: 'cancelled',
        providerError: parseInt(error),
      });
      return res.status(200).json({
        click_trans_id, merchant_trans_id,
        merchant_confirm_id: merchant_trans_id,
        error: parseInt(error), error_note: 'Transaction cancelled'
      });
    }

    try {
      await activatePremium(db, merchant_trans_id, 'monthly', 'click', click_trans_id, Number(amount));

      return res.status(200).json({
        click_trans_id, merchant_trans_id,
        merchant_confirm_id: merchant_trans_id,
        error: 0, error_note: 'Success'
      });
    } catch (err) {
      // Har bir muvaffaqiyatsiz urinish ham AUDITGA tushadi — "to'lov o'tdi,
      // premium kelmadi" murojaatini shu yozuvsiz tekshirish imkonsiz.
      const auditBase = {
        transId: String(click_trans_id || ''),
        provider: 'click',
        merchantTransId: String(merchant_trans_id || ''),
        paidAmount: Number(amount),
        createdAt: new Date().toISOString(),
      };

      if (err.code === 'AMOUNT_MISMATCH') {
        console.warn('Click amount mismatch:', err.message);
        await logPayment(db, click_trans_id, {
          ...auditBase, status: 'failed', reason: 'amount_mismatch',
          expectedAmount: err.expected ?? null,
        });
        return res.status(200).json({
          click_trans_id, merchant_trans_id,
          error: -2, error_note: 'Incorrect parameter amount'
        });
      }
      if (err.code === 'PLAN_NOT_FOUND') {
        console.warn('Click plan not found:', err.message);
        await logPayment(db, click_trans_id, {
          ...auditBase, status: 'failed', reason: 'plan_not_found',
        });
        return res.status(200).json({
          click_trans_id, merchant_trans_id,
          error: -8, error_note: 'Plan not found'
        });
      }
      if (err.code === 'USER_NOT_FOUND') {
        // MUHIM: pul olingan, lekin uid yaroqsiz. -5 = "user does not exist",
        // Click bu holatda retry QILMAYDI va operator qo'lda hal qiladi.
        console.error('Click user not found:', err.message);
        await logPayment(db, click_trans_id, {
          ...auditBase, status: 'failed', reason: 'user_not_found',
          needsManualReview: true,
        });
        return res.status(200).json({
          click_trans_id, merchant_trans_id,
          error: -5, error_note: 'User does not exist'
        });
      }

      console.error('Click Firestore error:', err);
      await logPayment(db, click_trans_id, {
        ...auditBase, status: 'error', reason: 'db_error',
        errorMessage: String(err?.message || '').slice(0, 500),
        needsManualReview: true,
      });
      return res.status(200).json({ error: -9, error_note: 'DB_ERROR' });
    }
  }

  return res.status(200).json({ error: -3, error_note: 'Action not found' });
}

// ── Asosiy handler ──
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handleClick(req, res);
}
