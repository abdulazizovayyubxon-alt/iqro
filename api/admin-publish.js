import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

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
  const { secret } = req.query;
  if (secret !== 'iqro-publish-2026') {
    return res.status(403).json({ error: 'Unauthorized: Invalid secret' });
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
        metadata: {
          cacheControl: 'public, max-age=3600',
        }
      });
      
      try {
        await file.makePublic();
      } catch (e) {
        console.warn(`Could not make public ${cat}:`, e.message);
      }
      
      // Use Firebase Storage standard public URL format or GCS public URL format
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/bundles%2F${cat}.json?alt=media`;
      storageUrls[cat] = url;
    }
    
    // Update version doc
    await db.collection('settings').doc('version').set({
      dbVersion: dbVersion,
      urls: storageUrls,
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
      urls: storageUrls
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
