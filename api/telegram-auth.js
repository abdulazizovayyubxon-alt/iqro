import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).send('No sessionId');

  try {
    const db = getDb();
    const docRef = db.collection('logins').doc(sessionId);
    const snap = await docRef.get();
    
    if (snap.exists) {
      const data = snap.data();
      if (data.status === 'success' && data.token) {
        // Optional: delete doc after reading to prevent reuse
        await docRef.delete();
        return res.status(200).json({ success: true, token: data.token });
      }
    }
    
    res.status(200).json({ success: false });
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
