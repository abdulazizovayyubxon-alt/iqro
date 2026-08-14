/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — savol paketini berish
 *  api/get-questions.js
 * ════════════════════════════════════════════════════════════
 *
 *  NEGA BU FAYL BOR (narx tarixi — o'qimasdan tegmang):
 *
 *  1) Boshida savollar Storage'ga OCHIQ (`makePublic` / `getDownloadURL`)
 *     yuklanardi va havola `settings/version.urls` da turardi. Bu hujjatni
 *     har bir kirgan foydalanuvchi o'qiy olardi ⇒ ~45k savollik pullik baza
 *     login'siz yuklab olinardi (audit 2026-08-05, 2-band).
 *
 *  2) Teshik yopilganda `urls` bo'shatildi va uni to'ldiradigan yo'l qolmadi.
 *     Natijada bu endpoint HAR DOIM 404 qaytardi va ilova TestPage/ExamPage
 *     dagi zaxira yo'lga — `getDocs(where('category','==',fan))` ga — tushdi.
 *     Ya'ni HAR sovuq yuklash = FAN BO'YICHA ~2 900 FIRESTORE O'QISHI.
 *     Spark bepul rejasi (50 000 o'qish/kun) kuniga ~17 ta shunday yuklashga
 *     yetadi — kvota muntazam tugab, ilova HAMMA uchun ishlamay qolardi.
 *
 *  3) HOZIRGI YECHIM: paket Storage'da MAXFIY turadi (storage.rules:
 *     `bundles/` → `allow read: if false`), havola esa mijozga UMUMAN
 *     berilmaydi. Faylni faqat SHU funksiya, Admin SDK bilan (qoidalarni
 *     chetlab o'tadi) o'qiydi va tekshiruvdan o'tgan mijozga uzatadi.
 *     `settings/version.bundles` da URL emas, Storage ICHKI YO'LI saqlanadi —
 *     u oshkor bo'lsa ham hech narsa bermaydi.
 *
 *     Narxi: foydalanuvchi boshiga ~2 900 o'qish o'rniga 2 ta (users/{uid} +
 *     settings/version). Paketni yasash faqat admin "qayta qurish" tugmasini
 *     bosganda bo'ladi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { parseServiceAccount, extractBearer } from './_shared.js';

// Bepul sinov muddati — src/config.js dagi FREE_TRIAL_DAYS bilan bir xil
// bo'lishi SHART (config.js import.meta.env ishlatgani uchun bu yerga
// import qilinmaydi).
const TRIAL_DAYS = 7;

let dbInstance = null;
let bucketRef = null;

/**
 * Storage bucket nomi. Admin SDK `storageBucket` sozlanmasa `bucket()` ni
 * xatoga uchratadi, shuning uchun ATAYLAB aniq beriladi. Mijoz konfiguratsiyasi
 * (`VITE_FIREBASE_STORAGE_BUCKET`) Vercel env'da allaqachon bor; bo'lmasa
 * servis hisobidagi loyiha ID'sidan tiklanadi.
 */
function bucketName(serviceAccount) {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${serviceAccount.project_id}.appspot.com`
  );
}

function boot() {
  if (!dbInstance) {
    const serviceAccount = parseServiceAccount();
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: bucketName(serviceAccount),
      });
    }
    dbInstance = getFirestore();
    // Bucket nomi ATAYLAB aniq beriladi: app boshqa joyda (getApps() bo'sh
    // emas) `storageBucket`siz ishga tushirilgan bo'lsa, parametrsiz
    // `bucket()` "Bucket name not specified" bilan yiqilardi.
    bucketRef = getStorage().bucket(bucketName(serviceAccount));
  }
  return dbInstance;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  // `category` — Firestore'dagi obyektga kalit sifatida ishlatiladi, shuning
  // uchun formatni qat'iy cheklaymiz. Aks holda `?category=__proto__` kabi
  // qiymat Object.prototype'ni qaytarib fetch()ni yiqitardi (500 shovqini).
  const category = String(req.query?.category || '');
  if (!/^[a-z0-9_]{2,32}$/.test(category)) {
    return res.status(400).json({ error: 'Bad Request: invalid category' });
  }

  const idToken = extractBearer(req);
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  try {
    const db = boot();
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    let userData = {};
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
      userData = userSnap.data();
    }

    const isPremium = userData.isPremium === true;

    // ── Trial hisobi (7 kun) ──
    // AUDIT 2026-08-05, 14-BAND: avval `createdAt` yo'q bo'lsa `isTrial = true`
    // berilardi ("baribir autentifikatsiyadan o'tdi" mulohazasi bilan). Natijada
    // hujjati yaratilmagan yoki `createdAt`i yo'qolgan hisob CHEKSIZ trial olardi
    // — ya'ni pullik kontentga muddatsiz kirish. Endi noaniq holat = RUXSAT YO'Q.
    let isTrial = false;
    if (userData.createdAt) {
      const createdDate = userData.createdAt.toDate
        ? userData.createdAt.toDate()
        : new Date(userData.createdAt);
      if (!Number.isNaN(createdDate.getTime())) {
        const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        isTrial = diffDays <= TRIAL_DAYS;
      }
    }

    if (!isPremium && !isTrial) {
      return res.status(403).json({ error: 'Forbidden: Premium required or Trial expired' });
    }

    // ── Paket qayerda turibdi? ──
    const versionSnap = await db.collection('settings').doc('version').get();
    if (!versionSnap.exists) {
      return res.status(404).json({ error: 'Not Found: Version settings missing' });
    }

    // ⚠️ ESKI `urls` MAYDONI ATAYLAB O'QILMAYDI. U ochiq havolalarni saqlagan
    // va o'sha teshik sababli bo'shatilgan; qayta o'qilsa, bucket'da qolib
    // ketgan eski token'li havola yana ishga tushib ketishi mumkin edi.
    const bundles = versionSnap.data().bundles || {};
    const entry = bundles[category];
    const path = typeof entry === 'string' ? entry : entry?.path;

    if (!path || typeof path !== 'string' || !path.startsWith('bundles/')) {
      // Bu NOSOZLIK EMAS: admin hali paketni qurmagan bo'lishi mumkin.
      // Mijoz Firestore zaxirasiga tushadi (qimmat, lekin ishlaydi).
      return res.status(404).json({ error: 'Not Found: bundle_not_published' });
    }

    // Admin SDK Storage qoidalarini CHETLAB O'TADI — fayl `allow read: if false`
    // ostida tursa ham o'qiladi. Aynan shu sabab havola mijozga kerak emas.
    const [buf] = await bucketRef.file(path).download();

    // ── Kesh: `private`, umumiy CDN'ga TUSHMAYDI ──
    // AUDIT 2026-08-05, 14-BAND: avval `public, s-maxage=86400` edi. Bu
    // avtorizatsiyaga bog'liq (premium/trial tekshiruvidan o'tgan) javob uchun
    // xato signal: umumiy proksi yoki CDN uni keshlab, tekshiruvdan o'tmagan
    // so'rovga ham berishi mumkin. Mijoz o'zi localforage'da keshlaydi, shuning
    // uchun CDN keshining foydasi ham yo'q.
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Xom bayt sifatida uzatiladi: JSON.parse + qayta serializatsiya 2.5 MB
    // uchun ortiqcha CPU va xotira (funksiya limiti) sarflardi.
    return res.status(200).send(buf);

  } catch (error) {
    console.error('get-questions error:', error);
    // Fayl yo'qolgan/nomi noto'g'ri bo'lsa ham mijoz zaxira yo'ldan ishlashi
    // uchun 404 beramiz — 500 bo'lsa ham natija bir xil, lekin 404 aniqroq.
    if (error?.code === 404 || /No such object/i.test(error?.message || '')) {
      return res.status(404).json({ error: 'Not Found: bundle_missing' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
