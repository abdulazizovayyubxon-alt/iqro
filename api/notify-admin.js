import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { rateLimit, clientIp, extractBearer, clip, ensureShortIdAdmin } from './_shared.js';

function ensureAdminApp() {
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
}

function getDb() {
  ensureAdminApp();
  return getFirestore();
}

// Admin emaillari — firestore.rules bilan bir xil
const ADMIN_EMAILS = ['abdulazizovayyubxon@gmail.com', '998999154686@iqro.uz'];

// Bearer idToken'ni tekshirib, admin ekanini tasdiqlaydi
async function verifyAdmin(req, db) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
  if (!idToken) return null;
  const decoded = await getAuth().verifyIdToken(idToken);
  if (ADMIN_EMAILS.includes(decoded.email)) return decoded;
  const u = await db.collection('users').doc(decoded.uid).get();
  if (u.exists && u.data().role === 'admin') return decoded;
  return null;
}

// ?action=push — adminga himoyalangan FCM push yuborish
async function handlePush(req, res) {
  const db = getDb();
  let admin;
  try {
    admin = await verifyAdmin(req, db);
  } catch (e) {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }
  if (!admin) return res.status(403).json({ success: false, error: 'forbidden' });

  const { title, body, target } = req.body;
  if (!title || !body) return res.status(400).json({ success: false, error: 'title_body_required' });

  // Tokenlarni yig'ish
  let tokens = [];
  if (target && target !== 'all') {
    const u = await db.collection('users').doc(target).get();
    if (u.exists && Array.isArray(u.data().fcmTokens)) tokens = u.data().fcmTokens;
  } else {
    const snap = await db.collection('users').get();
    snap.forEach((d) => {
      const t = d.data().fcmTokens;
      if (Array.isArray(t)) tokens.push(...t);
    });
  }
  tokens = [...new Set(tokens)].filter(Boolean);
  if (tokens.length === 0) return res.status(200).json({ success: true, sent: 0 });

  const messaging = getMessaging();
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const resp = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      webpush: { fcmOptions: { link: '/' } },
    });
    sent += resp.successCount;
  }
  return res.status(200).json({ success: true, sent });
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Telegram `parse_mode: HTML` — foydalanuvchi matni EKRANLANMASA, xabarga
// havola/qalin matn kiritib adminni chalg'itish (fishing) mumkin edi.
const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

async function sendToAdmin(db, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN sozlanmagan — xabar yuborilmadi');
    return false;
  }
  const adminSnap = await db.collection('settings').doc('admin').get();
  const adminChatId = adminSnap.exists ? adminSnap.data().telegramChatId : null;
  if (!adminChatId) return false;

  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML' }),
  });
  return true;
}

// ── action: register ───────────────────────────────────────────────────────
// AUDIT 2026-08-05, 20-BAND: avval bu yo'nak AUTH'SIZ edi va `message`
// matnini MIJOZ yuborardi — ya'ni istalgan odam admin Telegramiga ixtiyoriy
// matn (havola, soxta ogohlantirish) jo'natishi mumkin edi.
// ENDI: ID token majburiy va xabar matni SERVERDA Firestore ma'lumotidan
// yig'iladi — mijozdan keladigan matn umuman ishlatilmaydi.
async function handleRegister(db, req, res) {
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ success: false, error: 'unauthorized' });

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }

  // Qisqa ID SHU YERDA beriladi — ID berishning birlamchi nuqtasi.
  // Mijoz `meta/counters` ga umuman tegmaydi (sababi _shared.js izohida).
  // Xato bo'lsa ro'yxatdan o'tish BUZILMAYDI: ID'siz qolgan hisobni
  // cron-daily kechasi to'ldiradi.
  const shortId = await ensureShortIdAdmin(db, decoded.uid)
    .catch((e) => { console.warn('shortId berilmadi:', e?.message); return null; });

  const snap = await db.collection('users').doc(decoded.uid).get();
  const u = snap.exists ? snap.data() : {};

  const text = '👤 <b>Yangi foydalanuvchi!</b>\n\n'
    + `Ism: ${escapeHtml(u.displayName || '—')}\n`
    + `Telefon: ${escapeHtml(u.phone || '—')}\n`
    + `ID: ${escapeHtml(shortId || u.shortId || decoded.uid)}`;

  // Telegram yiqilsa ham mijozga ID qaytadi — xabar ikkinchi darajali.
  await sendToAdmin(db, text).catch((e) => console.warn('Telegram xabari yuborilmadi:', e?.message));
  return res.status(200).json({ success: true, shortId });
}

// ── action: ensure-id ──────────────────────────────────────────────────────
// Foydalanuvchi O'Z qisqa ID sini so'raydi. Ro'yxatdan o'tish paytida ID
// berilmay qolgan (endpoint yiqilgan, tarmoq uzilgan) hisoblar uchun —
// ilova ochilganda bir marta chaqiriladi. Idempotent: ID bor bo'lsa
// hech narsa yozilmaydi.
//
// uid FAQAT tekshirilgan tokendan olinadi — boshqa odamga ID berib bo'lmaydi.
async function handleEnsureId(db, req, res) {
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ success: false, error: 'unauthorized' });

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }

  // Hisoblagich umumiy resurs — bitta hisob uni cheksiz aylantirmasin.
  if (rateLimit(`sid:${decoded.uid}`, 5, 60 * 1000).limited) {
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  const shortId = await ensureShortIdAdmin(db, decoded.uid);
  return res.status(200).json({ success: true, shortId });
}

// ── action: delete-request ─────────────────────────────────────────────────
// Hisobni o'chirish arizasi (/delete-account sahifasi Google Play talabi
// bo'yicha ochiq — auth talab qilinmaydi).
// AUDIT 7-BAND: avval mijoz to'g'ridan-to'g'ri `deletionRequests`ga yozardi va
// Firestore qoidasi ham auth talab qilmasdi → cheksiz anonim hujjat. Endi
// yozuv shu yerda, IP bo'yicha qattiq chegara bilan.
async function handleDeleteRequest(db, req, res) {
  if (rateLimit(`del:${clientIp(req)}`, 3, 10 * 60 * 1000).limited) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  const name = clip(req.body?.name, 100)?.trim() || '';
  const phoneRaw = clip(req.body?.phone, 20) || '';
  const phone = phoneRaw.replace(/\D/g, '');
  const reason = clip(req.body?.reason, 1000)?.trim() || '';

  if (!name) return res.status(400).json({ ok: false, error: 'name_required' });
  if (!phone.startsWith('998') || phone.length !== 12) {
    return res.status(400).json({ ok: false, error: 'invalid_phone' });
  }

  const nowIso = new Date().toISOString();
  await db.collection('deletionRequests').add({
    name, phone, reason,
    status: 'pending',
    createdAt: nowIso,
  });

  await sendToAdmin(db,
    '🗑 <b>Hisobni o\'chirish arizasi</b>\n\n'
    + `Ism: ${escapeHtml(name)}\n`
    + `Telefon: ${escapeHtml(phone)}\n`
    + `Sabab: ${escapeHtml(reason || '—')}`
  ).catch((e) => console.warn('Telegram xabari yuborilmadi:', e?.message));

  return res.status(200).json({ ok: true });
}

// ── action: delete-user ────────────────────────────────────────────────────
// ⚠️ AUDIT 2026-08-06, T-12 BAND — admin paneli hisobni "o'chirganda" faqat
// `users/{uid}` va `userStats/{uid}` hujjatlarini o'chirardi. Firebase AUTH
// hisobi qolardi — foydalanuvchi kirishda davom etardi, lekin profil hujjati
// yo'qligi sababli `hasContentAccess()` xatoga uchrab, hamma joyda paywall
// ko'rinardi (zombi hisob). Subkolleksiya va bog'liq yozuvlar ham qolardi.
// Google Play "Data deletion" talabi hisobning O'ZINI o'chirishni ko'zda tutadi.
//
// Bu ish faqat Admin SDK bilan bajariladi — shuning uchun mijozda emas, shu yerda.
// Vercel Hobby 12 funksiya chegarasi sababli YANGI endpoint emas, mavjud
// `notify-admin.js` ga `action` qo'shildi (naqsh: `delete-request`).
// 400 talik partiyalarda o'chirish (Firestore batch chegarasi 500)
async function deleteAll(db, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

async function purgeUser(db, uid) {
  const deleted = { docs: 0, subdocs: 0, objections: 0, requests: 0, referrals: 0, authAccount: false };
  const errors = [];

  // 1) Shaxsiy subkolleksiya (bildirishnomalar) — hujjat o'chirilsa ham qolib ketardi
  try {
    const notifs = await db.collection('users').doc(uid).collection('notifications').get();
    deleted.subdocs = await deleteAll(db, notifs.docs);
  } catch (e) {
    errors.push(`notifications: ${e.message}`);
  }

  // ⚠️ ADMIN AUDIT 2026-08-06, A-10 BAND — quyidagi uch qadam YANGI.
  // Avval faqat `users` + `userStats` + bildirishnomalar o'chirilardi.
  // Boshqa kolleksiyalardagi yozuvlar YETIM qolardi:
  //   · `referrals` — Referral jadvalida "—" ismli qatorlar; bundan yomoni,
  //     `handleMarkReferralPaid` tranzaksiyasi mavjud bo'lmagan
  //     `users/{referrerId}` ni yangilamoqchi bo'lib NOT_FOUND bilan yiqilardi;
  //   · `objections` va `questionRequests` — `handleFulfillRequest` o'chirilgan
  //     uid ga bildirishnoma yozmoqchi bo'lardi.

  // 2) E'tirozlar — butunlay o'chiriladi (shaxsiy ma'lumot, qiymati yo'q)
  try {
    const objs = await db.collection('objections').where('uid', '==', uid).get();
    deleted.objections = await deleteAll(db, objs.docs);
  } catch (e) {
    errors.push(`objections: ${e.message}`);
  }

  // 3) Savol so'rovlari — butunlay o'chiriladi
  try {
    const reqs = await db.collection('questionRequests').where('uid', '==', uid).get();
    deleted.requests = await deleteAll(db, reqs.docs);
  } catch (e) {
    errors.push(`questionRequests: ${e.message}`);
  }

  // 4) Referrallar — O'CHIRILMAYDI, ANONIMLASHTIRILADI.
  // Bu MOLIYAVIY iz: bonus to'langanmi, kim kimni taklif qilgan — bu ma'lumot
  // hisob-kitob uchun kerak va uni yo'q qilish qayta tiklab bo'lmaydigan
  // xatolikka olib keladi. Shaxsni aniqlovchi ism olib tashlanadi, uid esa
  // "o'chirilgan" deb belgilanadi.
  try {
    const asReferrer = await db.collection('referrals').where('referrerId', '==', uid).get();
    const asReferred = await db.collection('referrals').where('referredId', '==', uid).get();
    const all = [...asReferrer.docs, ...asReferred.docs];
    for (let i = 0; i < all.length; i += 400) {
      const batch = db.batch();
      all.slice(i, i + 400).forEach((d) => {
        const data = d.data();
        const patch = { anonymizedAt: new Date().toISOString() };
        if (data.referrerId === uid) { patch.referrerName = "(o'chirilgan hisob)"; patch.referrerDeleted = true; }
        if (data.referredId === uid) { patch.referredName = "(o'chirilgan hisob)"; patch.referredDeleted = true; }
        batch.update(d.ref, patch);
      });
      await batch.commit();
    }
    deleted.referrals = all.length;
  } catch (e) {
    errors.push(`referrals: ${e.message}`);
  }

  // 5) Asosiy hujjatlar
  for (const path of [['users', uid], ['userStats', uid]]) {
    try {
      await db.collection(path[0]).doc(path[1]).delete();
      deleted.docs++;
    } catch (e) {
      errors.push(`${path[0]}: ${e.message}`);
    }
  }

  // 6) Firebase Auth hisobi — ASOSIY nuqta. Foydalanuvchi endi kira olmaydi.
  try {
    await getAuth().deleteUser(uid);
    deleted.authAccount = true;
  } catch (e) {
    // `user-not-found` = hisob allaqachon yo'q, bu xato emas
    if (e?.code === 'auth/user-not-found') deleted.authAccount = true;
    else errors.push(`auth: ${e.message}`);
  }

  return { deleted, errors };
}

async function handleDeleteUser(db, req, res) {
  const admin = await verifyAdmin(req, db).catch(() => null);
  if (!admin) return res.status(403).json({ ok: false, error: 'forbidden' });

  const uid = clip(req.body?.uid, 128)?.trim();
  if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
  // Admin o'zini o'chirib, platformani boshqaruvsiz qoldirmasin
  if (uid === admin.uid) return res.status(400).json({ ok: false, error: 'cannot_delete_self' });

  const { deleted, errors } = await purgeUser(db, uid);
  return res.status(200).json({ ok: errors.length === 0, deleted, errors });
}

// ── action: delete-me ──────────────────────────────────────────────────────
// Foydalanuvchi O'Z hisobini o'chiradi (Sozlamalar → Hisobni o'chirish).
// Mijoz tomonidagi `deleteUser()` faqat Auth yozuvini o'chirardi va
// `users/{uid}/notifications` subkolleksiyasi qolib ketardi. Bu yerda tozalash
// admin yo'li bilan AYNI (purgeUser), ya'ni ikkala yo'l ham bir xil natija beradi.
//
// XAVFSIZLIK: uid FAQAT tekshirilgan ID token'dan olinadi — tanadagi qiymatga
// ishonilmaydi, ya'ni bu endpoint bilan BOSHQA odamning hisobini o'chirib bo'lmaydi.
// Parolni qayta kiritish (reauthentication) mijoz tomonida talab qilinadi;
// bu yerda token yangiligini ham tekshiramiz (auth_time).
async function handleDeleteMe(db, req, res) {
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ ok: false, error: 'unauthorized' });

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ ok: false, error: 'invalid_token' });
  }

  // Token 10 daqiqadan eski autentifikatsiyaga tayanmasin: hisobni o'chirish
  // qaytarilmas amal, shuning uchun foydalanuvchi HOZIRGINA parolini
  // tasdiqlagan bo'lishi kerak (mijoz reauthenticate qiladi va tokenni yangilaydi).
  const authAgeSec = Math.floor(Date.now() / 1000) - (decoded.auth_time || 0);
  if (authAgeSec > 600) {
    return res.status(401).json({ ok: false, error: 'requires_recent_login' });
  }

  const { deleted, errors } = await purgeUser(db, decoded.uid);
  return res.status(200).json({ ok: errors.length === 0, deleted, errors });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  // `action` ni query'dan ham, body'dan ham qabul qilamiz
  const action = (req.query?.action || req.body?.action || req.body?.type || '').toString();

  try {
    const db = getDb();

    // FCM push — admin-only (o'zining auth tekshiruvi bor)
    if (action === 'push') return await handlePush(req, res);

    if (action === 'delete-request') return await handleDeleteRequest(db, req, res);

    if (action === 'delete-user') return await handleDeleteUser(db, req, res);

    if (action === 'delete-me') return await handleDeleteMe(db, req, res);

    if (action === 'register') return await handleRegister(db, req, res);

    if (action === 'ensure-id') return await handleEnsureId(db, req, res);

    // ── Qolgan hamma narsa: FAQAT ADMIN ──
    // Avval bu yerda ixtiyoriy `message` auth'siz qabul qilinardi.
    const admin = await verifyAdmin(req, db).catch(() => null);
    if (!admin) return res.status(403).json({ success: false, error: 'forbidden' });

    const message = clip(req.body?.message, 2000);
    if (!message) return res.status(400).json({ success: false, error: 'message_required' });

    await sendToAdmin(db, '🔔 <b>Eslatma</b>\n\n' + escapeHtml(message));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notify error:', error);
    // Ichki xato matni mijozga chiqarilmaydi
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}

