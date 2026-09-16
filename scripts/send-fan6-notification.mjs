import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

async function main() {
  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL yoki ADMIN_PASSWORD topilmadi');
    process.exit(1);
  }

  console.log(`🔐 Admin (${email}) sifatida tizimga kirilmoqda...`);
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(`✓ Tizimga muvaffaqiyatli kirildi. UID: ${cred.user.uid}`);

  const db = getFirestore(app);
  const nowIso = new Date().toISOString();

  const notifData = {
    title: "🎉 Katta yangilanish: 6 ta yangi fan to'liq qo'shildi!",
    message: "Hurmatli ustozlar va pedagoglar! Zehin platformasiga 6 ta yangi yo'nalish bo'yicha toifa testlari to'liq qo'shildi: Matematika, Fizika, Tarbiya, Pedagogik mahorat, Texnologiya (dizayn) va Texnologiya (servis). Fanlar ro'yxatidan o'z yo'nalishingizni tanlab, bilimlaringizni bepul sinab ko'rishingiz mumkin!",
    type: 'success',
    targetUser: 'all',
    date: nowIso,
    createdAt: nowIso,
    createdBy: cred.user.uid,
  };

  console.log('📤 Bildirishnoma Firestore ga yozilmoqda...');
  const docRef = await addDoc(collection(db, 'notifications'), notifData);
  console.log(`✅ Bildirishnoma muvaffaqiyatli yuborildi! ID: ${docRef.id}`);

  // Tekshirish uchun oxirgi bildirishnomalarni ko'rsatamiz
  const q = query(collection(db, 'notifications'), orderBy('date', 'desc'), limit(3));
  const snap = await getDocs(q);
  console.log('\n📋 Bazadagi oxirgi bildirishnomalar:');
  snap.forEach((d) => {
    const data = d.data();
    console.log(`- [${d.id}] ${data.title} (${data.date})`);
    console.log(`  ${data.message}`);
  });
}

main().catch((err) => {
  console.error('❌ Xatolik yuz berdi:', err);
  process.exit(1);
});
