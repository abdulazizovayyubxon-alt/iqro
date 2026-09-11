/**
 * diag-kvota-monitor.mjs — kvota qancha tez yonayotganini O'LCHAYDI.
 *
 * NEGA KERAK: 2026-08-23 da kvota Toshkent 12:00 da yangilanib, 16:00 ga
 * yetmay tugab qolgan edi (~20 000 yozuv / 4 soat). `diag-kvota.mjs` faqat
 * "tugadimi?" degan savolga javob beradi; bu skript esa "qancha tez va
 * qayerda?" degan savolga javob beradi.
 *
 * ISHLATISH — kvota TIRIK bo'lganda, ya'ni Toshkent 12:00 dan keyin:
 *
 *     node diag-kvota-monitor.mjs          # bitta namuna oladi va yozadi
 *     node diag-kvota-monitor.mjs --hisobot # yangi namuna olmasdan hisobot
 *
 * Har 30-60 daqiqada bir marta ishga tushiring (12:05, 13:00, 14:00, 15:00).
 * Ikkinchi namunadan boshlab har kolleksiya yonidagi ustunda soatiga o'sish
 * ko'rsatiladi.
 *
 * ⚠️ CHEGARASI — MUHIM: bu skript FAQAT yangi hujjat YARATILISHINI ko'radi.
 * `userStats` ga `setDoc(merge)` bilan tushadigan YANGILANISHLAR hujjat
 * sonini o'zgartirmaydi, ya'ni bu yerda KO'RINMAYDI. 2026-08-23 halokatining
 * sababi aynan o'sha ko'rinmas yangilanishlar edi (AppContext qayta urinish
 * halqasi). Yozuvlarning UMUMIY soni faqat bitta joyda ko'rinadi:
 *     Firebase Console -> Firestore -> Usage
 * Bu skript esa "yangi hujjat oqimi aybdormi yoki yo'q" savolini yopadi.
 *
 * `answerEvents` ATAYLAB yo'q: firestore.rules unga `read: if false` qo'ygan,
 * admin ham o'qiy olmaydi (faqat cron Admin SDK bilan ko'radi).
 */
import 'dotenv/config';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, updateDoc, getCountFromServer } from 'firebase/firestore';

const FAYL = '.kvota-namunalar.jsonl';
const FAQAT_HISOBOT = process.argv.includes('--hisobot');

// Faollik bilan o'sadigan, admin o'qiy oladigan kolleksiyalar.
// `questions` ATAYLAB yo'q: ~50 000 hujjat = har namunada ~50 ta ortiqcha o'qish.
const KOLLEKSIYALAR = [
  'users', 'userStats', 'errorLogs', 'adminActions', 'notifications',
  'questionRequests', 'objections', 'payments', 'schoolRequests', 'deletionRequests',
];

const withTimeout = (p, ms) => Promise.race([
  p.then(v => ({ ok: true, v })).catch(e => ({ ok: false, err: e })),
  new Promise(r => setTimeout(() => r({ timeout: true }), ms)),
]);

const tosh = (d) => new Date(new Date(d).getTime() + 5 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);

/** Kvota kuni boshi = eng oxirgi o'tgan 07:00 UTC (= Toshkent 12:00) */
const kvotaKuniBoshi = (ref = new Date()) => {
  const d = new Date(ref); d.setUTCHours(7, 0, 0, 0);
  if (d > ref) d.setUTCDate(d.getUTCDate() - 1);
  return d;
};

const oqi = () => {
  if (!fs.existsSync(FAYL)) return [];
  return fs.readFileSync(FAYL, 'utf8').split('\n').filter(Boolean).map(s => JSON.parse(s));
};

// ══════════════════════ NAMUNA OLISH ══════════════════════
if (!FAQAT_HISOBOT) {
  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
  const a = await withTimeout(
    signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD), 20000);
  if (a.timeout || !a.ok) { console.log('❌ AUTH:', a.timeout ? 'timeout' : a.err?.code); process.exit(2); }
  const db = getFirestore(app);

  const namuna = { vaqt: new Date().toISOString(), sonlar: {}, yozuv: null, yozuvMs: null };

  process.stdout.write('Sanalmoqda');
  for (const k of KOLLEKSIYALAR) {
    const r = await withTimeout(getCountFromServer(collection(db, k)), 20000);
    namuna.sonlar[k] = (r.timeout || !r.ok) ? null : r.v.data().count;
    process.stdout.write(namuna.sonlar[k] === null ? '✗' : '.');
  }
  console.log('');

  // Yozuv testi — kvota tirikmi?
  const t0 = Date.now();
  const w = await withTimeout(
    updateDoc(doc(db, 'users', a.v.user.uid), { lastActiveAt: new Date().toISOString() }), 25000);
  namuna.yozuvMs = Date.now() - t0;
  namuna.yozuv = w.timeout ? 'timeout' : w.ok ? 'ok' : (w.err?.code || 'xato');

  fs.appendFileSync(FAYL, JSON.stringify(namuna) + '\n', 'utf8');
  console.log(`Namuna yozildi → ${FAYL}\n`);
}

// ══════════════════════ HISOBOT ══════════════════════
const namunalar = oqi();
if (namunalar.length === 0) { console.log('Hali namuna yo\'q.'); process.exit(0); }

const oxirgi = namunalar[namunalar.length - 1];
const kunBoshi = kvotaKuniBoshi(new Date(oxirgi.vaqt));
// Shu kvota kuni ichidagi namunalar
const bugungi = namunalar.filter(n => new Date(n.vaqt) >= kunBoshi);

console.log('Kvota kuni boshi :', tosh(kunBoshi), '(Toshkent 12:00)');
console.log('Namunalar        :', `${bugungi.length} ta shu kvota kunida, ${namunalar.length} ta jami`);
console.log('Oxirgi yozuv testi:', oxirgi.yozuv === 'ok'
  ? `🟢 ISHLAYAPTI (${oxirgi.yozuvMs} ms)`
  : `🔴 ${oxirgi.yozuv.toUpperCase()} — kvota tugagan`);

if (bugungi.length < 2) {
  console.log('\nO\'sish tezligini ko\'rsatish uchun kamida 2 ta namuna kerak.');
  console.log('Skriptni 30-60 daqiqadan keyin qayta ishga tushiring.');
  process.exit(0);
}

const A = bugungi[0], B = bugungi[bugungi.length - 1];
const soat = (new Date(B.vaqt) - new Date(A.vaqt)) / 3600e3;
console.log(`\nOyna: ${tosh(A.vaqt)} → ${tosh(B.vaqt)}  (${soat.toFixed(2)} soat)\n`);

console.log('  KOLLEKSIYA          BOSHIDA    HOZIR     YANGI   SOATIGA');
console.log('  ' + '─'.repeat(56));
let jamiYangi = 0;
for (const k of KOLLEKSIYALAR) {
  const a = A.sonlar[k], b = B.sonlar[k];
  if (a === null || b === null) {
    console.log(`  ${k.padEnd(20)} ${'—'.padStart(8)}  ${'—'.padStart(8)}  (o'qib bo'lmadi)`);
    continue;
  }
  const yangi = b - a;
  jamiYangi += yangi;
  const soatiga = soat > 0 ? Math.round(yangi / soat) : 0;
  const belgi = soatiga >= 500 ? '  ⬅ SHUBHALI' : '';
  console.log(`  ${k.padEnd(20)} ${String(a).padStart(8)}  ${String(b).padStart(8)}  ${String(yangi).padStart(6)}  ${String(soatiga).padStart(8)}${belgi}`);
}
console.log('  ' + '─'.repeat(56));
const jamiSoatiga = soat > 0 ? Math.round(jamiYangi / soat) : 0;
console.log(`  ${'JAMI YANGI HUJJAT'.padEnd(20)} ${''.padStart(8)}  ${''.padStart(8)}  ${String(jamiYangi).padStart(6)}  ${String(jamiSoatiga).padStart(8)}`);

console.log('\n── Xulosa ──');
// 20 000 yozuv / 24 soat = barqaror ritm uchun ~830/soat
if (jamiSoatiga >= 2000) {
  console.log('🔴 Yangi hujjat oqimining O\'ZI kvotani yeyapti — yuqoridagi «SHUBHALI» qatorga qarang.');
} else {
  console.log(`🟡 Yangi hujjat oqimi soatiga ~${jamiSoatiga} ta — bu 20 000 lik kunlik limitning`);
  console.log(`   ~${Math.round(jamiSoatiga * 24 / 200)}% i. Agar kvota baribir tez tugayotgan bo'lsa, aybdor`);
  console.log('   YANGI HUJJATLAR EMAS, mavjud hujjatlarning QAYTA-QAYTA yangilanishi —');
  console.log('   ya\'ni `userStats` ga ketadigan yozuvlar. Aniq raqam: Firebase Console → Usage.');
}
process.exit(0);
