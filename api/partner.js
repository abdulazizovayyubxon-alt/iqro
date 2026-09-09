/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Hamkor (Ustoz/Partner) operatsiyalari
 *  api/partner.js
 * ════════════════════════════════════════════════════════════
 *
 *  POST { action: 'stats', partnerCode } + Authorization: Bearer <Firebase ID token>
 *  POST { action: 'remove_member', partnerCode, memberUid, reason }
 *       → a'zoni guruhdan chiqarish (ilova hisobi SAQLANADI, faqat guruh
 *         a'zoligi va SHU KOD bergan Pro bekor qilinadi).
 *
 *  XAVFSIZLIK:
 *    - Hamkor FAQAT o'ziga biriktirilgan promo-kod statistikasini ko'ra oladi.
 *    - Platforma adminlari barcha hamkor kodlarini ko'rish huquqiga ega.
 *    - Foydalanuvchilarning shaxsiy sirlari, xato javob tafsilotlari yoki
 *      begona fan ma'lumotlari oshkor qilinmaydi — faqat jamlangan ko'rsatkichlar.
 *    - Obuna maydonlari (`isPremium`, `premiumExpire`, ...) `firestore.rules`
 *      dagi `protectedUserFields()` bilan MIJOZGA yopiq. Shuning uchun
 *      guruhdan chiqarish MIJOZDAN emas, faqat shu yerdan (Admin SDK) bajariladi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { rateLimit, clientIp, PLATFORM_ADMIN_EMAILS } from './_shared.js';

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

/**
 * Guruhdan chiqarishda foydalanuvchining Pro obunasi bekor qilinishi kerakmi?
 *
 * ⚠️ BUTUN FUNKSIYANING ENG XAVFLI QARORI, shuning uchun alohida ajratilgan
 * va test bilan qulflangan (`src/__tests__/partnerRemove.test.js`).
 *
 * "Guruhdan chiqarish" faqat HAMKOR BERGAN imtiyozni qaytarib oladi. Agar
 * foydalanuvchi keyinchalik O'Z PULIGA obuna sotib olgan bo'lsa, uni bekor
 * qilish — pullik xizmatni tortib olish va to'g'ridan-to'g'ri to'lov nizosi.
 *
 * Ikkala shart ham BIRGA tekshiriladi:
 *   · `premiumMethod` — imtiyoz MANBASI. `api/payment-webhook.js` to'lovda
 *     uni to'lov usuliga almashtiradi, ya'ni to'lagan hisob shu yerda tushadi.
 *   · `promoRedeemed.code` — aynan SHU hamkorning kodi. Boshqa hamkorning
 *     yoki ommaviy kampaniya kodining Pro'siga tegish huquqimiz yo'q.
 *
 * @param {object} memberData - `users/{uid}` hujjati
 * @param {string} code - guruh promokodi (KATTA harflarda)
 * @returns {boolean}
 */
export function shouldCancelPromoPremium(memberData, code) {
  if (!memberData || !code) return false;
  if (memberData.isPremium !== true) return false;
  const method = memberData.premiumMethod;
  if (method !== 'promo' && method !== 'promo_team') return false;
  return memberData.promoRedeemed?.code === code;
}

const isPlatformAdmin = async (db, decoded) => {
  if (decoded.email && PLATFORM_ADMIN_EMAILS.includes(decoded.email)) return true;
  const snap = await db.collection('users').doc(decoded.uid).get();
  return snap.exists && snap.data().role === 'admin';
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Rate limit: daqiqasiga 30 so'rov
  const ip = clientIp(req);
  const rl = rateLimit(`partner:${ip}`, 30, 60_000);
  if (rl.limited) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  // Auth: Bearer ID token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const db = getDb();
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const action = req.body?.action || 'stats';

    if (action === 'stats') {
      let requestedCode = (req.body?.partnerCode || '').toString().trim().toUpperCase();

      const userSnap = await db.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const isAdminUser = await isPlatformAdmin(db, decoded);

      // ⚠️ HAMKOR AUDITI 2026-08-15 — ro'yxat HAR so'rovda o'qilardi.
      // `promoCodes` ni to'liq o'qish admin tanlagichi uchun kerak, lekin u
      // faqat sahifa birinchi ochilganda kerak. Admin ro'yxatdan kod tanlab
      // ko'rgan har safar butun kolleksiya qayta o'qilardi (Spark kvotasi —
      // loyihaning asosiy xavfi). Endi mijoz uni ataylab so'raydi.
      let allPartnerPromos = [];
      const wantsPromoList = req.body?.withPromoList === true || !requestedCode;
      if (isAdminUser && wantsPromoList) {
        const allPromosSnap = await db.collection('promoCodes').limit(200).get();
        allPartnerPromos = allPromosSnap.docs.map(d => ({
          code: d.id,
          partnerName: d.data().partnerName || null,
          campaign: d.data().campaign || null,
          active: d.data().active !== false,
        }));
      }

      // Agar kod berilmagan bo'lsa, foydalanuvchining o'z partnerCode'ini qidiramiz
      if (!requestedCode) {
        if (userData.partnerCode) {
          requestedCode = userData.partnerCode.toUpperCase();
        } else {
          // PromoCodes'dan partnerUid == uid bo'yicha qidirish
          const found = await db.collection('promoCodes').where('partnerUid', '==', uid).limit(1).get();
          if (!found.empty) {
            requestedCode = found.docs[0].id;
          }
        }
      }

      // Admin uchun agar hali ham kod topilmasa, mavjud promokodlardan birinchisini tanlaymiz
      if (!requestedCode && isAdminUser && allPartnerPromos.length > 0) {
        // Avvalo MIRONSHOH yoki partnerName bor promokodni qidiramiz
        const partnerSpecific = allPartnerPromos.find(p => p.partnerName || p.code === 'MIRONSHOH');
        requestedCode = partnerSpecific ? partnerSpecific.code : allPartnerPromos[0].code;
      }

      if (!requestedCode) {
        if (isAdminUser) {
          return res.status(200).json({
            ok: true,
            isAdmin: true,
            allPartnerPromos: [],
            promo: null,
            summary: { totalMembers: 0, active7d: 0, totalAnswered: 0, avgAccuracy: null, avgReadiness: null },
            members: [],
          });
        }
        return res.status(400).json({ ok: false, error: 'no_partner_code_found' });
      }

      const promoRef = db.collection('promoCodes').doc(requestedCode);
      const promoSnap = await promoRef.get();

      if (!promoSnap.exists) {
        return res.status(404).json({
          ok: false,
          error: 'promo_not_found',
          requestedCode,
          allPartnerPromos,
        });
      }

      const promo = promoSnap.data();

      // ⚠️ HAMKOR AUDITI 2026-08-15 — HUQUQ OSHIRISH TESHIGI YOPILDI.
      //
      // Avval `userData.partnerCode === requestedCode` YOLG'IZ O'ZI yetarli edi.
      // Lekin `firestore.rules` dagi `protectedUserFields()` ro'yxatida
      // `partnerCode` YO'Q — ya'ni istalgan foydalanuvchi o'z hujjatiga
      // `partnerCode: 'MIRONSHOH'` yozib qo'yishi mumkin edi (rules ruxsat
      // beradi), keyin esa shu kod bo'yicha BUTUN GURUH ro'yxatini ochardi:
      // ism, qisqa ID, o'zlashtirish foizi, tayyorlik bali, oxirgi faollik.
      // Promokod esa ataylab ommaviy tarqatiladi (Telegramga ulashish tugmasi),
      // demak hujum uchun "sir" ham kerak emas edi.
      //
      // `role` rules bilan HIMOYALANGAN (faqat admin o'zgartira oladi), shuning
      // uchun kod mosligi endi ROL bilan birga tekshiriladi. `promo.createdBy`
      // sharti olib tashlandi: u kodni yaratgan ADMIN uid'i — admin baribir
      // `isAdminUser` orqali o'tadi, lekin huquqi olingan sobiq admin bu shart
      // tufayli o'zi yaratgan kodlarga kirishda davom etardi.
      const isAssignedPartner =
        promo.partnerUid === uid ||
        (decoded.email && promo.partnerEmail === decoded.email) ||
        (userData.role === 'partner' && userData.partnerCode === requestedCode);

      if (!isAdminUser && !isAssignedPartner) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      // ── Hamkorga biriktirilgan FAN ──────────────────────────────────────
      // Ilgari hisobotning fan kesimi kodda `chqbt` deb QOTIB YOZILGAN edi.
      // Platformada 17 fan bor: boshqa fan hamkori o'z guruhi ishlagan bo'lsa
      // ham «CHQBT» ustunida nol ko'rardi. Endi fan hamkorga biriktiriladi.
      //
      // Tartib: kodning o'z fani (admin PromoTab'da belgilaydi) → kod egasining
      // profilidagi fan → so'ragan hamkorning o'z fani. Hech biri bo'lmasa fan
      // kesimi umuman ko'rsatilmaydi (jami raqamlar qoladi) — noto'g'ri fanni
      // taxmin qilib ko'rsatishdan ko'ra, ko'rsatmaslik to'g'riroq.
      let subjectId = promo.subject || null;
      if (!subjectId && promo.partnerUid) {
        const ownerSnap = await db.collection('users').doc(promo.partnerUid).get();
        if (ownerSnap.exists) subjectId = ownerSnap.data().subject || null;
      }
      if (!subjectId && isAssignedPartner) subjectId = userData.subject || null;

      // Redemptions subkolleksiyasini o'qish.
      // Chegara: bitta hisobot = 1 (promo) + N (redemption) + 2N (users/userStats)
      // o'qish. Chegarasiz kodda (ommaviy kampaniya `maxUses` katta bo'lishi
      // mumkin) bitta sahifa ochish minglab o'qishga aylanib, kunlik Firestore
      // kvotasini bitta so'rovda tugatishi mumkin edi.
      const MAX_MEMBERS = 500;
      const redemptionsSnap = await promoRef.collection('redemptions').limit(MAX_MEMBERS).get();
      // Guruhdan chiqarilganlar hisobotdan tushadi, lekin hujjati O'CHIRILMAYDI
      // (`remove_member` izohiga qarang) — shuning uchun filtr shu yerda.
      // `where('status','!=','removed')` ATAYLAB ishlatilmadi: u `status`
      // maydoni umuman yo'q eski redemption hujjatlarini ham chetlab o'tardi,
      // ya'ni chiqarilmagan a'zolar ro'yxatdan jimgina yo'qolardi.
      const redemptions = redemptionsSnap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(r => r.status !== 'removed');
      // Chegaraga urilgan bo'lsak, buni JIMGINA qilmaymiz: aks holda hisobot
      // «guruhda 500 kishi» deb ko'rsatib, ustoz uni to'liq deb o'qirdi.
      const truncated = redemptionsSnap.size >= MAX_MEMBERS;

      if (redemptions.length === 0) {
        return res.status(200).json({
          ok: true,
          allPartnerPromos,
          subject: subjectId,
          promo: {
            code: promo.code || requestedCode,
            campaign: promo.campaign || 'Hamkorlik dasturi',
            partnerName: promo.partnerName || userData.displayName || 'Hamkor ustoz',
            type: promo.type,
            value: promo.value,
            maxUses: promo.maxUses || 0,
            usedCount: promo.usedCount || 0,
            expiresAt: promo.expiresAt || null,
            active: promo.active !== false,
          },
          summary: {
            totalMembers: 0,
            active7d: 0,
            totalAnswered: 0,
            avgAccuracy: null,
            avgReadiness: null,
            subjectTotalAnswered: 0,
            subjectAvgAccuracy: null,
          },
          members: [],
        });
      }

      // Foydalanuvchilar statistikasi va profillarini partiyalab olish
      const statsByUid = {};
      const usersByUid = {};

      for (let i = 0; i < redemptions.length; i += 300) {
        const batchUids = redemptions.slice(i, i + 300);
        const statRefs = batchUids.map(r => db.collection('userStats').doc(r.uid));
        const userRefs = batchUids.map(r => db.collection('users').doc(r.uid));

        const [statDocs, userDocs] = await Promise.all([
          db.getAll(...statRefs),
          db.getAll(...userRefs),
        ]);

        statDocs.forEach(d => { if (d.exists) statsByUid[d.id] = d.data(); });
        userDocs.forEach(d => { if (d.exists) usersByUid[d.id] = d.data(); });
      }

      // Har bir a'zo uchun xavfsiz hisobot shakllantirish
      const members = redemptions.map(r => {
        const u = usersByUid[r.uid] || {};
        const s = statsByUid[r.uid] || {};

        const cats = s.stats || {};
        const answered = Object.values(cats).reduce((sum, c) => sum + (c?.totalAnswered || 0), 0);
        const correct = Object.values(cats).reduce((sum, c) => sum + (c?.totalCorrect || 0), 0);

        // Biriktirilgan fan kesimi (fan belgilanmagan bo'lsa — null)
        const subjCat = subjectId ? (cats[subjectId] || {}) : null;
        const subjAns = subjCat ? (subjCat.totalAnswered || 0) : null;
        const subjCor = subjCat ? (subjCat.totalCorrect || 0) : 0;
        const subjAcc = subjAns > 0 ? Math.round((subjCor / subjAns) * 100) : null;

        const readinessMap = s.readiness || {};
        const latestReadiness = Object.entries(readinessMap)
          .sort((a, b) => (b[1]?.updatedAt || '').localeCompare(a[1]?.updatedAt || ''))[0];

        const lastActive = s.lastActiveAt || latestReadiness?.[1]?.updatedAt || r.redeemedAt || null;

        return {
          uid: r.uid,
          displayName: u.displayName || r.displayName || 'Ustoz',
          shortId: u.shortId || null,
          photoURL: u.photoURL || null,
          // Tanlangan tayyor avatar — `photoURL` dan ustun (avatars.js dagi
          // `resolveAvatar` tartibi bilan bir xil). Hujjat baribir o'qilyapti,
          // qo'shimcha o'qish yo'q.
          avatarId: u.avatarId || null,
          redeemedAt: r.redeemedAt || null,
          // Umumiy reyting bali — guruh ichki reytingi shu maydon bo'yicha
          // tartiblanadi, ya'ni ustoz ko'rgan o'rin platformadagi umumiy
          // reyting bilan BIR XIL o'lchovda bo'ladi.
          totalScore: s.totalScore || 0,
          answered,
          accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
          subjectAnswered: subjAns,
          subjectAccuracy: subjAcc,
          readiness: latestReadiness?.[1]?.score ?? null,
          readinessSubject: latestReadiness?.[0] ?? null,
          dailyStreak: s.dailyStreak || 0,
          lastActiveAt: lastActive,
          // Haftalik diagnostika natijalari — { [setId]: { correct, answered } }.
          // Faqat kerakli maydonlar olinadi: `doneAt` hisobotda ko'rsatilmaydi
          // va uni yuborish bekorga trafik.
          weekly: Object.fromEntries(
            Object.entries(s.partnerSets || {}).map(([setId, v]) => [
              setId,
              { correct: v?.correct ?? 0, answered: v?.answered ?? 0 },
            ]),
          ),
        };
      });

      // Jamlanma ko'rsatkichlar
      const withReadiness = members.filter(m => typeof m.readiness === 'number');
      const withAccuracy = members.filter(m => typeof m.accuracy === 'number');
      const withSubjectAcc = members.filter(m => typeof m.subjectAccuracy === 'number');

      const now = Date.now();
      const active7dCount = members.filter(m => {
        if (!m.lastActiveAt) return false;
        return now - new Date(m.lastActiveAt).getTime() < 7 * 86400000;
      }).length;

      const summary = {
        totalMembers: members.length,
        active7d: active7dCount,
        totalAnswered: members.reduce((sum, m) => sum + (m.answered || 0), 0),
        avgAccuracy: withAccuracy.length
          ? Math.round(withAccuracy.reduce((sum, m) => sum + m.accuracy, 0) / withAccuracy.length)
          : null,
        avgReadiness: withReadiness.length
          ? Math.round(withReadiness.reduce((sum, m) => sum + m.readiness, 0) / withReadiness.length)
          : null,
        subjectTotalAnswered: subjectId
          ? members.reduce((sum, m) => sum + (m.subjectAnswered || 0), 0)
          : null,
        subjectAvgAccuracy: withSubjectAcc.length
          ? Math.round(withSubjectAcc.reduce((sum, m) => sum + m.subjectAccuracy, 0) / withSubjectAcc.length)
          : null,
      };

      // Tartiblash: oxirgi faol bo'lganlar yuqorida
      members.sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));

      // ── Haftalik diagnostika to'plamlari (ustunlar sarlavhasi uchun) ──
      // Hisobotda «1-hafta», «2-hafta» ustunlari shu ro'yxatdan chiziladi.
      // A'zolar ro'yxatidan ALOHIDA o'qiladi, chunki hali hech kim ishlamagan
      // hafta ham ustun sifatida ko'rinishi kerak (aks holda ustoz to'plam
      // joylanganini panelda umuman ko'rmasdi).
      let weeklySets = [];
      try {
        const setsSnap = await db.collection('partnerSets')
          .where('partnerCode', '==', requestedCode)
          .get();
        weeklySets = setsSnap.docs
          .map(d => ({ id: d.id, title: d.data().title || d.id, order: d.data().order || 0, active: d.data().active !== false }))
          .filter(s => s.active)
          .sort((a, b) => a.order - b.order);
      } catch (e) {
        // To'plamlar o'qilmasa hisobot baribir ko'rsatiladi — haftalar ustuni
        // shunchaki bo'lmaydi.
        console.warn('partnerSets o\'qilmadi:', e?.message);
      }

      return res.status(200).json({
        ok: true,
        allPartnerPromos,
        truncated,
        maxMembers: MAX_MEMBERS,
        subject: subjectId,
        promo: {
          code: promo.code || requestedCode,
          campaign: promo.campaign || 'Hamkorlik dasturi',
          partnerName: promo.partnerName || userData.displayName || 'Hamkor ustoz',
          type: promo.type,
          value: promo.value,
          maxUses: promo.maxUses || 0,
          usedCount: promo.usedCount || members.length,
          expiresAt: promo.expiresAt || null,
          active: promo.active !== false,
        },
        summary,
        weeklySets,
        members,
      });
    }

    // ══════════════════════════════════════════════════════════════════
    //  action: 'remove_member' — a'zoni hamkor guruhidan chiqarish
    // ══════════════════════════════════════════════════════════════════
    //
    //  NIMA BO'LADI:
    //    1. `promoCodes/{KOD}/redemptions/{uid}` → status: 'removed'
    //    2. SHU KOD bergan Pro obunasi bekor qilinadi (bepul tarifga tushadi)
    //
    //  NIMA BO'LMAYDI (ataylab):
    //    · `users/{uid}` hujjati O'CHIRILMAYDI — profil, `userStats`, ballar,
    //      reyting, xato daftari, streak — hammasi joyida qoladi. Foydalanuvchi
    //      Zehin ilovasining to'laqonli (bepul tarifdagi) a'zosi bo'lib qoladi.
    //    · Auth hisobi tegilmaydi — u o'sha parol bilan kirishda davom etadi.
    //
    //  ⚠️ REDEMPTION HUJJATI NEGA O'CHIRILMAYDI:
    //  `api/redeem-promo.js` takroran ishlatishni aynan shu hujjat BORLIGIGA
    //  qarab to'xtatadi (`redemptionSnap.exists → already_used`). Hujjatni
    //  o'chirsak, guruhdan chiqarilgan (masalan, TO'LOV QILMAGAN) odam o'sha
    //  ommaviy tarqatilgan kodni qayta kiritib, yana 3 oylik bepul Pro olardi —
    //  ya'ni "chiqarish" tugmasi jazo emas, bepul obuna tugmasiga aylanardi.
    //  Status bilan belgilash: a'zolik uziladi, takroriy foydalanish yopiq
    //  qoladi va kim/qachon/nega chiqargani jurnalda ko'rinadi.
    if (action === 'remove_member') {
      // Yozuv amali uchun alohida, qattiqroq chegara (o'qish chegarasi 30/daq).
      // Kalit IP emas, UID: bitta hamkor bir daqiqada 10 tadan ko'p odam
      // chiqarishi normal hol emas.
      const rlWrite = rateLimit(`partner-remove:${uid}`, 10, 60_000);
      if (rlWrite.limited) {
        return res.status(429).json({ ok: false, error: 'rate_limited' });
      }

      const code = (req.body?.partnerCode || '').toString().trim().toUpperCase();
      const memberUid = (req.body?.memberUid || '').toString().trim();

      // Sabab — YOPIQ ro'yxat. Erkin matn qabul qilinsa, u jurnalga tushib
      // keyin panelda ko'rsatiladi (XSS/hajm yuzasi) va hisobotni ifloslantiradi.
      const REMOVE_REASONS = ['unpaid', 'left', 'other'];
      const rawReason = (req.body?.reason || '').toString().trim();
      const reason = REMOVE_REASONS.includes(rawReason) ? rawReason : 'other';

      // Kod BU YERDA majburiy: `stats` dagi "kod topilmasa o'zi qidiradi /
      // birinchisini tanlaydi" yordamchi mantiqi yozuv amali uchun xavfli —
      // noto'g'ri guruhdan odam chiqarib yuborishi mumkin edi.
      if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) {
        return res.status(400).json({ ok: false, error: 'invalid_code_format' });
      }
      if (!memberUid || memberUid.length > 128) {
        return res.status(400).json({ ok: false, error: 'invalid_member' });
      }

      const promoRef = db.collection('promoCodes').doc(code);
      const memberRef = db.collection('users').doc(memberUid);
      const redemptionRef = promoRef.collection('redemptions').doc(memberUid);

      // ── HUQUQ TEKSHIRUVI ──
      // `stats` dagi bilan AYNAN bir xil shart: kodning egasi yoki admin.
      // Sobiq admin / kodni o'ziga yozib olgan foydalanuvchi o'ta olmaydi
      // (batafsil izoh `stats` ichida, "HUQUQ OSHIRISH TESHIGI" bandida).
      const [ownerCheckSnap, promoCheckSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        promoRef.get(),
      ]);
      if (!promoCheckSnap.exists) {
        return res.status(404).json({ ok: false, error: 'promo_not_found' });
      }
      const requesterData = ownerCheckSnap.exists ? ownerCheckSnap.data() : {};
      const promoCheck = promoCheckSnap.data();
      const isAdminUser = await isPlatformAdmin(db, decoded);
      const isAssignedPartner =
        promoCheck.partnerUid === uid ||
        (decoded.email && promoCheck.partnerEmail === decoded.email) ||
        (requesterData.role === 'partner' && requesterData.partnerCode === code);

      if (!isAdminUser && !isAssignedPartner) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }

      // Hamkor o'zini o'z guruhidan chiqara olmaydi: bu faqat o'z Pro'sini
      // bekor qilib, panelni tushunarsiz holatga solardi.
      if (memberUid === uid) {
        return res.status(400).json({ ok: false, error: 'cannot_remove_self' });
      }

      const nowIso = new Date().toISOString();

      // Butun amal TRANSACTION ichida: parallel ikki so'rov `usedCount` ni
      // ikki marta kamaytirib yuborishi yoki bir a'zoni ikki marta
      // "chiqarishi" mumkin emas.
      const result = await db.runTransaction(async (tx) => {
        const [promoSnap, redemptionSnap, memberSnap] = await Promise.all([
          tx.get(promoRef), tx.get(redemptionRef), tx.get(memberRef),
        ]);

        if (!promoSnap.exists) return { ok: false, error: 'promo_not_found' };
        if (!redemptionSnap.exists) return { ok: false, error: 'not_a_member' };

        const redemption = redemptionSnap.data();
        if (redemption.status === 'removed') return { ok: false, error: 'already_removed' };

        const memberData = memberSnap.exists ? memberSnap.data() : {};

        // Pro faqat SHU kod bergan bo'lsa bekor qilinadi — sharti va sababi
        // `shouldCancelPromoPremium` izohida.
        const cancelPremium = shouldCancelPromoPremium(memberData, code);

        const userPatch = {};
        if (cancelPremium) {
          userPatch.isPremium = false;
          // `premiumPlan: 'expired'` — AuthContext muddati o'tgan obunani
          // aynan shu qiymat bilan belgilaydi (computeTrialStatus bilan mos).
          userPatch.premiumPlan = 'expired';
          // Sana `null` EMAS, hozirgi vaqt: AuthContext'da
          // `isPremium && !premiumExpire` = MUDDATSIZ premium degani, ya'ni
          // null qo'yish kelajakda teskari ta'sir berishi mumkin edi.
          // Hozirgi vaqt esa "shu daqiqada tugadi" degan aniq iz qoldiradi.
          userPatch.premiumExpire = nowIso;
          userPatch.premiumMethod = 'partner_removed';
          // Bekor qilingan imtiyoz izi hujjatda QOLMAYDI: `promoRedeemed`
          // "shu kod menga amaldagi Pro berdi" degan ma'noni bildiradi va
          // admin panelida shunday o'qiladi. Tarix yo'qolmaydi — kim, qachon,
          // qaysi kodni ishlatgani `redemptions` hujjatida saqlanib qoladi.
          //
          // Kodni QAYTA ishlatishga bu ta'sir qilmaydi: `api/redeem-promo.js`
          // takrorni `promoRedeemed` bilan emas, redemption hujjatining
          // BORLIGI bilan to'xtatadi (u esa o'chirilmaydi).
          userPatch.promoRedeemed = null;
        }

        // Foydalanuvchi hujjatidagi hamkor bog'lanishini tozalash.
        // Faqat SHU kod bo'lsa va odamning o'zi hamkor BO'LMASA — aks holda
        // hamkor ustozning o'z panelini ochadigan kodini o'chirib qo'yardik.
        if (memberData.role !== 'partner' && memberData.partnerCode === code) {
          userPatch.partnerCode = null;
        }

        if (Object.keys(userPatch).length > 0) {
          // `merge` — hujjatning qolgan hamma maydoni (profil, sozlamalar,
          // referral, ballar) TEGILMAYDI.
          tx.set(memberRef, userPatch, { merge: true });
        }

        tx.set(redemptionRef, {
          status: 'removed',
          removedAt: nowIso,
          removedBy: uid,
          removedReason: reason,
          // Pro haqiqatan bekor qilindimi — keyinchalik "nega mening
          // obunam bor/yo'q" savoliga javob shu yerda.
          premiumCancelled: cancelPremium,
        }, { merge: true });

        // Bo'shagan o'rin kodga qaytariladi: `maxUses` cheklovi bor kodda
        // chiqarilgan odam o'rniga yangisini qo'shib bo'lmay qolardi.
        // Takroriy foydalanish redemption hujjati orqali yopiq, ya'ni bu
        // o'rinni faqat YANGI odam egallay oladi.
        if ((promoSnap.data().usedCount || 0) > 0) {
          tx.update(promoRef, { usedCount: FieldValue.increment(-1) });
        }

        return {
          ok: true,
          memberUid,
          cancelledPremium: cancelPremium,
          // Pro bekor qilinmagan bo'lsa — SABABI. Mijoz buni foydalanuvchiga
          // aynan aytadi: "chiqarildi, lekin obunasi o'ziniki — saqlandi".
          premiumKeptReason: cancelPremium
            ? null
            : (memberData.isPremium === true ? 'not_from_this_code' : 'no_active_premium'),
        };
      });

      if (!result.ok) {
        // Biznes-xato (a'zo emas / allaqachon chiqarilgan) — 200 bilan
        // qaytadi, mijoz uni matnga aylantiradi.
        return res.status(200).json(result);
      }

      // ── Audit izi ──
      // Amal QAYTARILMAS (Pro bekor qilinadi) va uni hamkor bajaradi, ya'ni
      // admin panelidan tashqarida. Jurnalsiz "obunamni kim o'chirdi?"
      // savoliga javob bo'lmasdi. Yozuv HECH QACHON amalni buzmaydi:
      // transaction allaqachon yakunlangan, jurnal esa qo'shimcha.
      try {
        await db.collection('adminActions').add({
          type: 'partner.member.remove',
          target: memberUid,
          meta: {
            kod: code,
            sabab: reason,
            proBekorQilindi: result.cancelledPremium,
          },
          actorUid: uid,
          actorEmail: decoded.email || null,
          createdAt: nowIso,
          ts: FieldValue.serverTimestamp(),
        });
      } catch (logErr) {
        console.warn('partner.member.remove jurnali yozilmadi:', logErr?.message);
      }

      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error('partner api error:', err);
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
