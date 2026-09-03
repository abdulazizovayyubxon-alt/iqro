/**
 * diag-orphans.mjs — B-4 tekshiruvi: yetim `users` hujjatlari bormi?
 *
 * TAXMIN (AUDIT_2026-09-02_AUTH.md, B-4): kvota tugaganda ro'yxat oqimidagi
 * `setDoc` osilib qoladi → 20 s timeout → `deleteUser` Auth hisobini
 * o'chiradi → LEKIN navbatdagi `setDoc` kvota tiklanganda baribir bajariladi.
 * Natijada o'chirilgan Auth hisobi uchun `users/{uid}` hujjati qoladi.
 *
 * NEGA BEVOSITA SANAB BO'LMAYDI: Auth hisoblarini ro'yxatlash Admin SDK
 * talab qiladi (`listUsers`), lokal `.env` da esa service account yo'q.
 * Shuning uchun yetimni IMZOSI bo'yicha qidiramiz.
 *
 * IMZO — uch belgi birgalikda:
 *   1. `shortId` YO'Q. `ensureShortId` profil yozuvidan KEYIN chaqiriladi,
 *      yetim holatda esa oqim o'sha yozuvda uzilgan.
 *   2. `lastActiveAt` YO'Q. U ilovadan foydalanganda yoziladi — o'chirilgan
 *      Auth hisobi bilan kirib bo'lmaydi.
 *   3. TELEFON TAKRORLANGAN. Odam qayta ro'yxatdan o'tgan va YANGI uid
 *      olgan, ya'ni bir telefonga ikki hujjat to'g'ri keladi.
 *
 * Uchalasi birga bo'lsa — yetim ehtimoli yuqori. Faqat 1+2 bo'lsa, bu
 * ro'yxatdan o'tib ilovaga hech qachon kirmagan odam ham bo'lishi mumkin.
 *
 * ⚠️ FAQAT O'QIYDI. Hech narsa yozmaydi va o'chirmaydi.
 * ⚠️ NARXI: `users` kolleksiyasi to'liq o'qiladi (~500 hujjat = kunlik
 *    50 000 lik o'qish kvotasining ~1% i).
 * ⚠️ Shaxsiy ma'lumot ekranga CHIQARILMAYDI — faqat sanoq va niqoblangan ID.
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'users'));

const mask = (s) => (s ? String(s).slice(0, 4) + '***' + String(s).slice(-2) : '—');
const iso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  if (v.toDate) { try { return v.toDate().toISOString().slice(0, 10); } catch { return null; } }
  return null;
};

const docs = [];
snap.forEach((d) => {
  const x = d.data();
  docs.push({
    uid: d.id,
    phone: String(x.phone || '').replace(/\D/g, ''),
    hasShortId: !!x.shortId,
    hasLastActive: !!x.lastActiveAt,
    // Maydon BOR-YO'QLIGI (qiymati bo'sh bo'lishi mumkin — bu boshqa savol).
    hasProfileFields: ('gender' in x) && ('birthDate' in x),
    genderEmpty: ('gender' in x) && !x.gender,
    createdAt: iso(x.createdAt),
  });
});

// ── Telefon bo'yicha guruhlash ──
const byPhone = new Map();
for (const d of docs) {
  if (!d.phone) continue;
  if (!byPhone.has(d.phone)) byPhone.set(d.phone, []);
  byPhone.get(d.phone).push(d);
}
const dupPhones = [...byPhone.entries()].filter(([, list]) => list.length > 1);

// ── Imzolar ──
const noShortId = docs.filter((d) => !d.hasShortId);
const noActivity = docs.filter((d) => !d.hasLastActive);
const cold = docs.filter((d) => !d.hasShortId && !d.hasLastActive);
const halfProfile = docs.filter((d) => !d.hasProfileFields);  // eski 60996aa izi
const genderEmpty = docs.filter((d) => d.genderEmpty);

// Eng kuchli imzo: takror telefon + shortId yo'q + faollik yo'q
const suspects = [];
for (const [phone, list] of dupPhones) {
  for (const d of list) {
    if (!d.hasShortId && !d.hasLastActive) suspects.push({ ...d, phone });
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('  B-4 TEKSHIRUVI — yetim `users` hujjatlari');
console.log('═══════════════════════════════════════════════════════');
console.log('users hujjatlari jami          :', docs.length);
console.log('telefonsiz hujjat              :', docs.filter((d) => !d.phone).length);
console.log('');
console.log('shortId YO\'Q                   :', noShortId.length);
console.log('lastActiveAt YO\'Q              :', noActivity.length);
console.log('ikkalasi ham yo\'q ("sovuq")    :', cold.length);
console.log('gender/birthDate yo\'q (yarim)  :', halfProfile.length);
console.log('');
console.log('TAKRORLANGAN telefon (guruh)   :', dupPhones.length);
console.log('  — shu guruhlardagi hujjatlar :', dupPhones.reduce((n, [, l]) => n + l.length, 0));
console.log('');
console.log('▶ ENG KUCHLI IMZO (takror telefon + sovuq):', suspects.length);

if (suspects.length) {
  console.log('');
  console.log('  uid            telefon      yaratilgan');
  console.log('  ─────────────  ───────────  ──────────');
  for (const s of suspects.slice(0, 40)) {
    console.log(`  ${mask(s.uid).padEnd(13)}  ${mask(s.phone).padEnd(11)}  ${s.createdAt || '—'}`);
  }
  if (suspects.length > 40) console.log(`  … va yana ${suspects.length - 40} ta`);
}

if (dupPhones.length) {
  console.log('');
  console.log('▶ Takror telefonlar kesimi (yuqoridagi imzosiz ham):');
  for (const [phone, list] of dupPhones.slice(0, 15)) {
    const bits = list.map((d) => `${d.createdAt || '?'}${d.hasShortId ? '' : ' [ID yo\'q]'}${d.hasLastActive ? '' : ' [faolliksiz]'}`);
    console.log(`  ${mask(phone)}: ${list.length} ta → ${bits.join(' | ')}`);
  }
  if (dupPhones.length > 15) console.log(`  … va yana ${dupPhones.length - 15} ta guruh`);
}

console.log('');
console.log('ESLATMA: bu Firestore tomonidagi IMZO. Aniq tasdiq uchun');
console.log('shu uid\'lar Firebase Auth\'da bor-yo\'qligini Admin SDK bilan');
console.log('tekshirish kerak (lokal .env da service account yo\'q).');

process.exit(0);
