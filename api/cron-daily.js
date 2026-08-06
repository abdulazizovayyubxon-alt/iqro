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
 *  XAVFSIZLIK: CRON_SECRET env variable orqali himoyalangan
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { verifySecret, extractSecret } from './_shared.js';

const FREE_TRIAL_DAYS = 7;
const URGENCY_DAYS = 3;

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

  const db = getDb();
  const now = new Date();
  const results = {
    premiumExpired: 0,
    remindersSent: 0,
    discountsCleared: 0,
    errors: [],
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

        // A. Referral bepul oyi tugashiga 3 kun qolganlar
        if (data.freeMonthExpire && !data.reminderSent) {
          const freeEnd = new Date(data.freeMonthExpire);
          const daysToExpire = Math.ceil((freeEnd - now) / 86400000);

          if (daysToExpire <= 3 && daysToExpire > 0) {
            try {
              await db.collection('users').doc(userId).collection('notifications').add({
                type: 'premium_expiring',
                title: '⏰ Bepul Premium tugamoqda!',
                message: `Sizning bepul Premium muddatingiz ${daysToExpire} kunda tugaydi. Cheksiz davom etish uchun obunani yangilang!`,
                read: false,
                date: now.toISOString(),
                createdAt: now.toISOString(),
              });
              await userDoc.ref.update({ reminderSent: true });
              results.remindersSent++;
            } catch (e) {
              results.errors.push(`Reminder ${userId}: ${e.message}`);
            }
          }
        }

        // B. Trial tugashiga 1 kun qolganlar
        if (data.createdAt && !data.isPremium && !data.trialReminderSent) {
          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt);
          const daysSinceReg = Math.floor((now - createdAt) / 86400000);

          if (daysSinceReg === FREE_TRIAL_DAYS - 1) {
            try {
              await db.collection('users').doc(userId).collection('notifications').add({
                type: 'trial_expiring',
                title: '⚡ Sinov muddati ertaga tugaydi!',
                message: 'Ertaga sinov muddatingiz tugaydi. Premium obunani faollashtiring — barcha funksiyalar cheksiz!',
                read: false,
                date: now.toISOString(),
                createdAt: now.toISOString(),
              });
              await userDoc.ref.update({ trialReminderSent: true });
              results.remindersSent++;
            } catch (e) {
              results.errors.push(`Trial reminder ${userId}: ${e.message}`);
            }
          }
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
          await userDoc.ref.update({
            referralDiscount: 0,
            discountExpired: true,
            discountExpiredAt: now.toISOString(),
          });
          results.discountsCleared++;
        } catch (e) {
          results.errors.push(`Discount ${userDoc.id}: ${e.message}`);
        }
      }
    }

  } catch (err) {
    console.error('Cron job error:', err);
    results.errors.push(`Global: ${err.message}`);
  }

  console.log('Cron daily results:', JSON.stringify(results));
  return res.status(200).json({
    ok: true,
    timestamp: now.toISOString(),
    ...results,
  });
}

