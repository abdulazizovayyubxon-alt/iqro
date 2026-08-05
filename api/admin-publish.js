import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { verifySecret, extractBearer } from './_shared.js';

function getDbAndStorage() {
  if (getApps().length === 0) {
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
      serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
    }
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'iqro-platforma.firebasestorage.app'
    });
  }
  return { db: getFirestore(), storage: getStorage() };
}

export default async function handler(req, res) {
  // POST majburiy: avval GET ham ishlardi, ya'ni og'ir (butun `questions`
  // kolleksiyasini o'qiydigan) amal oddiy havola bilan ishga tushardi.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Maxfiy kalit FAQAT env'dan olinadi va FAQAT header/body orqali qabul
  // qilinadi. Avval `?secret=` query parametrida edi — u Vercel kirish
  // jurnaliga, brauzer tarixiga va Referer sarlavhasiga tushardi.
  // verifySecret() deny-by-default + doimiy vaqtli taqqoslash.
  const provided = extractBearer(req) || req.body?.secret || null;
  if (!verifySecret(provided, process.env.PUBLISH_SECRET)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { db, storage } = getDbAndStorage();
    
    // Fetch all questions
    const snap = await db.collection('questions').get();
    const allQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Group by category
    const bundles = {};
    allQuestions.forEach(q => {
      let cat = q.category || 'other';
      if (Array.isArray(cat)) cat = cat[0];
      if (!bundles[cat]) bundles[cat] = [];
      bundles[cat].push(q);
    });
    
    const categories = Object.keys(bundles);
    const storageUrls = {};
    const dbVersion = Date.now();
    const bucket = storage.bucket();
    
    for (const cat of categories) {
      const jsonStr = JSON.stringify(bundles[cat]);
      const file = bucket.file(`bundles/${cat}.json`);

      await file.save(jsonStr, {
        contentType: 'application/json',
        // `private` — bu pullik kontent, umumiy CDN/proksi keshlamasligi kerak
        metadata: { cacheControl: 'private, max-age=0, no-store' },
      });

      // ⚠️ AUDIT 2026-08-05, 2-BAND — `makePublic()` OLIB TASHLANDI.
      // U bundle'ni butun internetga ochardi, URL manzili esa to'liq taxmin
      // qilinadi (`bundles/<fan>.json`) — ya'ni ~47k savollik PULLIK baza
      // login'siz yuklab olinardi. `settings/version.urls` ham endi
      // TO'LDIRILMAYDI: mijoz savollarni faqat /api/get-questions orqali
      // (premium/trial tekshiruvi bilan) yoki Firestore'dan (rules bilan
      // gated) oladi.
      //
      // Kelajakda to'g'ridan-to'g'ri yuklash kerak bo'lsa — file.getSignedUrl()
      // bilan muddatli havola yasang, makePublic() BILAN EMAS.
      storageUrls[cat] = null;
    }

    // Update version doc.
    // `urls` ATAYLAB bo'sh: scripts/bump-questions-version.mjs bilan bir xil
    // qaror (o'sha faylning izohiga qarang). Mavjud eski qiymatlarni ham
    // tozalaymiz — aks holda avvalgi publish qoldirgan ochiq URL'lar
    // ishlashda davom etardi.
    await db.collection('settings').doc('version').set({
      dbVersion: dbVersion,
      urls: {},
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Fan bo'yicha savol soni + yangilanish sanasi — ishonch badge'lari uchun
    // (Dashboard va Onboarding fan kartalarida ko'rsatiladi)
    const questionMeta = {};
    for (const cat of categories) {
      questionMeta[cat] = {
        count: bundles[cat].length,
        updatedAt: new Date().toISOString()
      };
    }
    await db.collection('settings').doc('questionMeta').set(questionMeta, { merge: true });
    
    res.status(200).json({
      success: true,
      dbVersion,
      categories: categories.length,
      // `urls` qaytarilmaydi — ochiq havola endi yasalmaydi (2-band)
    });
  } catch (error) {
    // Ichki xato matni mijozga CHIQARILMAYDI (avval error.message qaytarilardi:
    // u Firestore/Storage ichki tuzilishi haqida ma'lumot oshkor qilardi).
    console.error('admin-publish error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}
