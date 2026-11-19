import { randomInt } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { rateLimit, clientIp, extractBearer, clip, ensureShortIdAdmin, PLATFORM_ADMIN_EMAILS } from './_shared.js';
import { computeBonusUsage } from './_referralDiscount.js';

function ensureAdminApp() {
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
}

function getDb() {
  ensureAdminApp();
  return getFirestore();
}

// Admin emaillari — yagona manba `_shared.js` da (audit 2026-09-02, A-2).
const ADMIN_EMAILS = PLATFORM_ADMIN_EMAILS;

// Bearer idToken'ni tekshirib, admin ekanini tasdiqlaydi
async function verifyAdmin(req, db) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
  if (!idToken) return null;
  const decoded = await getAuth().verifyIdToken(idToken);
  if (ADMIN_EMAILS.includes(decoded.email)) return decoded;
  const u = await db.collection('users').doc(decoded.uid).get();
  if (u.exists && u.data().role === 'admin') return decoded;
  return null;
}

// ?action=push — adminga himoyalangan FCM push yuborish
async function handlePush(req, res) {
  const db = getDb();
  let admin;
  try {
    admin = await verifyAdmin(req, db);
  } catch (e) {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }
  if (!admin) return res.status(403).json({ success: false, error: 'forbidden' });

  const { title, body, target } = req.body;
  if (!title || !body) return res.status(400).json({ success: false, error: 'title_body_required' });

  // Tokenlarni yig'ish
  let tokens = [];
  if (target && target !== 'all') {
    const u = await db.collection('users').doc(target).get();
    if (u.exists && Array.isArray(u.data().fcmTokens)) tokens = u.data().fcmTokens;
  } else {
    // Faqat push ruxsatini bergan hisoblarni va faqat `fcmTokens` maydonini
    // o'qiymiz (services/push.js har token yozishda `pushPerm: 'granted'`
    // qo'yadi). Butun `users` kolleksiyasini cheklovsiz o'qish minglab
    // foydalanuvchida kunlik Spark kvotasining katta qismini yeb qo'yardi.
    const snap = await db.collection('users')
      .where('pushPerm', '==', 'granted')
      .select('fcmTokens')
      .get();
    snap.forEach((d) => {
      const t = d.data().fcmTokens;
      if (Array.isArray(t)) tokens.push(...t);
    });
  }
  tokens = [...new Set(tokens)].filter(Boolean);
  if (tokens.length === 0) return res.status(200).json({ success: true, sent: 0 });

  const messaging = getMessaging();
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const resp = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: { link: '/' },
      webpush: { fcmOptions: { link: '/' } },
    });
    sent += resp.successCount;
  }
  return res.status(200).json({ success: true, sent });
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Telegram `parse_mode: HTML` — foydalanuvchi matni EKRANLANMASA, xabarga
// havola/qalin matn kiritib adminni chalg'itish (fishing) mumkin edi.
const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

async function sendToAdmin(db, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN sozlanmagan — xabar yuborilmadi');
    return false;
  }
  const adminSnap = await db.collection('settings').doc('admin').get();
  const adminChatId = adminSnap.exists ? adminSnap.data().telegramChatId : null;
  if (!adminChatId) return false;

  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML' }),
  });
  return true;
}

// ── action: register ───────────────────────────────────────────────────────
// AUDIT 2026-08-05, 20-BAND: avval bu yo'nak AUTH'SIZ edi va `message`
// matnini MIJOZ yuborardi — ya'ni istalgan odam admin Telegramiga ixtiyoriy
// matn (havola, soxta ogohlantirish) jo'natishi mumkin edi.
// ENDI: ID token majburiy va xabar matni SERVERDA Firestore ma'lumotidan
// yig'iladi — mijozdan keladigan matn umuman ishlatilmaydi.
async function handleRegister(db, req, res) {
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ success: false, error: 'unauthorized' });

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }

  const uid = decoded.uid;
  if (rateLimit(`reg:${uid}`, 2, 24 * 60 * 60 * 1000).limited) {
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  // Qisqa ID SHU YERDA beriladi — ID berishning birlamchi nuqtasi.
  const shortId = await ensureShortIdAdmin(db, uid)
    .catch((e) => { console.warn('shortId berilmadi:', e?.message); return null; });

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const u = snap.exists ? snap.data() : {};

  // Idempotentlik: bitta hisob uchun Telegramga faqat 1 marta xabar boradi (spam himoyasi)
  if (u.registerNotified) {
    return res.status(200).json({ success: true, shortId: shortId || u.shortId || null, alreadyNotified: true });
  }

  const text = '👤 <b>Yangi foydalanuvchi!</b>\n\n'
    + `Ism: ${escapeHtml(u.displayName || '—')}\n`
    + `Telefon: ${escapeHtml(u.phone || '—')}\n`
    + `ID: ${escapeHtml(shortId || u.shortId || uid)}`;

  await userRef.set({ registerNotified: true }, { merge: true }).catch(() => {});
  // Telegram yiqilsa ham mijozga ID qaytadi — xabar ikkinchi darajali.
  await sendToAdmin(db, text).catch((e) => console.warn('Telegram xabari yuborilmadi:', e?.message));
  return res.status(200).json({ success: true, shortId });
}

// ── action: ensure-id ──────────────────────────────────────────────────────
// Foydalanuvchi O'Z qisqa ID sini so'raydi. Ro'yxatdan o'tish paytida ID
// berilmay qolgan (endpoint yiqilgan, tarmoq uzilgan) hisoblar uchun —
// ilova ochilganda bir marta chaqiriladi. Idempotent: ID bor bo'lsa
// hech narsa yozilmaydi.
//
// uid FAQAT tekshirilgan tokendan olinadi — boshqa odamga ID berib bo'lmaydi.
async function handleEnsureId(db, req, res) {
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ success: false, error: 'unauthorized' });

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }

  // Hisoblagich umumiy resurs — bitta hisob uni cheksiz aylantirmasin.
  if (rateLimit(`sid:${decoded.uid}`, 5, 60 * 1000).limited) {
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  const shortId = await ensureShortIdAdmin(db, decoded.uid);
  return res.status(200).json({ success: true, shortId });
}

// ── action: delete-request ─────────────────────────────────────────────────
// Hisobni o'chirish arizasi (/delete-account sahifasi Google Play talabi
// bo'yicha ochiq — auth talab qilinmaydi).
// AUDIT 7-BAND: avval mijoz to'g'ridan-to'g'ri `deletionRequests`ga yozardi va
// Firestore qoidasi ham auth talab qilmasdi → cheksiz anonim hujjat. Endi
// yozuv shu yerda, IP bo'yicha qattiq chegara bilan.
async function handleDeleteRequest(db, req, res) {
  if (rateLimit(`del:${clientIp(req)}`, 3, 10 * 60 * 1000).limited) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  const name = clip(req.body?.name, 100)?.trim() || '';
  const phoneRaw = clip(req.body?.phone, 20) || '';
  const phone = phoneRaw.replace(/\D/g, '');
  const reason = clip(req.body?.reason, 1000)?.trim() || '';

  if (!name) return res.status(400).json({ ok: false, error: 'name_required' });
  if (!phone.startsWith('998') || phone.length !== 12) {
    return res.status(400).json({ ok: false, error: 'invalid_phone' });
  }

  // ⚠️ 2026-08-19 — TAKRORIY ARIZA. IP bo'yicha chegara (yuqorida) bitta
  // odamning bir necha kun davomida qayta-qayta yozishiga to'sqinlik qilmaydi:
  // amalda bitta telefondan 4 ta ariza tushib, admin panelini to'ldirgan edi.
  // Endi shu telefonda javob KUTAYOTGAN ariza bo'lsa, yangi hujjat OCHILMAYDI —
  // matn mavjud arizaga qo'shiladi. Shunda admin bitta kartochkada odamning
  // hamma xabarini ko'radi va bitta "Bajarildi" bilan yopadi.
  //
  // So'rov FAQAT `phone` bo'yicha (bitta tenglik) — `status` bilan birga
  // qo'shilsa Firestore kompozit indeks talab qilardi, u esa deploy'da
  // unutilsa so'rov yiqilib, ariza BUTUNLAY yo'qolardi. Status JS'da
  // filtrlanadi: bitta odamda ariza kam, o'qish arzon.
  const existing = await db.collection('deletionRequests')
    .where('phone', '==', phone).limit(20).get()
    .catch((e) => { console.warn('takroriy tekshiruvi:', e?.message); return null; });
  const open = existing?.docs?.find((d) => (d.data().status || 'pending') === 'pending');

  const nowIso = new Date().toISOString();

  if (open) {
    const prev = open.data();
    const joined = [prev.reason, reason && `— ${nowIso.slice(0, 16).replace('T', ' ')}: ${reason}`]
      .filter(Boolean).join('\n');
    // Matn cheksiz o'smasin. Kesish BOSHIDAN — eng YANGI xabar muhimroq
    // (`clip` bu yerda yaramaydi: u boshini saqlab, oxirini tashlab yuboradi).
    const merged = joined.length > 4000 ? '…' + joined.slice(-4000) : joined;
    await open.ref.update({
      name: name || prev.name,
      reason: merged,
      repeatCount: (prev.repeatCount || 0) + 1,
      lastMessageAt: nowIso,
    });

    // Adminga baribir xabar boradi — odam yangi narsa yozgan bo'lishi mumkin —
    // lekin "takroriy" deb belgilanadi, ya'ni yangi ish emasligi darrov ko'rinadi.
    await sendToAdmin(db,
      '🔁 <b>Takroriy murojaat</b> (mavjud arizaga qo\'shildi)\n\n'
      + `Ism: ${escapeHtml(name)}\n`
      + `Telefon: ${escapeHtml(phone)}\n`
      + `Xabar: ${escapeHtml(reason || '—')}`
    ).catch((e) => console.warn('Telegram xabari yuborilmadi:', e?.message));

    return res.status(200).json({ ok: true, merged: true });
  }

  await db.collection('deletionRequests').add({
    name, phone, reason,
    status: 'pending',
    createdAt: nowIso,
  });

  await sendToAdmin(db,
    '🗑 <b>Hisobni o\'chirish arizasi</b>\n\n'
    + `Ism: ${escapeHtml(name)}\n`
    + `Telefon: ${escapeHtml(phone)}\n`
    + `Sabab: ${escapeHtml(reason || '—')}`
  ).catch((e) => console.warn('Telegram xabari yuborilmadi:', e?.message));

  return res.status(200).json({ ok: true });
}

// ── action: delete-user ────────────────────────────────────────────────────
// ⚠️ AUDIT 2026-08-06, T-12 BAND — admin paneli hisobni "o'chirganda" faqat
// `users/{uid}` va `userStats/{uid}` hujjatlarini o'chirardi. Firebase AUTH
// hisobi qolardi — foydalanuvchi kirishda davom etardi, lekin profil hujjati
// yo'qligi sababli `hasContentAccess()` xatoga uchrab, hamma joyda paywall
// ko'rinardi (zombi hisob). Subkolleksiya va bog'liq yozuvlar ham qolardi.
// Google Play "Data deletion" talabi hisobning O'ZINI o'chirishni ko'zda tutadi.
//
// Bu ish faqat Admin SDK bilan bajariladi — shuning uchun mijozda emas, shu yerda.
// Vercel Hobby 12 funksiya chegarasi sababli YANGI endpoint emas, mavjud
// `notify-admin.js` ga `action` qo'shildi (naqsh: `delete-request`).
// 400 talik partiyalarda o'chirish (Firestore batch chegarasi 500)
async function deleteAll(db, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

async function purgeUser(db, uid) {
  const deleted = { docs: 0, subdocs: 0, objections: 0, requests: 0, referrals: 0, authAccount: false };
  const errors = [];

  // 1) Shaxsiy subkolleksiya (bildirishnomalar) — hujjat o'chirilsa ham qolib ketardi
  try {
    const notifs = await db.collection('users').doc(uid).collection('notifications').get();
    deleted.subdocs = await deleteAll(db, notifs.docs);
  } catch (e) {
    errors.push(`notifications: ${e.message}`);
  }

  // ⚠️ ADMIN AUDIT 2026-08-06, A-10 BAND — quyidagi uch qadam YANGI.
  // Avval faqat `users` + `userStats` + bildirishnomalar o'chirilardi.
  // Boshqa kolleksiyalardagi yozuvlar YETIM qolardi:
  //   · `referrals` — Referral jadvalida "—" ismli qatorlar; bundan yomoni,
  //     `handleMarkReferralPaid` tranzaksiyasi mavjud bo'lmagan
  //     `users/{referrerId}` ni yangilamoqchi bo'lib NOT_FOUND bilan yiqilardi;
  //   · `objections` va `questionRequests` — `handleFulfillRequest` o'chirilgan
  //     uid ga bildirishnoma yozmoqchi bo'lardi.

  // 2) E'tirozlar — butunlay o'chiriladi (shaxsiy ma'lumot, qiymati yo'q)
  try {
    const objs = await db.collection('objections').where('uid', '==', uid).get();
    deleted.objections = await deleteAll(db, objs.docs);
  } catch (e) {
    errors.push(`objections: ${e.message}`);
  }

  // 3) Savol so'rovlari — butunlay o'chiriladi
  try {
    const reqs = await db.collection('questionRequests').where('uid', '==', uid).get();
    deleted.requests = await deleteAll(db, reqs.docs);
  } catch (e) {
    errors.push(`questionRequests: ${e.message}`);
  }

  // 4) Referrallar — O'CHIRILMAYDI, ANONIMLASHTIRILADI.
  // Bu MOLIYAVIY iz: bonus to'langanmi, kim kimni taklif qilgan — bu ma'lumot
  // hisob-kitob uchun kerak va uni yo'q qilish qayta tiklab bo'lmaydigan
  // xatolikka olib keladi. Shaxsni aniqlovchi ism olib tashlanadi, uid esa
  // "o'chirilgan" deb belgilanadi.
  try {
    const asReferrer = await db.collection('referrals').where('referrerId', '==', uid).get();
    const asReferred = await db.collection('referrals').where('referredId', '==', uid).get();
    const all = [...asReferrer.docs, ...asReferred.docs];
    for (let i = 0; i < all.length; i += 400) {
      const batch = db.batch();
      all.slice(i, i + 400).forEach((d) => {
        const data = d.data();
        const patch = { anonymizedAt: new Date().toISOString() };
        if (data.referrerId === uid) { patch.referrerName = "(o'chirilgan hisob)"; patch.referrerDeleted = true; }
        if (data.referredId === uid) { patch.referredName = "(o'chirilgan hisob)"; patch.referredDeleted = true; }
        batch.update(d.ref, patch);
      });
      await batch.commit();
    }
    deleted.referrals = all.length;
  } catch (e) {
    errors.push(`referrals: ${e.message}`);
  }

  // 5) Asosiy hujjatlar
  for (const path of [['users', uid], ['userStats', uid]]) {
    try {
      await db.collection(path[0]).doc(path[1]).delete();
      deleted.docs++;
    } catch (e) {
      errors.push(`${path[0]}: ${e.message}`);
    }
  }

  // 6) Firebase Auth hisobi — ASOSIY nuqta. Foydalanuvchi endi kira olmaydi.
  try {
    await getAuth().deleteUser(uid);
    deleted.authAccount = true;
  } catch (e) {
    // `user-not-found` = hisob allaqachon yo'q, bu xato emas
    if (e?.code === 'auth/user-not-found') deleted.authAccount = true;
    else errors.push(`auth: ${e.message}`);
  }

  return { deleted, errors };
}

async function handleDeleteUser(db, req, res) {
  const admin = await verifyAdmin(req, db).catch(() => null);
  if (!admin) return res.status(403).json({ ok: false, error: 'forbidden' });

  const uid = clip(req.body?.uid, 128)?.trim();
  if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
  // Admin o'zini o'chirib, platformani boshqaruvsiz qoldirmasin
  if (uid === admin.uid) return res.status(400).json({ ok: false, error: 'cannot_delete_self' });

  const { deleted, errors } = await purgeUser(db, uid);
  return res.status(200).json({ ok: errors.length === 0, deleted, errors });
}

// ── action: reset-password ─────────────────────────────────────────────────
// Admin parolini unutgan foydalanuvchiga VAQTINCHALIK parol beradi.
//
// NIMA UCHUN UMUMAN SHU YO'L KERAK:
// Login modeli telefon + parol, Firebase Auth emaili esa SOXTA
// (`998XXXXXXXXX@iqro.uz` — AuthContext.jsx `phoneToEmail`). Bunday pochta
// qutisi mavjud emas, shuning uchun Firebase'ning standart tiklash yo'li —
// `sendPasswordResetEmail` — PRINSIPIAL ravishda ishlamaydi: xat hech qayerga
// yetib bormaydi. Firebase konsolida parolni qo'lda o'rnatib ham bo'lmaydi
// (u yerdagi "Reset password" ham o'sha yetib bormaydigan xatni yuboradi).
// Yagona texnik yo'l — Admin SDK `updateUser()`, u esa faqat serverda ishlaydi.
//
// Vercel Hobby 12 funksiya chegarasi sababli YANGI endpoint emas, mavjud
// `notify-admin.js` ga `action` qo'shildi (naqsh: `delete-user`).
//
// Yangi parol FAQAT javobda qaytadi va Telegram'ga YUBORILMAYDI: `sendToAdmin`
// jonli parolni chat tarixida abadiy qoldirardi. Admin uni panelda ko'radi,
// foydalanuvchiga aytadi, foydalanuvchi esa kirgach Profil → Parolni
// o'zgartirish'dan o'zinikini qo'yadi (PasswordModal eski parolni so'ramaydi).
//
// Alifboda chalkashadigan belgilar YO'Q (0/O, 1/l/I): parol telefonda og'zaki
// aytilishi mumkin va "nol"mi yoki "O"mi degan savol tug'ilmasligi kerak.
const TEMP_PW_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTempPassword(len = 10) {
  // `randomInt` — kriptografik va SILJISHSIZ (`Math.random() * n` emas).
  let out = '';
  for (let i = 0; i < len; i++) out += TEMP_PW_ALPHABET[randomInt(TEMP_PW_ALPHABET.length)];
  return out;
}

async function handleResetPassword(db, req, res) {
  const admin = await verifyAdmin(req, db).catch(() => null);
  if (!admin) return res.status(403).json({ ok: false, error: 'forbidden' });

  // Admin tokeni o'g'irlansa, u bilan hisoblarni ketma-ket qulflab chiqib
  // bo'lmasin. Qo'lda ishlaydigan oqim uchun soatiga 10 ta yetarlidan ortiq.
  if (rateLimit(`pwr:${admin.uid}`, 10, 60 * 60 * 1000).limited) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  const uid = clip(req.body?.uid, 128)?.trim();
  if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

  let target;
  try {
    target = await getAuth().getUser(uid);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }
    throw e;
  }

  // BOSHQA ADMINNING paroli tiklanmaydi. Aks holda panelga qo'shilgan har
  // qanday admin egasining hisobini butunlay o'z qo'liga olib, uni tashqarida
  // qoldira olardi — va rolni qaytarib olish bilan buni ORQAGA QAYTARIB
  // bo'lmasdi, chunki hisob endi uniki. O'z parolini tiklashning ma'nosi yo'q
  // (buning uchun tizimga kirgan bo'lish kerak), shuning uchun istisno ham yo'q.
  const targetDoc = await db.collection('users').doc(uid).get();
  const targetIsAdmin = ADMIN_EMAILS.includes(target.email)
    || (targetDoc.exists && targetDoc.data().role === 'admin');
  if (targetIsAdmin) return res.status(400).json({ ok: false, error: 'cannot_reset_admin' });

  const password = generateTempPassword();
  await getAuth().updateUser(uid, { password });

  // Parol tiklash — XAVFSIZLIK hodisasi, shuning uchun eski seanslar uziladi:
  // telefoni o'g'irlangan holatda hisob o'g'rining qurilmasida ochiq qolib
  // ketmasligi kerak. Foydalanuvchining o'zi yangi parol bilan qaytadan
  // kiradi. Firebase mijozi buni darhol sezmaydi — keyingi token yangilashda,
  // ya'ni ~1 soat ichida chiqarib yuboradi.
  await getAuth().revokeRefreshTokens(uid)
    .catch((e) => console.warn('revokeRefreshTokens:', e.message));

  return res.status(200).json({ ok: true, password });
}

// ── action: delete-me ──────────────────────────────────────────────────────
// Foydalanuvchi O'Z hisobini o'chiradi (Sozlamalar → Hisobni o'chirish).
// Mijoz tomonidagi `deleteUser()` faqat Auth yozuvini o'chirardi va
// `users/{uid}/notifications` subkolleksiyasi qolib ketardi. Bu yerda tozalash
// admin yo'li bilan AYNI (purgeUser), ya'ni ikkala yo'l ham bir xil natija beradi.
//
// XAVFSIZLIK: uid FAQAT tekshirilgan ID token'dan olinadi — tanadagi qiymatga
// ishonilmaydi, ya'ni bu endpoint bilan BOSHQA odamning hisobini o'chirib bo'lmaydi.
// Parolni qayta kiritish (reauthentication) mijoz tomonida talab qilinadi;
// bu yerda token yangiligini ham tekshiramiz (auth_time).
async function handleDeleteMe(db, req, res) {
  const idToken = extractBearer(req);
  if (!idToken) return res.status(401).json({ ok: false, error: 'unauthorized' });

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ ok: false, error: 'invalid_token' });
  }

  // Token 10 daqiqadan eski autentifikatsiyaga tayanmasin: hisobni o'chirish
  // qaytarilmas amal, shuning uchun foydalanuvchi HOZIRGINA parolini
  // tasdiqlagan bo'lishi kerak (mijoz reauthenticate qiladi va tokenni yangilaydi).
  const authAgeSec = Math.floor(Date.now() / 1000) - (decoded.auth_time || 0);
  if (authAgeSec > 600) {
    return res.status(401).json({ ok: false, error: 'requires_recent_login' });
  }

  const { deleted, errors } = await purgeUser(db, decoded.uid);
  return res.status(200).json({ ok: errors.length === 0, deleted, errors });
}

const REFERRAL_BONUS_AMOUNT = 25000;
const BASE_REFERRALS = 5;
const MAX_REFERRALS_CAP = 7;

// ── action: grant-premium ──────────────────────────────────────────────────
// AdminPanel orqali Telegram qo'l to'lovi yoki Sovg'a Pro berish:
//  - mode='payment' → premiumPlan='paid', premiumMethod='telegram', payments/ hujjati yoziladi
//  - mode='gift'    → premiumPlan='admin', premiumMethod='admin'
//  - consumeBonus   → faqat sarflangan qismi ayiriladi (ortiqcha bonus saqlanadi)
//  - consumePromo   → promoDiscount tozalanadi
//  - markReferralPaid → referralCount++, 7-limit tekshiruvi, referrerSnap.exists(), bildirishnoma
async function handleGrantPremium(db, req, res) {
  const admin = await verifyAdmin(req, db).catch(() => null);
  if (!admin) return res.status(403).json({ ok: false, error: 'forbidden' });

  const uid = clip(req.body?.uid, 128)?.trim();
  if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

  const mode = req.body?.mode === 'payment' ? 'payment' : 'gift';
  const expireIso = req.body?.expireIso ? String(req.body.expireIso) : null;
  if (expireIso && Number.isNaN(new Date(expireIso).getTime())) {
    return res.status(400).json({ ok: false, error: 'invalid_expire' });
  }

  const planId = clip(req.body?.planId, 32)?.trim() || (mode === 'payment' ? 'manual' : 'admin');
  const planPrice = Number(req.body?.planPrice) || 0;
  const paidAmount = Number(req.body?.paidAmount);
  const durationMonths = req.body?.durationMonths != null ? Number(req.body.durationMonths) : null;
  const consumeBonus = req.body?.consumeBonus === true;
  const consumePromo = req.body?.consumePromo === true;
  const markReferralPaid = req.body?.markReferralPaid === true;
  const nowIso = new Date().toISOString();

  const userRef = db.collection('users').doc(uid);
  const transId = mode === 'payment' ? `tg_${Date.now()}_${uid.slice(0, 6)}` : null;

  const grantResult = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      const err = new Error('user_not_found');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    const u = userSnap.data();
    const curBonus = Math.max(0, Number(u.referralBonus) || 0);
    let usedBonus = 0;
    let remainingBonus = curBonus;

    if (consumeBonus && curBonus > 0) {
      if (planPrice > 0) {
        const usage = computeBonusUsage(planPrice, u);
        usedBonus = usage.usedBonus;
        remainingBonus = usage.remainingBonus;
      } else {
        usedBonus = curBonus;
        remainingBonus = 0;
      }
    }

    const patch = {
      isPremium: true,
      premiumSince: u.premiumSince || nowIso,
      premiumExpire: expireIso,
      premiumPlan: mode === 'payment' ? 'paid' : 'admin',
      premiumMethod: mode === 'payment' ? 'telegram' : 'admin',
      premiumGrantedBy: admin.email || admin.uid,
      reminderSent: false,
    };

    if (transId) patch.premiumTransId = transId;
    if (consumeBonus) patch.referralBonus = remainingBonus;
    if (consumePromo) {
      patch.promoDiscount = null;
      if (u.promoDiscount?.code) patch.promoUsedOnPayment = u.promoDiscount.code;
    }
    if (markReferralPaid) {
      patch.referralDiscount = 0;
      patch.discountExpired = true;
    }

    tx.update(userRef, patch);

    if (mode === 'payment' && transId) {
      const effectivePaid = Number.isFinite(paidAmount) && paidAmount >= 0
        ? Math.round(paidAmount)
        : Math.max(0, Math.round(planPrice - usedBonus));
      tx.set(db.collection('payments').doc(transId), {
        transId,
        provider: 'telegram',
        uid,
        planId,
        planPrice: Math.round(planPrice || effectivePaid),
        paidAmount: effectivePaid,
        usedBonus,
        durationMonths,
        premiumExpire: expireIso,
        grantedBy: admin.email || admin.uid,
        status: 'success',
        createdAt: nowIso,
      }, { merge: true });
    }

    return {
      referredBy: u.referredBy || null,
      usedBonus,
      remainingBonus,
      promoCleared: consumePromo && Boolean(u.promoDiscount),
      premiumSince: patch.premiumSince,
    };
  });

  // Referral bonusini to'lash — payment-webhook.js bilan 100% bir xil qoida
  let referralOutcome = null;
  if (markReferralPaid && grantResult.referredBy) {
    const refSnap = await db.collection('referrals')
      .where('referredId', '==', uid)
      .limit(1)
      .get();

    if (!refSnap.empty) {
      const refDocRef = refSnap.docs[0].ref;
      const referrerId = refSnap.docs[0].data().referrerId;
      const referrerRef = referrerId ? db.collection('users').doc(referrerId) : null;

      referralOutcome = await db.runTransaction(async (tx) => {
        const freshRef = await tx.get(refDocRef);
        if (!freshRef.exists) return null;
        const rData = freshRef.data();
        if (rData.bonusPaid === true || rData.status === 'paid') {
          return { skipped: 'already_paid' };
        }

        const referrerSnap = referrerRef ? await tx.get(referrerRef) : null;
        if (!referrerSnap || !referrerSnap.exists) {
          tx.update(refDocRef, {
            status: 'paid',
            paidAt: nowIso,
            bonusPaid: false,
            bonusAmount: 0,
            referrerDeleted: true,
          });
          return { skipped: 'referrer_deleted' };
        }

        const currentCount = Number(referrerSnap.data().referralCount) || 0;
        if (currentCount >= MAX_REFERRALS_CAP) {
          tx.update(refDocRef, {
            status: 'paid',
            paidAt: nowIso,
            bonusPaid: false,
            bonusAmount: 0,
            limitReached: true,
          });
          return { skipped: 'limit_reached', referrerId };
        }

        const newCount = currentCount + 1;
        tx.update(referrerRef, {
          referralBonus: FieldValue.increment(REFERRAL_BONUS_AMOUNT),
          referralCount: newCount,
        });
        tx.update(refDocRef, {
          status: 'paid',
          paidAt: nowIso,
          bonusPaid: true,
          bonusAmount: REFERRAL_BONUS_AMOUNT,
          paidByAdmin: admin.email || admin.uid,
        });

        return {
          paid: true,
          referrerId,
          referredName: rData.referredName || "Do'stingiz",
          newCount,
          bonusAmount: REFERRAL_BONUS_AMOUNT,
        };
      });

      if (referralOutcome?.paid && referralOutcome.referrerId) {
        const unlockedExtra = referralOutcome.newCount === BASE_REFERRALS;
        const msg = unlockedExtra
          ? `Tabriklaymiz! ${referralOutcome.referredName} Pro obuna oldi va sizga +${REFERRAL_BONUS_AMOUNT.toLocaleString()} so'm bonus yozildi. 5 ta do'stga yetganingiz uchun yana +2 ta qo'shimcha taklif joyi ochildi!`
          : `${referralOutcome.referredName} Pro obuna oldi — hisobingizga +${REFERRAL_BONUS_AMOUNT.toLocaleString()} so'm referral bonus yozildi. Keyingi to'lovingizda avtomatik ayiriladi!`;
        await db.collection('users').doc(referralOutcome.referrerId).collection('notifications').add({
          title: unlockedExtra ? '🏆 +2 ta qo\'shimcha joy ochildi!' : '🎉 Referral bonusi tushdi!',
          message: msg,
          type: 'referral_bonus',
          read: false,
          date: nowIso,
        }).catch((e) => console.warn('Referrer notif xatosi:', e?.message));
      }
    }
  }

  return res.status(200).json({
    ok: true,
    transId,
    usedBonus: grantResult.usedBonus,
    remainingBonus: grantResult.remainingBonus,
    promoCleared: grantResult.promoCleared,
    premiumSince: grantResult.premiumSince,
    referralOutcome,
  });
}

// ── action: sync-bundle ────────────────────────────────────────────────────
// AdminPanel savollarni tahrirlaganidan keyin faqat o'zgargan fanning
// `questionBundles/{cat}__n` bo'laklarini delta tarzda yangilaydi (3000 read o'rniga ~4 read!)
// va bitta `dbVersion` oshirishi bilan mijoz keshlarini sinxronlaydi.
const MAX_BUNDLE_CHUNK_BYTES = 800 * 1024;
const COMPACT_Q_KEYS = [
  'id', 'q', 'opts', 'correct', 'topicId', 'category', 'difficulty',
  'level', 'explanation', 'mnemonic', 'image', 'qHash', 'author', 'source', 'isHtml', 'svg', 'diagram',
];

function compactQuestion(raw) {
  const out = {};
  for (const k of COMPACT_Q_KEYS) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') out[k] = raw[k];
  }
  if (raw.correct !== undefined) out.correct = Number(raw.correct);
  if (raw.topicId !== undefined) out.topicId = Number(raw.topicId);
  return out;
}

function chunkList(list) {
  const chunks = [];
  let cur = [];
  let curBytes = 2;
  for (const item of list) {
    const s = JSON.stringify(item);
    const add = Buffer.byteLength(s, 'utf8') + 1;
    if (cur.length > 0 && curBytes + add > MAX_BUNDLE_CHUNK_BYTES) {
      chunks.push(cur);
      cur = [];
      curBytes = 2;
    }
    cur.push(item);
    curBytes += add;
  }
  if (cur.length > 0) chunks.push(cur);
  return chunks;
}

async function handleSyncBundle(db, req, res) {
  const admin = await verifyAdmin(req, db).catch(() => null);
  if (!admin) return res.status(403).json({ ok: false, error: 'forbidden' });

  const category = String(req.body?.category || '').trim();
  const upserts = Array.isArray(req.body?.upserts) ? req.body.upserts : [];
  const deletes = Array.isArray(req.body?.deletes) ? req.body.deletes.map(String) : [];
  const bumpVersion = req.body?.bumpVersion === true;

  if (category && !/^[a-z0-9_]{2,32}$/.test(category)) {
    return res.status(400).json({ ok: false, error: 'invalid_category' });
  }

  const vRef = db.collection('settings').doc('version');
  const vSnap = await vRef.get();
  const vData = vSnap.exists ? vSnap.data() : {};
  const nowIso = new Date().toISOString();

  let syncedCount = null;
  let writtenChunks = 0;

  if (category && (upserts.length > 0 || deletes.length > 0)) {
    const prevChunks = Number(vData.fsBundles?.[category]?.chunks || 0);
    let list = [];
    const oldChunkData = [];
    if (prevChunks > 0 && prevChunks <= 64) {
      const refs = Array.from({ length: prevChunks }, (_, i) =>
        db.collection('questionBundles').doc(`${category}__${i}`)
      );
      const snaps = await db.getAll(...refs);
      for (const s of snaps) {
        if (!s.exists) {
          oldChunkData.push(null);
          continue;
        }
        const rawStr = String(s.data()?.data || '[]');
        oldChunkData.push(rawStr);
        try {
          const arr = JSON.parse(rawStr);
          if (Array.isArray(arr)) list.push(...arr);
        } catch { /* buzuq bo'lak */ }
      }
    }

    if (list.length > 0 || upserts.length > 0) {
      const deleteSet = new Set(deletes);
      const upsertMap = new Map();
      for (const raw of upserts) {
        if (raw && raw.id) upsertMap.set(String(raw.id), compactQuestion(raw));
      }

      const nextList = [];
      const seen = new Set();
      for (const item of list) {
        const id = String(item?.id || '');
        if (deleteSet.has(id)) continue;
        if (upsertMap.has(id)) {
          nextList.push(upsertMap.get(id));
          seen.add(id);
        } else {
          nextList.push(item);
          if (id) seen.add(id);
        }
      }
      for (const [id, q] of upsertMap.entries()) {
        if (!seen.has(id) && !deleteSet.has(id)) nextList.push(q);
      }

      const newChunks = chunkList(nextList);
      for (let i = 0; i < newChunks.length; i += 1) {
        const json = JSON.stringify(newChunks[i]);
        // Delta-only: faqat o'zgargan bo'lak (yoki jami bo'lak soni o'zgarganda) yoziladi
        if (newChunks.length === prevChunks && oldChunkData[i] === json) continue;
        await db.collection('questionBundles').doc(`${category}__${i}`).set({
          category,
          chunk: i,
          chunks: newChunks.length,
          count: newChunks[i].length,
          data: json,
          updatedAt: nowIso,
        });
        writtenChunks += 1;
      }
      for (let i = newChunks.length; i < prevChunks; i += 1) {
        await db.collection('questionBundles').doc(`${category}__${i}`).delete();
      }

      const topicCounts = {};
      for (const q of nextList) {
        if (q.topicId !== undefined && q.topicId !== null) {
          topicCounts[q.topicId] = (topicCounts[q.topicId] || 0) + 1;
        }
      }

      await db.collection('settings').doc('questionMeta').set({
        [category]: { count: nextList.length, topics: topicCounts, updatedAt: nowIso },
      }, { merge: true });

      const vPatch = {
        fsBundles: {
          ...(vData.fsBundles || {}),
          [category]: { chunks: newChunks.length, count: nextList.length, updatedAt: nowIso },
        },
        questionMeta: {
          ...(vData.questionMeta || {}),
          [category]: { count: nextList.length, updatedAt: nowIso },
        },
        updatedAt: nowIso,
      };
      if (bumpVersion) vPatch.dbVersion = Date.now();
      await vRef.set(vPatch, { merge: true });
      syncedCount = nextList.length;
    }
  } else if (bumpVersion) {
    await vRef.set({ dbVersion: Date.now(), updatedAt: nowIso }, { merge: true });
  }

  return res.status(200).json({
    ok: true,
    category: category || null,
    count: syncedCount,
    writtenChunks,
    versionBumped: bumpVersion,
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  // `action` ni query'dan ham, body'dan ham qabul qilamiz
  const action = (req.query?.action || req.body?.action || req.body?.type || '').toString();

  try {
    const db = getDb();

    // FCM push — admin-only (o'zining auth tekshiruvi bor)
    if (action === 'push') return await handlePush(req, res);

    if (action === 'delete-request') return await handleDeleteRequest(db, req, res);

    if (action === 'delete-user') return await handleDeleteUser(db, req, res);

    if (action === 'reset-password') return await handleResetPassword(db, req, res);

    if (action === 'delete-me') return await handleDeleteMe(db, req, res);

    if (action === 'register') return await handleRegister(db, req, res);

    if (action === 'ensure-id') return await handleEnsureId(db, req, res);

    if (action === 'grant-premium') return await handleGrantPremium(db, req, res);

    if (action === 'sync-bundle') return await handleSyncBundle(db, req, res);

    // ── Qolgan hamma narsa: FAQAT ADMIN ──
    // Avval bu yerda ixtiyoriy `message` auth'siz qabul qilinardi.
    const admin = await verifyAdmin(req, db).catch(() => null);
    if (!admin) return res.status(403).json({ success: false, error: 'forbidden' });

    const message = clip(req.body?.message, 2000);
    if (!message) return res.status(400).json({ success: false, error: 'message_required' });

    await sendToAdmin(db, '🔔 <b>Eslatma</b>\n\n' + escapeHtml(message));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notify error:', error);
    // Ichki xato matni mijozga chiqarilmaydi
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}

