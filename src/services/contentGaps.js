/**
 * contentGaps — "savol yetishmayapti" signalini XATTI-HARAKATDAN yig'adi.
 *
 * NEGA KERAK (2026-08-31). Bizda talab haqidagi yagona ma'lumot — «Ko'proq
 * savol kerak» tugmasi edi. Uni juda kam odam bosadi: bo'sh ekranni ko'rgan
 * odamning ko'pchiligi shunchaki ortga qaytadi. Ya'ni `questionRequests`
 * talabning kichik va QIYSHIQ namunasi — u bilan qaysi mavzuga savol qo'shish
 * kerakligini hal qilish, qidiruvda "0 natija" hisobotini ko'rmasdan
 * do'kondagi tovarni tanlashga o'xshaydi.
 *
 * Bu yerda ikki hodisa yoziladi:
 *   · `empty`     — hovuz ROSTDAN bo'sh chiqdi (paywall/tarmoq EMAS);
 *   · `exhausted` — foydalanuvchi mavzudagi savollarni to'liq aylanib chiqdi
 *                   (javoblar soni hovuz hajmiga yetdi). Bu odam shikoyat
 *                   qilmaydi — u jimgina takror savollarni ko'ra boshlaydi va
 *                   keyin ketadi. Aynan shu — Pro obunani yo'qotish yo'li.
 *
 * ⚠️ KVOTA. Bepul Spark rejasida kuniga 20 000 yozuv bor va u BUTUN ilova
 * uchun umumiy. Shuning uchun:
 *   1) hisoblagich MAVZU boshiga bitta hujjatda turadi (foydalanuvchi boshiga
 *      hujjat OCHILMAYDI) — o'sish mavzular soni bilan chegaralangan;
 *   2) bir qurilma bir mavzu uchun `empty` ni kuniga bir marta, `exhausted` ni
 *      haftada bir marta yozadi (localStorage qulfi);
 *   3) yozuv "eng yaxshi holatda" bajariladi — xato bo'lsa jim yutiladi, test
 *      boshlanishini hech qachon to'sib qo'ymaydi.
 * Amalda bu kuniga o'nlab yozuv, ya'ni limitning yuzdan bir ulushi.
 */
import { db } from '../firebase';
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

const DAY_MS = 86400000;
const EMPTY_WINDOW_MS = DAY_MS;          // bo'sh ekran: kuniga bir marta
const EXHAUSTED_WINDOW_MS = 7 * DAY_MS;  // mavzuni tugatish: haftada bir marta

// Hujjat ID'si mavzu bo'yicha — `/` bo'lmasligi kerak, fan/mavzu belgilarida u yo'q.
const gapDocId = (category, topicId) => `${category}__${topicId ?? -1}`;
const lockKey = (kind, uid, category, topicId) => `gap_${kind}_${uid}_${category}_${topicId ?? -1}`;

function locked(key, windowMs) {
  try {
    const ts = Number(localStorage.getItem(key) || 0);
    return !!ts && Date.now() - ts < windowMs;
  } catch {
    // Xususiy rejimda localStorage yo'q. Qulfsiz qolamiz: yozuv baribir
    // seansiga bittadan oshmaydi (chaqiruv joyi — hovuz yig'ilishi).
    return false;
  }
}

function lock(key) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* xususiy rejim — qulf saqlanmadi, bu halokat emas */
  }
}

/**
 * Hisoblagichni oshirish. `increment(0)` ataylab: hujjatda BARCHA maydonlar
 * doim mavjud bo'lsin — firestore.rules `resource.data.empty + 1` kabi
 * taqqoslashni maydon yo'qligida bajarolmaydi va yozuvni rad etardi.
 */
async function bump(kind, tier, { category, categoryName, topicId, topicName }) {
  await setDoc(
    doc(db, 'contentGaps', gapDocId(category, topicId)),
    {
      category: category || '',
      categoryName: categoryName || category || '',
      topicId: topicId ?? -1,
      topicName: topicName || 'Aralash',
      empty: increment(kind === 'empty' ? 1 : 0),
      exhausted: increment(kind === 'exhausted' ? 1 : 0),
      pro: increment(tier === 'pro' ? 1 : 0),
      trial: increment(tier === 'pro' ? 0 : 1),
      lastAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function report(kind, windowMs, user, tier, info) {
  if (!user?.uid || !info?.category) return false;
  const key = lockKey(kind, user.uid, info.category, info.topicId);
  if (locked(key, windowMs)) return false;
  // Qulf yozuvdan OLDIN qo'yiladi: sekin tarmoqda takror chaqiruv bo'lsa ham
  // ikkinchi yozuv ketmasin (questionRequests dagi xato shu edi).
  lock(key);
  try {
    await bump(kind, tier, info);
    return true;
  } catch (e) {
    console.warn('contentGaps yozilmadi:', e?.code || e?.message);
    return false;
  }
}

/** Hovuz rostdan bo'sh chiqdi (sabab paywall/tarmoq emas). */
export function reportEmptyTopic(user, tier, info) {
  return report('empty', EMPTY_WINDOW_MS, user, tier, info);
}

/** Foydalanuvchi mavzuni to'liq aylanib chiqdi. */
export function reportExhaustedTopic(user, tier, info) {
  return report('exhausted', EXHAUSTED_WINDOW_MS, user, tier, info);
}
