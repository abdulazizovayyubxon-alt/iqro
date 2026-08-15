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
 * ⚠️ JURNAL AUDITI 2026-08-15 — qamrov teshiklari yopildi:
 * Birinchi tadbiqda faqat AdminPage.jsx ichidagi amallar yozilardi. Panelning
 * PUL bilan bog'liq ikkita bo'limi — promo-kodlar (PromoTab) va B2B maktablar
 * (SchoolsTab) — mustaqil fayl bo'lgani uchun butunlay tashqarida qolgan edi:
 * promo-kod o'chirish, maktab obunasini bir yilga uzaytirish, maktabga admin
 * biriktirish hech qayerda ko'rinmasdi. Shuningdek jurnalning O'ZINI tozalash
 * (client xato yozuvini o'chirish) ham iz qoldirmasdi — kuzatuvni sezdirmay
 * o'chirib tashlash mumkin edi.
 *
 * ⚠️ QOIDA: yozuv HECH QACHON asosiy amalni bloklamaydi va xato tashlamaydi.
 * Sabab — `firestore.rules` Vercel tomonidan deploy QILINMAYDI. Kod ishga
 * tushgan, lekin `firebase deploy --only firestore:rules` hali bajarilmagan
 * oraliqda har yozuv `permission-denied` bilan rad etiladi. Agar bu xato
 * yuqoriga chiqsa, admin panelining ishlaydigan funksiyalari buzilgan bo'lardi.
 * Shu sababli hamma narsa `.catch()` ichida — jurnal ishlamasa ham panel ishlaydi.
 *
 * ⚠️ CHEGARA: bu MIJOZ tomonidagi iz. Firebase konsolidan yoki Admin SDK
 * skriptidan qilingan o'zgarish bu yerga TUSHMAYDI. Jurnal "panel orqali kim
 * nima qildi" savoliga javob beradi, "bazada nima o'zgardi" ga emas.
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Jurnal guruhlari — panelda filtr chiplari shu ro'yxatdan quriladi.
 * Guruh = "bu amal nimaga tegadi", ya'ni muammo qidirayotgan odam qaysi
 * kesimdan boshlashini biladi (pul yo'qoldi → billing, kirish muammosi → access).
 */
export const ADMIN_ACTION_GROUPS = {
  access: 'Huquq va hisob',
  billing: 'Pul va obuna',
  content: 'Savollar',
  comms: 'Xabar va murojaat',
  system: 'Tizim',
};

/**
 * Amal turlari — erkin satr emas, ro'yxat. Yangi amal qo'shsangiz shu yerga
 * yozing: jurnalni o'qiyotgan odam qisqartmani tushunishi kerak.
 *
 * `danger: true` — QAYTARILMAS yoki keng ta'sirli amal (hisob o'chirish, huquq
 * berish, ommaviy o'chirish). Jurnalda alohida rang bilan ajratiladi va
 * «Faqat xavflilar» filtri aynan shularni ko'rsatadi: 500 qatorli jurnalda
 * ko'z bilan qidirish real emas.
 */
export const ADMIN_ACTIONS = {
  // ── Huquq va hisob ──
  'role.grant_admin': { label: 'Admin huquqi berildi', group: 'access', danger: true },
  'role.revoke_admin': { label: 'Admin huquqi olindi', group: 'access', danger: true },
  // Rol boshqaruvi uchta tanlovli oynaga aylantirilgandan keyingi turlar.
  // Eski `role.revoke_admin` va `partner.assign_code` ro'yxatda QOLADI: ular
  // allaqachon yozilgan yozuvlarda bor, o'chirsak jurnal tarixi o'qilmay qoladi.
  'role.set_user': { label: 'Oddiy foydalanuvchiga aylantirildi', group: 'access', danger: true },
  'role.set_partner': { label: 'Hamkor ustoz qilindi', group: 'access' },
  'user.delete': { label: "Foydalanuvchi o'chirildi", group: 'access', danger: true },
  'premium.grant': { label: 'Pro berildi', group: 'access' },
  'premium.revoke': { label: 'Pro bekor qilindi', group: 'access' },
  'partner.assign_code': { label: 'Hamkor kodi biriktirildi', group: 'access' },
  'deletion_request.status': { label: "Hisob o'chirish so'rovi holati", group: 'access' },

  // ── Pul va obuna ──
  'tariff.save': { label: 'Tarif saqlandi', group: 'billing' },
  'tariff.delete': { label: "Tarif o'chirildi", group: 'billing', danger: true },
  'promo.create': { label: 'Promo-kod yaratildi', group: 'billing' },
  'promo.toggle': { label: 'Promo-kod yoqildi/o’chirildi', group: 'billing' },
  'promo.delete': { label: "Promo-kod o'chirildi", group: 'billing', danger: true },
  'promo.set_subject': { label: 'Promo-kodga fan biriktirildi', group: 'billing' },
  'referral.mark_paid': { label: "Referral to'landi deb belgilandi", group: 'billing' },
  'referral.cancel_free': { label: 'Referral bepul Pro bekor qilindi', group: 'billing' },
  'school.create': { label: 'Maktab yaratildi', group: 'billing' },
  'school.toggle': { label: 'Maktab yoqildi/o’chirildi', group: 'billing' },
  'school.delete': { label: "Maktab o'chirildi", group: 'billing', danger: true },
  'school.extend': { label: 'Maktab obunasi uzaytirildi', group: 'billing' },
  'school.sync_premium': { label: "Maktab a'zolariga Pro tarqatildi", group: 'billing' },
  'school.add_admin': { label: 'Maktab admini biriktirildi', group: 'billing' },
  'school_request.status': { label: "Maktab so'rovi holati", group: 'billing' },

  // ── Savollar ──
  'question.create': { label: "Savol qo'shildi", group: 'content' },
  'question.update': { label: 'Savol tahrirlandi', group: 'content' },
  'question.delete': { label: "Savol o'chirildi", group: 'content', danger: true },
  'question.import': { label: 'JSON import', group: 'content' },
  'question.dedupe': { label: "Dublikatlar o'chirildi", group: 'content', danger: true },
  'question.publish': { label: 'Yangilanish yuborildi', group: 'content' },

  // ── Xabar va murojaat ──
  'notification.send': { label: 'Bildirishnoma yuborildi', group: 'comms' },
  'notification.delete': { label: "Bildirishnoma o'chirildi", group: 'comms' },
  'objection.delete': { label: "E'tiroz o'chirildi", group: 'comms', danger: true },
  'request.fulfill': { label: "So'rov bajarildi deb belgilandi", group: 'comms' },
  'request.delete_group': { label: "Savol so'rovlari o'chirildi", group: 'comms', danger: true },

  // ── Tizim ──
  'log.delete': { label: "Xato yozuvi o'chirildi", group: 'system', danger: true },
};

/**
 * Noma'lum tur ham ko'rsatiladi (jurnal hech qachon ma'lumot yashirmasligi
 * kerak), lekin yorliqsiz — shu sababli `describeAdminAction` xom kalitni
 * qaytaradi va `logAdminAction` dev rejimida ogohlantiradi.
 */
export function describeAdminAction(type) {
  return ADMIN_ACTIONS[type] || { label: type, group: 'system', danger: false };
}

/**
 * `meta` ni bir qatorga aylantiradi. Ilgari UI to'g'ridan `${v}` qilardi —
 * qiymat obyekt/massiv bo'lsa jurnalda `[object Object]` chiqib, kontekst
 * yo'qolardi (aynan kontekst uchun yozilgan maydonda).
 */
export function formatActionMeta(meta) {
  if (!meta || typeof meta !== 'object') return '';
  return Object.entries(meta)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
}

/**
 * @param {string} type   ADMIN_ACTIONS kalitlaridan biri
 * @param {string|null} target  ta'sirlangan hujjat/uid (bo'lsa)
 * @param {object} [meta] qo'shimcha kontekst — KICHIK bo'lsin (sanoq, nom)
 */
export function logAdminAction(type, target = null, meta = undefined) {
  const actor = auth.currentUser;
  // Kirmagan holatda yozishga urinmaymiz — rules baribir rad etadi
  if (!actor) return;

  // Ro'yxatdan tushib qolgan tur — yozuv baribir ketadi, lekin ishlab chiqish
  // paytida darrov ko'rinsin (`partner.assign_code` aynan shunday yorliqsiz
  // qolib ketgan edi: jurnalda odam o'qiy olmaydigan xom kalit turardi).
  if (import.meta.env?.DEV && !ADMIN_ACTIONS[type]) {
    console.warn(`adminLog: "${type}" ADMIN_ACTIONS ro'yxatida yo'q — yorliq qo'shing`);
  }

  addDoc(collection(db, 'adminActions'), {
    type,
    target: target ? String(target).slice(0, 128) : null,
    // `meta` ni ataylab kichik ushlaymiz: jurnal hujjati arzon bo'lishi kerak,
    // aks holda uni o'qish o'zi kvota muammosiga aylanadi.
    meta: meta ? JSON.parse(JSON.stringify(meta)) : null,
    actorUid: actor.uid,
    actorEmail: actor.email || null,
    createdAt: new Date().toISOString(),
    // Server vaqti — MIJOZ SOATIDAN mustaqil tasdiq. `createdAt` brauzerdan
    // olinadi va noto'g'ri sozlangan soat (yoki ataylab o'zgartirilgan) jurnal
    // tartibini buzardi, buni sezish esa imkonsiz edi. Tartiblash hamon
    // `createdAt` bo'yicha (eski yozuvlarda `ts` yo'q — `orderBy('ts')` ularni
    // ro'yxatdan butunlay yo'qotardi), `ts` esa nomuvofiqlikni FOSH qiladi.
    ts: serverTimestamp(),
  }).catch((e) => {
    // Jimgina emas — konsolda ko'rinsin, lekin foydalanuvchiga chiqmasin.
    // Eng ehtimoliy sabab: firestore.rules hali deploy qilinmagan.
    console.warn('adminLog yozilmadi (rules deploy qilinganmi?):', e?.code || e?.message);
  });
}

export default logAdminAction;
