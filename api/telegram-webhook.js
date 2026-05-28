/**
 * ════════════════════════════════════════════════════════════
 *  Telegram Webhook for CHQBT Platform (Super Bot)
 *  api/telegram-webhook.js
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return { db: getFirestore(), auth: getAuth() };
}

const TELEGRAM_BOT_TOKEN = '8523102352:AAEQOggWs3ULCGivaao-bmMpwT-_lFdxMeQ';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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
    const { db, auth } = getDb();

    // ==========================================
    // 1. CALLBACK QUERIES (Admin tasdiqlashlari)
    // ==========================================
    if (body.callback_query) {
      const cb = body.callback_query;
      const adminChatId = cb.message.chat.id;
      const data = cb.data;

      if (data.startsWith('approve_') || data.startsWith('reject_')) {
        const action = data.split('_')[0];
        const uid = data.split('_')[1];
        
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return res.status(200).send('User not found');
        const userData = userSnap.data();

        if (action === 'approve') {
          // Premium yoqish (1 oy)
          const exp = new Date();
          exp.setMonth(exp.getMonth() + 1);
          await userRef.update({
            isPremium: true,
            premiumPlan: 'paid',
            premiumExpire: exp.toISOString(),
            discountAvailable: false // Chegirma ishlatildi
          });

          // Mijozga xabar
          if (userData.telegramChatId) {
            await sendMessage(userData.telegramChatId, "🎉 <b>Tabriklaymiz!</b>\n\nTo'lovingiz tasdiqlandi va sizga 1 oylik Premium yoqildi. Saytga kirib bemalol ishlatavering!");
          }

          // Referalga (do'stiga) mukofot
          if (userData.referredBy) {
            const referrerRef = db.collection('users').doc(userData.referredBy);
            const refSnap = await referrerRef.get();
            if (refSnap.exists) {
              const refData = refSnap.data();
              // A ga 15,000 so'm bonus berish
              await referrerRef.update({
                referralBonus: (refData.referralBonus || 0) + 15000,
                referralCount: (refData.referralCount || 0) + 1
              });

              // Referrals kolleksiyasini yangilash
              const refDocs = await db.collection('referrals').where('referredId', '==', userDoc.id).get();
              if (!refDocs.empty) {
                await refDocs.docs[0].ref.update({
                  status: 'paid',
                  bonusPaid: true,
                  bonusAmount: 15000,
                  paidAt: new Date().toISOString()
                });
              }
              
              if (refData.telegramChatId) {
                await sendMessage(refData.telegramChatId, `🎁 <b>Suyunchi!</b>\n\nSiz taklif qilgan do'stingiz (${userData.displayName || 'Foydalanuvchi'}) premium sotib oldi! Hisobingizga avtomatik tarzda <b>15,000 so'm bonus</b> qo'shib berildi.`);
              }
            }
          }

          // Admin xabarini o'zgartirish
          await fetch(`${TELEGRAM_API_URL}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminChatId,
              message_id: cb.message.message_id,
              caption: cb.message.caption + "\n\n✅ TASDIQLANDI VA PREMIUM YOQILDI!"
            })
          });

        } else if (action === 'reject') {
          if (userData.telegramChatId) {
            await sendMessage(userData.telegramChatId, "❌ Kechirasiz, yuborgan to'lov chekingiz tasdiqlanmadi. Iltimos qaytadan urining yoki adminga murojaat qiling.");
          }
          await fetch(`${TELEGRAM_API_URL}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminChatId,
              message_id: cb.message.message_id,
              caption: cb.message.caption + "\n\n❌ RAD ETILDI"
            })
          });
        }
      }
      return res.status(200).send('CB handled');
    }

    if (!body || !body.message) return res.status(200).send('No message');
    const { chat, text, photo } = body.message;
    const chatId = chat.id;

    // ==========================================
    // 2. FOTO YUBORILGANDA (To'lov cheklari)
    // ==========================================
    if (photo) {
      const adminSnap = await db.collection('settings').doc('admin').get();
      if (!adminSnap.exists) {
        await sendMessage(chatId, "Kechirasiz, admin hali tizimga ulanmagan.");
        return res.status(200).send('No admin');
      }
      const adminId = adminSnap.data().telegramChatId;

      const usersSnap = await db.collection('users').where('telegramChatId', '==', chatId).get();
      if (usersSnap.empty) {
        await sendMessage(chatId, "Siz hali platformaga ulanmagansiz. Saytdan kodingizni olib kiring.");
        return res.status(200).send('Not linked');
      }
      const userDoc = usersSnap.docs[0];
      const uid = userDoc.id;
      const userData = userDoc.data();

      // Rasm faylini Adminga yo'naltirish
      const photoFileId = photo[photo.length - 1].file_id;
      await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          photo: photoFileId,
          caption: `💰 <b>Yangi to'lov cheki!</b>\n\n👤 Mijoz: ${userData.displayName || 'Ismsiz'}\n🆔 ID: ${uid}\n📞 Telefon: ${userData.phoneNumber || 'Yoq'}\n\nIltimos, to'lovni tasdiqlang:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Tasdiqlash", callback_data: `approve_${uid}` },
              { text: "❌ Rad etish", callback_data: `reject_${uid}` }
            ]]
          }
        })
      });

      await sendMessage(chatId, "⏳ <b>Chekingiz adminga yuborildi!</b>\n\nIltimos kuting, tasdiqlangach sizga xabar beramiz.");
      return res.status(200).send('Photo forwarded');
    }

    if (!text) return res.status(200).send('No text');
    let incomingText = text.trim();

    // ==========================================
    // 3. ADMIN RO'YXATDAN O'TISHI
    // ==========================================
    if (incomingText === '/admin') {
      await db.collection('settings').doc('admin').set({ telegramChatId: chatId });
      await sendMessage(chatId, "✅ <b>Siz Admin sifatida ro'yxatga olindingiz!</b>\n\nEndi mijozlarning to'lov cheklari to'g'ridan-to'g'ri shu yerga keladi.");
      return res.status(200).send('Admin saved');
    }

    // Foydalanuvchini izlash
    const usersSnap = await db.collection('users').where('telegramChatId', '==', chatId).get();
    let linkedUser = null;
    let linkedUid = null;
    if (!usersSnap.empty) {
      linkedUser = usersSnap.docs[0].data();
      linkedUid = usersSnap.docs[0].id;
    }

    // ==========================================
    // 4. BOSH MENYU VA KLAVIATURA BUYRUQLARI
    // ==========================================
    const keyboardMarkup = {
      keyboard: [
        [{text: "💳 Premium Sotib Olish"}],
        [{text: "📊 Statistika"}, {text: "🔑 Kodimni ko'rish"}],
        [{text: "🔗 Do'stlarni taklif qilish"}]
      ],
      resize_keyboard: true
    };

    if (incomingText.startsWith('/start')) {
      const parts = incomingText.split(' ');
      let code = '';
      if (parts.length > 1) {
        if (parts[1].startsWith('IQRO-')) {
          code = parts[1];
        } else if (parts[1].startsWith('login_')) {
          // TELEGRAM LOGIN MANTIG'I
          const sessionId = parts[1].replace('login_', '');
          if (!linkedUser) {
            await sendMessage(chatId, "❌ Kechirasiz, siz ushbu botga ulanmagansiz. Oldin saytdagi Profilingizdan IQRO kodingizni botga yuboring.");
          } else {
            // Generate Custom Token
            try {
              const customToken = await auth.createCustomToken(linkedUid);
              await db.collection('logins').doc(sessionId).set({
                token: customToken,
                status: 'success',
                createdAt: new Date()
              });
              await sendMessage(chatId, `✅ <b>Muvaffaqiyatli!</b>\n\nSaytga ruxsat berildi. Sayt ochiq bo'lgan brauzerga qayting!`);
            } catch(e) {
              await sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
            }
          }
          return res.status(200).send('Login handled');
        }
      }
      
      if (!code) {
        if (linkedUser) {
          await sendMessage(chatId, `Assalomu alaykum, <b>${linkedUser.displayName || 'Foydalanuvchi'}</b>! Bosh menyudasiz. Quyidagi tugmalardan foydalaning:`, keyboardMarkup);
          return res.status(200).send('Menu shown');
        } else {
          await sendMessage(chatId, "<b>Xush kelibsiz!</b> 🎓\n\nIltimos, platformadagi <b>Shaxsiy ID</b> kodingizni (Masalan: <code>IQRO-8D7EVVJZ</code>) shu yerga yuboring.");
          return res.status(200).send('Start handled');
        }
      } else {
        incomingText = code;
      }
    }

    // IQRO kod orqali ulanish
    if (incomingText.startsWith('IQRO-')) {
      const code = incomingText;
      const searchSnap = await db.collection('users').where('telegramCode', '==', code).get();
      
      if (searchSnap.empty) {
        await sendMessage(chatId, "❌ Kechirasiz, bunday kodga ega foydalanuvchi topilmadi. Kodingizni to'g'ri ko'chirganingizga ishonch hosil qiling.");
      } else {
        const uDoc = searchSnap.docs[0];
        const uData = uDoc.data();
        await uDoc.ref.update({
          telegramChatId: chatId,
          telegramEnabled: true
        });
        await sendMessage(chatId, `✅ <b>Muvaffaqiyatli ulandi!</b>\n\nAssalomu alaykum, <b>${uData.displayName || 'Foydalanuvchi'}</b>! Platforma endi sizga shu yerda xizmat ko'rsatadi.`, keyboardMarkup);
      }
      return res.status(200).send('Code processed');
    }

    // Tizimga ulanmaganlar uchun blok
    if (!linkedUser) {
      await sendMessage(chatId, "Iltimos, botdan to'liq foydalanish uchun platformadan olingan <b>IQRO-...</b> kodingizni yuboring.");
      return res.status(200).send('Not linked');
    }

    // ==========================================
    // 5. MENYU TUGMALARI
    // ==========================================
    if (incomingText === "🔑 Kodimni ko'rish" || incomingText === '/kodim') {
      await sendMessage(chatId, `Sizning platformadagi shaxsiy kodingiz:\n\n<code>${linkedUser.telegramCode}</code>\n\nAgar saytdan chiqib ketsangiz yoki brauzeringiz tozalansa, saytning Profil sahifasidan aynan shu kod orqali o'z profilingizga qaytishingiz mumkin!`, keyboardMarkup);
      
    } else if (incomingText === "📊 Statistika" || incomingText === '/statistika') {
      const statSnap = await db.collection('userStats').doc(linkedUid).get();
      let score = 0;
      if (statSnap.exists) score = statSnap.data().totalScore || 0;
      await sendMessage(chatId, `📊 <b>Sizning statistikangiz:</b>\n\nJami yig'gan ballingiz: <b>${score}</b> ball.\n\nReytingda ko'tarilish uchun saytga kirib ko'proq test ishlang!`, keyboardMarkup);
      
    } else if (incomingText === "🔗 Do'stlarni taklif qilish" || incomingText === '/referal') {
      const refLink = `https://iqro-t41p.vercel.app/register?ref=${linkedUid}`;
      await sendMessage(chatId, `🔗 <b>Do'stlarni taklif qilish</b>\n\nQuyidagi havolani do'stlaringizga yuboring. Ular ro'yxatdan o'tsa va premium olsa, sizga avtomatik <b>15,000 so'm bonus</b> beriladi!\n\n${refLink}`, keyboardMarkup);
      
    } else if (incomingText === "💳 Premium Sotib Olish" || incomingText === '/premium') {
      // 1. Narxni bazadan olish
      const pSnap = await db.collection('settings').doc('premium').get();
      let basePrice = 15000;
      if (pSnap.exists) {
        const plans = pSnap.data().plans || [];
        const monthly = plans.find(p => p.months === 1);
        if (monthly) basePrice = monthly.price;
      }
      
      let finalPrice = basePrice;
      let msg = `💳 <b>Premium Sotib Olish</b>\n\n`;
      
      // 2. Chegirmani hisoblash
      if (linkedUser.discountAvailable) {
        finalPrice = basePrice * 0.5; // 50% chegirma (referal tizimi bo'yicha)
        msg += `🎉 <i>Sizda do'stingiz taklifi orqali 50% chegirma mavjud!</i>\n\nOylik to'lov summasi: <del>${basePrice}</del> emas, balki <b>${finalPrice.toLocaleString()} so'm</b>\n`;
      } else {
        msg += `Oylik to'lov summasi: <b>${finalPrice.toLocaleString()} so'm</b>\n`;
      }
      
      msg += `\nQuyidagi kartaga to'lov qiling:\n\n💳 Karta: <code>9860350143333655</code>\n👤 Egasi: Ayyubxon Abdulazizov\n\n<b>👇 To'lov qilgach, chekni (skrinshotni) to'g'ridan-to'g'ri shu yerga rasm qilib yuboring!</b>`;
      
      await sendMessage(chatId, msg, keyboardMarkup);
    } else {
      await sendMessage(chatId, "Kechirasiz, men bu buyruqni tushunmadim. Iltimos menyudagi tugmalardan foydalaning.", keyboardMarkup);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send('Error');
  }
}
