#!/usr/bin/env node
import 'dotenv/config';
import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp as initAdminApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("❌ .env da ADMIN_EMAIL / ADMIN_PASSWORD yo'q");
  process.exit(1);
}

const title = "🎉 Yangi fan qo'shildi: MTT Jismoniy tarbiya yo'riqchisi!";
const message = "Hurmatli ustozlar! Platformamizga yangi «MTT jismoniy tarbiya yo'riqchisi» fani bo'yicha 3 000+ ta toifa test savollari qo'shildi. Fanlar ro'yxatidan tanlab, bilimlaringizni sinab ko'rishingiz mumkin.";

async function run() {
  console.log(`🔐 ${email} bilan tizimga kirilmoqda...`);
  
  const clientApp = initClientApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });

  const userCred = await signInWithEmailAndPassword(getAuth(clientApp), email, password);
  const db = getFirestore(clientApp);

  console.log(`📝 Umumiy bildirishnoma yaratilmoqda...`);
  const notifDoc = {
    title,
    message,
    type: 'success',
    targetUser: 'all',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: userCred.user.uid,
  };

  const docRef = await addDoc(collection(db, 'notifications'), notifDoc);
  console.log(`✅ Bildirishnoma Firestore'ga yozildi! (Doc ID: ${docRef.id})`);

  // FCM Push Notifications
  try {
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountStr) {
      console.log(`📲 FCM orqali Push bildirishnoma yuborilmoqda...`);
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountStr);
      } catch {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
      }
      
      const adminApp = initAdminApp({ credential: cert(serviceAccount) }, 'admin-broadcast');
      const adminDb = getAdminFirestore(adminApp);
      const messaging = getMessaging(adminApp);

      const usersSnap = await adminDb.collection('users').get();
      let tokens = [];
      usersSnap.forEach(d => {
        const t = d.data().fcmTokens;
        if (Array.isArray(t)) tokens.push(...t);
      });
      tokens = [...new Set(tokens)].filter(Boolean);

      console.log(`👥 Jami ${tokens.length} ta faol FCM qurilma tokeni topildi.`);
      let sentCount = 0;
      for (let i = 0; i < tokens.length; i += 500) {
        const batch = tokens.slice(i, i + 500);
        const resp = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body: message },
          webpush: { fcmOptions: { link: '/' } },
        });
        sentCount += resp.successCount;
      }
      console.log(`🚀 ${sentCount} ta qurilmaga Push xabarnoma yetkazildi!`);
    } else {
      console.log(`ℹ️ FIREBASE_SERVICE_ACCOUNT sozlanmagan, faqat Firestore xabarnomasi yozildi.`);
    }
  } catch (err) {
    console.warn(`⚠️ Push yuborishda xato (zararsiz):`, err.message);
  }

  console.log(`\n🎉 Barcha foydalanuvchilarga xabar muvaffaqiyatli yuborildi!`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Xatolik:", err);
  process.exit(1);
});
