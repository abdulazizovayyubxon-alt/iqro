/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Maktab (B2B) operatsiyalari
 *  api/school.js
 * ════════════════════════════════════════════════════════════
 *
 *  POST { action, ... } + Authorization: Bearer <Firebase ID token>
 *
 *  action = 'join'   { code, shareStats }  — o'qituvchi maktabga qo'shiladi
 *  action = 'stats'  { schoolId }          — maktab admini uchun hisobot
 *  action = 'sync'   { schoolId }          — obunani a'zolarga tarqatish (platforma admini)
 *
 *  Nega bitta fayl: Vercel Hobby rejasida serverless funksiyalar soni cheklangan.
 *  Har uchala amal ham bir xil auth/DB kontekstiga muhtoj.
 *
 *  MAXFIYLIK QOIDASI (buzilmaydi):
 *    'stats' javobida o'qituvchining XATOLARI, savollari yoki javoblari
 *    HECH QACHON qaytarilmaydi — faqat jamlangan ko'rsatkichlar. O'qituvchi
 *    qo'shilishda hisobot ulashishga rozilik bermasa (shareStats=false),
 *    uning shaxsiy raqamlari ham berilmaydi (faqat "a'zo" sifatida ko'rinadi).
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { rateLimit, clientIp, PLATFORM_ADMIN_EMAILS } from './_shared.js';

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
  if (PLATFORM_ADMIN_EMAILS.includes(decoded.email)) return true;
  const snap = await db.collection('users').doc(decoded.uid).get();
  return snap.exists && snap.data().role === 'admin';
};

// ── action: join ───────────────────────────────────────────────────────────
async function handleJoin(db, uid, body) {
  const code = (body?.code || '').toString().trim().toUpperCase();
  // AUDIT 2026-08-05, 10-BAND: avval minimal uzunlik 4 edi — 36^4 ≈ 1.7M variant,
  // rate-limit esa yo'q. Ya'ni joinCode'ni brute-force qilib korporativ Pro
  // obunani o'zlashtirib olish real edi. Endi minimal 8 belgi (36^8 ≈ 2.8·10^12)
  // + urinishlar soni cheklangan (handler ichida).
  if (!/^[A-Z0-9_-]{8,32}$/.test(code)) return { ok: false, error: 'invalid_code_format' };
  const shareStats = body?.shareStats !== false; // default: rozilik berilgan

  const query = db.collection('schools').where('joinCode', '==', code).limit(1);
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (tx) => {
    const [schoolSnap, userSnap] = await Promise.all([tx.get(query), tx.get(userRef)]);
    if (schoolSnap.empty) return { ok: false, error: 'school_not_found' };

    const schoolDoc = schoolSnap.docs[0];
    const school = schoolDoc.data();
    if (school.active === false) return { ok: false, error: 'school_inactive' };

    const memberRef = schoolDoc.ref.collection('members').doc(uid);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists) return { ok: false, error: 'already_member' };

    const seats = Number(school.seats) || 0;
    const memberCount = Number(school.memberCount) || 0;
    if (seats > 0 && memberCount >= seats) return { ok: false, error: 'seats_full' };

    const userData = userSnap.exists ? userSnap.data() : {};
    if (userData.schoolId && userData.schoolId !== schoolDoc.id) {
      return { ok: false, error: 'already_in_other_school' };
    }

    const now = new Date();
    const userPatch = {
      schoolId: schoolDoc.id,
      schoolName: school.name || null,
      schoolJoinedAt: now.toISOString(),
    };

    // Korporativ obuna: maktab muddati amal qilsa, o'qituvchiga Pro beriladi.
    // premiumExpire — yagona manba; mavjud muddat undan uzoq bo'lsa TEGILMAYDI.
    let premiumGrantedUntil = null;
    const schoolUntil = school.subscriptionUntil ? new Date(school.subscriptionUntil) : null;
    if (schoolUntil && schoolUntil > now) {
      const currentExpire = userData.premiumExpire ? new Date(userData.premiumExpire) : null;
      if (!currentExpire || currentExpire < schoolUntil) {
        userPatch.isPremium = true;
        userPatch.premiumExpire = schoolUntil.toISOString();
        userPatch.premiumPlan = 'paid';
        userPatch.premiumMethod = 'school';
        userPatch.premiumSince = userData.premiumSince || now.toISOString();
        premiumGrantedUntil = schoolUntil.toISOString();
      }
    }

    tx.set(userRef, userPatch, { merge: true });
    tx.set(memberRef, {
      uid,
      displayName: userData.displayName || null,
      role: 'teacher',
      shareStats,
      joinedAt: now.toISOString(),
    });
    tx.update(schoolDoc.ref, {
      memberCount: FieldValue.increment(1),
      lastJoinAt: now.toISOString(),
    });

    return {
      ok: true,
      schoolId: schoolDoc.id,
      schoolName: school.name || null,
      premiumGrantedUntil,
    };
  });
}

// ── action: stats ──────────────────────────────────────────────────────────
async function handleStats(db, uid, decoded, body) {
  const schoolId = (body?.schoolId || '').toString().trim();
  if (!schoolId) return { ok: false, error: 'invalid_request' };

  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) return { ok: false, error: 'school_not_found' };
  const school = schoolSnap.data();

  const isSchoolAdmin = Array.isArray(school.adminUids) && school.adminUids.includes(uid);
  if (!isSchoolAdmin && !(await isPlatformAdmin(db, decoded))) {
    return { ok: false, error: 'forbidden' };
  }

  const membersSnap = await schoolRef.collection('members').get();
  const members = membersSnap.docs.map(d => d.data());
  if (members.length === 0) {
    return { ok: true, school: publicSchool(schoolId, school), members: [], summary: emptySummary() };
  }

  // userStats hujjatlarini PARTIYALAB o'qiymiz — bitta getAll ga yuzlab
  // ref berilsa gRPC xabar hajmi chegarasiga urilib, butun hisobot yiqilardi
  // (yirik maktab/tuman bo'limi uchun real ehtimol).
  const statsByUid = {};
  for (let i = 0; i < members.length; i += 300) {
    const refs = members.slice(i, i + 300).map(m => db.collection('userStats').doc(m.uid));
    const statDocs = await db.getAll(...refs);
    statDocs.forEach(d => { if (d.exists) statsByUid[d.id] = d.data(); });
  }

  const rows = members.map(m => {
    const raw = statsByUid[m.uid] || {};
    // Har fan bo'yicha jami — xom hisoblagichlar (xatolar/savollar EMAS)
    const cats = raw.stats || {};
    const answered = Object.values(cats).reduce((s, c) => s + (c?.totalAnswered || 0), 0);
    const correct = Object.values(cats).reduce((s, c) => s + (c?.totalCorrect || 0), 0);
    const readinessMap = raw.readiness || {};
    // Eng so'nggi yangilangan fan bo'yicha tayyorlik
    const latest = Object.entries(readinessMap)
      .sort((a, b) => (b[1]?.updatedAt || '').localeCompare(a[1]?.updatedAt || ''))[0];

    const base = {
      uid: m.uid,
      displayName: m.displayName || raw.displayName || null,
      joinedAt: m.joinedAt || null,
      shareStats: m.shareStats !== false,
    };
    if (!base.shareStats) return { ...base, hidden: true };

    return {
      ...base,
      hidden: false,
      answered,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
      readiness: latest?.[1]?.score ?? null,
      readinessCategory: latest?.[0] ?? null,
      dailyStreak: raw.dailyStreak || 0,
      ami: raw.achievements?.ami ?? null,
      lastActiveAt: raw.lastActiveAt || latest?.[1]?.updatedAt || null,
    };
  });

  const visible = rows.filter(r => !r.hidden);
  const withReadiness = visible.filter(r => typeof r.readiness === 'number');
  const active7d = visible.filter(r => {
    if (!r.lastActiveAt) return false;
    return Date.now() - new Date(r.lastActiveAt).getTime() < 7 * 86400000;
  }).length;

  const summary = {
    total: members.length,
    reporting: visible.length,
    active7d,
    notStarted: visible.filter(r => (r.answered || 0) === 0).length,
    avgReadiness: withReadiness.length
      ? Math.round(withReadiness.reduce((s, r) => s + r.readiness, 0) / withReadiness.length)
      : null,
    avgAccuracy: (() => {
      const arr = visible.filter(r => typeof r.accuracy === 'number');
      return arr.length ? Math.round(arr.reduce((s, r) => s + r.accuracy, 0) / arr.length) : null;
    })(),
    totalAnswered: visible.reduce((s, r) => s + (r.answered || 0), 0),
    // Yordamga muhtoj: tayyorligi 50% dan past yoki umuman boshlamagan
    needsSupport: withReadiness.filter(r => r.readiness < 50).length
      + visible.filter(r => (r.answered || 0) === 0).length,
  };

  rows.sort((a, b) => {
    if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
    return (a.readiness ?? 999) - (b.readiness ?? 999);
  });

  return { ok: true, school: publicSchool(schoolId, school), members: rows, summary };
}

// ── action: sync (platforma admini) ────────────────────────────────────────
// Maktab obunasi uzaytirilganda mavjud a'zolarga Pro muddatini tarqatadi.
async function handleSync(db, decoded, body) {
  if (!(await isPlatformAdmin(db, decoded))) return { ok: false, error: 'forbidden' };

  const schoolId = (body?.schoolId || '').toString().trim();
  if (!schoolId) return { ok: false, error: 'invalid_request' };

  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) return { ok: false, error: 'school_not_found' };
  const school = schoolSnap.data();

  const until = school.subscriptionUntil ? new Date(school.subscriptionUntil) : null;
  if (!until || until <= new Date()) return { ok: false, error: 'no_active_subscription' };

  const membersSnap = await schoolRef.collection('members').get();
  const now = new Date();
  let granted = 0;
  let skipped = 0;

  // Firestore batch limiti 500 — a'zolar soni odatda undan kam, baribir bo'lamiz
  const chunks = [];
  for (let i = 0; i < membersSnap.docs.length; i += 400) {
    chunks.push(membersSnap.docs.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const userRefs = chunk.map(d => db.collection('users').doc(d.id));
    const userDocs = await db.getAll(...userRefs);
    const batch = db.batch();
    userDocs.forEach(uDoc => {
      const data = uDoc.exists ? uDoc.data() : {};
      const currentExpire = data.premiumExpire ? new Date(data.premiumExpire) : null;
      if (currentExpire && currentExpire >= until) { skipped += 1; return; }
      batch.set(uDoc.ref, {
        isPremium: true,
        premiumExpire: until.toISOString(),
        premiumPlan: 'paid',
        premiumMethod: 'school',
        premiumSince: data.premiumSince || now.toISOString(),
      }, { merge: true });
      granted += 1;
    });
    await batch.commit();
  }

  await schoolRef.set({ lastSyncAt: now.toISOString() }, { merge: true });
  return { ok: true, granted, skipped, until: until.toISOString() };
}

const publicSchool = (id, s) => ({
  id,
  name: s.name || null,
  region: s.region || null,
  district: s.district || null,
  seats: s.seats || 0,
  memberCount: s.memberCount || 0,
  subscriptionUntil: s.subscriptionUntil || null,
  active: s.active !== false,
});

const emptySummary = () => ({
  total: 0, reporting: 0, active7d: 0, notStarted: 0,
  avgReadiness: null, avgAccuracy: null, totalAnswered: 0, needsSupport: 0,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const db = getDb();
    const decoded = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const uid = decoded.uid;
    const action = (req.body?.action || '').toString();

    // `join` — kod taxmin qilinadigan yagona amal, shuning uchun alohida
    // qattiq chegara: foydalanuvchi ham, IP ham soatiga 10 urinish.
    if (action === 'join') {
      const tooMany = rateLimit(`join:uid:${uid}`, 10, 3600_000).limited
        || rateLimit(`join:ip:${clientIp(req)}`, 20, 3600_000).limited;
      if (tooMany) return res.status(429).json({ ok: false, error: 'too_many_requests' });
    }

    let result;
    if (action === 'join') result = await handleJoin(db, uid, req.body);
    else if (action === 'stats') result = await handleStats(db, uid, decoded, req.body);
    else if (action === 'sync') result = await handleSync(db, decoded, req.body);
    else result = { ok: false, error: 'unknown_action' };

    // Biznes-xatolar 200 bilan qaytadi — frontend xabarni ko'rsatadi
    return res.status(200).json(result);
  } catch (err) {
    console.error('api/school error:', err);
    if (err?.code === 'auth/id-token-expired' || err?.code === 'auth/argument-error') {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
