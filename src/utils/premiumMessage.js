/**
 * ════════════════════════════════════════════════════════════════════════
 *  premiumMessage.js — admin qo'li bilan Pro berilganda foydalanuvchiga
 *  ketadigan xabar matni.
 *
 *  NEGA ALOHIDA MODUL: AdminPage.jsx 6400 qatorlik va testga olinmaydi,
 *  bu yerdagi mantiq esa aynan sinovni talab qiladi — pastdagi izohlarga
 *  qarang, uchta tuzoqning uchalasi ham HAQIQIY bazadagi ma'lumotdan
 *  chiqqan (`src/__tests__/premiumMessage.test.js`).
 *
 *  NEGA UMUMAN KERAK (2026-09-05):
 *    Pro uch yo'l bilan beriladi va ulardan faqat BITTASI jim edi:
 *      · to'lov          → api/payment-webhook.js xabar yozadi
 *      · muddat tugashi  → api/cron-daily.js xabar yuboradi
 *      · admin qo'li     → HECH NARSA
 *    Ya'ni panel orqali Pro olgan odam buni bilmasdi — ilovani tasodifan
 *    qayta ochib sezardi.
 * ════════════════════════════════════════════════════════════════════════
 */
import { SUPPORT_URL } from '../config';

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/**
 * ISO sanadan «2026-yil 5-oktabr» qiladi.
 *
 * ⚠️ `toLocaleDateString('uz-UZ')` ATAYLAB ishlatilmadi: brauzerga qarab
 * «05.10.2026» ham, «10/5/2026» ham qaytaradi (config.js:54 da xuddi shu
 * sabab bilan raqam guruhlash ham qo'lda qilingan). Xabar matnida sana
 * chalkash bo'lmasligi kerak — «5-oktabr» bir xil o'qiladi.
 *
 * Kun MAHALLIY vaqt bo'yicha olinadi: `premiumExpire` — mahalliy 23:59:59
 * ning ISO ko'rinishi, ya'ni UTC da u ALLAQACHON boshqa kun bo'lishi mumkin
 * (Toshkent uchun 18:59:59Z — o'sha kun, lekin 23:59:59 +14 mintaqada emas).
 */
export function formatUzDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-yil ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
}

/**
 * Bugundan muddatgacha necha kun.
 *
 * `round`, `ceil` emas: muddat kun OXIRIGA (23:59:59) qo'yiladi, ya'ni
 * kunduzi berilgan «30 kun» aslida 30.4 kun bo'ladi va `ceil` uni «31 kun»
 * deb ko'rsatardi — admin tanlagan tugma bilan xabardagi son bir-biriga
 * to'g'ri kelmasdi.
 */
export function daysUntil(iso, now = new Date()) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(1, Math.round((d.getTime() - now.getTime()) / 86400000));
}

/**
 * `displayName` ni murojaatga yaroqli holatga keltiradi — yoki `null`
 * qaytaradi (ya'ni ismsiz murojaat qilinadi).
 *
 * ⚠️ NEGA TEKSHIRUV KERAK: `displayName` HAR DOIM ham ism emas.
 *   · AuthContext.jsx:408 ismsiz hisobga `email.split('@')[0]` yozadi;
 *   · AuthContext.jsx:815 telefon orqali kirganda `... || phone` ga tushadi.
 * «Hurmatli 998901234567!» — tilakdan ko'ra xafa qiladi, shuning uchun
 * shubhali qiymatda ism UMUMAN ishlatilmaydi.
 *
 * Bazadagi ismlar iflos ham: `"Sharof Baratov "`, `"Oyxon "`,
 * `"Sarvar  Valiyarov"` (ikki probel) — shuning uchun avval tozalanadi.
 */
export function cleanDisplayName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  // Uzun qiymat — ism emas (izoh, manzil, tasodifiy matn).
  if (name.length > 60) return null;
  // Email yoki uning bo'lagi.
  if (name.includes('@')) return null;
  // Telefon: faqat raqam va ajratgichlardan iborat, 7+ raqamli.
  if (/^[\d+()\-\s]+$/.test(name) && name.replace(/\D/g, '').length >= 7) return null;
  // shortId (`A0001`, `AB0001`) — utils/shortId.js formati.
  if (/^[A-Z]{1,2}\d{4}$/.test(name)) return null;
  // Firebase uid (`q9gtnqTmWdWTuQBeRuM1IVocKjy1`): uzun, probelsiz,
  // raqam + ikkala registr aralash.
  if (/^[A-Za-z0-9]{20,}$/.test(name) && /\d/.test(name) && /[a-z]/.test(name) && /[A-Z]/.test(name)) return null;

  // `email.split('@')[0]` dan kelgan ismlar butunlay kichik harfda bo'ladi
  // (`inobatsaxadova`). Ularni rad etib bo'lmaydi — «zafar», «sanjarbek»
  // kabi haqiqiy ismlar ham shunday yoziladi — lekin bosh harf qo'yish
  // ikkala holatda ham matnni yaxshilaydi. Kirill ismlarga tegmaydi.
  return name.replace(/(^|\s)(\p{Ll})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase());
}

export const GRANT_TITLE = '🎉 Pro obuna faollashtirildi';

/**
 * Ilova ICHIDAGI bildirishnoma matni (users/{uid}/notifications).
 *
 * Aloqa manzili shu yerda BOR: yordam havolasi ilovada allaqachon ochiq
 * (config.js:63 — Play build'da ham gate qilinmagan).
 *
 * `SUPPORT_URL` to'liq havola sifatida yoziladi, `@zehinuz` deb emas:
 * NotificationBell.jsx:17 `@username` ni `t.me/zehinuz` ga bog'laydi, u esa
 * KANAL (config.js:68 — «murojaat uchun emas»), ya'ni odam savol bilan
 * yozolmasdi. To'liq havola `?direct` bilan birga saqlanadi.
 */
export function buildGrantMessage({ name, expireIso, now = new Date() } = {}) {
  const clean = cleanDisplayName(name);
  const salom = clean ? `Hurmatli ${clean}!` : 'Assalomu alaykum!';
  const sana = formatUzDate(expireIso);
  const kun = daysUntil(expireIso, now);

  return `${salom} Zehin Pro obunangiz faollashtirildi — u ${sana}gacha amal qiladi (${kun} kun). `
    + 'Barcha fanlar, cheksiz testlar va tahlil endi siz uchun ochiq.\n\n'
    + `Har qanday savolingiz bo'lsa, bemalol yozing: ${SUPPORT_URL}\n\n`
    + "Tayyorgarligingiz mustahkam bo'lsin, omad tilaymiz!";
}

/**
 * PUSH matni — ilova ichidagidan BOSHQA, va bu ataylab.
 *
 *  1. Qulf ekranida ikki qatordan keyini kesiladi → qisqa bo'lishi shart.
 *  2. ⚠️ ALOQA MANZILI YO'Q. OBUNA_XABARNOMALARI.md dagi qoida:
 *     `api/cron-daily.js` push matnidan manzilni olib tashlaydi, agar
 *     `users/{uid}.pushIsPlay === true` bo'lsa (Google Play anti-steering).
 *     Panel push'i o'sha bayroqni bilmaydi — target'ning hujjatini qayta
 *     o'qish kerak bo'lardi. Shubhada cheklovli tomon tanlanadi: manzil
 *     push'da UMUMAN yo'q, u ilova ichidagi xabarda qoladi.
 */
export function buildGrantPush({ name, expireIso } = {}) {
  const clean = cleanDisplayName(name);
  const sana = formatUzDate(expireIso);
  return clean
    ? `${clean}, obunangiz ${sana}gacha amal qiladi. Omad!`
    : `Zehin Pro obunangiz ${sana}gacha amal qiladi. Omad!`;
}
