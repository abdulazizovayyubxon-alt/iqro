import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }
  
  const { category } = req.query;
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
    
    // Calculate trial expiration (7 days)
    let isTrial = false;
    if (userData.createdAt) {
      const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
      const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      isTrial = diffDays <= 7;
    } else {
      // If no creation date or missing user doc, we can assume trial is valid from today 
      // OR we can just grant them trial. Let's just grant them trial since they just authenticated.
      isTrial = true;
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
    
    // Return the actual JSON payload
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // optional caching
    res.status(200).json(data);
    
  } catch (error) {
    console.error('get-questions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

