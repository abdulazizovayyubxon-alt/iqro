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
import { verifySecret, extractSecret } from './_shared.js';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;  // UTC+5, yozgi vaqt yo'q
const INACTIVE_DAYS = 30;                        // shundan uzoq jim turgan hisob
const USER_PAGE = 300;
const FCM_BATCH = 500;                           // sendEachForMulticast chegarasi
const DEFAULT_TARGET = 20;                       // dailyGoal.target zaxirasi
const SECONDS_PER_Q = 45;                        // DiagnosticsEngine bilan bir xil

// ── Chastota tormozi ─────────────────────────────────────────────────────
// Eslatma allaqachon kuniga BITTA, lekin javob bermayotgan odamga uni HAR
// KUNI yuborish — kanalni o'ldirishning eng tez yo'li: odam avval
// e'tiborsiz qoladi, keyin push'ni butunlay o'chiradi. Bu qaytarib
// bo'lmaydigan yo'qotish: brauzer ruxsati 'denied' bo'lib qoladi va uni
// qayta so'rash IMKONSIZ.
//
// «Ochildimi» o'lchanmaydi — ochilishni kuzatish uchun service worker
// tomonida qo'shimcha yozuv kerak bo'lardi. Undan KUCHLIROQ ko'rsatkich
// allaqachon bor: odam xabardan keyin ilovaga QAYTDIMI. Buni
// userStats.lastActiveAt biladi, ya'ni mijoz tomonida hech narsa
// o'zgartirilmaydi va qo'shimcha o'qish ham talab qilinmaydi (stats
// hujjati baribir yuklanadi).
const PUSH_MISS_LIMIT = 3;        // ketma-ket shuncha javobsiz xabardan keyin
const THROTTLED_DAYS = [1, 4];    // haftada 2 marta: dushanba va payshanba

// ── Yutuq lahzalari ──────────────────────────────────────────────────────
// Kunlik eslatma allaqachon kuniga BITTA xabar yuboradi va reja bajarilgan
// kuni umuman jim turadi. Shu bitta xabarning MATNI endi holatga qarab
// tanlanadi: yo'qotish arafasidagi zanjir eng kuchli sabab, undan keyin
// bosag'aga yaqin unvon, oxirida — odatdagi reja qadami.
//
// ⚠️ YANGI ENDPOINT QO'SHILMADI: api/ da aynan 12 ta funksiya bor va bu
// Vercel Hobby rejasining chegarasi. Shu sababli mantiq mavjud cron ichida.
const RISK_MIN_STREAK = 2;      // src/utils/streakRisk.js bilan bir xil ostona
const UNVON_NEAR_POINTS = 3;    // unvon bosag'asiga shuncha ball qolganda eslatiladi
const UNVON_THRESHOLDS = [33, 67]; // src/data/tracks.js UNVON_AMI_THRESHOLDS bilan bir xil

/** Unvon nomlari — i18n `tracks.tier*` bilan bir xil (server mijoz lug'atini o'qiy olmaydi) */
const UNVON_NAME = {
  uz: ['Izlanuvchi', 'Mutaxassis', 'Ekspert'],
  ru: ['Исследователь', 'Специалист', 'Эксперт'],
  en: ['Researcher', 'Specialist', 'Expert'],
};

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
    // ── Sanoqsiz variant ────────────────────────────────────────────────────
    // Imtihon sanasi yo'q foydalanuvchi uchun. Kunlik reja matni sanaga
    // UMUMAN bog'liq emas (u savol soni va daqiqadan iborat), shuning uchun
    // sarlavhaning sanoqsiz varianti yetarli.
    // `planFresh` alohida: `fresh` matni «Bugungi reja...» deb boshlanadi va
    // sarlavha bilan takrorlanib qolardi.
    planTitle: () => 'Bugungi reja tayyor',
    planFresh: (n, m) => `${n} savol, taxminan ${m} daqiqa.`,
    fresh: (n, m) => `Bugungi reja: ${n} savol, taxminan ${m} daqiqa.`,
    partial: (done, n) => `Bugun ${done} ta savol ishlandi. Rejani yakunlash uchun yana ${n} ta qoldi.`,
    step: (s, m) => `Bugungi qadam: ${s}. Taxminan ${m} daqiqa.`,
    riskTitle: (n) => `${n} kunlik zanjir xavf ostida`,
    riskBody: (n) => `Bugun yana ${n} ta savol yechilsa, zanjir saqlanadi.`,
    unvonTitle: (name) => `«${name}» unvoniga yaqinsiz`,
    unvonBody: (ami, n) => `Akademik mahorat indeksi: ${ami}/100. Unvon uchun ${n} ball qoldi.`,
  },
  ru: {
    title: (d) => `До экзамена ${d} дн.`,
    planTitle: () => 'План на сегодня готов',
    planFresh: (n, m) => `${n} вопросов, примерно ${m} минут.`,
    fresh: (n, m) => `План на сегодня: ${n} вопросов, примерно ${m} минут.`,
    partial: (done, n) => `Сегодня решено ${done} вопросов. До завершения плана осталось ${n}.`,
    step: (s, m) => `Шаг на сегодня: ${s}. Примерно ${m} минут.`,
    riskTitle: (n) => `Серия из ${n} дней под угрозой`,
    riskBody: (n) => `Решите сегодня ещё ${n} вопросов — серия сохранится.`,
    unvonTitle: (name) => `Вы близко к званию «${name}»`,
    unvonBody: (ami, n) => `Индекс академического мастерства: ${ami}/100. До звания ${n} балла.`,
  },
  en: {
    title: (d) => `${d} days until the exam`,
    planTitle: () => 'Today’s plan is ready',
    planFresh: (n, m) => `${n} questions, about ${m} minutes.`,
    fresh: (n, m) => `Today's plan: ${n} questions, about ${m} minutes.`,
    partial: (done, n) => `${done} questions done today. ${n} left to finish the plan.`,
    step: (s, m) => `Today's step: ${s}. About ${m} minutes.`,
    riskTitle: (n) => `Your ${n}-day streak is at risk`,
    riskBody: (n) => `${n} more questions today keeps the streak.`,
    unvonTitle: (name) => `You are close to «${name}»`,
    unvonBody: (ami, n) => `Academic Mastery Index: ${ami}/100. ${n} points to the title.`,
  },
};

/**
 * Reja qadamining nomi — mijozdagi engine/stepText.js bilan bir xil ma'noda.
 * Mijoz TAYYOR MATN emas, qadam TURINI yozadi (userStats.todayPlan), shuning
 * uchun xabar foydalanuvchining push tilida chiqadi.
 */
const STEP_NAME = {
  uz: {
    retention: (p) => `takrorlash (${p.count} ta kartochka)`,
    practice: (p) => `${p.topic} bo'yicha mashq`,
    mixed: () => 'aralash mashq',
    refresh: (p) => `${p.topic} ni yangilash`,
    coverage: (p) => `${p.topic} bo'yicha qamrovni kengaytirish`,
    mistakes: (p) => `xatolar ustida ishlash (${p.count} ta)`,
    exam: () => 'sinov imtihoni',
  },
  ru: {
    retention: (p) => `повторение (${p.count} карточек)`,
    practice: (p) => `практика по теме «${p.topic}»`,
    mixed: () => 'смешанная практика',
    refresh: (p) => `освежить тему «${p.topic}»`,
    coverage: (p) => `расширить охват темы «${p.topic}»`,
    mistakes: (p) => `работа над ошибками (${p.count})`,
    exam: () => 'пробный экзамен',
  },
  en: {
    retention: (p) => `review (${p.count} cards)`,
    practice: (p) => `practice on ${p.topic}`,
    mixed: () => 'mixed practice',
    refresh: (p) => `refresh ${p.topic}`,
    coverage: (p) => `widen coverage of ${p.topic}`,
    mistakes: (p) => `work on mistakes (${p.count})`,
    exam: () => 'mock exam',
  },
};

/** `userStats.todayPlan` bugungimi va nomlanadigan qadam bormi (test uchun eksport) */
export function planStepName(todayPlan, today, lang) {
  if (!todayPlan || todayPlan.date !== today) return null;
  const table = STEP_NAME[lang] || STEP_NAME.uz;
  const fn = table[todayPlan.type];
  if (!fn) return null;
  // Mavzuga bog'liq qadamlarda nom bo'lmasa umumiy matnga qaytamiz
  if (['practice', 'refresh', 'coverage'].includes(todayPlan.type) && !todayPlan.topic) return null;
  return fn({ topic: todayPlan.topic, count: todayPlan.count ?? 0 });
}

export default async function handler(req, res) {
  // DENY BY DEFAULT — CRON_SECRET sozlanmagan bo'lsa endpoint YOPIQ.
  // (Avvalgi `secret !== process.env.CRON_SECRET` naqshi env bo'sh bo'lganda
  // `undefined !== undefined` → false → hamma uchun ochiq qolardi.)
  if (!verifySecret(extractSecret(req), process.env.CRON_SECRET)) {
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
    skipped: { noToken: 0, optedOut: 0, inactive: 0, goalDone: 0, alreadySent: 0, throttled: 0 },
    // Xabar qaysi sabab bilan ketgani — matn o'zgarishining ta'sirini o'lchash uchun
    reason: { streak: 0, unvon: 0, plan: 0 },
    // Sana holati. Ilgari bular `skipped.noExam` / `skipped.examPassed` edi —
    // ya'ni xabar UMUMAN yuborilmasdi. Endi xabar ketadi, faqat sanoqsiz
    // sarlavha bilan; shuning uchun bu «o'tkazib yuborildi» emas, KUZATUV
    // hisoblagichi: sanasiz auditoriya ulushi qanchaligini ko'rsatadi.
    undated: { missing: 0, passed: 0, global: 0 },
    errors: [],
  };

  // { token → {title, body} } — bitta foydalanuvchida bir nechta qurilma bo'lishi mumkin
  const queue = [];

  // ── Umumiy imtihon sanasi (zaxira manba) ──────────────────────────────────
  // Mijoz tomoni sanani UCH manbadan oladi (src/utils/examDate.js): shaxsiy →
  // umumiy (`settings/exam`) → konfiguratsiya. Server esa faqat BIRINCHISINI
  // o'qirdi. `users/{uid}.examDate` ixtiyoriy modaldan yoziladi
  // (ExamDateModal.jsx) — ya'ni admin umumiy sanani belgilagan bo'lsa ham,
  // uni ochmagan foydalanuvchining eslatmasi sanoqsiz qolardi.
  //
  // O'qish byudjeti: cron ishga tushganda BIR marta, ya'ni +1 hujjat/kun.
  let globalExamDate = null;
  try {
    const examSnap = await db.collection('settings').doc('exam').get();
    if (examSnap.exists) globalExamDate = examSnap.data()?.date || null;
  } catch (e) {
    // Zaxira o'qilmasa ham eslatma ishlaydi — shaxsiy sana yoki sanoqsiz matn
    out.errors.push(`settings/exam: ${e.message}`);
  }

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

        // Imtihon sanasi REJA eslatmasi uchun shart (matn sanoqqa asoslanadi),
        // lekin zanjir/unvon xabarlari uchun emas — ular sanadan mustaqil.
        // Shu sababli tekshiruv endi darhol `continue` qilmaydi, quyida
        // holat aniqlanganidan keyin hal qilinadi.
        // Shaxsiy sana ustun; bo'lmasa admin belgilagan umumiy sana ishlaydi.
        const usedGlobalExam = !u.examDate && !!globalExamDate;
        const daysLeft = daysUntil(u.examDate || globalExamDate);
        const examOk = daysLeft !== null && daysLeft > 0;

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

        // ── Chastota tormozi ────────────────────────────────────────────
        // Oldingi xabardan keyin odam ilovaga QAYTDIMI? lastDailyPushAt
        // yuborish paytida yoziladi, lastActiveAt esa natija topshirilganda.
        //
        // Taqqoslash VAQT bo'yicha, kun bo'yicha EMAS: xabar 19:00 da ketadi,
        // odam esa o'sha kuni ertalab kirgan bo'lishi mumkin — kun bo'yicha
        // solishtirsak bu «xabarga javob berdi» bo'lib hisoblanardi va tormoz
        // hech qachon ishlamasdi.
        //
        // lastDailyPushAt yo'q (eski hisob yoki hali xabar olmagan) — hisob
        // yuritilmaydi: javob berish-bermaganini bilishning imkoni yo'q.
        let missStreak = u.pushMissStreak || 0;
        if (u.lastDailyPushAt) {
          const cameBack = !!stats.lastActiveAt && stats.lastActiveAt > u.lastDailyPushAt;
          missStreak = cameBack ? 0 : missStreak + 1;
        }
        if (missStreak >= PUSH_MISS_LIMIT) {
          const dow = new Date(Date.now() + TASHKENT_OFFSET_MS).getUTCDay(); // 0 = yakshanba
          if (!THROTTLED_DAYS.includes(dow)) { out.skipped.throttled++; continue; }
        }

        const lang = TEXT[u.pushLang] ? u.pushLang : 'uz';
        const t = TEXT[lang];
        const remaining = Math.max(1, target - answered);

        // ── Xabar sababini tanlash (kuchli → kuchsiz) ──
        //
        // 1) Zanjir xavfi: oxirgi maqsad KECHA bajarilgan va bugun hali emas.
        //    Aynan «kecha» sharti muhim — 3 kun oldin to'xtagan odamda zanjir
        //    allaqachon uzilgan, unga «xavf ostida» deyish yolg'on bo'lardi.
        const streak = stats.dailyStreak || 0;
        const yesterday = tashkentDay(Date.now() - 86400000);
        const lastGoalDay = stats.lastGoalDate ? tashkentDay(Date.parse(stats.lastGoalDate)) : null;
        const atRisk = streak >= RISK_MIN_STREAK && lastGoalDay === yesterday;

        // 2) Unvon bosag'asi: AMI keyingi unvonga bir necha ball qolganda.
        //    `achievements` userStats hujjatida saqlanadi (AppContext yozadi).
        const ami = stats.achievements?.ami || 0;
        const unvonTier = stats.achievements?.unvonTier || 1;
        const nextThreshold = unvonTier <= 2 ? UNVON_THRESHOLDS[unvonTier - 1] : null;
        const unvonNear = nextThreshold !== null
          && ami < nextThreshold
          && ami >= nextThreshold - UNVON_NEAR_POINTS;

        // Reja qadami ma'lum bo'lsa — aynan uni aytamiz («Bugungi qadam:
        // Taktik tayyorgarlik bo'yicha mashq»). Foydalanuvchi hali Reja
        // sahifasini ochmagan bo'lsa `todayPlan` bo'lmaydi — o'shanda avvalgi
        // umumiy matn ishlaydi, ya'ni eslatma hech qachon yo'qolmaydi.
        let title, body, link;
        if (atRisk) {
          title = t.riskTitle(streak);
          body = t.riskBody(remaining);
          link = '/test';
          out.reason.streak++;
        } else if (unvonNear) {
          const name = (UNVON_NAME[lang] || UNVON_NAME.uz)[unvonTier]; // keyingi unvon nomi
          title = t.unvonTitle(name);
          body = t.unvonBody(ami, nextThreshold - ami);
          link = '/achievements';
          out.reason.unvon++;
        } else if (examOk) {
          const stepName = planStepName(stats.todayPlan, today, lang);
          title = t.title(daysLeft);
          body = stepName
            ? t.step(stepName, Math.max(1, stats.todayPlan.minutes || Math.round((remaining * SECONDS_PER_Q) / 60)))
            : answered > 0
              ? t.partial(answered, remaining)
              : t.fresh(target, Math.max(1, Math.round((target * SECONDS_PER_Q) / 60)));
          link = '/analysis?tab=plan';
          out.reason.plan++;
          if (usedGlobalExam) out.undated.global++;
        } else {
          // ── Zaxira tarmoq: imtihon sanasi yo'q (yoki o'tgan) ──────────────
          //
          // Ilgari bu yerda `continue` turardi va foydalanuvchi HECH QANDAY
          // xabar olmasdi. Shu tarmoqqa kimlar tushadi:
          //   · zanjiri hali qurilmagan (streak < RISK_MIN_STREAK) — YANGI odam;
          //   · zanjiri bir kundan ko'proq oldin uzilgan — QAYTMAYOTGAN odam;
          //   · unvon bosag'asida emas — ya'ni ko'pchilik.
          // Ya'ni aynan ketish arafasidagi segment jim qolardi, holbuki
          // kunlik reja matni imtihon sanasiga bog'liq emas — u savol soni
          // va daqiqadan iborat. Sanoq esa faqat sarlavhada edi.
          //
          // Barcha himoya shartlari o'z kuchida qoladi: kuniga bitta xabar,
          // faqat push'ga o'zi ruxsat berganlar, 30 kun ichida faol bo'lganlar
          // va bugungi maqsadni hali yopmaganlar.
          const stepName = planStepName(stats.todayPlan, today, lang);
          title = t.planTitle();
          body = stepName
            ? t.step(stepName, Math.max(1, stats.todayPlan.minutes || Math.round((remaining * SECONDS_PER_Q) / 60)))
            : answered > 0
              ? t.partial(answered, remaining)
              : t.planFresh(target, Math.max(1, Math.round((target * SECONDS_PER_Q) / 60)));
          link = '/analysis?tab=plan';
          out.reason.plan++;
          if (daysLeft !== null && daysLeft <= 0) out.undated.passed++;
          else out.undated.missing++;
        }

        out.eligible++;
        queue.push({ uid: userDoc.id, tokens, title, body, link, missStreak });
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
            // Havola xabar SABABIGA mos: zanjir → mashq, unvon → yutuqlar,
            // reja → reja ro'yxati. Xabar nimani aytgan bo'lsa, o'sha ekran ochiladi.
            webpush: { fcmOptions: { link: item.link || '/analysis?tab=plan' } },
          });
          ok += resp.successCount;
        }
        if (ok > 0) {
          out.sent++;
          // Kunlik qulf — qayta ishga tushirilsa ham ikkinchi marta yubormaydi.
          // lastDailyPushAt va pushMissStreak SHU YERDA yoziladi — qo'shimcha
          // yozuv EMAS, mavjud update ichida, ya'ni kvotaga ta'siri nol.
          await db.collection('users').doc(item.uid).update({
            lastDailyPush: today,
            lastDailyPushAt: new Date().toISOString(),
            pushMissStreak: item.missStreak ?? 0,
          });
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
