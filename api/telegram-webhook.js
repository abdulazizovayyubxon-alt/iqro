/**
 * ════════════════════════════════════════════════════════════
 *  Telegram Webhook for IQRO Platform (Super Bot)
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

// ── Bot token env dan olinadi (xavfsizlik uchun) ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8523102352:AAEQOggWs3ULCGivaao-bmMpwT-_lFdxMeQ';
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
    const resp = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return resp;
  } catch (error) {
    console.error("Telegram xabar yuborishda xatolik:", error);
  }
}

// ── Asosiy klaviatura menyu ──
const keyboardMarkup = {
  keyboard: [
    [{ text: "💳 Premium Sotib Olish" }],
    [{ text: "📊 Statistika" }, { text: "🔑 Kodimni ko'rish" }],
    [{ text: "🔗 Do'stlarni taklif qilish" }, { text: "💬 Yordam" }]
  ],
  resize_keyboard: true
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('IQRO Telegram Webhook is running ✅');
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

      // Callback query ga javob berish (loading spinner o'chirish)
      await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id })
      });

      if (data.startsWith('approve_') || data.startsWith('reject_')) {
        const parts = data.split('_');
        const action = parts[0];
        const uid = parts.slice(1).join('_'); // uid da _ bo'lishi mumkin

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
            premiumSince: new Date().toISOString(),
            premiumMethod: 'telegram_manual',
            discountAvailable: false
          });

          // Mijozga xabar
          if (userData.telegramChatId) {
            await sendMessage(userData.telegramChatId,
              "🎉 <b>Tabriklaymiz!</b>\n\nTo'lovingiz tasdiqlandi va sizga <b>1 oylik Premium</b> yoqildi! 🏆\n\nSaytga kirib bemalol ishlatavering!\n\n👉 https://iqro-t41p.vercel.app",
              keyboardMarkup
            );
          }

          // Referralga (do'stiga) mukofot
          if (userData.referredBy) {
            const referrerId = userData.referredBy;
            const referrerRef = db.collection('users').doc(referrerId);
            const refSnap = await referrerRef.get();
            if (refSnap.exists) {
              const refData = refSnap.data();
              await referrerRef.update({
                referralBonus: (refData.referralBonus || 0) + 15000,
                referralCount: (refData.referralCount || 0) + 1
              });

              // BUG TUZATISH: userDoc.id o'rniga uid ishlatildi
              const refDocs = await db.collection('referrals')
                .where('referredId', '==', uid)
                .get();
              if (!refDocs.empty) {
                await refDocs.docs[0].ref.update({
                  status: 'paid',
                  bonusPaid: true,
                  bonusAmount: 15000,
                  paidAt: new Date().toISOString()
                });
              }

              if (refData.telegramChatId) {
                await sendMessage(refData.telegramChatId,
                  `🎁 <b>Suyunchi!</b>\n\nSiz taklif qilgan do'stingiz (<b>${userData.displayName || 'Do\'stingiz'}</b>) premium sotib oldi!\n\nHisobingizga avtomatik tarzda <b>15,000 so'm bonus</b> qo'shib berildi. 🎉`
                );
              }
            }
          }

          // Admin xabarini yangilash
          try {
            await fetch(`${TELEGRAM_API_URL}/editMessageCaption`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminChatId,
                message_id: cb.message.message_id,
                caption: (cb.message.caption || '') + "\n\n✅ <b>TASDIQLANDI VA PREMIUM YOQILDI!</b>",
                parse_mode: 'HTML'
              })
            });
          } catch (e) {
            // editMessageCaption ishlamasa text ni o'zgartirish
            await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminChatId,
                message_id: cb.message.message_id,
                text: (cb.message.text || 'To\'lov') + "\n\n✅ <b>TASDIQLANDI!</b>",
                parse_mode: 'HTML'
              })
            });
          }

        } else if (action === 'reject') {
          if (userData.telegramChatId) {
            await sendMessage(userData.telegramChatId,
              "❌ Kechirasiz, yuborgan to'lov chekingiz tasdiqlanmadi.\n\nIltimos, qaytadan to'lab chekni yuboring yoki muammo bo'lsa adminga yozing. 💬"
            );
          }
          try {
            await fetch(`${TELEGRAM_API_URL}/editMessageCaption`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminChatId,
                message_id: cb.message.message_id,
                caption: (cb.message.caption || '') + "\n\n❌ <b>RAD ETILDI</b>",
                parse_mode: 'HTML'
              })
            });
          } catch (e) { /* ignore */ }
        }
      }
      return res.status(200).send('CB handled');
    }

    if (!body || !body.message) return res.status(200).send('No message');
    const { chat, text, photo, contact } = body.message;
    const chatId = chat.id;

    // ==========================================
    // 2. KONTAKT YUBORILGANDA (Telegram orqali login)
    // ==========================================
    if (contact) {
      let phone = contact.phone_number;
      if (!phone.startsWith('+')) phone = '+' + phone;
      const cleanPhone = phone.replace(/\D/g, '');
      const email = `${cleanPhone}@iqro.uz`;

      try {
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(email);
        } catch (e) {
          if (e.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({
              email: email,
              password: `iqro_auto_pass_${cleanPhone}`,
              displayName: contact.first_name || 'Foydalanuvchi'
            });
            await db.collection('users').doc(userRecord.uid).set({
              uid: userRecord.uid,
              email: email,
              phone: cleanPhone,
              displayName: contact.first_name || 'Foydalanuvchi',
              role: 'user',
              isPremium: false,
              createdAt: new Date(),
              telegramChatId: chatId,
              telegramEnabled: true
            });
          } else {
            throw e;
          }
        }

        const pendingLogins = await db.collection('logins')
          .where('chatId', '==', chatId)
          .where('status', '==', 'pending_contact')
          .get();

        let latestLogin = null;
        if (!pendingLogins.empty) {
          const sortedDocs = pendingLogins.docs.sort(
            (a, b) => b.data().createdAt.toDate() - a.data().createdAt.toDate()
          );
          latestLogin = sortedDocs[0];
        }

        await db.collection('users').doc(userRecord.uid).set({
          telegramChatId: chatId,
          telegramEnabled: true
        }, { merge: true });

        if (latestLogin) {
          const customToken = await auth.createCustomToken(userRecord.uid);
          await latestLogin.ref.update({
            token: customToken,
            status: 'success'
          });
          await sendMessage(chatId,
            `✅ <b>Muvaffaqiyatli!</b>\n\nSaytga ruxsat berildi. Sayt ochiq bo'lgan brauzerga qayting!`,
            keyboardMarkup
          );
        } else {
          await sendMessage(chatId,
            `✅ <b>Raqamingiz tasdiqlandi!</b>\n\nEndi saytdagi "Telegram orqali kirish" tugmasini qaytadan bossangiz parolsiz to'g'ridan-to'g'ri kirasiz.`,
            keyboardMarkup
          );
        }
      } catch (err) {
        console.error('Contact error:', err);
        await sendMessage(chatId, `Xatolik yuz berdi. Qaytadan urining.`);
      }
      return res.status(200).send('Contact handled');
    }

    // ==========================================
    // 3. FOTO YUBORILGANDA (To'lov cheklari)
    // ==========================================
    if (photo) {
      const adminSnap = await db.collection('settings').doc('admin').get();
      if (!adminSnap.exists) {
        await sendMessage(chatId, "Kechirasiz, admin hali tizimga ulanmagan. Keyinroq urinib ko'ring.");
        return res.status(200).send('No admin');
      }
      const adminId = adminSnap.data().telegramChatId;

      const usersSnap = await db.collection('users').where('telegramChatId', '==', chatId).get();
      if (usersSnap.empty) {
        await sendMessage(chatId,
          "❌ Siz hali platformaga ulanmagansiz.\n\nIltimos, saytga kiring va Profilingizdan <b>IQRO-...</b> kodingizni olib, botga yuboring."
        );
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
          caption: `💰 <b>Yangi to'lov cheki!</b>\n\n👤 Mijoz: ${userData.displayName || 'Ismsiz'}\n🆔 UID: ${uid}\n📞 Telefon: ${userData.phone || userData.phoneNumber || 'Ko\'rsatilmagan'}\n📧 Email: ${userData.email || '-'}\n\n⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}\n\nIltimos, to'lovni tasdiqlang:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Tasdiqlash", callback_data: `approve_${uid}` },
              { text: "❌ Rad etish", callback_data: `reject_${uid}` }
            ]]
          }
        })
      });

      // Foydalanuvchiga xabar
      await sendMessage(chatId,
        "⏳ <b>Chekingiz adminga yuborildi!</b>\n\nIltimos kuting, 5-30 daqiqa ichida tasdiqlangach sizga xabar beramiz. 🙏",
        keyboardMarkup
      );

      // Bazaga pending to'lov yozib qo'yamiz
      await db.collection('payments').add({
        userId: uid,
        userName: userData.displayName || '',
        method: 'telegram_manual',
        status: 'pending',
        chatId: chatId,
        adminId: adminId,
        createdAt: new Date().toISOString()
      });

      return res.status(200).send('Photo forwarded');
    }

    if (!text) return res.status(200).send('No text');
    let incomingText = text.trim();

    // ==========================================
    // 4. ADMIN BUYRUQLARI
    // ==========================================
    if (incomingText === '/admin') {
      await db.collection('settings').doc('admin').set({ telegramChatId: chatId });
      await sendMessage(chatId,
        "✅ <b>Siz Admin sifatida ro'yxatga olindingiz!</b>\n\nEndi mijozlarning to'lov cheklari to'g'ridan-to'g'ri shu yerga keladi.\n\n<i>Buyruqlar: /stats /users</i>"
      );
      return res.status(200).send('Admin saved');
    }

    // Admin mijozga reply qildimi?
    const adminSnap = await db.collection('settings').doc('admin').get();
    let adminId = null;
    if (adminSnap.exists) adminId = adminSnap.data().telegramChatId;

    if (chatId === adminId && body.message.reply_to_message) {
      const repliedCaption = body.message.reply_to_message.caption || '';
      const repliedText = body.message.reply_to_message.text || '';
      const fullText = repliedCaption + repliedText;
      const uidMatch = fullText.match(/UID: ([^\n]+)/);
      if (uidMatch && uidMatch[1]) {
        const targetUid = uidMatch[1].trim();
        // targetUid dan chatId ni topamiz
        const targetSnap = await db.collection('users').doc(targetUid).get();
        if (targetSnap.exists && targetSnap.data().telegramChatId) {
          await sendMessage(targetSnap.data().telegramChatId,
            `👨‍💻 <b>Admin javobi:</b>\n\n${incomingText}`
          );
          await sendMessage(adminId, `✅ Javob yuborildi.`);
          return res.status(200).send('Admin reply sent');
        }
      }
    }

    // Foydalanuvchini izlash
    const usersSnap2 = await db.collection('users').where('telegramChatId', '==', chatId).get();
    let linkedUser = null;
    let linkedUid = null;
    if (!usersSnap2.empty) {
      linkedUser = usersSnap2.docs[0].data();
      linkedUid = usersSnap2.docs[0].id;
    }

    // ==========================================
    // 5. /start va KODLAR
    // ==========================================
    if (incomingText.startsWith('/start')) {
      const parts = incomingText.split(' ');
      let param = parts.length > 1 ? parts[1] : '';

      // Telegram login (saytdan bot ga yo'naltirish)
      if (param.startsWith('login_')) {
        const sessionId = param.replace('login_', '');
        if (!linkedUser) {
          const requestPhoneMarkup = {
            keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          };
          await db.collection('logins').doc(sessionId).set({
            status: 'pending_contact',
            chatId: chatId,
            createdAt: new Date()
          });
          await sendMessage(chatId,
            "🔐 <b>Saytga kirish tasdiqlanmoqda...</b>\n\nSaytga to'g'ridan-to'g'ri (parolsiz) kirish uchun pastdagi <b>📱 Telefon raqamni yuborish</b> tugmasini bosing.",
            requestPhoneMarkup
          );
        } else {
          try {
            const customToken = await auth.createCustomToken(linkedUid);
            await db.collection('logins').doc(sessionId).set({
              token: customToken,
              status: 'success',
              createdAt: new Date()
            });
            await sendMessage(chatId,
              `✅ <b>Muvaffaqiyatli!</b>\n\nSaytga ruxsat berildi. Sayt ochiq bo'lgan brauzerga qayting!`,
              keyboardMarkup
            );
          } catch (e) {
            await sendMessage(chatId, "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
          }
        }
        return res.status(200).send('Login handled');
      }

      // To'lov buyrug'i (saytdan "Telegram orqali to'lash" bosilganda)
      if (param.startsWith('pay_')) {
        const planId = param.replace('pay_', ''); // monthly, quarterly, yearly

        // Narxni bazadan ol
        const pSnap = await db.collection('settings').doc('premium').get();
        const defaultPrices = { monthly: 30000, quarterly: 75000, yearly: 240000 };
        const defaultNames = { monthly: '1 Oylik', quarterly: '3 Oylik', yearly: '12 Oylik' };
        let price = defaultPrices[planId] || 30000;
        let planName = defaultNames[planId] || planId;

        if (pSnap.exists) {
          const plans = pSnap.data().plans || [];
          const found = plans.find(p => p.id === planId);
          if (found) { price = found.price; planName = found.name; }
        }

        // Chegirma tekshirish
        let finalPrice = price;
        let discountMsg = '';
        if (linkedUser && linkedUser.discountAvailable) {
          finalPrice = Math.round(price * 0.5);
          discountMsg = `\n\n🎉 <i>Sizda do'stingiz taklifi orqali <b>50% chegirma</b> mavjud!</i>\nNarx: <s>${price.toLocaleString()}</s> → <b>${finalPrice.toLocaleString()} so'm</b>`;
        }

        const msg = `💳 <b>Premium — ${planName}</b>${discountMsg || `\n\nNarx: <b>${finalPrice.toLocaleString()} so'm</b>`}\n\nQuyidagi kartaga to'lov qiling:\n\n💳 Karta: <code>9860350143333655</code>\n👤 Egasi: Ayyubxon Abdulazizov\n\n<b>👇 To'lov qilgach, to'lov chekini (skrinshotni) to'g'ridan-to'g'ri shu yerga rasm qilib yuboring!</b>\n\n⚡ Admin 5-30 daqiqa ichida tasdiqlaydi.`;

        await sendMessage(chatId, msg, keyboardMarkup);
        return res.status(200).send('Pay info sent');
      }

      // IQRO kodi /start orqali
      if (param.startsWith('IQRO-')) {
        incomingText = param;
      } else {
        // Oddiy /start
        if (linkedUser) {
          const premiumStatus = linkedUser.isPremium ? '✅ Premium faol' : '❌ Premium yo\'q';
          await sendMessage(chatId,
            `Assalomu alaykum, <b>${linkedUser.displayName || 'Foydalanuvchi'}</b>! 👋\n\nHolat: ${premiumStatus}\n\nQuyidagi tugmalardan foydalaning:`,
            keyboardMarkup
          );
        } else {
          await sendMessage(chatId,
            "<b>Xush kelibsiz!</b> 🎓\n\nIQRO — O'qituvchilar attestatsiyasi platformasi.\n\nBotdan to'liq foydalanish uchun saytda ro'yxatdan o'ting va Profilingizdagi <b>IQRO-...</b> kodingizni shu yerga yuboring.\n\n👉 https://iqro-t41p.vercel.app"
          );
        }
        return res.status(200).send('Start handled');
      }
    }

    // IQRO kod orqali ulanish
    if (incomingText.startsWith('IQRO-')) {
      const code = incomingText;
      const searchSnap = await db.collection('users').where('telegramCode', '==', code).get();

      if (searchSnap.empty) {
        await sendMessage(chatId,
          "❌ Bunday kodga ega foydalanuvchi topilmadi.\n\nKodingizni to'g'ri ko'chirganingizga ishonch hosil qiling.\n\nSaytdagi Profil sahifasida <b>Telegram Bot</b> bo'limiga kiring."
        );
      } else {
        const uDoc = searchSnap.docs[0];
        const uData = uDoc.data();
        await uDoc.ref.update({
          telegramChatId: chatId,
          telegramEnabled: true
        });
        await sendMessage(chatId,
          `✅ <b>Muvaffaqiyatli ulandi!</b>\n\nAssalomu alaykum, <b>${uData.displayName || 'Foydalanuvchi'}</b>! Platforma endi sizga shu yerda xizmat ko'rsatadi. 🎉`,
          keyboardMarkup
        );
      }
      return res.status(200).send('Code processed');
    }

    // Tizimga ulanmaganlar uchun blok
    if (!linkedUser) {
      await sendMessage(chatId,
        "Iltimos, botdan to'liq foydalanish uchun saytdan olingan <b>IQRO-...</b> kodingizni yuboring.\n\n👉 https://iqro-t41p.vercel.app"
      );
      return res.status(200).send('Not linked');
    }

    // ==========================================
    // 6. MENYU TUGMALARI
    // ==========================================
    if (incomingText === "🔑 Kodimni ko'rish" || incomingText === '/kodim') {
      const code = linkedUser.telegramCode || 'Kod topilmadi';
      await sendMessage(chatId,
        `🔑 Sizning platformadagi shaxsiy kodingiz:\n\n<code>${code}</code>\n\nAgar saytdan chiqib ketsangiz, saytning Profil sahifasidan aynan shu kod orqali o'z profilingizga qaytishingiz mumkin!`,
        keyboardMarkup
      );

    } else if (incomingText === "📊 Statistika" || incomingText === '/statistika') {
      const statSnap = await db.collection('userStats').doc(linkedUid).get();
      let score = 0, totalAnswered = 0, totalCorrect = 0;
      if (statSnap.exists) {
        const d = statSnap.data();
        score = d.totalScore || 0;
        totalAnswered = d.totalAnswered || 0;
        totalCorrect = d.totalCorrect || 0;
      }
      const acc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
      await sendMessage(chatId,
        `📊 <b>${linkedUser.displayName || 'Siz'}ning statistikasi:</b>\n\n⚡ Jami ball: <b>${score}</b>\n📝 Ishlangan: <b>${totalAnswered}</b> ta\n🎯 Aniqlik: <b>${acc}%</b>\n\nReytingda ko'tarilish uchun saytga kirib ko'proq test ishlang!`,
        keyboardMarkup
      );

    } else if (incomingText === "🔗 Do'stlarni taklif qilish" || incomingText === '/referal') {
      const refLink = `https://iqro-t41p.vercel.app/register?ref=${linkedUid}`;
      await sendMessage(chatId,
        `🔗 <b>Do'stlarni taklif qilish</b>\n\nQuyidagi havolani do'stlaringizga yuboring. Ular ro'yxatdan o'tsa va premium olsa, sizga avtomatik <b>15,000 so'm bonus</b> beriladi!\n\n${refLink}`,
        keyboardMarkup
      );

    } else if (incomingText === "💳 Premium Sotib Olish" || incomingText === '/premium') {
      const pSnap = await db.collection('settings').doc('premium').get();
      let basePrice = 30000;
      if (pSnap.exists) {
        const plans = pSnap.data().plans || [];
        const monthly = plans.find(p => p.months === 1 || p.id === 'monthly');
        if (monthly) basePrice = monthly.price;
      }

      let finalPrice = basePrice;
      let discountMsg = '';
      if (linkedUser.discountAvailable) {
        finalPrice = Math.round(basePrice * 0.5);
        discountMsg = `\n\n🎉 <i>Sizda <b>50% chegirma</b> mavjud!</i> Narx: <s>${basePrice.toLocaleString()}</s> → <b>${finalPrice.toLocaleString()} so'm</b>`;
      }

      const msg = `💳 <b>Premium Sotib Olish</b>${discountMsg || `\n\nOylik to'lov: <b>${finalPrice.toLocaleString()} so'm</b>`}\n\nQuyidagi kartaga to'lov qiling:\n\n💳 Karta: <code>9860350143333655</code>\n👤 Egasi: Ayyubxon Abdulazizov\n\n<b>👇 To'lov qilgach, chekni (skrinshotni) to'g'ridan-to'g'ri shu yerga rasm qilib yuboring!</b>\n\n⚡ Admin 5-30 daqiqa ichida tasdiqlaydi.`;

      await sendMessage(chatId, msg, keyboardMarkup);

    } else if (incomingText === "💬 Yordam" || incomingText === '/yordam') {
      await sendMessage(chatId,
        `💬 <b>Yordam xizmati</b>\n\nSavol yoki taklifingiz bo'lsa, xuddi shu yerga yozib yuboring.\n\nXabaringiz to'g'ridan-to'g'ri adminga yetkaziladi va biz tez orada sizga javob beramiz!`,
        keyboardMarkup
      );

    } else {
      // Noma'lum matn → adminga murojaat sifatida yo'naltirish
      if (adminId && chatId !== adminId) {
        await sendMessage(adminId,
          `📩 <b>Yangi murojaat!</b>\n\n👤 Foydalanuvchi: ${linkedUser.displayName || 'Ismsiz'}\n🆔 UID: ${linkedUid}\n📞 Tel: ${linkedUser.phone || '-'}\n\n💬 Matn:\n<i>${incomingText}</i>\n\n<i>(Javob berish uchun ushbu xabarga "Reply" qilib yozing)</i>`
        );
        await sendMessage(chatId,
          "✅ Xabaringiz adminga yetkazildi. Tez orada javob olamiz! 🙏",
          keyboardMarkup
        );
      } else if (chatId === adminId) {
        await sendMessage(chatId,
          "Kechirasiz, men bu buyruqni tushunmadim. Mijozga javob yozish uchun uning xabariga 'Reply' qilib yozing.",
          keyboardMarkup
        );
      } else {
        await sendMessage(chatId,
          "Kechirasiz, men bu buyruqni tushunmadim. Iltimos menyudagi tugmalardan foydalaning.",
          keyboardMarkup
        );
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send('Error: ' + error.message);
  }
}
