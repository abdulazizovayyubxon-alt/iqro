/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Referral operatsiyalari
 *  api/find-referral.js
 * ════════════════════════════════════════════════════════════
 *
 *  POST { action, ... } + Authorization: Bearer <Firebase ID token>
 *
 *    action = 'my-code'         → { ok, code }   o'z referral kodini olish/yaratish
 *    action = 'link'  { code }  → { ok, referrerName, discount }
 *                                 hisobni taklif qiluvchiga ulash
 *
 *  Nega bitta fayl: Vercel Hobby rejasida serverless funksiyalar soni 12 ta.
 *  Shu sababli yangi endpoint yaratilmaydi, amallar `action` bilan ajratiladi
 *  (api/school.js dagi bilan bir xil naqsh).
 *
 *  ── AUDIT (2026-08-05) 1-BAND: KRITIK TUZATISH ───────────────
 *  AVVAL: mijoz `users/{uid}` hujjatiga `referredBy`, `referralDiscount` va
 *  `referrals/*` hujjatini O'ZI yozardi. `firestore.rules`dagi himoyalangan
 *  kalitlar ro'yxatida bu maydonlar yo'q edi (bo'lishi ham mumkin emasdi —
 *  mijoz ularni qonuniy yozardi). Natijada:
 *
 *    updateDoc(doc(db,'users',uid), { referralDiscount: 99 })
 *
 *  → payment-webhook.js kutilgan summani aynan shu maydondan hisoblaydi
 *  → narxning 1%ini to'lab to'liq premium olish mumkin edi.
 *  Bundan tashqari `referralCount`ni 0 ga qaytarib MAX_REFERRALS chegarasini,
 *  `referrals` hujjatini qo'lda yasab o'ziga-o'ziga bonus yozdirish mumkin edi.
 *
 *  ENDI: bu maydonlarga FAQAT shu endpoint (Admin SDK) yozadi va
 *  firestore.rules ularni mijoz uchun to'liq bloklaydi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { rateLimit, clientIp, extractBearer } from './_shared.js';

// Mijoz tomonidagi src/services/referral.js bilan AYNAN bir xil bo'lishi shart
const REFERRAL_DISCOUNT = 50;   // B uchun keyingi to'lovda chegirma foizi
const MAX_INVITES       = 5;    // A ning taklif chegarasi
const BONUS_INVITES     = 7;    // 5 ta do'st to'lasa chegara 7 ga ko'tariladi
const LINK_WINDOW_DAYS  = 7;    // hisob shu muddatdan yosh bo'lsa ulash mumkin

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

// ── Referral kod generatori (mijozdagi generateReferralCode bilan bir xil format) ──
// Kod SERVERDA yasaladi: avval mijoz yasab yozardi, ya'ni boshqa odamning
// kodini o'ziga yozib, uning taklif oqimini o'g'irlash mumkin edi.
function generateCode(displayName = '') {
  const prefix = (displayName || 'ZEHIN')
    .replace(/[^a-zA-ZА-Яа-я]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');
  // Faqat aniq o'qiladigan belgilar (0/O, 1/I chalkashmasligi uchun)
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return prefix + suffix;
}

// ── action: my-code ────────────────────────────────────────────────────────
async function handleMyCode(db, uid) {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return { ok: false, error: 'user_not_found' };

  const existing = snap.data().referralCode;
  if (existing) return { ok: true, code: existing };

  const displayName = snap.data().displayName || '';

  // Unikal kod topilguncha 6 marta urinamiz. Har urinishda kod bandligini
  // tekshiramiz — to'qnashuv ehtimoli 32^4 ≈ 1M da juda past.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode(displayName);
    const taken = await db.collection('users')
      .where('referralCode', '==', code).limit(1).get();
    if (!taken.empty) continue;

    await userRef.set({ referralCode: code }, { merge: true });
    return { ok: true, code };
  }
  return { ok: false, error: 'code_generation_failed' };
}

// ── action: link ───────────────────────────────────────────────────────────
async function handleLink(db, uid, body) {
  const code = (body?.code || '').toString().trim().toUpperCase();
  if (!/^[A-Z0-9]{6,16}$/.test(code)) return { ok: false, error: 'invalid_code_format' };

  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (tx) => {
    // ── Barcha O'QISHLAR yozuvlardan OLDIN (Firestore transaction talabi) ──
    const referrerQuery = db.collection('users')
      .where('referralCode', '==', code).limit(1);

    const [referrerSnap, userSnap] = await Promise.all([
      tx.get(referrerQuery),
      tx.get(userRef),
    ]);

    if (referrerSnap.empty) return { ok: false, error: 'code_not_found' };
    if (!userSnap.exists) return { ok: false, error: 'user_not_found' };

    const referrerDoc = referrerSnap.docs[0];
    const referrerId = referrerDoc.id;
    const userData = userSnap.data();

    // ── Suiiste'molga qarshi tekshiruvlar ──
    // 1. O'z-o'ziga taklif — bu bilan o'ziga chegirma va bonus yozdirish mumkin edi
    if (referrerId === uid) return { ok: false, error: 'self_referral' };

    // 2. Allaqachon ulangan — chegirmani qayta olish yo'q
    if (userData.referredBy) return { ok: false, error: 'already_referred' };

    // 3. Faqat YANGI hisob ulanadi. Aks holda yillar oldin ro'yxatdan o'tgan
    //    foydalanuvchi har to'lovdan oldin kod kiritib 50% chegirma olardi.
    const createdAtRaw = userData.createdAt;
    const createdAt = createdAtRaw?.toDate ? createdAtRaw.toDate() : (createdAtRaw ? new Date(createdAtRaw) : null);
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return { ok: false, error: 'account_age_unknown' };
    }
    const ageDays = (Date.now() - createdAt.getTime()) / 86400000;
    if (ageDays > LINK_WINDOW_DAYS) return { ok: false, error: 'account_too_old' };

    // 4. Allaqachon to'lov qilgan hisob chegirma olmaydi
    if (userData.premiumTransId) return { ok: false, error: 'already_paid' };

    // ── Taklif qiluvchining chegarasi ──
    const invitesQuery = db.collection('referrals').where('referrerId', '==', referrerId);
    const invitesSnap = await tx.get(invitesQuery);
    const total = invitesSnap.size;
    const paid = invitesSnap.docs.filter((d) => d.data().status === 'paid').length;
    const dynamicMax = paid >= MAX_INVITES ? BONUS_INVITES : MAX_INVITES;
    if (total >= dynamicMax) return { ok: false, error: 'referrer_limit_reached' };

    // ── YOZUVLAR ──
    const referrerData = referrerDoc.data();
    const nowIso = new Date().toISOString();

    tx.set(userRef, {
      referredBy: referrerId,
      referralDiscount: REFERRAL_DISCOUNT,
    }, { merge: true });

    // Deterministik hujjat ID — takroriy so'rov ikkinchi yozuv yasamaydi
    // (avval addDoc ishlatilardi: har chaqiruvda yangi hujjat paydo bo'lardi).
    const refDocRef = db.collection('referrals').doc(`${referrerId}_${uid}`);
    tx.set(refDocRef, {
      referrerId,
      referredId: uid,
      referredName: userData.displayName || '',
      referrerName: referrerData.displayName || '',
      status: 'pending',      // B to'lov qilgunicha kutish holatida
      bonusPaid: false,
      bonusAmount: 0,
      discountPercent: REFERRAL_DISCOUNT,
      createdAt: nowIso,
      paidAt: null,
    }, { merge: true });

    return {
      ok: true,
      referrerName: referrerData.displayName || '',
      discount: REFERRAL_DISCOUNT,
    };
  });
}

export default async function handler(req, res) {
  // CORS: bu endpoint FAQAT o'z ilovasi uchun — `*` olib tashlandi.
  // (Avval `Access-Control-Allow-Origin: *` + auth yo'q edi: istalgan sayt
  // referral kodlarini brute-force qilib haqiqiy ism-familiyalarni yig'a olardi.)
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // ── Auth MAJBURIY ──
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ ok: false, error: 'unauthorized' });

  // IP bo'yicha dastlabki to'siq (token tekshiruvi ham xarajat)
  if (rateLimit(`ref:ip:${clientIp(req)}`, 30).limited) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  try {
    const db = getDb();
    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Foydalanuvchi bo'yicha qattiqroq chegara — kod brute-force'ini to'xtatadi
    if (rateLimit(`ref:uid:${uid}`, 10).limited) {
      return res.status(429).json({ ok: false, error: 'too_many_requests' });
    }

    const action = (req.body?.action || '').toString();

    let result;
    if (action === 'my-code') result = await handleMyCode(db, uid);
    else if (action === 'link') result = await handleLink(db, uid, req.body);
    else result = { ok: false, error: 'unknown_action' };

    // Biznes-xatolar 200 bilan — frontend xabarni ko'rsatadi
    return res.status(200).json(result);
  } catch (err) {
    console.error('api/find-referral error:', err);
    if (err?.code === 'auth/id-token-expired' || err?.code === 'auth/argument-error') {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    // Ichki xato matni mijozga CHIQARILMAYDI (avval err.message qaytarilardi)
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
