// Markaziy konfiguratsiya — barcha global konstantalar shu yerda

// Imtihon sanasi — agar o'tib ketgan bo'lsa, keyingi siklga o'tadi
const RAW_EXAM_DATE = new Date('2026-05-13T09:00:00');
export const EXAM_DATE = RAW_EXAM_DATE > new Date() ? RAW_EXAM_DATE : null;

export const APP_NAME = 'Zehin';
export const APP_VERSION = '2.0'; // Ilova versiyasi (Sozlamalar pastida ko'rsatiladi; relizda bu yerni yangilang)
export const APP_SUBTITLE = 'Attestatsiya platformasi';
export const EXAM_LABEL = EXAM_DATE ? '13 May — Malaka toifa imtihoni' : 'Zehin — attestatsiya platformasi';
export const EXAM_GOAL_SCORE = 70;

// ─── Imtihon davomiyligi — FANGA QARAB, yagona manba ───
// Rasmiy attestatsiya me'yorida savol soni hamma fanda 50 ta, vaqt esa emas:
// hajmi kattaroq fanlarga ko'proq beriladi.
//
// ⚠️ Bu jadval ilgari IKKI joyda, ikki xil nusxada turardi: ExamPage'dagisi
// to'liq (120 daq — boshlangich/info/biologiya/kimyo, 105 daq — til/rus_tili/
// ingliz), Dashboard'dagisi esa eskirgan (120 daq ro'yxatida faqat boshlangich
// va info, 105 daq da faqat til). Oqibati foydalanuvchiga KO'RINARDI: kimyo
// o'qituvchisi bosh sahifada «50 savol · 90 daqiqa» deb o'qib, imtihonga
// kirgach 120 daqiqa olardi. Endi manba bitta — nusxa ko'chirmang, shu
// funksiyani chaqiring.
const EXAM_DURATION_MIN = {
  boshlangich: 120, info: 120, biologiya: 120, kimyo: 120,
  til: 105, rus_tili: 105, ingliz: 105,
};
/** Fan uchun imtihon davomiyligi — daqiqada. Ro'yxatda yo'q fan → 90. */
export const examDurationMin = (category) => EXAM_DURATION_MIN[category] ?? 90;
/** Xuddi shu, lekin soniyada — taymer va deadline hisobi uchun. */
export const examDurationSec = (category) => examDurationMin(category) * 60;

/** Imtihondagi savollar soni — hamma fanda bir xil. */
export const EXAM_TOTAL = 50;

export const APP_URL = 'https://zehin-t41p.vercel.app'; // Haqiqiy domen (Vercel loyiha nomi: zehin, alias suffiksi -t41p saqlangan)

// ─── Platforma ko'rsatkichlari — ulashish matnlari uchun YAGONA MANBA ───
// Bu raqamlar foydalanuvchiga beriladigan VA'DA: «Ilovani ulashish» matnida,
// do'stni taklif qilish xabarlarida va qo'llanmada bir xil bo'lishi shart.
// Ilgari ular har joyda alohida yozilgan edi va eskirgandi: qo'llanma hali
// ham «16 ta fan, 44 000 savol» derdi (2026-08-14 da 17-fan — MTT jismoniy
// tarbiya — qo'shilgan, baza ~50 000 ga chiqqan), ulashish matni esa umuman
// raqam bermasdi. Endi manba shu yer.
// Fanlar soni bu yerda EMAS: u mockData.js dagi `SUBJECT_COUNT` (SUBJECTS
// ro'yxatining uzunligi) — ya'ni fan qo'shilishi bilan o'zi to'g'rilanadi.
// Savollar soni esa Firestore'da, build paytida hisoblab bo'lmaydi — shuning
// uchun qo'lda turadi.
// ⚠️ Baza kengayganda IKKI joy yangilanadi:
//    1) quyidagi QUESTION_COUNT,
//    2) index.html dagi description + og:/twitter: teglari (havola
//       Telegram/WhatsApp'ga tashlanganda ko'rinadigan kartochka).
export const QUESTION_COUNT = 50000; // pastga yaxlitlangan (matnlarda «50 000+» deb beriladi)
// Guruhlash QO'LDA: `toLocaleString('uz-UZ')` brauzerga qarab «50,000» ham
// qaytaradi (Chrome'da shunday) — o'zbekcha matnda vergul noto'g'ri o'qiladi
// va index.html dagi «50 000» bilan ziddiyat chiqadi. Bo'sh joy hamma joyda
// bir xil.
export const QUESTION_COUNT_TEXT = String(QUESTION_COUNT).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
// Shaxsiy murojaat (kanal "direkt" chati) — texnik yordam va huquqiy murojaatlar.
// ⚠️ 2026-08-14: bu kanal endi TO'LOV OPERATORI hamdir (pastdagi PAYMENT_TG_URL
// ga qarang). AUDIT 2026-08-06, T-13 bandidagi "kanal orqali to'lov qabul
// qilinmaydi" sharti BEKOR BO'LDI. Play build'da to'lov yuzasi baribir
// ko'rsatilmaydi (PremiumModal isPlayBuild gate'i), lekin yordam havolasi
// ochiq — ya'ni Play ilovasidan ham shu chatga o'tish mumkin. Google Play
// anti-steering nuqtai nazaridan bu chegaraviy holat: agar Play siyosati
// qattiqlashsa, SUPPORT_URL'ni ham isPlayBuild bilan gate qilish kerak.
export const SUPPORT_URL = 'https://t.me/zehinuz?direct';
export const CHANNEL_URL = 'https://t.me/zehinuz'; // Rasmiy Telegram kanal — yangiliklar/obuna (murojaat uchun emas)

// ─── To'lov usullari ko'rinishi ───
// Click integratsiyasi kod-tayyor va server tomoni (api/payment-webhook.js) tirik,
// lekin 2026-08-14 dan foydalanuvchidan VAQTINCHA YASHIRILGAN (egasi qarori).
// Yagona to'lov yo'li — Telegram operatori: foydalanuvchi Zehin "direkt" chatiga
// o'tadi, administrator kartadan kartaga to'lovni qabul qiladi va Pro'ni yoqadi.
// QAYTA YOQISH: shu bayroqni true qiling — Click varianti PremiumModal'da
// avtomatik qaytadi, boshqa hech narsa o'zgartirilmaydi.
export const CLICK_ENABLED = false;

// To'lov operatori bilan aloqa. Ayni paytda yordam kanali bilan bir xil, lekin
// alohida konstanta — kelajakda alohida to'lov akkaunti ochilsa shu yer o'zgaradi.
export const PAYMENT_TG_URL = SUPPORT_URL;

export const BATCH_SIZE = 50; // Har bir blokdagi savollar soni

// Maksimal saqlanadigan xatolar soni.
//
// ⚠️ AUDIT 2026-08-19, T-3 BAND — 50 dan 300 ga ko'tarildi.
//   O'lchov: 60% aniqlik bilan ishlayotgan pedagog har 50 savollik blokda
//   ~20 ta xato qiladi, ya'ni 50 lik chegara 2.5 ta blokdan keyin to'lardi.
//   Undan keyin har yangi xato ENG ESKI (va shu sababli eng uzoq vaqt
//   o'zlashtirilmagan) xatoni jimgina o'chirardi.
//   Yozuv ~250 bayt → 300 ta ≈ 75 KB, `userStats` uchun xavfsiz.
//   Chegara oshganda nima o'chishini `engine/mistakeQueue.pruneMistakes`
//   hal qiladi: eng eskisi emas, allaqachon YOPILGAN va kam xato qilingani.
export const MAX_MISTAKES_SAVED = 300;

// ── Tugallanmagan imtihon sessiyasi (localforage) ──────────────────────────
//
// ⚠️ AUDIT 2026-08-17, X-7 BAND — yozuv IKKIGA AJRATILDI.
//   Avval hammasi bitta `exam_session_v1` kalitida edi va u HAR javobda
//   qayta yozilardi — savollar massivi bilan birga. 50 savollik imtihonda
//   ≈ 60 yozuv × ~80 KB ≈ 5 MB keraksiz IndexedDB trafigi.
//   Bu AYNAN o'sha IndexedDB qatlami: `firebase.js` izohiga ko'ra 47 ta xato
//   jurnalining sababi bo'lgan va `persistentLocalCache` dan voz kechishga
//   majbur qilgan qatlam. Uni imtihon davomida bosim ostida ushlab turish —
//   tuzatilgan nosozlikni qaytarish xavfi.
//
//   Yechim TestPage.jsx dagi bilan bir xil (u 2026-08-17 da shunday tuzatilgan):
//     · hovuz  — og'ir, BIR MARTA yoziladi;
//     · progress — yengil (~3 KB), har javobda.
//   `poolStamp` ikkalasini bog'laydi: hovuz almashib progress eski qolsa,
//   javoblar boshqa savollarga yopishib qolmasligi uchun.
//
//   Kalitlar `uid` bo'yicha ajratilgan — umumiy qurilmada (maktab kompyuteri)
//   sessiyalar aralashmasligi uchun (T-21/X-10 bilan bir xil mulohaza).
export const examPoolKey = (uid) => `exam_pool_${uid}`;
export const examSessionKey = (uid) => `exam_session_${uid}`;

// Eski YAGONA kalit. Faqat ikki narsa uchun kerak:
//   1) migratsiya — yangilanish paytida yarim qolgan imtihon yo'qolmasligi;
//   2) tozalash — ichida savollar massivi qolib ketgan bo'lishi mumkin.
export const EXAM_SESSION_KEY = 'exam_session_v1';


// Bepul sinov muddati (kun) — ro'yxatdan o'tgan sanadan boshlab hisoblanadi
// Faqat shu yerda o'zgartirish yetarli — barcha sahifalar avtomatik yangilanadi
export const FREE_TRIAL_DAYS = 7;

// Admin huquqiga ega emaillar ro'yxati
export const ADMIN_EMAILS = [
  'abdulazizovayyubxon@gmail.com',
  '998999154686@iqro.uz' // Ayyubxonning telefon raqami
];

// Imtihon rejimida har savol uchun vaqt (soniyada)
export const QUESTION_TIMER_SECONDS = 60;

// Yillik obuna default narxi (ROI ko'rsatish uchun; haqiqiy narx Firestore settings/premium da)
export const DEFAULT_YEARLY_PRICE = 240000;

// ─── Google Play build aniqlash — yagona haqiqat manbasi ───
// Play Store ichida (APK/AAB) ishlayotganini aniqlaydi. Play'da raqamli obuna
// FAQAT Google Play Billing orqali sotilishi shart — Click/Telegram-karta
// to'lovlari faqat web/brauzer versiyasida ko'rsatiladi.
//
// Bu loyiha TWA (Trusted Web Activity) — APK Vercel saytining AYNAN o'zini ochadi,
// shuning uchun .env dagi VITE_PLAY_BUILD ilovaga yetib bormaydi (u Vercel build'ni
// yuklaydi). Demak ilova vs brauzer farqini FAQAT runtime signallar ajratadi:
//   1) Capacitor native platform (agar kelajakda Capacitor'ga o'tilsa)
//   2) TWA referrer (android-app://...) — ishonchsiz, SW/SPA da yo'qolishi mumkin
//   3) TWA launch URL'idagi ?play=1 — KAFOLATLANGAN (Bubblewrap startUrl da sozlanadi)
// Bir marta aniqlangach sessionStorage'da saqlanadi — keyingi navigatsiyalarda
// referrer/?play=1 yo'qolsa ham Play rejimi shu SESSIYA davomida barqaror qoladi.
// DIQQAT: localStorage ISHLATILMAYDI — TWA va Chrome brauzer ayni origin'ni
// bo'lishadi, localStorage esa ular o'rtasida umumiy. localStorage'ga yozilsa,
// ilovani ochgan foydalanuvchi keyin o'sha telefonda saytni brauzerda ochganda
// ham Play rejimida qolib, Click to'lovi yashirinib qolardi (to'lov imkonsiz).
export const isPlayBuild = () => {
  // Build-time flag (Capacitor/lokal bundle build uchun — TWA da ishlamaydi)
  if (import.meta.env.VITE_PLAY_BUILD === 'true') return true;

  if (typeof window === 'undefined') return false;

  // Eski (bug'li) versiya bayroqni localStorage'ga yozgan bo'lishi mumkin — u TWA'dan
  // brauzerga oqib, to'lovni to'sib qo'yardi. Har chaqiruvda tozalab, affected
  // brauzer foydalanuvchilarini davolaymiz.
  try { window.localStorage.removeItem('iqro_play_build'); } catch (_) { /* ignore */ }

  // Bir marta aniqlangach — SESSIYA davomida saqlab qolamiz (brauzerga oqmaydi)
  try {
    if (window.sessionStorage.getItem('iqro_play_build') === '1') return true;
  } catch (_) { /* sessionStorage bloklangan bo'lishi mumkin */ }

  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);

  const isCapacitor = !!window.Capacitor?.isNativePlatform?.();
  const isTWA = typeof document !== 'undefined' && document.referrer.startsWith('android-app://');
  // TWA launch URL'iga ?play=1 qo'shilsa — kafolatlangan aniqlash (faqat Android)
  const hasPlayParam = isAndroid && new URLSearchParams(window.location.search).get('play') === '1';

  if (isCapacitor || isTWA || hasPlayParam) {
    try { window.sessionStorage.setItem('iqro_play_build', '1'); } catch (_) { /* ignore */ }
    return true;
  }

  return false;
};

// ─── Toifa ROI kalkulyatori ───
// gains — toifa ortidan OYLIKKA qo'shiladigan SOF farq (oddiy mutaxassisga nisbatan), so'm.
// Haqiqiy hisob (2026): 2-toifa mutaxassisdan +445 928; 1-toifa +923 245 (2-toifadan +477 317);
// oliy toifa +1 412 147 (1-toifadan +488 902). Yangilanса shu yerni tahrirlang.
export const TOIFA_SALARY = {
  gains: {
    '2-toifa': 445928,
    '1-toifa': 923245,
    'oliy': 1412147,
  },
  labels: {
    '2-toifa': '2-toifa',
    '1-toifa': '1-toifa',
    'oliy': 'Oliy toifa',
  },
};
