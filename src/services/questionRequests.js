/**
 * questionRequests — "Ko'proq savol kerak" so'rovi (tirik halqa).
 *
 * Foydalanuvchi savoli bo'lmagan/kam bo'lgan bo'limda "savol kerak" deb so'rov
 * yuboradi → Firestore `questionRequests` kolleksiyasi. Admin "So'rovlar" tabida
 * eng ko'p so'ralgan mavzularni ko'rib, savol qo'shgach foydalanuvchiga
 * bildirishnoma yuboradi.
 *
 * ⚠️ TAKRORLANISH — 2026-08-30 TAHLILI. Ilgari yozuv `addDoc` bilan, ya'ni HAR
 * SAFAR YANGI ID bilan ketardi va "allaqachon so'radi" belgisi localStorage'ga
 * faqat `await` TUGAGANDAN KEYIN yozilardi. Tarmoq sekin bo'lganda tugmani
 * qayta bosgan odam bir necha hujjat yaratardi: 41 yozuvning 11 tasi shunday
 * takror edi (bitta foydalanuvchi 1,7 soniyada 6 ta yozgan). Admin paneldagi
 * "talab darajasi" ham shu sababli shishib ko'rinardi.
 *
 * Endi himoya UCH QAVAT:
 *   1) localStorage belgisi (avvalgidek) — qurilma darajasida;
 *   2) `inFlight` qulfi — bir vaqtda ketayotgan takror bosishlar uchun;
 *   3) hujjat ID'si (uid, fan, mavzu) dan yasaladi — ya'ni takror yozuv
 *      FIZIK JIHATDAN mumkin emas. Ikkinchi urinish `create` emas, `update`
 *      bo'lib qoladi va firestore.rules uni rad etadi (update faqat admin) —
 *      shuning uchun `permission-denied` bu yerda nosozlik emas, "allaqachon
 *      yuborilgan" degani (masalan, xotirasi tozalangan qurilmada).
 */
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AnalyticsEvents } from './analytics';

const sentKey = (uid) => `questionReq_${uid}`;
const reqKey = (category, topicId) => `${category}:${topicId ?? -1}`;

// Firestore hujjat ID'si. `/` bo'lmasligi kerak; uid/fan/mavzu belgilarida u yo'q.
const docIdFor = (uid, category, topicId) => `${uid}__${category}__${topicId ?? -1}`;

// Shu lahzada yozuvi ketayotgan kalitlar (tugmani qayta bosish himoyasi)
const inFlight = new Set();

// Foydalanuvchi avval so'rov yuborgan (category, topicId) kalitlari ro'yxati
export function getSentRequests(uid) {
  if (!uid) return [];
  try {
    return JSON.parse(localStorage.getItem(sentKey(uid)) || '[]');
  } catch {
    return [];
  }
}

function markSent(uid, key) {
  try {
    const sent = getSentRequests(uid);
    if (!sent.includes(key)) {
      localStorage.setItem(sentKey(uid), JSON.stringify([...sent, key]));
    }
  } catch (e) {
    // Xususiy rejimda localStorage yozib bo'lmaydi — bu so'rovni bekor
    // qilmaydi: takrorni baribir hujjat ID'si to'xtatadi.
    console.warn('questionRequest belgisi saqlanmadi:', e?.message);
  }
}

// Shu foydalanuvchi shu mavzu uchun allaqachon so'rov yuborganmi?
export function hasRequested(uid, category, topicId) {
  if (!uid) return false;
  return getSentRequests(uid).includes(reqKey(category, topicId));
}

/**
 * So'rov yuborish. Natija: { ok, reason? }.
 *   reason: 'auth' | 'duplicate' | 'error'
 */
export async function submitQuestionRequest(user, { category, categoryName, topicId, topicName }) {
  if (!user) return { ok: false, reason: 'auth' };

  const key = reqKey(category, topicId);
  const sent = getSentRequests(user.uid);
  if (sent.includes(key)) return { ok: false, reason: 'duplicate' };
  if (inFlight.has(key)) return { ok: false, reason: 'duplicate' };
  inFlight.add(key);

  try {
    await setDoc(doc(db, 'questionRequests', docIdFor(user.uid, category, topicId)), {
      uid: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || '',
      category: category || '',
      categoryName: categoryName || category || '',
      topicId: topicId ?? -1,
      topicName: topicName || 'Aralash',
      fulfilled: false,
      date: new Date().toLocaleString(),
      timestamp: new Date(),
    });

    markSent(user.uid, key);
    AnalyticsEvents.questionRequest(topicName || categoryName || category || '');
    return { ok: true };
  } catch (e) {
    // `permission-denied` ning IKKI sababi bor, ikkalasi ham nosozlik emas:
    //   1) hujjat allaqachon bor → yozuv `update` bo'lib qoldi (update faqat
    //      admin uchun) — ya'ni so'rov allaqachon yuborilgan;
    //   2) 2026-08-31 dan beri qoidalar obunasi/sinovi TUGAGAN foydalanuvchi
    //      so'rovini ham rad etadi (`hasContentAccess()`), chunki savolni
    //      ko'rmagan odam "savol yo'q" degan xulosaga asoslana olmaydi.
    // Yangi mijozda 2-holat tugmagacha yetib kelmaydi: obunasi tugaganda
    // TestPage «Ko'proq savol kerak» emas, «Obuna muddati tugagan» ekranini
    // ko'rsatadi. Shuning uchun bu yerda ikkalasi ham 'duplicate' sifatida
    // muomala qilinadi — xato oynasi chiqarishdan ko'ra tinchroq.
    if (e?.code === 'permission-denied') {
      markSent(user.uid, key);
      return { ok: false, reason: 'duplicate' };
    }
    console.error('questionRequest write error:', e);
    return { ok: false, reason: 'error' };
  } finally {
    inFlight.delete(key);
  }
}
