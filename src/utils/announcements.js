import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Umumiy e'lonlar «suratı» — `settings/announcements`.
 *
 * ════════════════════════════════════════════════════════════════════
 *  NEGA BOR — O'QISH BYUDJETI
 * ════════════════════════════════════════════════════════════════════
 * `useNotifications` ilgari ochiq `notifications` kolleksiyasini
 * `orderBy(date) + limit(30)` bilan tinglardi. Ya'ni HAR foydalanuvchi HAR
 * ilova ochilishida 30 ta hujjat o'qirdi — Firestore keshi ataylab xotirada
 * (`firebase.js`), demak har seans to'liq to'lanardi. Shaxsiy bildirishnomalar
 * bilan birga bu seansiga ~60 o'qish edi: butun ilovadagi qolgan hamma narsa
 * ~8 ta.
 *
 * E'lonlar HAMMA uchun bir xil bo'lgani uchun ularni 30 ta alohida hujjatdan
 * o'qishning ma'nosi yo'q. Admin panel ro'yxatni allaqachon xotirasida
 * ushlab turadi (`adminNotifs` tinglovchisi), shuning uchun surat QO'SHIMCHA
 * O'QISHSIZ quriladi va bitta hujjatga yoziladi. Mijoz uni 1 o'qishda oladi.
 *
 * Surat YOZILGANDAN KEYIN qo'shilgan e'lonlar mijozda jonli tinglovchi orqali
 * keladi (`where('date','>', updatedAt)`) — ya'ni «jonli» xususiyat
 * yo'qolmaydi, faqat narxi 30 dan ~1 ga tushadi.
 *
 * ⚠️ FAQAT UMUMIY E'LONLAR KIRADI. Bitta odamga atalgan eski yozuvlar
 * (`targetUser: <uid>` yoki `userId`) suratdan chetlab o'tiladi: yangi kodda
 * ular `users/{uid}/notifications` ga boradi, eskilarini esa hammaga
 * tarqatiladigan hujjatga ko'chirishning hojati yo'q.
 */

export const ANNOUNCEMENTS_ID = 'announcements';
export const ANNOUNCEMENTS_LIMIT = 30;

const isBroadcast = (n) => (!n.targetUser || n.targetUser === 'all') && !n.userId;

/**
 * Admin panelidagi xom ro'yxatdan surat elementlarini yasaydi.
 * Faqat qo'ng'iroqqa kerak bo'lgan maydonlar olinadi — hujjat 1 MB
 * chegarasiga yaqinlashmasin va ortiqcha ma'lumot tarqalmasin.
 */
export const buildAnnouncementItems = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((n) => n && n.id && n.date && isBroadcast(n))
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, ANNOUNCEMENTS_LIMIT)
    .map((n) => ({
      id: n.id,
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'info',
      date: n.date,
    }));

/**
 * Suratni yozadi. `updatedAt` — mijozdagi jonli tinglovchining LANGARI:
 * undan keyingi e'lonlargina alohida o'qiladi. Shuning uchun u har doim
 * suratdagi eng yangi elementdan keyin turishi shart (yozuv vaqti shunday).
 *
 * `merge` YO'Q — ataylab to'liq almashtirish: e'lon o'chirilganda u suratdan
 * ham yo'qolishi kerak.
 */
export const publishAnnouncements = (items) =>
  setDoc(doc(db, 'settings', ANNOUNCEMENTS_ID), {
    items,
    updatedAt: new Date().toISOString(),
  });

/**
 * ════════════════════════════════════════════════════════════════════════
 *  AUDIT 2026-09-02 (2), A-1 — O'CHIRILGAN E'LONNI MIJOZDAN OLIB TASHLASH
 *
 *  Admin e'lonni o'chirganda surat darhol qayta yozilardi, LEKIN mijozdagi
 *  `absorb()` faqat QO'SHISHNI bilardi: suratdan yo'qolgan element
 *  `localStorage.IQRO_NOTIFICATIONS` da qolib ketardi (60 talik oynadan
 *  tushmaguncha). Ya'ni noto'g'ri narx yoki imtihon sanasini yuborib, keyin
 *  o'chirgan admin «qaytarib oldim» deb o'ylardi — e'lon esa uni allaqachon
 *  olgan har bir odamda turaverardi.
 *
 *  ⚠️ ENG XAVFLI JOYI — NIMANI O'CHIRMASLIK.
 *
 *  `isBroadcast()` ni yolg'iz mezon sifatida ishlatib bo'lMAYDI. Shaxsiy
 *  bildirishnomalar (`users/{uid}/notifications`) `targetUser` va `userId`
 *  maydonlarisiz yoziladi — AppContext'dagi yutuq/marra/unvon yozuvlari va
 *  FixQuestionModal'niki (tekshirilgan). Ular uchun `isBroadcast()` `true`
 *  qaytaradi. Faqat shunga tayansak, HAR FOYDALANUVCHINING butun yutuqlar
 *  tarixi o'chib ketardi.
 *
 *  Shuning uchun IKKI shart birga talab qilinadi:
 *    1) `src === 'global'` — element umumiy kanaldan kelgan (mijoz
 *       `absorb()` da belgilaydi), ya'ni shaxsiy obuna yo'lidan EMAS;
 *    2) `isBroadcast()` — shakli ham umumiy, ya'ni mavjud bo'lsa surat uni
 *       O'Z ICHIGA OLGAN bo'lardi. Ochiq kolleksiyadagi eski
 *       `targetUser: <uid>` yozuvlari surat qamrovidan tashqarida.
 *
 *  Belgisiz (eski) elementlarga TEGILMAYDI: tuzatish qurilmaga yetgunicha
 *  saqlangan yozuvlarda `src` yo'q. Ular hamon suratda bo'lsa, keyingi
 *  `absorb()` ularni belgilab qo'yadi (element butunlay almashtiriladi).
 * ════════════════════════════════════════════════════════════════════════
 *
 * @param {Array} local          lokal saqlangan ro'yxat (umumiy + shaxsiy aralash)
 * @param {Array} snapshotItems  `settings/announcements` dagi elementlar
 * @param {string} anchor        suratning `updatedAt` i
 * @returns {Array} tozalangan ro'yxat (o'zgarish bo'lmasa AYNAN o'sha massiv)
 */
export function reconcileAnnouncements(local, snapshotItems, anchor) {
  if (!Array.isArray(local) || !Array.isArray(snapshotItems) || !anchor) return local;

  const known = new Set(snapshotItems.map((n) => n?.id).filter(Boolean));

  // Surat ko'pi bilan ANNOUNCEMENTS_LIMIT ta element saqlaydi. To'lgan bo'lsa
  // u KESILGAN bo'lishi mumkin — u holda faqat o'zi qamragan sana oralig'iga
  // ishonamiz, undan eskisi haqida surat hech narsa demaydi.
  const truncated = snapshotItems.length >= ANNOUNCEMENTS_LIMIT;
  const oldest = snapshotItems.reduce(
    (min, n) => (n?.date && (!min || n.date < min) ? n.date : min),
    null
  );

  const kept = local.filter((n) => {
    if (!n?.id) return true;
    if (n.src !== 'global') return true;          // shaxsiy yoki belgisiz eski yozuv
    if (!isBroadcast(n)) return true;             // shakli umumiy emas — surat qamramaydi
    if (known.has(n.id)) return true;             // suratda bor
    if (!n.date || n.date > anchor) return true;  // suratdan KEYIN kelgan (jonli tinglovchi)
    if (truncated && oldest && n.date < oldest) return true; // qamrovdan tashqarida
    return false;                                  // → admin o'chirgan
  });

  // O'zgarish bo'lmasa AYNAN o'sha havolani qaytaramiz — chaqiruvchi shunga
  // qarab keraksiz render va `localStorage` yozuvidan qochadi.
  return kept.length === local.length ? local : kept;
}

export default publishAnnouncements;
