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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8523102352:AAEQOggWs3ULCGivaao-bmMpwT-_lFdxMeQ';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error("TG Send Error:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { uid, correct, wrong, total, time, mode, title } = req.body;
  
  if (!uid) return res.status(400).send('No uid');

  try {
    const db = getDb();
    const userSnap = await db.collection('users').doc(uid).get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      if (userData.telegramEnabled && userData.telegramChatId) {
        
        let msg = `📝 <b>Test Yakunlandi!</b>\n\n`;
        msg += `📚 Mavzu: <b>${title || 'Umumiy Test'}</b>\n`;
        msg += `⚙️ Rejim: <b>${mode || 'Noma\'lum'}</b>\n\n`;
        
        msg += `✅ To'g'ri: <b>${correct || 0} ta</b>\n`;
        msg += `❌ Xato: <b>${wrong || 0} ta</b>\n`;
        msg += `⏱ Vaqt: <b>${time || 'Noma\'lum'}</b>\n\n`;
        
        let percentage = 0;
        if (total > 0) percentage = Math.round(((correct || 0) / total) * 100);
        
        if (percentage >= 80) {
          msg += `🌟 <b>Ajoyib natija!</b> Bilimingiz juda yaxshi. O'z ustingizda ishlashdan to'xtamang.`;
        } else if (percentage >= 50) {
          msg += `👍 <b>Yaxshi harakat!</b> Lekin hali ustingizda ishlashingiz kerak bo'lgan mavzular bor.`;
        } else {
          msg += `💪 <b>Hechqisi yo'q!</b> Xatolar ustida ishlab, albatta yuqori natijaga erishasiz!`;
        }

        await sendMessage(userData.telegramChatId, msg);
        return res.status(200).json({ success: true });
      }
    }
    
    res.status(200).json({ success: false, reason: 'Not linked to Telegram' });
  } catch (error) {
    console.error("Send result error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

