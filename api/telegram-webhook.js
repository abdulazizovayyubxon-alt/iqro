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
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
    let serviceAccount;
    try {
      // Avval oddiy JSON sifatida o'qishga harakat qilamiz
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
      // O'xshamasa base64 dan ochamiz
      serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return { db: getFirestore(), auth: getAuth() };
}

// ── Bot token faqat env dan olinadi ──
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN env o\'zgaruvchisi topilmadi!');
}
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

      if (data.startsWith('approve_pay_') || data.startsWith('reject_pay_')) {
        const parts = data.split('_');
        const action = parts[0] + '_' + parts[1]; // 'approve_pay' or 'reject_pay'
        
        let uid, planId;
        if (action === 'approve_pay') {
          planId = parts[parts.length - 1]; // monthly, quarterly, yearly
          uid = parts.slice(2, parts.length - 1).join('_');
        } else {
          uid = parts.slice(2).join('_');
        }

        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return res.status(200).send('User not found');
        const userData = userSnap.data();

        if (action === 'approve_pay') {
          // Tarif muddatini aniqlash
          const settingsDoc = await db.collection('settings').doc('premium').get();
          const defaultDurations = { monthly: 1, quarterly: 3, yearly: 12 };
          let durationMonths = defaultDurations[planId] || 1;

          if (settingsDoc.exists) {
            const plans = settingsDoc.data().plans || [];
            const found = plans.find(p => p.id === planId);
            if (found && found.durationMonths) durationMonths = found.durationMonths;
          }

          const exp = new Date();
          exp.setMonth(exp.getMonth() + durationMonths);

          await userRef.update({
            isPremium: true,
            premiumPlan: 'paid',
            premiumExpire: exp.toISOString(),
            premiumSince: new Date().toISOString(),
            premiumMethod: 'telegram_manual',
            discountAvailable: false,
            discountExpired: true,
            reminderSent: false,
            // Promo chegirma bir martalik — to'lovda sarflanadi
            promoDiscount: null
          });

          // pendingPayments ni o'chirish yoki completed qilish
          await db.collection('pendingPayments').doc(uid).update({
            status: 'completed',
            confirmedAt: new Date().toISOString()
          }).catch(() => {});

          // To'lovni payments ro'yxatiga yozish
          await db.collection('payments').add({
            userId: uid,
            planId: planId,
            method: 'telegram_manual',
            status: 'completed',
            chatId: adminChatId,
            createdAt: new Date().toISOString()
          });

          // Mijozga xabar yuborish
          if (userData.telegramChatId) {
            await sendMessage(userData.telegramChatId,
              `🎉 <b>Tabriklaymiz!</b>\n\nTo'lovingiz tasdiqlandi va sizga <b>${durationMonths} oylik Premium</b> yoqildi! 🏆\n\nSaytga kirib bemalol ishlatavering!\n\n👉 https://toifapro-t41p.vercel.app`,
              keyboardMarkup
            );
          }

          // Referralga (do'stiga) mukofot berish
          if (userData.referredBy) {
            const referrerId = userData.referredBy;
            const referrerRef = db.collection('users').doc(referrerId);
            const refSnap = await referrerRef.get();
            if (refSnap.exists) {
              const refData = refSnap.data();
              const currentCount = refData.referralCount || 0;
              if (currentCount < 5) {
                await referrerRef.update({
                  referralBonus: (refData.referralBonus || 0) + 15000,
                  referralCount: currentCount + 1
                });

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
            // editMessageCaption bo'lmasa editMessageText
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

        } else if (action === 'reject_pay') {
          await db.collection('pendingPayments').doc(uid).update({
            status: 'rejected',
            rejectedAt: new Date().toISOString()
          }).catch(() => {});

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
          // Agar topilsa, lekin Firestore'da yo'q bo'lsa, yaratib qo'yamiz
          const docSnap = await db.collection('users').doc(userRecord.uid).get();
          if (!docSnap.exists) {
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
            // Agar bor bo'lsa, chatId ni yangilab qo'yamiz
            await docSnap.ref.update({
              telegramChatId: chatId,
              telegramEnabled: true
            });
          }
        } catch (e) {
          if (e.code === 'auth/user-not-found') {
            // Yangi Telegram ro'yxatdan o'tishlar uchun xavfsiz tasodifiy parol generatsiyasi
            const randomPassword = Array.from({ length: 18 }, () => {
              const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
              return chars[Math.floor(Math.random() * chars.length)];
            }).join('');

            userRecord = await auth.createUser({
              email: email,
              password: randomPassword,
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

    if (!text && !photo) return res.status(200).send('No text or photo');
    let incomingText = text ? text.trim() : '';

    // ==========================================
    // 3. ADMIN BUYRUQLARI
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
    // 4. /start va KODLAR
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

        // Chegirma tekshirish — referral va promo STACK qilinmaydi, kattasi olinadi
        let finalPrice = price;
        let discountMsg = '';
        const refPct = (linkedUser && linkedUser.referralDiscount) || 0;
        const promoPct = (linkedUser && linkedUser.promoDiscount && linkedUser.promoDiscount.percent) || 0;
        const bestPct = Math.max(refPct, promoPct);
        if (bestPct > 0) {
          finalPrice = Math.max(0, Math.round(price * (100 - bestPct) / 100));
          discountMsg = `\n🎉 <i>Sizda <b>${bestPct}% chegirma</b> mavjud!</i> Narx: <s>${price.toLocaleString()}</s> → <b>${finalPrice.toLocaleString()} so'm</b>`;
        }
        
        // Referral bonus keshbekini hisoblash
        if (linkedUser && linkedUser.referralBonus > 0) {
          finalPrice = Math.max(0, finalPrice - linkedUser.referralBonus);
          discountMsg += `\n🎁 <i>Sizda qo'shimcha keshbek bor!</i> Yakuniy narx: <b>${finalPrice.toLocaleString()} so'm</b>`;
        }

        // Kutilayotgan to'lovni bazaga yozamiz
        await db.collection('pendingPayments').doc(linkedUid).set({
          userId: linkedUid,
          planId,
          amount: finalPrice,
          chatId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          discountApplied: !!linkedUser?.discountAvailable,
        });

        const msg = `💳 <b>Premium — ${planName}</b>${discountMsg ? '\n' + discountMsg : ''}\n\nTo'lov summasi: <b>${finalPrice.toLocaleString()} so'm</b>\n\n━━━━━━━━━━━━━━━━\n💳 Karta raqami:\n<code>9860 3501 4333 3655</code>\n👤 Egasi: <b>Ayyubxon Abdulazizov</b>\n━━━━━━━━━━━━━━━━\n\n📌 <b>Qanday to'lash kerak:</b>\n1️⃣ Yuqoridagi kartaga <b>${finalPrice.toLocaleString()} so'm</b> o'tkazing\n2️⃣ To'lov muvaffaqiyatli amalga oshirilgach, to'lov chekini (rasmini) shu botga yuboring.\n\n⚡ Admin to'lovni tekshirib, premiumingizni yoqib beradi!`;

        await sendMessage(chatId, msg, keyboardMarkup);
        return res.status(200).send('Pay info sent');
      }

      // IQRO / TOIFAPRO kodi /start orqali
      if (param.startsWith('IQRO-') || param.startsWith('TOIFAPRO-')) {
        incomingText = param;
      } else {
        if (linkedUser) {
          const premiumStatus = linkedUser.isPremium ? '✅ Premium faol' : '❌ Premium yo\'q';
          await sendMessage(chatId,
            `Assalomu alaykum, <b>${linkedUser.displayName || 'Foydalanuvchi'}</b>! 👋\n\nHolat: ${premiumStatus}\n\nQuyidagi tugmalardan foydalaning:`,
            keyboardMarkup
          );
        } else {
          await sendMessage(chatId,
            "<b>Xush kelibsiz!</b> 🎓\n\nToifa Pro — O'qituvchilar attestatsiyasi platformasi.\n\nBotdan to'liq foydalanish uchun saytda ro'yxatdan o'tib va Profilingizdagi <b>TOIFAPRO-...</b> kodingizni shu yerga yuboring.\n\n👉 https://toifapro-t41p.vercel.app"
          );
        }
        return res.status(200).send('Start handled');
      }
    }

    // IQRO / TOIFAPRO kod orqali ulanish
    if (incomingText.startsWith('IQRO-') || incomingText.startsWith('TOIFAPRO-')) {
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
        "Iltimos, botdan to'liq foydalanish uchun saytdan olingan <b>TOIFAPRO-...</b> kodingizni yuboring.\n\n👉 https://toifapro-t41p.vercel.app"
      );
      return res.status(200).send('Not linked');
    }

    // ==========================================
    // 5. FOTO YUBORILGANDA (To'lov cheklari)
    // ==========================================
    if (photo) {
      // Admin sozlamasini tekshiramiz
      if (!adminId) {
        await sendMessage(chatId, "⚠️ Kechirasiz, to'lovlarni qabul qiluvchi admin sozlanmagan. Iltimos birozdan so'ng qayta yuboring yoki yordam bo'limiga murojaat qiling.");
        return res.status(200).send('Admin not configured');
      }

      // Foydalanuvchi tanlagan premium reja ma'lumotlarini qidiramiz
      let planId = 'monthly';
      let amount = 30000;
      
      const pendingSnap = await db.collection('pendingPayments').doc(linkedUid).get();
      if (pendingSnap.exists && pendingSnap.data().status === 'pending') {
        const pending = pendingSnap.data();
        planId = pending.planId || 'monthly';
        amount = pending.amount || 30000;
      }

      const fileId = photo[photo.length - 1].file_id;
      
      const caption = `💳 <b>Yangi To'lov Cheki!</b>\n\n` +
        `👤 Foydalanuvchi: <b>${linkedUser.displayName || 'Ismsiz'}</b>\n` +
        `📞 Telefon: <b>${linkedUser.phone || '-'}</b>\n` +
        `🆔 UID: <code>${linkedUid}</code>\n` +
        `📅 Tanlangan tarif: <b>${planId}</b> (Summa: ${amount.toLocaleString()} so'm)\n\n` +
        `Tasdiqlash uchun quyidagi tugmalarni bosing:`;

      const inline_keyboard = [
        [
          { text: "✅ Tasdiqlash", callback_data: `approve_pay_${linkedUid}_${planId}` },
          { text: "❌ Rad etish", callback_data: `reject_pay_${linkedUid}` }
        ]
      ];

      const sendPhotoResp = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          photo: fileId,
          caption: caption,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard }
        })
      });

      if (sendPhotoResp.ok) {
        await sendMessage(chatId,
          "To'lovingiz adminga tekshirish uchun yuborildi. Tasdiqlanishi bilanoq Premium yoqiladi ⚡",
          keyboardMarkup
        );
      } else {
        await sendMessage(chatId,
          "⚠️ Kechirasiz, chek rasmini yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.",
          keyboardMarkup
        );
      }
      return res.status(200).send('Photo processed');
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
      const refLink = `https://toifapro-t41p.vercel.app/register?ref=${linkedUid}`;
      await sendMessage(chatId,
        `🔗 <b>Do'stlarni taklif qilish</b>\n\nQuyidagi havolani do'stlaringizga yuboring. Ular ro'yxatdan o'tsa va premium olsa, sizga avtomatik <b>15,000 so'm bonus</b> beriladi!\n\n${refLink}`,
        keyboardMarkup
      );

    } else if (incomingText === "💳 Premium Sotib Olish" || incomingText === '/premium') {
      const pSnap = await db.collection('settings').doc('premium').get();
      let basePrice = 30000;
      let planId = 'monthly';
      if (pSnap.exists) {
        const plans = pSnap.data().plans || [];
        const monthly = plans.find(p => p.months === 1 || p.id === 'monthly');
        if (monthly) { basePrice = monthly.price; planId = monthly.id || 'monthly'; }
      }

      let finalPrice = basePrice;
      let discountLine = '';
      if (linkedUser.discountAvailable) {
        finalPrice = Math.round(basePrice * 0.5);
        discountLine = `\n🎉 <i>Sizda <b>50% chegirma</b> mavjud!</i> Narx: <s>${basePrice.toLocaleString()}</s> → <b>${finalPrice.toLocaleString()} so'm</b>`;
      }

      // Kutilayotgan to'lovni yozib qo'yamiz
      await db.collection('pendingPayments').doc(linkedUid).set({
        userId: linkedUid,
        planId,
        amount: finalPrice,
        chatId,
        createdAt: new Date().toISOString(),
        status: 'pending',
        discountApplied: !!linkedUser.discountAvailable,
      });

      const msg = `💳 <b>Premium Sotib Olish</b>${discountLine}\n\nTo'lov summasi: <b>${finalPrice.toLocaleString()} so'm</b>\n\n━━━━━━━━━━━━━━━━\n💳 Karta raqami:\n<code>9860 3501 4333 3655</code>\n👤 Egasi: <b>Ayyubxon Abdulazizov</b>\n━━━━━━━━━━━━━━━━\n\n📌 <b>Qanday to'lash kerak:</b>\n1️⃣ Yuqoridagi kartaga <b>${finalPrice.toLocaleString()} so'm</b> o'tkazing\n2️⃣ To'lov muvaffaqiyatli amalga oshirilgach, to'lov chekini (rasmini) shu botga yuboring.\n\n⚡ Admin to'lovni tekshirib, premiumingizni yoqib beradi!`;

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
    res.status(200).send('Error logged: ' + error.message);
  }
}
