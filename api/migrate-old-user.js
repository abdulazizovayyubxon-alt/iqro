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

  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const email = `${cleanPhone}@iqro.uz`;
  const autoPassword = `iqro_auto_pass_${cleanPhone}`;

  try {
    const { auth, db } = getAdminApp();

    // Avval Firestore'dan tekshiramiz (Eski foydalanuvchimi?)
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', cleanPhone).limit(1).get();

    if (snapshot.empty) {
      return res.status(200).json({ success: false, reason: 'not_found_in_db' });
    }

    // Auth'da qidiramiz
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      // Parolni majburiy yangilash (Eski parol qanday bo'lganidan qat'i nazar)
      await auth.updateUser(userRecord.uid, {
        password: autoPassword
      });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        // Auth da yo'q bo'lsa (faqat telefon orqali kiritilgan bo'lsa) yaratamiz
        const oldUid = snapshot.docs[0].id;
        userRecord = await auth.createUser({
          uid: oldUid, // Firestore dagi eski UID ni saqlab qolamiz!
          email: email,
          password: autoPassword,
          displayName: snapshot.docs[0].data().displayName || 'Foydalanuvchi'
        });
      } else {
        throw e;
      }
    }

    return res.status(200).json({ success: true, migrated: true });
  } catch (err) {
    console.error('Migrate user error:', err);
    return res.status(500).json({ error: err.message });
  }
}
