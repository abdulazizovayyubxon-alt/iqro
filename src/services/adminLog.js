/**
 * adminLog.js — admin harakatlari jurnali (kim · qachon · nima qildi).
 *
 * ⚠️ ADMIN AUDIT 2026-08-06, B-5 BAND — nima uchun kerak:
 * Panelda qaytarilmas amallar bor: foydalanuvchini Auth hisobi bilan butunlay
 * o'chirish, minglab savolni dublikat sifatida o'chirish, admin huquqi berish,
 * qo'lda Pro tarqatish. Bularning HECH BIRI hech qayerda qayd etilmasdi.
 * Adminlar soni birdan ortiq (firestore.rules'da 2 ta email + `role === 'admin'`
 * orqali cheksiz), demak "bu savollarni kim o'chirdi?" savoliga javob yo'q edi.
 *
 * ⚠️ QOIDA: yozuv HECH QACHON asosiy amalni bloklamaydi va xato tashlamaydi.
 * Sabab — `firestore.rules` Vercel tomonidan deploy QILINMAYDI. Kod ishga
 * tushgan, lekin `firebase deploy --only firestore:rules` hali bajarilmagan
 * oraliqda har yozuv `permission-denied` bilan rad etiladi. Agar bu xato
 * yuqoriga chiqsa, admin panelining ishlaydigan funksiyalari buzilgan bo'lardi.
 * Shu sababli hamma narsa `.catch()` ichida — jurnal ishlamasa ham panel ishlaydi.
 */
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Amal turlari — erkin satr emas, ro'yxat. Yangi amal qo'shsangiz shu yerga
 * yozing: jurnalni o'qiyotgan odam qisqartmani tushunishi kerak.
 */
export const ADMIN_ACTION_LABELS = {
  'role.grant_admin': 'Admin huquqi berildi',
  'role.revoke_admin': 'Admin huquqi olindi',
  'premium.grant': 'Pro berildi',
  'premium.revoke': 'Pro bekor qilindi',
  'user.delete': "Foydalanuvchi o'chirildi",
  'question.create': "Savol qo'shildi",
  'question.update': 'Savol tahrirlandi',
  'question.delete': "Savol o'chirildi",
  'question.import': 'JSON import',
  'question.dedupe': "Dublikatlar o'chirildi",
  'question.publish': 'Yangilanish yuborildi',
  'tariff.save': 'Tarif saqlandi',
  'tariff.delete': "Tarif o'chirildi",
  'notification.send': 'Bildirishnoma yuborildi',
  'referral.mark_paid': "Referral to'landi deb belgilandi",
  'referral.cancel_free': 'Referral bepul Pro bekor qilindi',
};

/**
 * @param {string} type   ADMIN_ACTION_LABELS kalitlaridan biri
 * @param {string|null} target  ta'sirlangan hujjat/uid (bo'lsa)
 * @param {object} [meta] qo'shimcha kontekst — KICHIK bo'lsin (sanoq, nom)
 */
export function logAdminAction(type, target = null, meta = undefined) {
  const actor = auth.currentUser;
  // Kirmagan holatda yozishga urinmaymiz — rules baribir rad etadi
  if (!actor) return;

  addDoc(collection(db, 'adminActions'), {
    type,
    target: target ? String(target).slice(0, 128) : null,
    // `meta` ni ataylab kichik ushlaymiz: jurnal hujjati arzon bo'lishi kerak,
    // aks holda uni o'qish o'zi kvota muammosiga aylanadi.
    meta: meta ? JSON.parse(JSON.stringify(meta)) : null,
    actorUid: actor.uid,
    actorEmail: actor.email || null,
    createdAt: new Date().toISOString(),
  }).catch((e) => {
    // Jimgina emas — konsolda ko'rinsin, lekin foydalanuvchiga chiqmasin.
    // Eng ehtimoliy sabab: firestore.rules hali deploy qilinmagan.
    console.warn('adminLog yozilmadi (rules deploy qilinganmi?):', e?.code || e?.message);
  });
}

export default logAdminAction;
