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
 *
 *  IKKI QATLAM (2026-08-29):
 *    1) MIJOZ filtri — `matchesUserSearch`. Yuklangan ro'yxat ichida
 *       ishlaydi, so'z O'RTASIDAN ham topadi, narxi nol.
 *    2) SERVER indeksi — `buildUserSearchTokens` / `serverSearchKey`.
 *       Har bir `users` hujjatida `searchTokens` massivi bo'ladi va
 *       Firestore `array-contains` bilan BUTUN bazadan izlaydi. Baza
 *       nechta bo'lishidan qat'i nazar bitta qidiruv ~20-30 o'qish.
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
 * `normalizeSearch` + apostrofni BUTUNLAY olib tashlash.
 *
 * NEGA (2026-08-29): `normalizeSearch` apostrof KO'RINISHLARINI birlashtiradi,
 * lekin apostrofning O'ZINI saqlaydi. Ya'ni admin «qoraev» deb yozsa
 * «Qo'raev» topilmasdi — apostrof bir tomonda bor, ikkinchisida yo'q.
 * Bazadagi ismlarning bir qismi apostrofsiz yozilgan (klaviatura odati),
 * shuning uchun ikkala tomon ham apostrofsiz shaklga keltiriladi. Bu
 * qidiruvni kengaytiradi, lekin soxta moslik BERMAYDI: apostrof
 * o'zbek ismlarida ma'no ajratmaydi.
 */
export const searchKey = (s) => normalizeSearch(s).replace(/'/g, '');

/**
 * Foydalanuvchi hujjatining qidiriladigan BARCHA maydonini bitta satrga yig'adi.
 *
 * Telefon ikki ko'rinishda qo'shiladi — xom holda («998901234567») va 998
 * prefiksisiz («901234567»), chunki admin raqamni ikki xil yozadi. Avval
 * faqat xom qiymat solishtirilardi, natijada «901234567» hech narsa topmasdi.
 */
export const userHaystack = (u) => {
  const phone = String(u?.phone || u?.phoneNumber || '').replace(/\D/g, '');
  return searchKey([
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
 * — pastdagi `buildUserSearchTokens` izohiga qarang.)
 */
export const matchesUserSearch = (u, term) => {
  const words = searchKey(term).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const hay = userHaystack(u);
  return words.every(w => hay.includes(w));
};

// ════════════════════════════════════════════════════════════════════════
//  SERVER INDEKSI — `users/{uid}.searchTokens`
// ════════════════════════════════════════════════════════════════════════
//
// MUAMMO (2026-08-29): baza 502 hisobga yetdi, admin paneli esa ro'yxatni
// bitta so'rovda yuklab, qidiruvni SHU ro'yxat ichida qilardi. Ya'ni
// qidiruvning ishonchliligi ro'yxat chegarasiga bog'lanib qolgan edi:
// baza 2000-3000 ga chiqqanda «topilmadi» javobi hech narsani isbotlamay
// qo'yadi, chegarani ko'tarish esa har ochilishda minglab o'qish degani.
//
// NEGA TOKEN, NEGA PREFIKS SO'ROVI EMAS:
//   Firestore matn ichidan qidira olmaydi (`LIKE '%omon%'` yo'q). Prefiks
//   oralig'i (`>= v` … `<= v + `) faqat satr BOSHIDAN mos keladi va
//   registrga sezgir — «Oyxon Abdulazizova» ni «abdulaziz» bilan topib
//   bo'lmaydi, chunki hujjatda ism BIRINCHI so'z. Yagona ishonchli yechim —
//   har bir hujjatga oldindan hisoblangan prefikslar massivini yozib,
//   `array-contains` bilan izlash.
//
// NARXI:
//   · Yozuv: `searchTokens` foydalanuvchi hujjati bilan BIR YOZUVDA saqlanadi
//     (ro'yxatdan o'tish / profilni tahrirlash allaqachon yozayotgan edi),
//     ya'ni QO'SHIMCHA yozuv nolga teng.
//   · O'qish: bitta qidiruv = 1 so'rov × `limit` = eng ko'pi 30 o'qish,
//     baza hajmidan QAT'I NAZAR. Butun ro'yxatni yuklash (500 o'qish) bilan
//     solishtirganda 16 barobar arzon va baza o'sganda ham narxi o'zgarmaydi.
//
// ⚠️ INDEKS: `array-contains` bitta maydon bo'yicha ishlaydi va Firestore
// bunga AVTOMATIK indeks quradi — `firestore.indexes.json` ga qo'l tegmaydi.
// Shu sababli bu so'rovga `orderBy` QO'SHILMAYDI: u kompozit indeks talab
// qilardi va indeks e'lon qilinmagani uchun so'rov jimgina yiqilardi.

/** Prefiks tokenining eng qisqa uzunligi (harfli so'zlar uchun). */
export const SEARCH_TOKEN_MIN = 2;

/**
 * Prefiks tokenining eng uzun uzunligi.
 *
 * ⚠️ Bu son QIDIRUVDA ham ishlatiladi (`serverSearchKey`): 12 dan uzun so'z
 * shu uzunlikkacha KESILADI, ya'ni «abdurahmonovich» → «abdurahmonov» tokeni
 * bo'yicha topiladi. Ikki tomon bir xil chegaradan foydalanmasa, uzun
 * familiyalar jimgina topilmay qoladi — shuning uchun konstanta bitta.
 */
export const SEARCH_TOKEN_MAX = 12;

/**
 * Raqamli so'zlar uchun eng qisqa token.
 *
 * Telefon raqamlarining hammasi «998» bilan boshlanadi — 2-3 xonali raqamli
 * tokenlar BUTUN bazaga mos kelib, qidiruvni ma'nosiz qilardi (va `limit` ni
 * tasodifiy 30 kishi bilan to'ldirib, kvotani behuda yeyardi). 4 dan boshlanadi.
 */
export const SEARCH_TOKEN_MIN_DIGITS = 4;

/**
 * Bitta hujjatga yoziladigan tokenlar soni chegarasi.
 *
 * Firestore massiv elementlarining HAR BIRIGA indeks yozuvi quradi, ya'ni
 * nazoratsiz massiv yozuv narxini oshiradi. 80 ta token amalda 5-6 so'zli
 * ismgacha yetadi — bazadagi ismlar esa 2-3 so'z.
 */
export const SEARCH_TOKEN_CAP = 80;

/** Matnni tokenlanadigan so'zlarga bo'ladi (harf/raqamdan boshqasi — ajratgich). */
const tokenWords = (s) => searchKey(s).split(/[^a-z0-9]+/).filter(Boolean);

/** Bitta so'zning barcha prefikslari. */
const prefixesOf = (word) => {
  if (!word) return [];
  const min = /^\d+$/.test(word) ? SEARCH_TOKEN_MIN_DIGITS : SEARCH_TOKEN_MIN;
  // So'z minimaldan ham qisqa bo'lsa (masalan «A.» dagi «a») — o'zi token
  // bo'lib qoladi, aks holda bunday ism umuman indekslanmasdi.
  if (word.length < min) return [word];
  const max = Math.min(word.length, SEARCH_TOKEN_MAX);
  const out = [];
  for (let i = min; i <= max; i += 1) out.push(word.slice(0, i));
  return out;
};

/**
 * Foydalanuvchi hujjati uchun qidiruv tokenlari.
 *
 * Nimalar kiritiladi:
 *   · `displayName` ning HAR BIR so'zi — «Oyxon Abdulazizova» ikki so'z,
 *     ya'ni familiya ismdan KEYIN turgan bo'lsa ham topiladi. Aynan shu
 *     narsa eski prefiks-so'rovida ishlamasdi.
 *   · `shortId` («a0002») va uning raqamli qismi («0002») — admin ID ni
 *     harfsiz ham yozadi.
 *   · `email` ning @ dan oldingi qismi. Telefon bilan ro'yxatdan o'tganlarda
 *     bu aynan raqam («998901234567@iqro.uz»), ya'ni telefon prefikslari
 *     ham shu yerdan bepul keladi.
 *
 * `phone` ALOHIDA qo'shilmaydi: u soxta emailning ichida bor, bundan tashqari
 * server qidiruvida telefon oraliq so'rovi (`>=` / `<=`) bilan ham
 * qidiriladi — uchinchi marta takrorlashning ma'nosi yo'q.
 */
export const buildUserSearchTokens = (u) => {
  const set = new Set();
  const add = (word) => prefixesOf(word).forEach(t => set.add(t));

  tokenWords(u?.displayName).forEach(add);
  tokenWords(u?.shortId).forEach(add);
  const idDigits = String(u?.shortId ?? '').match(/\d+/);
  if (idDigits) add(idDigits[0]);
  tokenWords(String(u?.email ?? '').split('@')[0]).forEach(add);

  return Array.from(set).slice(0, SEARCH_TOKEN_CAP);
};

/**
 * Qidiruv matnidan `array-contains` uchun BITTA kalit tanlaydi.
 *
 * Firestore bitta so'rovda bitta `array-contains` ga ruxsat beradi, shuning
 * uchun eng UZUN so'z tanlanadi — u eng kam natija qaytaradi, ya'ni eng kam
 * o'qish. Qolgan so'zlar natija ustida mijozda filtrlanadi
 * (`matchesUserSearch`), demak «abdulazizova oyxon» ham to'g'ri ishlaydi.
 *
 * `null` qaytarsa — matn qidirishga yaroqsiz (juda qisqa) va server so'rovi
 * YUBORILMAYDI. Bu ATAYLAB: bir harfli so'rov bazadan tasodifiy 30 kishini
 * qaytarardi — foyda yo'q, o'qish esa sarflangan bo'lardi.
 */
export const serverSearchKey = (term) => {
  const best = tokenWords(term).sort((a, b) => b.length - a.length)[0];
  if (!best) return null;
  const min = /^\d+$/.test(best) ? SEARCH_TOKEN_MIN_DIGITS : SEARCH_TOKEN_MIN;
  if (best.length < min) return null;
  return best.slice(0, SEARCH_TOKEN_MAX);
};
