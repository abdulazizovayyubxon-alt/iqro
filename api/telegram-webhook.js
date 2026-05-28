/**
 * ════════════════════════════════════════════════════════════
 *  Telegram Webhook for CHQBT Platform
 *  api/telegram-webhook.js
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

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
    console.error("Telegram xabar yuborishda xatolik:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Webhook is running');
  }

  try {
    const body = req.body;
    if (!body || !body.message) {
      return res.status(200).send('No message');
    }

    const { chat, text } = body.message;
    if (!text || !chat) {
      return res.status(200).send('No text or chat info');
    }

    const chatId = chat.id;
    let incomingText = text.trim();

    // /start command
    if (incomingText.startsWith('/start')) {
      const parts = incomingText.split(' ');
      let code = '';
      
      // Support deep linking: /start IQRO-XXXXXXXX
      if (parts.length > 1 && parts[1].startsWith('IQRO-')) {
        code = parts[1];
      }
      
      if (!code) {
        await sendMessage(chatId, "<b>Xush kelibsiz!</b> 🎓\n\nIltimos, platformadagi <b>Shaxsiy ID</b> kodingizni (Masalan: <code>IQRO-8D7EVVJZ</code>) shu yerga yuboring.");
        return res.status(200).send('Start handled');
      } else {
        // Continue to code checking below
        incomingText = code;
      }
    }

    // Checking IQRO code
    if (incomingText.startsWith('IQRO-')) {
      const code = incomingText;
      const db = getDb();
      
      // Search for user
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('telegramCode', '==', code).get();
      
      if (snapshot.empty) {
        await sendMessage(chatId, "❌ Kechirasiz, bunday kodga ega foydalanuvchi topilmadi. Kodingizni to'g'ri ko'chirganingizga ishonch hosil qiling.");
      } else {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        // Update user with Telegram Chat ID
        await userDoc.ref.update({
          telegramChatId: chatId,
          telegramEnabled: true
        });
        
        await sendMessage(chatId, `✅ <b>Muvaffaqiyatli ulandi!</b>\n\nAssalomu alaykum, <b>${userData.displayName || 'Foydalanuvchi'}</b>! Platforma endi sizga shu yerda har kuni eslatmalar va muhim xabarlarni yuborib turadi.\n\nSizni kutyapmiz: <a href="https://iqro-t41p.vercel.app">Saytga o'tish</a>`);
      }
      
      return res.status(200).send('Code processed');
    }

    // Default message
    await sendMessage(chatId, "Iltimos, botga ulanish uchun platformadan nusxa olingan <b>IQRO-...</b> kodingizni yuboring.");
    res.status(200).send('OK');

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send('Error');
  }
}
