/**
 * diag-kvota.mjs — Firestore bepul (Spark) kunlik kvotasi tugaganmi?
 *
 * NEGA KERAK: kvota tugaganda Firestore SDK promise'ni RAD ETMAYDI —
 * cheksiz backoff bilan qayta uraveradi. `await updateDoc(...)` hech qachon
 * tugamaydi, `catch` ham `finally` ham ishlamaydi, UI abadiy spinnerda qoladi.
 * Shuning uchun bu yerdagi HAR BIR amal Promise.race bilan timeout'ga qo'yilgan.
 *
 * Kvota kuni Tinch okeani yarim kechasida yangilanadi = Toshkent 12:00.
 *
 * Ishlatish:  node diag-kvota.mjs
 * Chiqish kodi: 0 = kvota joyida, 1 = kvota tugagan, 2 = auth muammosi
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const withTimeout = (p, ms) => Promise.race([
  p.then(v => ({ ok: true, v })).catch(e => ({ ok: false, err: e })),
  new Promise(r => setTimeout(() => r({ timeout: true }), ms)),
]);

const now = new Date();
const tosh = (d) => new Date(d.getTime() + 5 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
const isoDay = (off = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + off); return d.toISOString().slice(0, 10); };

// Kvota kuni boshi = eng oxirgi o'tgan 07:00 UTC
const kunBoshi = new Date(); kunBoshi.setUTCHours(7, 0, 0, 0);
if (kunBoshi > now) kunBoshi.setUTCDate(kunBoshi.getUTCDate() - 1);

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

console.log('Loyiha          :', process.env.VITE_FIREBASE_PROJECT_ID);
console.log('Hozir           :', tosh(now), '(Toshkent)');
console.log('Kvota kuni boshi:', tosh(kunBoshi), '(Toshkent) — ya\'ni', ((now - kunBoshi) / 3600e3).toFixed(1), 'soat oldin\n');

const a = await withTimeout(signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD), 20000);
if (a.timeout || !a.ok) { console.log('❌ AUTH:', a.timeout ? 'timeout' : a.err?.code); process.exit(2); }
console.log('✅ AUTH ishladi :', a.v.user.email);
const uid = a.v.user.uid;
const db = getFirestore(app);

// ── 1) O'QISH ──
const r = await withTimeout(getDoc(doc(db, 'meta', 'cronHealth')), 15000);
console.log(r.timeout ? '⚠️  O\'QISH: timeout' : !r.ok ? `❌ O'QISH: ${r.err?.code}` : '✅ O\'QISH ishlayapti');

// ── 2) Cron izlari — kvota bloklaganda bular yozilmaydi ──
console.log('\n--- Cron izlari ---');
console.log('  meta/cronHealth   :', r.ok ? (r.v.exists() ? '✅ bor' : '❌ YO\'Q') : 'o\'qib bo\'lmadi');
for (const off of [0, -1, -2]) {
  const m = await withTimeout(getDoc(doc(db, 'metrics', isoDay(off))), 15000);
  console.log(`  metrics/${isoDay(off)}:`, m.timeout ? 'timeout' : !m.ok ? m.err?.code : m.v.exists() ? '✅ bor' : '❌ YO\'Q');
}

// ── 3) Oxirgi muvaffaqiyatli yozuvlar — kvota qachon yonganini ko'rsatadi ──
console.log('\n--- Oxirgi muvaffaqiyatli yozuvlar ---');
for (const [kol, maydon] of [['users', 'createdAt'], ['users', 'lastActiveAt'], ['errorLogs', 'ts'], ['adminActions', 'ts']]) {
  const s = await withTimeout(getDocs(query(collection(db, kol), orderBy(maydon, 'desc'), limit(1))), 15000);
  if (s.timeout || !s.ok) { console.log(`  ${kol}.${maydon}`.padEnd(24), ': o\'qib bo\'lmadi', s.err?.code || 'timeout'); continue; }
  if (s.v.empty) { console.log(`  ${kol}.${maydon}`.padEnd(24), ': (bo\'sh)'); continue; }
  const v = s.v.docs[0].data()[maydon];
  const d = new Date(v?.toDate ? v.toDate() : v);
  console.log(`  ${kol}.${maydon}`.padEnd(24), ':', tosh(d), d >= kunBoshi ? '🟢 shu kvota kunida' : '🔴 kvota kunidan oldin');
}

// ── 4) YOZUV testi — asosiy javob ──
// Nishon: adminning o'z hujjatidagi `lastActiveAt` — ilova buni har seansda
// o'zi yozadi (AppContext.jsx:556), demak hech narsa ifloslanmaydi.
console.log('\n--- YOZUV testi ---');
const t0 = Date.now();
const w = await withTimeout(updateDoc(doc(db, 'users', uid), { lastActiveAt: new Date().toISOString() }), 25000);
if (w.timeout) {
  console.log('\n🔴 KVOTA TUGAGAN — 25s jimlik, xato ham yo\'q (SDK jimgina qayta uraveradi).');
  console.log('   Tiklanadi: Toshkent 12:00 da.');
  process.exit(1);
}
if (!w.ok) {
  const s = (w.err?.code || '') + (w.err?.message || '');
  console.log(/resource-exhausted|quota/i.test(s) ? `\n🔴 KVOTA TUGAGAN — ${w.err.code}` : `\n🟡 Yozuv rad etildi (kvota emas): ${w.err?.code}`);
  console.log('  ', w.err?.message);
  process.exit(/resource-exhausted|quota/i.test(s) ? 1 : 3);
}
console.log(`\n🟢 YOZUV ISHLAYAPTI (${Date.now() - t0} ms) — bugungi kvota tugamagan.`);
process.exit(0);
