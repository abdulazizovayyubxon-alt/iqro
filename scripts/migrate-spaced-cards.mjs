/**
 * migrate-spaced-cards.mjs — `userStats.spacedCards` ni tozalash.
 *
 * ⚠️ JURNAL TAHLILI 2026-08-28 — NEGA KERAK:
 *   `SmartQuestionEngine` og'ir takrorlash kartasini `{ ...q }` bilan yasardi,
 *   ya'ni BUTUN savol obyektini ko'chirardi. ExamPage esa savolga `topicIcon`
 *   (React elementi) biriktirardi. Oqibati ikki xil edi:
 *
 *     1. CRASH — React elementining `$$typeof` maydoni Symbol. Firestore uni
 *        tavsiflay olmay ichki assertion tashlardi:
 *        «INTERNAL ASSERTION FAILED (ID: 3029) CONTEXT: {"type":"symbol"}».
 *        22 kunda 164 hodisa, 59 foydalanuvchi.
 *
 *     2. AXLAT — sahifa qayta yuklangach `JSON.stringify` Symbol'ni tashlab,
 *        ma'nosiz qoldiqni ({props, key, ref, _owner, type}) QOLDIRARDI va
 *        u bulutga yozilardi. O'lchandi: 476 hujjatning 74 tasida 2727 ta.
 *
 *   Ildiz sabab kodda tuzatildi (`heavyCardBody` yopiq ro'yxati). Bu skript
 *   MAVJUD hujjatlarni o'sha ro'yxatga keltiradi.
 *
 * O'LCHANGAN SAMARA (476 hujjat): spacedCards 15.81 MB -> 13.67 MB (-14%).
 *   Eng katta maydonlar: mnemonic 820 KB, id 419 KB, category 289 KB,
 *   topicIcon 280 KB, createdAt 259 KB, topicName 105 KB.
 *   Hech biri hech qayerda O'QILMAYDI — tekshirildi (SmartReviewPage,
 *   SmartQuestionEngine, QuestionMedia, mistakeQueue).
 *
 * ISHLATISH:
 *   node scripts/migrate-spaced-cards.mjs          # QURUQ YURISH (yozmaydi)
 *   node scripts/migrate-spaced-cards.mjs --apply  # haqiqiy yozuv
 *
 * XAVFSIZLIK:
 *   · standart rejim — FAQAT O'QISH, hech narsa o'zgarmaydi;
 *   · `--apply` da har hujjat uchun BITTA yozuv (kunlik kvota 20 000);
 *   · faqat `spacedCards` maydoni yangilanadi (merge), qolganiga tegilmaydi;
 *   · o'zgarishi yo'q hujjat UMUMAN yozilmaydi.
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, query, orderBy, limit, startAfter,
  documentId, doc, setDoc,
} from 'firebase/firestore';

// `SmartQuestionEngine.heavyCardBody` + SRS metama'lumoti bilan AYNI ro'yxat.
// Bu yerda takrorlangani ATAYLAB: migratsiya bir martalik skript, u ilova
// kodiga bog'lanib qolmasligi kerak (kod keyin o'zgarsa skript tarixni
// buzmasin). Ro'yxat farq qilsa — quruq yurish darhol ko'rsatadi.
const KEEP = new Set([
  // karta tanasi (SmartReviewPage + QuestionMedia render qiladi)
  'qHash', 'topicId', 'q', 'opts', 'correct', 'explanation', 'isHtml', 'image', 'svg', 'diagram',
  // takrorlash jadvali (SmartQuestionEngine o'qiydi)
  'level', 'correctStreak', 'difficulty', 'lastReview', 'nextReview', 'lastResult',
]);

const APPLY = process.argv.includes('--apply');
const B = (v) => Buffer.byteLength(JSON.stringify(v ?? null));

const slimCard = (c) => {
  if (!c || typeof c !== 'object') return c;
  const out = {};
  for (const [k, v] of Object.entries(c)) {
    if (KEEP.has(k) && v !== undefined) out[k] = v;
  }
  return out;
};

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(app), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const db = getFirestore(app);

console.log(APPLY ? '\n>>> HAQIQIY YOZUV REJIMI <<<\n' : '\n--- QURUQ YURISH (hech narsa yozilmaydi) ---\n');

let cursor = null;
let scanned = 0, changed = 0, written = 0, cards = 0, iconlar = 0;
let baytOldin = 0, baytKeyin = 0;
const tashlangan = new Map();

for (;;) {
  const qy = cursor
    ? query(collection(db, 'userStats'), orderBy(documentId()), startAfter(cursor), limit(40))
    : query(collection(db, 'userStats'), orderBy(documentId()), limit(40));
  const snap = await getDocs(qy);
  if (snap.empty) break;

  for (const d of snap.docs) {
    scanned++;
    const list = d.data().spacedCards;
    if (!Array.isArray(list) || list.length === 0) continue;

    const slim = list.map(slimCard);
    const oldin = B(list);
    const keyin = B(slim);
    cards += list.length;

    for (const c of list) {
      for (const k of Object.keys(c || {})) {
        if (!KEEP.has(k)) {
          tashlangan.set(k, (tashlangan.get(k) || 0) + 1);
          if (k === 'topicIcon') iconlar++;
        }
      }
    }

    if (oldin === keyin) continue;      // o'zgarish yo'q — yozmaymiz
    changed++;
    baytOldin += oldin;
    baytKeyin += keyin;

    if (APPLY) {
      await setDoc(doc(db, 'userStats', d.id), { spacedCards: slim }, { merge: true });
      written++;
      if (written % 25 === 0) process.stderr.write(`\r  yozildi: ${written} ...`);
    }
  }
  cursor = snap.docs[snap.docs.length - 1];
}
if (APPLY) process.stderr.write('\n');

console.log(`Ko'rildi hujjat      : ${scanned}`);
console.log(`O'zgarishi bor       : ${changed}`);
console.log(`Kartalar             : ${cards}`);
console.log(`topicIcon (React axlati): ${iconlar}`);
console.log(`Hajm  ${(baytOldin / 1048576).toFixed(2)} MB -> ${(baytKeyin / 1048576).toFixed(2)} MB  (tejaladi ${((baytOldin - baytKeyin) / 1048576).toFixed(2)} MB)`);
console.log('\nTashlanadigan maydonlar (nechta kartada):');
[...tashlangan.entries()].sort((a, b) => b[1] - a[1])
  .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)} × ${k}`));

console.log(APPLY
  ? `\nTAYYOR — ${written} ta hujjat yangilandi (${written} yozuv sarflandi).`
  : `\nQuruq yurish tugadi. Haqiqiy yozuv uchun: node scripts/migrate-spaced-cards.mjs --apply`);
process.exit(0);
