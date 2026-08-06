/**
 * ════════════════════════════════════════════════════════════
 *  Vercel Serverless Function — Ilova salomatligi (health check)
 *  api/health.js
 * ════════════════════════════════════════════════════════════
 *
 *  "Ilova ishlayaptimi?" degan savolga bir so'rovda javob beradi.
 *  Yuk sinovi (load test) paytida ham shu endpoint kuzatiladi:
 *  Firestore sekinlashsa, `firestoreMs` o'sib boradi — qulashdan
 *  ANCHA oldin ogohlantiradi.
 *
 *  Foydalanish:
 *    curl https://<domen>/api/health
 *    → { "ok": true, "firestore": "up", "firestoreMs": 47, ... }
 *
 *  HTTP status: hammasi joyida bo'lsa 200, aks holda 503 — shuning
 *  uchun tashqi monitoring (UptimeRobot, Better Stack va h.k.) uni
 *  hech qanday sozlashsiz tushunadi.
 *
 *  XAVFSIZLIK/NARX:
 *   - Maxfiy ma'lumot qaytarmaydi (faqat holat + millisekund).
 *   - Auth talab qilmaydi — monitoring xizmatlari token yubora olmaydi.
 *   - CDN keshi 30 soniya: kimdir sekundiga 100 marta so'rasa ham
 *     Firestore'ga bittagina o'qish tushadi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

// Sovuq start (cold start) ni aniqlash uchun: modul bir marta yuklanadi,
// keyingi so'rovlar iliq (warm) nusxaga tushadi.
const BOOTED_AT = Date.now();
let servedRequests = 0;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const isColdStart = servedRequests === 0;
  servedRequests++;

  const checks = {};
  let allOk = true;

  // ── 1. Muhit o'zgaruvchilari joyidami? (Firestore'ga tegmaydi, tekin) ──
  const requiredEnv = ['FIREBASE_SERVICE_ACCOUNT'];
  const missingEnv = requiredEnv.filter(k => !process.env[k]);
  checks.env = missingEnv.length === 0 ? 'ok' : 'missing';
  if (missingEnv.length > 0) {
    allOk = false;
    checks.envMissing = missingEnv;   // kalit NOMI, qiymati emas
  }

  // ── 2. Firestore tirikmi va qanchada javob beradi? ──
  // `settings/version` — eng kichik va eng muhim hujjat (savollar versiyasi
  // shu yerda). Bitta hujjat o'qish = eng arzon tekshiruv.
  let questionsVersion = null;
  const t0 = Date.now();
  try {
    const snap = await getDb().collection('settings').doc('version').get();
    checks.firestoreMs = Date.now() - t0;
    if (snap.exists) {
      checks.firestore = 'up';
      const data = snap.data() || {};
      questionsVersion = data.dbVersion ?? null;   // AdminPage «Yangilanishni yuborish» va scripts/bump-questions-version.mjs shu nomda yozadi
      // Savollar qayerdan kelayotgani. `urls` ATAYLAB bo'sh qoldirilgan
      // (scripts/bump-questions-version.mjs:15) — ochiq Storage URL'i pullik
      // bazani login'siz yuklab olishga imkon berardi. Bo'sh bo'lsa ilova
      // TestPage.jsx:428 dagi Firestore fallback'iga tushadi.
      // 0 = kutilgan holat, nosozlik EMAS.
      checks.questionSource = Object.keys(data.urls || {}).length > 0
        ? 'storage-bundle'
        : 'firestore-fallback';
    } else {
      // Baza javob berdi, lekin sozlama hujjati yo'q — ilova savol yuklay olmaydi
      checks.firestore = 'up';
      checks.settingsDoc = 'missing';
      allOk = false;
    }
  } catch (err) {
    checks.firestoreMs = Date.now() - t0;
    checks.firestore = 'down';
    // Kvota tugashi eng ehtimolli nosozlik — uni alohida ko'rsatamiz,
    // chunki yechimi butunlay boshqacha (reja/byudjet, kod emas).
    checks.firestoreError =
      err?.code === 8 || /quota|RESOURCE_EXHAUSTED/i.test(err?.message || '')
        ? 'quota_exceeded'
        : (err?.code ? String(err.code) : 'unknown');
    allOk = false;
  }

  // Monitoring xizmati 30 soniyada bir marta so'rasa yetarli
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');

  return res.status(allOk ? 200 : 503).json({
    ok: allOk,
    ...checks,
    questionsVersion,
    coldStart: isColdStart,
    instanceAgeMs: Date.now() - BOOTED_AT,
    region: process.env.VERCEL_REGION || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    time: new Date().toISOString(),
  });
}
