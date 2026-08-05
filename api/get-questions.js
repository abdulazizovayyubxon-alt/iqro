import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Bepul sinov muddati — src/config.js dagi FREE_TRIAL_DAYS bilan bir xil
// bo'lishi SHART (config.js import.meta.env ishlatgani uchun bu yerga
// import qilinmaydi).
const TRIAL_DAYS = 7;

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

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const db = getDb();
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
    
    // User is authorized, get the secure download URL
    const versionSnap = await db.collection('settings').doc('version').get();
    if (!versionSnap.exists) {
      return res.status(404).json({ error: 'Not Found: Version settings missing' });
    }
    
    const storageUrls = versionSnap.data().urls || {};
    const downloadUrl = storageUrls[category];
    
    if (!downloadUrl) {
      return res.status(404).json({ error: 'Not Found: Questions bundle for this category is not available' });
    }
    
    // Fetch the JSON from the hidden storage URL and pipe it to the client
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch from storage' });
    }
    
    const data = await response.json();

    // ── Kesh: `private`, umumiy CDN'ga TUSHMAYDI ──
    // AUDIT 2026-08-05, 14-BAND: avval `public, s-maxage=86400` edi. Bu
    // avtorizatsiyaga bog'liq (premium/trial tekshiruvidan o'tgan) javob uchun
    // xato signal: umumiy proksi yoki CDN uni keshlab, tekshiruvdan o'tmagan
    // so'rovga ham berishi mumkin. Mijoz o'zi localforage'da keshlaydi, shuning
    // uchun CDN keshining foydasi ham yo'q.
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(data);
    
  } catch (error) {
    console.error('get-questions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

