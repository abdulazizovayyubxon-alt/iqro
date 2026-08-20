/**
 * ════════════════════════════════════════════════════════════════════════
 *  userSearch.js — admin panelidagi foydalanuvchi qidiruvi
 *
 *  NEGA ALOHIDA FAYL (2026-08-20):
 *    Bu mantiq AdminPage.jsx ichida edi va TESTDAN CHETDA qolgan edi.
 *    Aynan shu joyda jimgina nosozlik bor edi: admin «Omonov» deb qidirsa
 *    «mavjud emas» javobini olardi, holbuki bazada uchta Omonov bor edi.
 *    Qidiruv — adminning eng ko'p ishlatadigan amali; u buzilganda ilova
 *    "ishlab turgandek" ko'rinadi, lekin admin xato xulosa chiqaradi
 *    (masalan, to'lov qilgan odamni "ro'yxatdan o'tmagan" deb hisoblaydi).
 *    Shuning uchun mantiq sof funksiyalarga ajratildi va testga olindi.
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * Matnni solishtirishga tayyorlaydi.
 *
 * O'zbek ismlari panelga har xil yozuvda tushadi: «Omonov», «OMONOV»,
 * «O‘monov» (tipografik apostrof), «O'monov» (oddiy apostrof), «Oʻmonov»
 * (modifier letter). Xom `toLowerCase()` bularni BOSHQA satr deb biladi —
 * ya'ni admin to'g'ri familiyani yozib ham hech narsa topmasligi mumkin.
 *
 * Kirill↔lotin transliteratsiyasi ATAYLAB qilinmadi: bazada ismlar lotinda
 * yozilgan va transliteratsiya soxta mosliklar keltiradi.
 */
export const normalizeSearch = (s) => String(s ?? '')
  .toLowerCase()
  .replace(/[ʻʼ‘’`´]/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Foydalanuvchi hujjatining qidiriladigan BARCHA maydonini bitta satrga yig'adi.
 *
 * Telefon ikki ko'rinishda qo'shiladi — xom holda («998901234567») va 998
 * prefiksisiz («901234567»), chunki admin raqamni ikki xil yozadi. Avval
 * faqat xom qiymat solishtirilardi, natijada «901234567» hech narsa topmasdi.
 */
export const userHaystack = (u) => {
  const phone = String(u?.phone || u?.phoneNumber || '').replace(/\D/g, '');
  return normalizeSearch([
    u?.displayName,
    u?.email,
    u?.shortId,
    phone,
    phone.startsWith('998') ? phone.slice(3) : '',
  ].filter(Boolean).join(' '));
};

/**
 * Qidiruv shartini tekshiradi.
 *
 * Matn SO'ZLARGA bo'linadi va HAR BIR so'z topilishi talab qilinadi (VA
 * mantiqi) — shuning uchun «aziz omonov» ham, «omonov aziz» ham bitta odamni
 * topadi: bazada ism «Omonov Aziz» tartibida saqlanadi, satr sifatida
 * solishtirilganda esa «aziz omonov» mos kelmasdi.
 *
 * Har bir so'z ichkaridan ham mos keladi: «omon» → «Omonov», «Omonova»,
 * «Omonqulov». Bu ATAYLAB `includes` (prefiks emas) — admin familiyani
 * o'rtasidan ham eslashi mumkin, va ro'yxat mijozda bo'lgani uchun buning
 * narxi yo'q. (Server tomonda esa Firestore faqat prefiksni qo'llab-quvvatlaydi
 * — AdminPage.jsx `searchUsersOnServer` izohiga qarang.)
 */
export const matchesUserSearch = (u, term) => {
  const words = normalizeSearch(term).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const hay = userHaystack(u);
  return words.every(w => hay.includes(w));
};
