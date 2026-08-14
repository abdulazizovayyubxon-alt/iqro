/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Hamkor (Ustoz/Partner) operatsiyalari
 *  api/partner.js
 * ════════════════════════════════════════════════════════════
 *
 *  POST { action: 'stats', partnerCode } + Authorization: Bearer <Firebase ID token>
 *
 *  XAVFSIZLIK:
 *    - Hamkor FAQAT o'ziga biriktirilgan promo-kod statistikasini ko'ra oladi.
 *    - Platforma adminlari barcha hamkor kodlarini ko'rish huquqiga ega.
 *    - Foydalanuvchilarning shaxsiy sirlari, xato javob tafsilotlari yoki
 *      begona fan ma'lumotlari oshkor qilinmaydi — faqat jamlangan ko'rsatkichlar.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { rateLimit, clientIp } from './_shared.js';

const PLATFORM_ADMIN_EMAILS = [
  'abdulazizovayyubxon@gmail.com',
  '998999154686@iqro.uz',
];

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

const isPlatformAdmin = async (db, decoded) => {
  if (decoded.email && PLATFORM_ADMIN_EMAILS.includes(decoded.email)) return true;
  const snap = await db.collection('users').doc(decoded.uid).get();
  return snap.exists && snap.data().role === 'admin';
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Rate limit: daqiqasiga 30 so'rov
  const ip = clientIp(req);
  const rl = rateLimit(`partner:${ip}`, 30, 60_000);
  if (rl.limited) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  // Auth: Bearer ID token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const db = getDb();
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const action = req.body?.action || 'stats';

    if (action === 'stats') {
      let requestedCode = (req.body?.partnerCode || '').toString().trim().toUpperCase();

      const userSnap = await db.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const isAdminUser = await isPlatformAdmin(db, decoded);

      // Agar kod berilmagan bo'lsa, foydalanuvchining o'z partnerCode'ini qidiramiz
      if (!requestedCode) {
        if (userData.partnerCode) {
          requestedCode = userData.partnerCode.toUpperCase();
        } else {
          // PromoCodes'dan partnerUid == uid bo'yicha qidirish
          const found = await db.collection('promoCodes').where('partnerUid', '==', uid).limit(1).get();
          if (!found.empty) {
            requestedCode = found.docs[0].id;
          }
        }
      }

      if (!requestedCode) {
        return res.status(400).json({ ok: false, error: 'no_partner_code_found' });
      }

      const promoRef = db.collection('promoCodes').doc(requestedCode);
      const promoSnap = await promoRef.get();

      if (!promoSnap.exists) {
        return res.status(404).json({ ok: false, error: 'promo_not_found' });
      }

      const promo = promoSnap.data();

      // Huquq tekshiruvi: faqat platforma admini YOKI ushbu kodning hamkori
      const isAssignedPartner =
        promo.partnerUid === uid ||
        promo.createdBy === uid ||
        (decoded.email && promo.partnerEmail === decoded.email) ||
        userData.partnerCode === requestedCode;

      if (!isAdminUser && !isAssignedPartner) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      // Redemptions subkolleksiyasini o'qish
      const redemptionsSnap = await promoRef.collection('redemptions').get();
      const redemptions = redemptionsSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      if (redemptions.length === 0) {
        return res.status(200).json({
          ok: true,
          promo: {
            code: promo.code || requestedCode,
            campaign: promo.campaign || 'Hamkorlik dasturi',
            partnerName: promo.partnerName || userData.displayName || 'Hamkor ustoz',
            type: promo.type,
            value: promo.value,
            maxUses: promo.maxUses || 0,
            usedCount: promo.usedCount || 0,
            expiresAt: promo.expiresAt || null,
            active: promo.active !== false,
          },
          summary: {
            totalMembers: 0,
            active7d: 0,
            totalAnswered: 0,
            avgAccuracy: null,
            avgReadiness: null,
          },
          members: [],
        });
      }

      // Foydalanuvchilar statistikasi va profillarini partiyalab olish
      const statsByUid = {};
      const usersByUid = {};

      for (let i = 0; i < redemptions.length; i += 300) {
        const batchUids = redemptions.slice(i, i + 300);
        const statRefs = batchUids.map(r => db.collection('userStats').doc(r.uid));
        const userRefs = batchUids.map(r => db.collection('users').doc(r.uid));

        const [statDocs, userDocs] = await Promise.all([
          db.getAll(...statRefs),
          db.getAll(...userRefs),
        ]);

        statDocs.forEach(d => { if (d.exists) statsByUid[d.id] = d.data(); });
        userDocs.forEach(d => { if (d.exists) usersByUid[d.id] = d.data(); });
      }

      // Har bir a'zo uchun xavfsiz hisobot shakllantirish
      const members = redemptions.map(r => {
        const u = usersByUid[r.uid] || {};
        const s = statsByUid[r.uid] || {};

        const cats = s.stats || {};
        const answered = Object.values(cats).reduce((sum, c) => sum + (c?.totalAnswered || 0), 0);
        const correct = Object.values(cats).reduce((sum, c) => sum + (c?.totalCorrect || 0), 0);

        // CHQBT fani bo'yicha ko'rsatkichlar
        const chqbtCat = cats.chqbt || {};
        const chqbtAns = chqbtCat.totalAnswered || 0;
        const chqbtCor = chqbtCat.totalCorrect || 0;
        const chqbtAcc = chqbtAns > 0 ? Math.round((chqbtCor / chqbtAns) * 100) : null;

        const readinessMap = s.readiness || {};
        const latestReadiness = Object.entries(readinessMap)
          .sort((a, b) => (b[1]?.updatedAt || '').localeCompare(a[1]?.updatedAt || ''))[0];

        const lastActive = s.lastActiveAt || latestReadiness?.[1]?.updatedAt || r.redeemedAt || null;

        return {
          uid: r.uid,
          displayName: u.displayName || r.displayName || 'Ustoz',
          shortId: u.shortId || null,
          photoURL: u.photoURL || null,
          redeemedAt: r.redeemedAt || null,
          answered,
          accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
          chqbtAnswered: chqbtAns,
          chqbtAccuracy: chqbtAcc,
          readiness: latestReadiness?.[1]?.score ?? null,
          readinessSubject: latestReadiness?.[0] ?? null,
          dailyStreak: s.dailyStreak || 0,
          lastActiveAt: lastActive,
        };
      });

      // Jamlanma ko'rsatkichlar
      const withReadiness = members.filter(m => typeof m.readiness === 'number');
      const withAccuracy = members.filter(m => typeof m.accuracy === 'number');
      const withChqbtAcc = members.filter(m => typeof m.chqbtAccuracy === 'number');

      const now = Date.now();
      const active7dCount = members.filter(m => {
        if (!m.lastActiveAt) return false;
        return now - new Date(m.lastActiveAt).getTime() < 7 * 86400000;
      }).length;

      const summary = {
        totalMembers: members.length,
        active7d: active7dCount,
        totalAnswered: members.reduce((sum, m) => sum + (m.answered || 0), 0),
        avgAccuracy: withAccuracy.length
          ? Math.round(withAccuracy.reduce((sum, m) => sum + m.accuracy, 0) / withAccuracy.length)
          : null,
        avgReadiness: withReadiness.length
          ? Math.round(withReadiness.reduce((sum, m) => sum + m.readiness, 0) / withReadiness.length)
          : null,
        chqbtTotalAnswered: members.reduce((sum, m) => sum + (m.chqbtAnswered || 0), 0),
        chqbtAvgAccuracy: withChqbtAcc.length
          ? Math.round(withChqbtAcc.reduce((sum, m) => sum + m.chqbtAccuracy, 0) / withChqbtAcc.length)
          : null,
      };

      // Tartiblash: oxirgi faol bo'lganlar yuqorida
      members.sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));

      return res.status(200).json({
        ok: true,
        promo: {
          code: promo.code || requestedCode,
          campaign: promo.campaign || 'Hamkorlik dasturi',
          partnerName: promo.partnerName || userData.displayName || 'Hamkor ustoz',
          type: promo.type,
          value: promo.value,
          maxUses: promo.maxUses || 0,
          usedCount: promo.usedCount || members.length,
          expiresAt: promo.expiresAt || null,
          active: promo.active !== false,
        },
        summary,
        members,
      });
    }

    return res.status(400).json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error('partner api error:', err);
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
