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

export default publishAnnouncements;
