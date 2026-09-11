/**
 * ════════════════════════════════════════════════════════════════════════
 *  resetPasswordMessage.js — admin vaqtinchalik parol berganda
 *  foydalanuvchiga TELEGRAMDA yuboriladigan tayyor xabar.
 *
 *  NEGA ILOVA ICHIGA YUBORILMAYDI (Pro xabaridan farqi — premiumMessage.js):
 *    Paroli tiklanayotgan odam ilovaga KIRA OLMAYDI, ya'ni qo'ng'iroqdagi
 *    xabarni o'qiy olmaydi. U adminga Telegramda yozgan (LoginPage «Parolni
 *    unutdim» paneli) — javob ham o'sha chatga boradi. Shuning uchun panel
 *    xabarni YUBORMAYDI, faqat ko'chirishga tayyorlaydi.
 *
 *  2026-09-11: ilgari admin parolni ko'chirib, ko'rsatmani har safar qo'lda
 *  yozardi. Matnda JONLI PAROL bor, shuning uchun mantiq testga olingan
 *  (`src/__tests__/resetPasswordMessage.test.js`).
 * ════════════════════════════════════════════════════════════════════════
 */
import { cleanDisplayName } from './premiumMessage';

/**
 * Telefon raqamini NIQOBLAB beradi: `+998 90 ••• •• 67`.
 *
 * ⚠️ NEGA TO'LIQ RAQAM EMAS: xabarda parol turibdi. Admin uni adashib boshqa
 * chatga tashlasa, «raqam + parol» tayyor login bo'lib qolardi. Niqoblangan
 * raqam egasiga qaysi hisob ekanini tanitadi (o'z raqamini u biladi — adminga
 * o'zi yuborgan), begonaga esa kirish bermaydi.
 *
 * `*` ATAYLAB ishlatilmadi: Telegram `**...**` ni qalin matnga aylantiradi
 * va raqam buzilib ko'rinardi.
 */
export function maskPhone(raw) {
  if (raw == null || String(raw).includes('@')) return null;
  const d = String(raw).replace(/\D/g, '');
  let local = null;
  if (d.length === 12 && d.startsWith('998')) local = d.slice(3);
  else if (d.length === 9) local = d;
  if (!local) return null;
  return `+998 ${local.slice(0, 2)} ••• •• ${local.slice(7)}`;
}

/**
 * Auth emaili `998XXXXXXXXX@iqro.uz` (AuthContext.jsx `phoneToEmail`) —
 * profilda `phone` yo'q hisobda raqam shu yerdan tiklanadi. Faqat AYNAN shu
 * shakl olinadi: `ali123456789@gmail.com` dagi 9 ta raqam telefon EMAS.
 */
function phoneFromEmail(email) {
  const local = String(email || '').split('@')[0];
  return /^998\d{9}$/.test(local) ? local : null;
}

/**
 * Parol backtick ichida: Telegram uni monospace shriftga o'tkazadi — parol
 * matndan ajralib turadi va harflari aniq ko'rinadi.
 *
 * Qolgan matnda Telegram belgilash sintaksisi (`**`, `__`, `~~`, `||`)
 * bo'lmasligi SHART — aks holda xabar yuborilganda buzilib ko'rinadi.
 */
export function buildResetPasswordMessage({ name, phone, email, password } = {}) {
  const clean = cleanDisplayName(name);
  const salom = clean ? `Hurmatli ${clean}!` : 'Assalomu alaykum!';
  const raqam = maskPhone(phone) || maskPhone(phoneFromEmail(email));

  return [
    salom,
    '',
    'Zehin hisobingiz uchun vaqtinchalik parol tayyor.',
    '',
    ...(raqam ? [`📱 Raqam: ${raqam}`] : []),
    `🔑 Parol: \`${password}\``,
    '',
    'Qanday kirasiz:',
    '1. Ilovada telefon raqamingizni kiriting.',
    '2. Parolni aynan shunday yozing — katta va kichik harflar farq qiladi.',
    "3. Kirgach, Sozlamalar → Parolni o'zgartirish bo'limida o'zingizga qulay parol qo'ying.",
    '',
    "Eski parolingiz endi ishlamaydi, boshqa qurilmalarda ham qaytadan kirishingiz kerak bo'ladi. "
      + 'Bu parolni hech kimga bermang.',
  ].join('\n');
}
