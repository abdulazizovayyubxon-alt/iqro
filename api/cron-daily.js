/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Cron Job — Kundalik avtomatik tekshiruvlar
 *  api/cron-daily.js
 * ════════════════════════════════════════════════════════════
 *
 *  Har kuni 1 marta ishga tushadi (Vercel Cron yoki tashqi trigger):
 *
 *  1. Premium muddat tekshiruvi:
 *     - premiumExpire o'tgan → isPremium = false (to'lov/promo/admin — bir xil)
 *     - premiumExpire = null (muddatsiz "Cheksiz Pro") → tegilmaydi
 *
 *  2. Eslatma yuborish:
 *     - Bepul oy (referral) tugashiga 3 kun qolganlar → notification
 *     - Trial tugashiga 1 kun qolganlar → notification
 *
 *  3. Chegirma muddati tugaganlarni tozalash:
 *     - referralDiscount > 0 va muddat tugagan → referralDiscount = 0
 *
 *  4. Obuna xabarlari — uchta lahza:
 *     - welcome   : ro'yxatdan o'tgandan 1-2 kun keyin
 *     - trialEnd  : sinov muddati ertaga tugaydi
 *     - expired   : Pro obuna tugadi (win-back)
 *
 *     KANAL: PUSH birlamchi (bepul), SMS esa faqat ZAXIRA.
 *     Har foydalanuvchiga ko'pi bilan BITTA xabar: push tokeni bo'lsa push,
 *     bo'lmasa — SMS (u ham `SMS_ENABLED=1` bo'lsagina; default O'CHIQ, ya'ni
 *     hozir tizim sof push rejimida ishlaydi va pul sarflamaydi).
 *
 *     ⚠️ PUSH MATNIDA TELEGRAM MANZILI — FAQAT SAYT FOYDALANUVCHISIGA.
 *     Push ilova orqali yetkaziladi, ya'ni Play build uchun u anti-steering
 *     qoidasi nuqtai nazaridan ilova ICHIDAGI xabarga yaqin turadi. Shuning
 *     uchun `users/{uid}.pushIsPlay` bayrog'i bo'lsa manzil matndan olib
 *     tashlanadi va push faqat ilovadagi /premium ekraniga olib boradi.
 *     Bayroqni `src/services/push.js` token ro'yxatdan o'tkazishda yozadi.
 *     SMS'da esa bunday cheklov YO'Q — u Google yurisdiksiyasidan tashqarida.
 *
 *     Sinash: `?secret=...&dry=1` — butun cron faqat O'QIYDI.
 *
 *  XAVFSIZLIK: CRON_SECRET env variable orqali himoyalangan
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { verifySecret, extractSecret } from './_shared.js';
import { TEXT as SMS_TEXT, normalizePhone, sendQueue, activeProvider, segments, isSmsEnabled } from './_sms.js';

const FREE_TRIAL_DAYS = 7;
const URGENCY_DAYS = 3;

// Bir ishga tushishda yuboriladigan xabarlar YUQORI CHEGARASI (push + SMS).
// Ikki sabab: (1) Vercel funksiyasining vaqti cheklangan, (2) sozlamadagi
// xato (masalan bayroq yozilmay qolishi) bir kechada butun SMS balansini yeb
// qo'ymasligi kerak. Chegaradan oshgani ertangi ishga tushishda yuboriladi —
// bayroqlar qo'yilmagani uchun ular navbatda qoladi.
const NOTIFY_MAX_PER_RUN = Number(process.env.NOTIFY_MAX_PER_RUN || 300);

// Ro'yxatdan o'tgandan keyin xush kelibsiz xabari yuboriladigan oyna (kun).
// Bir kunlik emas, IKKI kunlik: cron bir marta o'tkazib yuborilsa ham
// (deploy, Vercel nosozligi) foydalanuvchi tushib qolmaydi. Takror yuborishni
// `notifyWelcomeSent` bayrog'i to'xtatadi.
const WELCOME_WINDOW = [1, 2];

// Push chaqiruvidagi token chegarasi (FCM sendEachForMulticast)
const FCM_BATCH = 500;

// ── Push matnlari ────────────────────────────────────────────────────────
//
// `body(contact)` — `contact` SAYT foydalanuvchisida Telegram manzili,
// Play ilovasida esa BO'SH satr. Ya'ni bir xil matn ikki xil auditoriyaga
// mos keladi va Play build'ga hech qachon tashqi to'lov kanali yuborilmaydi.
// Til `users/{uid}.pushLang` dan (push yoqilganda yoziladi) — cron-reminder.js
// bilan bir xil manba.
const PUSH_TEXT = {
  uz: {
    welcome: {
      title: 'Zehin — xush kelibsiz',
      body: (c) => `Tayyorgarlik rejangiz tayyor. Pro obuna imkoniyatlari${c ? `: ${c}` : ' bilan tanishing.'}`,
    },
    trialEnd: {
      title: 'Sinov muddati ertaga tugaydi',
      body: (c) => `Barcha savollar va tahlil ochiq qolishi uchun Pro obunani rasmiylashtiring${c ? `: ${c}` : '.'}`,
    },
    expired: {
      title: 'Pro obunangiz tugadi',
      body: (c) => `Uzaytirsangiz to'liq baza va tahlil qaytadi${c ? `. Aloqa: ${c}` : '.'}`,
    },
  },
  ru: {
    welcome: {
      title: 'Zehin — добро пожаловать',
      body: (c) => `Ваш план подготовки готов. Узнайте о подписке Pro${c ? `: ${c}` : '.'}`,
    },
    trialEnd: {
      title: 'Пробный период заканчивается завтра',
      body: (c) => `Оформите подписку Pro, чтобы сохранить доступ ко всем вопросам и разбору${c ? `: ${c}` : '.'}`,
    },
    expired: {
      title: 'Подписка Pro закончилась',
      body: (c) => `Продлите, чтобы вернуть полную базу и разбор${c ? `. Связь: ${c}` : '.'}`,
    },
  },
  en: {
    welcome: {
      title: 'Welcome to Zehin',
      body: (c) => `Your study plan is ready. Learn about Pro${c ? `: ${c}` : '.'}`,
    },
    trialEnd: {
      title: 'Your trial ends tomorrow',
      body: (c) => `Get Pro to keep access to every question and the analysis${c ? `: ${c}` : '.'}`,
    },
    expired: {
      title: 'Your Pro subscription ended',
      body: (c) => `Renew to bring back the full question base and analysis${c ? `. Contact: ${c}` : '.'}`,
    },
  },
};

// Push matnidagi aloqa manzili — SMS qatlami bilan BITTA manba (SMS_CONTACT)
const CONTACT = process.env.SMS_CONTACT || 't.me/zehinuz';

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
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
    dbInstance = getFirestore();
  }
  return dbInstance;
}

export default async function handler(req, res) {
  // ── Xavfsizlik tekshiruvi — DENY BY DEFAULT ──
  // AVVAL: `secret !== process.env.CRON_SECRET`. CRON_SECRET sozlanmagan bo'lsa
  // ikkala tomon ham `undefined` bo'lib, shart FALSE qaytardi va endpoint BUTUNLAY
  // OCHIQ qolardi — u esa hamma foydalanuvchining isPremium holatini o'zgartiradi.
  // verifySecret() env bo'sh bo'lsa hech qachon ruxsat bermaydi + doimiy vaqtda taqqoslaydi.
  if (!verifySecret(extractSecret(req), process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query?.dry === '1';
  const db = getDb();
  const now = new Date();
  const results = {
    premiumExpired: 0,
    remindersSent: 0,
    discountsCleared: 0,
    notify: {
      queued: { welcome: 0, trialEnd: 0, expired: 0 },
      // Kanal bo'yicha taqsimot — push bepul, sms pullik
      channel: { push: 0, sms: 0 },
      skipped: { noChannel: 0, optOut: 0, alreadySent: 0, capped: 0 },
      pushSent: 0,
      smsSent: 0,
      failed: 0,
      smsProvider: activeProvider(),
      smsParts: 0,       // taxminiy SMS bo'laklari — YAGONA pullik ko'rsatkich
    },
    errors: [],
  };

  // Navbat skanerlash davomida yig'iladi, yuborish esa OXIRIDA bo'ladi:
  // shunda Firestore o'qishi FCM/provayder javobini kutib turmaydi va butun
  // navbat bitta joyda cheklanadi/hisoblanadi.
  /** @type {Array<{uid:string, kind:string, flag:object, channel:'push'|'sms', tokens?:string[], title?:string, body?:string, phone?:string, text?:string}>} */
  const queue = [];
  // Bir ishga tushishda bitta odam KO'PI BILAN BITTA xabar oladi. Chegara holat:
  // 1-2 kunlik promo bilan Pro olgan yangi foydalanuvchining obunasi aynan
  // xush kelibsiz oynasida tugaydi — o'shanda ikkala shart ham bajarilib,
  // ikkita xabar ketardi.
  const queuedUids = new Set();

  /**
   * Navbatga qo'shish — kanal tanlash va barcha umumiy tekshiruvlar shu yerda.
   *
   * KANAL TARTIBI: push (bepul) → SMS (pullik, faqat token bo'lmasa va
   * SMS_ENABLED=1 bo'lsa). Ikkalasi ham yo'q bo'lsa `noChannel` deb sanaladi
   * va bayroq QO'YILMAYDI — odam keyinroq push yoqsa, xabarni o'shanda oladi.
   *
   * `flag` — xabar haqiqatan ketgandan KEYIN `users/{uid}` ga yoziladigan
   * takrorlanmaslik bayrog'i (oldindan emas: yozib qo'yib yubormaslikdan
   * ko'ra, yuborib yozolmaslik afzal — birinchisida odam xabarni umuman
   * olmaydi va buni hech kim sezmaydi).
   */
  const queueNotify = (uid, data, kind, flag) => {
    if (queuedUids.has(uid)) { results.notify.skipped.alreadySent++; return; }
    // Yagona opt-out — kanaldan QAT'I NAZAR. Foydalanuvchi "obuna xabarlarini
    // istamayman" deydi, "SMS emas, push bo'lsin" demaydi.
    if (data.billingNotifyOptOut === true) { results.notify.skipped.optOut++; return; }
    if (queue.length >= NOTIFY_MAX_PER_RUN) { results.notify.skipped.capped++; return; }

    const tokens = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];

    if (tokens.length > 0) {
      const lang = PUSH_TEXT[data.pushLang] ? data.pushLang : 'uz';
      const tpl = PUSH_TEXT[lang][kind];
      // Play ilovasidan ro'yxatdan o'tgan tokenga tashqi to'lov kanalini
      // YUBORMAYMIZ — matn ilova ichidagi /premium ekraniga yo'naltiradi.
      const contact = data.pushIsPlay === true ? '' : CONTACT;
      queue.push({ uid, kind, flag, channel: 'push', tokens, title: tpl.title, body: tpl.body(contact) });
      results.notify.channel.push++;
    } else if (isSmsEnabled()) {
      const phone = normalizePhone(data.phone);
      if (!phone) { results.notify.skipped.noChannel++; return; }
      const text = SMS_TEXT[kind]();
      queue.push({ uid, kind, flag, channel: 'sms', phone, text });
      results.notify.channel.sms++;
      results.notify.smsParts += segments(text);
    } else {
      // Push tokeni yo'q, SMS esa o'chiq — hozircha yetkazib bo'lmaydi.
      results.notify.skipped.noChannel++;
      return;
    }

    queuedUids.add(uid);
    results.notify.queued[kind]++;
  };

  try {

    // ═══ 1. PREMIUM MUDDATI TEKSHIRUVI ═══
    //
    // ⚠️ AUDIT 2026-08-06, T-1 BAND — bu yerda `premiumPlan === 'paid'` bo'lgan
    // obunalar ATAYLAB o'tkazib yuborilardi ("to'langan premium — tegmaymiz").
    // Natijada to'langan obuna SERVERDA hech qachon tugamasdi, mijoz esa uni
    // o'zi tugata olmasdi: AuthContext.jsx:241 `{isPremium:false}` yozishga
    // urinadi, lekin `isPremium`/`premiumPlan` firestore.rules'dagi
    // protectedUserFields() ro'yxatida (audit 2026-08-05, 1-band) → yozuv rad
    // etiladi va `.catch(console.warn)` bilan jimgina yutiladi.
    //
    // Oqibati: `users/{uid}.isPremium` abadiy `true` qolardi →
    // firestore.rules `hasContentAccess()` va api/get-questions.js ikkalasi ham
    // ruxsat berardi → bir oy to'lagan odam ~45k savollik bazani MANGU olardi.
    //
    // Endi muddat manbai bitta: `premiumExpire`. To'lov, promo va admin — uchalasi
    // ham bir xil qoidaga bo'ysunadi (AuthContext.jsx:235 dagi izoh shuni aytadi).
    // MUDDATSIZ obuna (`durationMonths: 999` → `premiumExpire: null`) quyidagi
    // `if (data.premiumExpire)` guard'i tufayli TEGILMAYDI — mavjud "Cheksiz Pro"
    // egalari buzilmaydi.
    const premiumUsers = await db.collection('users')
      .where('isPremium', '==', true)
      .get();

    // Yozuvlar PARTIYALAB bajariladi: istisno olib tashlangach birinchi ishga
    // tushishda ancha yig'ilib qolgan muddati o'tgan obunalar bir vaqtda
    // tuzatiladi — ketma-ket `await` bo'lsa Vercel funksiyasi timeout'ga tushardi.
    //
    // commit XATOSI butun cron'ni to'xtatmaydi: u ushlanadi va `results.errors`ga
    // yoziladi, keyingi partiya davom etadi. Aks holda bitta o'chirilgan hujjat
    // 2- va 3-bosqichni (eslatmalar, chegirma tozalash) ham yiqitardi.
    // Hisoblagich FAQAT muvaffaqiyatli commit'dan keyin oshadi.
    let batch = db.batch();
    let pendingIds = [];
    const flush = async () => {
      if (pendingIds.length === 0) return;
      const count = pendingIds.length;
      const firstId = pendingIds[0];
      // ?dry=1 — butun cron FAQAT O'QIYDI. SMS navbatini xavfsiz ko'rish uchun
      // shart: aks holda oldindan ko'rish paytida obunalar tugatilib, keyingi
      // HAQIQIY ishga tushishda bu odamlar `isPremium == true` so'roviga
      // tushmasdi va win-back SMS'i butunlay yo'qolardi.
      if (dryRun) { batch = db.batch(); pendingIds = []; return; }
      try {
        await batch.commit();
        results.premiumExpired += count;
      } catch (e) {
        results.errors.push(`Expire partiyasi (${count} ta, ${firstId}...): ${e.message}`);
      }
      batch = db.batch();
      pendingIds = [];
    };

    for (const userDoc of premiumUsers.docs) {
      const data = userDoc.data();

      // premiumExpire bormi va o'tganmi? (null = muddatsiz → tegilmaydi)
      if (!data.premiumExpire) continue;

      const expDate = new Date(data.premiumExpire);
      // Buzilgan sana satri → Invalid Date → taqqoslash false → o'tkazib yuboriladi.
      // Noaniq holatda obunani O'CHIRMAYMIZ (to'lagan odamni jazolamaslik).
      if (!(expDate < now)) continue;

      batch.update(userDoc.ref, {
        isPremium: false,
        premiumPlan: 'expired',
      });
      pendingIds.push(userDoc.id);

      // ── Win-back SMS ──
      // Aynan shu lahza — obuna tugagan kun. Bu so'rov `isPremium == true`
      // bo'yicha, ya'ni hujjat bir marta tushadi va keyin bayroq almashadi;
      // shunga qaramay `notifyExpiredFor` ni saqlaymiz, chunki foydalanuvchi
      // qayta obuna bo'lib yana tugatsa YANGI muddat bo'yicha yana bir marta
      // yuborilishi kerak (bir xil sanaga ikki marta emas).
      if (data.notifyExpiredFor === data.premiumExpire) {
        results.notify.skipped.alreadySent++;
      } else {
        queueNotify(userDoc.id, data, 'expired', { notifyExpiredFor: data.premiumExpire });
      }

      if (pendingIds.length >= 400) await flush();
    }
    await flush();

    // ═══ 2. ESLATMA YUBORISH ═══
    // Masshtab: barcha foydalanuvchini bir vaqtda xotiraga YUKLAMAYMIZ — 500 tadan
    // sahifalab o'qiymiz (aks holda o'n minglab user'da Vercel funksiyasi OOM/timeout bo'lardi).
    // Har foydalanuvchi bo'yicha mantiq aynan o'zgarishsiz.
    const USER_PAGE = 500;
    let lastUserDoc = null;
    while (true) {
      let uq = db.collection('users').orderBy('__name__').limit(USER_PAGE);
      if (lastUserDoc) uq = uq.startAfter(lastUserDoc);
      const usersBatch = await uq.get();
      if (usersBatch.empty) break;

      for (const userDoc of usersBatch.docs) {
        const data = userDoc.data();
        const userId = userDoc.id;

        // Ro'yxatdan o'tgandan beri o'tgan kunlar — quyidagi uchta blok ham
        // shundan foydalanadi, shuning uchun bir marta hisoblanadi.
        const createdAt = data.createdAt
          ? (data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
          : null;
        const daysSinceReg = createdAt && !isNaN(createdAt.getTime())
          ? Math.floor((now - createdAt) / 86400000)
          : null;

        // A. Referral bepul oyi tugashiga 3 kun qolganlar
        if (data.freeMonthExpire && !data.reminderSent) {
          const freeEnd = new Date(data.freeMonthExpire);
          const daysToExpire = Math.ceil((freeEnd - now) / 86400000);

          if (daysToExpire <= 3 && daysToExpire > 0) {
            try {
              if (!dryRun) {
                await db.collection('users').doc(userId).collection('notifications').add({
                  type: 'premium_expiring',
                  title: '⏰ Bepul Premium tugamoqda!',
                  message: `Sizning bepul Premium muddatingiz ${daysToExpire} kunda tugaydi. Cheksiz davom etish uchun obunani yangilang!`,
                  read: false,
                  date: now.toISOString(),
                  createdAt: now.toISOString(),
                });
                await userDoc.ref.update({ reminderSent: true });
              }
              results.remindersSent++;
            } catch (e) {
              results.errors.push(`Reminder ${userId}: ${e.message}`);
            }
          }
        }

        // B. Trial tugashiga 1 kun qolganlar
        if (daysSinceReg !== null && !data.isPremium && !data.trialReminderSent) {
          if (daysSinceReg === FREE_TRIAL_DAYS - 1) {
            try {
              if (!dryRun) {
                await db.collection('users').doc(userId).collection('notifications').add({
                  type: 'trial_expiring',
                  title: '⚡ Sinov muddati ertaga tugaydi!',
                  message: 'Ertaga sinov muddatingiz tugaydi. Premium obunani faollashtiring — barcha funksiyalar cheksiz!',
                  read: false,
                  date: now.toISOString(),
                  createdAt: now.toISOString(),
                });
                await userDoc.ref.update({ trialReminderSent: true });
              }
              results.remindersSent++;
            } catch (e) {
              results.errors.push(`Trial reminder ${userId}: ${e.message}`);
            }
          }
        }

        // ── C. Xush kelibsiz SMS (ro'yxatdan 1-2 kun keyin) ──
        // Ro'yxatdan o'tgan ZAHOTI emas: birinchi kun odam ilovani ko'rib
        // chiqadi, sotuv xabari o'sha payt bezovta qiladi. Ikkinchi kuni esa
        // qiziqish saqlanib, kanal kerak bo'ladi. Pro'si borlarga
        // yuborilmaydi — ular uchun bu shunchaki shovqin.
        if (
          daysSinceReg !== null
          && !data.isPremium
          && daysSinceReg >= WELCOME_WINDOW[0]
          && daysSinceReg <= WELCOME_WINDOW[1]
        ) {
          if (data.notifyWelcomeSent) results.notify.skipped.alreadySent++;
          else queueNotify(userId, data, 'welcome', { notifyWelcomeSent: true });
        }

        // ── D. Sinov muddati ertaga tugaydi (SMS) ──
        // Ilova ichidagi B bloki bilan bir lahza, lekin ALOHIDA bayroq bilan:
        // biri yozilmay qolsa ikkinchisi baribir ishlashi kerak.
        if (
          daysSinceReg !== null
          && !data.isPremium
          && daysSinceReg === FREE_TRIAL_DAYS - 1
        ) {
          if (data.notifyTrialSent) results.notify.skipped.alreadySent++;
          else queueNotify(userId, data, 'trialEnd', { notifyTrialSent: true });
        }
      }

      lastUserDoc = usersBatch.docs[usersBatch.docs.length - 1];
      if (usersBatch.size < USER_PAGE) break;
    }

    // ═══ 3. CHEGIRMA MUDDATI TOZALASH ═══
    const discountUsers = await db.collection('users')
      .where('referralDiscount', '>', 0)
      .get();

    for (const userDoc of discountUsers.docs) {
      const data = userDoc.data();
      if (!data.createdAt) continue;

      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt);
      const daysSinceReg = Math.floor((now - createdAt) / 86400000);

      // Trial + urgency davri o'tgan — chegirma bekor
      if (daysSinceReg >= FREE_TRIAL_DAYS + URGENCY_DAYS) {
        try {
          if (!dryRun) {
            await userDoc.ref.update({
              referralDiscount: 0,
              discountExpired: true,
              discountExpiredAt: now.toISOString(),
            });
          }
          results.discountsCleared++;
        } catch (e) {
          results.errors.push(`Discount ${userDoc.id}: ${e.message}`);
        }
      }
    }

    // ═══ 4. NAVBATNI YUBORISH ═══
    // Skanerlash tugagach — bitta joyda. Bayroq FAQAT xabar qabul qilingandan
    // keyin yoziladi: aks holda FCM/provayder ishlamay turgan kuni hamma
    // bayroq qo'yilib, odamlar xabarni umuman olmasdi.
    if (queue.length > 0 && !dryRun) {
      const pushItems = queue.filter(q => q.channel === 'push');
      const smsItems = queue.filter(q => q.channel === 'sms');

      // ── Push ──
      // Matn foydalanuvchiga xos, shuning uchun multicast bitta odamning
      // qurilmalari bo'yicha guruhlanadi (cron-reminder.js bilan bir xil naqsh).
      if (pushItems.length > 0) {
        const messaging = getMessaging();
        for (const item of pushItems) {
          try {
            let ok = 0;
            for (let i = 0; i < item.tokens.length; i += FCM_BATCH) {
              const resp = await messaging.sendEachForMulticast({
                tokens: item.tokens.slice(i, i + FCM_BATCH),
                notification: { title: item.title, body: item.body },
                // Uchala xabar ham obuna haqida — to'g'ridan-to'g'ri Pro ekraniga.
                // Play build'da bu "yopiq holat" + promokod maydoni bo'ladi.
                webpush: { fcmOptions: { link: '/premium' } },
              });
              ok += resp.successCount;
            }
            if (ok > 0) {
              results.notify.pushSent++;
              await db.collection('users').doc(item.uid).update(item.flag);
            } else {
              // Barcha token rad etildi (eskirgan/o'chirilgan qurilma).
              // Bayroq qo'yilmaydi — odam push'ni qayta yoqsa xabarni oladi.
              results.notify.failed++;
            }
          } catch (e) {
            results.notify.failed++;
            if (results.errors.length < 40) results.errors.push(`Push ${item.uid}: ${e.message}`);
          }
        }
      }

      // ── SMS (zaxira) ──
      if (smsItems.length > 0) {
        const r = await sendQueue(smsItems, {
          onSent: (item) => db.collection('users').doc(item.uid).update(item.flag),
        });
        results.notify.smsSent = r.sent;
        results.notify.failed += r.failed;
        results.notify.smsProvider = r.provider;
        if (r.errors.length) results.errors.push(...r.errors.map(e => `SMS ${e}`));
      }
    }

  } catch (err) {
    console.error('Cron job error:', err);
    results.errors.push(`Global: ${err.message}`);
  }

  console.log('Cron daily results:', JSON.stringify(results));
  return res.status(200).json({
    ok: true,
    dryRun,
    timestamp: now.toISOString(),
    ...results,
    // Quruq rejimda navbatning namunasi — kanal, matn va raqam to'g'riligini
    // yuborishdan OLDIN ko'rish uchun.
    ...(dryRun ? {
      notifySample: queue.slice(0, 10).map(q => ({
        kind: q.kind,
        channel: q.channel,
        ...(q.channel === 'push' ? { title: q.title, body: q.body } : { phone: q.phone, text: q.text }),
      })),
    } : {}),
  });
}

