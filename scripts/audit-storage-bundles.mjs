#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// audit-storage-bundles.mjs — Storage'dagi savol bundle'larini tekshirish
// va ochiq (public) ruxsatni bekor qilish.
//
// NEGA KERAK (audit 2026-08-05, 2-band):
//   Ilgari savollar `bundles/<fan>.json` sifatida Storage'ga yuklanib,
//   ochiq havola olardi. Ikki yo'l bilan:
//     · api/admin-publish.js  → file.makePublic()  (GCS obyekt ACL'i)
//     · AdminPage "Publish"   → getDownloadURL()   (`?token=` havolasi)
//   IKKALASI ham Storage xavfsizlik QOIDALARINI CHETLAB O'TADI va
//   autentifikatsiyasiz ishlaydi. Ya'ni ~47k savollik pullik baza login'siz
//   yuklab olinishi mumkin edi. Kod tuzatildi, LEKIN avval yuklangan fayllar
//   va ularning havolalari bucket'da QOLGAN bo'lishi mumkin.
//
//   Bu skript o'sha qoldiqni topadi va zararsizlantiradi.
//
// FOYDALANISH:
//   node scripts/audit-storage-bundles.mjs            # faqat KO'RSATADI
//   node scripts/audit-storage-bundles.mjs --revoke   # ochiq ruxsatni bekor qiladi
//   node scripts/audit-storage-bundles.mjs --delete   # fayllarni butunlay o'chiradi
//
//   `--revoke` — TAVSIYA ETILADI: qaytarib bo'ladigan amal. Fayl qoladi, lekin
//   tashqi havolalar ishlamaydi (ACL olinadi + download token yangilanadi).
//   `--delete` — qaytarib bo'lmaydi. Fayllar Firestore'dan qayta yasaladi,
//   shuning uchun ma'lumot yo'qolmaydi, lekin ehtiyot bo'ling.
//
// HISOB MA'LUMOTI:
//   FIREBASE_SERVICE_ACCOUNT (JSON yoki base64) kerak — u Vercel env'da turadi.
//   Lokalda: `vercel env pull .env.local` yoki Firebase Console →
//   Project settings → Service accounts → Generate new private key.
// ════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

const REVOKE = process.argv.includes('--revoke');
const DELETE = process.argv.includes('--delete');

if (REVOKE && DELETE) {
  console.error('❌ --revoke va --delete birga ishlatilmaydi. Bittasini tanlang.');
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT sozlanmagan.');
  console.error('   Lokalda: vercel env pull .env.local');
  console.error('   yoki Firebase Console → Service accounts → Generate new private key');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch {
  serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString());
}

// Bucket nomi: yangi loyihalarda `<project>.firebasestorage.app`,
// 2024-oktabrdan oldingilarda `<project>.appspot.com`. Ikkalasini ham sinaymiz.
const projectId = serviceAccount.project_id;
const CANDIDATES = [
  process.env.VITE_FIREBASE_STORAGE_BUCKET,
  `${projectId}.firebasestorage.app`,
  `${projectId}.appspot.com`,
].filter(Boolean);

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const storage = getStorage();
const db = getFirestore();

console.log(`\nLoyiha: ${projectId}`);
console.log(`Rejim:  ${DELETE ? '🗑  O\'CHIRISH' : REVOKE ? '🔒 RUXSATNI BEKOR QILISH' : '👁  faqat ko\'rish (--revoke / --delete bilan o\'zgartiriladi)'}\n`);

let foundAny = false;

for (const name of [...new Set(CANDIDATES)]) {
  const bucket = storage.bucket(name);

  let exists;
  try {
    [exists] = await bucket.exists();
  } catch (err) {
    console.log(`  ${name} → tekshirib bo'lmadi (${err.message})`);
    continue;
  }

  if (!exists) {
    console.log(`  ${name} → bucket YO'Q`);
    continue;
  }

  const [files] = await bucket.getFiles({ prefix: 'bundles/' });
  console.log(`✔ ${name} → bucket bor, bundles/ ostida ${files.length} ta fayl`);

  if (files.length === 0) continue;
  foundAny = true;

  for (const file of files) {
    // Obyekt ochiqmi? (allUsers ACL yozuvi bor-yo'qligi)
    let isPublic = false;
    try {
      const [acl] = await file.acl.get({ entity: 'allUsers' });
      isPublic = !!acl;
    } catch {
      isPublic = false; // allUsers yozuvi yo'q → ochiq emas
    }

    const [meta] = await file.getMetadata();
    const sizeMb = (Number(meta.size) / 1048576).toFixed(2);
    const hasToken = !!meta.metadata?.firebaseStorageDownloadTokens;

    const flags = [
      isPublic ? '🔴 OCHIQ (allUsers)' : '🟢 yopiq',
      hasToken ? '🔴 download token BOR (qoidalarni chetlab o\'tadi)' : '🟢 token yo\'q',
    ].join('  ');

    console.log(`    ${file.name}  ${sizeMb}MB  ${flags}`);

    if (DELETE) {
      await file.delete();
      console.log('      → 🗑 o\'chirildi');
      continue;
    }

    if (REVOKE) {
      if (isPublic) {
        await file.acl.delete({ entity: 'allUsers' });
        console.log('      → 🔒 allUsers ACL olindi');
      }
      if (hasToken) {
        // Download tokenini o'chirish — mavjud `?token=` havolalari darhol
        // ishlamay qoladi (Firebase tokenni metadata'da saqlaydi).
        await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: '' } });
        console.log('      → 🔒 download token bekor qilindi');
      }
    }
  }
}

// settings/version.urls — havolalar shu yerda saqlanardi va bu hujjatni
// HAR BIR kirgan foydalanuvchi o'qiy oladi (firestore.rules).
const versionSnap = await db.collection('settings').doc('version').get();
const urls = versionSnap.exists ? (versionSnap.data().urls || {}) : {};
const urlCount = Object.keys(urls).filter((k) => urls[k]).length;

console.log(`\nsettings/version.urls → ${urlCount} ta havola`);
if (urlCount > 0) {
  console.log('  🔴 Bu hujjat hamma kirgan foydalanuvchi uchun o\'qishga ochiq!');
  for (const k of Object.keys(urls)) if (urls[k]) console.log(`     ${k}`);
  if (REVOKE || DELETE) {
    await versionSnap.ref.set({ urls: {} }, { merge: true });
    console.log('  → 🔒 tozalandi');
  } else {
    console.log('  → tozalash uchun --revoke bilan qayta ishga tushiring');
  }
} else {
  console.log('  🟢 bo\'sh — kutilgan holat');
}

if (!foundAny && urlCount === 0) {
  console.log('\n✅ Hech qanday qoldiq topilmadi — tozalash kerak emas.\n');
} else if (!REVOKE && !DELETE) {
  console.log('\n⚠️  Yuqoridagi 🔴 belgilar tuzatilishi kerak:');
  console.log('    node scripts/audit-storage-bundles.mjs --revoke\n');
} else {
  console.log('\n✅ Tozalash yakunlandi.\n');
}

process.exit(0);
