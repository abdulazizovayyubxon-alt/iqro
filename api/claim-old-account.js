import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
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
  return { auth: getAuth(), db: getFirestore() };
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

  const { phone, newPassword } = req.body;
  if (!phone || !newPassword) {
    return res.status(400).json({ error: 'Phone and newPassword are required' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const email = `${cleanPhone}@iqro.uz`;

  try {
    const { auth, db } = getAdminApp();

    // 1. Foydalanuvchini email orqali qidiramiz
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e) {
      return res.status(404).json({ success: false, reason: 'user_not_found' });
    }

    // 2. Foydalanuvchini bazadan qidiramiz
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', cleanPhone).limit(1).get();

    let userDoc = null;
    let userData = null;

    if (!snapshot.empty) {
      userDoc = snapshot.docs[0];
      userData = userDoc.data();
      
      // Xavfsizlik: faqat "hali o'zi parol o'rnatmagan" (migratsiya qilingan) 
      // eski foydalanuvchilarning parolini o'zgartirish mumkin.
      if (userData.hasClaimedAccount) {
        return res.status(403).json({ success: false, reason: 'already_claimed' });
      }
    }

    // 4. Parolni o'zgartiramiz
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });

    // 5. Bazada belgilab qo'yamiz (agar baza hujjati mavjud bo'lsa)
    if (userDoc) {
      await userDoc.ref.update({
        hasClaimedAccount: true,
        lastLoginAt: new Date().toISOString()
      });
    } else {
      // Agar bazada bo'lmasa, uni yangi yaratamiz
      await usersRef.doc(userRecord.uid).set({
        phone: cleanPhone,
        hasClaimedAccount: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Claim old account error:', error);
    return res.status(500).json({ error: error.message });
  }
}
