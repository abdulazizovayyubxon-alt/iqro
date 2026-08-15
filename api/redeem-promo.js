/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Promo-kod redemption
 *  api/redeem-promo.js
 * ════════════════════════════════════════════════════════════
 *
 *  POST { code } + Authorization: Bearer <Firebase ID token>
 *  POST { action: 'info', code } → kodni FAOLLASHTIRMASDAN tanishtirish
 *       ma'lumoti (hamkor havolasidagi tasdiq kartasi uchun). Alohida
 *       endpoint ochilmadi: Vercel Hobby rejasida `api/` aynan 12 funksiya
 *       chegarasida turibdi (`_` bilan boshlanuvchilar sanalmaydi).
 *
 *  promoCodes/{CODE} hujjati (doc ID = katta harfli kod):
 *    { code, type: 'percent'|'days'|'team', value, maxUses,
 *      usedCount, usedBy: [uid], expiresAt: ISO|null,
 *      campaign, active, createdAt, createdBy }
 *
 *  Ta'sir:
 *    percent      → users/{uid}.promoDiscount = { code, percent, appliedAt }
 *                   (keyingi to'lovda qo'llanadi, webhook tozalaydi)
 *    days | team  → premiumExpire darhol +value kun uzaytiriladi
 *
 *  XAVFSIZLIK: butun jarayon TRANSACTION ichida — bir kodni parallel
 *  so'rovlar bilan ikki marta ishlatib bo'lmaydi. Mijoz hisoblagan
 *  narxga hech qachon ishonilmaydi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // ── Auth: Firebase ID token ──
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const rawCode = (req.body?.code || '').toString().trim().toUpperCase();
  if (!rawCode || rawCode.length < 3 || rawCode.length > 32 || !/^[A-Z0-9_-]+$/.test(rawCode)) {
    return res.status(400).json({ ok: false, error: 'invalid_code_format' });
  }

  try {
    const db = getDb();
    const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const uid = decoded.uid;

    const promoRef = db.collection('promoCodes').doc(rawCode);
    const userRef = db.collection('users').doc(uid);
    // ── AUDIT 2026-08-05, 15-BAND ──
    // Avval kim ishlatgani `usedBy` MASSIVIGA arrayUnion bilan qo'shilardi.
    // Ommaviy kampaniya kodida (maxUses katta) massiv Firestore'ning 1MB hujjat
    // chegarasiga urilib, kod QAYTARILMAS holda ishdan chiqardi (~25-30k uid).
    // Endi har foydalanuvchi alohida hujjat: hajm cheklovi yo'q, tekshiruv esa
    // massiv bo'ylab qidirish emas, bitta hujjat o'qishga aylandi (tezroq ham).
    const redemptionRef = promoRef.collection('redemptions').doc(uid);

    // ── action:'info' — faqat O'QISH, hech narsa yozilmaydi ──
    // Hamkor havolasi (`?promo=KOD`) bilan kelgan foydalanuvchiga «falon
    // ustoz guruhiga qo'shilasizmi?» kartasini ko'rsatish uchun ustoz ismi
    // kerak. `promoCodes` esa firestore.rules'da faqat adminga o'qish uchun
    // ochiq, shuning uchun ism SHU YERDAN beriladi.
    // Faqat xavfsiz maydonlar qaytadi: `maxUses`, `usedBy`, `createdBy` kabi
    // ichki ma'lumot mijozga chiqmaydi.
    if (req.body?.action === 'info') {
      const [promoSnap, redemptionSnap] = await Promise.all([
        promoRef.get(),
        redemptionRef.get(),
      ]);
      if (!promoSnap.exists) return res.status(200).json({ ok: false, error: 'not_found' });

      const p = promoSnap.data();
      const expired = !!(p.expiresAt && new Date(p.expiresAt) < new Date());
      const limitReached = (p.usedCount || 0) >= (p.maxUses || 1);

      return res.status(200).json({
        ok: true,
        code: rawCode,
        partnerName: p.partnerName || null,
        campaign: p.campaign || null,
        type: p.type || null,
        value: Number(p.value) || 0,
        // Kod allaqachon ishlatilgan bo'lsa karta ko'rsatilmaydi — aks holda
        // «Qo'shilaman» bosilib, `already_used` xatosiga urilardi.
        alreadyUsed: redemptionSnap.exists || (p.usedBy || []).includes(uid),
        usable: p.active !== false && !expired && !limitReached,
      });
    }

    const result = await db.runTransaction(async (tx) => {
      const [promoSnap, userSnap, redemptionSnap] = await Promise.all([
        tx.get(promoRef), tx.get(userRef), tx.get(redemptionRef),
      ]);

      if (!promoSnap.exists) return { ok: false, error: 'not_found' };
      const promo = promoSnap.data();

      if (promo.active === false) return { ok: false, error: 'inactive' };
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { ok: false, error: 'expired' };
      if ((promo.usedCount || 0) >= (promo.maxUses || 1)) return { ok: false, error: 'limit_reached' };
      // Yangi subkolleksiya VA eski `usedBy` massivi — ikkalasi ham tekshiriladi
      // (migratsiyagacha yozilgan kodlar ishlashda davom etsin).
      if (redemptionSnap.exists) return { ok: false, error: 'already_used' };
      if ((promo.usedBy || []).includes(uid)) return { ok: false, error: 'already_used' };

      const userData = userSnap.exists ? userSnap.data() : {};

      const type = promo.type;
      const value = Number(promo.value) || 0;
      if (value <= 0) return { ok: false, error: 'invalid_promo' };

      if (type === 'percent') {
        if (value > 100) return { ok: false, error: 'invalid_promo' };
        // Bir vaqtda faqat bitta kutilayotgan promo chegirma
        if (userData.promoDiscount?.percent > 0) return { ok: false, error: 'pending_discount_exists' };
        tx.set(userRef, {
          promoDiscount: { code: rawCode, percent: value, appliedAt: new Date().toISOString() },
        }, { merge: true });
      } else if (type === 'days' || type === 'team') {
        if (value > 3660) return { ok: false, error: 'invalid_promo' };
        // premiumExpire ni max(hozir, joriy muddat) dan boshlab uzaytirish
        const now = new Date();
        const currentExpire = userData.premiumExpire ? new Date(userData.premiumExpire) : null;
        const baseDate = currentExpire && currentExpire > now ? currentExpire : now;
        const newExpire = new Date(baseDate.getTime() + value * 86400000);
        tx.set(userRef, {
          isPremium: true,
          premiumExpire: newExpire.toISOString(),
          premiumPlan: 'paid', // AuthContext expire-check bilan mos (webhook bilan bir xil)
          premiumMethod: type === 'team' ? 'promo_team' : 'promo',
          premiumSince: userData.premiumSince || now.toISOString(),
          promoRedeemed: { code: rawCode, days: value, at: now.toISOString(), campaign: promo.campaign || null },
        }, { merge: true });
      } else {
        return { ok: false, error: 'invalid_promo' };
      }

      tx.update(promoRef, {
        usedCount: FieldValue.increment(1),
        lastUsedAt: new Date().toISOString(),
      });

      // Kim ishlatgani — alohida hujjat (massiv o'rniga, 15-band)
      tx.set(redemptionRef, {
        uid,
        displayName: userData.displayName || null,
        type,
        value,
        redeemedAt: new Date().toISOString(),
      });

      return { ok: true, type, value, campaign: promo.campaign || null };
    });

    if (!result.ok) {
      return res.status(200).json(result); // biznes-xato — 200 bilan, frontend xabarni ko'rsatadi
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('redeem-promo error:', err);
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
