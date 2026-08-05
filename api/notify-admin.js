import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { rateLimit, clientIp, extractBearer, clip } from './_shared.js';

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

  const snap = await db.collection('users').doc(decoded.uid).get();
  const u = snap.exists ? snap.data() : {};

  const text = '👤 <b>Yangi foydalanuvchi!</b>\n\n'
    + `Ism: ${escapeHtml(u.displayName || '—')}\n`
    + `Telefon: ${escapeHtml(u.phone || '—')}\n`
    + `ID: ${escapeHtml(u.shortId || decoded.uid)}`;

  await sendToAdmin(db, text);
  return res.status(200).json({ success: true });
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

    if (action === 'register') return await handleRegister(db, req, res);

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

