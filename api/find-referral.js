import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return { db: getFirestore() };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const { db } = getAdminApp();
    
    // Qidiruv faqat referralCode orqali, bu foydalanuvchilar o'rtasida taklif uchun
    const snapshot = await db.collection('users')
      .where('referralCode', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ user: null });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // 🔥 Xavfsizlik: Barcha ma'lumotlarni qaytarmaymiz (telefon, PII maxfiy qoladi)
    // Faqat referral ulash uchun zarur ma'lumotlar
    return res.status(200).json({ 
      user: {
        uid: doc.id,
        displayName: data.displayName || '',
      }
    });
  } catch (err) {
    console.error('Find referral error:', err);
    return res.status(500).json({ error: err.message });
  }
}
