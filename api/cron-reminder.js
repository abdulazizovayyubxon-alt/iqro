/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Cron — Kunlik o'quv rejasi eslatmasi (push)
 *  api/cron-reminder.js
 * ════════════════════════════════════════════════════════════
 *
 * VAQT: kuniga BIR marta, 14:00 UTC = 19:00 Toshkent.
 * O'zbekistonda yagona vaqt mintaqasi (UTC+5, yozgi vaqt yo'q), shuning
 * uchun bitta cron butun auditoriya uchun to'g'ri — foydalanuvchi bo'yicha
 * mintaqa hisobi KERAK EMAS. Kechqurun tanlangan: o'qituvchi ish kunidan
 * keyin 15-20 daqiqa ajrata oladi, ertalabki eslatma esa dars vaqtiga
 * tushardi.
 *
 * KIMGA — to'rtta shart BIRGALIKDA:
 *   1. `users/{uid}.fcmTokens` bor (foydalanuvchi push'ga o'zi ruxsat bergan)
 *   2. `users/{uid}.dailyReminder !== false` (sozlamalardan o'chirmagan)
 *   3. imtihon sanasi belgilangan va hali kelmagan — eslatma matni sanoqqa
 *      asoslanadi, sanasiz u ma'nosiz bo'lardi
 *   4. oxirgi 30 kun ichida faol bo'lgan — tashlab ketilgan hisobni bezovta
 *      qilmaymiz
 *
 * YUBORILMAYDI: bugungi maqsad allaqachon bajarilgan bo'lsa, imtihon AYNAN
 * bugun bo'lsa va bugun allaqachon yuborilgan bo'lsa (`lastDailyPush`).
 * Ya'ni bir foydalanuvchi kuniga ko'pi bilan BITTA xabar oladi va reja
 * bajarilgan kuni umuman bezovta qilinmaydi.
 *
 * XAVFSIZLIK: CRON_SECRET.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;  // UTC+5, yozgi vaqt yo'q
const INACTIVE_DAYS = 30;                        // shundan uzoq jim turgan hisob
const USER_PAGE = 300;
const FCM_BATCH = 500;                           // sendEachForMulticast chegarasi
const DEFAULT_TARGET = 20;                       // dailyGoal.target zaxirasi
const SECONDS_PER_Q = 45;                        // DiagnosticsEngine bilan bir xil

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    if (getApps().length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(raw);
      } catch {
        serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString());
      }
      initializeApp({ credential: cert(serviceAccount) });
    }
    dbInstance = getFirestore();
  }
  return dbInstance;
}

/** Toshkent kalendar kuni — 'YYYY-MM-DD' */
const tashkentDay = (ms = Date.now()) =>
  new Date(ms + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);

/** Imtihongacha qolgan KALENDAR kunlari (Toshkent kuni bo'yicha) */
function daysUntil(examDateValue) {
  if (!examDateValue) return null;
  const exam = examDateValue?.toDate ? examDateValue.toDate() : new Date(examDateValue);
  if (isNaN(exam.getTime())) return null;
  const a = tashkentDay(exam.getTime());
  const b = tashkentDay();
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

// ── Matn ──────────────────────────────────────────────────────────────────
// Sokin va aniq ohang: ayblov yo'q, undov belgisi yo'q, faqat raqam va
// keyingi qadam. Til `users/{uid}.pushLang` dan (push yoqilganda yoziladi).
const TEXT = {
  uz: {
    title: (d) => `Imtihongacha ${d} kun`,
    fresh: (n, m) => `Bugungi reja: ${n} savol, taxminan ${m} daqiqa.`,
    partial: (done, n) => `Bugun ${done} ta savol ishlandi. Rejani yakunlash uchun yana ${n} ta qoldi.`,
  },
  ru: {
    title: (d) => `До экзамена ${d} дн.`,
    fresh: (n, m) => `План на сегодня: ${n} вопросов, примерно ${m} минут.`,
    partial: (done, n) => `Сегодня решено ${done} вопросов. До завершения плана осталось ${n}.`,
  },
  en: {
    title: (d) => `${d} days until the exam`,
    fresh: (n, m) => `Today's plan: ${n} questions, about ${m} minutes.`,
    partial: (done, n) => `${done} questions done today. ${n} left to finish the plan.`,
  },
};

export default async function handler(req, res) {
  const secret = req.headers['authorization']?.replace('Bearer ', '') || req.query?.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query?.dry === '1';
  const db = getDb();
  const today = tashkentDay();
  const inactiveCutoff = new Date(Date.now() - INACTIVE_DAYS * 86400000).toISOString();

  const out = {
    scanned: 0,
    eligible: 0,
    sent: 0,
    skipped: { noToken: 0, optedOut: 0, noExam: 0, examPassed: 0, inactive: 0, goalDone: 0, alreadySent: 0 },
    errors: [],
  };

  // { token → {title, body} } — bitta foydalanuvchida bir nechta qurilma bo'lishi mumkin
  const queue = [];

  try {
    let lastDoc = null;
    while (true) {
      let q = db.collection('users').orderBy('__name__').limit(USER_PAGE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const page = await q.get();
      if (page.empty) break;

      for (const userDoc of page.docs) {
        out.scanned++;
        const u = userDoc.data();

        const tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens.filter(Boolean) : [];
        if (tokens.length === 0) { out.skipped.noToken++; continue; }
        if (u.dailyReminder === false) { out.skipped.optedOut++; continue; }
        if (u.lastDailyPush === today) { out.skipped.alreadySent++; continue; }

        const daysLeft = daysUntil(u.examDate);
        if (daysLeft === null) { out.skipped.noExam++; continue; }
        // Imtihon bugun yoki o'tgan — eslatma o'rinsiz
        if (daysLeft <= 0) { out.skipped.examPassed++; continue; }

        // Statistika: faollik va bugungi maqsad
        let stats = null;
        try {
          const s = await db.collection('userStats').doc(userDoc.id).get();
          stats = s.exists ? s.data() : null;
        } catch (e) {
          out.errors.push(`stats ${userDoc.id}: ${e.message}`);
          continue;
        }
        if (!stats?.lastActiveAt || stats.lastActiveAt < inactiveCutoff) {
          out.skipped.inactive++;
          continue;
        }

        // dailyGoal.date `toDateString()` formatida (AppContext), bugungi
        // Toshkent kuni bilan to'g'ridan-to'g'ri solishtirib bo'lmaydi —
        // shuning uchun sanani normallashtiramiz.
        const dg = stats.dailyGoal || {};
        const goalDay = dg.date ? tashkentDay(Date.parse(dg.date)) : null;
        const isToday = goalDay === today;
        const target = dg.target || DEFAULT_TARGET;
        const answered = isToday ? (dg.answered || 0) : 0;
        if (isToday && (dg.completed || answered >= target)) { out.skipped.goalDone++; continue; }

        const t = TEXT[u.pushLang] || TEXT.uz;
        const remaining = Math.max(1, target - answered);
        const body = answered > 0
          ? t.partial(answered, remaining)
          : t.fresh(target, Math.max(1, Math.round((target * SECONDS_PER_Q) / 60)));

        out.eligible++;
        queue.push({ uid: userDoc.id, tokens, title: t.title(daysLeft), body });
      }

      lastDoc = page.docs[page.docs.length - 1];
      if (page.size < USER_PAGE) break;
    }

    if (dryRun) {
      return res.status(200).json({ ok: true, dryRun: true, sample: queue.slice(0, 5), ...out });
    }

    // ── Yuborish ──
    // Matn foydalanuvchiga xos, shuning uchun multicast bitta foydalanuvchining
    // qurilmalari bo'yicha guruhlanadi. FCM chaqiruvlari 500 tokenlik bo'laklarda.
    const messaging = getMessaging();
    for (const item of queue) {
      try {
        let ok = 0;
        for (let i = 0; i < item.tokens.length; i += FCM_BATCH) {
          const resp = await messaging.sendEachForMulticast({
            tokens: item.tokens.slice(i, i + FCM_BATCH),
            notification: { title: item.title, body: item.body },
            webpush: { fcmOptions: { link: '/analysis' } },
          });
          ok += resp.successCount;
        }
        if (ok > 0) {
          out.sent++;
          // Kunlik qulf — qayta ishga tushirilsa ham ikkinchi marta yubormaydi
          await db.collection('users').doc(item.uid).update({ lastDailyPush: today });
        }
      } catch (e) {
        out.errors.push(`push ${item.uid}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('cron-reminder error:', err);
    out.errors.push(`Global: ${err.message}`);
  }

  console.log('cron-reminder:', JSON.stringify(out));
  return res.status(200).json({ ok: true, day: today, ...out });
}
