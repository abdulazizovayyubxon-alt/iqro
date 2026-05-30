import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const TELEGRAM_BOT_TOKEN = '8523102352:AAEQOggWs3ULCGivaao-bmMpwT-_lFdxMeQ';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
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

