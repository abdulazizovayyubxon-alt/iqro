import { initializeApp, cert, getApps } from 'firebase-admin/app';
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
  try {
    const db = getDb();
    const versionSnap = await db.collection('settings').doc('version').get();
    if (!versionSnap.exists) {
      return res.status(404).json({ error: 'version document not found' });
    }
    res.status(200).json(versionSnap.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
