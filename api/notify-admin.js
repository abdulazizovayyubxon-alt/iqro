import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // FCM push (admin-only) — alohida tarmoq
  if (req.body && req.body.action === 'push') {
    try {
      return await handlePush(req, res);
    } catch (error) {
      console.error('Push error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).send('No message provided');

    const db = getDb();
    const adminSnap = await db.collection('settings').doc('admin').get();
    
    if (!adminSnap.exists || !adminSnap.data().telegramChatId) {
      return res.status(200).send('Admin not configured');
    }
    
    const adminChatId = adminSnap.data().telegramChatId;

    let prefix = '🔔 <b>Eslatma</b>\n\n';
    if (type === 'register') prefix = '👤 <b>Yangi Foydalanuvchi!</b>\n\n';
    if (type === 'payment') prefix = '💳 <b>To\'lov Harakati!</b>\n\n';

    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: prefix + message,
        parse_mode: 'HTML'
      })
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Notify error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

